'use client';

import { useEffect, useMemo, useState } from 'react';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getNavItemAccess } from '@/lib/rbac/permissions';
import { resolvePlanTier } from '@/lib/config/plans';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { isHospitality, isPosRelevant } from '@/lib/config/domains';
import { STOREFRONT_MOBILE_ITEMS, resolveStorefrontItemState } from '@/lib/config/storefrontMobileNav';

/** Visible storefront hub modules for mobile, same gating as Sidebar STOREFRONT. */
export function useStorefrontMobileNav() {
  const { business, role, planTier: contextPlanTier, isLoading: businessLoading, isPlatformOwner } = useBusiness();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const category = business?.category || 'retail-shop';
  const domainKnowledge = getDomainKnowledge(category);
  const posRelevant = isPosRelevant(category, domainKnowledge);
  const hospitalityDomain = isHospitality(category);

  const safeIsPlatformOwner = hasHydrated ? isPlatformOwner : false;
  const effectiveRole = !hasHydrated || businessLoading || !role ? 'viewer' : role;
  const planTier = hasHydrated
    ? (safeIsPlatformOwner ? 'enterprise' : resolvePlanTier(contextPlanTier || business?.plan_tier || 'free'))
    : 'free';

  const ctx = useMemo(
    () => ({
      category,
      domainKnowledge,
      posRelevant,
      hospitalityDomain,
      effectiveRole,
      planTier,
      businessSettings: business?.settings,
      getNavItemAccess,
    }),
    [category, domainKnowledge, posRelevant, hospitalityDomain, effectiveRole, planTier, business?.settings]
  );

  const items = useMemo(
    () =>
      STOREFRONT_MOBILE_ITEMS.map((item) => {
        const access = resolveStorefrontItemState(item, ctx);
        return { ...item, ...access };
      }).filter((item) => item.visible),
    [ctx]
  );

  return {
    items,
    business,
    ready: hasHydrated && !businessLoading,
  };
}
