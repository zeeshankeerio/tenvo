import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';
import { parsePagination, buildPaginationMeta } from '@/lib/api/_shared/pagination';
import { POSService } from '@/lib/services/POSService';

/**
 * POS Session API Routes
 * 
 * GET /api/v1/pos/sessions - List POS sessions with pagination and filters
 * POST /api/v1/pos/sessions - Open a new POS session
 * PUT /api/v1/pos/sessions - Close a POS session
 * 
 * Authentication: Required (withApiAuth middleware)
 * Authorization: Business membership required
 */

/**
 * GET /api/v1/pos/sessions
 * 
 * List POS sessions with pagination and filtering
 * 
 * Query Parameters:
 * - business_id (required): Business ID
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 50, max: 100)
 * - sortBy (optional): Sort field (default: 'created_at')
 * - sortOrder (optional): Sort direction 'ASC' or 'DESC' (default: 'DESC')
 * - terminal_id (optional): Filter by terminal ID
 * - status (optional): Filter by status ('open' or 'closed')
 * - opened_by (optional): Filter by user who opened the session
 * - date_from (optional): Filter sessions from this date (ISO format)
 * - date_to (optional): Filter sessions to this date (ISO format)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     sessions: [...],
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
        const terminalId = searchParams.get('terminal_id');
        const status = searchParams.get('status');
        const openedBy = searchParams.get('opened_by');
        const dateFrom = searchParams.get('date_from');
        const dateTo = searchParams.get('date_to');

        // Build WHERE clause with filters
        const conditions = ['s.business_id = $1'];
        const params = [businessId];
        let paramIndex = 2;

        if (terminalId) {
            conditions.push(`s.terminal_id = $${paramIndex}`);
            params.push(terminalId);
            paramIndex++;
        }

        if (status) {
            conditions.push(`s.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        if (openedBy) {
            conditions.push(`s.opened_by = $${paramIndex}`);
            params.push(openedBy);
            paramIndex++;
        }

        if (dateFrom) {
            conditions.push(`s.created_at >= $${paramIndex}`);
            params.push(dateFrom);
            paramIndex++;
        }

        if (dateTo) {
            conditions.push(`s.created_at <= $${paramIndex}`);
            params.push(dateTo);
            paramIndex++;
        }

        const whereClause = conditions.join(' AND ');

        // Validate sortBy to prevent SQL injection (whitelist allowed columns)
        const allowedSortColumns = [
            'created_at', 'updated_at', 'status', 'opening_cash',
            'closing_cash', 'total_sales', 'transaction_count'
        ];
        const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';

        // Get total count for pagination
        const countRes = await client.query(
            `SELECT COUNT(*)::int as total FROM pos_sessions s WHERE ${whereClause}`,
            params
        );
        const total = countRes.rows[0].total;

        // Get paginated sessions
        const sessionsRes = await client.query(
            `SELECT 
                s.*,
                t.name as terminal_name,
                t.code as terminal_code
            FROM pos_sessions s
            LEFT JOIN pos_terminals t ON s.terminal_id = t.id AND t.business_id = s.business_id
            WHERE ${whereClause}
            ORDER BY s.${safeSortBy} ${sortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        const sessions = sessionsRes.rows;

        // Build pagination metadata
        const meta = buildPaginationMeta(page, limit, total);

        return apiSuccess({ sessions }, 200, meta);
    } catch (error) {
        console.error('[GET /api/v1/pos/sessions] Error:', error);
        return apiError(
            'FETCH_SESSIONS_FAILED',
            'Failed to fetch POS sessions',
            500,
            { message: error.message }
        );
    } finally {
        client.release();
    }
});

/**
 * POST /api/v1/pos/sessions
 * 
 * Open a new POS session
 * 
 * Request Body:
 * {
 *   business_id: string (UUID, required),
 *   terminal_id: string (UUID, required),
 *   opening_cash: number (optional, default: 0)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     session: {...}
 *   }
 * }
 */

// Zod schema for opening a POS session
const openSessionSchema = z.object({
    business_id: z.string().uuid('Business ID is required'),
    businessId: z.string().uuid().optional(), // Accept camelCase variant
    terminal_id: z.string().uuid('Terminal ID is required'),
    terminalId: z.string().uuid().optional(), // Accept camelCase variant
    opening_cash: z.number().min(0, 'Opening cash must be non-negative').optional().default(0),
    openingCash: z.number().min(0).optional() // Accept camelCase variant
});

