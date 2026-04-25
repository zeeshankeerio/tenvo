import { NextResponse } from 'next/server';

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

/**
 * Rate Limiting Configuration
 * 
 * Defines rate limits per plan tier (requests per minute)
 */
const RATE_LIMITS = {
    free: 60,        // 60 requests per minute
    basic: 120,      // 120 requests per minute
    standard: 300,   // 300 requests per minute
    premium: 600,    // 600 requests per minute
    enterprise: 1200 // 1200 requests per minute (unlimited in practice)
};

/**
 * In-memory rate limit tracking
 * Structure: Map<businessId, { count: number, resetAt: number }>
 */
const rateLimitStore = new Map();

/**
 * Tracks API request and returns rate limit information
 * 
 * @param {string} businessId - Business ID making the request
 * @param {string} planTier - Plan tier (free, basic, standard, premium, enterprise)
 * @returns {{ limit: number, remaining: number, reset: number }}
 */
function trackRateLimit(businessId, planTier = 'free') {
    const limit = RATE_LIMITS[planTier] || RATE_LIMITS.free;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    // Get or initialize rate limit entry
    let entry = rateLimitStore.get(businessId);

    if (!entry || now >= entry.resetAt) {
        // Create new window
        entry = {
            count: 1,
            resetAt: now + windowMs
        };
        rateLimitStore.set(businessId, entry);
    } else {
        // Increment count in current window
        entry.count++;
    }

    const remaining = Math.max(0, limit - entry.count);
    const reset = Math.ceil(entry.resetAt / 1000); // Unix timestamp in seconds

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

/**
 * Cleans up expired rate limit entries (should be called periodically)
 * This prevents memory leaks from accumulating old entries
 */
export function cleanupRateLimits() {
    const now = Date.now();
    for (const [businessId, entry] of rateLimitStore.entries()) {
        if (now >= entry.resetAt) {
            rateLimitStore.delete(businessId);
        }
    }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
