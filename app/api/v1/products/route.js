export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';
import { parsePagination, buildPaginationMeta } from '@/lib/api/_shared/pagination';
import { getProductsAction, createProductAction } from '@/lib/actions/standard/inventory/product';

/**
 * Product API Routes
 * 
 * GET /api/v1/products - List products with pagination, search, and filters
 * POST /api/v1/products - Create a new product
 * 
 * Authentication: Required (withApiAuth middleware)
 * Authorization: Business membership required
 */

/**
 * GET /api/v1/products
 * 
 * List products with pagination, search, and filtering
 * 
 * Query Parameters:
 * - business_id (required): Business ID
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 50, max: 100)
 * - sortBy (optional): Sort field (default: 'name')
 * - sortOrder (optional): Sort direction 'ASC' or 'DESC' (default: 'ASC')
 * - search (optional): Search query (searches name, sku, barcode)
 * - category (optional): Filter by category
 * - is_active (optional): Filter by active status (true/false)
 * - min_stock_alert (optional): Filter products below reorder point (true/false)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     products: [...],
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
    try {
        const { searchParams } = new URL(request.url);
        const { page, limit, offset } = parsePagination(searchParams);

        // Extract filter parameters
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const isActive = searchParams.get('is_active');
        const minStockAlert = searchParams.get('min_stock_alert');

        // Build options for getProductsAction
        const options = {
            limit,
            offset,
            search,
            category,
            isActive: isActive !== null && isActive !== undefined ? isActive : undefined
        };

        // Fetch products using getProductsAction
        const result = await getProductsAction(businessId, options);

        if (!result.success) {
            return apiError(
                'FETCH_PRODUCTS_FAILED',
                result.error || 'Failed to fetch products',
                500
            );
        }

        let products = result.products || [];

        if (minStockAlert === 'true') {
            products = products.filter(p => {
                const stock = Number(p.stock || 0);
                const reorderPoint = Number(p.reorder_point || 0);
                return stock <= reorderPoint && reorderPoint > 0;
            });
        }

        // Build pagination metadata
        const total = result.total || products.length;
        const meta = buildPaginationMeta(page, limit, total);

        return apiSuccess({ products }, 200, meta);
    } catch (error) {
        console.error('[GET /api/v1/products] Error:', error);
        return apiError(
            'FETCH_PRODUCTS_FAILED',
            'Failed to fetch products',
            500,
            { message: error.message }
        );
    }
});

/**
 * POST /api/v1/products
 * 
 * Create a new product
 * 
 * Request Body:
 * {
 *   business_id: string (UUID, required),
 *   name: string (required),
 *   description: string (optional),
 *   sku: string (optional),
 *   barcode: string (optional),
 *   category: string (optional),
 *   unit: string (optional, default: 'pcs'),
 *   price: number (required),
 *   cost_price: number (optional),
 *   mrp: number (optional),
 *   stock: number (optional, default: 0),
 *   min_stock: number (optional, default: 0),
 *   max_stock: number (optional, default: 0),
 *   reorder_point: number (optional, default: 0),
 *   reorder_quantity: number (optional, default: 0),
 *   tax_percent: number (optional, default: 0),
 *   hsn_code: string (optional),
 *   sac_code: string (optional),
 *   location: string (optional),
 *   brand: string (optional),
 *   image_url: string (optional),
 *   is_active: boolean (optional, default: true),
 *   domain_data: object (optional),
 *   batches: array (optional) [
 *     {
 *       batch_number: string,
 *       quantity: number,
 *       manufacturing_date: string (ISO date),
 *       expiry_date: string (ISO date),
 *       cost_price: number,
 *       notes: string
 *     }
 *   ],
 *   serial_numbers: array (optional) [
 *     {
 *       serial_number: string,
 *       status: string (default: 'in_stock'),
 *       notes: string
 *     }
 *   ],
 *   variants: array (optional) [
 *     {
 *       variant_sku: string,
 *       variant_name: string,
 *       size: string,
 *       color: string,
 *       price: number,
 *       cost_price: number,
 *       stock: number
 *     }
 *   ]
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     product: {...}
 *   }
 * }
 */

