'use client';

import { useMemo } from 'react';
import { useBusiness } from '@/lib/context/BusinessContext';
import { isMembershipRelevant } from '@/lib/config/domains';
import { resolvePlanTier } from '@/lib/config/plans';
import { planHasFeatureWithPackaging } from '@/lib/subscription/effectivePlanAccess';

/**
 * Client-side gate aligned with hub TabGuard + enrollment feature checks.
 * @param {string | undefined} category
 */
export function useMembershipHubAccess(category) {
  const { business, planTier, isPlatformOwner } = useBusiness();

  return useMemo(() => {
    const resolvedCategory = category || business?.category || '';
    const domainOk = isMembershipRelevant(resolvedCategory);
    const tier = isPlatformOwner
      ? 'enterprise'
      : resolvePlanTier(planTier || business?.plan_tier || 'free');
    const planOk =
      domainOk &&
      (isPlatformOwner ||
        planHasFeatureWithPackaging(tier, 'membership_management', business?.settings));

    return {
      domainOk,
      planOk,
      /** Domain + professional plan (or platform owner). */
      enabled: domainOk && planOk,
    };
  }, [category, business, planTier, isPlatformOwner]);
}
