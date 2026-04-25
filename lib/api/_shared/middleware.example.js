/**
 * Example API Route using withApiAuth middleware
 * 
 * This file demonstrates the usage pattern for the withApiAuth middleware.
 * Copy this pattern when creating new API routes.
 */

import { NextResponse } from 'next/server';
import { withApiAuth } from './middleware';

/**
 * GET /api/example
 * 
 * Example endpoint that lists data for a business.
 * Requires authentication and business_id query parameter.
 * 
 * Query Parameters:
 *   - business_id (required): The business ID to fetch data for
 *   - page (optional): Page number for pagination
 *   - limit (optional): Items per page
 * 
 * Example:
 *   GET /api/example?business_id=123&page=1&limit=10
 */
export const GET = withApiAuth(async (request, { session, businessId, role, planTier }) => {
    // Extract additional query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // The middleware has already:
    // 1. Authenticated the user (session is valid)
    // 2. Validated the user has access to businessId
    // 3. Extracted the user's role and plan tier

    // You can now safely use businessId in your queries
    // Example: Fetch data from database
    const data = [
        { id: 1, name: 'Item 1', businessId },
        { id: 2, name: 'Item 2', businessId },
    ];

    // You can check role for additional authorization
    if (role === 'viewer') {
        // Viewers might have read-only access
        return NextResponse.json({
            success: true,
            data,
            meta: {
                page,
                limit,
                total: data.length,
                role,
                planTier,
            },
        });
    }

    // Return success response
    return NextResponse.json({
        success: true,
        data,
        meta: {
            page,
            limit,
            total: data.length,
            role,
            planTier,
        },
    });
});

/**
 * POST /api/example
 * 
 * Example endpoint that creates data for a business.
 * Requires authentication and business_id in request body.
 * 
 * Request Body:
 *   {
 *     "business_id": "123",
 *     "name": "New Item",
 *     "description": "Item description"
 *   }
 * 
 * Example:
 *   POST /api/example
 *   Content-Type: application/json
 *   { "business_id": "123", "name": "New Item" }
 */
export const POST = withApiAuth(async (request, { session, businessId, role, planTier }) => {
    // Parse request body
    const body = await request.json();
    const { name, description } = body;

    // Validate required fields
    if (!name) {
        return NextResponse.json(
            {
                success: false,
                error: 'Name is required',
                code: 'VALIDATION_ERROR',
            },
            { status: 400 }
        );
    }

    // Check role-based permissions
    if (role === 'viewer') {
        return NextResponse.json(
            {
                success: false,
                error: 'Viewers cannot create items',
                code: 'PERMISSION_DENIED',
            },
            { status: 403 }
        );
    }

    // Check plan tier for feature access
    if (planTier === 'free' && description) {
        return NextResponse.json(
            {
                success: false,
                error: 'Descriptions require a paid plan',
                code: 'PLAN_UPGRADE_REQUIRED',
                requiredPlan: 'starter',
            },
            { status: 403 }
        );
    }

    // Create the item (example)
    const newItem = {
        id: Date.now(),
        name,
        description: description || null,
        businessId,
        createdBy: session.user.id,
        createdAt: new Date().toISOString(),
    };

    // Return success response
    return NextResponse.json(
        {
            success: true,
            data: newItem,
        },
        { status: 201 }
    );
});

/**
 * PUT /api/example/[id]
 * 
 * Example endpoint that updates data for a business.
 * Requires authentication and business_id in request body.
 * 
 * Route Parameters:
 *   - id: The item ID to update
 * 
 * Request Body:
 *   {
 *     "business_id": "123",
 *     "name": "Updated Item"
 *   }
 */
export const PUT = withApiAuth(async (request, { session, businessId, role, planTier, routeParams }) => {
    // Access route parameters
    const itemId = routeParams?.params?.id;

    if (!itemId) {
        return NextResponse.json(
            {
                success: false,
                error: 'Item ID is required',
                code: 'VALIDATION_ERROR',
            },
            { status: 400 }
        );
    }

    // Parse request body
    const body = await request.json();
    const { name } = body;

    // Check permissions
    if (role === 'viewer') {
        return NextResponse.json(
            {
                success: false,
                error: 'Viewers cannot update items',
                code: 'PERMISSION_DENIED',
            },
            { status: 403 }
        );
    }

    // Update the item (example)
    const updatedItem = {
        id: itemId,
        name,
        businessId,
        updatedBy: session.user.id,
        updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
        success: true,
        data: updatedItem,
    });
});

/**
 * DELETE /api/example/[id]
 * 
 * Example endpoint that deletes data for a business.
 * Requires authentication and business_id in query parameters.
 * 
 * Route Parameters:
 *   - id: The item ID to delete
 * 
 * Query Parameters:
 *   - business_id (required): The business ID
 * 
 * Example:
 *   DELETE /api/example/123?business_id=456
 */
export const DELETE = withApiAuth(async (request, { session, businessId, role, planTier, routeParams }) => {
    // Access route parameters
    const itemId = routeParams?.params?.id;

    if (!itemId) {
        return NextResponse.json(
            {
                success: false,
                error: 'Item ID is required',
                code: 'VALIDATION_ERROR',
            },
            { status: 400 }
        );
    }

    // Check permissions (only owners and managers can delete)
    if (role !== 'owner' && role !== 'manager') {
        return NextResponse.json(
            {
                success: false,
                error: 'Only owners and managers can delete items',
                code: 'PERMISSION_DENIED',
            },
            { status: 403 }
        );
    }

    // Delete the item (example)
    // In a real implementation, you would:
    // 1. Verify the item belongs to businessId
    // 2. Perform soft delete or hard delete
    // 3. Log the action to audit_logs

    return NextResponse.json({
        success: true,
        message: `Item ${itemId} deleted successfully`,
    });
});
