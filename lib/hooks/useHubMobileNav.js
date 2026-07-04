'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  Building2,
  Truck,
  Landmark,
  CreditCard,
  BarChart3,
  Settings,
  ShoppingCart,
  Warehouse,
  Brain,
  Megaphone,
  Factory,
  Store,
  BadgeCheck,
  Shield,
} from 'lucide-react';
import { useBusiness } from '@/lib/context/BusinessContext';
import { useHubReady } from '@/lib/hooks/useHubReady';
import { useAppMode } from '@/lib/context/BusyModeContext';
import { getNavItemAccess } from '@/lib/rbac/permissions';
import { resolvePlanTier } from '@/lib/config/plans';
import { getDomainKnowledgeForBusiness } from '@/lib/utils/businessRegionalContext';
import { isCampaignRelevant, isHospitality, isMembershipRelevant, isPosRelevant } from '@/lib/config/domains';

const EASY_MODULES = [
  { key: 'invoices', label: 'Invoices', sublabel: 'Sell & bill', icon: FileText },
  { key: 'customers', label: 'Customers', sublabel: 'CRM', icon: Users },
  { key: 'memberships', label: 'Memberships', sublabel: 'Plans & renewals', icon: BadgeCheck, domainRule: 'membershipRelevant' },
  { key: 'inventory', label: 'Products', sublabel: 'Stock', icon: Package },
  { key: 'purchases', label: 'Purchases', sublabel: 'Buy', icon: Truck },
  { key: 'finance', label: 'Finance', sublabel: 'Books', icon: Landmark },
  { key: 'reports', label: 'Reports', sublabel: 'Insights', icon: BarChart3 },
];

const ADVANCED_MODULES = [
  { key: 'inventory', label: 'Inventory', sublabel: 'Stock hub', icon: Package },
  { key: 'invoices', label: 'Sales', sublabel: 'Invoicing', icon: FileText },
  { key: 'customers', label: 'Customers', sublabel: 'CRM', icon: Users },
  { key: 'memberships', label: 'Memberships', sublabel: 'Enrollments', icon: BadgeCheck, domainRule: 'membershipRelevant' },
  { key: 'vendors', label: 'Vendors', sublabel: 'Procurement', icon: Building2 },
  { key: 'finance', label: 'Finance', sublabel: 'Ledger', icon: Landmark },
  { key: 'reports', label: 'Analytics', sublabel: 'AI & reports', icon: Brain },
];

const EASY_PRIMARY = [
  { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { key: 'invoices', label: 'Sell', icon: FileText },
  { key: 'inventory', label: 'Stock', icon: Package },
  { key: 'finance', label: 'Money', icon: Landmark },
  { key: '__more__', label: 'More', icon: Settings },
];

const ADVANCED_PRIMARY = [
  { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { key: 'inventory', label: 'Stock', icon: Package },
  { key: 'invoices', label: 'Sales', icon: FileText },
  { key: 'finance', label: 'Finance', icon: Landmark },
  { key: '__more__', label: 'More', icon: Settings },
];

const OVERFLOW_CANDIDATES = [
  { key: 'orders', label: 'Orders', icon: Package, domainRule: null, conditionKey: null },
  { key: 'memberships', label: 'Memberships', icon: BadgeCheck, domainRule: 'membershipRelevant' },
  { key: 'pos', label: 'Point of Sale', icon: ShoppingCart, domainRule: 'posRelevant' },
  { key: 'purchases', label: 'Purchase Orders', icon: Truck },
  { key: 'vendors', label: 'Vendors', icon: Building2 },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'gst', label: 'Tax / GST', icon: CreditCard },
  { key: 'warehouses', label: 'Warehouses', icon: Warehouse, conditionKey: 'multiLocation' },
  { key: 'manufacturing', label: 'Manufacturing', icon: Factory, conditionKey: 'manufacturing' },
  { key: 'campaigns', label: 'Campaigns', icon: Megaphone, domainRule: 'campaignRelevant' },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'store-settings', label: 'Store Settings', icon: Store },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'platform-admin', label: 'Platform Admin', icon: Shield, platformOnly: true, externalPath: '/admin' },
];

