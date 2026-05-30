'use server';

import { db } from '@/lib/db';
import { createGLEntryAction } from '@/lib/actions/basic/accounting';
import { ACCOUNT_CODES } from '@/lib/config/accounting';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';
import { withGuard } from '@/lib/rbac/serverGuard';
import { auditWrite } from '@/lib/actions/_shared/audit';

import { PaymentService } from '@/lib/services/PaymentService';
import { serializeDecimalsDeep } from '@/lib/utils/serializePrismaDecimals';

async function ensureAccess(businessId, permission) {
    const { session } = await withGuard(businessId, { permission });
    return session;
}

/**
 * Server Action: Get all payments for a business
 * @param {string} businessId - Business UUID
 * @param {object} filters - Optional filters
 */
export async function getPaymentsAction(businessId, filters = {}) {
    try {
        await ensureAccess(businessId, 'payments.view');

        const where = {
            business_id: businessId,
            is_deleted: false
        };

        if (filters.payment_type) where.payment_type = filters.payment_type;
        if (filters.customer_id) where.customer_id = filters.customer_id;
        if (filters.vendor_id) where.vendor_id = filters.vendor_id;

        if (filters.date_from || filters.date_to) {
            where.payment_date = {};
            if (filters.date_from) where.payment_date.gte = new Date(filters.date_from);
            if (filters.date_to) where.payment_date.lte = new Date(filters.date_to);
        }

        const payments = await db.payments.findMany({
            where,
            include: {
                customers: { select: { name: true } },
                vendors: { select: { name: true } }
            },
            orderBy: [{ payment_date: 'desc' }, { created_at: 'desc' }]
        });

        // Map relational fields to legacy expected names
        const mappedPayments = payments.map(p => {
            const { customers, vendors, ...rest } = p;
            return {
                ...rest,
                customer_name: customers?.name || null,
                vendor_name: vendors?.name || null
            };
        });

        // Prisma Decimal is not serializable to Client Components (RSC / Server Actions)
        return await actionSuccess({
            payments: serializeDecimalsDeep(mappedPayments),
        });
    } catch (error) {
        console.error('Get payments error:', error);
        return await actionFailure('GET_PAYMENTS_FAILED', await getErrorMessage(error));
    }
}

/**
 * Server Action: Create a payment (customer receipt or vendor payment)
 */
export async function createPaymentAction(paymentData) {
    try {
        const session = await ensureAccess(paymentData.business_id, 'payments.create');
        const payment = await PaymentService.createPayment(paymentData, session.user.id);

        auditWrite({
            businessId: paymentData.business_id,
            action: 'create',
            entityType: 'payment',
            entityId: payment.id,
            description: `Created ${paymentData.payment_type || 'payment'}: ${payment.amount}`,
            metadata: { amount: payment.amount, paymentType: payment.payment_type, paymentMode: payment.payment_mode }
        });

        return await actionSuccess({
            payment: serializeDecimalsDeep(payment),
        });
    } catch (error) {
        console.error('Create payment action error:', error);
        return await actionFailure('CREATE_PAYMENT_FAILED', await getErrorMessage(error));
    }
}

/**
 * Server Action: Get customer ledger (all transactions)
 */
