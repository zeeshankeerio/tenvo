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
import { isPlatformLevel, isPlatformOwner, TRIAL_CONFIG } from '@/lib/config/platform';
import { mergePackagingIntoBusinessSettings } from '@/lib/utils/businessPackagingSettings';
import { applyManualSubscriptionPaymentTx } from '@/lib/payments/manualSubscriptionPayment';
import {
  getManualPaymentRequestState,
  resolveManualPaymentRequest,
} from '@/lib/payments/manualPaymentRequests';
import { listDomainPackages } from '@/lib/config/domainPackages';
import {
  sendManualPaymentApprovedToOwnerEmail,
  sendManualPaymentRejectedToOwnerEmail,
} from '@/lib/email/manualBillingEmails';
import {
    mergeLimitOverridesIntoBusinessSettings,
    parseAdminLimitOverridePayload,
} from '@/lib/utils/businessLimitOverrides';
import { PLAN_TIERS, resolvePlanTier } from '@/lib/config/plans';
import { getBillingActivationPayload, mergeBusinessSettingsForBilling } from '@/lib/payments/billingActivation';
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

/**
 * Non-throwing probe for UI nav gating (e.g. showing the control panel link).
 * Owner detection relies on the server-side email allowlist + BetterAuth role,
 * which are not available in the client bundle, so this must run server-side.
 * @returns {Promise<{ isPlatformOwner: boolean, isPlatformAdmin: boolean }>}
 */
