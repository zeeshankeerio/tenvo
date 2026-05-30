export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';
import { parsePagination, buildPaginationMeta } from '@/lib/api/_shared/pagination';
import { POSService } from '@/lib/services/POSService';

/**
 * POS Transaction API Routes
 * 
 * GET /api/v1/pos/transactions - List POS transactions with pagination and filters
 * POST /api/v1/pos/transactions - Create a new POS transaction
 * 
 * Authentication: Required (withApiAuth middleware)
 * Authorization: Business membership required
 */

/**
 * GET /api/v1/pos/transactions
 * 
 * List POS transactions with pagination and filtering
 * 
 * Query Parameters:
 * - business_id (required): Business ID
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 50, max: 100)
 * - sortBy (optional): Sort field (default: 'created_at')
 * - sortOrder (optional): Sort direction 'ASC' or 'DESC' (default: 'DESC')
 * - session_id (optional): Filter by POS session ID
 * - customer_id (optional): Filter by customer ID
 * - status (optional): Filter by status ('completed', 'cancelled', etc.)
 * - date_from (optional): Filter transactions from this date (ISO format)
 * - date_to (optional): Filter transactions to this date (ISO format)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     transactions: [...],
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
        const sessionId = searchParams.get('session_id');
        const customerId = searchParams.get('customer_id');
        const status = searchParams.get('status');
        const dateFrom = searchParams.get('date_from');
        const dateTo = searchParams.get('date_to');

        // Build WHERE clause with filters
        const conditions = ['t.business_id = $1'];
        const params = [businessId];
        let paramIndex = 2;

        if (sessionId) {
            conditions.push(`t.session_id = $${paramIndex}`);
            params.push(sessionId);
            paramIndex++;
        }

        if (customerId) {
            conditions.push(`t.customer_id = $${paramIndex}`);
            params.push(customerId);
            paramIndex++;
        }

        if (status) {
            conditions.push(`t.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        if (dateFrom) {
            conditions.push(`t.created_at >= $${paramIndex}`);
            params.push(dateFrom);
            paramIndex++;
        }

        if (dateTo) {
            conditions.push(`t.created_at <= $${paramIndex}`);
            params.push(dateTo);
            paramIndex++;
        }

        const whereClause = conditions.join(' AND ');

        // Validate sortBy to prevent SQL injection (whitelist allowed columns)
        const allowedSortColumns = [
            'created_at', 'updated_at', 'transaction_number',
            'total_amount', 'status', 'customer_name'
        ];
        const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';

        // Get total count for pagination
        const countRes = await client.query(
            `SELECT COUNT(*)::int as total FROM pos_transactions t WHERE ${whereClause}`,
            params
        );
        const total = countRes.rows[0].total;

        // Get paginated transactions with customer information
        const transactionsRes = await client.query(
            `SELECT 
                t.id,
                t.business_id,
                t.session_id,
                t.transaction_number,
                t.customer_id,
                t.subtotal,
                t.tax_amount,
                t.discount_amount,
                t.total_amount,
                t.status,
                t.created_at,
                t.updated_at,
                c.name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone
            FROM pos_transactions t
            LEFT JOIN customers c ON t.customer_id = c.id AND c.business_id = t.business_id
            WHERE ${whereClause}
            ORDER BY ${safeSortBy === 'customer_name' ? 'c.name' : 't.' + safeSortBy} ${sortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        const transactions = transactionsRes.rows;

        // Build pagination metadata
        const meta = buildPaginationMeta(page, limit, total);

        return apiSuccess({ transactions }, 200, meta);
    } catch (error) {
        console.error('[GET /api/v1/pos/transactions] Error:', error);
        return apiError(
            'FETCH_TRANSACTIONS_FAILED',
            'Failed to fetch POS transactions',
            500,
            { message: error.message }
        );
    } finally {
        client.release();
    }
});

/**
 * POST /api/v1/pos/transactions
 * 
 * Create a new POS transaction
 * 
 * Request Body:
 * {
 *   business_id: string (UUID, required),
 *   session_id: string (UUID, required),
 *   customer_id: string (UUID, optional),
 *   items: array (required, min 1 item) [
 *     {
 *       product_id: string (UUID, required),
 *       product_name: string (required),
 *       quantity: number (required, positive),
 *       unit_price: number (required, non-negative),
 *       tax_percent: number (optional, default: 0),
 *       discount_amount: number (optional, default: 0),
 *       warehouse_id: string (UUID, optional)
 *     }
 *   ],
 *   payments: array (required, min 1 payment) [
 *     {
 *       method: string (required) - 'cash', 'card', 'upi', etc.,
 *       amount: number (required, positive),
 *       reference: string (optional) - transaction reference/receipt number
 *     }
 *   ]
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     transaction: {...}
 *   }
 * }
 */

