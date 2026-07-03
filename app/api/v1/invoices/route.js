export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';
import { parsePagination, buildPaginationMeta } from '@/lib/api/_shared/pagination';
import { InvoiceService } from '@/lib/services/InvoiceService';

/**
 * Invoice API Routes
 * 
 * GET /api/v1/invoices - List invoices with pagination and filters
 * POST /api/v1/invoices - Create a new invoice
 * 
 * Authentication: Required (withApiAuth middleware)
 * Authorization: Business membership required
 */

/**
 * GET /api/v1/invoices
 * 
 * List invoices with pagination and filtering
 * 
 * Query Parameters:
 * - business_id (required): Business ID
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 50, max: 100)
 * - sortBy (optional): Sort field (default: 'created_at')
 * - sortOrder (optional): Sort direction 'ASC' or 'DESC' (default: 'DESC')
 * - status (optional): Filter by invoice status (draft, sent, paid, cancelled, overdue)
 * - payment_status (optional): Filter by payment status
 * - customer_id (optional): Filter by customer ID
 * - date_from (optional): Filter invoices from this date (ISO format)
 * - date_to (optional): Filter invoices to this date (ISO format)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     invoices: [...],
 *   },
 *   meta: {
 *     page: 1,
 *     pageSize: 50,
 *     total: 100,
 *     totalPages: 2
 *   }
 * }
 */