export async function getPlatformAccessStatus() {
    const session = await getServerSession();
    const user = session?.user;
    if (!user) return { isPlatformOwner: false, isPlatformAdmin: false };
    return {
        isPlatformOwner: isPlatformOwner(user),
        isPlatformAdmin: isPlatformLevel(user),
    };
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
        const prevRes = await client.query(
            `SELECT plan_tier, settings FROM businesses WHERE id = $1`,
            [businessId]
        );
        if (prevRes.rows.length === 0) {
            return await actionFailure('NOT_FOUND', 'Business not found.');
        }

        const previousTier = prevRes.rows[0]?.plan_tier ?? null;
        const existingSettings = prevRes.rows[0]?.settings;
        const settingsObj =
            existingSettings && typeof existingSettings === 'object' && !Array.isArray(existingSettings)
                ? existingSettings
                : {};
        const domainPackageKey =
            typeof settingsObj.domain_package?.key === 'string'
                ? settingsObj.domain_package.key
                : null;

        const activation = getBillingActivationPayload({
            planTier: resolved,
            domainPackageKey,
        });

        const quota = activation?.quota ?? {
            plan_tier: resolved,
            plan_seats: plan.limits.max_users,
            max_products: plan.limits.max_products,
            max_warehouses: plan.limits.max_warehouses,
        };

        const nextSettings =
            activation?.settingsPatch && Object.keys(activation.settingsPatch).length
                ? mergeBusinessSettingsForBilling(settingsObj, activation.settingsPatch)
                : settingsObj;

        await client.query(`
            UPDATE businesses
            SET plan_tier = $1,
                plan_seats = $2,
                max_products = $3,
                max_warehouses = $4,
                plan_expires_at = $5,
                settings = $6::jsonb,
                updated_at = NOW()
            WHERE id = $7
        `, [
            quota.plan_tier,
            quota.plan_seats,
            quota.max_products,
            quota.max_warehouses,
            expiresAt,
            JSON.stringify(nextSettings),
            businessId,
        ]);

        try {
            await prismaBase.subscription_history.create({
                data: {
                    business_id: businessId,
                    plan_tier: quota.plan_tier,
                    status: 'platform_admin_plan_change',
                    metadata: {
                        source: 'updateBusinessPlan',
                        previous_plan_tier: previousTier,
                        plan_expires_at: expiresAt,
                        domain_package_key: domainPackageKey,
                    },
                },
            });
        } catch (histErr) {
            console.warn('[Admin] subscription_history append failed:', histErr);
        }

        return await actionSuccess({ businessId, planTier: quota.plan_tier });
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
                        'status', bu.status,
                        'plan_tier', b.plan_tier
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
 * Set a user's membership status within a business (active / inactive).
 * @param {string} userId
 * @param {string} businessId
 * @param {'active'|'inactive'} status
 */
export async function setBusinessUserStatus(userId, businessId, status) {
    await requirePlatformAccess();

    if (!['active', 'inactive'].includes(status)) {
        return actionFailure('INVALID_STATUS', 'Status must be active or inactive.');
    }

    const client = await pool.connect();
    try {
        const res = await client.query(`
            UPDATE business_users
            SET status = $1, updated_at = NOW()
            WHERE user_id = $2 AND business_id = $3
            RETURNING *
        `, [status, userId, businessId]);

        if (res.rows.length === 0) {
            return await actionFailure('NOT_FOUND', 'User is not a member of this business.');
        }

        return await actionSuccess({ userId, businessId, status });
    } catch (error) {
        console.error('[Admin] setBusinessUserStatus error:', error);
        return await actionFailure('UPDATE_STATUS_FAILED', await getErrorMessage(error));
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
    return setBusinessUserStatus(userId, businessId, 'inactive');
}

/**
 * Reactivate a user within a business.
 * @param {string} userId
 * @param {string} businessId
 */
export async function activateBusinessUser(userId, businessId) {
    return setBusinessUserStatus(userId, businessId, 'active');
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
 * Paginated subscriber list with billing/subscription metadata for platform admin.
 */
export async function listPlatformSubscribers({
    page = 1,
    limit = 25,
    search = '',
    planTier = null,
    status = 'all',
} = {}) {
    await requirePlatformAccess();
    const offset = (page - 1) * limit;
    const client = await pool.connect();

    try {
        const conditions = [];
        const params = [limit, offset];
        let paramIdx = 2;

        if (search) {
            paramIdx += 1;
            conditions.push(`(b.business_name ILIKE $${paramIdx} OR b.email ILIKE $${paramIdx} OR b.domain ILIKE $${paramIdx})`);
            params.push(`%${search}%`);
        }

        if (planTier && planTier !== 'all') {
            paramIdx += 1;
            conditions.push(`COALESCE(b.plan_tier, 'free') = $${paramIdx}`);
            params.push(resolvePlanTier(planTier));
        }

        if (status === 'trial') {
            conditions.push(`b.plan_expires_at IS NOT NULL AND b.plan_expires_at > NOW()`);
        } else if (status === 'expired') {
            conditions.push(`b.plan_expires_at IS NOT NULL AND b.plan_expires_at <= NOW()`);
        } else if (status === 'pending_payment') {
            conditions.push(`b.settings->'billing'->'pending_manual_payment'->>'status' = 'pending'`);
        } else if (status === 'paid') {
            conditions.push(`COALESCE(b.plan_tier, 'free') NOT IN ('free')`);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const countParams = params.slice(2);
        const countRes = await client.query(
            `SELECT COUNT(*) FROM businesses b ${whereClause}`,
            countParams
        );

        const res = await client.query(`
            SELECT
                b.id,
                b.business_name,
                b.email,
                b.domain,
                b.category,
                b.plan_tier,
                b.plan_expires_at,
                b.stripe_subscription_status,
                b.stripe_customer_id,
                b.stripe_subscription_id,
                b.created_at,
                b.settings,
                u.name AS owner_name,
                u.email AS owner_email,
                b.settings->'domain_package'->>'key' AS domain_package_key,
                b.settings->'domain_package'->>'name' AS domain_package_name,
                b.settings->'billing'->'pending_manual_payment'->>'status' AS pending_payment_status
            FROM businesses b
            LEFT JOIN "user" u ON b.user_id = u.id
            ${whereClause}
            ORDER BY b.created_at DESC
            LIMIT $1 OFFSET $2
        `, params);

        const subscribers = res.rows.map((row) => {
            const { pending } = getManualPaymentRequestState(row.settings);
            return {
                ...row,
                settings: undefined,
                pendingPayment: pending,
            };
        });

        return await actionSuccess({
            subscribers,
            total: parseInt(countRes.rows[0].count, 10),
            page,
            limit,
        });
    } catch (error) {
        console.error('[Admin] listPlatformSubscribers error:', error);
        return await actionFailure('LIST_SUBSCRIBERS_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

/**
 * All businesses with a pending owner-submitted manual payment request.
 */
export async function listPendingManualPaymentRequests({ limit = 50 } = {}) {
    await requirePlatformAccess();
    const client = await pool.connect();

    try {
        const res = await client.query(`
            SELECT
                b.id,
                b.business_name,
                b.domain,
                b.email,
                b.plan_tier,
                b.settings
            FROM businesses b
            WHERE b.settings->'billing'->'pending_manual_payment'->>'status' = 'pending'
            ORDER BY (b.settings->'billing'->'pending_manual_payment'->>'submitted_at') DESC NULLS LAST
            LIMIT $1
        `, [limit]);

        const requests = res.rows.map((row) => {
            const { pending } = getManualPaymentRequestState(row.settings);
            return {
                businessId: row.id,
                businessName: row.business_name,
                domain: row.domain,
                email: row.email,
                planTier: row.plan_tier,
                pending,
            };
        });

        return await actionSuccess({ requests, total: requests.length });
    } catch (error) {
        console.error('[Admin] listPendingManualPaymentRequests error:', error);
        return await actionFailure('LIST_PENDING_PAYMENTS_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

/**
 * Apply a domain commercial package to a tenant (packaging + quotas + settings patch).
 * Does not record a payment — use recordManualSubscriptionPayment for paid activations.
 */
export async function applyDomainPackageToBusiness(
    businessId,
    domainPackageKey,
    { updatePlanTier = true } = {}
) {
    await requirePlatformAccess();

    const pkgKey = String(domainPackageKey || '').trim();
    if (!businessId) {
        return await actionFailure('MISSING_ID', 'Business ID is required.');
    }
    if (!pkgKey) {
        return await actionFailure('MISSING_PACKAGE', 'Domain package key is required.');
    }

    const activation = getBillingActivationPayload({ domainPackageKey: pkgKey });
    if (!activation?.domainPackageKey) {
        return await actionFailure('INVALID_PACKAGE', `Unknown domain package "${pkgKey}".`);
    }

    try {
        const biz = await prismaBase.businesses.findUnique({
            where: { id: businessId },
            select: { settings: true, plan_tier: true },
        });
        if (!biz) {
            return await actionFailure('NOT_FOUND', 'Business not found.');
        }

        const nextSettings = mergeBusinessSettingsForBilling(biz.settings, activation.settingsPatch);

        const data = {
            settings: nextSettings,
            updated_at: new Date(),
        };

        if (updatePlanTier) {
            Object.assign(data, {
                plan_tier: activation.quota.plan_tier,
                plan_seats: activation.quota.plan_seats,
                max_products: activation.quota.max_products,
                max_warehouses: activation.quota.max_warehouses,
            });
        }

        await prismaBase.businesses.update({ where: { id: businessId }, data });

        try {
            await prismaBase.subscription_history.create({
                data: {
                    business_id: businessId,
                    plan_tier: activation.planTier,
                    status: 'platform_admin_package_applied',
                    metadata: {
                        source: 'applyDomainPackageToBusiness',
                        domain_package_key: pkgKey,
                        previous_plan_tier: biz.plan_tier,
                    },
                },
            });
        } catch (histErr) {
            console.warn('[Admin] subscription_history append failed:', histErr);
        }

        return await actionSuccess({
            businessId,
            domainPackageKey: pkgKey,
            planTier: activation.planTier,
        });
    } catch (error) {
        console.error('[Admin] applyDomainPackageToBusiness error:', error);
        return await actionFailure('APPLY_PACKAGE_FAILED', await getErrorMessage(error));
    }
}

/**
 * Extend or reset a business's trial period.
 * @param {string} businessId
 * @param {number} additionalDays
 */
export async function extendTrial(businessId, additionalDays = TRIAL_CONFIG.durationDays) {
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
 * Does not create or mutate Stripe objects, use when PSP is outside Stripe or before PSP integration.
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
    domainPackageKey = null,
    extendDays = 30,
    amountMinor = null,
    amountMajor = null,
    currency = 'PKR',
    paymentReference = '',
    paymentMethod = '',
    notes = '',
    grantAccess = false,
} = {}) {
    const session = await requirePlatformAccess();

    if (!businessId) {
        return await actionFailure('MISSING_ID', 'Business ID is required.');
    }

    try {
        const biz = await prismaBase.businesses.findUnique({
            where: { id: businessId },
            select: { settings: true, email: true, business_name: true, domain: true, approval_status: true },
        });
        if (!biz) {
            return await actionFailure('NOT_FOUND', 'Business not found.');
        }

        const { pending: existingPending } = getManualPaymentRequestState(biz.settings);

        const result = await prismaBase.$transaction(async (tx) => {
            const applied = await applyManualSubscriptionPaymentTx(tx, {
                businessId,
                planTier,
                domainPackageKey,
                extendDays,
                amountMinor,
                amountMajor,
                currency,
                paymentReference,
                paymentMethod,
                notes,
                recordedByUserId: session?.user?.id ?? null,
                recordedByEmail: session?.user?.email ?? null,
                source: 'platform_manual_payment',
            });

            // Optionally enable dashboard access (approve the registration) in the same
            // transaction, so a paid, pending business becomes usable immediately.
            if (grantAccess) {
                await tx.businesses.update({
                    where: { id: businessId },
                    data: {
                        approval_status: 'approved',
                        approval_decided_at: new Date(),
                        approval_decided_by: session?.user?.id ?? null,
                        is_active: true,
                    },
                });
                await tx.registration_requests.updateMany({
                    where: { business_id: businessId },
                    data: {
                        status: 'approved',
                        status_updated_at: new Date(),
                        decided_by: session?.user?.id ?? null,
                        decided_at: new Date(),
                        decision_notes: notes || 'Access granted with manual payment.',
                    },
                });
            }

            if (existingPending?.status === 'pending') {
                const resolvedRequest = {
                    ...existingPending,
                    status: /** @type {'rejected'} */ ('rejected'),
                    reviewedAt: new Date().toISOString(),
                    reviewedByUserId: session?.user?.id,
                    reviewNotes: 'Superseded by direct admin payment record.',
                };
                const fresh = await tx.businesses.findUnique({
                    where: { id: businessId },
                    select: { settings: true },
                });
                const nextSettings = resolveManualPaymentRequest(fresh?.settings, resolvedRequest);
                await tx.businesses.update({
                    where: { id: businessId },
                    data: { settings: nextSettings, updated_at: new Date() },
                });
            }

            return applied;
        });

        if (biz.email) {
            void sendManualPaymentApprovedToOwnerEmail({
                to: biz.email,
                businessName: biz.business_name,
                businessDomain: biz.domain,
                planTier: result.planTier,
                domainPackageKey: result.domainPackageKey,
                planExpiresAt: result.planExpiresAt,
                paymentReference: paymentReference || existingPending?.paymentReference || '—',
            });
        }

        return await actionSuccess({ ...result, grantedAccess: Boolean(grantAccess) });
    } catch (error) {
        console.error('[Admin] recordManualSubscriptionPayment error:', error);
        return await actionFailure('MANUAL_PAYMENT_RECORD_FAILED', await getErrorMessage(error));
    }
}

/**
 * Approve an owner-submitted offline payment request and activate plan/package access.
 */
export async function approveManualSubscriptionPaymentRequest({
    businessId,
    extendDays = 30,
    reviewNotes = '',
} = {}) {
    const session = await requirePlatformAccess();
    if (!businessId) {
        return await actionFailure('MISSING_ID', 'Business ID is required.');
    }

    try {
        const biz = await prismaBase.businesses.findUnique({
            where: { id: businessId },
            select: { settings: true, email: true, business_name: true, domain: true },
        });
        if (!biz) {
            return await actionFailure('NOT_FOUND', 'Business not found.');
        }

        const { pending } = getManualPaymentRequestState(biz.settings);
        if (!pending || pending.status !== 'pending') {
            return await actionFailure('NO_PENDING_REQUEST', 'No pending manual payment request for this business.');
        }

        const result = await prismaBase.$transaction(async (tx) => {
            const applied = await applyManualSubscriptionPaymentTx(tx, {
                businessId,
                planTier: pending.planTier,
                domainPackageKey: pending.domainPackageKey,
                extendDays,
                amountMajor: pending.amountMajor,
                currency: pending.currency || 'PKR',
                paymentReference: pending.paymentReference,
                paymentMethod: pending.paymentMethod || '',
                notes: [pending.notes, reviewNotes].filter(Boolean).join(' | '),
                recordedByUserId: session?.user?.id ?? null,
                recordedByEmail: session?.user?.email ?? null,
                source: 'owner_manual_payment_approved',
                requestId: pending.id,
            });

            const resolvedRequest = {
                ...pending,
                status: /** @type {'approved'} */ ('approved'),
                reviewedAt: new Date().toISOString(),
                reviewedByUserId: session?.user?.id,
                reviewNotes: String(reviewNotes || '').slice(0, 2000) || undefined,
            };

            const fresh = await tx.businesses.findUnique({
                where: { id: businessId },
                select: { settings: true },
            });
            const nextSettings = resolveManualPaymentRequest(fresh?.settings, resolvedRequest);
            await tx.businesses.update({
                where: { id: businessId },
                data: { settings: nextSettings, updated_at: new Date() },
            });

            return applied;
        });

        if (biz.email) {
            void sendManualPaymentApprovedToOwnerEmail({
                to: biz.email,
                businessName: biz.business_name,
                businessDomain: biz.domain,
                planTier: result.planTier,
                domainPackageKey: result.domainPackageKey,
                planExpiresAt: result.planExpiresAt,
                paymentReference: pending.paymentReference,
            });
        }

        return await actionSuccess(result);
    } catch (error) {
        console.error('[Admin] approveManualSubscriptionPaymentRequest error:', error);
        return await actionFailure('MANUAL_PAYMENT_APPROVE_FAILED', await getErrorMessage(error));
    }
}

/**
 * Reject an owner-submitted offline payment request.
 */
export async function rejectManualSubscriptionPaymentRequest({
    businessId,
    reviewNotes = '',
} = {}) {
    const session = await requirePlatformAccess();
    if (!businessId) {
        return await actionFailure('MISSING_ID', 'Business ID is required.');
    }

    try {
        const biz = await prismaBase.businesses.findUnique({
            where: { id: businessId },
            select: { settings: true, email: true, business_name: true },
        });
        if (!biz) {
            return await actionFailure('NOT_FOUND', 'Business not found.');
        }

        const { pending } = getManualPaymentRequestState(biz.settings);
        if (!pending || pending.status !== 'pending') {
            return await actionFailure('NO_PENDING_REQUEST', 'No pending manual payment request.');
        }

        const resolvedRequest = {
            ...pending,
            status: /** @type {'rejected'} */ ('rejected'),
            reviewedAt: new Date().toISOString(),
            reviewedByUserId: session?.user?.id,
            reviewNotes: String(reviewNotes || '').slice(0, 2000) || undefined,
        };

        const nextSettings = resolveManualPaymentRequest(biz.settings, resolvedRequest);
        await prismaBase.businesses.update({
            where: { id: businessId },
            data: { settings: nextSettings, updated_at: new Date() },
        });

        if (biz.email) {
            void sendManualPaymentRejectedToOwnerEmail({
                to: biz.email,
                businessName: biz.business_name,
                paymentReference: pending.paymentReference,
                reviewNotes: resolvedRequest.reviewNotes,
            });
        }

        return await actionSuccess({ businessId, request: resolvedRequest });
    } catch (error) {
        console.error('[Admin] rejectManualSubscriptionPaymentRequest error:', error);
        return await actionFailure('MANUAL_PAYMENT_REJECT_FAILED', await getErrorMessage(error));
    }
}

/**
 * Get platform-wide metrics for Control Center dashboard
 */
export async function getPlatformMetrics() {
    await requirePlatformAccess();

    const client = await pool.connect();
    try {
        // Total and active businesses
        const bizRes = await client.query(`
            SELECT 
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE is_active = true)::int as active
            FROM businesses
        `);

        // Total and active users
        const userRes = await client.query(`
            SELECT 
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE "updatedAt" > NOW() - INTERVAL '24 hours')::int as active_today
            FROM "user"
        `);

        // Monthly revenue — sum all paid subscription_history rows for the current calendar month
        const revenueRes = await client.query(`
            SELECT 
                COALESCE(SUM(amount_minor), 0)::bigint as revenue
            FROM subscription_history
            WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
                AND amount_minor IS NOT NULL
                AND amount_minor > 0
                AND status IN (
                    'active',
                    'manual_payment_received',
                    'self_serve_plan_update',
                    'platform_admin_plan_change',
                    'owner_manual_payment_approved',
                    'manual_dev_plan_update'
                )
        `);

        // Recent businesses
        const recentBizRes = await client.query(`
            SELECT id, business_name, category, created_at
            FROM businesses
            ORDER BY created_at DESC
            LIMIT 10
        `);

        // Plan distribution
        const planDistRes = await client.query(`
            SELECT 
                COALESCE(plan_tier, 'free') as plan,
                COUNT(*)::int as count
            FROM businesses
            WHERE is_active = true
            GROUP BY plan_tier
        `);

        const planCounts = {};
        planDistRes.rows.forEach((row) => {
            planCounts[row.plan] = row.count;
        });

        return await actionSuccess({
            totalBusinesses: bizRes.rows[0].total,
            activeBusinesses: bizRes.rows[0].active,
            totalUsers: userRes.rows[0].total,
            activeUsers: userRes.rows[0].active_today,
            monthlyRevenue: Number(revenueRes.rows[0].revenue),
            recentBusinesses: recentBizRes.rows,
            planCounts,
        });
    } catch (error) {
        console.error('[Admin] getPlatformMetrics error:', error);
        return await actionFailure('METRICS_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

/** Domain package catalog for platform admin manual billing UI. */
export async function listDomainPackagesForAdminAction() {
    await requirePlatformAccess();
    return await actionSuccess({
        packages: listDomainPackages().map((p) => ({
            key: p.key,
            name: p.name,
            recommendedPlanTier: p.recommendedPlanTier,
            pricePkr: p.pricing.price_pkr,
            priceUsd: p.pricing.price_usd,
        })),
    });
}

/**
 * Configure per-tenant modular packaging (`businesses.settings.packaging`).
 * - `mode: 'tier'`, use `plan_tier` only (default product behavior).
 * - `mode: 'custom'` + `feature_overrides`, per-feature booleans override tier flags for keys listed.
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

        const { nextSettings, packaging } = mergePackagingIntoBusinessSettings(biz.settings, {
            mode: normalizedMode,
            featureOverrides: normalizedMode === 'custom' ? featureOverrides : undefined,
        });

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
 * Configure per-tenant plan limit overrides (platform admin only).
 * `max_users` / `max_products` / `max_warehouses` update DB columns; other keys merge into
 * `settings.limit_overrides`. Empty values reset to the business plan tier defaults.
 *
 * @param {string} businessId
 * @param {Record<string, string|number|null|undefined>} limitOverrides
 */
export async function updateBusinessLimitOverrides(businessId, limitOverrides = {}) {
    await requirePlatformAccess();

    if (!businessId) {
        return await actionFailure('MISSING_ID', 'Business ID is required.');
    }

    try {
        const biz = await prismaBase.businesses.findUnique({
            where: { id: businessId },
            select: {
                plan_tier: true,
                settings: true,
            },
        });
        if (!biz) {
            return await actionFailure('NOT_FOUND', 'Business not found.');
        }

        const { settingsPatch, dbColumns } = parseAdminLimitOverridePayload(
            biz.plan_tier || 'free',
            limitOverrides
        );

        const { nextSettings } = mergeLimitOverridesIntoBusinessSettings(biz.settings, settingsPatch);

        const data = {
            settings: nextSettings,
            updated_at: new Date(),
            ...dbColumns,
        };

        await prismaBase.businesses.update({
            where: { id: businessId },
            data,
        });

        return await actionSuccess({ businessId, limitOverrides: settingsPatch, dbColumns });
    } catch (error) {
        console.error('[Admin] updateBusinessLimitOverrides error:', error);
        return await actionFailure('LIMIT_OVERRIDES_UPDATE_FAILED', await getErrorMessage(error));
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
