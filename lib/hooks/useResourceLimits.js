'use client';

import { useMemo } from 'react';
import { PLAN_TIERS, resolvePlanTier } from '@/lib/config/plans';

/**
 * useResourceLimits - enforces plan-tier usage caps.
 * Supports 5-tier model (free -> starter -> professional -> business -> enterprise)
 * and legacy 4-tier aliases (basic -> standard -> premium -> enterprise).
 */
export function useResourceLimits({ planTier = 'free', counts = {} }) {
    const resolved = resolvePlanTier(planTier);
    const tier = PLAN_TIERS[resolved] || PLAN_TIERS.free;
    const tierLimits = tier.limits || {};

    const usage = useMemo(() => {
        const map = {};

        const RESOURCE_MAP = {
            products: 'max_products',
            customers: 'max_customers',
            vendors: 'max_vendors',
            invoices: 'max_invoices_per_month',
            warehouses: 'max_warehouses',
            users: 'max_users',
            pos_terminals: 'max_pos_terminals',
            branches: 'max_branches',
        };

        for (const [resource, limitKey] of Object.entries(RESOURCE_MAP)) {
            const current = counts[resource] ?? 0;
            const max = tierLimits[limitKey];

            // -1, undefined, null, Infinity = unlimited
            if (max === undefined || max === null || max === Infinity || max === -1) {
                map[resource] = {
                    current,
                    max: Infinity,
                    percentage: 0,
                    remaining: Infinity,
                    limitReached: false,
                    nearLimit: false,
                };
            } else {
                const percentage = max > 0 ? Math.round((current / max) * 100) : 100;
                map[resource] = {
                    current,
                    max,
                    percentage: Math.min(percentage, 100),
                    remaining: Math.max(0, max - current),
                    limitReached: current >= max,
                    nearLimit: percentage >= 80 && percentage < 100,
                };
            }
        }
        return map;
    }, [counts, tierLimits]);

    /** Can the user create one more of this resource? */
    const canCreate = (resource) => {
        const u = usage[resource];
        return u ? !u.limitReached : true;
    };

    /** Is the user close to the limit (≥80%)? */
    const nearLimit = (resource) => {
        const u = usage[resource];
        return u ? u.nearLimit : false;
    };

    /** Has the user hit the limit? */
    const limitReached = (resource) => {
        const u = usage[resource];
        return u ? u.limitReached : false;
    };

    /** Human-readable limit message for UI banners */
    const getLimitMessage = (resource) => {
        const u = usage[resource];
        if (!u) return null;

        if (u.max === Infinity) return null;

        if (u.limitReached) {
            return `You've reached the ${tier.name} plan limit of ${u.max} ${resource}. Upgrade to add more.`;
        }
        if (u.nearLimit) {
            return `You're using ${u.current} of ${u.max} ${resource} on the ${tier.name} plan (${u.remaining} remaining).`;
        }
        return null;
    };

    /** Suggested upgrade tier for this resource */
    const suggestedUpgrade = (resource) => {
        const u = usage[resource];
        if (!u || !u.limitReached) return null;

        const RESOURCE_MAP = {
            products: 'max_products',
            customers: 'max_customers',
            vendors: 'max_vendors',
            invoices: 'max_invoices_per_month',
            warehouses: 'max_warehouses',
            users: 'max_users',
            pos_terminals: 'max_pos_terminals',
            branches: 'max_branches',
        };
        const limitKey = RESOURCE_MAP[resource];
        if (!limitKey) return null;

        // Find the next tier that has a higher limit
        const tiers = ['free', 'starter', 'professional', 'business', 'enterprise'];
        const resolvedCurrent = resolvePlanTier(planTier);
        const currentIdx = tiers.indexOf(resolvedCurrent);
        for (let i = currentIdx + 1; i < tiers.length; i++) {
            const nextTier = PLAN_TIERS[tiers[i]];
            const nextLimit = nextTier?.limits?.[limitKey];
            if (nextLimit === undefined || nextLimit > u.max) {
                return tiers[i];
            }
        }
        return null;
    };

    return {
        usage,
        canCreate,
        nearLimit,
        limitReached,
        getLimitMessage,
        suggestedUpgrade,
        tierName: tier.name,
        tierLimits,
    };
}
