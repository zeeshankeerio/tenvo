'use server';

import { db } from '@/lib/db';
import { invoiceSchema, validateWithSchema } from '@/lib/validation/schemas';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';
import { auditWrite } from '@/lib/actions/_shared/audit';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';
import { withGuard } from '@/lib/rbac/serverGuard';

import { InvoiceService } from '@/lib/services/InvoiceService';
import { serializeDecimalsDeep } from '@/lib/utils/serializePrismaDecimals';

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

        return await actionSuccess({ invoice: serializeDecimalsDeep(invoice) });
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
        
        const invoices = await db.invoices.findMany({
            where: {
                business_id: businessId,
                is_deleted: false
            },
            orderBy: { date: 'desc' },
            include: {
                customers: {
                    select: { name: true, email: true }
                },
                invoice_items: true
            }
        });

        // Map Prisma relational fields to match the legacy expected names
        const mappedInvoices = invoices.map(inv => {
            const { customers, invoice_items, ...rest } = inv;
            return serializeDecimalsDeep({
                ...rest,
                customer_name: customers?.name || null,
                customer_email: customers?.email || null,
                items: invoice_items || []
            });
        });

        return await actionSuccess({ invoices: mappedInvoices });
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

        await assertEntityBelongsToBusiness(null, 'invoice', invoiceId, businessId);
        await InvoiceService.voidInvoice(businessId, invoiceId, session.user.id);

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

        // Validate with Zod
        const validation = validateWithSchema(invoiceSchema, { ...sanitizedData, items: sanitizedItems });
        if (!validation.success) {
            return actionFailure('VALIDATION_ERROR', 'Validation failed', validation.errors);
        }

        const validated = validation.data;
        const session = await checkAuth(validated.business_id, 'sales.edit_invoice');

        // Tenant isolation check (Prisma-native)
        await assertEntityBelongsToBusiness(null, 'invoice', invoiceId, validated.business_id);

        // Delegate to InvoiceService (handles stock reversal, header update, item replacement,
        // new stock deduction, GL journal reversal + re-posting, and customer balance correction)
        const invoice = await InvoiceService.updateInvoice(invoiceId, validated, session.user.id);

        auditWrite({
            businessId: invoice.business_id, action: 'update', entityType: 'invoice', entityId: invoice.id,
            description: `Updated invoice ${invoice.invoice_number}`,
            metadata: { invoiceNumber: invoice.invoice_number, grandTotal: invoice.grand_total, customerId: invoice.customer_id },
        });

        return await actionSuccess({ invoice: serializeDecimalsDeep(invoice) });
    } catch (e) {
        console.error("Update Invoice Action Error:", e);
        return await actionFailure('UPDATE_INVOICE_FAILED', await getErrorMessage(e));
    }
}
