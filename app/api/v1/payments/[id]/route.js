import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { apiSuccess, apiError } from '@/lib/api/_shared/response';
import { PaymentService } from '@/lib/services/PaymentService';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';

/**
 * Payment Detail API Routes
 * 
 * GET /api/v1/payments/[id] - Get single payment with allocations
 * DELETE /api/v1/payments/[id] - Void payment (soft delete with reversal)
 * 
 * Authentication: Required (withApiAuth middleware)
 * Authorization: Business membership required
 */

/**
 * GET /api/v1/payments/[id]
 * 
 * Get a single payment with allocations, customer/vendor details
 * 
 * Query Parameters:
 * - business_id (required): Business ID
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     payment: {
 *       id, payment_type, amount, payment_mode, payment_date, ...
 *       customer_name, vendor_name,
 *       allocations: [{ id, invoice_id, purchase_id, amount, ... }]
 *     }
 *   }
 * }
 */
export const GET = withApiAuth(async (request, { businessId, routeParams }) => {
    const client = await pool.connect();
    try {
        // Extract payment ID from route params
        const paymentId = routeParams?.params?.id;
        
        if (!paymentId) {
            return apiError(
                'MISSING_PAYMENT_ID',
                'Payment ID is required',
                400
            );
        }

        // Verify payment belongs to business
        await assertEntityBelongsToBusiness(client, 'payment', paymentId, businessId);

        // Fetch payment with customer/vendor details
        const paymentRes = await client.query(`
            SELECT 
                p.*,
                c.name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                v.name as vendor_name,
                v.email as vendor_email,
                v.phone as vendor_phone
            FROM payments p
            LEFT JOIN customers c ON p.customer_id = c.id AND c.business_id = p.business_id
            LEFT JOIN vendors v ON p.vendor_id = v.id AND v.business_id = p.business_id
            WHERE p.id = $1 AND p.business_id = $2
        `, [paymentId, businessId]);

        if (paymentRes.rows.length === 0) {
            return apiError(
                'PAYMENT_NOT_FOUND',
                'Payment not found',
                404
            );
        }

        const payment = paymentRes.rows[0];

        // Fetch payment allocations
        const allocationsRes = await client.query(`
            SELECT 
                pa.*,
                i.invoice_number,
                i.grand_total as invoice_total,
                pu.purchase_number,
                pu.total_amount as purchase_total
            FROM payment_allocations pa
            LEFT JOIN invoices i ON pa.invoice_id = i.id
            LEFT JOIN purchases pu ON pa.purchase_id = pu.id
            WHERE pa.payment_id = $1 AND pa.business_id = $2
            ORDER BY pa.created_at
        `, [paymentId, businessId]);

        payment.allocations = allocationsRes.rows;

        return apiSuccess({ payment }, 200);
    } catch (error) {
        console.error('[GET /api/v1/payments/[id]] Error:', error);

        // Handle specific error types
        if (error.message?.includes('not found') || error.message?.includes('does not belong')) {
            return apiError(
                'PAYMENT_NOT_FOUND',
                'Payment not found or does not belong to this business',
                404
            );
        }

        return apiError(
            'FETCH_PAYMENT_FAILED',
            'Failed to fetch payment',
            500,
            { message: error.message }
        );
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/v1/payments/[id]
 * 
 * Void a payment (soft delete with full reversal)
 * 
 * Query Parameters:
 * - business_id (required): Business ID
 * 
 * Request Body (optional):
 * {
 *   reason: string (optional) - Reason for voiding the payment
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     message: "Payment voided successfully",
 *     paymentId: string,
 *     amount: number,
 *     allocationsReversed: number,
 *     reason: string
 *   }
 * }
 */
export const DELETE = withApiAuth(async (request, { businessId, session, role, routeParams }) => {
    try {
        // Check role permissions - only owners and managers can void payments
        if (role === 'viewer') {
            return apiError(
                'FORBIDDEN',
                'Insufficient permissions. Viewers cannot void payments.',
                403
            );
        }

        // Extract payment ID from route params
        const paymentId = routeParams?.params?.id;
        
        if (!paymentId) {
            return apiError(
                'MISSING_PAYMENT_ID',
                'Payment ID is required',
                400
            );
        }

        // Parse request body for optional reason
        let reason = 'Payment voided via API';
        try {
            const body = await request.json();
            if (body.reason) {
                reason = body.reason;
            }
        } catch (error) {
            // Body is optional, ignore parse errors
        }

        // Delegate to PaymentService.voidPayment
        // This handles:
        // - Reversing all payment allocations
        // - Restoring invoice/purchase payment_status
        // - Reversing GL entries via AccountingService.reverseJournalEntry
        // - Restoring customer/vendor outstanding balance
        // - Marking payment as voided
        const result = await PaymentService.voidPayment(
            paymentId,
            reason,
            { businessId, userId: session.user.id }
        );

        return apiSuccess(result, 200);
    } catch (error) {
        console.error('[DELETE /api/v1/payments/[id]] Error:', error);

        // Handle specific error types
        if (error.message?.includes('not found')) {
            return apiError(
                'PAYMENT_NOT_FOUND',
                'Payment not found',
                404
            );
        }

        if (error.message?.includes('already voided')) {
            return apiError(
                'PAYMENT_ALREADY_VOIDED',
                'Payment is already voided',
                400
            );
        }

        return apiError(
            'VOID_PAYMENT_FAILED',
            'Failed to void payment',
            500,
            { message: error.message }
        );
    }
});
