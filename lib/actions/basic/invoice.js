'use server';

import pool from '@/lib/db';
import { addStockAction, removeStockAction } from '@/lib/actions/standard/inventory/stock';
import { createGLEntryAction } from './accounting';
import { invoiceSchema, validateWithSchema } from '@/lib/validation/schemas';
import { ACCOUNT_CODES } from '@/lib/config/accounting';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';
import { auditWrite } from '@/lib/actions/_shared/audit';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';
import { withGuard } from '@/lib/rbac/serverGuard';

import { InvoiceService } from '@/lib/services/InvoiceService';

async function checkAuth(businessId, permission = 'sales.view') {
    const { session } = await withGuard(businessId, { permission });
    return session;
}

/**
 * Server Action: Create invoice with automated stock and ledger integration
 */
export async function createInvoiceAction(params) {
    try {
        const { invoiceData, items: rawItems } = params;
        const session = await checkAuth(invoiceData.business_id, 'sales.create_invoice');

        // Note: Validation already happens via Zod in the original structure, 
        // will keep for schema compatibility but delegate logic to service.
        const validation = validateWithSchema(invoiceSchema, { ...invoiceData, items: rawItems });
        if (!validation.success) return await actionFailure('VALIDATION_ERROR', 'Validation failed', validation.errors);
        
        const invoice = await InvoiceService.createInvoice(validation.data, session.user.id);

        auditWrite({
            businessId: invoice.business_id, action: 'create', entityType: 'invoice', entityId: invoice.id,
            description: `Created invoice ${invoice.invoice_number}`,
            metadata: { invoiceNumber: invoice.invoice_number, grandTotal: invoice.grand_total, customerId: invoice.customer_id },
        });

        return await actionSuccess({ invoice });
    } catch (e) {
        console.error("Create Invoice Action Error:", e);
        return await actionFailure(
            e?.code || 'CREATE_INVOICE_FAILED',
            await getErrorMessage(e),
            {
                requiredPlan: e?.requiredPlan || null,
                limitKey: e?.limitKey || null,
                limit: Number.isFinite(Number(e?.limit)) ? Number(e.limit) : null,
            }
        );
    }
}

export async function getInvoicesAction(businessId) {
    try {
        await checkAuth(businessId, 'sales.view');
        const client = await pool.connect();
        try {
            const res = await client.query(`
                SELECT i.*, 
                       c.name as customer_name, c.email as customer_email,
                       (SELECT json_agg(it.*) FROM invoice_items it WHERE it.invoice_id = i.id) as items
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id
                WHERE i.business_id = $1
                  AND (i.is_deleted = false OR i.is_deleted IS NULL)
                ORDER BY i.date DESC
            `, [businessId]);
            return await actionSuccess({ invoices: res.rows });
        } finally {
            client.release();
        }
    } catch (e) {
        return await actionFailure('GET_INVOICES_FAILED', await getErrorMessage(e));
    }
}

/**
 * Server Action: Void/Delete invoice with automated stock and ledger reversal
 */
