import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';
import { InvoiceService } from '@/lib/services/InvoiceService';
import { updateInvoiceAction } from '@/lib/actions/basic/invoice';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';

/**
 * Invoice Detail API Routes
 * 
 * GET /api/v1/invoices/[id] - Get single invoice with items
 * PUT /api/v1/invoices/[id] - Update invoice
 * DELETE /api/v1/invoices/[id] - Void invoice
 * 
 * Authentication: Required (withApiAuth middleware)
 * Authorization: Business membership required
 */

/**
 * GET /api/v1/invoices/[id]
 * 
 * Get a single invoice with items, customer details, and product information
 * 
 * Query Parameters:
 * - business_id (required): Business ID
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     invoice: {
 *       id, invoice_number, date, due_date, status, ...
 *       customer_name, customer_email, customer_phone, customer_address,
 *       items: [{ id, product_id, name, quantity, ... }]
 *     }
 *   }
 * }
 */
export const GET = withApiAuth(async (request, { businessId, routeParams }) => {
    const client = await pool.connect();
    try {
        // Extract invoice ID from route params
        const invoiceId = routeParams?.params?.id;
        
        if (!invoiceId) {
            return apiError(
                'MISSING_INVOICE_ID',
                'Invoice ID is required',
                400
            );
        }

        // Verify invoice belongs to business
        await assertEntityBelongsToBusiness(client, 'invoice', invoiceId, businessId);

        // Fetch invoice with items using InvoiceService
        const invoice = await InvoiceService.getInvoiceWithItems(invoiceId, businessId);

        if (!invoice) {
            return apiError(
                'INVOICE_NOT_FOUND',
                'Invoice not found',
                404
            );
        }

        return apiSuccess({ invoice }, 200);
    } catch (error) {
        console.error('[GET /api/v1/invoices/[id]] Error:', error);

        // Handle specific error types
        if (error.message?.includes('not found') || error.message?.includes('does not belong')) {
            return apiError(
                'INVOICE_NOT_FOUND',
                'Invoice not found or does not belong to this business',
                404
            );
        }

        return apiError(
            'FETCH_INVOICE_FAILED',
            'Failed to fetch invoice',
            500,
            { message: error.message }
        );
    } finally {
        client.release();
    }
});

