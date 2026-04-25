import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';
import { getProductAction, updateProductAction, deleteProductAction } from '@/lib/actions/standard/inventory/product';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';
import pool from '@/lib/db';

/**
 * Product Detail API Routes
 * 
 * GET /api/v1/products/[id] - Get single product with batches, serials, variants
 * PUT /api/v1/products/[id] - Update product
 * DELETE /api/v1/products/[id] - Delete product (soft delete)
 * 
 * Authentication: Required (withApiAuth middleware)
 * Authorization: Business membership required
 */

/**
 * GET /api/v1/products/[id]
 * 
 * Get a single product with batches, serial numbers, variants, and stock locations
 * 
 * Query Parameters:
 * - business_id (required): Business ID
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     product: {
 *       id, name, sku, price, stock, ...
 *       batches: [...],
 *       serial_numbers: [...],
 *       variants: [...],
 *       stock_locations: [...]
 *     }
 *   }
 * }
 */
export const GET = withApiAuth(async (request, { businessId, routeParams }) => {
    const client = await pool.connect();
    try {
        // Extract product ID from route params
        const productId = routeParams?.params?.id;
        
        if (!productId) {
            return apiError(
                'MISSING_PRODUCT_ID',
                'Product ID is required',
                400
            );
        }

        // Verify product belongs to business
        await assertEntityBelongsToBusiness(client, 'product', productId, businessId);

        // Fetch product using getProductAction
        const result = await getProductAction(businessId, productId);

        if (!result.success) {
            return apiError(
                result.code || 'PRODUCT_NOT_FOUND',
                result.error || 'Product not found',
                404
            );
        }

        return apiSuccess({ product: result.product }, 200);
    } catch (error) {
        console.error('[GET /api/v1/products/[id]] Error:', error);

        // Handle specific error types
        if (error.message?.includes('not found') || error.message?.includes('does not belong')) {
            return apiError(
                'PRODUCT_NOT_FOUND',
                'Product not found or does not belong to this business',
                404
            );
        }

        return apiError(
            'FETCH_PRODUCT_FAILED',
            'Failed to fetch product',
            500,
            { message: error.message }
        );
    } finally {
        client.release();
    }
});

/**
 * PUT /api/v1/products/[id]
 * 
 * Update an existing product
 * 
 * Request Body:
 * {
 *   business_id: string (UUID, required),
 *   name: string (optional),
 *   description: string (optional),
 *   sku: string (optional),
 *   barcode: string (optional),
 *   category: string (optional),
 *   unit: string (optional),
 *   price: number (optional),
 *   cost_price: number (optional),
 *   mrp: number (optional),
 *   stock: number (optional),
 *   min_stock: number (optional),
 *   max_stock: number (optional),
 *   reorder_point: number (optional),
 *   reorder_quantity: number (optional),
 *   tax_percent: number (optional),
 *   hsn_code: string (optional),
 *   sac_code: string (optional),
 *   location: string (optional),
 *   brand: string (optional),
 *   image_url: string (optional),
 *   is_active: boolean (optional),
 *   domain_data: object (optional)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     product: {...},
 *     warnings: [...] (optional)
 *   }
 * }
 */

// Zod schema for product update (all fields optional)
const updateProductSchema = z.object({
    business_id: z.string().uuid('Business ID is required'),
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    sku: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    unit: z.string().optional(),
    price: z.number().min(0).optional(),
    cost_price: z.number().min(0).optional(),
    costPrice: z.number().min(0).optional(), // Accept camelCase variant
    mrp: z.number().min(0).optional(),
    stock: z.number().min(0).optional(),
    min_stock: z.number().min(0).optional(),
    minStock: z.number().min(0).optional(), // Accept camelCase variant
    max_stock: z.number().min(0).optional(),
    maxStock: z.number().min(0).optional(), // Accept camelCase variant
    reorder_point: z.number().min(0).optional(),
    reorderPoint: z.number().min(0).optional(), // Accept camelCase variant
    reorder_quantity: z.number().min(0).optional(),
    reorderQuantity: z.number().min(0).optional(), // Accept camelCase variant
    tax_percent: z.number().min(0).max(100).optional(),
    taxPercent: z.number().min(0).max(100).optional(), // Accept camelCase variant
    hsn_code: z.string().optional().nullable(),
    hsnCode: z.string().optional().nullable(), // Accept camelCase variant
    sac_code: z.string().optional().nullable(),
    sacCode: z.string().optional().nullable(), // Accept camelCase variant
    location: z.string().optional().nullable(),
    brand: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(), // Accept camelCase variant
    is_active: z.boolean().optional(),
    isActive: z.boolean().optional(), // Accept camelCase variant
    domain_data: z.record(z.any()).optional(),
    domainData: z.record(z.any()).optional() // Accept camelCase variant
});

