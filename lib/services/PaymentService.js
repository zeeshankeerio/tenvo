import pool from '@/lib/db';
import { AccountingService } from './AccountingService';

/**
 * Payment Service (Enterprise SOA)
 * Orchestrates Receipts, Payments, and Balance Synchronization.
 */
export const PaymentService = {

    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Create Payment/Receipt
     */
    async createPayment(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');
            const { business_id: businessId, allocations = [], ...pData } = data;

            // 1. Create Payment Record
            const res = await client.query(`
                INSERT INTO payments (
                    business_id, payment_type, reference_type, reference_id,
                    customer_id, vendor_id, amount, payment_mode, payment_date,
                    bank_name, cheque_number, transaction_id, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `, [
                businessId, pData.payment_type, pData.reference_type, pData.reference_id,
                pData.customer_id, pData.vendor_id, pData.amount, pData.payment_mode || 'cash',
                pData.payment_date || new Date(), pData.bank_name, pData.cheque_number,
                pData.transaction_id, pData.notes
            ]);
            const payment = res.rows[0];

            // 2. Allocations - use allocatePayment for validation
            if (allocations.length > 0) {
                // Use allocatePayment method for proper validation
                await this.allocatePayment(
                    payment.id,
                    allocations,
                    { businessId, userId },
                    client
                );
            } else if (pData.reference_id) {
                // Legacy single allocation
                const invId = pData.reference_type === 'invoice' ? pData.reference_id : null;
                const purId = pData.reference_type === 'purchase' ? pData.reference_id : null;
                
                await this.allocatePayment(
                    payment.id,
                    [{
                        invoice_id: invId,
                        purchase_id: purId,
                        amount: payment.amount
                    }],
                    { businessId, userId },
                    client
                );
            }

            // 3. Update Balance
            if (pData.payment_type === 'receipt' && pData.customer_id) {
                await client.query(`
                    UPDATE customers SET outstanding_balance = outstanding_balance - $1, updated_at = NOW()
                    WHERE id = $2 AND business_id = $3
                `, [pData.amount, pData.customer_id, businessId]);
            } else if (pData.payment_type === 'payment' && pData.vendor_id) {
                await client.query(`
                    UPDATE vendors SET outstanding_balance = outstanding_balance - $1, updated_at = NOW()
                    WHERE id = $2 AND business_id = $3
                `, [pData.amount, pData.vendor_id, businessId]);
            }

            // 4. Update Status (Invoice/Purchase) - now handled by allocatePayment

            // 5. Accounting
            await AccountingService.recordBusinessTransaction('payment', {
                businessId, referenceId: payment.id, amount: payment.amount,
                paymentMode: payment.payment_mode, paymentType: payment.payment_type,
                description: `${payment.payment_type.toUpperCase()} - ${payment.payment_mode.toUpperCase()}`, userId
            }, client);

            if (shouldManageTransaction) await client.query('COMMIT');
            return payment;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Delete Payment
     */
    async deletePayment(businessId, paymentId, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const pRes = await client.query('SELECT * FROM payments WHERE id = $1 AND business_id = $2 FOR UPDATE', [paymentId, businessId]);
            if (pRes.rows.length === 0) throw new Error('Payment not found');
            const payment = pRes.rows[0];

            // 1. Reverse Balance
            if (payment.payment_type === 'receipt' && payment.customer_id) {
                await client.query(`UPDATE customers SET outstanding_balance = outstanding_balance + $1 WHERE id = $2 AND business_id = $3`, [payment.amount, payment.customer_id, businessId]);
            } else if (payment.payment_type === 'payment' && payment.vendor_id) {
                await client.query(`UPDATE vendors SET outstanding_balance = outstanding_balance + $1 WHERE id = $2 AND business_id = $3`, [payment.amount, payment.vendor_id, businessId]);
            }

            // 2. Reverse GL
            await client.query(`DELETE FROM gl_entries WHERE business_id = $1 AND reference_type = 'payment' AND reference_id = $2`, [businessId, paymentId]);

            // 3. Cleanup
            await client.query(`DELETE FROM payment_allocations WHERE payment_id = $1 AND business_id = $2`, [paymentId, businessId]);
            await client.query(`DELETE FROM payments WHERE id = $1 AND business_id = $2`, [paymentId, businessId]);

            if (shouldManageTransaction) await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Void Payment
     * Properly reverses a payment by:
     * 1. Reversing all payment allocations
     * 2. Restoring invoice/purchase payment_status
     * 3. Reversing GL entries via AccountingService.reverseJournalEntry
     * 4. Marking payment as voided (soft delete)
     * 
     * @param {string} paymentId - Payment ID to void
     * @param {string} reason - Reason for voiding
     * @param {Object} context - { businessId, userId }
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Void result
     */
    async voidPayment(paymentId, reason, context, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        const { businessId, userId } = context;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // 1. Get payment details
            const paymentRes = await client.query(`
                SELECT * FROM payments
                WHERE id = $1 AND business_id = $2
                FOR UPDATE
            `, [paymentId, businessId]);

            if (paymentRes.rows.length === 0) {
                throw new Error('Payment not found');
            }

            const payment = paymentRes.rows[0];

            // 2. Check if already voided
            if (payment.status === 'voided' || payment.is_deleted) {
                throw new Error('Payment is already voided');
            }

            // 3. Get all payment allocations
            const allocationsRes = await client.query(`
                SELECT * FROM payment_allocations
                WHERE payment_id = $1 AND business_id = $2
            `, [paymentId, businessId]);

            // 4. Reverse each allocation
            for (const allocation of allocationsRes.rows) {
                if (allocation.invoice_id) {
                    // Restore invoice outstanding balance
                    await client.query(`
                        UPDATE invoices
                        SET 
                            payment_status = CASE
                                WHEN (SELECT COALESCE(SUM(amount), 0) FROM payment_allocations 
                                      WHERE invoice_id = $1 AND payment_id != $2 AND business_id = $3) >= grand_total 
                                THEN 'paid'
                                WHEN (SELECT COALESCE(SUM(amount), 0) FROM payment_allocations 
                                      WHERE invoice_id = $1 AND payment_id != $2 AND business_id = $3) > 0 
                                THEN 'partial'
                                ELSE 'unpaid'
                            END,
                            updated_at = NOW()
                        WHERE id = $1 AND business_id = $3
                    `, [allocation.invoice_id, paymentId, businessId]);
                }

                if (allocation.purchase_id) {
                    // Restore purchase outstanding balance
                    await client.query(`
                        UPDATE purchases
                        SET 
                            payment_status = CASE
                                WHEN (SELECT COALESCE(SUM(amount), 0) FROM payment_allocations 
                                      WHERE purchase_id = $1 AND payment_id != $2 AND business_id = $3) >= total_amount 
                                THEN 'paid'
                                WHEN (SELECT COALESCE(SUM(amount), 0) FROM payment_allocations 
                                      WHERE purchase_id = $1 AND payment_id != $2 AND business_id = $3) > 0 
                                THEN 'partial'
                                ELSE 'pending'
                            END,
                            updated_at = NOW()
                        WHERE id = $1 AND business_id = $3
                    `, [allocation.purchase_id, paymentId, businessId]);
                }
            }

            // 5. Restore customer/vendor outstanding balance
            if (payment.payment_type === 'receipt' && payment.customer_id) {
                await client.query(`
                    UPDATE customers
                    SET outstanding_balance = outstanding_balance + $1, updated_at = NOW()
                    WHERE id = $2 AND business_id = $3
                `, [payment.amount, payment.customer_id, businessId]);
            } else if (payment.payment_type === 'payment' && payment.vendor_id) {
                await client.query(`
                    UPDATE vendors
                    SET outstanding_balance = outstanding_balance + $1, updated_at = NOW()
                    WHERE id = $2 AND business_id = $3
                `, [payment.amount, payment.vendor_id, businessId]);
            }

            // 6. Reverse GL entries using proper accounting reversal
            const journalRes = await client.query(`
                SELECT DISTINCT journal_id FROM gl_entries
                WHERE business_id = $1 AND reference_type = 'payment' AND reference_id = $2
            `, [businessId, paymentId]);

            for (const row of journalRes.rows) {
                if (row.journal_id) {
                    await AccountingService.reverseJournalEntry(
                        row.journal_id,
                        { businessId, userId, reason: `Void payment: ${reason}` },
                        client
                    );
                }
            }

            // 7. Delete payment allocations
            await client.query(`
                DELETE FROM payment_allocations
                WHERE payment_id = $1 AND business_id = $2
            `, [paymentId, businessId]);

            // 8. Mark payment as voided (soft delete)
            await client.query(`
                UPDATE payments
                SET 
                    status = 'voided',
                    is_deleted = true,
                    deleted_at = NOW(),
                    notes = COALESCE(notes || ' | ', '') || 'VOIDED: ' || $1,
                    updated_at = NOW()
                WHERE id = $2 AND business_id = $3
            `, [reason, paymentId, businessId]);

            if (shouldManageTransaction) await client.query('COMMIT');

            return {
                success: true,
                paymentId,
                amount: payment.amount,
                allocationsReversed: allocationsRes.rows.length,
                reason,
                message: `Payment voided successfully: ${reason}`
            };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Get Outstanding Balance
     * Calculates real-time outstanding balance from payment_allocations
     * instead of relying on denormalized outstanding_balance field
     * 
     * @param {string} entityType - 'customer' or 'vendor'
     * @param {string} entityId - Customer or Vendor ID
     * @param {string} businessId - Business ID
     * @returns {Promise<Object>} Outstanding balance details
     */
    async getOutstandingBalance(entityType, entityId, businessId) {
        const client = await this.getClient();

        try {
            let totalInvoiced = 0;
            let totalPaid = 0;
            let openingBalance = 0;

            if (entityType === 'customer') {
                // Get customer opening balance
                const customerRes = await client.query(`
                    SELECT opening_balance FROM customers
                    WHERE id = $1 AND business_id = $2
                `, [entityId, businessId]);

                if (customerRes.rows.length === 0) {
                    throw new Error('Customer not found');
                }

                openingBalance = Number(customerRes.rows[0]?.opening_balance || 0);

                // Get total invoiced
                const invoicedRes = await client.query(`
                    SELECT COALESCE(SUM(grand_total), 0) as total
                    FROM invoices
                    WHERE customer_id = $1 AND business_id = $2
                      AND status != 'voided'
                      AND (is_deleted = false OR is_deleted IS NULL)
                `, [entityId, businessId]);

                totalInvoiced = Number(invoicedRes.rows[0]?.total || 0);

                // Get total paid from allocations
                const paidRes = await client.query(`
                    SELECT COALESCE(SUM(pa.amount), 0) as total
                    FROM payment_allocations pa
                    INNER JOIN payments p ON pa.payment_id = p.id
                    WHERE pa.invoice_id IN (
                        SELECT id FROM invoices 
                        WHERE customer_id = $1 AND business_id = $2
                          AND (is_deleted = false OR is_deleted IS NULL)
                    )
                    AND pa.business_id = $2
                    AND (p.is_deleted = false OR p.is_deleted IS NULL)
                `, [entityId, businessId]);

                totalPaid = Number(paidRes.rows[0]?.total || 0);

            } else if (entityType === 'vendor') {
                // Get vendor opening balance
                const vendorRes = await client.query(`
                    SELECT opening_balance FROM vendors
                    WHERE id = $1 AND business_id = $2
                `, [entityId, businessId]);

                if (vendorRes.rows.length === 0) {
                    throw new Error('Vendor not found');
                }

                openingBalance = Number(vendorRes.rows[0]?.opening_balance || 0);

                // Get total purchased
                const purchasedRes = await client.query(`
                    SELECT COALESCE(SUM(total_amount), 0) as total
                    FROM purchases
                    WHERE vendor_id = $1 AND business_id = $2
                      AND status != 'voided'
                      AND (is_deleted = false OR is_deleted IS NULL)
                `, [entityId, businessId]);

                totalInvoiced = Number(purchasedRes.rows[0]?.total || 0);

                // Get total paid from allocations
                const paidRes = await client.query(`
                    SELECT COALESCE(SUM(pa.amount), 0) as total
                    FROM payment_allocations pa
                    INNER JOIN payments p ON pa.payment_id = p.id
                    WHERE pa.purchase_id IN (
                        SELECT id FROM purchases 
                        WHERE vendor_id = $1 AND business_id = $2
                          AND (is_deleted = false OR is_deleted IS NULL)
                    )
                    AND pa.business_id = $2
                    AND (p.is_deleted = false OR p.is_deleted IS NULL)
                `, [entityId, businessId]);

                totalPaid = Number(paidRes.rows[0]?.total || 0);

            } else {
                throw new Error('Invalid entity type. Must be "customer" or "vendor"');
            }

            // Calculate outstanding balance
            const outstandingBalance = openingBalance + totalInvoiced - totalPaid;

            return {
                success: true,
                entityType,
                entityId,
                openingBalance: Math.round(openingBalance * 100) / 100,
                totalInvoiced: Math.round(totalInvoiced * 100) / 100,
                totalPaid: Math.round(totalPaid * 100) / 100,
                outstandingBalance: Math.round(outstandingBalance * 100) / 100,
                calculatedAt: new Date()
            };
        } finally {
            client.release();
        }
    },

    /**
     * Allocate Payment to Invoices or Purchases
     * Creates payment allocations with validation to prevent over-allocation
     * and ensure customer/vendor matching
     * 
     * @param {string} paymentId - Payment ID
     * @param {Array} allocations - Array of {invoice_id?, purchase_id?, amount}
     * @param {Object} context - { businessId, userId }
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Allocation result
     */
    async allocatePayment(paymentId, allocations, context, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        const { businessId, userId } = context;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // 1. Get payment details
            const paymentRes = await client.query(`
                SELECT * FROM payments
                WHERE id = $1 AND business_id = $2
                FOR UPDATE
            `, [paymentId, businessId]);

            if (paymentRes.rows.length === 0) {
                throw new Error('Payment not found');
            }

            const payment = paymentRes.rows[0];

            // 2. Get existing allocations
            const existingAllocRes = await client.query(`
                SELECT COALESCE(SUM(amount), 0) as allocated
                FROM payment_allocations
                WHERE payment_id = $1 AND business_id = $2
            `, [paymentId, businessId]);

            const existingAllocated = Number(existingAllocRes.rows[0]?.allocated || 0);

            // 3. Calculate new allocation total
            const newAllocationTotal = allocations.reduce((sum, alloc) => sum + Number(alloc.amount), 0);
            const totalAllocated = existingAllocated + newAllocationTotal;

            // 4. Validate: total allocations must not exceed payment amount (Task 3.2)
            if (totalAllocated > Number(payment.amount)) {
                throw new Error(
                    `Over-allocation prevented: Total allocations (${totalAllocated.toFixed(2)}) ` +
                    `would exceed payment amount (${Number(payment.amount).toFixed(2)})`
                );
            }

            // 5. Validate customer/vendor matching for each allocation (Task 3.3)
            for (const alloc of allocations) {
                if (alloc.invoice_id) {
                    // Validate invoice belongs to same customer as payment
                    const invoiceRes = await client.query(`
                        SELECT customer_id FROM invoices
                        WHERE id = $1 AND business_id = $2
                    `, [alloc.invoice_id, businessId]);

                    if (invoiceRes.rows.length === 0) {
                        throw new Error(`Invoice ${alloc.invoice_id} not found`);
                    }

                    const invoiceCustomerId = invoiceRes.rows[0].customer_id;

                    if (payment.customer_id && invoiceCustomerId !== payment.customer_id) {
                        throw new Error(
                            `Customer mismatch: Invoice belongs to customer ${invoiceCustomerId}, ` +
                            `but payment is for customer ${payment.customer_id}`
                        );
                    }
                } else if (alloc.purchase_id) {
                    // Validate purchase belongs to same vendor as payment
                    const purchaseRes = await client.query(`
                        SELECT vendor_id FROM purchases
                        WHERE id = $1 AND business_id = $2
                    `, [alloc.purchase_id, businessId]);

                    if (purchaseRes.rows.length === 0) {
                        throw new Error(`Purchase ${alloc.purchase_id} not found`);
                    }

                    const purchaseVendorId = purchaseRes.rows[0].vendor_id;

                    if (payment.vendor_id && purchaseVendorId !== payment.vendor_id) {
                        throw new Error(
                            `Vendor mismatch: Purchase belongs to vendor ${purchaseVendorId}, ` +
                            `but payment is for vendor ${payment.vendor_id}`
                        );
                    }
                }
            }

            // 6. Create payment allocations
            const createdAllocations = [];
            for (const alloc of allocations) {
                const allocRes = await client.query(`
                    INSERT INTO payment_allocations (
                        business_id, payment_id, invoice_id, purchase_id, amount
                    ) VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                `, [
                    businessId,
                    paymentId,
                    alloc.invoice_id || null,
                    alloc.purchase_id || null,
                    alloc.amount
                ]);

                createdAllocations.push(allocRes.rows[0]);

                // 7. Update invoice/purchase payment_status
                if (alloc.invoice_id) {
                    // Calculate total paid for this invoice
                    const paidRes = await client.query(`
                        SELECT COALESCE(SUM(pa.amount), 0) as paid
                        FROM payment_allocations pa
                        INNER JOIN payments p ON pa.payment_id = p.id
                        WHERE pa.invoice_id = $1 AND pa.business_id = $2
                          AND (p.is_deleted = false OR p.is_deleted IS NULL)
                    `, [alloc.invoice_id, businessId]);

                    const totalPaid = Number(paidRes.rows[0]?.paid || 0);

                    // Get invoice total
                    const invoiceRes = await client.query(`
                        SELECT grand_total FROM invoices
                        WHERE id = $1 AND business_id = $2
                    `, [alloc.invoice_id, businessId]);

                    const invoiceTotal = Number(invoiceRes.rows[0]?.grand_total || 0);

                    // Determine payment status
                    let paymentStatus = 'partial';
                    if (totalPaid >= invoiceTotal) {
                        paymentStatus = 'paid';
                    } else if (totalPaid <= 0) {
                        paymentStatus = 'unpaid';
                    }

                    await client.query(`
                        UPDATE invoices
                        SET payment_status = $1, updated_at = NOW()
                        WHERE id = $2 AND business_id = $3
                    `, [paymentStatus, alloc.invoice_id, businessId]);
                } else if (alloc.purchase_id) {
                    // Calculate total paid for this purchase
                    const paidRes = await client.query(`
                        SELECT COALESCE(SUM(pa.amount), 0) as paid
                        FROM payment_allocations pa
                        INNER JOIN payments p ON pa.payment_id = p.id
                        WHERE pa.purchase_id = $1 AND pa.business_id = $2
                          AND (p.is_deleted = false OR p.is_deleted IS NULL)
                    `, [alloc.purchase_id, businessId]);

                    const totalPaid = Number(paidRes.rows[0]?.paid || 0);

                    // Get purchase total
                    const purchaseRes = await client.query(`
                        SELECT total_amount FROM purchases
                        WHERE id = $1 AND business_id = $2
                    `, [alloc.purchase_id, businessId]);

                    const purchaseTotal = Number(purchaseRes.rows[0]?.total_amount || 0);

                    // Determine payment status
                    let paymentStatus = 'partial';
                    if (totalPaid >= purchaseTotal) {
                        paymentStatus = 'paid';
                    } else if (totalPaid <= 0) {
                        paymentStatus = 'pending';
                    }

                    await client.query(`
                        UPDATE purchases
                        SET payment_status = $1, updated_at = NOW()
                        WHERE id = $2 AND business_id = $3
                    `, [paymentStatus, alloc.purchase_id, businessId]);
                }
            }

            if (shouldManageTransaction) await client.query('COMMIT');

            return {
                success: true,
                paymentId,
                allocations: createdAllocations,
                totalAllocated: newAllocationTotal,
                remainingAmount: Number(payment.amount) - totalAllocated,
                message: `Successfully allocated ${newAllocationTotal.toFixed(2)} to ${allocations.length} invoice(s)/purchase(s)`
            };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Reconcile Outstanding Balances
     * Recalculates and corrects customers.outstanding_balance and vendors.outstanding_balance
     * from source-of-truth payment_allocations
     * 
     * @param {string} businessId - Business ID
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Reconciliation result
     */
    async reconcileOutstandingBalances(businessId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            let customersUpdated = 0;
            let vendorsUpdated = 0;
            const discrepancies = [];

            // 1. Reconcile all customers
            const customersRes = await client.query(`
                SELECT id, outstanding_balance FROM customers
                WHERE business_id = $1 AND (is_deleted = false OR is_deleted IS NULL)
            `, [businessId]);

            for (const customer of customersRes.rows) {
                const calculated = await this.getOutstandingBalance('customer', customer.id, businessId);
                const current = Number(customer.outstanding_balance || 0);
                const difference = Math.abs(calculated.outstandingBalance - current);

                if (difference > 0.01) { // More than 1 cent difference
                    discrepancies.push({
                        type: 'customer',
                        id: customer.id,
                        current,
                        calculated: calculated.outstandingBalance,
                        difference
                    });

                    await client.query(`
                        UPDATE customers
                        SET outstanding_balance = $1, updated_at = NOW()
                        WHERE id = $2 AND business_id = $3
                    `, [calculated.outstandingBalance, customer.id, businessId]);

                    customersUpdated++;
                }
            }

            // 2. Reconcile all vendors
            const vendorsRes = await client.query(`
                SELECT id, outstanding_balance FROM vendors
                WHERE business_id = $1 AND (is_deleted = false OR is_deleted IS NULL)
            `, [businessId]);

            for (const vendor of vendorsRes.rows) {
                const calculated = await this.getOutstandingBalance('vendor', vendor.id, businessId);
                const current = Number(vendor.outstanding_balance || 0);
                const difference = Math.abs(calculated.outstandingBalance - current);

                if (difference > 0.01) { // More than 1 cent difference
                    discrepancies.push({
                        type: 'vendor',
                        id: vendor.id,
                        current,
                        calculated: calculated.outstandingBalance,
                        difference
                    });

                    await client.query(`
                        UPDATE vendors
                        SET outstanding_balance = $1, updated_at = NOW()
                        WHERE id = $2 AND business_id = $3
                    `, [calculated.outstandingBalance, vendor.id, businessId]);

                    vendorsUpdated++;
                }
            }

            if (shouldManageTransaction) await client.query('COMMIT');

            return {
                success: true,
                customersChecked: customersRes.rows.length,
                customersUpdated,
                vendorsChecked: vendorsRes.rows.length,
                vendorsUpdated,
                totalDiscrepancies: discrepancies.length,
                discrepancies: discrepancies.slice(0, 10), // Return first 10 for review
                message: `Reconciliation complete: ${customersUpdated} customers and ${vendorsUpdated} vendors updated`
            };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    }
};
