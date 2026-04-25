import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';
import { 
    addStockAction, 
    removeStockAction, 
    adjustStockAction, 
    transferStockAction 
} from '@/lib/actions/standard/inventory/stock';

/**
 * Inventory Stock Operations API Routes
 * 
 * POST /api/v1/inventory/stock - Perform stock operations (add/remove/adjust/transfer)
 * 
 * Authentication: Required (withApiAuth middleware)
 * Authorization: Business membership required
 */

/**
 * POST /api/v1/inventory/stock
 * 
 * Perform stock operations: add, remove, adjust, or transfer
 * 
 * Request Body:
 * {
 *   operation: string (required) - 'add', 'remove', 'adjust', or 'transfer'
 *   business_id: string (UUID, required),
 *   
 *   // For 'add' operation:
 *   product_id: string (UUID, required),
 *   warehouse_id: string (UUID, optional),
 *   quantity: number (required, positive),
 *   unit_cost: number (optional),
 *   batch_id: string (UUID, optional),
 *   reference_type: string (optional),
 *   reference_id: string (UUID, optional),
 *   notes: string (optional)
 *   
 *   // For 'remove' operation:
 *   product_id: string (UUID, required),
 *   warehouse_id: string (UUID, optional),
 *   quantity: number (required, positive),
 *   reference_type: string (optional),
 *   reference_id: string (UUID, optional),
 *   notes: string (optional)
 *   
 *   // For 'adjust' operation:
 *   product_id: string (UUID, required),
 *   warehouse_id: string (UUID, optional),
 *   adjustment_quantity: number (required, can be positive or negative),
 *   reason: string (required),
 *   notes: string (optional)
 *   
 *   // For 'transfer' operation:
 *   product_id: string (UUID, required),
 *   from_warehouse_id: string (UUID, required),
 *   to_warehouse_id: string (UUID, required),
 *   quantity: number (required, positive),
 *   notes: string (optional)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     operation: string,
 *     message: string,
 *     movement: {...} (for add/remove/adjust),
 *     transfer: {...} (for transfer)
 *   }
 * }
 */

// Zod schemas for each operation
const addStockSchema = z.object({
    operation: z.literal('add'),
    business_id: z.string().uuid('Business ID is required'),
    businessId: z.string().uuid().optional(), // Accept camelCase variant
    product_id: z.string().uuid('Product ID is required'),
    productId: z.string().uuid().optional(), // Accept camelCase variant
    warehouse_id: z.string().uuid().optional().nullable(),
    warehouseId: z.string().uuid().optional().nullable(), // Accept camelCase variant
    quantity: z.number().positive('Quantity must be positive'),
    unit_cost: z.number().min(0).optional(),
    unitCost: z.number().min(0).optional(), // Accept camelCase variant
    batch_id: z.string().uuid().optional().nullable(),
    batchId: z.string().uuid().optional().nullable(), // Accept camelCase variant
    reference_type: z.string().optional().nullable(),
    referenceType: z.string().optional().nullable(), // Accept camelCase variant
    reference_id: z.string().uuid().optional().nullable(),
    referenceId: z.string().uuid().optional().nullable(), // Accept camelCase variant
    notes: z.string().optional().nullable()
});

const removeStockSchema = z.object({
    operation: z.literal('remove'),
    business_id: z.string().uuid('Business ID is required'),
    businessId: z.string().uuid().optional(), // Accept camelCase variant
    product_id: z.string().uuid('Product ID is required'),
    productId: z.string().uuid().optional(), // Accept camelCase variant
    warehouse_id: z.string().uuid().optional().nullable(),
    warehouseId: z.string().uuid().optional().nullable(), // Accept camelCase variant
    quantity: z.number().positive('Quantity must be positive'),
    reference_type: z.string().optional().nullable(),
    referenceType: z.string().optional().nullable(), // Accept camelCase variant
    reference_id: z.string().uuid().optional().nullable(),
    referenceId: z.string().uuid().optional().nullable(), // Accept camelCase variant
    notes: z.string().optional().nullable()
});

const adjustStockSchema = z.object({
    operation: z.literal('adjust'),
    business_id: z.string().uuid('Business ID is required'),
    businessId: z.string().uuid().optional(), // Accept camelCase variant
    product_id: z.string().uuid('Product ID is required'),
    productId: z.string().uuid().optional(), // Accept camelCase variant
    warehouse_id: z.string().uuid().optional().nullable(),
    warehouseId: z.string().uuid().optional().nullable(), // Accept camelCase variant
    adjustment_quantity: z.number().refine(val => val !== 0, {
        message: 'Adjustment quantity cannot be zero'
    }),
    adjustmentQuantity: z.number().optional(), // Accept camelCase variant
    reason: z.string().min(1, 'Reason is required for stock adjustments'),
    notes: z.string().optional().nullable()
});

