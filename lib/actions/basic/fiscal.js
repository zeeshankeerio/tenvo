'use server';

import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';

/**
 * Authentication helper
 */
async function checkAuth(businessId, client = null, permission = 'finance.close_period') {
    const { session } = await withGuard(businessId, { permission, client });
    return session;
}

/**
 * Server Action: Create a fiscal period
 * 
 * @param {string} businessId
 * @param {Object} data
 * @param {string} data.name - Period name (e.g., "FY 2026-Q1", "July 2025")
 * @param {string} data.startDate - Period start
 * @param {string} data.endDate - Period end
 * @returns {Promise<{success: boolean, period?: Object, error?: string}>}
 */
export async function createFiscalPeriodAction(businessId, data) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.close_period');

        // Validate dates
        if (new Date(data.endDate) <= new Date(data.startDate)) {
            throw new Error('End date must be after start date');
        }

        // Check for overlapping periods
        const overlapCheck = await client.query(
            `SELECT id, name FROM fiscal_periods 
             WHERE business_id = $1 
               AND (start_date, end_date) OVERLAPS ($2::date, $3::date)`,
            [businessId, data.startDate, data.endDate]
        );

        if (overlapCheck.rows.length > 0) {
            throw new Error(`Period overlaps with existing period: "${overlapCheck.rows[0].name}"`);
        }

        const result = await client.query(
            `INSERT INTO fiscal_periods (business_id, name, start_date, end_date, status)
             VALUES ($1, $2, $3, $4, 'open') RETURNING *`,
            [businessId, data.name, data.startDate, data.endDate]
        );

        return { success: true, period: result.rows[0] };
    } catch (error) {
        console.error('Create fiscal period error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Server Action: Get all fiscal periods for a business
 * 
 * @param {string} businessId
 * @returns {Promise<{success: boolean, periods?: Object[], error?: string}>}
 */
export async function getFiscalPeriodsAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.view_reports');

        const result = await client.query(
            `SELECT 
                fp.*,
                (SELECT COUNT(*)::int FROM gl_entries ge 
                 WHERE ge.business_id = fp.business_id 
                   AND ge.transaction_date BETWEEN fp.start_date AND fp.end_date
                ) as entry_count,
                (SELECT COALESCE(SUM(ge.debit), 0)::numeric FROM gl_entries ge 
                 WHERE ge.business_id = fp.business_id 
                   AND ge.transaction_date BETWEEN fp.start_date AND fp.end_date
                ) as total_debit,
                (SELECT COALESCE(SUM(ge.credit), 0)::numeric FROM gl_entries ge 
                 WHERE ge.business_id = fp.business_id 
                   AND ge.transaction_date BETWEEN fp.start_date AND fp.end_date
                ) as total_credit
             FROM fiscal_periods fp
             WHERE fp.business_id = $1
             ORDER BY fp.start_date DESC`,
            [businessId]
        );

        return { success: true, periods: result.rows };
    } catch (error) {
        console.error('Get fiscal periods error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Server Action: Close a fiscal period
 * Prevents future GL entries from being posted to this period.
 * 
 * @param {string} businessId
 * @param {string} periodId
 * @returns {Promise<{success: boolean, period?: Object, error?: string}>}
 */
export async function closeFiscalPeriodAction(businessId, periodId) {
    const client = await pool.connect();
    try {
        const session = await checkAuth(businessId, client, 'finance.close_period');

        // Get the period
        const periodRes = await client.query(
            'SELECT * FROM fiscal_periods WHERE id = $1 AND business_id = $2',
            [periodId, businessId]
        );

        if (periodRes.rows.length === 0) {
            throw new Error('Fiscal period not found');
        }

        const period = periodRes.rows[0];

        if (period.status === 'closed' || period.status === 'locked') {
            throw new Error(`Period is already ${period.status}`);
        }

        // Verify trial balance is balanced for this period
        const balanceCheck = await client.query(
            `SELECT 
                COALESCE(SUM(debit), 0) as total_debit,
                COALESCE(SUM(credit), 0) as total_credit
             FROM gl_entries
             WHERE business_id = $1 
               AND transaction_date BETWEEN $2 AND $3`,
            [businessId, period.start_date, period.end_date]
        );

        const totalDebit = parseFloat(balanceCheck.rows[0].total_debit);
        const totalCredit = parseFloat(balanceCheck.rows[0].total_credit);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error(
                `Cannot close period -- trial balance is unbalanced. ` +
                `Debits: ${totalDebit.toFixed(2)}, Credits: ${totalCredit.toFixed(2)}, ` +
                `Difference: ${Math.abs(totalDebit - totalCredit).toFixed(2)}`
            );
        }

        // Close the period
        const result = await client.query(
            `UPDATE fiscal_periods 
             SET status = 'closed', closed_by = $1, closed_at = NOW()
             WHERE id = $2 AND business_id = $3
             RETURNING *`,
            [session.user.email || session.user.id, periodId, businessId]
        );

        return { success: true, period: result.rows[0] };
    } catch (error) {
        console.error('Close fiscal period error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Server Action: Reopen a closed fiscal period
 * Only admins should be able to do this (controlled by access layer)
 * 
 * @param {string} businessId
 * @param {string} periodId
 * @returns {Promise<{success: boolean, period?: Object, error?: string}>}
 */
export async function reopenFiscalPeriodAction(businessId, periodId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.close_period');

        const periodRes = await client.query(
            'SELECT * FROM fiscal_periods WHERE id = $1 AND business_id = $2',
            [periodId, businessId]
        );

        if (periodRes.rows.length === 0) {
            throw new Error('Fiscal period not found');
        }

        if (periodRes.rows[0].status === 'locked') {
            throw new Error('Locked periods cannot be reopened. Contact system administrator.');
        }

        if (periodRes.rows[0].status === 'open') {
            return { success: true, period: periodRes.rows[0] };
        }

        const result = await client.query(
            `UPDATE fiscal_periods 
             SET status = 'open', closed_by = NULL, closed_at = NULL
             WHERE id = $1 AND business_id = $2
             RETURNING *`,
            [periodId, businessId]
        );

        return { success: true, period: result.rows[0] };
    } catch (error) {
        console.error('Reopen fiscal period error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Helper: Check if a transaction date falls within a closed/locked fiscal period
 * Used by createGLEntryAction as a guard
 * 
 * @param {import('pg').PoolClient} txClient
 * @param {string} businessId
 * @param {string|Date} transactionDate
 * @returns {Promise<void>} Throws if period is closed
 */
export async function checkFiscalPeriodOpen(txClient, businessId, transactionDate) {
    const result = await txClient.query(
        `SELECT id, name, status FROM fiscal_periods 
         WHERE business_id = $1 
           AND $2::date BETWEEN start_date AND end_date
           AND status IN ('closed', 'locked')
         LIMIT 1`,
        [businessId, transactionDate]
    );

    if (result.rows.length > 0) {
        const period = result.rows[0];
        throw new Error(
            `Cannot post to ${period.status} fiscal period "${period.name}". ` +
            `Please reopen the period or adjust the transaction date.`
        );
    }
}
