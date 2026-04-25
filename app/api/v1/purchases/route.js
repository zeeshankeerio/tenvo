import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';
import { parsePagination, buildPaginationMeta } from '@/lib/api/_shared/pagination';
import { createPurchaseAction } from '@/lib/actions/standard/purchase';

/**
 * Purchase API Routes
 * 
 * GET /api/v1/purchases - List purchases with pagination and filters
 * POST /api/v1/purchases - Create a new purchase
 * 
 * Authentication: Required (withApiAuth middleware)
 * Authorization: Business membership required
 */

/**
 * GET /api/v1/purchases
 * 
 * List purchases with pagination and filtering
 * 
 * Query Parameters:
 * - business_id (required): Business ID
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 50, max: 100)
 * - sortBy (optional): Sort field (default: 'created_at')
 * - sortOrder (optional): Sort direction 'ASC' or 'DESC' (default: 'DESC')
 * - status (optional): Filter by purchase status (draft, received, cancelled)
 * - vendor_id (optional): Filter by vendor ID
 * - date_from (optional): Filter purchases from this date (ISO format)
 * - date_to (optional): Filter purchases to this date (ISO format)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     purchases: [...],
 *   },
 *   meta: {
 *     page: 1,
 *     pageSize: 50,
 *     total: 100,
 *     totalPages: 2
 *   }
 * }
 */