export const PUT = withApiAuth(async (request, { businessId, session, role, routeParams }) => {
    try {
        // Check role permissions - viewers cannot update products
        if (role === 'viewer') {
            return apiError(
                'FORBIDDEN',
                'Insufficient permissions. Viewers cannot update products.',
                403
            );
        }

        // Extract product ID from route params
        const productId = routeParams?.params?.id;
        
        if (!productId) {
            return apiError(
                'MISSING_PRODUCT_ID',
                'Product ID is required',
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
        const validation = updateProductSchema.safeParse(body);
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

        // Delegate to updateProductAction
        const result = await updateProductAction(productId, businessId, validatedData);

        if (!result.success) {
            // Handle specific error codes from the action
            if (result.code === 'VALIDATION_ERROR') {
                return apiError(
                    'VALIDATION_ERROR',
                    result.error,
                    400,
                    { errors: result.errors }
                );
            }

            return apiError(
                result.code || 'UPDATE_PRODUCT_FAILED',
                result.error || 'Failed to update product',
                500
            );
        }

        // Include warnings if any (e.g., low margin, MRP < price)
        const responseData = { product: result.product };
        if (result.warnings && result.warnings.length > 0) {
            responseData.warnings = result.warnings;
        }

        return apiSuccess(responseData, 200);
    } catch (error) {
        console.error('[PUT /api/v1/products/[id]] Error:', error);

        // Handle specific error types
        if (error.message?.includes('not found') || error.message?.includes('does not belong')) {
            return apiError(
                'PRODUCT_NOT_FOUND',
                'Product not found or does not belong to this business',
                404
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
            'UPDATE_PRODUCT_FAILED',
            'Failed to update product',
            500,
            { message: error.message }
        );
    }
});

/**
 * DELETE /api/v1/products/[id]
 * 
 * Delete a product (soft delete)
 * 
 * Query Parameters:
 * - business_id (required): Business ID
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     message: "Product deleted successfully"
 *   }
 * }
 */
export const DELETE = withApiAuth(async (request, { businessId, session, role, routeParams }) => {
    try {
        // Check role permissions - only owners and managers can delete products
        if (role === 'viewer') {
            return apiError(
                'FORBIDDEN',
                'Insufficient permissions. Viewers cannot delete products.',
                403
            );
        }

        // Extract product ID from route params
        const productId = routeParams?.params?.id;
        
        if (!productId) {
            return apiError(
                'MISSING_PRODUCT_ID',
                'Product ID is required',
                400
            );
        }

        // Delegate to deleteProductAction (handles soft delete)
        const result = await deleteProductAction(productId, businessId);

        if (!result.success) {
            return apiError(
                result.code || 'DELETE_PRODUCT_FAILED',
                result.error || 'Failed to delete product',
                500
            );
        }

        return apiSuccess({
            message: 'Product deleted successfully',
            productId
        }, 200);
    } catch (error) {
        console.error('[DELETE /api/v1/products/[id]] Error:', error);

        // Handle specific error types
        if (error.message?.includes('not found') || error.message?.includes('does not belong')) {
            return apiError(
                'PRODUCT_NOT_FOUND',
                'Product not found or does not belong to this business',
                404
            );
        }

        return apiError(
            'DELETE_PRODUCT_FAILED',
            'Failed to delete product',
            500,
            { message: error.message }
        );
    }
});
