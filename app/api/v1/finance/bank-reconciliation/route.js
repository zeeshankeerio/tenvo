import { NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * GET /api/v1/finance/bank-reconciliation
 * List reconciliation sessions for a business.
 * Query params: business_id, account_id
 *
 * POST /api/v1/finance/bank-reconciliation
 * Create a new reconciliation session.
 * Body: { business_id, account_id, statement_date, statement_closing_balance, lines: [...] }
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get('business_id');
    const account_id = searchParams.get('account_id');

    if (!business_id) {
        return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
        const params = [business_id];
        let where = 'brs.business_id = $1';
        if (account_id && account_id !== 'all') {
            where += ` AND brs.account_id = $2`;
            params.push(account_id);
        }

        const res = await client.query(
            `SELECT 
                brs.*,
                ga.code  AS account_code,
                ga.name  AS account_name,
                (SELECT COUNT(*)::int FROM bank_statement_lines bsl WHERE bsl.session_id = brs.id)   AS line_count,
                (SELECT COUNT(*)::int FROM bank_statement_lines bsl WHERE bsl.session_id = brs.id AND bsl.matched = true) AS matched_count
             FROM bank_reconciliation_sessions brs
             LEFT JOIN gl_accounts ga ON ga.id = brs.account_id
             WHERE ${where}
             ORDER BY brs.statement_date DESC`,
            params
        );

        return NextResponse.json({ sessions: res.rows });
    } catch (err) {
        if (err.code === '42P01') {
            return NextResponse.json({ sessions: [], warning: 'Reconciliation tables not yet migrated.' });
        }
        console.error('[bank-reconciliation GET]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
        client.release();
    }
}

export async function POST(request) {
    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { business_id, account_id, statement_date, statement_closing_balance, lines = [] } = body;

    if (!business_id || !account_id || !statement_date) {
        return NextResponse.json({ error: 'business_id, account_id, and statement_date are required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Create session
        const sessionRes = await client.query(
            `INSERT INTO bank_reconciliation_sessions
                (business_id, account_id, statement_date, statement_closing_balance, status)
             VALUES ($1, $2, $3, $4, 'in_progress')
             RETURNING *`,
            [business_id, account_id, statement_date, statement_closing_balance || 0]
        );
        const session = sessionRes.rows[0];

        // Insert statement lines
        for (const line of lines) {
            await client.query(
                `INSERT INTO bank_statement_lines
                    (session_id, statement_date, description, debit, credit, matched, gl_entry_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    session.id,
                    line.statement_date || statement_date,
                    line.description || '',
                    line.debit || 0,
                    line.credit || 0,
                    line.matched || false,
                    line.gl_entry_id || null,
                ]
            );
        }

        await client.query('COMMIT');
        return NextResponse.json({ session }, { status: 201 });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '42P01') {
            return NextResponse.json(
                { error: 'Reconciliation tables not yet migrated. Apply the bank reconciliation migration first.', code: 'TABLES_MISSING' },
                { status: 503 }
            );
        }
        console.error('[bank-reconciliation POST]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
        client.release();
    }
}
