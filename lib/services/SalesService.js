import pool from '@/lib/db';
import { DocumentSequenceService } from './DocumentSequenceService';
import { InventoryService } from './InventoryService';
import { AccountingService } from './AccountingService';
import { PakistaniTaxService } from './PakistaniTaxService';
import { CreditGuardService } from './CreditGuardService';

/**
 * Sales Service (Enterprise SOA)
 * Orchestrates Quotations, Sales Orders, Deliveries, and Invoicing.
 */
export const SalesService = {

    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Quotations
     */
    async createQuotation(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');
            const { business_id: businessId, items, ...header } = data;

            const qNumber = header.quotation_number || await DocumentSequenceService.generateNumber({
                businessId, documentType: 'quotation', prefix: 'QT-', padLength: 6
            }, client);

            // [HARDENED] Server-side math verification for quotations
            let calculatedSubtotal = 0;
            for (const item of items) {
                calculatedSubtotal += Math.round(Number(item.quantity) * Number(item.unit_price) * 100) / 100;
            }

            const taxConfig = await PakistaniTaxService.getTaxConfig(businessId, client);
            const taxResults = PakistaniTaxService.calculateTotalTax(calculatedSubtotal, taxConfig);

            const expectedGrandTotal = Math.round(taxResults.netAmount * 100) / 100;
            const receivedGrandTotal = Math.round(Number(header.total_amount) * 100) / 100;

            if (Math.abs(expectedGrandTotal - receivedGrandTotal) > 0.05) {
                throw new Error(`Quotation math mismatch: Expected ${expectedGrandTotal}, received ${receivedGrandTotal}.`);
            }

            const res = await client.query(`
                INSERT INTO quotations (business_id, customer_id, quotation_number, date, valid_until, subtotal, tax_total, total_amount, notes, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
            `, [businessId, header.customer_id, qNumber, header.date || new Date(), header.valid_until, header.subtotal || 0, header.tax_total || 0, header.total_amount || 0, header.notes, header.status || 'draft']);
            
            const quotation = res.rows[0];

            if (items?.length > 0) {
                for (const item of items) {
                    await client.query(`
                        INSERT INTO quotation_items (quotation_id, business_id, product_id, quantity, unit_price, total_amount)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [quotation.id, businessId, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]);
                }
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return quotation;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Sales Orders
     */
    async createSalesOrder(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');
            const { business_id: businessId, items, ...header } = data;

            const soNumber = header.order_number || await DocumentSequenceService.generateNumber({
                businessId, documentType: 'sales_order', prefix: 'SO-', padLength: 6
            }, client);

            // [HARDENED] Server-side math verification for sales orders
            let calculatedSubtotal = 0;
            for (const item of items) {
                calculatedSubtotal += Math.round(Number(item.quantity) * Number(item.unit_price) * 100) / 100;
            }

            const taxConfig = await PakistaniTaxService.getTaxConfig(businessId, client);
            const taxResults = PakistaniTaxService.calculateTotalTax(calculatedSubtotal, taxConfig);

            const expectedGrandTotal = Math.round(taxResults.netAmount * 100) / 100;
            const receivedGrandTotal = Math.round(Number(header.total_amount) * 100) / 100;

            if (Math.abs(expectedGrandTotal - receivedGrandTotal) > 0.05) {
                throw new Error(`Sales Order math mismatch: Expected ${expectedGrandTotal}, received ${receivedGrandTotal}.`);
            }

            // [HARDENED] Credit Guard Enforcement
            const creditCheck = await CreditGuardService.checkCreditLimit(businessId, header.customer_id, header.total_amount, client);
            if (!creditCheck.allowed) {
                throw new Error(creditCheck.reason);
            }

            const res = await client.query(`
                INSERT INTO sales_orders (business_id, customer_id, quotation_id, order_number, date, delivery_date, subtotal, tax_total, total_amount, notes, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
            `, [businessId, header.customer_id, header.quotation_id || null, soNumber, header.date || new Date(), header.delivery_date, header.subtotal || 0, header.tax_total || 0, header.total_amount || 0, header.notes, header.status || 'pending']);
            
            const salesOrder = res.rows[0];

            if (items?.length > 0) {
                for (const item of items) {
                    await client.query(`
                        INSERT INTO sales_order_items (business_id, sales_order_id, product_id, name, quantity, unit_price, tax_percent, tax_amount, discount_amount, total_amount)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `, [businessId, salesOrder.id, item.product_id, item.name, item.quantity, item.unit_price, item.tax_percent || 0, item.tax_amount || 0, item.discount_amount || 0, item.total_amount || (item.quantity * item.unit_price)]);

                    if (item.batch_id || item.reserve_stock) {
                        await InventoryService.reserveStock({
                            business_id: businessId, product_id: item.product_id, quantity: item.quantity, batch_id: item.batch_id, reference: `SO: ${soNumber}`
                        }, client);
                    }
                }
            }

            if (header.quotation_id) {
                await client.query(`UPDATE quotations SET status = 'converted', updated_at = NOW() WHERE id = $1`, [header.quotation_id]);
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return salesOrder;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Delivery Challans
     */
    async createChallan(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');
            const { business_id: businessId, items, ...header } = data;

            const dcNumber = header.challan_number || await DocumentSequenceService.generateNumber({
                businessId, documentType: 'delivery_challan', prefix: 'DC-', padLength: 6
            }, client);

            const res = await client.query(`
                INSERT INTO delivery_challans (business_id, customer_id, sales_order_id, challan_number, date, delivery_address, notes, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
            `, [businessId, header.customer_id, header.sales_order_id || null, dcNumber, header.date || new Date(), header.delivery_address, header.notes, header.status || 'issued']);
            
            const challan = res.rows[0];

            if (items?.length > 0) {
                for (const item of items) {
                    await client.query(`
                        INSERT INTO challan_items (business_id, challan_id, product_id, batch_id, name, quantity, serial_numbers)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                    `, [businessId, challan.id, item.product_id, item.batch_id, item.name, item.quantity, item.serial_numbers || []]);

                    // Deduct Stock
                    await InventoryService.removeStock({
                        business_id: businessId, product_id: item.product_id, warehouse_id: header.warehouse_id || null,
                        quantity: item.quantity, batch_id: item.batch_id, serial_numbers: item.serial_numbers,
                        reference_type: 'delivery_challan', reference_id: challan.id, notes: `Challan: ${dcNumber}`
                    }, userId, client);

                    // Release Reservation
                    if (header.sales_order_id && item.batch_id) {
                        await InventoryService.releaseStock({
                            business_id: businessId, batch_id: item.batch_id, quantity: item.quantity
                        }, client);
                    }
                }
            }

            if (header.sales_order_id) {
                await client.query(`UPDATE sales_orders SET status = 'dispatched', updated_at = NOW() WHERE id = $1`, [header.sales_order_id]);
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return challan;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    }
};
