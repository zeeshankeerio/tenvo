import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import pool from '@/lib/db';
import { isPlatformLevel } from '@/lib/config/platform';
import { resolvePlanTier } from '@/lib/config/plans';
import { loadPlatformFeatureOverridesForBusiness } from '@/lib/subscription/platformFeatureOverrides';

/**
 * API Route Authentication Middleware
 *
 * Provides a reusable wrapper for Next.js API routes that enforces:
 *   1. Authentication (user must be logged in)
 *   2. Business authorization (user must belong to the business)
 *   3. Extracts business context (role, planTier, tenantSettings, platformFeatureOverrides)
 *
 * Context passed to handler:
 *   { session, businessId, role, planTier, tenantSettings, platformFeatureOverrides,
 *     isPlatformAdmin, parsedBody, routeParams }
 *
 * Usage:
 *   export const GET = withApiAuth(async (request, { session, businessId, role, planTier }) => {
 *     return NextResponse.json({ data });
 *   });
 *
 * Business ID Extraction:
 *   - GET / HEAD: query parameter `business_id` or `businessId`
 *   - POST / PUT / DELETE / PATCH: request body or query fallback
 *
 * Error Responses:
 *   - 401: Not authenticated
 *   - 400: Missing business_id
 *   - 403: No access to business
 *   - 500: Internal error
 */
export function withApiAuth(handler) {
    return async (request, routeParams) => {
        try {
            // ── 1. Authenticate ──────────────────────────────────────────────
            let session = null;
            try {
                session = await auth.api.getSession({ headers: await headers() });
            } catch (error) {
                console.error('[withApiAuth] Session lookup failed:', error);
                return NextResponse.json(
                    { success: false, error: 'Session lookup failed. Please sign in again.', code: 'UNAUTHENTICATED' },
                    { status: 401 }
                );
            }

            if (!session) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized: Please log in.', code: 'UNAUTHENTICATED' },
                    { status: 401 }
                );
            }

            // ── 2. Extract business_id ───────────────────────────────────────
            // IMPORTANT: request.json() consumes the body stream — call only once.
            // Parsed body is forwarded to the handler so it never needs to re-read.
            let businessId = null;
            let parsedBody = null;
            const method = request.method;
            const { searchParams } = new URL(request.url);

            if (method === 'GET' || method === 'HEAD') {
                businessId = searchParams.get('business_id') || searchParams.get('businessId');
            } else {
                try {
                    parsedBody = await request.json();
                    businessId =
                        parsedBody?.business_id ||
                        parsedBody?.businessId ||
                        searchParams.get('business_id') ||
                        searchParams.get('businessId');
                } catch {
                    businessId =
                        searchParams.get('business_id') ||
                        searchParams.get('businessId');
                }
            }

            if (!businessId) {
                return NextResponse.json(
                    { success: false, error: 'Business ID is required.', code: 'MISSING_BUSINESS_ID' },
                    { status: 400 }
                );
            }

            // ── 3. Authorize & load business context ─────────────────────────
            const isPlatformAdmin = isPlatformLevel(session.user);
            let role = isPlatformAdmin ? 'owner' : 'viewer';
            let planTier = isPlatformAdmin ? 'enterprise' : 'free';
            let tenantSettings = {};
            let platformFeatureOverrides = {};

            const client = await pool.connect();
            try {
                if (!isPlatformAdmin) {
                    // Membership check
                    const memberRes = await client.query(
                        `SELECT role, status FROM business_users WHERE user_id = $1 AND business_id = $2`,
                        [session.user.id, businessId]
                    );

                    if (memberRes.rows.length === 0 || memberRes.rows[0].status !== 'active') {
                        // Failsafe: direct business owner may not have a business_users row yet
                        const ownerCheck = await client.query(
                            `SELECT id FROM businesses WHERE id = $1 AND user_id = $2`,
                            [businessId, session.user.id]
                        );
                        if (ownerCheck.rows.length > 0) {
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
                                { success: false, error: 'No access to this business.', code: 'BUSINESS_ACCESS_DENIED' },
                                { status: 403 }
                            );
                        }
                    } else {
                        role = memberRes.rows[0].role;
                    }

                    // Plan + settings
                    const planRes = await client.query(
                        `SELECT plan_tier, plan_expires_at, settings FROM businesses WHERE id = $1`,
                        [businessId]
                    );
                    if (planRes.rows.length > 0) {
                        const { plan_tier, plan_expires_at, settings } = planRes.rows[0];
                        // Auto-downgrade expired plans
                        const expired = plan_expires_at && new Date(plan_expires_at) < new Date();
                        planTier = expired ? 'free' : resolvePlanTier(plan_tier || 'free');
                        tenantSettings = (settings && typeof settings === 'object') ? settings : {};

                        // Load per-business + per-user platform feature overrides
                        platformFeatureOverrides = await loadPlatformFeatureOverridesForBusiness(
                            businessId, client, session.user.id
                        );
                    }
                }
            } finally {
                client.release();
            }

            // ── 4. Call handler with full context ────────────────────────────
            return await handler(request, {
                session,
                businessId,
                role,
                planTier,
                tenantSettings,
                platformFeatureOverrides,
                isPlatformAdmin,
                parsedBody,       // pre-parsed body — do NOT call request.json() again
                routeParams,
            });

        } catch (error) {
            console.error('[withApiAuth] Unexpected error:', error);
            return NextResponse.json(
                { success: false, error: 'Internal server error during authentication.', code: 'INTERNAL_ERROR' },
                { status: 500 }
            );
        }
    };
}
