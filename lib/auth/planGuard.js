// Plan Guard Middleware -- not a server action file

import pool from '@/lib/db';
import { PLAN_TIERS, planHasFeature, planWithinLimit, resolvePlanTier, getAllPlansOrdered } from '@/lib/config/plans';
import { planHasFeatureWithPackaging } from '@/lib/subscription/effectivePlanAccess';

/**
 * Plan Guard Middleware
 * Validates that a business's plan allows a specific feature or resource limit.
 * 
 * Usage patterns:
 *   await checkPlanFeature(businessId, 'pos');
 *   await checkPlanLimit(businessId, 'max_users', currentUserCount);
 */

/**
 * Get the current plan tier for a business
 * @param {string} businessId
 * @param {import('pg').PoolClient} [txClient] - Optional transaction client
 * @returns {Promise<{plan_tier: string, plan_expires_at: Date|null, expired: boolean, overrides: Record<string, number>, settings: Record<string, unknown>}>}
 */
export async function getBusinessPlan(businessId, txClient = null) {
    const client = txClient || await pool.connect();
    const shouldRelease = !txClient;

    try {
        const result = await client.query(
            'SELECT plan_tier, plan_expires_at, plan_seats, max_products, max_warehouses, settings FROM businesses WHERE id = $1',
            [businessId]
        );

        if (result.rows.length === 0) {
            throw new Error('Business not found');
        }

        const { plan_tier, plan_expires_at, plan_seats, max_products, max_warehouses, settings } = result.rows[0];

        // Merge per-tenant limit overrides from settings JSON (supports all plan limit keys)
        const settingsObj = (settings && typeof settings === 'object') ? settings : {};

        // Merge per-tenant limit overrides from settings JSON (supports all plan limit keys)
        const settingsOverrides = (settingsObj.limit_overrides && typeof settingsObj.limit_overrides === 'object')
            ? settingsObj.limit_overrides : {};
        const parsedSettingsOverrides = Object.fromEntries(
            Object.entries(settingsOverrides)
                .map(([k, v]) => [k, Number(v)])
                .filter(([, v]) => Number.isFinite(v) && v >= -1)
        );

        // DB columns take precedence over settings overrides
        const overrides = {
            ...parsedSettingsOverrides,
            max_users: Number(plan_seats ?? -1),
            max_products: Number(max_products ?? -1),
            max_warehouses: Number(max_warehouses ?? -1),
        };

        // Check if plan has expired -> downgrade to free
        if (plan_expires_at && new Date(plan_expires_at) < new Date()) {
            return { plan_tier: 'free', plan_expires_at: null, expired: true, overrides, settings: settingsObj };
        }

        return { plan_tier: resolvePlanTier(plan_tier || 'free'), plan_expires_at, expired: false, overrides, settings: settingsObj };
    } finally {
        if (shouldRelease) client.release();
    }
}

/**
 * Guard: Check if a business plan includes a feature
 * @param {string} businessId
 * @param {string} featureKey - Feature key from plans.js features object
 * @param {import('pg').PoolClient} [txClient]
 * @throws {Error} If feature not available on plan
 */
export async function checkPlanFeature(businessId, featureKey, txClient = null) {
    const { plan_tier, settings } = await getBusinessPlan(businessId, txClient);

    if (!planHasFeatureWithPackaging(plan_tier, featureKey, settings)) {
        const resolved = resolvePlanTier(plan_tier);
        const planConfig = PLAN_TIERS[resolved];
        // Find the minimum plan that has this feature
        let requiredPlan = 'enterprise';
        for (const tier of getAllPlansOrdered()) {
            if (planHasFeature(tier, featureKey)) {
                requiredPlan = tier;
                break;
            }
        }

        const err = new Error(
            `Feature "${featureKey}" requires ${requiredPlan} plan or above. ` +
            `Current plan: ${planConfig?.name || plan_tier}. ` +
            `Please upgrade to unlock this feature.`
        );
        err.code = 'PLAN_UPGRADE_REQUIRED';
        err.requiredPlan = requiredPlan;
        err.feature = featureKey;
        throw err;
    }
}

/**
 * Guard: Check if a business is within a usage limit
 * @param {string} businessId
 * @param {string} limitKey - e.g. 'max_users', 'max_products'
 * @param {number} currentCount - Current usage count
 * @param {import('pg').PoolClient} [txClient]
 * @throws {Error} If limit exceeded
 */
export async function checkPlanLimit(businessId, limitKey, currentCount, txClient = null) {
    const { plan_tier, overrides } = await getBusinessPlan(businessId, txClient);

    const overrideLimit = Number(overrides?.[limitKey]);
    const hasOverride = Number.isFinite(overrideLimit) && overrideLimit >= -1;

    if (hasOverride) {
        if (overrideLimit !== -1 && currentCount >= overrideLimit) {
            const planConfig = PLAN_TIERS[plan_tier];
            const err = new Error(
                `${limitKey.replace('max_', '').replace('_', ' ')} limit reached (${overrideLimit}). ` +
                `Current plan: ${planConfig?.name || plan_tier}. ` +
                `Please upgrade to add more.`
            );
            err.code = 'LIMIT_REACHED';
            err.limitKey = limitKey;
            err.limit = overrideLimit;
            throw err;
        }
        return;
    }

    if (!planWithinLimit(plan_tier, limitKey, currentCount)) {
        const planConfig = PLAN_TIERS[plan_tier];
        const limit = planConfig?.limits?.[limitKey];

        const err = new Error(
            `${limitKey.replace('max_', '').replace('_', ' ')} limit reached (${limit}). ` +
            `Current plan: ${planConfig?.name || plan_tier}. ` +
            `Please upgrade to add more.`
        );
        err.code = 'LIMIT_REACHED';
        err.limitKey = limitKey;
        err.limit = limit;
        throw err;
    }
}

/**
 * Decorator: withPlan
 * Wraps a server action with plan-tier feature guard.
 * Checks BOTH authentication AND plan before executing.
 * 
 * @param {string} featureKey - Feature to check
 * @param {Function} action - Server action to wrap
 * @param {object} options - { businessIdArg: 'first'|'fromObject', businessIdKey: 'business_id' }
 * @returns {Function} Wrapped server action
 */
export function withPlan(featureKey, action, options = {}) {
    const { businessIdArg = 'first', businessIdKey = 'business_id' } = options;

    return async function (...args) {
        let businessId;
        if (businessIdArg === 'first') {
            businessId = args[0];
        } else if (businessIdArg === 'fromObject') {
            businessId = args[0]?.[businessIdKey] || args[0]?.businessId;
        }

        if (!businessId) {
            return { success: false, error: 'Business ID required' };
        }

        try {
            await checkPlanFeature(businessId, featureKey);
            return await action(...args);
        } catch (error) {
            return { success: false, error: error.message };
        }
    };
}
