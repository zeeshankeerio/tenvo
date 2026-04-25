/**
 * Pagination Utilities
 * 
 * Provides utilities for parsing pagination parameters from URL search params
 * and building pagination metadata for API responses.
 * 
 * Usage:
 * ```javascript
 * import { parsePagination, buildPaginationMeta } from '@/lib/api/_shared/pagination';
 * 
 * // In API route handler
 * const { searchParams } = new URL(request.url);
 * const { page, limit, offset, sortBy, sortOrder } = parsePagination(searchParams);
 * 
 * const result = await client.query(
 *   `SELECT * FROM invoices 
 *    WHERE business_id = $1 
 *    ORDER BY ${sortBy} ${sortOrder}
 *    LIMIT $2 OFFSET $3`,
 *   [businessId, limit, offset]
 * );
 * 
 * const meta = buildPaginationMeta(page, limit, totalCount);
 * return apiSuccess({ invoices: result.rows }, 200, meta);
 * ```
 */

/**
 * Parses pagination parameters from URL search params.
 * 
 * Extracts and validates pagination, sorting parameters with sensible defaults:
 * - page: defaults to 1, minimum 1
 * - limit/pageSize: defaults to 50, minimum 1, maximum 100
 * - sortBy: defaults to 'created_at'
 * - sortOrder: defaults to 'DESC', validates 'ASC' or 'DESC'
 * 
 * @param {URLSearchParams|Object} searchParams - URL search params or object with get() method
 * @returns {Object} Parsed pagination parameters
 * @returns {number} returns.page - Current page number (1-indexed)
 * @returns {number} returns.limit - Number of items per page
 * @returns {number} returns.offset - Database offset (calculated from page and limit)
 * @returns {string} returns.sortBy - Field name to sort by
 * @returns {string} returns.sortOrder - Sort direction ('ASC' or 'DESC')
 * 
 * @example
 * // With URLSearchParams
 * const url = new URL('https://api.example.com/invoices?page=2&limit=25&sortBy=amount&sortOrder=ASC');
 * const params = parsePagination(url.searchParams);
 * // { page: 2, limit: 25, offset: 25, sortBy: 'amount', sortOrder: 'ASC' }
 * 
 * @example
 * // With defaults
 * const params = parsePagination(new URLSearchParams());
 * // { page: 1, limit: 50, offset: 0, sortBy: 'created_at', sortOrder: 'DESC' }
 * 
 * @example
 * // With pageSize instead of limit
 * const url = new URL('https://api.example.com/invoices?page=3&pageSize=10');
 * const params = parsePagination(url.searchParams);
 * // { page: 3, limit: 10, offset: 20, sortBy: 'created_at', sortOrder: 'DESC' }
 * 
 * @example
 * // With validation (invalid values corrected)
 * const url = new URL('https://api.example.com/invoices?page=0&limit=200&sortOrder=INVALID');
 * const params = parsePagination(url.searchParams);
 * // { page: 1, limit: 100, offset: 0, sortBy: 'created_at', sortOrder: 'DESC' }
 */
export function parsePagination(searchParams) {
    // Validate input
    if (!searchParams || typeof searchParams.get !== 'function') {
        throw new TypeError('searchParams must be URLSearchParams or have a get() method');
    }

    // Parse page (default: 1, min: 1)
    const pageParam = searchParams.get('page');
    let page = pageParam ? parseInt(pageParam, 10) : 1;
    if (isNaN(page) || page < 1) {
        page = 1;
    }

    // Parse limit/pageSize (default: 50, min: 1, max: 100)
    // Support both 'limit' and 'pageSize' parameter names
    const limitParam = searchParams.get('limit') || searchParams.get('pageSize');
    let limit = limitParam ? parseInt(limitParam, 10) : 50;
    if (isNaN(limit) || limit < 1) {
        limit = 1;
    }
    if (limit > 100) {
        limit = 100;
    }

    // Calculate offset from page and limit
    const offset = (page - 1) * limit;

    // Parse sortBy (default: 'created_at')
    const sortBy = searchParams.get('sortBy') || 'created_at';
    // Sanitize sortBy to prevent SQL injection (allow only alphanumeric and underscore)
    const sanitizedSortBy = sortBy.replace(/[^a-zA-Z0-9_]/g, '');

    // Parse sortOrder (default: 'DESC', validate: 'ASC' or 'DESC')
    const sortOrderParam = searchParams.get('sortOrder');
    let sortOrder = 'DESC';
    if (sortOrderParam) {
        const upperSortOrder = sortOrderParam.toUpperCase();
        if (upperSortOrder === 'ASC' || upperSortOrder === 'DESC') {
            sortOrder = upperSortOrder;
        }
    }

    return {
        page,
        limit,
        offset,
        sortBy: sanitizedSortBy,
        sortOrder,
    };
}

/**
 * Builds pagination metadata for API responses.
 * 
 * Creates a standardized pagination metadata object containing:
 * - page: current page number
 * - pageSize: items per page
 * - total: total number of items
 * - totalPages: total number of pages (calculated)
 * 
 * @param {number} page - Current page number (1-indexed)
 * @param {number} limit - Number of items per page
 * @param {number} total - Total number of items across all pages
 * @returns {Object} Pagination metadata
 * @returns {number} returns.page - Current page number
 * @returns {number} returns.pageSize - Items per page
 * @returns {number} returns.total - Total number of items
 * @returns {number} returns.totalPages - Total number of pages
 * 
 * @example
 * // Standard pagination metadata
 * const meta = buildPaginationMeta(2, 25, 100);
 * // { page: 2, pageSize: 25, total: 100, totalPages: 4 }
 * 
 * @example
 * // Empty result set
 * const meta = buildPaginationMeta(1, 50, 0);
 * // { page: 1, pageSize: 50, total: 0, totalPages: 0 }
 * 
 * @example
 * // Partial last page
 * const meta = buildPaginationMeta(3, 20, 55);
 * // { page: 3, pageSize: 20, total: 55, totalPages: 3 }
 * 
 * @example
 * // Use with apiSuccess
 * import { apiSuccess } from '@/lib/api/_shared/response';
 * const meta = buildPaginationMeta(page, limit, totalCount);
 * return apiSuccess({ invoices: result.rows }, 200, meta);
 */
export function buildPaginationMeta(page, limit, total) {
    // Validate inputs
    if (typeof page !== 'number' || isNaN(page) || page < 1) {
        throw new TypeError('page must be a number >= 1');
    }
    if (typeof limit !== 'number' || isNaN(limit) || limit < 1) {
        throw new TypeError('limit must be a number >= 1');
    }
    if (typeof total !== 'number' || isNaN(total) || total < 0) {
        throw new TypeError('total must be a number >= 0');
    }

    // Calculate total pages (0 if no items)
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
        page,
        pageSize: limit,
        total,
        totalPages,
    };
}
