'use server';

import pool from '@/lib/db';
import { createGLEntryAction } from '@/lib/actions/basic/accounting';
import { addStockAction } from '@/lib/actions/standard/inventory/stock';
import { ACCOUNT_CODES } from '@/lib/config/accounting';
import { auditWrite } from '@/lib/actions/_shared/audit';
import { DocumentSequenceService } from '@/lib/services/DocumentSequenceService';
import { withGuard } from '@/lib/rbac/serverGuard';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';
import { InvoicePaymentService } from '@/lib/services/InvoicePaymentService';

async function checkAuth(businessId, client = null, permission = 'finance.credit_notes') {
    const { session } = await withGuard(businessId, { permission, client });
    return session;
}

/**
 * Create a credit note from an existing invoice
 * Reverses GL entries: Debit Sales Revenue, Credit AR
 */
export async function createCreditNoteAction(data) {
    const client = await pool.connect();
    try {
        const session = await checkAuth(data.businessId, client, 'finance.credit_notes');
        await client.query('BEGIN');

        // Validate source invoice
        const invRes = await client.query(
            'SELECT * FROM invoices WHERE id = $1 AND business_id = $2 AND (is_deleted = false OR is_deleted IS NULL)',
            [data.invoiceId, data.businessId]
        );
        if (invRes.rows.length === 0) throw new Error('Invoice not found');
        const invoice = invRes.rows[0];

        // Generate credit note number
        const cnNumber = await DocumentSequenceService.generateNumber({
            businessId: data.businessId,
            documentType: 'credit_note',
            prefix: 'CN-',
            padLength: 6,
        }, client);

        // Calculate totals from items
        let subtotal = 0, totalTax = 0;
        const items = data.items || [];

        for (const item of items) {
            subtotal += parseFloat(item.amount || 0);
            totalTax += parseFloat(item.taxAmount || 0);
        }
        const totalAmount = Math.round((subtotal + totalTax) * 100) / 100;

        // Validate credit note doesn't exceed remaining invoice amount
        const existingCN = await client.query(
            `SELECT COALESCE(SUM(total_amount), 0)::numeric as total_credited
             FROM credit_notes WHERE invoice_id = $1 AND business_id = $2 AND status != 'cancelled'`,
            [data.invoiceId, data.businessId]
        );
        const alreadyCredited = parseFloat(existingCN.rows[0].total_credited);
        const invoiceTotal = parseFloat(invoice.grand_total ?? invoice.total_amount ?? 0);

        if (alreadyCredited + totalAmount > invoiceTotal + 0.01) {
            throw new Error(
                `Credit note (${totalAmount}) would exceed invoice total. ` +
                `Invoice: ${invoiceTotal}, Already credited: ${alreadyCredited}, Remaining: ${(invoiceTotal - alreadyCredited).toFixed(2)}`
            );
        }

        // Create credit note
        const cnResult = await client.query(`
            INSERT INTO credit_notes (
                business_id, credit_note_number, invoice_id, customer_id,
                date, subtotal, tax_amount, total_amount, reason, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'issued')
            RETURNING *
        `, [
            data.businessId, cnNumber, data.invoiceId, invoice.customer_id,
            data.date || new Date(), subtotal, totalTax, totalAmount,
            data.reason || null
        ]);
        const creditNote = cnResult.rows[0];

        // Create credit note items
        for (const item of items) {
            await client.query(`
                INSERT INTO credit_note_items (
                    business_id, credit_note_id, product_id, description, quantity,
                    unit_price, amount, tax_amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                data.businessId, creditNote.id, item.productId || null, item.description,
                item.quantity || 1, item.unitPrice || 0,
                item.amount, item.taxAmount || 0
            ]);
        }

        // GL reversal: Debit Sales Revenue/Tax, Credit AR
        const glEntries = [
            { accountCode: ACCOUNT_CODES.SALES_REVENUE, debit: subtotal, credit: 0 },
            { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: 0, credit: totalAmount },
        ];
        if (totalTax > 0) {
            glEntries.push({ accountCode: ACCOUNT_CODES.SALES_TAX_PAYABLE, debit: totalTax, credit: 0 });
        }

        await createGLEntryAction({
            businessId: data.businessId,
            date: data.date || new Date(),
            description: `Credit Note: ${cnNumber} (Invoice: ${invoice.invoice_number})`,
            referenceType: 'credit_note',
            referenceId: creditNote.id,
            createdBy: session.user.id,
            entries: glEntries,
        }, client);

        // Update customer outstanding balance
        if (invoice.customer_id) {
            await client.query(
                `UPDATE customers SET outstanding_balance = outstanding_balance - $1, updated_at = NOW() WHERE id = $2 AND business_id = $3`,
                [totalAmount, invoice.customer_id, data.businessId]
            );
        }

        // Record offset on source invoice so calculate_invoice_balance() and AR aging stay aligned
        await InvoicePaymentService.recordPayment(
            {
                businessId: data.businessId,
                invoiceId: data.invoiceId,
                amount: totalAmount,
                paymentMethod: 'credit_note',
                paymentDate: data.date || new Date(),
                referenceNumber: cnNumber,
                notes: `Credit note ${cnNumber}`,
                userId: session.user.id,
                skipCustomerBalance: true,
                skipAccounting: true,
            },
            client
        );

        // Restock returned items (if goods were returned)
        if (data.restockItems !== false) {
            for (const item of items) {
                if (item.productId && (item.quantity || 0) > 0) {
                    try {
                        await addStockAction({
                            businessId: data.businessId,
                            productId: item.productId,
                            warehouseId: item.warehouseId || null,
                            quantity: Number(item.quantity) || 1,
                            costPrice: item.unitPrice || 0,
                            notes: `Credit Note: ${cnNumber} (returned goods)`,
                            referenceType: 'credit_note',
                            referenceId: creditNote.id,
                        }, client);
                    } catch (stockErr) {
                        console.error(`Restock failed for product ${item.productId}:`, stockErr.message);
                        // Non-blocking: credit note still completes
                    }
                }
            }
        }

        await client.query('COMMIT');

        // Audit trail (fire-and-forget)
        auditWrite({
            businessId: data.businessId,
            action: 'create',
            entityType: 'credit_note',
            entityId: creditNote.id,
            description: `Credit note ${cnNumber} for invoice ${invoice.invoice_number} -- ${totalAmount}`,
            metadata: { cnNumber, totalAmount, invoiceId: data.invoiceId, invoiceNumber: invoice.invoice_number, restocked: data.restockItems !== false },
        });

        return { success: true, creditNote };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create credit note error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Get credit notes for a business
 */
export async function getCreditNotesAction(businessId, filters = {}) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.credit_notes');

        let query = `
            SELECT cn.*, 
                   i.invoice_number,
                   c.name as customer_name
            FROM credit_notes cn
            LEFT JOIN invoices i ON cn.invoice_id = i.id
            LEFT JOIN customers c ON cn.customer_id = c.id
            WHERE cn.business_id = $1
        `;
        const params = [businessId];
        let idx = 2;

        if (filters.customerId) {
            query += ` AND cn.customer_id = $${idx}`;
            params.push(filters.customerId);
            idx++;
        }
        if (filters.invoiceId) {
            query += ` AND cn.invoice_id = $${idx}`;
            params.push(filters.invoiceId);
            idx++;
        }
        if (filters.status) {
            query += ` AND cn.status = $${idx}`;
            params.push(filters.status);
            idx++;
        }

        query += ` ORDER BY cn.date DESC, cn.created_at DESC`;
        query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
        params.push(filters.limit || 50, filters.offset || 0);

        const result = await client.query(query, params);
        return { success: true, creditNotes: result.rows };
    } catch (error) {
        console.error('Get credit notes error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Apply a credit note to offset a future invoice
 */
export async function applyCreditNoteAction(data) {
    const client = await pool.connect();
    try {
        const session = await checkAuth(data.businessId, client, 'finance.credit_notes');
        await client.query('BEGIN');

        // Validate credit note
        const cnRes = await client.query(
            `SELECT * FROM credit_notes WHERE id = $1 AND business_id = $2 AND status = 'issued'`,
            [data.creditNoteId, data.businessId]
        );
        if (cnRes.rows.length === 0) throw new Error('Credit note not found or already applied');
        const cn = cnRes.rows[0];
        
        // Assert credit note belongs to business before applying
        await assertEntityBelongsToBusiness(client, 'credit_note', data.creditNoteId, data.businessId);

        // Validate target invoice
        const invRes = await client.query(
            `SELECT * FROM invoices WHERE id = $1 AND business_id = $2 AND (is_deleted = false OR is_deleted IS NULL)`,
            [data.targetInvoiceId, data.businessId]
        );
        if (invRes.rows.length === 0) throw new Error('Target invoice not found');
        
        // Assert target invoice belongs to business before applying credit
        await assertEntityBelongsToBusiness(client, 'invoice', data.targetInvoiceId, data.businessId);

        const applyAmount = Math.min(parseFloat(cn.total_amount), parseFloat(data.amount || cn.total_amount));

        await InvoicePaymentService.recordPayment(
            {
                businessId: data.businessId,
                invoiceId: data.targetInvoiceId,
                amount: applyAmount,
                paymentMethod: 'credit_note',
                referenceNumber: cn.credit_note_number,
                notes: `Applied credit note ${cn.credit_note_number}`,
                userId: session.user.id,
                skipCustomerBalance: true,
                skipAccounting: true,
            },
            client
        );

        await client.query(
            `UPDATE credit_notes SET status = 'applied', applied_to_invoice_id = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3`,
            [data.targetInvoiceId, data.creditNoteId, data.businessId]
        );

        await client.query('COMMIT');
        return { success: true, message: `Credit note applied: ${applyAmount}` };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Apply credit note error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}