/**
 * PUT /api/v1/invoices/[id]
 * 
 * Update an existing invoice
 * 
 * Request Body:
 * {
 *   business_id: string (UUID, required),
 *   customer_id: string (UUID, optional),
 *   invoice_number: string (optional),
 *   date: string (ISO date, optional),
 *   due_date: string (ISO date, optional),
 *   status: string (optional),
 *   payment_status: string (optional),
 *   payment_method: string (optional),
 *   notes: string (optional),
 *   terms: string (optional),
 *   subtotal: number (required),
 *   tax_total: number (optional),
 *   discount_total: number (optional),
 *   grand_total: number (required),
 *   tax_details: object (optional),
 *   domain_data: object (optional),
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

// Zod schema for invoice update (reuse from create with some fields optional)
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

const updateInvoiceSchema = z.object({
    business_id: z.string().uuid('Business ID is required'),
    customer_id: z.string().uuid().optional().nullable(),
    invoice_number: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional().nullable(),
    status: z.enum(['draft', 'sent', 'paid', 'cancelled', 'overdue', 'fulfilled', 'voided']).optional(),
    payment_status: z.string().optional().nullable(),
    payment_method: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    subtotal: z.number().min(0).default(0),
    tax_total: z.number().min(0).optional().default(0),
    total_tax: z.number().min(0).optional(), // Alias for tax_total
    discount_total: z.number().min(0).default(0),
    grand_total: z.number().min(0, 'Grand total must be non-negative'),
    tax_details: z.record(z.any()).optional().default({}),
    domain_data: z.record(z.any()).optional().default({}),
    items: z.array(invoiceItemSchema).min(1, 'At least one item is required')
});

export const PUT = withApiAuth(async (request, { businessId, session, role, routeParams }) => {
    try {
        // Check role permissions - viewers cannot update invoices
        if (role === 'viewer') {
            return apiError(
                'FORBIDDEN',
                'Insufficient permissions. Viewers cannot update invoices.',
                403
            );
        }

        // Extract invoice ID from route params
        const invoiceId = routeParams?.params?.id;
        
        if (!invoiceId) {
            return apiError(
                'MISSING_INVOICE_ID',
                'Invoice ID is required',
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
        const validation = updateInvoiceSchema.safeParse(body);
        if (!validation.success) {
            return apiError(
                'VALIDATION_ERROR',
                'Invalid invoice data',
                400,
                { errors: validation.error.errors }
            );
        }

        const validatedData = validation.data;

        // Delegate to existing updateInvoiceAction
        // This action handles stock reversal, customer balance adjustment, GL entry updates, etc.
        const result = await updateInvoiceAction({
            invoiceId,
            invoiceData: validatedData,
            items: validatedData.items
        });

        // Check if action succeeded
        if (!result.success) {
            return apiError(
                result.code || 'UPDATE_INVOICE_FAILED',
                result.error || 'Failed to update invoice',
                400,
                result.details || {}
            );
        }

        return apiSuccess({ invoice: result.data.invoice }, 200);
    } catch (error) {
        console.error('[PUT /api/v1/invoices/[id]] Error:', error);

        // Handle specific error types
        if (error.message?.includes('not found') || error.message?.includes('does not belong')) {
            return apiError(
                'INVOICE_NOT_FOUND',
                'Invoice not found or does not belong to this business',
                404
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
                }
            );
        }

        if (error.message?.includes('Domain validation')) {
            return apiError(
                'DOMAIN_VALIDATION_ERROR',
                error.message,
                400
            );
        }

        return apiError(
            'UPDATE_INVOICE_FAILED',
            'Failed to update invoice',
            500,
            { message: error.message }
        );
    }
});

/**
 * DELETE /api/v1/invoices/[id]
 * 
 * Void an invoice (soft delete with full reversal)
 * 
 * Query Parameters:
 * - business_id (required): Business ID
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     message: "Invoice voided successfully",
 *     itemsRestored: 3,
 *     reservationsReleased: 2,
 *     journalsReversed: 1
 *   }
 * }
 */
export const DELETE = withApiAuth(async (request, { businessId, session, role, routeParams }) => {
    try {
        // Check role permissions - only owners and managers can void invoices
        if (role === 'viewer') {
            return apiError(
                'FORBIDDEN',
                'Insufficient permissions. Viewers cannot void invoices.',
                403
            );
        }

        // Extract invoice ID from route params
        const invoiceId = routeParams?.params?.id;
        
        if (!invoiceId) {
            return apiError(
                'MISSING_INVOICE_ID',
                'Invoice ID is required',
                400
            );
        }

        // Delegate to InvoiceService.voidInvoice
        // This handles:
        // - Customer balance reversal
        // - Stock restoration
        // - Inventory reservation release
        // - GL entry reversal
        // - Invoice status update to 'voided'
        const result = await InvoiceService.voidInvoice(
            businessId,
            invoiceId,
            session.user.id
        );

        return apiSuccess(result, 200);
    } catch (error) {
        console.error('[DELETE /api/v1/invoices/[id]] Error:', error);

        // Handle specific error types
        if (error.message?.includes('not found')) {
            return apiError(
                'INVOICE_NOT_FOUND',
                'Invoice not found',
                404
            );
        }

        if (error.message?.includes('already voided')) {
            return apiError(
                'INVOICE_ALREADY_VOIDED',
                'Invoice is already voided',
                400
            );
        }

        return apiError(
            'VOID_INVOICE_FAILED',
            'Failed to void invoice',
            500,
            { message: error.message }
        );
    }
});