export const GET = withApiAuth(async (request, { businessId, session, planTier }) => {
    const client = await pool.connect();
    try {
        const { searchParams } = new URL(request.url);
        const { page, limit, offset, sortBy, sortOrder } = parsePagination(searchParams);

        // Extract filter parameters
        const status = searchParams.get('status');
        const paymentStatus = searchParams.get('payment_status');
        const customerId = searchParams.get('customer_id');
        const dateFrom = searchParams.get('date_from');
        const dateTo = searchParams.get('date_to');

        // Build WHERE clause with filters
        const conditions = ['i.business_id = $1', '(i.is_deleted = false OR i.is_deleted IS NULL)'];
        const params = [businessId];
        let paramIndex = 2;

        if (status) {
            conditions.push(`i.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        if (paymentStatus) {
            conditions.push(`i.payment_status = $${paramIndex}`);
            params.push(paymentStatus);
            paramIndex++;
        }

        if (customerId) {
            conditions.push(`i.customer_id = $${paramIndex}`);
            params.push(customerId);
            paramIndex++;
        }

        if (dateFrom) {
            conditions.push(`i.date >= $${paramIndex}`);
            params.push(dateFrom);
            paramIndex++;
        }

        if (dateTo) {
            conditions.push(`i.date <= $${paramIndex}`);
            params.push(dateTo);
            paramIndex++;
        }

        const whereClause = conditions.join(' AND ');

        // Validate sortBy to prevent SQL injection (whitelist allowed columns)
        const allowedSortColumns = [
            'created_at', 'updated_at', 'date', 'due_date', 'invoice_number',
            'grand_total', 'status', 'payment_status', 'customer_name'
        ];
        const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';

        // Get total count for pagination
        const countRes = await client.query(
            `SELECT COUNT(*)::int as total FROM invoices i WHERE ${whereClause}`,
            params
        );
        const total = countRes.rows[0].total;

        // Get paginated invoices with customer information
        const invoicesRes = await client.query(
            `SELECT 
                i.id,
                i.business_id,
                i.customer_id,
                i.invoice_number,
                i.date,
                i.due_date,
                i.status,
                i.subtotal,
                i.tax_total,
                i.discount_total,
                i.grand_total,
                i.payment_method,
                i.payment_status,
                i.notes,
                i.terms,
                i.tax_details,
                i.created_at,
                i.updated_at,
                c.name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id AND c.business_id = i.business_id
            WHERE ${whereClause}
            ORDER BY ${safeSortBy === 'customer_name' ? 'c.name' : 'i.' + safeSortBy} ${sortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        const invoices = invoicesRes.rows;

        // Build pagination metadata
        const meta = buildPaginationMeta(page, limit, total);

        return apiSuccess({ invoices }, 200, meta, { businessId, planTier });
    } catch (error) {
        console.error('[GET /api/v1/invoices] Error:', error);
        return apiError(
            'FETCH_INVOICES_FAILED',
            'Failed to fetch invoices',
            500,
            { message: error.message },
            { businessId, planTier }
        );
    } finally {
        client.release();
    }
});

/**
 * POST /api/v1/invoices
 * 
 * Create a new invoice
 * 
 * Request Body:
 * {
 *   business_id: string (UUID, required),
 *   customer_id: string (UUID, optional),
 *   invoice_number: string (optional, auto-generated if not provided),
 *   date: string (ISO date, optional, defaults to current date),
 *   due_date: string (ISO date, optional),
 *   status: string (optional, default: 'draft'),
 *   payment_status: string (optional),
 *   payment_method: string (optional),
 *   notes: string (optional),
 *   terms: string (optional),
 *   subtotal: number (required),
 *   tax_total: number (optional, default: 0),
 *   discount_total: number (optional, default: 0),
 *   grand_total: number (required),
 *   tax_details: object (optional),
 *   items: array (required, min 1 item) [
 *     {
 *       product_id: string (UUID, optional),
 *       name: string (required),
 *       description: string (optional),
 *       quantity: number (required),
 *       unit_price: number (required),
 *       tax_percent: number (optional),
 *       tax_amount: number (optional),
 *       discount_amount: number (optional),
 *       total_amount: number (required),
 *       metadata: object (optional)
 *     }
 *   ]
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     invoice: {...}
 *   }
 * }
 */

// Zod schema for invoice creation
const invoiceItemSchema = z.object({
    product_id: z.string().uuid().optional().nullable(),
    name: z.string().min(1, 'Item name is required'),
    description: z.string().optional().nullable(),
    quantity: z.number().positive('Quantity must be positive'),
    unit_price: z.number().min(0, 'Unit price must be non-negative'),
    tax_percent: z.number().min(0).optional().default(0),
    tax_amount: z.number().min(0).optional().default(0),
    discount_amount: z.number().min(0).optional().default(0),
    total_amount: z.number().min(0, 'Total amount must be non-negative'),
    metadata: z.record(z.any()).optional().default({})
});

const createInvoiceSchema = z.object({
    business_id: z.string().uuid('Business ID is required'),
    customer_id: z.string().uuid().optional().nullable(),
    invoice_number: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional().nullable(),
    status: z.enum(['draft', 'sent', 'paid', 'cancelled', 'overdue']).optional().default('draft'),
    payment_status: z.string().optional().nullable(),
    payment_method: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    subtotal: z.number().min(0).default(0),
    tax_total: z.number().min(0).default(0),
    discount_total: z.number().min(0).default(0),
    grand_total: z.number().min(0, 'Grand total must be non-negative'),
    tax_details: z.record(z.any()).optional().default({}),
    items: z.array(invoiceItemSchema).min(1, 'At least one item is required')
});

export const POST = withApiAuth(async (request, { businessId, session, role, planTier, parsedBody }) => {
    try {
        // Check role permissions - viewers cannot create invoices
        if (role === 'viewer') {
            return apiError('FORBIDDEN', 'Insufficient permissions. Viewers cannot create invoices.', 403, null, { businessId, planTier });
        }

        // Enforce monthly invoice limit
        const { canCreateOrder } = await import('@/lib/services/planLimits');
        const limitCheck = await canCreateOrder(businessId);
        if (!limitCheck.allowed) {
            return apiError('PLAN_LIMIT_REACHED', limitCheck.reason, 403, {
                current: limitCheck.current,
                limit: limitCheck.limit,
                upgradePlan: limitCheck.upgradePlan,
            }, { businessId, planTier });
        }

        // Use pre-parsed body from middleware (request.json() already consumed the stream)
        const body = parsedBody || {};

        // Ensure business_id matches authenticated business
        if (body.business_id && body.business_id !== businessId) {
            return apiError(
                'BUSINESS_MISMATCH',
                'Business ID in request body does not match authenticated business',
                400,
                null,
                { businessId, planTier }
            );
        }

        // Set business_id from authenticated context
        body.business_id = businessId;

        // Validate with Zod schema
        const validation = createInvoiceSchema.safeParse(body);
        if (!validation.success) {
            return apiError(
                'VALIDATION_ERROR',
                'Invalid invoice data',
                400,
                { errors: validation.error.errors },
                { businessId, planTier }
            );
        }

        const validatedData = validation.data;

        // Delegate to InvoiceService
        const invoice = await InvoiceService.createInvoice(
            validatedData,
            session.user.id
        );

        return apiSuccess({ invoice }, 201, null, { businessId, planTier });
    } catch (error) {
        console.error('[POST /api/v1/invoices] Error:', error);

        // Handle specific error types
        if (error.message?.includes('Credit limit')) {
            return apiError(
                'CREDIT_LIMIT_EXCEEDED',
                error.message,
                400,
                null,
                { businessId, planTier }
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
                },
                { businessId, planTier }
            );
        }

        if (error.message?.includes('Domain validation')) {
            return apiError(
                'DOMAIN_VALIDATION_ERROR',
                error.message,
                400,
                null,
                { businessId, planTier }
            );
        }

        return apiError(
            'CREATE_INVOICE_FAILED',
            'Failed to create invoice',
            500,
            { message: error.message },
            { businessId, planTier }
        );
    }
});

