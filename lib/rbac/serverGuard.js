/**
 * Server Action Guard
 * 
 * Provides a reusable wrapper for server actions that enforces:
 *   1. Authentication (user must be logged in)
 *   2. Business authorization (user must belong to the business)
 *   3. Role-based permission check
 *   4. Subscription feature flag check
 *   5. Subscription limit check (optional)
 * 
 * Usage in server actions:
 * 
 *   import { withGuard } from '@/lib/rbac/serverGuard';
 *   
 *   export async function createExpense(businessId, data) {
 *     const { session, role, planTier } = await withGuard(businessId, {
 *       permission: 'finance.manage_expenses',
 *       feature: 'expense_tracking',
 *     });
 *     // ... proceed with logic
 *   }
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import pool from '@/lib/db';
import { hasPermission } from '@/lib/rbac/permissions';
import { planWithinLimit, FEATURE_MIN_PLAN, PLAN_TIERS, resolvePlanTier } from '@/lib/config/plans';
import { planHasFeatureWithPackaging } from '@/lib/subscription/effectivePlanAccess';
import { isPlatformLevel, isPlatformOwner } from '@/lib/config/platform';

/**
 * Centralized async guard for server actions.
 * Replaces the per-file `checkAuth` pattern with a single, consistent entry point.
 * 
 * Steps:
 *   1. Authenticate session via better-auth
 *   2. Verify business membership + retrieve user role
 *   3. Check role-based permission (if provided)
 *   4. Check subscription feature (if provided)
 *   5. Check subscription limit (if provided)
 * 
 * @param {string} businessId - The business ID to authorize against
 * @param {object} [options]
 * @param {string} [options.permission] - Permission key (e.g. 'inventory.create')
 * @param {string} [options.feature] - Plan feature key (e.g. 'pos', 'manufacturing')
 * @param {string} [options.limitKey] - Usage limit key (e.g. 'max_products')
 * @param {number} [options.currentCount] - Current usage count for limit check
 * @param {import('pg').PoolClient} [options.client] - Optional existing DB client (reuse in transactions)
 * @returns {Promise<{ session: object, role: string, planTier: string }>}
 * @throws {Error} With descriptive message and `code` property on failure
 */
export async function withGuard(businessId, options = {}) {
    const { permission, feature, limitKey, currentCount, client: txClient } = options;

    // 1. Authenticate
    let session = null;
    try {
        session = await auth.api.getSession({ headers: await headers() });
    } catch (error) {
        const err = new Error('Unauthorized: Session lookup failed. Please sign in again.');
        err.code = 'UNAUTHENTICATED';
        err.cause = error;
        throw err;
    }
    if (!session) {
        const err = new Error('Unauthorized: Please log in.');
        err.code = 'UNAUTHENTICATED';
        throw err;
    }

    if (!businessId) {
        const err = new Error('Business ID is required.');
        err.code = 'MISSING_BUSINESS_ID';
        throw err;
    }

    // Platform admin/owner bypass -- user.role === 'admin' OR owner email
    const platformAdmin = isPlatformLevel(session.user);

    // 2. Business membership + role lookup
    const client = txClient || await pool.connect();
    const shouldRelease = !txClient;
    let role = platformAdmin ? 'owner' : 'viewer';
    let planTier = 'free';
    let tenantSettings = {};
    let limitOverrides = {
        max_users: -1,
        max_products: -1,
        max_warehouses: -1,
    };

    try {
        if (!platformAdmin) {
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
                    await client.query(
                        `INSERT INTO business_users (business_id, user_id, role, status)
                         VALUES ($1, $2, 'owner', 'active')
                         ON CONFLICT (business_id, user_id)
                         DO UPDATE SET role = 'owner', status = 'active'`,
                        [businessId, session.user.id]
                    );
                    role = 'owner';
                } else {
                    const err = new Error('Unauthorized: No access to this business.');
                    err.code = 'BUSINESS_ACCESS_DENIED';
                    throw err;
                }
            } else {
                role = memberRes.rows[0].role;
            }
        }

        // Get plan tier (platform owners always get enterprise)
        if (platformAdmin) {
            planTier = 'enterprise';
        } else {
            const planRes = await client.query(
                `SELECT plan_tier, plan_expires_at, plan_seats, max_products, max_warehouses, settings FROM businesses WHERE id = $1`,
                [businessId]
            );
            if (planRes.rows.length > 0) {
                const { plan_tier, plan_expires_at, plan_seats, max_products, max_warehouses, settings } = planRes.rows[0];
                // Auto-downgrade expired plans to free
                if (plan_expires_at && new Date(plan_expires_at) < new Date()) {
                    planTier = 'free';
                } else {
                    planTier = resolvePlanTier(plan_tier || 'free');
                }

                // Merge per-tenant limit overrides from settings JSON (supports all plan limit keys)
                const settingsObj = (settings && typeof settings === 'object') ? settings : {};
                tenantSettings = settingsObj;
                const settingsOverrides = (settingsObj.limit_overrides && typeof settingsObj.limit_overrides === 'object')
                    ? settingsObj.limit_overrides : {};
                const parsedSettingsOverrides = Object.fromEntries(
                    Object.entries(settingsOverrides)
                        .map(([k, v]) => [k, Number(v)])
                        .filter(([, v]) => Number.isFinite(v) && v >= -1)
                );

                // DB columns take precedence over settings overrides
                limitOverrides = {
                    ...parsedSettingsOverrides,
                    max_users: Number(plan_seats ?? -1),
                    max_products: Number(max_products ?? -1),
                    max_warehouses: Number(max_warehouses ?? -1),
                };
            }
        }
    } finally {
        if (shouldRelease) client.release();
    }

    // 3. Permission check (platform admins bypass)
    if (permission && !platformAdmin) {
        if (!hasPermission(role, permission)) {
            const err = new Error(
                `Access denied: your role "${role}" does not have permission "${permission}".`
            );
            err.code = 'PERMISSION_DENIED';
            throw err;
        }
    }

    // 4. Feature flag check (platform admins bypass)
    if (feature && !platformAdmin) {
        if (!planHasFeatureWithPackaging(planTier, feature, tenantSettings)) {
            const requiredPlan = FEATURE_MIN_PLAN?.[feature] || 'starter';
            const requiredPlanName = PLAN_TIERS[requiredPlan]?.name || requiredPlan;
            const err = new Error(
                `This feature requires the ${requiredPlanName} plan or higher. Current plan: ${PLAN_TIERS[planTier]?.name || planTier}.`
            );
            err.code = 'PLAN_UPGRADE_REQUIRED';
            err.requiredPlan = requiredPlan;
            throw err;
        }
    }

    // 5. Limit check (platform admins bypass)
    if (limitKey && typeof currentCount === 'number' && !platformAdmin) {
        const overrideLimit = Number(limitOverrides?.[limitKey]);
        const hasOverride = Number.isFinite(overrideLimit) && overrideLimit >= -1;
        const limit = hasOverride ? overrideLimit : PLAN_TIERS[planTier]?.limits?.[limitKey];
        const withinLimit = limit === -1 ? true : currentCount < limit;

        if (!withinLimit) {
            const err = new Error(
                `You've reached the limit of ${limit} ${limitKey.replace('max_', '').replace(/_/g, ' ')} on your current plan.`
            );
            err.code = 'LIMIT_REACHED';
            err.limit = limit;
            throw err;
        }
    }

    return { session, role, planTier };
}

