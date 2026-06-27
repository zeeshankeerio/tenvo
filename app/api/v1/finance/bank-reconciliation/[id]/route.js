export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';

/**
 * GET /api/v1/finance/bank-reconciliation/[id]
 * Fetch a session with all its statement lines and candidate GL entries.
 *
 * PATCH /api/v1/finance/bank-reconciliation/[id]
 * Update a reconciliation session, match/unmatch lines, or mark as completed.
 * Body: { matched_lines?: [{line_id, gl_entry_id, matched}], status?: 'completed'|'in_progress' }
 *
 * Authentication: Required (withApiAuth middleware)
 */
export const GET = withApiAuth(async (request, { businessId, routeParams }) => {
    const id = routeParams?.params?.id;
    if (!id) return apiError('MISSING_ID', 'Session ID is required', 400);

    const client = await pool.connect();
    try {
        const sessionRes = await client.query(
            `SELECT brs.*, ga.code AS account_code, ga.name AS account_name
             FROM bank_reconciliation_sessions brs
             LEFT JOIN gl_accounts ga ON ga.id = brs.account_id
             WHERE brs.id = $1 AND brs.business_id = $2`,
            [id, businessId]
        );

        if (sessionRes.rows.length === 0) {
            return apiError('NOT_FOUND', 'Session not found', 404);
        }

        const session = sessionRes.rows[0];

        const linesRes = await client.query(
            `SELECT bsl.*,
                    ge.description AS gl_description,
                    ge.debit       AS gl_debit,
                    ge.credit      AS gl_credit,
                    je.journal_number
             FROM bank_statement_lines bsl
             LEFT JOIN gl_entries ge      ON ge.id  = bsl.gl_entry_id
             LEFT JOIN journal_entries je ON je.id  = ge.journal_id
             WHERE bsl.session_id = $1
             ORDER BY bsl.statement_date ASC`,
            [id]
        );

        const glRes = await client.query(
            `SELECT ge.id, ge.transaction_date, ge.description,
                    ge.debit::numeric, ge.credit::numeric,
                    je.journal_number
             FROM gl_entries ge
             LEFT JOIN journal_entries je ON je.id = ge.journal_id
             WHERE ge.business_id = $1
               AND ge.account_id  = $2
               AND ge.transaction_date <= $3
             ORDER BY ge.transaction_date DESC
             LIMIT 200`,
            [businessId, session.account_id, session.statement_date]
        );

        return apiSuccess({ session, lines: linesRes.rows, gl_entries: glRes.rows });
    } catch (err) {
        if (err.code === '42P01') {
            return apiError('TABLES_MISSING', 'Tables missing', 503);
        }
        console.error('[bank-reconciliation/[id] GET]', err);
        return apiError('FETCH_FAILED', 'Internal server error', 500);
    } finally {
        client.release();
    }
});

export const PATCH = withApiAuth(async (request, { businessId, parsedBody, routeParams }) => {
    const id = routeParams?.params?.id;
    if (!id) return apiError('MISSING_ID', 'Session ID is required', 400);

    const body = parsedBody || {};
    const { matched_lines, status } = body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (Array.isArray(matched_lines)) {
            for (const line of matched_lines) {
                await client.query(
                    `UPDATE bank_statement_lines
                     SET matched = $1, gl_entry_id = $2
                     WHERE id = $3 AND session_id = $4`,
                    [line.matched, line.gl_entry_id || null, line.line_id, id]
                );
            }
        }

        if (status) {
            const allowedStatuses = ['in_progress', 'completed'];
            if (!allowedStatuses.includes(status)) {
                await client.query('ROLLBACK');
                return apiError('INVALID_STATUS', 'Invalid status', 400);
            }
            await client.query(
                `UPDATE bank_reconciliation_sessions
                 SET status = $1,
                     completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END
                 WHERE id = $2 AND business_id = $3`,
                [status, id, businessId]
            );
        }

        await client.query('COMMIT');

        const res = await client.query(
            `SELECT brs.*, ga.code AS account_code, ga.name AS account_name
             FROM bank_reconciliation_sessions brs
             LEFT JOIN gl_accounts ga ON ga.id = brs.account_id
             WHERE brs.id = $1 AND brs.business_id = $2`,
            [id, businessId]
        );

        if (res.rows.length === 0) {
            return apiError('NOT_FOUND', 'Session not found', 404);
        }

        return apiSuccess({ session: res.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '42P01') {
            return apiError('TABLES_MISSING', 'Tables missing', 503);
        }
        console.error('[bank-reconciliation PATCH]', err);
        return apiError('UPDATE_FAILED', 'Internal server error', 500);
    } finally {
        client.release();
    }
});

