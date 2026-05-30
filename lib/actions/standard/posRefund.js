'use server';

import pool from '@/lib/db';
import { POSService } from '@/lib/services/POSService';
import { auditWrite } from '@/lib/actions/_shared/audit';
import { withGuard } from '@/lib/rbac/serverGuard';

async function checkAuth(businessId, client = null, permission = 'pos.process_refund', feature = 'pos') {
    const { session } = await withGuard(businessId, { permission, feature, client });
    return session;
}

/**
 * Process a POS refund (full or partial) with stock reversal + GL entries
 */
export async function refundPosTransactionAction(data) {
    try {
        const session = await checkAuth(data.businessId, null, 'pos.process_refund', 'pos');
        const refund = await POSService.refundTransaction(data, session.user.id);

        auditWrite({
            businessId: data.businessId,
            action: 'create',
            entityType: 'pos_refund',
            entityId: refund.id,
            description: `POS refund ${refund.refund_number} processed`,
            metadata: { refundId: refund.id, total: refund.total_amount },
        });

        return { success: true, refund };
    } catch (error) {
        console.error('POS refund action error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get refunds for a transaction or business
 */
export async function getPosRefundsAction(businessId, filters = {}) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'pos.access', 'pos');

        let query = `
            SELECT r.*, t.transaction_number
            FROM pos_refunds r
            JOIN pos_transactions t ON r.transaction_id = t.id
            WHERE r.business_id = $1
        `;
        const params = [businessId];
        let idx = 2;

        if (filters.transactionId) {
            query += ` AND r.transaction_id = $${idx}`;
            params.push(filters.transactionId);
            idx++;
        }

        query += ` ORDER BY r.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        params.push(filters.limit || 50, filters.offset || 0);

        const result = await client.query(query, params);
        return { success: true, refunds: result.rows };
    } catch (error) {
        console.error('Get POS refunds error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Lookup a POS transaction by transaction number or ID for refund processing.
 */
export async function getPosTransactionLookupAction(businessId, reference) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'pos.access', 'pos');

        const ref = String(reference || '').trim();
        if (!ref) return { success: false, error: 'Transaction reference is required' };

        const txRes = await client.query(`
            SELECT t.*, c.name AS customer_name
            FROM pos_transactions t
            LEFT JOIN customers c ON t.customer_id = c.id
            WHERE t.business_id = $1
              AND (
                t.transaction_number = $2
                OR CAST(t.id AS TEXT) = $2
              )
            ORDER BY t.created_at DESC
            LIMIT 1
        `, [businessId, ref]);

        if (txRes.rows.length === 0) {
            return { success: false, error: 'Transaction not found' };
        }

        const transaction = txRes.rows[0];
        const itemsRes = await client.query(`
            SELECT
                pti.product_id AS "productId",
                COALESCE(p.name, 'Product') AS "productName",
                pti.quantity,
                pti.unit_price AS "unitPrice",
                pti.tax_amount AS "taxAmount",
                pti.total_amount AS "lineTotal"
            FROM pos_transaction_items pti
            LEFT JOIN products p ON p.id = pti.product_id AND p.business_id = $1
            WHERE pti.transaction_id = $2
            ORDER BY pti.created_at ASC NULLS LAST, pti.id ASC
        `, [businessId, transaction.id]);

        const items = itemsRes.rows.map((row) => ({
            ...row,
            quantity: Number(row.quantity),
            unitPrice: Number(row.unitPrice),
            taxAmount: Number(row.taxAmount ?? 0),
            lineTotal: Number(row.lineTotal ?? 0),
        }));

        return {
            success: true,
            transaction: {
                ...transaction,
                total_amount: Number(transaction.total_amount),
                items,
            },
        };
    } catch (error) {
        console.error('Get POS transaction lookup error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Recent POS sales for quick-pick when starting a refund (no typing receipt #).
 */
export async function getRecentPosTransactionsForRefundAction(businessId, limit = 20) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'pos.access', 'pos');
        const lim = Math.min(Math.max(Number(limit) || 20, 1), 50);
        const res = await client.query(
            `
            SELECT
                t.id,
                t.transaction_number AS "transactionNumber",
                t.total_amount AS "totalAmount",
                t.created_at AS "createdAt",
                t.payment_status AS "paymentStatus",
                c.name AS "customerName"
            FROM pos_transactions t
            LEFT JOIN customers c ON c.id = t.customer_id
            WHERE t.business_id = $1
              AND t.is_voided = false
              AND (t.transaction_type IS NULL OR t.transaction_type = 'sale')
            ORDER BY t.created_at DESC NULLS LAST
            LIMIT $2
            `,
            [businessId, lim]
        );
        const transactions = res.rows.map((row) => ({
            ...row,
            totalAmount: Number(row.totalAmount ?? 0),
        }));
        return { success: true, transactions };
    } catch (error) {
        console.error('Recent POS transactions error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}