export const GET = withApiAuth(async (request, { businessId, session }) => {
    const client = await pool.connect();
    try {
        const { searchParams } = new URL(request.url);
        const { page, limit, offset, sortBy, sortOrder } = parsePagination(searchParams);

        // Extract filter parameters
        const status = searchParams.get('status');
        const vendorId = searchParams.get('vendor_id');
        const dateFrom = searchParams.get('date_from');
        const dateTo = searchParams.get('date_to');

        // Build WHERE clause with filters
        const conditions = ['p.business_id = $1', '(p.is_deleted = false OR p.is_deleted IS NULL)'];
        const params = [businessId];
        let paramIndex = 2;

        if (status) {
            conditions.push(`p.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        if (vendorId) {
            conditions.push(`p.vendor_id = $${paramIndex}`);
            params.push(vendorId);
            paramIndex++;
        }

        if (dateFrom) {
            conditions.push(`p.date >= $${paramIndex}`);
            params.push(dateFrom);
            paramIndex++;
        }

        if (dateTo) {
            conditions.push(`p.date <= $${paramIndex}`);
            params.push(dateTo);
            paramIndex++;
        }

        const whereClause = conditions.join(' AND ');

        // Validate sortBy to prevent SQL injection (whitelist allowed columns)
        const allowedSortColumns = [
            'created_at', 'updated_at', 'date', 'purchase_number',
            'total_amount', 'status', 'vendor_name'
        ];
        const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';

        // Get total count for pagination
        const countRes = await client.query(
            `SELECT COUNT(*)::int as total FROM purchases p WHERE ${whereClause}`,
            params
        );
        const total = countRes.rows[0].total;

        // Get paginated purchases with vendor information
        const purchasesRes = await client.query(
            `SELECT 
                p.id,
                p.business_id,
                p.vendor_id,
                p.warehouse_id,
                p.purchase_number,
                p.date,
                p.status,
                p.subtotal,
                p.tax_total,
                p.total_amount,
                p.notes,
                p.created_at,
                p.updated_at,
                v.name as vendor_name,
                v.email as vendor_email,
                v.phone as vendor_phone
            FROM purchases p
            LEFT JOIN vendors v ON p.vendor_id = v.id AND v.business_id = p.business_id
            WHERE ${whereClause}
            ORDER BY ${safeSortBy === 'vendor_name' ? 'v.name' : 'p.' + safeSortBy} ${sortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        const purchases = purchasesRes.rows;

        // Build pagination metadata
        const meta = buildPaginationMeta(page, limit, total);

        return apiSuccess({ purchases }, 200, meta);
    } catch (error) {
        console.error('[GET /api/v1/purchases] Error:', error);
        return apiError(
            'FETCH_PURCHASES_FAILED',
            'Failed to fetch purchases',
            500,
            { message: error.message }
        );
    } finally {
        client.release();
    }
});

/**
 * POST /api/v1/purchases
 * 
 * Create a new purchase
 * 
 * Request Body:
 * {
 *   business_id: string (UUID, required),
 *   vendor_id: string (UUID, required),
 *   warehouse_id: string (UUID, optional),
 *   purchase_number: string (required),
 *   date: string (ISO date, optional, defaults to current date),
 *   status: string (optional, default: 'received'),
 *   notes: string (optional),
 *   subtotal: number (optional, default: 0),
 *   tax_total: number (optional, default: 0),
 *   total_amount: number (required),
 *   items: array (required, min 1 item) [
 *     {
 *       product_id: string (UUID, required),
 *       name: string (optional),
 *       description: string (optional),
 *       quantity: number (required),
 *       unit_cost: number (required),
 *       tax_rate: number (optional),
 *       tax_amount: number (optional),
 *       total_amount: number (required),
 *       batch_number: string (optional),
 *       batch_id: string (UUID, optional),
 *       expiry_date: string (ISO date, optional),
 *       manufacturing_date: string (ISO date, optional)
 *     }
 *   ]
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

// Zod schema for purchase creation
const purchaseItemSchema = z.object({
    product_id: z.string().uuid('Product ID is required'),
    name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    quantity: z.number().positive('Quantity must be positive'),
    unit_cost: z.number().min(0, 'Unit cost must be non-negative'),
    tax_rate: z.number().min(0).optional().default(0),
    tax_amount: z.number().min(0).optional().default(0),
    total_amount: z.number().min(0, 'Total amount must be non-negative'),
    batch_number: z.string().optional().nullable(),
    batch_id: z.string().uuid().optional().nullable(),
    expiry_date: z.string().optional().nullable(),
    manufacturing_date: z.string().optional().nullable()
});

const createPurchaseSchema = z.object({
    business_id: z.string().uuid('Business ID is required'),
    vendor_id: z.string().uuid('Vendor ID is required'),
    warehouse_id: z.string().uuid().optional().nullable(),
    purchase_number: z.string().min(1, 'Purchase number is required'),
    date: z.string().optional(),
    status: z.enum(['draft', 'received', 'cancelled']).optional().default('received'),
    notes: z.string().optional().nullable(),
    subtotal: z.number().min(0).default(0),
    tax_total: z.number().min(0).default(0),
    total_amount: z.number().min(0, 'Total amount must be non-negative'),
    items: z.array(purchaseItemSchema).min(1, 'At least one item is required')
});

export const POST = withApiAuth(async (request, { businessId, session, role }) => {
    try {
        // Check role permissions - viewers cannot create purchases
        if (role === 'viewer') {
            return apiError(
                'FORBIDDEN',
                'Insufficient permissions. Viewers cannot create purchases.',
                403
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
        const validation = createPurchaseSchema.safeParse(body);
        if (!validation.success) {
            return apiError(
                'VALIDATION_ERROR',
                'Invalid purchase data',
                400,
                { errors: validation.error.errors }
            );
        }

        const validatedData = validation.data;

        // Delegate to createPurchaseAction
        const result = await createPurchaseAction(validatedData);

        if (!result.success) {
            // Handle specific error codes from the action
            if (result.code === 'DUPLICATE_PURCHASE_NUMBER') {
                return apiError(
                    'DUPLICATE_PURCHASE_NUMBER',
                    result.error,
                    400
                );
            }

            if (result.code === 'ENTITY_NOT_FOUND') {
                return apiError(
                    'ENTITY_NOT_FOUND',
                    result.error,
                    404
                );
            }

            return apiError(
                result.code || 'CREATE_PURCHASE_FAILED',
                result.error || 'Failed to create purchase',
                500
            );
        }

        return apiSuccess({ purchase: result.purchase }, 201);
    } catch (error) {
        console.error('[POST /api/v1/purchases] Error:', error);

        // Handle specific error types
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

        if (error.message?.includes('Domain validation')) {
            return apiError(
                'DOMAIN_VALIDATION_ERROR',
                error.message,
                400
            );
        }

        return apiError(
            'CREATE_PURCHASE_FAILED',
            'Failed to create purchase',
            500,
            { message: error.message }
        );
    }
});