// Zod schema for product creation (basic validation, full validation in createProductAction)
const createProductSchema = z.object({
    business_id: z.string().uuid('Business ID is required'),
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional().nullable(),
    sku: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    unit: z.string().optional().default('pcs'),
    price: z.number().min(0, 'Price must be non-negative'),
    cost_price: z.number().min(0).optional().default(0),
    costPrice: z.number().min(0).optional(), // Accept camelCase variant
    mrp: z.number().min(0).optional().default(0),
    stock: z.number().min(0).optional().default(0),
    min_stock: z.number().min(0).optional().default(0),
    minStock: z.number().min(0).optional(), // Accept camelCase variant
    max_stock: z.number().min(0).optional().default(0),
    maxStock: z.number().min(0).optional(), // Accept camelCase variant
    reorder_point: z.number().min(0).optional().default(0),
    reorderPoint: z.number().min(0).optional(), // Accept camelCase variant
    reorder_quantity: z.number().min(0).optional().default(0),
    reorderQuantity: z.number().min(0).optional(), // Accept camelCase variant
    tax_percent: z.number().min(0).max(100).optional().default(0),
    taxPercent: z.number().min(0).max(100).optional(), // Accept camelCase variant
    hsn_code: z.string().optional().nullable(),
    hsnCode: z.string().optional().nullable(), // Accept camelCase variant
    sac_code: z.string().optional().nullable(),
    sacCode: z.string().optional().nullable(), // Accept camelCase variant
    location: z.string().optional().nullable(),
    brand: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(), // Accept camelCase variant
    is_active: z.boolean().optional().default(true),
    isActive: z.boolean().optional(), // Accept camelCase variant
    domain_data: z.record(z.any()).optional().default({}),
    domainData: z.record(z.any()).optional(), // Accept camelCase variant
    batches: z.array(z.any()).optional().default([]),
    serial_numbers: z.array(z.any()).optional().default([]),
    serialNumbers: z.array(z.any()).optional(), // Accept camelCase variant
    variants: z.array(z.any()).optional().default([])
});

export const POST = withApiAuth(async (request, { businessId, session, role, parsedBody }) => {
    try {
        if (role === 'viewer') {
            return apiError('FORBIDDEN', 'Insufficient permissions. Viewers cannot create products.', 403);
        }

        // Enforce plan product limit before creating
        const { canAddProduct } = await import('@/lib/services/planLimits');
        const limitCheck = await canAddProduct(businessId);
        if (!limitCheck.allowed) {
            return apiError('PLAN_LIMIT_REACHED', limitCheck.reason, 403, {
                current: limitCheck.current,
                limit: limitCheck.limit,
                upgradePlan: limitCheck.upgradePlan,
            });
        }

        // Use pre-parsed body from middleware (stream already consumed)
        const body = parsedBody || {};

        if (body.business_id && body.business_id !== businessId) {
            return apiError('BUSINESS_MISMATCH', 'Business ID in request body does not match authenticated business', 400);
        }

        body.business_id = businessId;

        // Validate with Zod schema (basic validation)
        const validation = createProductSchema.safeParse(body);
        if (!validation.success) {
            return apiError(
                'VALIDATION_ERROR',
                'Invalid product data',
                400,
                { errors: validation.error.errors }
            );
        }

        const validatedData = validation.data;

        // Normalize camelCase to snake_case for consistency
        if (validatedData.costPrice !== undefined) validatedData.cost_price = validatedData.costPrice;
        if (validatedData.minStock !== undefined) validatedData.min_stock = validatedData.minStock;
        if (validatedData.maxStock !== undefined) validatedData.max_stock = validatedData.maxStock;
        if (validatedData.reorderPoint !== undefined) validatedData.reorder_point = validatedData.reorderPoint;
        if (validatedData.reorderQuantity !== undefined) validatedData.reorder_quantity = validatedData.reorderQuantity;
        if (validatedData.taxPercent !== undefined) validatedData.tax_percent = validatedData.taxPercent;
        if (validatedData.hsnCode !== undefined) validatedData.hsn_code = validatedData.hsnCode;
        if (validatedData.sacCode !== undefined) validatedData.sac_code = validatedData.sacCode;
        if (validatedData.imageUrl !== undefined) validatedData.image_url = validatedData.imageUrl;
        if (validatedData.isActive !== undefined) validatedData.is_active = validatedData.isActive;
        if (validatedData.domainData !== undefined) validatedData.domain_data = validatedData.domainData;
        if (validatedData.serialNumbers !== undefined) validatedData.serial_numbers = validatedData.serialNumbers;

        // Delegate to createProductAction (handles full Zod validation, batches, serials, variants)
        const result = await createProductAction(validatedData);

        if (!result.success) {
            // Handle specific error codes from the action
            if (result.code === 'VALIDATION_ERROR') {
                return apiError(
                    'VALIDATION_ERROR',
                    result.error,
                    400,
                    { errors: result.errors, details: result.details }
                );
            }

            if (result.error?.includes('Plan limit') || result.error?.includes('max_products')) {
                return apiError(
                    'PLAN_LIMIT_EXCEEDED',
                    result.error,
                    403
                );
            }

            return apiError(
                result.code || 'CREATE_PRODUCT_FAILED',
                result.error || 'Failed to create product',
                500
            );
        }

        return apiSuccess({ product: result.product }, 201);
    } catch (error) {
        console.error('[POST /api/v1/products] Error:', error);

        // Handle specific error types
        if (error.message?.includes('Plan limit') || error.message?.includes('max_products')) {
            return apiError(
                'PLAN_LIMIT_EXCEEDED',
                error.message,
                403
            );
        }

        if (error.message?.includes('Validation')) {
            return apiError(
                'VALIDATION_ERROR',
                error.message,
                400
            );
        }

        return apiError(
            'CREATE_PRODUCT_FAILED',
            'Failed to create product',
            500,
            { message: error.message }
        );
    }
});

