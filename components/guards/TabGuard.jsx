'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { FEATURE_MIN_PLAN } from '@/lib/config/plans';
import { hasPermission, NAV_PERMISSION_MAP } from '@/lib/rbac/permissions';
import { planHasFeatureWithPackaging } from '@/lib/subscription/effectivePlanAccess';
import { useBusiness } from '@/lib/context/BusinessContext';

/**
 * TabGuard -- Unified access control wrapper for tab content.
 *
 * Checks three gates IN ORDER:
 *   1. Domain relevance  (optional `domainCheck` prop -- a boolean)
 *   2. RBAC / role        (permission key from NAV_PERMISSION_MAP or explicit)
 *   3. Subscription tier  (feature key from NAV_PERMISSION_MAP or explicit)
 *
 * Platform owner bypasses ALL gates automatically.
 *
 * If all pass -> renders children.
 * If domain blocked -> shows "not relevant" card.
 * If RBAC blocked  -> shows "access restricted" card.
 * If plan blocked  -> shows <UpgradePrompt />.
 */
export function TabGuard({
    tabKey,
    role,
    planTier = 'free',
    domainCheck = true,
    domainTitle,
    domainMessage,
    permission: permissionOverride,
    featureKey: featureOverride,
    requiredPlan: requiredPlanOverride,
    featureName,
    onUpgrade,
    children,
}) {
    const { isPlatformOwner, business } = useBusiness();
    const businessSettings = business?.settings;
    const effectiveRole = role || 'viewer';

    // Platform owner bypasses ALL gates -- full access to everything
    if (isPlatformOwner) {
        return <>{children}</>;
    }

    // Derive from NAV_PERMISSION_MAP if not overridden
    const mapping = tabKey ? NAV_PERMISSION_MAP[tabKey] : null;
    const permission = permissionOverride || mapping?.permission;
    const featureKey = featureOverride ?? mapping?.feature; // null = no plan gate

    // -- Gate 1: Domain Relevance --------------------------------------------
    if (domainCheck === false) {
        return (
            <Card className="p-12 text-center border-none shadow-sm">
                <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold">{domainTitle || 'Not available for this domain'}</h3>
                <p className="text-gray-500 mt-1">{domainMessage || 'This feature is not relevant to your business type.'}</p>
            </Card>
        );
    }

    // -- Gate 2: RBAC Permission ---------------------------------------------
    if (permission && !hasPermission(effectiveRole, permission)) {
        return (
            <Card className="p-12 text-center border-none shadow-sm">
                <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold">Access Restricted</h3>
                <p className="text-gray-500 mt-1">
                    Your role ({effectiveRole}) does not have permission to access this feature.
                    Contact your business administrator to request access.
                </p>
            </Card>
        );
    }

    // -- Gate 3: Subscription Plan -------------------------------------------
    if (featureKey && !planHasFeatureWithPackaging(planTier, featureKey, businessSettings, business?.platformFeatureOverrides)) {
        const resolvedRequired =
            requiredPlanOverride || (featureKey ? FEATURE_MIN_PLAN[featureKey] : null) || 'starter';
        return (
            <UpgradePrompt
                currentPlan={planTier}
                requiredPlan={resolvedRequired}
                featureName={featureName || tabKey || 'This feature'}
                onUpgrade={onUpgrade}
            />
        );
    }

    // -- All gates passed ----------------------------------------------------
    return <>{children}</>;
}
