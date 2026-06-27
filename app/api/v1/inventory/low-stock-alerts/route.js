export const dynamic = 'force-dynamic';
import pool from '@/lib/db';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';

/**
 * Low Stock Alerts API
 * GET: List low stock alerts for dashboard
 *
 * Authentication: Required (withApiAuth middleware)
 */
export const GET = withApiAuth(async (request, { businessId }) => {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const client = await pool.connect();
    try {
        const res = await client.query(`
                SELECT 
                    lsa.id, lsa.product_id, lsa.warehouse_id, lsa.current_stock,
                    lsa.min_stock_level, lsa.status, lsa.created_at,
                    p.name as product_name, p.sku, p.price as selling_price,
                    wl.name as warehouse_name
                FROM low_stock_alerts lsa
                JOIN products p ON p.id = lsa.product_id
                LEFT JOIN warehouse_locations wl ON wl.id = lsa.warehouse_id
                WHERE lsa.business_id = $1 AND lsa.status = 'active'
                ORDER BY lsa.created_at DESC
                LIMIT $2
            `, [businessId, limit]);

        return apiSuccess({
            alerts: res.rows,
            count: res.rows.length,
        });
    } catch (error) {
        if (error?.code === '42P01') {
            console.warn(
                '[GET /api/v1/inventory/low-stock-alerts] low_stock_alerts missing, returning empty. Apply prisma migration 20260514_inventory_reorder_cycle_counts or lib/db/migrations/035_low_stock_alerts_reorder_points.sql'
            );
            return apiSuccess({
                alerts: [],
                count: 0,
                warning: 'Low-stock alert tables are not initialized yet. Apply latest migrations.',
            });
        }
        console.error('Error in GET /api/v1/inventory/low-stock-alerts:', error);
        return apiError('FETCH_FAILED', error.message, 500);
    } finally {
        client.release();
    }
});