// Zod schema for POS transaction creation
const posTransactionItemSchema = z
  .object({
    product_id: z.string().uuid().optional(),
    productId: z.string().uuid().optional(), // Accept camelCase variant
    // Display-only for clients; not persisted on pos_transaction_items (schema uses product_id + totals).
    product_name: z.string().optional().nullable(),
    productName: z.string().optional().nullable(),
    quantity: z.number().positive('Quantity must be positive').default(1),
    unit_price: z.number().min(0, 'Unit price must be non-negative'),
    unitPrice: z.number().min(0).optional(), // Accept camelCase variant
    tax_percent: z.number().min(0).max(100).optional().default(0),
    taxPercent: z.number().min(0).max(100).optional(), // Accept camelCase variant
    discount_amount: z.number().min(0).optional().default(0),
    discountAmount: z.number().min(0).optional(), // Accept camelCase variant
    warehouse_id: z.string().uuid().optional().nullable(),
    warehouseId: z.string().uuid().optional().nullable(), // Accept camelCase variant
  })
  .refine((d) => Boolean(d.product_id || d.productId), {
    message: 'Product ID is required',
    path: ['product_id'],
  });

const posPaymentSchema = z.object({
    method: z.string().min(1, 'Payment method is required'),
    amount: z.number().positive('Payment amount must be positive'),
    reference: z.string().optional().nullable()
});

const createPOSTransactionSchema = z.object({
    business_id: z.string().uuid('Business ID is required'),
    businessId: z.string().uuid().optional(), // Accept camelCase variant
    session_id: z.string().uuid('Session ID is required'),
    sessionId: z.string().uuid().optional(), // Accept camelCase variant
    customer_id: z.string().uuid().optional().nullable(),
    customerId: z.string().uuid().optional().nullable(), // Accept camelCase variant
    items: z.array(posTransactionItemSchema).min(1, 'At least one item is required'),
    payments: z.array(posPaymentSchema).min(1, 'At least one payment is required')
});

export const POST = withApiAuth(async (request, { businessId, session, role, parsedBody }) => {
    try {
        // Check role permissions - viewers cannot create POS transactions
        if (role === 'viewer') {
            return apiError('FORBIDDEN', 'Insufficient permissions. Viewers cannot create POS transactions.', 403);
        }

        // Use pre-parsed body from middleware (stream already consumed)
        const body = parsedBody || {};

        // Ensure business_id matches authenticated business
        if (body.business_id && body.business_id !== businessId) {
            return apiError('BUSINESS_MISMATCH', 'Business ID in request body does not match authenticated business', 400);
        }

        // Set business_id from authenticated context
        body.business_id = businessId;
        body.businessId = businessId;

        // Validate with Zod schema
        const validation = createPOSTransactionSchema.safeParse(body);
        if (!validation.success) {
            return apiError(
                'VALIDATION_ERROR',
                'Invalid POS transaction data',
                400,
                { errors: validation.error.errors }
            );
        }

        const validatedData = validation.data;

        // Normalize camelCase to snake_case for consistency
        const normalizedData = {
            businessId: validatedData.business_id || validatedData.businessId,
            sessionId: validatedData.session_id || validatedData.sessionId,
            customerId: validatedData.customer_id || validatedData.customerId,
            items: validatedData.items.map(item => ({
                productId: item.product_id || item.productId,
                productName: item.product_name || item.productName,
                quantity: item.quantity,
                unitPrice: item.unit_price || item.unitPrice,
                taxPercent: item.tax_percent || item.taxPercent || 0,
                discountAmount: item.discount_amount || item.discountAmount || 0,
                warehouse_id: item.warehouse_id || item.warehouseId
            })),
            payments: validatedData.payments
        };

        // Delegate to POSService.createTransaction
        const transaction = await POSService.createTransaction(
            normalizedData,
            session.user.id
        );

        return apiSuccess({ transaction }, 201);
    } catch (error) {
        console.error('[POST /api/v1/pos/transactions] Error:', error);

        // Handle specific error types
        if (error.message?.includes('session is not open')) {
            return apiError(
                'SESSION_NOT_OPEN',
                'POS session is not open',
                400
            );
        }

        if (error.message?.includes('Insufficient payment')) {
            return apiError(
                'INSUFFICIENT_PAYMENT',
                error.message,
                400
            );
        }

        if (error.message?.includes('Insufficient stock')) {
            return apiError(
                'INSUFFICIENT_STOCK',
                error.message,
                400
            );
        }

        if (error.message?.includes('not found')) {
            return apiError(
                'ENTITY_NOT_FOUND',
                error.message,
                404
            );
        }

        if (error.message?.includes('Plan limit')) {
            return apiError(
                'PLAN_LIMIT_EXCEEDED',
                error.message,
                403
            );
        }

        return apiError(
            'CREATE_TRANSACTION_FAILED',
            'Failed to create POS transaction',
            500,
            { message: error.message }
        );
    }
});

