import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';
import { getPurchaseByIdAction, updatePurchaseStatusAction } from '@/lib/actions/standard/purchase';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';

/**
 * Purchase Detail API Routes
 * 
 * GET /api/v1/purchases/[id] - Get single purchase with items
 * PUT /api/v1/purchases/[id] - Update purchase status
 * DELETE /api/v1/purchases/[id] - Void purchase (soft delete)
 * 
 * Authentication: Required (withApiAuth middleware)
 * Authorization: Business membership required
 */

/**
 * GET /api/v1/purchases/[id]
 * 
 * Get a single purchase with items, vendor details, and product information
 * 
 * Query Parameters:
 * - business_id (required): Business ID
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     purchase: {
 *       id, purchase_number, date, status, ...
 *       vendor_name, vendor_email, vendor_phone,
 *       items: [{ id, product_id, name, quantity, ... }]
 *     }
 *   }
 * }
 */
export const GET = withApiAuth(async (request, { businessId, routeParams }) => {
    const client = await pool.connect();
    try {
        // Extract purchase ID from route params
        const purchaseId = routeParams?.params?.id;
        
        if (!purchaseId) {
            return apiError(
                'MISSING_PURCHASE_ID',
                'Purchase ID is required',
                400
            );
        }

        // Verify purchase belongs to business
        await assertEntityBelongsToBusiness(client, 'purchase', purchaseId, businessId);

        // Fetch purchase with items using getPurchaseByIdAction
        const result = await getPurchaseByIdAction(businessId, purchaseId);

        if (!result.success) {
            return apiError(
                result.code || 'PURCHASE_NOT_FOUND',
                result.error || 'Purchase not found',
                404
            );
        }

        return apiSuccess({ purchase: result.purchase }, 200);
    } catch (error) {
        console.error('[GET /api/v1/purchases/[id]] Error:', error);

        // Handle specific error types
        if (error.message?.includes('not found') || error.message?.includes('does not belong')) {
            return apiError(
                'PURCHASE_NOT_FOUND',
                'Purchase not found or does not belong to this business',
                404
            );
        }

        return apiError(
            'FETCH_PURCHASE_FAILED',
            'Failed to fetch purchase',
            500,
            { message: error.message }
        );
    } finally {
        client.release();
    }
});

/**
 * PUT /api/v1/purchases/[id]
 * 
 * Update purchase status (draft -> received, or cancel)
 * 
 * Request Body:
 * {
 *   business_id: string (UUID, required),
 *   status: string (required) - 'draft', 'received', or 'cancelled'
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     purchase: {...}
 *   }
 * }
 */

// Zod schema for purchase status update
const updatePurchaseStatusSchema = z.object({
    business_id: z.string().uuid('Business ID is required'),
    status: z.enum(['draft', 'received', 'cancelled'], {
        errorMap: () => ({ message: 'Status must be one of: draft, received, cancelled' })
    })
});

export const PUT = withApiAuth(async (request, { businessId, session, role, routeParams }) => {
    try {
        // Check role permissions - viewers cannot update purchases
        if (role === 'viewer') {
            return apiError(
                'FORBIDDEN',
                'Insufficient permissions. Viewers cannot update purchases.',
                403
            );
        }

        // Extract purchase ID from route params
        const purchaseId = routeParams?.params?.id;
        
        if (!purchaseId) {
            return apiError(
                'MISSING_PURCHASE_ID',
                'Purchase ID is required',
                400
            );
        }

        // Parse and validate request body
        const body = await request.json();

        // Ensure business_id matches authenticated business
        if (body.business_id && body.business_id !== businessId) {
            return apiError(
                'BUSINESS_MISMATCH',
                'Business ID in request body does not match authenticated business',
                400
            );
        }

        // Set business_id from authenticated context
        body.business_id = businessId;

        // Validate with Zod schema
        const validation = updatePurchaseStatusSchema.safeParse(body);
        if (!validation.success) {
            return apiError(
                'VALIDATION_ERROR',
                'Invalid purchase status data',
                400,
                { errors: validation.error.errors }
            );
        }

        const validatedData = validation.data;

        // Delegate to updatePurchaseStatusAction
        // This action handles:
        // - Stock addition when status changes to 'received'
        // - GL entry creation
        // - Vendor balance update
        const result = await updatePurchaseStatusAction(
            businessId,
            purchaseId,
            validatedData.status
        );

        // Check if action succeeded
        if (!result.success) {
            return apiError(
                result.code || 'UPDATE_PURCHASE_FAILED',
                result.error || 'Failed to update purchase',
                400
            );
        }

        return apiSuccess({ purchase: result.purchase }, 200);
    } catch (error) {
        console.error('[PUT /api/v1/purchases/[id]] Error:', error);

        // Handle specific error types
        if (error.message?.includes('not found') || error.message?.includes('does not belong')) {
            return apiError(
                'PURCHASE_NOT_FOUND',
                'Purchase not found or does not belong to this business',
                404
            );
        }

        if (error.message?.includes('Plan limit')) {
            return apiError(
                'PLAN_LIMIT_EXCEEDED',
                error.message,
                403,
                {
                    requiredPlan: error.requiredPlan,
                    limitKey: error.limitKey,
                    limit: error.limit
                }
            );
        }

        return apiError(
            'UPDATE_PURCHASE_FAILED',
            'Failed to update purchase',
            500,
            { message: error.message }
        );
    }
});

