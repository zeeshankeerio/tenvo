import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';
import { parsePagination, buildPaginationMeta } from '@/lib/api/_shared/pagination';
import { PaymentService } from '@/lib/services/PaymentService';

/**
 * Payment API Routes
 * 
 * GET /api/v1/payments - List payments with pagination and filters
 * POST /api/v1/payments - Create a new payment/receipt
 * 
 * Authentication: Required (withApiAuth middleware)
 * Authorization: Business membership required
 */

/**
 * GET /api/v1/payments
 * 
 * List payments with pagination and filtering
 * 
 * Query Parameters:
 * - business_id (required): Business ID
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 50, max: 100)
 * - sortBy (optional): Sort field (default: 'payment_date')
 * - sortOrder (optional): Sort direction 'ASC' or 'DESC' (default: 'DESC')
 * - payment_type (optional): Filter by payment type ('receipt' or 'payment')
 * - payment_mode (optional): Filter by payment mode (cash, card, bank, cheque, etc.)
 * - customer_id (optional): Filter by customer ID
 * - vendor_id (optional): Filter by vendor ID
 * - date_from (optional): Filter payments from this date (ISO format)
 * - date_to (optional): Filter payments to this date (ISO format)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     payments: [...],
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
        const paymentType = searchParams.get('payment_type');
        const paymentMode = searchParams.get('payment_mode');
        const customerId = searchParams.get('customer_id');
        const vendorId = searchParams.get('vendor_id');
        const dateFrom = searchParams.get('date_from');
        const dateTo = searchParams.get('date_to');

        // Build WHERE clause with filters
        const conditions = ['p.business_id = $1', '(p.is_deleted = false OR p.is_deleted IS NULL)'];
        const params = [businessId];
        let paramIndex = 2;

        if (paymentType) {
            conditions.push(`p.payment_type = $${paramIndex}`);
            params.push(paymentType);
            paramIndex++;
        }

        if (paymentMode) {
            conditions.push(`p.payment_mode = $${paramIndex}`);
            params.push(paymentMode);
            paramIndex++;
        }

        if (customerId) {
            conditions.push(`p.customer_id = $${paramIndex}`);
            params.push(customerId);
            paramIndex++;
        }

        if (vendorId) {
            conditions.push(`p.vendor_id = $${paramIndex}`);
            params.push(vendorId);
            paramIndex++;
        }

        if (dateFrom) {
            conditions.push(`p.payment_date >= $${paramIndex}`);
            params.push(dateFrom);
            paramIndex++;
        }

        if (dateTo) {
            conditions.push(`p.payment_date <= $${paramIndex}`);
            params.push(dateTo);
            paramIndex++;
        }

        const whereClause = conditions.join(' AND ');

        // Validate sortBy to prevent SQL injection (whitelist allowed columns)
        const allowedSortColumns = [
            'created_at', 'updated_at', 'payment_date', 'amount',
            'payment_type', 'payment_mode', 'customer_name', 'vendor_name'
        ];
        const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'payment_date';

        // Get total count for pagination
        const countRes = await client.query(
            `SELECT COUNT(*)::int as total FROM payments p WHERE ${whereClause}`,
            params
        );
        const total = countRes.rows[0].total;

        // Get paginated payments with customer/vendor information
        const paymentsRes = await client.query(
            `SELECT 
                p.id,
                p.business_id,
                p.payment_type,
                p.reference_type,
                p.reference_id,
                p.customer_id,
                p.vendor_id,
                p.amount,
                p.payment_mode,
                p.payment_date,
                p.bank_name,
                p.cheque_number,
                p.transaction_id,
                p.notes,
                p.status,
                p.created_at,
                p.updated_at,
                c.name as customer_name,
                c.email as customer_email,
                v.name as vendor_name,
                v.email as vendor_email
            FROM payments p
            LEFT JOIN customers c ON p.customer_id = c.id AND c.business_id = p.business_id
            LEFT JOIN vendors v ON p.vendor_id = v.id AND v.business_id = p.business_id
            WHERE ${whereClause}
            ORDER BY ${safeSortBy === 'customer_name' ? 'c.name' : safeSortBy === 'vendor_name' ? 'v.name' : 'p.' + safeSortBy} ${sortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        const payments = paymentsRes.rows;

        // Build pagination metadata
        const meta = buildPaginationMeta(page, limit, total);

        return apiSuccess({ payments }, 200, meta);
    } catch (error) {
        console.error('[GET /api/v1/payments] Error:', error);
        return apiError(
            'FETCH_PAYMENTS_FAILED',
            'Failed to fetch payments',
            500,
            { message: error.message }
        );
    } finally {
        client.release();
    }
});

/**
 * POST /api/v1/payments
 * 
 * Create a new payment or receipt
 * 
 * Request Body:
 * {
 *   business_id: string (UUID, required),
 *   payment_type: string (required) - 'receipt' or 'payment',
 *   customer_id: string (UUID, optional - required for receipts),
 *   vendor_id: string (UUID, optional - required for payments),
 *   amount: number (required, positive),
 *   payment_mode: string (required) - 'cash', 'card', 'bank', 'cheque', 'upi', etc.,
 *   payment_date: string (ISO date, optional, defaults to current date),
 *   bank_name: string (optional),
 *   cheque_number: string (optional),
 *   transaction_id: string (optional),
 *   notes: string (optional),
 *   reference_type: string (optional) - 'invoice', 'purchase', etc.,
 *   reference_id: string (UUID, optional),
 *   allocations: array (optional) [
 *     {
 *       invoice_id: string (UUID, optional),
 *       purchase_id: string (UUID, optional),
 *       amount: number (required)
 *     }
 *   ]
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     payment: {...}
 *   }
 * }
 */

