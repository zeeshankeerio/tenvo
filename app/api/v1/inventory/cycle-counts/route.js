export const dynamic = 'force-dynamic';
import pool from '@/lib/db';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';

/**
 * GET  /api/v1/inventory/cycle-counts, List cycle counts
 * POST /api/v1/inventory/cycle-counts, Create new cycle count
 *
 * Authentication: Required (withApiAuth middleware)
 */
export const GET = withApiAuth(async (request, { businessId }) => {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT cc.id, cc.business_id, cc.name, cc.category, cc.warehouse_id,
                   cc.status, cc.item_count, cc.variance_count, cc.created_at, cc.updated_at
            FROM cycle_counts cc
            WHERE cc.business_id = $1
            ORDER BY cc.created_at DESC
            LIMIT $2
        `, [businessId, limit]);

        return apiSuccess({ cycleCounts: res.rows, count: res.rows.length });
    } catch (error) {
        if (error?.code === '42P01') {
            return apiSuccess({ cycleCounts: [], count: 0,
                warning: 'Cycle count tables are not initialized yet. Apply latest migrations.' });
        }
        console.error('[GET /api/v1/inventory/cycle-counts]', error);
        return apiError('FETCH_FAILED', error.message, 500);
    } finally {
        client.release();
    }
});

export const POST = withApiAuth(async (request, { businessId, parsedBody }) => {
    const body = parsedBody || {};
    const { name, category, warehouse_id, scheduled_date } = body;

    if (!name) {
        return apiError('VALIDATION_ERROR', 'name is required', 400);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let items = [];

        if (category === 'abc-a' || category === 'abc-b' || category === 'abc-c') {
            const abcRes = await client.query(`
                SELECT p.id, p.name, p.sku, p.price,
                       COALESCE(psl.quantity, 0) AS system_quantity, psl.warehouse_id
                FROM products p
                LEFT JOIN product_stock_locations psl ON psl.product_id = p.id
                JOIN inventory_abc_analysis iaa ON iaa.product_id = p.id
                WHERE p.business_id = $1 AND iaa.abc_category = $2
                ORDER BY p.name
            `, [businessId, category.split('-')[1].toUpperCase()]);
            items = abcRes.rows;
        } else if (category === 'warehouse' && warehouse_id) {
            const whRes = await client.query(`
                SELECT p.id, p.name, p.sku, p.price,
                       COALESCE(psl.quantity, 0) AS system_quantity, psl.warehouse_id
                FROM products p
                LEFT JOIN product_stock_locations psl ON psl.product_id = p.id AND psl.warehouse_id = $2
                WHERE p.business_id = $1
                ORDER BY p.name
            `, [businessId, warehouse_id]);
            items = whRes.rows;
        } else {
            const allRes = await client.query(`
                SELECT p.id, p.name, p.sku, p.price,
                       COALESCE(SUM(psl.quantity), 0) AS system_quantity
                FROM products p
                LEFT JOIN product_stock_locations psl ON psl.product_id = p.id
                WHERE p.business_id = $1
                GROUP BY p.id, p.name, p.sku, p.price
                ORDER BY p.name
            `, [businessId]);
            items = allRes.rows;
        }

        const ccRes = await client.query(`
            INSERT INTO cycle_counts
                (business_id, name, category, warehouse_id, status, item_count, variance_count, scheduled_date, created_at)
            VALUES ($1, $2, $3, $4, 'in-progress', $5, 0, $6, NOW())
            RETURNING *
        `, [businessId, name, category || 'full', warehouse_id || null, items.length, scheduled_date || null]);

        const cycleCount = ccRes.rows[0];

        for (const item of items) {
            await client.query(`
                INSERT INTO cycle_count_items
                    (cycle_count_id, product_id, sku, product_name, system_quantity, unit_price)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [cycleCount.id, item.id, item.sku, item.name, item.system_quantity || 0, item.price || 0]);
        }

        await client.query('COMMIT');
        return apiSuccess({ cycleCount }, 201);
    } catch (error) {
        await client.query('ROLLBACK');
        if (error?.code === '42P01') {
            return apiError('TABLES_MISSING', 'Cycle count tables are not initialized. Apply latest migrations first.', 503);
        }
        console.error('[POST /api/v1/inventory/cycle-counts]', error);
        return apiError('CREATE_FAILED', error.message, 500);
    } finally {
        client.release();
    }
});

