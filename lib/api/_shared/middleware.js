import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import pool from '@/lib/db';
import { isPlatformLevel } from '@/lib/config/platform';
import { resolvePlanTier } from '@/lib/config/plans';

/**
 * API Route Authentication Middleware
 * 
 * Provides a reusable wrapper for Next.js API routes that enforces:
 *   1. Authentication (user must be logged in)
 *   2. Business authorization (user must belong to the business)
 *   3. Extracts business context (role, planTier)
 * 
 * Usage in API routes:
 * 
 *   import { withApiAuth } from '@/lib/api/_shared/middleware';
 *   
 *   export const GET = withApiAuth(async (request, { session, businessId, role, planTier }) => {
 *     // Handler has authenticated session and validated businessId
 *     const data = await fetchData(businessId);
 *     return NextResponse.json({ data });
 *   });
 * 
 * Business ID Extraction:
 *   - GET requests: from query parameter `business_id`
 *   - POST/PUT/DELETE/PATCH: from request body `business_id` or `businessId`
 * 
 * Error Responses:
 *   - 401: Not authenticated (no session)
 *   - 400: Missing business_id parameter
 *   - 403: User does not have access to the specified business
 *   - 500: Internal server error during authentication
 */

/**
 * Wraps an API route handler with authentication and business authorization.
 * 
 * @param {Function} handler - Async function (request, context) => NextResponse
 *   - request: NextRequest object
 *   - context: { session, businessId, role, planTier }
 * @returns {Function} Wrapped API route handler
 */
export function withApiAuth(handler) {
    return async (request, routeParams) => {
        try {
            // 1. Authenticate session
            let session = null;
            try {
                session = await auth.api.getSession({ headers: await headers() });
            } catch (error) {
                console.error('[withApiAuth] Session lookup failed:', error);
                return NextResponse.json(
                    { 
                        success: false,
                        error: 'Unauthorized: Session lookup failed. Please sign in again.',
                        code: 'UNAUTHENTICATED'
                    },
                    { status: 401 }
                );
            }

            if (!session) {
                return NextResponse.json(
                    { 
                        success: false,
                        error: 'Unauthorized: Please log in.',
                        code: 'UNAUTHENTICATED'
                    },
                    { status: 401 }
                );
            }

            // 2. Extract business_id from request
            let businessId = null;
            const method = request.method;

            if (method === 'GET' || method === 'HEAD') {
                // Extract from query parameters
                const { searchParams } = new URL(request.url);
                businessId = searchParams.get('business_id') || searchParams.get('businessId');
            } else {
                // Extract from request body (POST, PUT, DELETE, PATCH)
                try {
                    const body = await request.json();
                    businessId = body.business_id || body.businessId;
                } catch (error) {
                    // Body might not be JSON or might be empty
                    // Try query params as fallback
                    const { searchParams } = new URL(request.url);
                    businessId = searchParams.get('business_id') || searchParams.get('businessId');
                }
            }

            if (!businessId) {
                return NextResponse.json(
                    { 
                        success: false,
                        error: 'Business ID is required.',
                        code: 'MISSING_BUSINESS_ID'
                    },
                    { status: 400 }
                );
            }

            // 3. Validate business access and retrieve role/plan
            const platformAdmin = isPlatformLevel(session.user);
            let role = platformAdmin ? 'owner' : 'viewer';
            let planTier = 'free';

            const client = await pool.connect();
            try {
                if (!platformAdmin) {
                    // Check business membership
                    const memberRes = await client.query(
                        `SELECT role, status FROM business_users WHERE user_id = $1 AND business_id = $2`,
                        [session.user.id, businessId]
                    );

                    if (memberRes.rows.length === 0 || memberRes.rows[0].status !== 'active') {
                        // Failsafe: owner might not have business_users row
                        const ownerCheck = await client.query(
                            `SELECT id FROM businesses WHERE id = $1 AND user_id = $2`,
                            [businessId, session.user.id]
                        );

                        if (ownerCheck.rows.length > 0) {
                            // Auto-create business_users entry for owner
                            await client.query(
                                `INSERT INTO business_users (business_id, user_id, role, status)
                                 VALUES ($1, $2, 'owner', 'active')
                                 ON CONFLICT (business_id, user_id)
                                 DO UPDATE SET role = 'owner', status = 'active'`,
                                [businessId, session.user.id]
                            );
                            role = 'owner';
                        } else {
                            return NextResponse.json(
                                { 
                                    success: false,
                                    error: 'Unauthorized: No access to this business.',
                                    code: 'BUSINESS_ACCESS_DENIED'
                                },
                                { status: 403 }
                            );
                        }
                    } else {
                        role = memberRes.rows[0].role;
                    }
                }

                // Get plan tier (platform admins always get enterprise)
                if (platformAdmin) {
                    planTier = 'enterprise';
                } else {
                    const planRes = await client.query(
                        `SELECT plan_tier, plan_expires_at FROM businesses WHERE id = $1`,
                        [businessId]
                    );

                    if (planRes.rows.length > 0) {
                        const { plan_tier, plan_expires_at } = planRes.rows[0];
                        // Auto-downgrade expired plans to free
                        if (plan_expires_at && new Date(plan_expires_at) < new Date()) {
                            planTier = 'free';
                        } else {
                            planTier = resolvePlanTier(plan_tier || 'free');
                        }
                    }
                }
            } finally {
                client.release();
            }

            // 4. Call the wrapped handler with authenticated context
            return await handler(request, {
                session,
                businessId,
                role,
                planTier,
                routeParams, // Pass through route params (e.g., [id])
            });

        } catch (error) {
            console.error('[withApiAuth] Unexpected error:', error);
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Internal server error during authentication.',
                    code: 'INTERNAL_ERROR'
                },
                { status: 500 }
            );
        }
    };
}