// Zod schema for payment creation
const paymentAllocationSchema = z.object({
    invoice_id: z.string().uuid().optional().nullable(),
    purchase_id: z.string().uuid().optional().nullable(),
    amount: z.number().positive('Allocation amount must be positive')
}).refine(
    data => (data.invoice_id && !data.purchase_id) || (!data.invoice_id && data.purchase_id),
    { message: 'Exactly one of invoice_id or purchase_id must be provided' }
);

const createPaymentSchema = z.object({
    business_id: z.string().uuid('Business ID is required'),
    payment_type: z.enum(['receipt', 'payment'], {
        errorMap: () => ({ message: 'Payment type must be either "receipt" or "payment"' })
    }),
    customer_id: z.string().uuid().optional().nullable(),
    vendor_id: z.string().uuid().optional().nullable(),
    amount: z.number().positive('Amount must be positive'),
    payment_mode: z.string().min(1, 'Payment mode is required'),
    payment_date: z.string().optional(),
    bank_name: z.string().optional().nullable(),
    cheque_number: z.string().optional().nullable(),
    transaction_id: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    reference_type: z.string().optional().nullable(),
    reference_id: z.string().uuid().optional().nullable(),
    allocations: z.array(paymentAllocationSchema).optional().default([])
}).refine(
    data => {
        // If payment_type is 'receipt', customer_id is required
        if (data.payment_type === 'receipt' && !data.customer_id) {
            return false;
        }
        // If payment_type is 'payment', vendor_id is required
        if (data.payment_type === 'payment' && !data.vendor_id) {
            return false;
        }
        return true;
    },
    {
        message: 'customer_id is required for receipts, vendor_id is required for payments'
    }
);

export const POST = withApiAuth(async (request, { businessId, session, role }) => {
    try {
        // Check role permissions - viewers cannot create payments
        if (role === 'viewer') {
            return apiError(
                'FORBIDDEN',
                'Insufficient permissions. Viewers cannot create payments.',
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
        const validation = createPaymentSchema.safeParse(body);
        if (!validation.success) {
            return apiError(
                'VALIDATION_ERROR',
                'Invalid payment data',
                400,
                { errors: validation.error.errors }
            );
        }

        const validatedData = validation.data;

        // Delegate to PaymentService.createPayment
        const payment = await PaymentService.createPayment(
            validatedData,
            session.user.id
        );

        return apiSuccess({ payment }, 201);
    } catch (error) {
        console.error('[POST /api/v1/payments] Error:', error);

        // Handle specific error types
        if (error.message?.includes('Over-allocation')) {
            return apiError(
                'OVER_ALLOCATION',
                error.message,
                400
            );
        }

        if (error.message?.includes('mismatch')) {
            return apiError(
                'ENTITY_MISMATCH',
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
            'CREATE_PAYMENT_FAILED',
            'Failed to create payment',
            500,
            { message: error.message }
        );
    }
});