/**
 * DELETE /api/v1/purchases/[id]
 * 
 * Void a purchase (soft delete with reversal)
 * 
 * Query Parameters:
 * - business_id (required): Business ID
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     message: "Purchase voided successfully"
 *   }
 * }
 */
export const DELETE = withApiAuth(async (request, { businessId, session, role, routeParams }) => {
    const client = await pool.connect();
    try {
        // Check role permissions - only owners and managers can void purchases
        if (role === 'viewer') {
            return apiError(
                'FORBIDDEN',
                'Insufficient permissions. Viewers cannot void purchases.',
                403
            );
        }

        // Extract purchase ID from route params
        const purchaseId = routeParams?.params?.id;
        
        if (!purchaseId) {
            return apiError(
                'MISSING_PURCHASE_ID',
                'Purchase ID is required',
                400
            );
        }

        // Verify purchase belongs to business
        await assertEntityBelongsToBusiness(client, 'purchase', purchaseId, businessId);

        await client.query('BEGIN');

        // 1. Get purchase details
        const purchaseRes = await client.query(`
            SELECT * FROM purchases
            WHERE id = $1 AND business_id = $2
            FOR UPDATE
        `, [purchaseId, businessId]);

        if (purchaseRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return apiError(
                'PURCHASE_NOT_FOUND',
                'Purchase not found',
                404
            );
        }

        const purchase = purchaseRes.rows[0];

        // 2. Check if already voided
        if (purchase.status === 'cancelled' || purchase.is_deleted) {
            await client.query('ROLLBACK');
            return apiError(
                'PURCHASE_ALREADY_VOIDED',
                'Purchase is already voided',
                400
            );
        }

        // 3. If purchase was received, reverse stock and GL entries
        if (purchase.status === 'received') {
            // Get purchase items
            const itemsRes = await client.query(`
                SELECT * FROM purchase_items
                WHERE purchase_id = $1
            `, [purchaseId]);

            // Reverse stock for each item
            for (const item of itemsRes.rows) {
                // Remove stock that was added
                await client.query(`
                    INSERT INTO stock_movements (
                        business_id, product_id, warehouse_id, quantity,
                        movement_type, reference_type, reference_id, notes
                    ) VALUES ($1, $2, $3, $4, 'remove', 'purchase_void', $5, $6)
                `, [
                    businessId,
                    item.product_id,
                    purchase.warehouse_id,
                    -item.quantity, // Negative to reverse
                    purchaseId,
                    `Void purchase: ${purchase.purchase_number}`
                ]);

                // Update product stock
                await client.query(`
                    UPDATE products
                    SET stock = stock - $1, updated_at = NOW()
                    WHERE id = $2 AND business_id = $3
                `, [item.quantity, item.product_id, businessId]);

                // Update product_stock_locations
                await client.query(`
                    UPDATE product_stock_locations
                    SET quantity = quantity - $1, updated_at = NOW()
                    WHERE product_id = $2 AND warehouse_id = $3 AND business_id = $4
                `, [item.quantity, item.product_id, purchase.warehouse_id, businessId]);
            }

            // Reverse GL entries (delete them - proper reversal would use AccountingService.reverseJournalEntry)
            await client.query(`
                DELETE FROM gl_entries
                WHERE business_id = $1 AND reference_type = 'purchase' AND reference_id = $2
            `, [businessId, purchaseId]);

            // Reverse vendor balance
            await client.query(`
                UPDATE vendors
                SET outstanding_balance = outstanding_balance - $1, updated_at = NOW()
                WHERE id = $2 AND business_id = $3
            `, [purchase.total_amount, purchase.vendor_id, businessId]);
        }

        // 4. Mark purchase as voided (soft delete)
        await client.query(`
            UPDATE purchases
            SET 
                status = 'cancelled',
                is_deleted = true,
                deleted_at = NOW(),
                updated_at = NOW()
            WHERE id = $1 AND business_id = $2
        `, [purchaseId, businessId]);

        await client.query('COMMIT');

        return apiSuccess({
            message: 'Purchase voided successfully',
            purchaseId,
            purchaseNumber: purchase.purchase_number
        }, 200);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[DELETE /api/v1/purchases/[id]] Error:', error);

        // Handle specific error types
        if (error.message?.includes('not found')) {
            return apiError(
                'PURCHASE_NOT_FOUND',
                'Purchase not found',
                404
            );
        }

        return apiError(
            'VOID_PURCHASE_FAILED',
            'Failed to void purchase',
            500,
            { message: error.message }
        );
    } finally {
        client.release();
    }
});
