import pool from '@/lib/db';
import { DocumentSequenceService } from './DocumentSequenceService';
import { InventoryService } from './InventoryService';
import { AccountingService } from './AccountingService';
import { InvoicePaymentService } from './InvoicePaymentService';
import { checkPlanLimit } from '@/lib/auth/planGuard';
import { CreditGuardService } from './CreditGuardService';
import { validateDomainData } from '@/lib/validation/domainSchemas';
import { invalidateStorefrontCatalog } from '@/lib/storefront/invalidateStorefrontCatalog';

function maybeInvalidateStorefrontCatalog(shouldManageTransaction, businessId, inventoryTouched) {
    if (shouldManageTransaction && businessId && inventoryTouched) {
        invalidateStorefrontCatalog(businessId);
    }
}

/**
 * Invoice Service (Enterprise SOA)
 * Orchestrates Invoicing, Customer Balances, and Revenue Recognition.
 */
export const InvoiceService = {

    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Pre-validate stock availability for invoice items
     * Prevents race conditions and ensures stock is available before transaction starts
     * 
     * @param {string} businessId - Business ID
     * @param {Array} items - Invoice items with product_id and quantity
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Validation results with isValid flag and details
     */
    async prevalidateStock(businessId, items, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            const validationResults = [];
            const insufficientStockItems = [];

            for (const item of items) {
                // Skip items without product_id (service items, manual entries)
                if (!item.product_id) {
                    validationResults.push({
                        productId: null,
                        name: item.name || 'Unnamed Item',
                        requested: item.quantity,
                        available: null,
                        isValid: true,
                        skipReason: 'No product linked (service/manual item)'
                    });
                    continue;
                }

                // Canonical stock: products.stock (synced from product_stock_locations) minus active reservations
                const stockRes = await client.query(`
                    SELECT 
                        p.name as product_name,
                        p.sku,
                        COALESCE(p.stock, 0) as total_stock,
                        COALESCE(
                            (SELECT SUM(quantity) 
                             FROM inventory_reservations 
                             WHERE product_id = $1 
                               AND business_id = $2
                               AND status = 'active'),
                            0
                        ) as reserved
                    FROM products p
                    WHERE p.id = $1 AND p.business_id = $2
                `, [item.product_id, businessId]);

                const stockData = stockRes.rows[0];
                const totalStock = Number(stockData?.total_stock || 0);
                const reserved = Number(stockData?.reserved || 0);
                const available = totalStock - reserved;
                const shortfall = Math.max(0, item.quantity - available);

                const isValid = available >= item.quantity;

                if (!isValid) {
                    insufficientStockItems.push({
                        name: stockData?.product_name || item.name || 'Unknown Product',
                        sku: stockData?.sku,
                        requested: item.quantity,
                        available,
                        shortfall
                    });
                }

                validationResults.push({
                    productId: item.product_id,
                    name: stockData?.product_name || item.name,
                    sku: stockData?.sku,
                    requested: item.quantity,
                    available,
                    reserved,
                    totalStock,
                    isValid,
                    shortfall: shortfall > 0 ? shortfall : 0
                });
            }

            const isFullyValid = validationResults.every(r => r.isValid);

            return {
                isValid: isFullyValid,
                items: validationResults,
                insufficientItems: insufficientStockItems,
                totalShortfall: insufficientStockItems.reduce((sum, item) => sum + item.shortfall, 0),
                message: insufficientStockItems.length > 0
                    ? `Insufficient stock for ${insufficientStockItems.length} item(s): ${insufficientStockItems.map(item => `${item.name} (need ${item.requested}, have ${item.available})`).join(', ')}`
                    : 'All items have sufficient stock'
            };

        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Create Invoice
     */
    async createInvoice(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        const { business_id: businessId, items, ...header } = data;

        try {
            // [HARDENED] Stock Pre-validation - Check stock before transaction starts
            // This prevents race conditions and ensures stock availability
            if (items?.length > 0 && !data.skip_inventory) {
                const stockValidation = await this.prevalidateStock(businessId, items, client);
                if (!stockValidation.isValid) {
                    const error = new Error(stockValidation.message);
                    error.code = 'INSUFFICIENT_STOCK';
                    error.details = stockValidation.insufficientItems;
                    throw error;
                }
            }

            if (shouldManageTransaction) await client.query('BEGIN');

            const monthInvoiceCountRes = await client.query(
                `SELECT COUNT(*)::int as count
                 FROM invoices
                 WHERE business_id = $1
                   AND DATE_TRUNC('month', COALESCE(date, created_at)) = DATE_TRUNC('month', CURRENT_DATE)
                   AND (invoices.is_deleted = false OR invoices.is_deleted IS NULL)`,
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
                    business_id, customer_id, invoice_number, date, due_date, status, created_by,
                    subtotal, tax_total, discount_total, grand_total, payment_method, 
                    payment_status, notes, terms, tax_details
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING *
            `, [
                businessId, header.customer_id, invNumber, header.date || new Date(),
                header.due_date, header.status || 'draft', userId,
                header.subtotal || 0,
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

                    if (item.product_id && !data.skip_inventory) {
                        await InventoryService.removeStock({
                            business_id: businessId, product_id: item.product_id,
                            warehouse_id: itemMetadata.warehouse_id || null,
                            quantity: item.quantity, batch_id: itemMetadata.batch_id,
                            serial_numbers: itemMetadata.serial_numbers,
                            reference_type: 'invoice', reference_id: invoice.id,
                            notes: `Invoice: ${invNumber}`,
                            customer_id: header.customer_id || null,
                            invoice_date: header.date || new Date(),
                            domain_data: itemMetadata // Pass domain data for internal stok removal logic
                        }, userId, client);
                    }
                }
            }

            // Complete active quotation reservations when this invoice is created from a quotation
            const quotationId =
                header.quotation_id ||
                header.domain_data?.quotation_id ||
                header.domain_data?.source_quotation_id ||
                null;

            if (quotationId) {
                for (const item of (items || [])) {
                    if (!item.product_id) continue;

                    const reservationsRes = await client.query(
                        `SELECT id
                         FROM inventory_reservations
                         WHERE business_id = $1
                           AND product_id = $2
                           AND status = 'active'
                           AND reference = $3
                         ORDER BY created_at ASC`,
                        [businessId, item.product_id, `quotation:${quotationId}`]
                    );

                    for (const reservation of reservationsRes.rows) {
                        await InventoryService.releaseStock({
                            business_id: businessId,
                            reservation_id: reservation.id
                        }, client);
                    }
                }
            }

            // 4. Accounting (Auto-post)
            await AccountingService.recordBusinessTransaction('sale', {
                businessId, referenceId: invoice.id, amount: invoice.grand_total,
                taxAmount: invoice.tax_total, description: `Invoice ${invNumber}`, userId
            }, client);

            const paymentStatus = String(header.payment_status || invoice.payment_status || '').toLowerCase();
            if (paymentStatus === 'paid' && Number(invoice.grand_total) > 0) {
                await InvoicePaymentService.recordPayment(
                    {
                        businessId,
                        invoiceId: invoice.id,
                        amount: Number(invoice.grand_total),
                        paymentMethod: header.payment_method || invoice.payment_method || 'cash',
                        notes: 'Paid at invoice creation',
                        userId,
                    },
                    client
                );
            }

            if (shouldManageTransaction) await client.query('COMMIT');

            const inventoryTouched =
                !data.skip_inventory &&
                Array.isArray(items) &&
                items.some((item) => item.product_id);
            maybeInvalidateStorefrontCatalog(shouldManageTransaction, businessId, inventoryTouched);

            return invoice;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Update Invoice
     */
    /**
     * Get Invoices (with filtering and pagination)
     */
    async getInvoices(businessId, options = {}, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const { status, customerId, limit = 50, offset = 0 } = options;
            const conditions = ['i.business_id = $1', '(i.is_deleted = false OR i.is_deleted IS NULL)'];
            const params = [businessId];
            let paramIndex = 2;

            if (status) {
                conditions.push(`i.status = $${paramIndex++}`);
                params.push(status);
            }

            if (customerId) {
                conditions.push(`i.customer_id = $${paramIndex++}`);
                params.push(customerId);
            }

            const query = `
                SELECT i.*, 
                       c.name as customer_name, c.email as customer_email,
                       c.phone as customer_phone,
                       bal.remaining_balance as balance,
                       GREATEST(
                         COALESCE(i.grand_total, 0) - COALESCE(bal.remaining_balance, COALESCE(i.grand_total, 0)),
                         0
                       ) as total_paid,
                       (SELECT json_agg(it.*) FROM invoice_items it WHERE it.invoice_id = i.id) as items
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(calculate_invoice_balance(i.id), i.grand_total) AS remaining_balance
                ) bal ON true
                WHERE ${conditions.join(' AND ')}
                ORDER BY i.date DESC, i.created_at DESC
                LIMIT $${paramIndex++} OFFSET $${paramIndex++}
            `;
            
            const res = await client.query(query, [...params, limit, offset]);
            return res.rows;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get Single Invoice by ID
     */
    async getInvoiceById(businessId, invoiceId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const query = `
                SELECT i.*, 
                       c.name as customer_name, c.email as customer_email,
                       (SELECT json_agg(it.*) FROM invoice_items it WHERE it.invoice_id = i.id) as items
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id
                WHERE i.id = $1 AND i.business_id = $2
                  AND COALESCE(i.is_deleted, false) = false
            `;
            const res = await client.query(query, [invoiceId, businessId]);
            return res.rows[0] || null;
        } finally {
            if (!txClient) client.release();
        }
    },

    async updateInvoice(invoiceId, data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');
            const { business_id: businessId, items, ...header } = data;

            // 1. Get original items to restore stock and original total for balance correction
            const oldItemsRes = await client.query(
                `SELECT it.product_id, it.quantity, i.grand_total as header_total 
                 FROM invoice_items it 
                 JOIN invoices i ON it.invoice_id = i.id
                 WHERE it.invoice_id = $1`,
                [invoiceId]
            );
            const oldItems = oldItemsRes.rows;

            // 2. Revert old stock
            for (const item of oldItems) {
                if (item.product_id) {
                    await InventoryService.addStock({
                        business_id: businessId,
                        product_id: item.product_id,
                        quantity: Number(item.quantity) || 0,
                        notes: `Correction: Invoice update (Revert)`,
                        reference_type: 'adjustment',
                        reference_id: invoiceId
                    }, userId, client);
                }
            }

            // 3. Update Invoice Header
            // NOTE: invoices table does NOT have a domain_data column; use tax_details for extra metadata.
            const invQuery = `
                UPDATE invoices SET
                    customer_id = $1, date = $2, due_date = $3, status = $4,
                    subtotal = $5, tax_total = $6, discount_total = $7, grand_total = $8,
                    payment_method = $9, payment_status = $10, notes = $11, terms = $12,
                    tax_details = $13, updated_at = NOW()
                WHERE id = $14 AND business_id = $15
                RETURNING *
            `;
            const invValues = [
                header.customer_id, header.date, header.due_date, header.status,
                header.subtotal, header.total_tax ?? header.tax_total, header.discount_total,
                header.grand_total, header.payment_method, header.payment_status,
                header.notes, header.terms,
                JSON.stringify(header.tax_details || {}),
                invoiceId, businessId
            ];

            const invRes = await client.query(invQuery, invValues);
            const invoice = invRes.rows[0];

            if (!invoice) throw new Error(`Invoice update failed. ID: ${invoiceId}`);

            // 3.5 Update Customer Balance (Difference)
            const balanceDiff = Number(header.grand_total) - Number(oldItemsRes.rows[0]?.header_total || 0);
            if (balanceDiff !== 0) {
                await client.query(`
                    UPDATE customers 
                    SET outstanding_balance = COALESCE(outstanding_balance, 0) + $1,
                        updated_at = NOW()
                    WHERE id = $2 AND business_id = $3
                `, [balanceDiff, header.customer_id, businessId]);
            }

            // 4. Replace Items
            await client.query('DELETE FROM invoice_items WHERE invoice_id = $1 AND business_id = $2', [invoiceId, businessId]);

            const bRes = await client.query('SELECT category FROM businesses WHERE id = $1', [businessId]);
            const domain = bRes.rows[0]?.category;

            if (items?.length > 0) {
                for (const item of items) {
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
                        invoice.business_id, invoice.id, item.product_id, item.name, item.description,
                        item.quantity, item.unit_price, item.tax_percent || 0, item.tax_amount || 0,
                        item.discount_amount || 0, item.total_amount, JSON.stringify(itemMetadata)
                    ]);

                    // 5. Deduct new stock
                    if (item.product_id && !header.skip_inventory) {
                        await InventoryService.removeStock({
                            business_id: invoice.business_id,
                            product_id: item.product_id,
                            warehouse_id: itemMetadata.warehouse_id || null,
                            quantity: Number(item.quantity) || 0,
                            reference_type: 'invoice',
                            reference_id: invoice.id,
                            notes: `Invoice ${invoice.invoice_number} (Updated)`,
                            batch_id: itemMetadata.batch_id || null,
                            serial_numbers: itemMetadata.serial_numbers || [],
                            customer_id: header.customer_id || null,
                            invoice_date: header.date || new Date(),
                            domain_data: itemMetadata
                        }, userId, client);
                    }
                }
            }

            // 6. Reverse old accounting, apply new
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
                        { businessId, userId, reason: `Invoice ${invoice.invoice_number} Update Reversal` },
                        client
                    );
                }
            }

            await AccountingService.recordBusinessTransaction('sale', {
                businessId, referenceId: invoice.id, amount: invoice.grand_total,
                taxAmount: invoice.tax_total, description: `Invoice ${invoice.invoice_number} (Updated)`, userId
            }, client);

            if (shouldManageTransaction) await client.query('COMMIT');

            const inventoryTouched =
                oldItems.some((item) => item.product_id) ||
                (Array.isArray(items) &&
                    !header.skip_inventory &&
                    items.some((item) => item.product_id));
            maybeInvalidateStorefrontCatalog(shouldManageTransaction, businessId, inventoryTouched);

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
                    UPDATE customers SET outstanding_balance = COALESCE(outstanding_balance, 0) - $1, updated_at = NOW()
                    WHERE id = $2 AND business_id = $3
                `, [invoice.grand_total, invoice.customer_id, businessId]);
            }

            // 2. Restore Stock (ONLY if it wasn't a POS conversion which handled its own inventory)
            const posCheck = await client.query('SELECT 1 FROM pos_transactions WHERE invoice_id = $1 LIMIT 1', [invoiceId]);
            const isPOSConversion = posCheck.rows.length > 0;

            // Hoist itemsRes so it's accessible in the return block
            let itemsRes = { rows: [] };
            if (!isPOSConversion) {
                itemsRes = await client.query('SELECT * FROM invoice_items WHERE invoice_id = $1 AND business_id = $2', [invoiceId, businessId]);
                for (const item of itemsRes.rows) {
                    if (item.product_id) {
                        await InventoryService.addStock({
                            business_id: businessId,
                            product_id: item.product_id,
                            quantity: Number(item.quantity) || 0, // Coerce Decimal/string from DB to number
                            reference_type: 'void_invoice',
                            reference_id: invoiceId,
                            notes: `Voided Invoice: ${invoice.invoice_number}`
                        }, userId, client);
                    }
                }
            }

            // 3. Release any active inventory reservations (reference_type/reference_id now exist in schema)
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

            maybeInvalidateStorefrontCatalog(
                shouldManageTransaction,
                businessId,
                !isPOSConversion && itemsRes.rows.some((item) => item.product_id)
            );

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

            maybeInvalidateStorefrontCatalog(
                shouldManageTransaction,
                businessId,
                reservationsRes.rows.length > 0
            );

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
                    c.address as customer_address,
                    bal.remaining_balance as balance,
                    GREATEST(
                        COALESCE(i.grand_total, 0) - COALESCE(bal.remaining_balance, COALESCE(i.grand_total, 0)),
                        0
                    ) as total_paid
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(calculate_invoice_balance(i.id), i.grand_total) AS remaining_balance
                ) bal ON true
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
                skip_inventory: true, // POS already deducted stock
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
