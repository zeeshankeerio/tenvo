'use server';

import pool from '@/lib/db';
import { auditWrite } from '@/lib/actions/_shared/audit';
import { withGuard } from '@/lib/rbac/serverGuard';
import { POSService } from '@/lib/services/POSService';

async function checkAuth(businessId, client = null, permission = 'pos.access', feature = 'pos') {
    const { session } = await withGuard(businessId, { permission, feature, client });
    return session;
}

/**
 * Register a POS terminal
 */
export async function createPosTerminalAction(data) {
    try {
        await checkAuth(data.businessId, null, 'pos.access', 'pos');
        const terminal = await POSService.createTerminal(data);
        return { success: true, terminal };
    } catch (error) {
        console.error('Create POS terminal error:', error);
        return {
            success: false,
            error: error.message,
            errorCode: error.code || null,
            requiredPlan: error.requiredPlan || null,
            limitKey: error.limitKey || null,
            limit: Number.isFinite(Number(error.limit)) ? Number(error.limit) : null,
        };
    }
}

/**
 * Get all POS terminals for a business
 */
export async function getPosTerminalsAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'pos.access', 'pos');
        const result = await client.query(
            `SELECT pt.*, wl.name as warehouse_name 
             FROM pos_terminals pt
             LEFT JOIN warehouse_locations wl ON pt.warehouse_id = wl.id
             WHERE pt.business_id = $1 ORDER BY pt.created_at DESC`,
            [businessId]
        );
        return { success: true, terminals: result.rows };
    } catch (error) {
        console.error('Get POS terminals error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Open a POS session (shift)
 */
export async function openPosSessionAction(data) {
    try {
        const session = await checkAuth(data.businessId, null, 'pos.open_session', 'pos');
        const posSession = await POSService.openSession(data, session.user.id);
        return { success: true, session: posSession };
    } catch (error) {
        console.error('Open POS session error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Close a POS session with cash reconciliation
 */
export async function closePosSessionAction(data) {
    try {
        const session = await checkAuth(data.businessId, null, 'pos.close_session', 'pos');
        const result = await POSService.closeSession(data, session.user.id);
        return { success: true, session: result };
    } catch (error) {
        console.error('Close POS session error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create a POS transaction (checkout)
 * Stock, payments, and GL are applied inside a single DB transaction in POSService.createTransaction.
 */
export async function createPosTransactionAction(data) {
    try {
        const session = await checkAuth(data.businessId, null, 'pos.process_sale', 'pos');
        const transaction = await POSService.createTransaction(data, session.user.id);

        // Audit trail (fire-and-forget)
        auditWrite({
            businessId: data.businessId,
            action: 'create',
            entityType: 'pos_transaction',
            entityId: transaction.id,
            description: `POS sale ${transaction.transaction_number} - total ${transaction.total_amount}`,
            metadata: { txNumber: transaction.transaction_number, total: transaction.total_amount },
        });

        return { success: true, transaction };
    } catch (error) {
        console.error('POS transaction error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get POS session summary (end-of-day report)
 */
export async function getPosSessionSummaryAction(businessId, sessionId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'pos.access', 'pos');

        const result = await client.query(`
            SELECT 
                ps.*,
                pt.name as terminal_name,
                u_open.name as opened_by_name
            FROM pos_sessions ps
            JOIN pos_terminals pt ON ps.terminal_id = pt.id
            LEFT JOIN "user" u_open ON ps.user_id = u_open.id
            WHERE ps.id = $1 AND ps.business_id = $2
        `, [sessionId, businessId]);
        
        // Get transaction stats separately
        const statsResult = await client.query(`
            SELECT 
                COUNT(*)::int as tx_count,
                COALESCE(SUM(total_amount), 0)::numeric as total_revenue
            FROM pos_transactions 
            WHERE session_id = $1
        `, [sessionId]);
        
        // Get payment breakdown separately
        const paymentsResult = await client.query(`
            SELECT 
                pp.method,
                SUM(pp.amount)::numeric as total,
                COUNT(*)::int as count
            FROM pos_payments pp
            JOIN pos_transactions ptx ON pp.transaction_id = ptx.id
            WHERE ptx.session_id = $1
            GROUP BY pp.method
        `, [sessionId]);

        if (result.rows.length === 0) return { success: false, error: 'Session not found' };

        const session = result.rows[0];
        const stats = statsResult.rows[0] || { tx_count: 0, total_revenue: 0 };
        const payments = paymentsResult.rows || [];

        const openingCash = Number(session.opening_balance || 0);
        const cashTotal = payments
            .filter((p) => String(p.method).toLowerCase() === 'cash')
            .reduce((s, p) => s + Number(p.total || 0), 0);
        const expectedCash = openingCash + cashTotal;

        return {
            success: true,
            summary: {
                ...session,
                tx_count: stats.tx_count,
                total_revenue: Number(stats.total_revenue || 0),
                payment_breakdown: payments.map((p) => ({
                    method: p.method,
                    total: Number(p.total || 0),
                    count: p.count,
                })),
                expected_cash: expectedCash,
                cash_collected: cashTotal,
            },
        };
    } catch (error) {
        console.error('Get POS summary error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Get the latest open POS session for a business.
 */
export async function getActivePosSessionAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'pos.access', 'pos');

        const result = await client.query(`
            SELECT
                ps.*, 
                pt.name AS terminal_name
            FROM pos_sessions ps
            JOIN pos_terminals pt ON ps.terminal_id = pt.id
            WHERE ps.business_id = $1
              AND ps.status = 'open'
            ORDER BY ps.opened_at DESC
            LIMIT 1
        `, [businessId]);

        return {
            success: true,
            session: result.rows[0] || null,
        };
    } catch (error) {
        console.error('Get active POS session error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}
