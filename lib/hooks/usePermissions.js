/**
 * usePermissions Hook
 * Client-side hook for RBAC + subscription-aware feature gating.
 * Combines business context (role, plan_tier) with the permissions system.
 */

'use client';

import { useMemo } from 'react';
import { useBusiness } from '@/lib/context/BusinessContext';
import {
    hasPermission,
    isRoleAtLeast,
    getPermissionsForRole,
    getNavItemAccess,
    NAV_PERMISSION_MAP,
} from '@/lib/rbac/permissions';
import { planWithinLimit, planAtLeast, FEATURE_MIN_PLAN, resolvePlanTier } from '@/lib/config/plans';
import { planHasFeatureWithPackaging } from '@/lib/subscription/effectivePlanAccess';

/**
 * usePermissions -- returns an object with permission-checking helpers
 * scoped to the current business context's role and plan tier.
 *
 * Usage:
 *   const { can, canNav, planCan, isLocked } = usePermissions();
 *   if (can('pos.process_sale')) { ... }
 *   const access = canNav('pos'); // { visible, locked, requiredPlan }
 */
export function usePermissions() {
    const { role, business } = useBusiness();
    const effectiveRole = role || 'viewer';
    const planTier = resolvePlanTier(business?.plan_tier || 'free');
    const businessSettings = business?.settings;

    const helpers = useMemo(() => ({
        /**
         * Check if current user has a specific permission
         * @param {string} permission - e.g., 'pos.process_sale'
         * @returns {boolean}
         */
        can: (permission) => hasPermission(effectiveRole, permission),

        /**
         * Check if current user's role is at least a specific level
         * @param {string} minRole - e.g., 'manager'
         * @returns {boolean}
         */
        isAtLeast: (minRole) => isRoleAtLeast(effectiveRole, minRole),

        /**
         * Check if current plan has a feature enabled
         * @param {string} featureKey - e.g., 'pos', 'manufacturing'
         * @returns {boolean}
         */
        planCan: (featureKey) => planHasFeatureWithPackaging(planTier, featureKey, businessSettings),

        /**
         * Check if current plan is within a resource limit
         * @param {string} limitKey - e.g., 'max_products'
         * @param {number} currentCount - Current usage count
         * @returns {boolean}
         */
        withinLimit: (limitKey, currentCount) => planWithinLimit(planTier, limitKey, currentCount),

        /**
         * Check if current plan is at least a specific tier
         * @param {string} requiredTier - e.g., 'premium'
         * @returns {boolean}
         */
        planIsAtLeast: (requiredTier) => planAtLeast(planTier, requiredTier),

        /**
         * Get navigation item access state (visible/locked/requiredPlan)
         * @param {string} navKey - Sidebar nav key (e.g., 'pos', 'manufacturing')
         * @returns {{ visible: boolean, locked: boolean, requiredPlan: string | null }}
         */
        canNav: (navKey) => getNavItemAccess(navKey, effectiveRole, planTier, businessSettings),

        /**
         * Check if a feature is locked behind a higher subscription
         * @param {string} featureKey - Feature key from plans.js
         * @returns {{ locked: boolean, requiredPlan: string }}
         */
        isLocked: (featureKey) => {
            const enabled = planHasFeatureWithPackaging(planTier, featureKey, businessSettings);
            return {
                locked: !enabled,
                requiredPlan: FEATURE_MIN_PLAN[featureKey] || 'starter',
            };
        },

        /**
         * Get all permissions the current user has
         * @returns {string[]}
         */
        allPermissions: () => getPermissionsForRole(effectiveRole),

        /**
         * Current role and plan for display purposes
         */
        role: effectiveRole,
        planTier,
    }), [effectiveRole, planTier, businessSettings]);

    return helpers;
}

/**
 * Feature Gate Component -- wraps children in permission + plan check
 * Shows UpgradePrompt or nothing based on access.
 *
 * @example
 *   <FeatureGate permission="pos.access" feature="pos">
 *     <POSTerminal />
 *   </FeatureGate>
 */
export function FeatureGate({
    children,
    permission,
    feature,
    fallback = null,
    showUpgrade = false,
}) {
    const { can, planCan, planTier } = usePermissions();

    // Check role permission
    if (permission && !can(permission)) {
        return fallback;
    }

    // Check plan feature
    if (feature && !planCan(feature)) {
        if (showUpgrade) {
            // Lazily import UpgradePrompt to avoid circular deps
            const { UpgradePrompt } = require('@/components/subscription/UpgradePrompt');
            return (
                <UpgradePrompt
                    currentPlan={planTier}
                    featureName={feature.replace(/_/g, ' ')}
                    requiredPlan={FEATURE_MIN_PLAN[feature] || 'starter'}
                />
            );
        }
        return fallback;
    }

    return children;
}
