import pool from '@/lib/db';
import { DocumentSequenceService } from './DocumentSequenceService';
import { InventoryService } from './InventoryService';
import { AccountingService } from './AccountingService';

/**
 * Purchase Service (Enterprise SOA)
 * Orchestrates Purchase Orders, Goods Receipts, and Procurement.
 */
export const PurchaseService = {

    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Create Purchase (Standard Procurement)
     */
    async createPurchase(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const { business_id: businessId, items, ...header } = data;

            // 1. Generate Purchase Number if not provided
            const pNumber = header.purchase_number || await DocumentSequenceService.generateNumber({
                businessId, documentType: 'purchase', prefix: 'PUR-', padLength: 6
            }, client);

            // 2. Create Header
            const hRes = await client.query(`
                INSERT INTO purchases (
                    business_id, vendor_id, warehouse_id, purchase_number,
                    date, subtotal, tax_total, total_amount, notes, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `, [
                businessId, header.vendor_id, header.warehouse_id, pNumber,
                header.date || new Date(), header.subtotal || 0, header.tax_total || 0,
                header.total_amount || 0, header.notes, header.status || 'received'
            ]);

            const purchase = hRes.rows[0];

            // 3. Process Items & Stock
            if (items?.length > 0) {
                for (const item of items) {
                    // Create Item
                    await client.query(`
                        INSERT INTO purchase_items (
                            purchase_id, business_id, product_id, quantity,
                            unit_price, tax_percent, tax_amount, total_amount
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [
                        purchase.id, businessId, item.product_id, item.quantity,
                        item.unit_price, item.tax_percent || 0, item.tax_amount || 0, item.total_amount
                    ]);

                    // Add Stock (If status is 'received' or provided)
                    if (header.status === 'received' || !header.status) {
                        await InventoryService.addStock({
                            business_id: businessId, product_id: item.product_id,
                            warehouse_id: header.warehouse_id, quantity: item.quantity,
                            cost_price: item.unit_price, batch_number: item.batch_number,
                            expiry_date: item.expiry_date, reference_type: 'purchase',
                            reference_id: purchase.id, notes: `Purchase: ${pNumber}`
                        }, userId, client);
                    }
                }
            }

            // 4. Accounting (Auto-post to GL if received)
            if (purchase.status === 'received') {
                await AccountingService.recordBusinessTransaction('purchase', {
                    businessId, referenceId: purchase.id, amount: purchase.total_amount,
                    description: `Purchase ${pNumber}`, userId
                }, client);
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return purchase;

        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },
    
    /**
     * Update Purchase Status
     */
    async updateStatus(params, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');
            const { businessId, purchaseId, status } = params;

            const curRes = await client.query('SELECT * FROM purchases WHERE id = $1 AND business_id = $2 FOR UPDATE', [purchaseId, businessId]);
            if (curRes.rows.length === 0) throw new Error('Purchase not found');
            const purchase = curRes.rows[0];

            if (status === 'received' && purchase.status !== 'received') {
                const itemsRes = await client.query('SELECT * FROM purchase_items WHERE purchase_id = $1', [purchaseId]);
                for (const item of itemsRes.rows) {
                    await InventoryService.addStock({
                        business_id: businessId, product_id: item.product_id, warehouse_id: purchase.warehouse_id,
                        quantity: item.quantity, cost_price: item.unit_price, reference_type: 'purchase',
                        reference_id: purchaseId, notes: `Status update: ${purchase.purchase_number}`
                    }, userId, client);
                }

                await AccountingService.recordBusinessTransaction('purchase', {
                    businessId, referenceId: purchaseId, amount: purchase.total_amount,
                    description: `Purchase ${purchase.purchase_number} - Completed`, userId
                }, client);

                // Update Vendor Balance
                if (purchase.vendor_id) {
                    await client.query(`
                        UPDATE vendors SET outstanding_balance = COALESCE(outstanding_balance, 0) + $1, updated_at = NOW()
                        WHERE id = $2 AND business_id = $3
                    `, [purchase.total_amount, purchase.vendor_id, businessId]);
                }
            }

            const result = await client.query('UPDATE purchases SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [status, purchaseId]);
            if (shouldManageTransaction) await client.query('COMMIT');
            return { success: true, purchase: result.rows[0] };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Bulk Purchase Order Creation (Smart Restock)
     */
    async createBulkOrders(businessId, orders, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const results = [];
            for (const orderData of orders) {
                const purchase = await this.createPurchase({
                    business_id: businessId,
                    vendor_id: orderData.vendor_id,
                    warehouse_id: orderData.warehouse_id,
                    purchase_number: orderData.purchase_number,
                    date: new Date(),
                    subtotal: orderData.total_amount, // Simplified mapping
                    total_amount: orderData.total_amount,
                    notes: orderData.notes || 'Bulk Restock',
                    status: 'draft',
                    items: [{
                        product_id: orderData.product_id,
                        quantity: orderData.quantity,
                        unit_price: orderData.unit_cost || 0,
                        total_amount: orderData.total_amount
                    }]
                }, userId, client);
                results.push(purchase);
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return { success: true, count: results.length, purchases: results };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Create individual Auto-Reorder PO
     */
    async createAutoReorderPO(params, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');
            const { businessId, productId, quantity, vendorId } = params;

            // 1. Get Product Details
            const pRes = await client.query('SELECT name, sku, cost_price FROM products WHERE id = $1 AND business_id = $2', [productId, businessId]);
            if (pRes.rows.length === 0) throw new Error('Product not found');
            const product = pRes.rows[0];

            // 2. Delegate to standard createPurchase
            const purchase = await this.createPurchase({
                business_id: businessId,
                vendor_id: vendorId,
                purchase_number: `PO-AUTO-${Date.now()}`,
                total_amount: (product.cost_price || 0) * quantity,
                notes: `Auto-generated PO for low stock item: ${product.name}`,
                status: 'draft',
                items: [{
                    product_id: productId,
                    quantity,
                    unit_price: product.cost_price,
                    total_amount: (product.cost_price || 0) * quantity
                }]
            }, userId, client);

            if (shouldManageTransaction) await client.query('COMMIT');
            return purchase;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    }
};
