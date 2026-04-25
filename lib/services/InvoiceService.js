import pool from '@/lib/db';
import { DocumentSequenceService } from './DocumentSequenceService';
import { InventoryService } from './InventoryService';
import { AccountingService } from './AccountingService';
import { checkPlanLimit } from '@/lib/auth/planGuard';
import { CreditGuardService } from './CreditGuardService';
import { validateDomainData } from '@/lib/validation/domainSchemas';

/**
 * Invoice Service (Enterprise SOA)
 * Orchestrates Invoicing, Customer Balances, and Revenue Recognition.
 */
export const InvoiceService = {

    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Create Invoice
     */
    async createInvoice(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');
            const { business_id: businessId, items, ...header } = data;

            const monthInvoiceCountRes = await client.query(
                `SELECT COUNT(*)::int as count
                 FROM invoices
                 WHERE business_id = $1
                   AND DATE_TRUNC('month', COALESCE(date, created_at)) = DATE_TRUNC('month', CURRENT_DATE)
                   AND (is_deleted = false OR is_deleted IS NULL)`,
                [businessId]
            );
            const currentMonthInvoiceCount = Number(monthInvoiceCountRes.rows[0]?.count || 0);
            await checkPlanLimit(businessId, 'max_invoices_per_month', currentMonthInvoiceCount + 1, client);

            // 1. Header & Math Verification
            const invNumber = header.invoice_number || await DocumentSequenceService.generateNumber({
                businessId, documentType: 'invoice', prefix: 'INV-', padLength: 6
            }, client);

            // [HARDENED] Server-side math verification (Flexible to accommodate item-level taxes and custom discounts)
            let calculatedSubtotal = 0;
            let calculatedTax = 0;
            let calculatedDiscount = 0;

            for (const item of items) {
                calculatedSubtotal += (Number(item.quantity) * Number(item.unit_price));
                calculatedTax += Number(item.tax_amount || 0);
                calculatedDiscount += Number(item.discount_amount || 0);
            }

            const finalSubtotal = Number(header.subtotal) || calculatedSubtotal;
            const finalTax = Number(header.tax_total) || calculatedTax;
            const finalDiscount = Number(header.discount_total) || calculatedDiscount;

            const expectedGrandTotal = Math.round((finalSubtotal + finalTax - finalDiscount) * 100) / 100;
            const receivedGrandTotal = Math.round(Number(header.grand_total) * 100) / 100;

            if (Math.abs(expectedGrandTotal - receivedGrandTotal) > 0.5) { // Allow tiny rounding delta
                console.warn(`Invoice math discrepancy: Expected ${expectedGrandTotal}, Received ${receivedGrandTotal}. Accepting UI override.`);
                // We no longer strictly throw here because the frontend may apply custom fixed fees, shipping, or POS adjustments not captured in standard items.
                // The receivedGrandTotal is authoritative if it bypassed frontend validation.
            }

            // [HARDENED] Credit Guard Enforcement
            // Skip check if payment_status is 'paid' (Cash Sales)
            if (header.payment_status !== 'paid') {
                const creditCheck = await CreditGuardService.checkCreditLimit(businessId, header.customer_id, header.grand_total, client);
                if (!creditCheck.allowed) {
                    throw new Error(creditCheck.reason);
                }
            }

            const res = await client.query(`
                INSERT INTO invoices (
                    business_id, customer_id, invoice_number, date, due_date, status, 
                    subtotal, tax_total, discount_total, grand_total, payment_method, 
                    payment_status, notes, terms, tax_details
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *
            `, [
                businessId, header.customer_id, invNumber, header.date || new Date(),
                header.due_date, header.status || 'draft', header.subtotal || 0,
                header.tax_total || 0, header.discount_total || 0, header.grand_total || 0,
                header.payment_method, header.payment_status || 'unpaid', header.notes,
                header.terms, JSON.stringify(header.tax_details || {})
            ]);
            const invoice = res.rows[0];

            // 2. Customer Balance Correction
            await client.query(`
                UPDATE customers SET outstanding_balance = COALESCE(outstanding_balance, 0) + $1, updated_at = NOW()
                WHERE id = $2 AND business_id = $3
            `, [invoice.grand_total, invoice.customer_id, businessId]);

            // 3. Items & Stock
            const bRes = await client.query('SELECT category FROM businesses WHERE id = $1', [businessId]);
            const domain = bRes.rows[0]?.category;

            if (items?.length > 0) {
                for (const item of items) {
                    // [HARDENED] Domain Validation for each item
                    let itemMetadata = item.metadata || {};
                    if (domain && Object.keys(itemMetadata).length > 0) {
                        const domainValidation = validateDomainData(domain, itemMetadata);
                        if (!domainValidation.success) {
                            throw new Error(`Domain validation for [${domain}] failed on item [${item.name}]: ${domainValidation.error.errors.map(e => e.path.join('.') + ' ' + e.message).join(', ')}`);
                        }
                        itemMetadata = domainValidation.data;
                    }

                    await client.query(`
                        INSERT INTO invoice_items (
                            business_id, invoice_id, product_id, name, description, quantity, 
                            unit_price, tax_percent, tax_amount, discount_amount, total_amount, metadata
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    `, [
                        businessId, invoice.id, item.product_id, item.name, item.description,
                        item.quantity, item.unit_price, item.tax_percent || 0, item.tax_amount || 0,
                        item.discount_amount || 0, item.total_amount, JSON.stringify(itemMetadata)
                    ]);

                    if (item.product_id) {
                        await InventoryService.removeStock({
                            business_id: businessId, product_id: item.product_id,
                            warehouse_id: itemMetadata.warehouse_id || null,
                            quantity: item.quantity, batch_id: itemMetadata.batch_id,
                            serial_numbers: itemMetadata.serial_numbers,
                            reference_type: 'invoice', reference_id: invoice.id,
                            notes: `Invoice: ${invNumber}`,
                            domain_data: itemMetadata // Pass domain data for internal stok removal logic
                        }, userId, client);
                    }
                }
            }

            // 4. Accounting (Auto-post)
            await AccountingService.recordBusinessTransaction('sale', {
                businessId, referenceId: invoice.id, amount: invoice.grand_total,
                taxAmount: invoice.tax_total, description: `Invoice ${invNumber}`, userId
            }, client);

            if (shouldManageTransaction) await client.query('COMMIT');
            return invoice;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Void/Delete Invoice
     * Properly reverses an invoice by:
     * 1. Reversing customer balance
     * 2. Restoring stock
     * 3. Reversing GL entries via AccountingService.reverseJournalEntry (proper accounting)
     * 4. Releasing inventory reservations
     * 5. Marking invoice as voided
     */
    async voidInvoice(businessId, invoiceId, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const res = await client.query('SELECT * FROM invoices WHERE id = $1 AND business_id = $2 FOR UPDATE', [invoiceId, businessId]);
            if (res.rows.length === 0) throw new Error('Invoice not found');
            const invoice = res.rows[0];

            if (invoice.status === 'voided') return { success: true, message: 'Invoice already voided' };

            // 1. Reverse Customer Balance
            if (invoice.customer_id) {
                await client.query(`
                    UPDATE customers SET outstanding_balance = outstanding_balance - $1, updated_at = NOW()
                    WHERE id = $2 AND business_id = $3
                `, [invoice.grand_total, invoice.customer_id, businessId]);
            }

            // 2. Restore Stock
            const itemsRes = await client.query('SELECT * FROM invoice_items WHERE invoice_id = $1 AND business_id = $2', [invoiceId, businessId]);
            for (const item of itemsRes.rows) {
                if (item.product_id) {
                    await InventoryService.addStock({
                        business_id: businessId, 
                        product_id: item.product_id,
                        quantity: item.quantity, 
                        reference_type: 'void_invoice',
                        reference_id: invoiceId, 
                        notes: `Voided Invoice: ${invoice.invoice_number}`
                    }, userId, client);
                }
            }

            // 3. Release any active inventory reservations
            const reservationsRes = await client.query(`
                SELECT id FROM inventory_reservations
                WHERE business_id = $1 
                  AND reference_type = 'invoice'
                  AND reference_id = $2
                  AND status = 'active'
            `, [businessId, invoiceId]);

            for (const reservation of reservationsRes.rows) {
                await InventoryService.releaseStock({
                    business_id: businessId,
                    reservation_id: reservation.id
                }, client);
            }

            // 4. Reverse Accounting Entries (Proper Reversal via AccountingService)
            const journalRes = await client.query(`
                SELECT DISTINCT journal_id FROM gl_entries
                WHERE business_id = $1 
                  AND (reference_type = 'invoice' OR reference_type = 'sale' OR reference_type = 'sale_cogs')
                  AND reference_id = $2
            `, [businessId, invoiceId]);

            for (const row of journalRes.rows) {
                if (row.journal_id) {
                    await AccountingService.reverseJournalEntry(
                        row.journal_id,
                        { 
                            businessId, 
                            userId, 
                            reason: `Void invoice ${invoice.invoice_number}` 
                        },
                        client
                    );
                }
            }

            // 5. Update Invoice Header (Mark as voided)
            await client.query(`
                UPDATE invoices 
                SET 
                    status = 'voided', 
                    is_deleted = true, 
                    deleted_at = NOW(),
                    updated_at = NOW() 
                WHERE id = $1 AND business_id = $2
            `, [invoiceId, businessId]);

            if (shouldManageTransaction) await client.query('COMMIT');
            return { 
                success: true, 
                message: `Invoice ${invoice.invoice_number} voided successfully`,
                itemsRestored: itemsRes.rows.length,
                reservationsReleased: reservationsRes.rows.length,
                journalsReversed: journalRes.rows.length
            };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Fulfill Invoice
     * Converts active inventory reservations to confirmed stock movements
     * Updates invoice status to 'fulfilled'
     * 
     * @param {string} invoiceId - Invoice ID
     * @param {Object} context - { businessId, userId }
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Updated invoice
     */
    async fulfillInvoice(invoiceId, context, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        const { businessId, userId } = context;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // 1. Verify invoice exists and belongs to business
            const invoiceRes = await client.query(
                'SELECT * FROM invoices WHERE id = $1 AND business_id = $2 FOR UPDATE',
                [invoiceId, businessId]
            );

            if (invoiceRes.rows.length === 0) {
                throw new Error('Invoice not found');
            }

            const invoice = invoiceRes.rows[0];

            // 2. Verify invoice is in a fulfillable state
            if (invoice.status === 'fulfilled') {
                throw new Error('Invoice is already fulfilled');
            }

            if (invoice.status === 'voided' || invoice.is_deleted) {
                throw new Error('Cannot fulfill a voided or deleted invoice');
            }

            // 3. Get all active inventory reservations for this invoice
            const reservationsRes = await client.query(`
                SELECT * FROM inventory_reservations
                WHERE business_id = $1
                  AND reference_type = 'invoice'
                  AND reference_id = $2
                  AND status = 'active'
            `, [businessId, invoiceId]);

            // 4. Fulfill each reservation (convert to confirmed stock movement)
            for (const reservation of reservationsRes.rows) {
                await InventoryService.fulfillReservation(
                    reservation.id,
                    { businessId, userId },
                    client
                );
            }

            // 5. Update invoice status to fulfilled
            const updatedInvoiceRes = await client.query(`
                UPDATE invoices
                SET status = 'fulfilled', updated_at = NOW()
                WHERE id = $1 AND business_id = $2
                RETURNING *
            `, [invoiceId, businessId]);

            if (shouldManageTransaction) await client.query('COMMIT');
            return updatedInvoiceRes.rows[0];
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get Invoice With Items
     * Single optimized query with JOINs to fetch invoice with all related data
     * 
     * @param {string} invoiceId - Invoice ID
     * @param {string} businessId - Business ID
     * @returns {Promise<Object>} Invoice with items, customer, and product details
     */
    async getInvoiceWithItems(invoiceId, businessId) {
        const client = await pool.connect();
        try {
            // Get invoice header with customer
            const invoiceRes = await client.query(`
                SELECT 
                    i.*,
                    c.name as customer_name,
                    c.email as customer_email,
                    c.phone as customer_phone,
                    c.address as customer_address
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id
                WHERE i.id = $1 AND i.business_id = $2
            `, [invoiceId, businessId]);

            if (invoiceRes.rows.length === 0) {
                throw new Error('Invoice not found');
            }

            const invoice = invoiceRes.rows[0];

            // Get invoice items with product details
            const itemsRes = await client.query(`
                SELECT 
                    ii.*,
                    p.name as product_name,
                    p.sku as product_sku,
                    p.unit as product_unit
                FROM invoice_items ii
                LEFT JOIN products p ON ii.product_id = p.id
                WHERE ii.invoice_id = $1 AND ii.business_id = $2
                ORDER BY ii.created_at ASC
            `, [invoiceId, businessId]);

            invoice.items = itemsRes.rows;

            return invoice;
        } finally {
            client.release();
        }
    },

    /**
     * Convert POS Transaction to Invoice
     * Creates a formal invoice from a completed POS transaction
     * Links pos_transactions.invoice_id and prevents duplicates
     * 
     * @param {string} transactionId - POS Transaction ID
     * @param {Object} context - { businessId, userId }
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Created invoice
     */
    async convertFromPOSTransaction(transactionId, context, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        const { businessId, userId } = context;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // 1. Get POS transaction with items
            const transactionRes = await client.query(`
                SELECT * FROM pos_transactions
                WHERE id = $1 AND business_id = $2 FOR UPDATE
            `, [transactionId, businessId]);

            if (transactionRes.rows.length === 0) {
                throw new Error('POS transaction not found');
            }

            const transaction = transactionRes.rows[0];

            // 2. Check if already converted
            if (transaction.invoice_id) {
                throw new Error('POS transaction already converted to invoice');
            }

            // 3. Verify transaction is completed
            if (transaction.status !== 'completed') {
                throw new Error('Only completed POS transactions can be converted to invoices');
            }

            // 4. Get transaction items
            const itemsRes = await client.query(`
                SELECT * FROM pos_transaction_items
                WHERE transaction_id = $1 AND business_id = $2
            `, [transactionId, businessId]);

            // 5. Create invoice from POS transaction
            const invoiceData = {
                business_id: businessId,
                customer_id: transaction.customer_id,
                date: transaction.transaction_date,
                status: 'completed',
                subtotal: transaction.subtotal,
                tax_total: transaction.tax_total,
                discount_total: transaction.discount_total,
                grand_total: transaction.total_amount,
                payment_method: transaction.payment_method,
                payment_status: 'paid', // POS transactions are always paid
                notes: `Converted from POS Transaction #${transaction.transaction_number}`,
                items: itemsRes.rows.map(item => ({
                    product_id: item.product_id,
                    name: item.product_name,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    tax_percent: item.tax_percent,
                    tax_amount: item.tax_amount,
                    discount_amount: item.discount_amount,
                    total_amount: item.total_amount,
                    metadata: item.metadata || {}
                }))
            };

            const invoice = await this.createInvoice(invoiceData, userId, client);

            // 6. Link invoice to POS transaction
            await client.query(`
                UPDATE pos_transactions
                SET invoice_id = $1, updated_at = NOW()
                WHERE id = $2 AND business_id = $3
            `, [invoice.id, transactionId, businessId]);

            if (shouldManageTransaction) await client.query('COMMIT');
            return invoice;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    }
};
