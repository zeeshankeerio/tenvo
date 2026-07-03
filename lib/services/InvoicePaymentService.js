import pool from '@/lib/db';
import { AccountingService } from './AccountingService';
import { onMembershipInvoicePaid } from '@/lib/memberships/membershipInvoiceHooks';
import { notifyPaymentReceived } from '@/lib/notifications/notificationHelpers';

/**
 * Invoice Payment Service
 * Manages payments against invoices with partial payment support,
 * payment reconciliation, and balance tracking.
 */
export const InvoicePaymentService = {

    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Record a payment against an invoice
     * 
     * @param {Object} params - Payment parameters
     * @param {string} params.businessId - Business ID
     * @param {string} params.invoiceId - Invoice ID
     * @param {number} params.amount - Payment amount
     * @param {string} params.paymentMethod - Payment method (cash, card, transfer, etc.)
     * @param {string} params.referenceNumber - Optional reference/check number
     * @param {string} params.notes - Optional notes
     * @param {string} params.userId - User recording the payment
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Created payment record
     */
    async recordPayment(params, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const {
                businessId,
                invoiceId,
                amount,
                paymentMethod,
                paymentDate = null,
                referenceNumber = null,
                transactionId = null,
                gatewayResponse = {},
                notes = '',
                userId,
                skipCustomerBalance = false,
                skipAccounting = false,
            } = params;

            // Validate invoice exists and belongs to business
            const invoiceRes = await client.query(
                'SELECT * FROM invoices WHERE id = $1 AND business_id = $2 FOR UPDATE',
                [invoiceId, businessId]
            );

            if (invoiceRes.rows.length === 0) {
                throw new Error('Invoice not found');
            }

            const invoice = invoiceRes.rows[0];

            // Check if invoice is voided
            if (invoice.status === 'voided' || invoice.is_deleted) {
                throw new Error('Cannot record payment on voided invoice');
            }

            // Calculate current balance
            const balanceRes = await client.query(
                'SELECT calculate_invoice_balance($1) as balance',
                [invoiceId]
            );
            const currentBalance = Number(balanceRes.rows[0].balance);

            // Validate payment amount doesn't exceed balance
            if (amount > currentBalance) {
                throw new Error(`Payment amount exceeds invoice balance. Balance: ${currentBalance.toFixed(2)}`);
            }

            // Insert payment record
            const paymentRes = await client.query(`
                INSERT INTO invoice_payments (
                    business_id, invoice_id, amount, payment_method,
                    payment_date, reference_number, transaction_id, gateway_response,
                    notes, received_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `, [
                businessId, invoiceId, amount, paymentMethod,
                paymentDate || new Date(), referenceNumber, transactionId, JSON.stringify(gatewayResponse),
                notes, userId
            ]);

            const payment = paymentRes.rows[0];

            if (invoice.customer_id && !skipCustomerBalance) {
                await client.query(`
                    UPDATE customers 
                    SET outstanding_balance = GREATEST(COALESCE(outstanding_balance, 0) - $1, 0),
                        updated_at = NOW()
                    WHERE id = $2 AND business_id = $3
                `, [amount, invoice.customer_id, businessId]);
            }

            if (!skipAccounting) {
                const mode = String(paymentMethod || 'cash').toLowerCase();
                const isCash = mode === 'cash' || mode === 'cod';
                await AccountingService.recordBusinessTransaction(
                    'payment',
                    {
                        businessId,
                        referenceId: payment.id,
                        amount: Number(amount),
                        paymentType: 'receipt',
                        paymentMode: isCash ? 'cash' : 'bank',
                        description: `Invoice payment ${invoice.invoice_number}`,
                        userId,
                    },
                    client
                );
            }

            // Get new balance for response
            const newBalanceRes = await client.query(
                'SELECT calculate_invoice_balance($1) as balance',
                [invoiceId]
            );
            const newBalance = Number(newBalanceRes.rows[0].balance);

            // Update invoice payment_status and status based on balance
            const isFullyPaid = newBalance <= 0;
            const totalPaidSoFar = Number(invoice.grand_total) - newBalance;
            let paymentStatus = 'unpaid';
            if (isFullyPaid) {
                paymentStatus = 'paid';
            } else if (totalPaidSoFar > 0) {
                paymentStatus = 'partial';
            }

            await client.query(`
                UPDATE invoices 
                SET payment_status = $1,
                    status = CASE 
                        WHEN $2 = true THEN 'paid'
                        ELSE status 
                    END,
                    updated_at = NOW()
                WHERE id = $3 AND business_id = $4
            `, [paymentStatus, isFullyPaid, invoiceId, businessId]);

            if (isFullyPaid) {
              try {
                await onMembershipInvoicePaid(client, businessId, invoiceId, userId);
              } catch (membershipHookErr) {
                console.warn(
                  '[InvoicePaymentService] membership invoice hook failed (non-fatal):',
                  membershipHookErr?.message || membershipHookErr
                );
              }
            }

            // Create payment notification
            try {
                // Get business and customer info for notification
                const businessInfo = await client.query(
                    'SELECT id, domain, currency, country, business_name FROM businesses WHERE id = $1',
                    [businessId]
                );
                const business = businessInfo.rows[0];
                
                const customerInfo = await client.query(
                    'SELECT name FROM customers WHERE id = $1 AND business_id = $2',
                    [invoice.customer_id, businessId]
                );
                const customerName = customerInfo.rows[0]?.name || 'Customer';
                
                if (business) {
                    await notifyPaymentReceived({
                        businessId,
                        business,
                        invoiceId,
                        invoiceNumber: invoice.invoice_number,
                        customerName,
                        amount,
                        paymentMethod,
                        client,
                    });
                }
            } catch (notifyErr) {
                console.warn('[InvoicePaymentService] notification skipped:', notifyErr?.message || notifyErr);
            }

            if (shouldManageTransaction) await client.query('COMMIT');

            return {
                success: true,
                payment,
                invoice: {
                    id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    previous_balance: currentBalance,
                    new_balance: newBalance,
                    is_fully_paid: isFullyPaid
                }
            };

        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get all payments for an invoice
     */
    async getPaymentsForInvoice(businessId, invoiceId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const res = await client.query(`
                SELECT 
                    ip.*,
                    u.name as received_by_name
                FROM invoice_payments ip
                LEFT JOIN "user" u ON ip.received_by = u.id
                WHERE ip.business_id = $1 
                  AND ip.invoice_id = $2
                  AND (ip.is_deleted = false OR ip.is_deleted IS NULL)
                ORDER BY ip.payment_date DESC, ip.created_at DESC
            `, [businessId, invoiceId]);

            return res.rows;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get payment summary for an invoice
     */
    async getPaymentSummary(businessId, invoiceId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            // Balance comes from DB function (respects soft-deleted payments once 033 migration is applied).
            // total_paid is derived so we never reference optional columns on invoice_payments in this query.
            const res = await client.query(`
                SELECT 
                    i.grand_total AS total_amount,
                    bal.remaining_balance AS balance,
                    GREATEST(
                        COALESCE(i.grand_total, 0) - COALESCE(bal.remaining_balance, COALESCE(i.grand_total, 0)),
                        0
                    ) AS total_paid,
                    (SELECT COUNT(*)::int FROM invoice_payments ipc WHERE ipc.invoice_id = i.id AND (ipc.is_deleted = false OR ipc.is_deleted IS NULL)) AS payment_count,
                    (SELECT MAX(ipm.payment_date) FROM invoice_payments ipm WHERE ipm.invoice_id = i.id AND (ipm.is_deleted = false OR ipm.is_deleted IS NULL)) AS last_payment_date
                FROM invoices i
                LEFT JOIN LATERAL (
                    SELECT COALESCE(calculate_invoice_balance(i.id), i.grand_total) AS remaining_balance
                ) bal ON true
                WHERE i.id = $1
                  AND i.business_id = $2
                  AND (i.is_deleted = false OR i.is_deleted IS NULL)
            `, [invoiceId, businessId]);

            if (res.rows.length === 0) {
                return null;
            }

            const row = res.rows[0];
            return {
                total_amount: Number(row.total_amount),
                total_paid: Number(row.total_paid),
                balance: Number(row.balance),
                payment_count: Number(row.payment_count),
                last_payment_date: row.last_payment_date,
                payment_percentage: row.total_amount > 0 
                    ? Math.round((row.total_paid / row.total_amount) * 100) 
                    : 0
            };
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Void/Reverse a payment
     */
    async voidPayment(businessId, paymentId, userId, reason = '', txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // Get payment details
            const paymentRes = await client.query(
                'SELECT * FROM invoice_payments WHERE id = $1 AND business_id = $2',
                [paymentId, businessId]
            );

            if (paymentRes.rows.length === 0) {
                throw new Error('Payment not found');
            }

            const payment = paymentRes.rows[0];

            // Get invoice
            const invoiceRes = await client.query(
                'SELECT * FROM invoices WHERE id = $1 AND business_id = $2 FOR UPDATE',
                [payment.invoice_id, businessId]
            );
            const invoice = invoiceRes.rows[0];

            // Mark payment as deleted
            await client.query(`
                UPDATE invoice_payments 
                SET is_deleted = true, 
                    deleted_at = NOW(), 
                    deleted_by = $1,
                    notes = COALESCE(notes, '') || ' [VOIDED: ' || $2 || ']'
                WHERE id = $3 AND business_id = $4
            `, [userId, reason, paymentId, businessId]);

            // Reverse customer balance update
            if (invoice.customer_id) {
                await client.query(`
                    UPDATE customers 
                    SET outstanding_balance = COALESCE(outstanding_balance, 0) + $1,
                        updated_at = NOW()
                    WHERE id = $2 AND business_id = $3
                `, [payment.amount, invoice.customer_id, businessId]);
            }

            if (shouldManageTransaction) await client.query('COMMIT');

            return {
                success: true,
                message: 'Payment voided successfully',
                voided_amount: payment.amount
            };

        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get overdue invoices with aging buckets
     */
    async getAgingReport(businessId, options = {}, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const { customerId, asOfDate = new Date() } = options;

            let query = `
                SELECT 
                    ia.*,
                    c.name as customer_name,
                    c.email as customer_email,
                    c.phone as customer_phone
                FROM invoice_aging ia
                LEFT JOIN customers c ON ia.customer_id = c.id
                WHERE ia.business_id = $1
                  AND ia.balance > 0
                  AND ia.payment_status != 'paid'
            `;

            const params = [businessId];

            if (customerId) {
                query += ` AND ia.customer_id = $${params.length + 1}`;
                params.push(customerId);
            }

            query += ` ORDER BY ia.days_overdue DESC NULLS LAST, ia.date DESC`;

            const res = await client.query(query, params);

            // Calculate totals
            const summary = res.rows.reduce((acc, inv) => {
                acc.total_balance += Number(inv.balance);
                acc.total_current += Number(inv.current_amount);
                acc.total_1_30 += Number(inv.days_1_30);
                acc.total_31_60 += Number(inv.days_31_60);
                acc.total_61_90 += Number(inv.days_61_90);
                acc.total_over_90 += Number(inv.days_over_90);
                return acc;
            }, {
                total_balance: 0,
                total_current: 0,
                total_1_30: 0,
                total_31_60: 0,
                total_61_90: 0,
                total_over_90: 0
            });

            return {
                invoices: res.rows,
                summary,
                count: res.rows.length
            };
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Mirror legacy `payments` allocation into canonical `invoice_payments` (no duplicate GL/balance).
     */
    async syncFromLegacyPaymentAllocation(
        {
            businessId,
            invoiceId,
            amount,
            paymentMethod,
            legacyPaymentId,
            paymentDate = null,
            referenceNumber = null,
            notes = '',
            userId,
        },
        txClient = null
    ) {
        const client = await this.getClient(txClient);
        const refKey = legacyPaymentId ? `legacy-payment:${legacyPaymentId}` : referenceNumber;
        if (refKey) {
            const dup = await client.query(
                `SELECT id FROM invoice_payments
                 WHERE business_id = $1 AND invoice_id = $2
                   AND (reference_number = $3 OR notes LIKE $4)
                   AND (is_deleted = false OR is_deleted IS NULL)
                 LIMIT 1`,
                [businessId, invoiceId, refKey, `%legacy-payment:${legacyPaymentId}%`]
            );
            if (dup.rows.length > 0) {
                return { success: true, skipped: true, payment: dup.rows[0] };
            }
        }

        return this.recordPayment(
            {
                businessId,
                invoiceId,
                amount,
                paymentMethod,
                paymentDate,
                referenceNumber: refKey || referenceNumber,
                notes: notes || (legacyPaymentId ? `Synced from payment ${legacyPaymentId}` : notes),
                userId,
                skipCustomerBalance: true,
                skipAccounting: true,
            },
            client
        );
    },
};