export async function getCustomerLedgerAction(customerId, businessId) {
    try {
        await ensureAccess(businessId, 'customers.view_ledger');

        // Get customer details
        const customer = await db.customers.findFirst({
            where: { id: customerId, business_id: businessId }
        });

        if (!customer) {
            return { success: false, error: 'Customer not found' };
        }

        // Get all invoices for this customer
        const invoices = await db.invoices.findMany({
            where: {
                customer_id: customerId,
                business_id: businessId,
                is_deleted: false
            },
            select: {
                id: true,
                invoice_number: true,
                date: true,
                grand_total: true,
                status: true
            },
            orderBy: { date: 'desc' }
        });

        // Get all payments for this customer
        const payments = await db.payments.findMany({
            where: {
                customer_id: customerId,
                business_id: businessId,
                payment_type: 'received',
                is_deleted: false
            },
            select: {
                id: true,
                payment_date: true,
                amount: true,
                payment_mode: true,
                notes: true
            },
            orderBy: { payment_date: 'desc' }
        });

        // Combine and sort by date ASCENDING for running balance calculation
        const transactions = [
            ...invoices.map(inv => ({
                id: inv.id,
                date: inv.date,
                invoice_number: inv.invoice_number,
                status: inv.status,
                transaction_type: 'invoice',
                total_amount: Number(inv.grand_total) || 0,
                debit: Number(inv.grand_total) || 0,
                credit: 0
            })),
            ...payments.map(pay => ({
                id: pay.id,
                date: pay.payment_date,
                payment_mode: pay.payment_mode,
                notes: pay.notes,
                transaction_type: 'payment',
                amount: Number(pay.amount) || 0,
                debit: 0,
                credit: Number(pay.amount) || 0
            }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate running balance
        let balance = 0;
        const ledgerCalculated = transactions.map(txn => {
            balance += (txn.debit - txn.credit);
            return { ...txn, balance };
        });

        // Reverse for display (Newest First)
        const ledger = ledgerCalculated.reverse();

        return serializeDecimalsDeep({
            success: true,
            customer,
            ledger,
            currentBalance: customer.outstanding_balance,
        });
    } catch (error) {
        console.error('Get customer ledger error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Get vendor ledger (all transactions)
 */
export async function getVendorLedgerAction(vendorId, businessId) {
    try {
        await ensureAccess(businessId, 'vendors.view');

        // Get vendor details
        const vendor = await db.vendors.findFirst({
            where: { id: vendorId, business_id: businessId }
        });

        if (!vendor) {
            return { success: false, error: 'Vendor not found' };
        }

        // Get all purchases for this vendor
        const purchases = await db.purchases.findMany({
            where: {
                vendor_id: vendorId,
                business_id: businessId
            },
            select: {
                id: true,
                purchase_number: true,
                date: true,
                total_amount: true,
                status: true
            },
            orderBy: { date: 'desc' }
        });

        // Get all payments for this vendor
        const payments = await db.payments.findMany({
            where: {
                vendor_id: vendorId,
                business_id: businessId,
                payment_type: 'paid',
                is_deleted: false
            },
            select: {
                id: true,
                payment_date: true,
                amount: true,
                payment_mode: true,
                notes: true
            },
            orderBy: { payment_date: 'desc' }
        });

        // Combine and sort by date ASCENDING for calculation
        const transactions = [
            ...purchases.map(pur => ({
                id: pur.id,
                date: pur.date,
                purchase_number: pur.purchase_number,
                status: pur.status,
                transaction_type: 'purchase',
                total_amount: Number(pur.total_amount) || 0,
                debit: Number(pur.total_amount) || 0,
                credit: 0
            })),
            ...payments.map(pay => ({
                id: pay.id,
                date: pay.payment_date,
                payment_mode: pay.payment_mode,
                notes: pay.notes,
                transaction_type: 'payment',
                amount: Number(pay.amount) || 0,
                debit: 0,
                credit: Number(pay.amount) || 0
            }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate running balance (Payable - Paid)
        let balance = 0;
        const ledgerCalculated = transactions.map(txn => {
            balance += (txn.debit - txn.credit);
            return { ...txn, balance };
        });

        // Reverse for display
        const ledger = ledgerCalculated.reverse();

        return serializeDecimalsDeep({
            success: true,
            vendor,
            ledger,
            currentBalance: vendor.outstanding_balance,
        });
    } catch (error) {
        console.error('Get vendor ledger error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Void payment and reverse automated accounting
 * Uses soft-delete via voidPayment to preserve audit trail.
 * @param {string} businessId - Business UUID (required for tenant isolation)
 * @param {string} paymentId - Payment UUID
 * @param {string} [reason] - Reason for voiding
 */
export async function deletePaymentAction(businessId, paymentId, reason = 'Voided by user') {
    try {
        const session = await ensureAccess(businessId, 'finance.manage_payments');
        const result = await PaymentService.voidPayment(
            paymentId, reason,
            { businessId, userId: session.user.id }
        );

        auditWrite({
            businessId,
            action: 'void',
            entityType: 'payment',
            entityId: paymentId,
            description: `Voided payment ${paymentId}: ${reason}`,
        });

        return await actionSuccess(serializeDecimalsDeep({ message: result.message, ...result }));
    } catch (error) {
        console.error('Void payment action error:', error);
        return await actionFailure('VOID_PAYMENT_FAILED', await getErrorMessage(error));
    }
}
