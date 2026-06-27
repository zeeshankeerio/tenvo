export const dynamic = 'force-dynamic';
import pool from '@/lib/db';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';
import { InventoryService } from '@/lib/services/InventoryService';

/**
 * GET   /api/v1/inventory/cycle-counts/[id], Get cycle count with items
 * PATCH /api/v1/inventory/cycle-counts/[id], Submit counts and process variance
 *
 * Authentication: Required (withApiAuth middleware)
 */
export const GET = withApiAuth(async (request, { businessId, routeParams }) => {
    const id = routeParams?.params?.id;
    if (!id) return apiError('MISSING_ID', 'Cycle count ID is required', 400);

    const client = await pool.connect();
    try {
        const ccRes = await client.query(
            `SELECT * FROM cycle_counts WHERE id = $1 AND business_id = $2`,
            [id, businessId]
        );

        if (ccRes.rows.length === 0) {
            return apiError('NOT_FOUND', 'Cycle count not found', 404);
        }

        const itemsRes = await client.query(
            `SELECT * FROM cycle_count_items WHERE cycle_count_id = $1 ORDER BY product_name ASC`,
            [id]
        );

        return apiSuccess({ ...ccRes.rows[0], items: itemsRes.rows });
    } catch (error) {
        if (error?.code === '42P01') {
            return apiError('TABLES_MISSING', 'Cycle count tables are not initialized. Apply latest migrations first.', 503);
        }
        console.error('[GET /api/v1/inventory/cycle-counts/[id]]', error);
        return apiError('FETCH_FAILED', error.message, 500);
    } finally {
        client.release();
    }
});

export const PATCH = withApiAuth(async (request, { businessId, session, parsedBody, routeParams }) => {
    const id = routeParams?.params?.id;
    if (!id) return apiError('MISSING_ID', 'Cycle count ID is required', 400);

    const body = parsedBody || {};
    const { items, status } = body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verify ownership
        const ownerCheck = await client.query(
            `SELECT id FROM cycle_counts WHERE id = $1 AND business_id = $2`,
            [id, businessId]
        );
        if (ownerCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return apiError('NOT_FOUND', 'Cycle count not found', 404);
        }

        let varianceCount = 0;

        for (const item of items || []) {
            const variance = (item.counted_quantity || 0) - (item.system_quantity || 0);
            if (variance !== 0) varianceCount++;

            await client.query(`
                UPDATE cycle_count_items
                SET counted_quantity = $1
                WHERE cycle_count_id = $2 AND product_id = $3
            `, [item.counted_quantity || 0, id, item.product_id]);

            // Apply stock adjustment when completing the count
            if (status === 'completed' && variance !== 0) {
                const adjustType = variance > 0 ? 'add' : 'remove';
                await InventoryService.adjustStock({
                    businessId,
                    productId: item.product_id,
                    warehouseId: item.warehouse_id || null,
                    adjustmentType: adjustType,
                    quantity: Math.abs(variance),
                    reason: `Cycle count variance, count ID: ${id}`,
                }, session.user.id, client);
            }
        }

        const ccRes = await client.query(`
            UPDATE cycle_counts
            SET status = $1, variance_count = $2, updated_at = NOW()
            WHERE id = $3 AND business_id = $4
            RETURNING *
        `, [status || 'completed', varianceCount, id, businessId]);

        await client.query('COMMIT');
        return apiSuccess({ cycleCount: ccRes.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error?.code === '42P01') {
            return apiError('TABLES_MISSING', 'Cycle count tables are not initialized. Apply latest migrations first.', 503);
        }
        console.error('[PATCH /api/v1/inventory/cycle-counts/[id]]', error);
        return apiError('UPDATE_FAILED', error.message, 500);
    } finally {
        client.release();
    }
});