function resolveNavVisibility(item, ctx) {
  const {
    category,
    domainKnowledge,
    posRelevant,
    hospitalityDomain,
    campaignRelevant,
    membershipRelevant,
    effectiveRole,
    planTier,
    businessSettings,
    platformFeatureOverrides,
  } = ctx;

  if (item.domainRule === 'posRelevant' && !posRelevant) {
    return { visible: false, locked: false };
  }
  if (item.domainRule === 'hospitality' && !hospitalityDomain) {
    return { visible: false, locked: false };
  }
  if (item.domainRule === 'campaignRelevant' && !campaignRelevant) {
    return { visible: false, locked: false };
  }
  if (item.domainRule === 'membershipRelevant' && !membershipRelevant) {
    return { visible: false, locked: false };
  }
  if (item.conditionKey === 'manufacturing' && !domainKnowledge?.manufacturingEnabled) {
    return { visible: false, locked: false };
  }
  if (item.conditionKey === 'multiLocation' && !domainKnowledge?.multiLocationEnabled) {
    return { visible: false, locked: false };
  }

  return getNavItemAccess(item.key, effectiveRole, planTier, businessSettings, platformFeatureOverrides);
}

/**
 * Mobile hub navigation, primary bottom bar, dashboard module tiles, overflow sheet.
 * Mirrors Sidebar gating without duplicating full section trees.
 */
export function useHubMobileNav() {
  const { business, role, planTier: contextPlanTier, isPlatformOwner, isPlatformAdmin } = useBusiness();
  const { hubReady, navReady, hasOptimisticShell, optimisticShell } = useHubReady();
  const { isEasyMode } = useAppMode();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const category = business?.category || 'retail-shop';
  const domainKnowledge = getDomainKnowledgeForBusiness(category, business);
  const posRelevant = isPosRelevant(category, domainKnowledge);
  const hospitalityDomain = isHospitality(category);
  const campaignRelevant = isCampaignRelevant(category, domainKnowledge);
  const membershipRelevant = isMembershipRelevant(category);

  const safeIsPlatformOwner = hasHydrated ? isPlatformOwner : false;
  const safeIsPlatformAdmin = hasHydrated ? isPlatformAdmin : false;
  const cachedRole = hasOptimisticShell ? optimisticShell.role : null;
  const cachedPlanTier = hasOptimisticShell ? optimisticShell.business?.plan_tier : null;
  const effectiveRole = hubReady
    ? role
    : (cachedRole || ((!hasHydrated || !navReady) ? 'viewer' : role));
  const planTier = hasHydrated || navReady
    ? (safeIsPlatformOwner
        ? 'enterprise'
        : resolvePlanTier(contextPlanTier || business?.plan_tier || cachedPlanTier || 'free'))
    : 'free';

  const ctx = useMemo(
    () => ({
      category,
      domainKnowledge,
      posRelevant,
      hospitalityDomain,
      campaignRelevant,
      membershipRelevant,
      effectiveRole,
      planTier,
      businessSettings: business?.settings,
      platformFeatureOverrides: business?.platformFeatureOverrides,
    }),
    [category, domainKnowledge, posRelevant, hospitalityDomain, campaignRelevant, membershipRelevant, effectiveRole, planTier, business?.settings, business?.platformFeatureOverrides]
  );

  const filterItem = (item) => {
    if (item.platformOnly && !safeIsPlatformAdmin) {
      return { ...item, visible: false, locked: false };
    }
    if (item.key === '__more__') return { ...item, visible: true, locked: false };
    const access = resolveNavVisibility(item, ctx);
    return { ...item, ...access };
  };

  const primaryItems = useMemo(() => {
    const base = isEasyMode ? EASY_PRIMARY : ADVANCED_PRIMARY;
    return base.map(filterItem).filter((i) => i.visible);
  }, [isEasyMode, ctx]);

  const moduleItems = useMemo(() => {
    const base = isEasyMode ? EASY_MODULES : ADVANCED_MODULES;
    return base.map(filterItem).filter((i) => i.visible && !i.locked);
  }, [isEasyMode, ctx]);

  const overflowItems = useMemo(() => {
    const primaryKeys = new Set(
      (isEasyMode ? EASY_PRIMARY : ADVANCED_PRIMARY)
        .map((i) => i.key)
        .filter((k) => k !== '__more__')
    );
    const moduleKeys = new Set((isEasyMode ? EASY_MODULES : ADVANCED_MODULES).map((i) => i.key));

    return OVERFLOW_CANDIDATES.map(filterItem).filter(
      (i) => i.visible && !primaryKeys.has(i.key) && !moduleKeys.has(i.key)
    );
  }, [isEasyMode, ctx]);

  return {
    primaryItems,
    moduleItems,
    overflowItems,
    isEasyMode,
    ready: navReady,
  };
}
