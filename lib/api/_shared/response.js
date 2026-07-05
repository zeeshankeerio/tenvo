import { NextResponse } from 'next/server';
import { RATE_LIMITS, trackRateLimitSync } from '@/lib/cache/rateLimit';

/**
 * API Response Helpers
 * 
 * Standardized response formatting for Next.js API routes.
 * Ensures consistent response structure across all API endpoints.
 * 
 * Usage:
 * ```javascript
 * import { apiSuccess, apiError } from '@/lib/api/_shared/response';
 * 
 * // Success response
 * return apiSuccess({ invoices: [] }, 200);
 * return apiSuccess({ invoice }, 201, { page: 1, total: 100 });
 * 
 * // Error response
 * return apiError('VALIDATION_ERROR', 'Invalid data', 400);
 * return apiError('NOT_FOUND', 'Invoice not found', 404, { field: 'id' });
 * ```
 */

export { RATE_LIMITS };

/**
 * Sync rate-limit headers for response helpers (per-instance fast path).
 * Enforcement uses distributed counters via checkApiRateLimit in planLimits.
 */
function trackRateLimit(businessId, planTier = 'free') {
    const { limit, remaining, reset } = trackRateLimitSync(businessId, planTier);
    return { limit, remaining, reset };
}

/**
 * Adds rate limit headers to a NextResponse
 * 
 * @param {NextResponse} response - The response to add headers to
 * @param {string} businessId - Business ID making the request
 * @param {string} planTier - Plan tier
 * @returns {NextResponse} Response with rate limit headers
 */
function addRateLimitHeaders(response, businessId, planTier) {
    if (!businessId) {
        // No business context, skip rate limiting
        return response;
    }

    const { limit, remaining, reset } = trackRateLimit(businessId, planTier);

    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());

    return response;
}

/**
 * Creates a standardized success response.
 * 
 * @param {*} data - The response data (can be any JSON-serializable value)
 * @param {number} [status=200] - HTTP status code (default: 200)
 * @param {Object} [meta] - Optional metadata (e.g., pagination info, timestamps)
 * @param {Object} [rateLimitContext] - Optional rate limit context { businessId, planTier }
 * @returns {NextResponse} NextResponse with standardized success format
 * 
 * @example
 * // Simple success
 * return apiSuccess({ user: { id: 1, name: 'John' } });
 * 
 * @example
 * // With custom status
 * return apiSuccess({ invoice }, 201);
 * 
 * @example
 * // With pagination metadata
 * return apiSuccess(
 *   { invoices: [...] },
 *   200,
 *   { page: 1, pageSize: 20, total: 100, totalPages: 5 }
 * );
 * 
 * @example
 * // With rate limiting
 * return apiSuccess(
 *   { invoices: [...] },
 *   200,
 *   null,
 *   { businessId: 'uuid', planTier: 'premium' }
 * );
 */
export function apiSuccess(data, status = 200, meta = null, rateLimitContext = null) {
    const response = {
        success: true,
        data,
    };

    if (meta) {
        response.meta = meta;
    }

    const nextResponse = NextResponse.json(response, { status });

    // Add rate limit headers if context provided
    if (rateLimitContext?.businessId) {
        return addRateLimitHeaders(nextResponse, rateLimitContext.businessId, rateLimitContext.planTier);
    }

    return nextResponse;
}

/**
 * Creates a standardized error response.
 * 
 * @param {string} code - Error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHORIZED')
 * @param {string} message - Human-readable error message
 * @param {number} [status=400] - HTTP status code (default: 400)
 * @param {Object} [details] - Optional error details (e.g., validation errors, field-specific info)
 * @param {Object} [rateLimitContext] - Optional rate limit context { businessId, planTier }
 * @returns {NextResponse} NextResponse with standardized error format
 * 
 * @example
 * // Simple error
 * return apiError('NOT_FOUND', 'Invoice not found', 404);
 * 
 * @example
 * // With validation details
 * return apiError(
 *   'VALIDATION_ERROR',
 *   'Invalid input data',
 *   400,
 *   {
 *     fields: {
 *       email: 'Invalid email format',
 *       amount: 'Must be greater than 0'
 *     }
 *   }
 * );
 * 
 * @example
 * // Authorization error
 * return apiError('FORBIDDEN', 'Insufficient permissions', 403);
 * 
 * @example
 * // With rate limiting
 * return apiError(
 *   'NOT_FOUND',
 *   'Invoice not found',
 *   404,
 *   null,
 *   { businessId: 'uuid', planTier: 'premium' }
 * );
 */
export function apiError(code, message, status = 400, details = null, rateLimitContext = null) {
    const response = {
        success: false,
        error: message,
        code,
    };

    if (details) {
        response.details = details;
    }

    const nextResponse = NextResponse.json(response, { status });

    // Add rate limit headers if context provided
    if (rateLimitContext?.businessId) {
        return addRateLimitHeaders(nextResponse, rateLimitContext.businessId, rateLimitContext.planTier);
    }

    return nextResponse;
}

export { cleanupRateLimits } from '@/lib/cache/rateLimit';