/**
 * Validate permission + subscription for a server action.
 * This is a lightweight, synchronous check function.
 * 
 * @param {object} options
 * @param {string} options.role - User's role in the business
 * @param {string} options.planTier - Business plan tier
 * @param {string} [options.permission] - Required permission key
 * @param {string} [options.feature] - Required feature flag key
 * @param {string} [options.limitKey] - Resource limit key (e.g., 'max_products')
 * @param {number} [options.currentCount] - Current resource count for limit check
 * @param {unknown} [options.businessSettings] - Optional `businesses.settings` for packaging (defaults to tier-only if omitted)
 * @returns {{ success: boolean, error?: string, errorCode?: string }}
 */
export function validateAccess({
    role,
    planTier,
    permission,
    feature,
    limitKey,
    currentCount,
    businessSettings,
}) {
    // 1. Permission check
    if (permission) {
        if (!hasPermission(role || 'viewer', permission)) {
            return {
                success: false,
                error: `Access denied: your role "${role}" does not have permission "${permission}". Contact your administrator.`,
                errorCode: 'PERMISSION_DENIED',
            };
        }
    }

    // 2. Feature flag check (subscription tier)
    if (feature) {
        const tier = planTier || 'free';
        if (!planHasFeatureWithPackaging(tier, feature, businessSettings)) {
            const requiredPlan = FEATURE_MIN_PLAN[feature] || 'starter';
            const requiredPlanName = PLAN_TIERS[requiredPlan]?.name || requiredPlan;
            return {
                success: false,
                error: `This feature requires the ${requiredPlanName} plan or higher. Your current plan: ${PLAN_TIERS[tier]?.name || tier}.`,
                errorCode: 'PLAN_UPGRADE_REQUIRED',
                requiredPlan,
            };
        }
    }

    // 3. Limit check (optional)
    if (limitKey && typeof currentCount === 'number') {
        const tier = planTier || 'free';
        if (!planWithinLimit(tier, limitKey, currentCount)) {
            const limit = PLAN_TIERS[tier]?.limits?.[limitKey];
            return {
                success: false,
                error: `You've reached the limit of ${limit} ${limitKey.replace('max_', '').replace(/_/g, ' ')} on your current plan. Please upgrade to add more.`,
                errorCode: 'LIMIT_REACHED',
                limit,
            };
        }
    }

    return { success: true };
}

/**
 * Throw-on-failure variant for use in server actions where you want
 * to short-circuit with an error immediately.
 * 
 * @param {object} options - Same as validateAccess
 * @throws {Error} If access is denied
 */
export function enforceAccess(options) {
    const result = validateAccess(options);
    if (!result.success) {
        const error = new Error(result.error);
        error.code = result.errorCode;
        if (result.requiredPlan) error.requiredPlan = result.requiredPlan;
        if (result.limit) error.limit = result.limit;
        throw error;
    }
}

/**
 * Utility to wrap a server action result with access validation.
 * Returns { success: false, error: string } if access denied,
 * otherwise calls the action function.
 * 
 * @param {object} accessOptions - Options for validateAccess
 * @param {Function} actionFn - Async function to execute if access is granted
 * @returns {Promise<{ success: boolean, error?: string, [key: string]: any }>}
 */
export async function guardedAction(accessOptions, actionFn) {
    const accessResult = validateAccess(accessOptions);
    if (!accessResult.success) {
        return accessResult;
    }

    try {
        return await actionFn();
    } catch (error) {
        console.error('[guardedAction] Action failed:', error);
        return {
            success: false,
            error: error.message || 'An unexpected error occurred.',
        };
    }
}
