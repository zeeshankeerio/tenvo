import { NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * GET /api/v1/finance/journal-entries
 * List journal entries with GL line details.
 * Query params: business_id, start_date, end_date, account_id, search, limit, offset
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get('business_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const account_id = searchParams.get('account_id');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!business_id) {
        return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
        const conditions = ['je.business_id = $1'];
        const params = [business_id];
        let i = 2;

        if (start_date) { conditions.push(`je.transaction_date >= $${i++}`); params.push(start_date); }
        if (end_date) { conditions.push(`je.transaction_date <= $${i++}`); params.push(end_date); }
        if (search) { conditions.push(`(je.description ILIKE $${i} OR je.journal_number ILIKE $${i})`); params.push(`%${search}%`); i++; }

        // If filtering by account_id, add a subquery condition
        if (account_id && account_id !== 'all') {
            conditions.push(`EXISTS (
                SELECT 1 FROM gl_entries ge2 
                WHERE ge2.journal_id = je.id AND ge2.account_id = $${i++}
            )`);
            params.push(account_id);
        }

        const whereClause = conditions.join(' AND ');

        // Count total for pagination
        const countRes = await client.query(
            `SELECT COUNT(*)::int as total FROM journal_entries je WHERE ${whereClause}`,
            params
        );
        const total = countRes.rows[0]?.total || 0;

        // Main query -- fetch journals with aggregated debit/credit totals
        const journalsRes = await client.query(
            `SELECT 
                je.id,
                je.journal_number,
                je.transaction_date,
                je.description,
                je.reference_type,
                je.reference_id,
                je.created_by,
                je.created_at,
                COALESCE(SUM(ge.debit), 0)::numeric  AS total_debit,
                COALESCE(SUM(ge.credit), 0)::numeric AS total_credit,
                COUNT(ge.id)::int                     AS line_count
             FROM journal_entries je
             LEFT JOIN gl_entries ge ON ge.journal_id = je.id
             WHERE ${whereClause}
             GROUP BY je.id, je.journal_number, je.transaction_date, je.description,
                      je.reference_type, je.reference_id, je.created_by, je.created_at
             ORDER BY je.transaction_date DESC, je.created_at DESC
             LIMIT $${i++} OFFSET $${i++}`,
            [...params, limit, offset]
        );

        // Fetch GL lines for the returned journals
        const journalIds = journalsRes.rows.map(j => j.id);
        let linesMap = {};

        if (journalIds.length > 0) {
            const linesRes = await client.query(
                `SELECT 
                    ge.journal_id,
                    ge.id,
                    ge.account_id,
                    ga.code  AS account_code,
                    ga.name  AS account_name,
                    ga.type  AS account_type,
                    ge.debit::numeric,
                    ge.credit::numeric,
                    ge.description
                 FROM gl_entries ge
                 LEFT JOIN gl_accounts ga ON ga.id = ge.account_id
                 WHERE ge.journal_id = ANY($1)
                 ORDER BY ge.journal_id, ge.debit DESC`,
                [journalIds]
            );
            linesRes.rows.forEach(line => {
                if (!linesMap[line.journal_id]) linesMap[line.journal_id] = [];
                linesMap[line.journal_id].push(line);
            });
        }

        const journals = journalsRes.rows.map(j => ({
            ...j,
            lines: linesMap[j.id] || [],
        }));

        return NextResponse.json({ journals, total, limit, offset });
    } catch (err) {
        if (err.code === '42P01') {
            return NextResponse.json({
                journals: [], total: 0, limit, offset,
                warning: 'Journal entries tables not yet migrated.'
            });
        }
        console.error('[finance/journal-entries GET]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
        client.release();
    }
}
