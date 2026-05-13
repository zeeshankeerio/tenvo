import { NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * PATCH /api/v1/finance/bank-reconciliation/[id]
 * Update a reconciliation session — match/unmatch lines, or mark as completed.
 * Body: { matched_lines?: [{line_id, gl_entry_id, matched}], status?: 'completed'|'in_progress' }
 */
export async function PATCH(request, { params }) {
    const { id } = params;
    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { matched_lines, status } = body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update individual line matches
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

        // Update session status
        if (status) {
            const allowedStatuses = ['in_progress', 'completed'];
            if (!allowedStatuses.includes(status)) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
            }

            await client.query(
                `UPDATE bank_reconciliation_sessions
                 SET status = $1, completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END
                 WHERE id = $2`,
                [status, id]
            );
        }

        await client.query('COMMIT');

        // Fetch updated session
        const res = await client.query(
            `SELECT brs.*,
                    ga.code AS account_code,
                    ga.name AS account_name
             FROM bank_reconciliation_sessions brs
             LEFT JOIN gl_accounts ga ON ga.id = brs.account_id
             WHERE brs.id = $1`,
            [id]
        );

        if (res.rows.length === 0) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        return NextResponse.json({ session: res.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '42P01') {
            return NextResponse.json({ error: 'Tables missing', code: 'TABLES_MISSING' }, { status: 503 });
        }
        console.error('[bank-reconciliation PATCH]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
        client.release();
    }
}

/**
 * GET /api/v1/finance/bank-reconciliation/[id]
 * Fetch a session with all its statement lines and candidate GL entries.
 */
export async function GET(request, { params }) {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get('business_id');

    if (!business_id) {
        return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
        // Session
        const sessionRes = await client.query(
            `SELECT brs.*, ga.code AS account_code, ga.name AS account_name
             FROM bank_reconciliation_sessions brs
             LEFT JOIN gl_accounts ga ON ga.id = brs.account_id
             WHERE brs.id = $1 AND brs.business_id = $2`,
            [id, business_id]
        );

        if (sessionRes.rows.length === 0) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const session = sessionRes.rows[0];

        // Statement lines
        const linesRes = await client.query(
            `SELECT bsl.*, 
                    ge.description AS gl_description,
                    ge.debit AS gl_debit,
                    ge.credit AS gl_credit,
                    je.journal_number
             FROM bank_statement_lines bsl
             LEFT JOIN gl_entries ge ON ge.id = bsl.gl_entry_id
             LEFT JOIN journal_entries je ON je.id = ge.journal_id
             WHERE bsl.session_id = $1
             ORDER BY bsl.statement_date ASC`,
            [id]
        );

        // Candidate GL entries for matching (bank account entries in period)
        const glRes = await client.query(
            `SELECT ge.id, ge.transaction_date, ge.description, ge.debit::numeric, ge.credit::numeric,
                    je.journal_number
             FROM gl_entries ge
             LEFT JOIN journal_entries je ON je.id = ge.journal_id
             WHERE ge.business_id = $1
               AND ge.account_id = $2
               AND ge.transaction_date <= $3
             ORDER BY ge.transaction_date DESC
             LIMIT 200`,
            [business_id, session.account_id, session.statement_date]
        );

        return NextResponse.json({
            session,
            lines: linesRes.rows,
            gl_entries: glRes.rows,
        });
    } catch (err) {
        if (err.code === '42P01') {
            return NextResponse.json({ error: 'Tables missing', code: 'TABLES_MISSING' }, { status: 503 });
        }
        console.error('[bank-reconciliation/[id] GET]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
        client.release();
    }
}