export const POST = withApiAuth(async (request, { businessId, session, role }) => {
    try {
        // Check role permissions - viewers cannot open POS sessions
        if (role === 'viewer') {
            return apiError(
                'FORBIDDEN',
                'Insufficient permissions. Viewers cannot open POS sessions.',
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
        body.businessId = businessId; // Also set camelCase for validation

        // Validate with Zod schema
        const validation = openSessionSchema.safeParse(body);
        if (!validation.success) {
            return apiError(
                'VALIDATION_ERROR',
                'Invalid session data',
                400,
                { errors: validation.error.errors }
            );
        }

        const validatedData = validation.data;

        // Normalize camelCase to snake_case for consistency
        const normalizedData = {
            businessId: validatedData.business_id || validatedData.businessId,
            terminalId: validatedData.terminal_id || validatedData.terminalId,
            openingCash: validatedData.opening_cash || validatedData.openingCash || 0
        };

        // Delegate to POSService.openSession
        const posSession = await POSService.openSession(
            normalizedData,
            session.user.id
        );

        return apiSuccess({ session: posSession }, 201);
    } catch (error) {
        console.error('[POST /api/v1/pos/sessions] Error:', error);

        // Handle specific error types
        if (error.message?.includes('already has an open session')) {
            return apiError(
                'SESSION_ALREADY_OPEN',
                'Terminal already has an open session',
                400
            );
        }

        if (error.message?.includes('not found')) {
            return apiError(
                'TERMINAL_NOT_FOUND',
                'Terminal not found',
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
            'OPEN_SESSION_FAILED',
            'Failed to open POS session',
            500,
            { message: error.message }
        );
    }
});

/**
 * PUT /api/v1/pos/sessions
 * 
 * Close a POS session
 * 
 * Request Body:
 * {
 *   business_id: string (UUID, required),
 *   session_id: string (UUID, required),
 *   closing_cash: number (required)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     session: {...}
 *   }
 * }
 */

// Zod schema for closing a POS session
const closeSessionSchema = z.object({
    business_id: z.string().uuid('Business ID is required'),
    businessId: z.string().uuid().optional(), // Accept camelCase variant
    session_id: z.string().uuid('Session ID is required'),
    sessionId: z.string().uuid().optional(), // Accept camelCase variant
    closing_cash: z.number().min(0, 'Closing cash must be non-negative'),
    closingCash: z.number().min(0).optional() // Accept camelCase variant
});

export const PUT = withApiAuth(async (request, { businessId, session, role }) => {
    try {
        // Check role permissions - viewers cannot close POS sessions
        if (role === 'viewer') {
            return apiError(
                'FORBIDDEN',
                'Insufficient permissions. Viewers cannot close POS sessions.',
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
        body.businessId = businessId; // Also set camelCase for validation

        // Validate with Zod schema
        const validation = closeSessionSchema.safeParse(body);
        if (!validation.success) {
            return apiError(
                'VALIDATION_ERROR',
                'Invalid session data',
                400,
                { errors: validation.error.errors }
            );
        }

        const validatedData = validation.data;

        // Normalize camelCase to snake_case for consistency
        const normalizedData = {
            businessId: validatedData.business_id || validatedData.businessId,
            sessionId: validatedData.session_id || validatedData.sessionId,
            closingCash: validatedData.closing_cash || validatedData.closingCash
        };

        // Delegate to POSService.closeSession
        const posSession = await POSService.closeSession(
            normalizedData,
            session.user.id
        );

        return apiSuccess({ session: posSession }, 200);
    } catch (error) {
        console.error('[PUT /api/v1/pos/sessions] Error:', error);

        // Handle specific error types
        if (error.message?.includes('Open session not found')) {
            return apiError(
                'SESSION_NOT_FOUND',
                'Open session not found',
                404
            );
        }

        if (error.message?.includes('not found')) {
            return apiError(
                'SESSION_NOT_FOUND',
                'Session not found',
                404
            );
        }

        return apiError(
            'CLOSE_SESSION_FAILED',
            'Failed to close POS session',
            500,
            { message: error.message }
        );
    }
});