const transferStockSchema = z.object({
    operation: z.literal('transfer'),
    business_id: z.string().uuid('Business ID is required'),
    businessId: z.string().uuid().optional(), // Accept camelCase variant
    product_id: z.string().uuid('Product ID is required'),
    productId: z.string().uuid().optional(), // Accept camelCase variant
    from_warehouse_id: z.string().uuid('Source warehouse ID is required'),
    fromWarehouseId: z.string().uuid().optional(), // Accept camelCase variant
    to_warehouse_id: z.string().uuid('Destination warehouse ID is required'),
    toWarehouseId: z.string().uuid().optional(), // Accept camelCase variant
    quantity: z.number().positive('Quantity must be positive'),
    notes: z.string().optional().nullable()
});

// Union schema for all operations
const stockOperationSchema = z.discriminatedUnion('operation', [
    addStockSchema,
    removeStockSchema,
    adjustStockSchema,
    transferStockSchema
]);

export const POST = withApiAuth(async (request, { businessId, session, role }) => {
    try {
        // Check role permissions - viewers cannot perform stock operations
        if (role === 'viewer') {
            return apiError(
                'FORBIDDEN',
                'Insufficient permissions. Viewers cannot perform stock operations.',
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

        // Validate operation type
        if (!body.operation) {
            return apiError(
                'MISSING_OPERATION',
                'Operation type is required (add, remove, adjust, or transfer)',
                400
            );
        }

        const operation = body.operation.toLowerCase();
        if (!['add', 'remove', 'adjust', 'transfer'].includes(operation)) {
            return apiError(
                'INVALID_OPERATION',
                'Invalid operation. Must be one of: add, remove, adjust, transfer',
                400
            );
        }

        // Normalize operation to lowercase
        body.operation = operation;

        // Validate with Zod schema
        const validation = stockOperationSchema.safeParse(body);
        if (!validation.success) {
            return apiError(
                'VALIDATION_ERROR',
                'Invalid stock operation data',
                400,
                { errors: validation.error.errors }
            );
        }

        const validatedData = validation.data;

        // Normalize camelCase to snake_case for consistency
        const normalizedData = {
            businessId: validatedData.business_id || validatedData.businessId,
            productId: validatedData.product_id || validatedData.productId,
            warehouseId: validatedData.warehouse_id || validatedData.warehouseId,
            quantity: validatedData.quantity,
            notes: validatedData.notes
        };

        let result;

        // Execute the appropriate operation
        switch (operation) {
            case 'add':
                normalizedData.unitCost = validatedData.unit_cost || validatedData.unitCost;
                normalizedData.batchId = validatedData.batch_id || validatedData.batchId;
                normalizedData.referenceType = validatedData.reference_type || validatedData.referenceType;
                normalizedData.referenceId = validatedData.reference_id || validatedData.referenceId;

                result = await addStockAction(normalizedData);
                
                if (!result.success) {
                    return apiError(
                        result.code || 'ADD_STOCK_FAILED',
                        result.error || 'Failed to add stock',
                        400
                    );
                }

                return apiSuccess({
                    operation: 'add',
                    message: 'Stock added successfully',
                    movement: result.movement
                }, 201);

            case 'remove':
                normalizedData.referenceType = validatedData.reference_type || validatedData.referenceType;
                normalizedData.referenceId = validatedData.reference_id || validatedData.referenceId;

                result = await removeStockAction(normalizedData);
                
                if (!result.success) {
                    return apiError(
                        result.code || 'REMOVE_STOCK_FAILED',
                        result.error || 'Failed to remove stock',
                        400
                    );
                }

                return apiSuccess({
                    operation: 'remove',
                    message: 'Stock removed successfully',
                    movement: result.movement
                }, 200);

            case 'adjust':
                normalizedData.adjustmentQuantity = validatedData.adjustment_quantity || validatedData.adjustmentQuantity;
                normalizedData.reason = validatedData.reason;

                result = await adjustStockAction(normalizedData);
                
                if (!result.success) {
                    return apiError(
                        result.code || 'ADJUST_STOCK_FAILED',
                        result.error || 'Failed to adjust stock',
                        400
                    );
                }

                return apiSuccess({
                    operation: 'adjust',
                    message: 'Stock adjusted successfully',
                    movement: result.movement
                }, 200);

            case 'transfer':
                normalizedData.fromWarehouseId = validatedData.from_warehouse_id || validatedData.fromWarehouseId;
                normalizedData.toWarehouseId = validatedData.to_warehouse_id || validatedData.toWarehouseId;

                result = await transferStockAction(normalizedData);
                
                if (!result.success) {
                    return apiError(
                        result.code || 'TRANSFER_STOCK_FAILED',
                        result.error || 'Failed to transfer stock',
                        400
                    );
                }

                return apiSuccess({
                    operation: 'transfer',
                    message: 'Stock transferred successfully',
                    transfer: result.transfer
                }, 200);

            default:
                return apiError(
                    'INVALID_OPERATION',
                    'Invalid operation type',
                    400
                );
        }
    } catch (error) {
        console.error('[POST /api/v1/inventory/stock] Error:', error);

        // Handle specific error types
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
            'STOCK_OPERATION_FAILED',
            'Failed to perform stock operation',
            500,
            { message: error.message }
        );
    }
});
