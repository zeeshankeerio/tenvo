import pool from '@/lib/db';
import { DocumentSequenceService } from './DocumentSequenceService';
import { InventoryService } from './InventoryService';
import { AccountingService } from './AccountingService';
import { checkPlanLimit } from '@/lib/auth/planGuard';
import { MembershipService } from '@/lib/services/MembershipService';
import { MEMBERSHIP_SOURCE } from '@/lib/memberships/membershipConstants';
import { onPosTransactionFullyRefunded } from '@/lib/memberships/membershipOrderHooks';
import { notifyPOSSale } from '@/lib/notifications/notificationHelpers';
import { resolvePosLineTax } from '@/lib/utils/posTax';
import { invalidateStorefrontCatalog } from '@/lib/storefront/invalidateStorefrontCatalog';

/**
 * POS Service (Enterprise SOA)
 * Orchestrates Point-of-Sale operations, shift management, and automated module integration.
 */
export const POSService = {

    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Terminals
     */
    async createTerminal(data, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const countRes = await client.query(
                'SELECT COUNT(*)::int as count FROM pos_terminals WHERE business_id = $1',
                [data.businessId]
            );
            const currentTerminalCount = Number(countRes.rows[0]?.count || 0);
            await checkPlanLimit(data.businessId, 'max_pos_terminals', currentTerminalCount + 1, client);

            const res = await client.query(`
                INSERT INTO pos_terminals (business_id, name, code, warehouse_id, status)
                VALUES ($1, $2, $3, $4, 'active') RETURNING *
            `, [data.businessId, data.name, data.code, data.warehouseId || null]);
            return res.rows[0];
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Session Management (Shifts)
     */
    async openSession(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const terminal = await client.query(
                `SELECT id FROM pos_terminals WHERE id = $1 AND business_id = $2`,
                [data.terminalId, data.businessId]
            );
            if (terminal.rows.length === 0) throw new Error('POS terminal not found');

            const existing = await client.query(
                `SELECT id FROM pos_sessions WHERE terminal_id = $1 AND business_id = $2 AND status = 'open'`,
                [data.terminalId, data.businessId]
            );
            if (existing.rows.length > 0) throw new Error('Terminal already has an open session');

            const res = await client.query(`
                INSERT INTO pos_sessions (business_id, terminal_id, user_id, opening_balance, status)
                VALUES ($1, $2, $3, $4, 'open') RETURNING *
            `, [data.businessId, data.terminalId, userId, data.openingCash || 0]);
            return res.rows[0];
        } finally {
            if (!txClient) client.release();
        }
    },

    async closeSession(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // 1. Get Session & Basic Stats
            const sesRes = await client.query(
                `SELECT * FROM pos_sessions WHERE id = $1 AND business_id = $2 AND status = 'open' FOR UPDATE`,
                [data.sessionId, data.businessId]
            );
            if (sesRes.rows.length === 0) throw new Error('Open session not found');

            const txStats = await client.query(`
                SELECT 
                    COALESCE(SUM(pp.amount) FILTER (WHERE pp.method = 'cash'), 0)::numeric as total_cash,
                    COALESCE(SUM(pt.total_amount), 0)::numeric as total_sales,
                    COUNT(DISTINCT pt.id)::int as tx_count
                FROM pos_transactions pt
                LEFT JOIN pos_payments pp ON pp.transaction_id = pt.id
                WHERE pt.session_id = $1 AND pt.payment_status = 'completed' AND pt.is_voided = false
            `, [data.sessionId]);

            const stats = txStats.rows[0];
            const openingCash = Number(sesRes.rows[0].opening_balance || 0);
            const expectedCash = openingCash + Number(stats.total_cash || 0);
            const closingCash = Number(data.closingCash || 0);
            const cashDifference = closingCash - expectedCash;

            // 2. Update Session - using correct column names from schema
            const res = await client.query(`
                UPDATE pos_sessions SET
                    status = 'closed',
                    closed_at = NOW(),
                    closing_balance = $1,
                    expected_balance = $2,
                    difference = $3
                WHERE id = $4 AND business_id = $5 RETURNING *
            `, [closingCash, expectedCash, cashDifference, data.sessionId, data.businessId]);

            if (shouldManageTransaction) await client.query('COMMIT');
            return res.rows[0];
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Transaction Orchestration
     * Creates transaction, deducts stock, records payments, and posts to GL.
     */
    async createTransaction(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const { businessId, sessionId, customerId, items, payments, discountAmount: headerDiscount = 0 } = data;

            // 1. Validate Session
            const ses = await client.query(
                `SELECT id FROM pos_sessions WHERE id = $1 AND business_id = $2 AND status = 'open'`,
                [sessionId, businessId]
            );
            if (ses.rows.length === 0) throw new Error('POS session is not open');

            // 2. Totals Calculation
            let subtotal = 0;
            let totalTax = 0;
            for (const item of items) {
                const lineSubtotal = (item.quantity || 1) * (item.unitPrice || 0);
                const lineTax = lineSubtotal * ((item.taxPercent || 0) / 100);
                subtotal += lineSubtotal;
                totalTax += lineTax;
            }
            const lineDiscountSum = items.reduce(
                (sum, item) => sum + Number(item.discountAmount || 0),
                0
            );
            const orderDiscount = Math.max(0, Number(headerDiscount) || 0);
            // Line items from buildPosCheckoutPayload already include allocated order discounts.
            const totalDiscount =
                lineDiscountSum > 0.001
                    ? lineDiscountSum
                    : lineDiscountSum + orderDiscount;
            const grandTotal = Math.round((subtotal + totalTax - totalDiscount) * 100) / 100;

            const paymentTotal = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            if (paymentTotal + 0.01 < grandTotal) throw new Error('Insufficient payment');

            // 3. Document Number
            const txNumber = await DocumentSequenceService.generateNumber({
                businessId, documentType: 'pos_transaction', prefix: 'POS-', padLength: 6
            }, client);

            // 4. Create Transaction
            const txRes = await client.query(`
                INSERT INTO pos_transactions (business_id, session_id, transaction_number, customer_id, subtotal, tax_amount, discount_amount, total_amount, payment_status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed') RETURNING *
            `, [businessId, sessionId, txNumber, customerId || null, subtotal, totalTax, totalDiscount, grandTotal]);
            const transaction = txRes.rows[0];

            // 5. Line Items & Stock Deduction
            for (const item of items) {
                if (!item.productId) {
                    throw new Error('Each POS line item must include productId (required by schema).');
                }
                const lineTax = resolvePosLineTax(item);
                const lineTotal = ((item.quantity || 1) * (item.unitPrice || 0)) + lineTax - (item.discountAmount || 0);

                await client.query(
                    `
                    INSERT INTO pos_transaction_items (business_id, transaction_id, product_id, batch_id, serial_number, quantity, unit_price, tax_amount, discount_amount, total_amount)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `,
                    [
                        businessId,
                        transaction.id,
                        item.productId,
                        item.batchId || item.batch_id || null,
                        item.serialNumber || item.serial_number || null,
                        item.quantity || 1,
                        item.unitPrice,
                        lineTax,
                        item.discountAmount || 0,
                        lineTotal,
                    ]
                );

                if (item.productId) {
                    await InventoryService.removeStock({
                        business_id: businessId, product_id: item.productId, warehouse_id: item.warehouse_id || null,
                        quantity: item.quantity || 1, reference_type: 'pos_transaction', reference_id: transaction.id,
                        notes: `POS Sale: ${txNumber}`
                    }, userId, client);
                }
            }

            // 6. Payments
            for (const p of payments) {
                await client.query(`
                    INSERT INTO pos_payments (business_id, transaction_id, method, amount, reference)
                    VALUES ($1, $2, $3, $4, $5)
                `, [businessId, transaction.id, p.method, p.amount, p.reference || null]);
            }

            // 7. Accounting Link
            const cashAmount = payments
                .filter((p) => p.method === 'cash')
                .reduce((s, p) => s + Number(p.amount), 0);
            const cardAmount = payments
                .filter((p) => ['card', 'wallet', 'mobile', 'upi', 'bank'].includes(String(p.method || '').toLowerCase()))
                .reduce((s, p) => s + Number(p.amount), 0);

            await AccountingService.recordBusinessTransaction('pos_sale', {
                businessId,
                referenceId: transaction.id,
                netAmount: grandTotal - totalTax,
                taxAmount: totalTax,
                totalAmount: grandTotal,
                cashAmount,
                cardAmount,
                description: `POS Sale: ${txNumber}`,
                userId,
            }, client);

            if (customerId && items?.length) {
                try {
                    await MembershipService.enrollFromLineItems(
                        {
                            businessId,
                            customerId,
                            source: MEMBERSHIP_SOURCE.POS,
                            paymentConfirmed: true,
                            initialPosTransactionId: transaction.id,
                            lines: items.map((item) => ({
                                productId: item.productId,
                                quantity: item.quantity || 1,
                                unitPrice: item.unitPrice || 0,
                            })),
                            userId,
                        },
                        client
                    );
                } catch (membershipErr) {
                    console.warn('[POS] membership enrollment skipped:', membershipErr?.message || membershipErr);
                }
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            invalidateStorefrontCatalog(businessId);
            
            // Create notification for POS sale
            try {
                // Get terminal and cashier info
                const terminalInfo = await client.query(
                    `SELECT pt.name as terminal_name, u.name as cashier_name
                     FROM pos_terminals pt
                     LEFT JOIN pos_sessions ps ON ps.terminal_id = pt.id
                     LEFT JOIN "user" u ON u.id = ps.user_id
                     WHERE ps.id = $1`,
                    [sessionId]
                );
                
                const terminalName = terminalInfo.rows[0]?.terminal_name || 'POS';
                const cashierName = terminalInfo.rows[0]?.cashier_name || 'Staff';
                
                // Get business info for formatting
                const businessInfo = await client.query(
                    'SELECT id, domain, currency, country, business_name FROM businesses WHERE id = $1',
                    [businessId]
                );
                const business = businessInfo.rows[0];
                
                await notifyPOSSale({
                    businessId,
                    business,
                    transactionId: transaction.id,
                    transactionNumber: txNumber,
                    totalAmount: grandTotal,
                    itemCount: items.length,
                    terminalName,
                    cashierName,
                    client,
                });
            } catch (notifyErr) {
                console.warn('[POS] notification skipped:', notifyErr?.message || notifyErr);
            }
            
            return transaction;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Refund Transaction
     * Processes full or partial refunds, manages restocking, and reverses financial entries.
     */
    async refundTransaction(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const { businessId, transactionId, items, refundMethod, reason } = data;

            // 1. Validate original transaction
            const txRes = await client.query(
                `SELECT * FROM pos_transactions WHERE id = $1 AND business_id = $2 FOR UPDATE`,
                [transactionId, businessId]
            );
            if (txRes.rows.length === 0) throw new Error('Transaction not found');
            const originalTx = txRes.rows[0];

            // 2. Check remaining balance
            const existingRefunds = await client.query(
                `SELECT COALESCE(SUM(total_amount), 0)::numeric as total_refunded
                 FROM pos_refunds WHERE transaction_id = $1 AND business_id = $2 AND status = 'completed'`,
                [transactionId, businessId]
            );
            const alreadyRefunded = parseFloat(existingRefunds.rows[0].total_refunded);
            const txTotal = parseFloat(originalTx.total_amount);

            let subtotal = 0, taxAmount = 0;
            for (const item of items) {
                const lineRefund = parseFloat(item.refundAmount || (item.quantity * item.unitPrice));
                subtotal += lineRefund;
                taxAmount += parseFloat(item.taxAmount || 0);
            }
            const totalRefund = Math.round((subtotal + taxAmount) * 100) / 100;

            if (alreadyRefunded + totalRefund > txTotal + 0.01) {
                throw new Error(`Refund exceeds remaining balance. Max: ${(txTotal - alreadyRefunded).toFixed(2)}`);
            }

            // 3. Document Number
            const refundNumber = await DocumentSequenceService.generateNumber({
                businessId, documentType: 'pos_transaction', prefix: 'RFD-', padLength: 6
            }, client);

            // 4. Create Refund Record
            const refundRes = await client.query(`
                INSERT INTO pos_refunds (
                    business_id, transaction_id, refund_number, refund_type,
                    reason, subtotal, tax_amount, total_amount,
                    refund_method, status, processed_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', $10) RETURNING *
            `, [
                businessId, transactionId, refundNumber,
                totalRefund >= txTotal - alreadyRefunded - 0.01 ? 'full' : 'partial',
                reason, subtotal, taxAmount, totalRefund, refundMethod, userId
            ]);
            const refund = refundRes.rows[0];

            // 5. Items & Restock
            for (const item of items) {
                await client.query(`
                    INSERT INTO pos_refund_items (
                        business_id, refund_id, product_id, product_name, quantity,
                        unit_price, refund_amount, restock
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    businessId, refund.id, item.productId, item.productName,
                    item.quantity, item.unitPrice, item.refundAmount, item.restock !== false
                ]);

                if (item.productId && item.restock !== false) {
                    await InventoryService.addStock({
                        business_id: businessId,
                        product_id: item.productId,
                        warehouse_id: item.warehouseId || item.warehouse_id || null,
                        quantity: Number(item.quantity),
                        cost_price: Number(item.unitPrice) || 0,
                        notes: `POS Refund: ${refundNumber}`,
                        reference_type: 'pos_refund',
                        reference_id: refund.id,
                    }, userId, client);
                }
            }

            // 6. Accounting Reversal
            await AccountingService.recordBusinessTransaction('pos_refund', {
                businessId,
                referenceId: refund.id,
                netAmount: totalRefund - taxAmount,
                taxAmount,
                totalAmount: totalRefund,
                refundMethod,
                description: `POS Refund: ${refundNumber} (Ref: ${originalTx.transaction_number})`,
                userId,
            }, client);

            const isFullRefund = totalRefund >= txTotal - alreadyRefunded - 0.01;
            if (isFullRefund) {
                try {
                    await onPosTransactionFullyRefunded(client, businessId, transactionId);
                } catch (membershipErr) {
                    console.warn('[POSService.refundTransaction] membership revoke skipped:', membershipErr?.message);
                }
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            invalidateStorefrontCatalog(businessId);
            return refund;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Void a completed POS transaction — restocks inventory and reverses GL.
     */
    async voidTransaction(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const { businessId, transactionId, reason } = data;

            const txRes = await client.query(
                `SELECT * FROM pos_transactions WHERE id = $1 AND business_id = $2 FOR UPDATE`,
                [transactionId, businessId]
            );
            if (txRes.rows.length === 0) throw new Error('Transaction not found');
            const tx = txRes.rows[0];

            if (tx.is_voided) throw new Error('Transaction is already voided');
            if (tx.payment_status === 'voided') throw new Error('Transaction is already voided');

            const refundCheck = await client.query(
                `SELECT COALESCE(SUM(total_amount), 0)::numeric AS total_refunded
                 FROM pos_refunds WHERE transaction_id = $1 AND business_id = $2 AND status = 'completed'`,
                [transactionId, businessId]
            );
            const refunded = Number(refundCheck.rows[0]?.total_refunded || 0);
            if (refunded > 0.01) {
                throw new Error('Cannot void a transaction with refunds — process remaining refund instead');
            }

            const itemsRes = await client.query(
                `SELECT * FROM pos_transaction_items WHERE transaction_id = $1 AND business_id = $2`,
                [transactionId, businessId]
            );

            for (const line of itemsRes.rows) {
                if (!line.product_id) continue;
                await InventoryService.addStock({
                    business_id: businessId,
                    product_id: line.product_id,
                    quantity: Number(line.quantity || 0),
                    reference_type: 'pos_void',
                    reference_id: transactionId,
                    notes: `Void POS ${tx.transaction_number}: ${reason || 'No reason'}`,
                }, userId, client);
            }

            const journalRes = await client.query(
                `SELECT id FROM journal_entries
                 WHERE business_id = $1 AND reference_type = 'pos_sale' AND reference_id = $2
                 ORDER BY created_at DESC LIMIT 1`,
                [businessId, transactionId]
            );
            if (journalRes.rows[0]?.id) {
                await AccountingService.reverseJournalEntry(journalRes.rows[0].id, {
                    businessId,
                    userId,
                    reason: reason || `Void POS ${tx.transaction_number}`,
                }, client);
            }

            const voidRes = await client.query(
                `UPDATE pos_transactions SET
                    is_voided = true,
                    voided_by = $1,
                    voided_at = NOW(),
                    void_reason = $2,
                    payment_status = 'voided',
                    updated_at = NOW()
                 WHERE id = $3 AND business_id = $4 RETURNING *`,
                [userId, reason || null, transactionId, businessId]
            );

            if (shouldManageTransaction) await client.query('COMMIT');
            invalidateStorefrontCatalog(businessId);
            return voidRes.rows[0];
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },
};
