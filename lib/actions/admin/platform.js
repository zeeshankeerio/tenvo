'use server';

/**
 * Platform Admin Server Actions
 * 
 * These actions are restricted to the platform owner and BetterAuth admins.
 * They provide full visibility and control over:
 *   - All businesses (plans, status, users)
 *   - All platform users (roles, access)
 *   - Subscription management
 *   - Trial management
 */

import pool, { prismaBase } from '@/lib/db';
import { isPlatformLevel, isPlatformOwner } from '@/lib/config/platform';
import { PLAN_TIERS, resolvePlanTier } from '@/lib/config/plans';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';
import { getServerSession } from '@/lib/auth/rbac';

// --- Guard: Ensure caller is platform-level ----------------------------------

export async function requirePlatformAccess() {
    const session = await getServerSession();
    if (!session?.user) {
        throw new Error('Unauthorized: Please log in.');
    }
    if (!isPlatformLevel(session.user)) {
        throw new Error('Forbidden: Platform administrator access required.');
    }
    return session;
}

// --- Business Management -----------------------------------------------------

/**
 * List all businesses on the platform with owner info and plan details.
 * @param {{ page?: number, limit?: number, search?: string }} options
 */
export async function listAllBusinesses({ page = 1, limit = 50, search = '' } = {}) {
    await requirePlatformAccess();
    const offset = (page - 1) * limit;
    const client = await pool.connect();

    try {
        let whereClause = '';
        const params = [limit, offset];

        if (search) {
            whereClause = `WHERE b.business_name ILIKE $3 OR b.email ILIKE $3 OR b.domain ILIKE $3`;
            params.push(`%${search}%`);
        }

        const countRes = await client.query(
            `SELECT COUNT(*) FROM businesses b ${whereClause}`,
            search ? [params[2]] : []
        );

        const res = await client.query(`
            SELECT 
                b.id, b.business_name, b.email, b.domain, b.category, b.country,
                b.plan_tier, b.plan_expires_at, b.plan_seats, b.created_at,
                u.name as owner_name, u.email as owner_email,
                (SELECT COUNT(*) FROM business_users bu WHERE bu.business_id = b.id AND bu.status = 'active') as active_users,
                (SELECT COUNT(*) FROM products p WHERE p.business_id = b.id) as product_count
            FROM businesses b
            LEFT JOIN "user" u ON b.user_id = u.id
            ${whereClause}
            ORDER BY b.created_at DESC
            LIMIT $1 OFFSET $2
        `, params);

        return actionSuccess({
            businesses: res.rows,
            total: parseInt(countRes.rows[0].count),
            page,
            limit,
        });
    } catch (error) {
        console.error('[Admin] listAllBusinesses error:', error);
        return await actionFailure('LIST_BUSINESSES_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

/**
 * Get detailed info for a single business, including all team members.
 * @param {string} businessId
 */
export async function getBusinessDetails(businessId) {
    await requirePlatformAccess();

    if (!businessId) return await actionFailure('MISSING_ID', 'Business ID is required.');

    const client = await pool.connect();
    try {
        const bizRes = await client.query(`
            SELECT b.*, u.name as owner_name, u.email as owner_email
            FROM businesses b
            LEFT JOIN "user" u ON b.user_id = u.id
            WHERE b.id = $1
        `, [businessId]);

        if (bizRes.rows.length === 0) {
            return await actionFailure('NOT_FOUND', 'Business not found.');
        }

        const membersRes = await client.query(`
            SELECT bu.role, bu.status, bu.created_at as joined_at,
                   u.id as user_id, u.name, u.email
            FROM business_users bu
            JOIN "user" u ON bu.user_id = u.id
            WHERE bu.business_id = $1
            ORDER BY bu.created_at ASC
        `, [businessId]);

        return await actionSuccess({
            business: bizRes.rows[0],
            members: membersRes.rows,
        });
    } catch (error) {
        console.error('[Admin] getBusinessDetails error:', error);
        return await actionFailure('GET_DETAILS_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

/**
 * Update a business's plan tier (upgrade/downgrade).
 * @param {string} businessId
 * @param {string} newPlanTier
 * @param {string|null} expiresAt - ISO date string or null for no expiry
 */
export async function updateBusinessPlan(businessId, newPlanTier, expiresAt = null) {
    await requirePlatformAccess();

    const resolved = resolvePlanTier(newPlanTier);
    if (!PLAN_TIERS[resolved]) {
        return await actionFailure('INVALID_PLAN', `Plan "${newPlanTier}" does not exist.`);
    }

    const plan = PLAN_TIERS[resolved];
    const client = await pool.connect();

    try {
        const prevRes = await client.query(`SELECT plan_tier FROM businesses WHERE id = $1`, [businessId]);
        const previousTier = prevRes.rows[0]?.plan_tier ?? null;

        await client.query(`
            UPDATE businesses
            SET plan_tier = $1,
                plan_seats = $2,
                max_products = $3,
                max_warehouses = $4,
                plan_expires_at = $5,
                updated_at = NOW()
            WHERE id = $6
        `, [
            resolved,
            plan.limits.max_users,
            plan.limits.max_products,
            plan.limits.max_warehouses,
            expiresAt,
            businessId,
        ]);

        try {
            await prismaBase.subscription_history.create({
                data: {
                    business_id: businessId,
                    plan_tier: resolved,
                    status: 'platform_admin_plan_change',
                    metadata: {
                        source: 'updateBusinessPlan',
                        previous_plan_tier: previousTier,
                        plan_expires_at: expiresAt,
                    },
                },
            });
        } catch (histErr) {
            console.warn('[Admin] subscription_history append failed:', histErr);
        }

        return await actionSuccess({ businessId, planTier: resolved });
    } catch (error) {
        console.error('[Admin] updateBusinessPlan error:', error);
        return await actionFailure('UPDATE_PLAN_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

// --- User Management ---------------------------------------------------------

/**
 * List all platform users with their business membership info.
 * @param {{ page?: number, limit?: number, search?: string }} options
 */
export async function listAllUsers({ page = 1, limit = 50, search = '' } = {}) {
    await requirePlatformAccess();
    const offset = (page - 1) * limit;
    const client = await pool.connect();

    try {
        let whereClause = '';
        const params = [limit, offset];

        if (search) {
            whereClause = `WHERE u.name ILIKE $3 OR u.email ILIKE $3`;
            params.push(`%${search}%`);
        }

        const countRes = await client.query(
            `SELECT COUNT(*) FROM "user" u ${whereClause}`,
            search ? [params[2]] : []
        );

        const res = await client.query(`
            SELECT 
                u.id, u.name, u.email, u.role as platform_role, u."createdAt",
                (
                    SELECT json_agg(json_build_object(
                        'business_id', bu.business_id,
                        'business_name', b.business_name,
                        'domain', b.domain,
                        'role', bu.role,
                        'status', bu.status
                    ))
                    FROM business_users bu
                    JOIN businesses b ON bu.business_id = b.id
                    WHERE bu.user_id = u.id
                ) as businesses
            FROM "user" u
            ${whereClause}
            ORDER BY u."createdAt" DESC
            LIMIT $1 OFFSET $2
        `, params);

        return actionSuccess({
            users: res.rows,
            total: parseInt(countRes.rows[0].count),
            page,
            limit,
        });
    } catch (error) {
        console.error('[Admin] listAllUsers error:', error);
        return await actionFailure('LIST_USERS_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

/**
 * Change a user's role within a specific business.
 * @param {string} userId
 * @param {string} businessId
 * @param {string} newRole
 */
export async function changeUserRole(userId, businessId, newRole) {
    await requirePlatformAccess();

    const validRoles = ['owner', 'admin', 'manager', 'warehouse_manager', 'accountant', 'cashier', 'salesperson', 'chef', 'waiter', 'viewer'];
    if (!validRoles.includes(newRole)) {
        return actionFailure('INVALID_ROLE', `Role "${newRole}" is not valid.`);
    }

    const client = await pool.connect();
    try {
        const res = await client.query(`
            UPDATE business_users
            SET role = $1, updated_at = NOW()
            WHERE user_id = $2 AND business_id = $3
            RETURNING *
        `, [newRole, userId, businessId]);

        if (res.rows.length === 0) {
            return await actionFailure('NOT_FOUND', 'User is not a member of this business.');
        }

        return await actionSuccess({ userId, businessId, newRole });
    } catch (error) {
        console.error('[Admin] changeUserRole error:', error);
        return await actionFailure('CHANGE_ROLE_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

/**
 * Deactivate a user from a business (soft delete).
 * @param {string} userId
 * @param {string} businessId
 */
export async function deactivateBusinessUser(userId, businessId) {
    await requirePlatformAccess();

    const client = await pool.connect();
    try {
        await client.query(`
            UPDATE business_users
            SET status = 'inactive', updated_at = NOW()
            WHERE user_id = $1 AND business_id = $2
        `, [userId, businessId]);

        return await actionSuccess({ userId, businessId, status: 'inactive' });
    } catch (error) {
        console.error('[Admin] deactivateBusinessUser error:', error);
        return await actionFailure('DEACTIVATE_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

// --- Subscription & Trial Management -----------------------------------------

/**
 * Get subscription stats across the platform.
 */
export async function getSubscriptionStats() {
    await requirePlatformAccess();
    const client = await pool.connect();

    try {
        const statsRes = await client.query(`
            SELECT 
                plan_tier,
                COUNT(*) as count,
                COUNT(CASE WHEN plan_expires_at IS NOT NULL AND plan_expires_at > NOW() THEN 1 END) as active_trials,
                COUNT(CASE WHEN plan_expires_at IS NOT NULL AND plan_expires_at <= NOW() THEN 1 END) as expired_trials
            FROM businesses
            GROUP BY plan_tier
            ORDER BY count DESC
        `);

        const totalRes = await client.query(`
            SELECT 
                COUNT(*) as total_businesses,
                (
                    SELECT COUNT(DISTINCT owner_user_id)
                    FROM (
                        SELECT b.user_id AS owner_user_id
                        FROM businesses b
                        WHERE b.user_id IS NOT NULL
                        UNION
                        SELECT bu.user_id AS owner_user_id
                        FROM business_users bu
                        WHERE bu.role = 'owner'
                    ) owners
                ) as total_owners,
                (SELECT COUNT(*) FROM "user") as total_users,
                (SELECT COUNT(*) FROM business_users WHERE status = 'active') as total_active_members
            FROM businesses
        `);

        return await actionSuccess({
            planDistribution: statsRes.rows,
            totals: totalRes.rows[0],
        });
    } catch (error) {
        console.error('[Admin] getSubscriptionStats error:', error);
        return await actionFailure('STATS_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

/**
 * Extend or reset a business's trial period.
 * @param {string} businessId
 * @param {number} additionalDays
 */
export async function extendTrial(businessId, additionalDays = 7) {
    await requirePlatformAccess();

    const client = await pool.connect();
    try {
        // Get current expiry
        const bizRes = await client.query(
            `SELECT plan_expires_at FROM businesses WHERE id = $1`,
            [businessId]
        );
        if (bizRes.rows.length === 0) {
            return await actionFailure('NOT_FOUND', 'Business not found.');
        }

        const currentExpiry = bizRes.rows[0].plan_expires_at;
        const baseDate = currentExpiry && new Date(currentExpiry) > new Date()
            ? new Date(currentExpiry)
            : new Date();

        baseDate.setDate(baseDate.getDate() + additionalDays);

        await client.query(`
            UPDATE businesses
            SET plan_expires_at = $1, updated_at = NOW()
            WHERE id = $2
        `, [baseDate, businessId]);

        return await actionSuccess({
            businessId,
            newExpiresAt: baseDate.toISOString(),
            additionalDays,
        });
    } catch (error) {
        console.error('[Admin] extendTrial error:', error);
        return await actionFailure('EXTEND_TRIAL_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

/**
 * Record an offline / manual SaaS payment (Easypaisa, JazzCash, bank transfer, etc.),
 * extend paid access, sync plan limits, and append `subscription_history` for audit.
 * Does not create or mutate Stripe objects — use when PSP is outside Stripe or before PSP integration.
 *
 * @param {object} params
 * @param {string} params.businessId
 * @param {string|null} [params.planTier] - Tier to apply; omit to keep current tier (still extends dates & limits from resolved tier).
 * @param {number} [params.extendDays] - Days of access from max(now, current plan_expires_at). Default 30, max ~3 years.
 * @param {number|null} [params.amountMinor] - Amount in minor units (e.g. paisa) if known.
 * @param {string} [params.currency]
 * @param {string} [params.paymentReference] - Bank / wallet transaction id.
 * @param {string} [params.notes]
 */
export async function recordManualSubscriptionPayment({
    businessId,
    planTier = null,
    extendDays = 30,
    amountMinor = null,
    currency = 'PKR',
    paymentReference = '',
    notes = '',
} = {}) {
    const session = await requirePlatformAccess();

    if (!businessId) {
        return await actionFailure('MISSING_ID', 'Business ID is required.');
    }

    const daysRaw = Number(extendDays);
    const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(366 * 3, Math.floor(daysRaw))) : 30;

    try {
        const biz = await prismaBase.businesses.findUnique({ where: { id: businessId } });
        if (!biz) {
            return await actionFailure('NOT_FOUND', 'Business not found.');
        }

        const resolved =
            planTier != null && String(planTier).trim() !== ''
                ? resolvePlanTier(planTier)
                : resolvePlanTier(biz.plan_tier || 'free');

        if (!PLAN_TIERS[resolved]) {
            return await actionFailure('INVALID_PLAN', `Plan "${planTier}" does not exist.`);
        }

        const plan = PLAN_TIERS[resolved];
        if (resolved === 'free') {
            return await actionFailure(
                'INVALID_PLAN',
                'Use plan change to free separately; manual payment record expects a paid tier.'
            );
        }

        const now = new Date();
        let from = now;
        if (biz.plan_expires_at && new Date(biz.plan_expires_at) > from) {
            from = new Date(biz.plan_expires_at);
        }
        const newExpires = new Date(from);
        newExpires.setDate(newExpires.getDate() + days);

        const minor =
            amountMinor != null && amountMinor !== ''
                ? Math.round(Number(amountMinor))
                : null;

        await prismaBase.$transaction(async (tx) => {
            await tx.businesses.update({
                where: { id: businessId },
                data: {
                    plan_tier: resolved,
                    plan_seats: plan.limits.max_users,
                    max_products: plan.limits.max_products,
                    max_warehouses: plan.limits.max_warehouses,
                    plan_expires_at: newExpires,
                    stripe_subscription_status: 'manual_payment_active',
                    updated_at: new Date(),
                },
            });

            await tx.subscription_history.create({
                data: {
                    business_id: businessId,
                    plan_tier: resolved,
                    status: 'manual_payment_received',
                    stripe_subscription_id: biz.stripe_subscription_id,
                    amount_minor: minor != null && Number.isFinite(minor) ? minor : null,
                    currency: (currency && String(currency).slice(0, 10)) || 'PKR',
                    metadata: {
                        source: 'platform_manual_payment',
                        extend_days: days,
                        payment_reference: String(paymentReference || '').slice(0, 500),
                        notes: String(notes || '').slice(0, 2000),
                        recorded_by_user_id: session?.user?.id ?? null,
                        recorded_by_email: session?.user?.email ?? null,
                    },
                },
            });
        });

        return await actionSuccess({
            businessId,
            planTier: resolved,
            planExpiresAt: newExpires.toISOString(),
            extendDays: days,
        });
    } catch (error) {
        console.error('[Admin] recordManualSubscriptionPayment error:', error);
        return await actionFailure('MANUAL_PAYMENT_RECORD_FAILED', await getErrorMessage(error));
    }
}

/**
 * Configure per-tenant modular packaging (`businesses.settings.packaging`).
 * - `mode: 'tier'` — use `plan_tier` only (default product behavior).
 * - `mode: 'custom'` + `feature_overrides` — per-feature booleans override tier flags for keys listed.
 *
 * @param {string} businessId
 * @param {{ mode?: 'tier'|'custom', featureOverrides?: Record<string, boolean> }} params
 */
export async function updateBusinessPackaging(businessId, { mode = 'tier', featureOverrides = undefined } = {}) {
    await requirePlatformAccess();

    if (!businessId) {
        return await actionFailure('MISSING_ID', 'Business ID is required.');
    }

    const normalizedMode = mode === 'custom' ? 'custom' : 'tier';

    try {
        const biz = await prismaBase.businesses.findUnique({
            where: { id: businessId },
            select: { settings: true },
        });
        if (!biz) {
            return await actionFailure('NOT_FOUND', 'Business not found.');
        }

        const prev =
            biz.settings && typeof biz.settings === 'object' && !Array.isArray(biz.settings)
                ? { ...biz.settings }
                : {};

        const packaging =
            normalizedMode === 'custom' &&
            featureOverrides &&
            typeof featureOverrides === 'object' &&
            !Array.isArray(featureOverrides)
                ? { mode: 'custom', feature_overrides: featureOverrides }
                : { mode: 'tier' };

        const nextSettings = { ...prev, packaging };

        await prismaBase.businesses.update({
            where: { id: businessId },
            data: { settings: nextSettings, updated_at: new Date() },
        });

        return await actionSuccess({ businessId, packaging });
    } catch (error) {
        console.error('[Admin] updateBusinessPackaging error:', error);
        return await actionFailure('PACKAGING_UPDATE_FAILED', await getErrorMessage(error));
    }
}

/**
 * Set a user's BetterAuth platform role (e.g., promote to 'admin').
 * Only the platform owner can do this.
 * @param {string} userId
 * @param {string} platformRole - 'user' or 'admin'
 */
export async function setPlatformRole(userId, platformRole) {
    const session = await getServerSession();
    if (!session?.user) throw new Error('Unauthorized');
    
    // Only the platform owner can promote/demote platform admins
    if (!isPlatformOwner(session.user)) {
        return await actionFailure('FORBIDDEN', 'Only the platform owner can manage platform-level roles.');
    }

    if (!['user', 'admin'].includes(platformRole)) {
        return await actionFailure('INVALID_ROLE', 'Platform role must be "user" or "admin".');
    }

    const client = await pool.connect();
    try {
        await client.query(`
            UPDATE "user" SET role = $1, "updatedAt" = NOW() WHERE id = $2
        `, [platformRole, userId]);

        return await actionSuccess({ userId, platformRole });
    } catch (error) {
        console.error('[Admin] setPlatformRole error:', error);
        return await actionFailure('SET_ROLE_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}