export async function deleteInvoiceAction(businessId, invoiceId) {
    try {
        const session = await checkAuth(businessId, 'sales.delete_invoice');
        
        const client = await pool.connect();
        try {
            await assertEntityBelongsToBusiness(client, 'invoice', invoiceId, businessId);
            await InvoiceService.voidInvoice(businessId, invoiceId, session.user.id);
        } finally {
            client.release();
        }

        auditWrite({
            businessId, action: 'void', entityType: 'invoice', entityId: invoiceId,
            description: `Voided/Deleted invoice ${invoiceId}`,
        });

        return await actionSuccess();
    } catch (e) {
        return await actionFailure('DELETE_INVOICE_FAILED', await getErrorMessage(e));
    }
}
export async function updateInvoiceAction(params) {
    try {
        const { invoiceId, invoiceData, items } = params;
        if (!invoiceData?.business_id) throw new Error('Business ID is missing in invoice data');

        // Sanitize numeric fields (Top Level)
        const numericFields = ['subtotal', 'tax_total', 'discount_total', 'grand_total', 'total_tax'];
        const sanitizedData = { ...invoiceData };

        if (sanitizedData.total_tax === undefined && sanitizedData.tax_total !== undefined) {
            sanitizedData.total_tax = sanitizedData.tax_total;
        }

        numericFields.forEach(field => {
            if (sanitizedData[field] !== undefined) {
                if (typeof sanitizedData[field] === 'string') {
                    const val = parseFloat(sanitizedData[field]);
                    sanitizedData[field] = isNaN(val) ? 0 : val;
                } else if (sanitizedData[field] === null) {
                    sanitizedData[field] = 0;
                }
            }
        });

        // Sanitize Items
        const sanitizedItems = items.map(item => {
            const newItem = { ...item };
            ['quantity', 'unit_price', 'tax_percent', 'tax_amount', 'discount_amount', 'total_amount'].forEach(f => {
                if (newItem[f] !== undefined) {
                    if (typeof newItem[f] === 'string') {
                        const val = parseFloat(newItem[f]);
                        newItem[f] = isNaN(val) ? 0 : val;
                    } else if (newItem[f] === null) {
                        newItem[f] = 0;
                    }
                }
            });
            return newItem;
        });

        // ✅ 1. Validate with Zod
        const validation = validateWithSchema(invoiceSchema, { ...sanitizedData, items: sanitizedItems });
        if (!validation.success) {
            return actionFailure('VALIDATION_ERROR', 'Validation failed', validation.errors);
        }

        const validated = validation.data;
        await checkAuth(validated.business_id, 'sales.edit_invoice');
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            
            // Assert invoice belongs to business before updating
            await assertEntityBelongsToBusiness(client, 'invoice', invoiceId, validated.business_id);

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
                    await addStockAction({
                        business_id: validated.business_id,
                        product_id: item.product_id,
                        quantity: Number(item.quantity) || 0,
                        notes: `Correction: Invoice ${validated.invoice_number} update (Revert)`,
                        reference_type: 'adjustment',
                        reference_id: invoiceId
                    }, client);
                }
            }

            // 3. Update Invoice Header
            const invQuery = `
                UPDATE invoices SET
                    customer_id = $1, date = $2, due_date = $3, status = $4,
                    subtotal = $5, tax_total = $6, discount_total = $7, grand_total = $8,
                    payment_method = $9, payment_status = $10, notes = $11, terms = $12, 
                    tax_details = $13, domain_data = $14, updated_at = NOW()
                WHERE id = $15 AND business_id = $16
                RETURNING *
            `;
            const invValues = [
                validated.customer_id, validated.date, validated.due_date, validated.status,
                validated.subtotal, validated.total_tax, validated.discount_total,
                validated.grand_total, validated.payment_method, validated.payment_status,
                validated.notes, validated.terms,
                JSON.stringify(validated.tax_details || {}),
                JSON.stringify(validated.domain_data || {}),
                invoiceId, validated.business_id
            ];

            const invRes = await client.query(invQuery, invValues);
            const invoice = invRes.rows[0];

            if (!invoice) throw new Error(`Invoice update failed. ID: ${invoiceId}`);

            // 3.5 Update Customer Balance (Difference)
            const balanceDiff = Number(validated.grand_total) - Number(oldItemsRes.rows[0]?.header_total || 0);
            if (balanceDiff !== 0) {
                await client.query(`
                    UPDATE customers 
                    SET outstanding_balance = COALESCE(outstanding_balance, 0) + $1,
                        updated_at = NOW()
                    WHERE id = $2 AND business_id = $3
                `, [balanceDiff, validated.customer_id, validated.business_id]);
            }

            // 4. Replace Items
            await client.query('DELETE FROM invoice_items WHERE invoice_id = $1 AND business_id = $2', [invoiceId, validated.business_id]);

            for (const item of validated.items) {
                await client.query(`
                    INSERT INTO invoice_items (
                        business_id, invoice_id, product_id, name, description, quantity, 
                        unit_price, tax_percent, tax_amount, discount_amount, total_amount, metadata
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    invoice.business_id, invoice.id, item.product_id, item.name, item.description,
                    item.quantity, item.unit_price, item.tax_percent, item.tax_amount,
                    item.discount_amount, item.total_amount, JSON.stringify(item.metadata || {})
                ]);

                // 5. Deduct new stock
                if (item.product_id) {
                    await removeStockAction({
                        business_id: invoice.business_id,
                        product_id: item.product_id,
                        warehouse_id: item.metadata?.warehouse_id || null,
                        quantity: Number(item.quantity) || 0,
                        reference_type: 'invoices',
                        reference_id: invoice.id,
                        notes: `Invoice ${invoice.invoice_number} (Updated)`,
                        batch_id: item.metadata?.batch_id || null,
                        serial_numbers: item.metadata?.serial_numbers || []
                    }, client);
                }
            }

            // 6. Update GL Entry (DELETE OLD, RE-POST NEW)
            await client.query(
                'DELETE FROM gl_entries WHERE business_id = $1 AND (reference_type = $2 OR reference_type = $3) AND reference_id = $4',
                [validated.business_id, 'invoice', 'invoices', invoiceId]
            );

            const grandTotal = Number(validated.grand_total) || 0;
            const taxTotal = Number(validated.total_tax ?? validated.tax_total ?? 0) || 0;
            const netRevenue = Math.max(0, grandTotal - taxTotal);

            await createGLEntryAction({
                businessId: validated.business_id,
                referenceId: invoice.id,
                referenceType: 'invoices',
                description: `Invoice #${validated.invoice_number} (Updated)`,
                date: validated.date,
                entries: [
                    { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: grandTotal, credit: 0 },
                    { accountCode: ACCOUNT_CODES.SALES_REVENUE, debit: 0, credit: netRevenue },
                    ...(taxTotal > 0 ? [{ accountCode: ACCOUNT_CODES.SALES_TAX_PAYABLE, debit: 0, credit: taxTotal }] : [])
                ]
            }, client);

            await client.query('COMMIT');
            return await actionSuccess({ invoice });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (e) {
        return await actionFailure('UPDATE_INVOICE_FAILED', await getErrorMessage(e));
    }
}
