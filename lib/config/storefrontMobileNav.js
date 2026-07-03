import {
  Package,
  ShoppingCart,
  RefreshCcw,
  UtensilsCrossed,
  Heart,
  ClipboardList,
  TrendingUp,
  ExternalLink,
  Store,
  BadgeCheck,
} from 'lucide-react';

/**
 * Storefront hub modules, mirrors Sidebar STOREFRONT / SELL sections.
 * Keys match DashboardTabs `value` and sidebar `item.key`.
 */
export const STOREFRONT_MOBILE_ITEMS = [
  { key: 'orders', label: 'Orders', sublabel: 'Online', icon: Package, alwaysShow: true },
  { key: 'pos', label: 'POS', sublabel: 'Checkout', icon: ShoppingCart, domainRule: 'posRelevant' },
  { key: 'refunds', label: 'Refunds', sublabel: 'Returns', icon: RefreshCcw, domainRule: 'posRelevant' },
  { key: 'restaurant', label: 'Restaurant', sublabel: 'Floor plan', icon: UtensilsCrossed, domainRule: 'hospitality' },
  { key: 'loyalty', label: 'Loyalty', sublabel: 'Rewards', icon: Heart, domainRule: 'posRelevant' },
  { key: 'memberships', label: 'Members', sublabel: 'Plans', icon: BadgeCheck, domainRule: 'membershipRelevant' },
  { key: 'quotations', label: 'Quotes', sublabel: 'Estimates', icon: ClipboardList, conditionKey: 'quotations' },
  { key: 'sales', label: 'Analytics', sublabel: 'Performance', icon: TrendingUp, alwaysShow: true },
  {
    key: 'view-storefront',
    label: 'Store',
    sublabel: 'Public',
    icon: ExternalLink,
    alwaysShow: true,
    isExternal: true,
    externalUrl: (business) =>
      business?.handle || business?.domain ? `/store/${business?.handle || business?.domain}` : null,
  },
  { key: 'store-settings', label: 'Settings', sublabel: 'Storefront', icon: Store, alwaysShow: true },
];

export function resolveStorefrontItemState(item, ctx) {
  const {
    category,
    domainKnowledge,
    posRelevant,
    hospitalityDomain,
    effectiveRole,
    planTier,
    businessSettings,
    getNavItemAccess,
  } = ctx;

  if (item.alwaysShow && !item.isExternal) {
    return getNavItemAccess(item.key, effectiveRole, planTier, businessSettings);
  }

  if (item.domainRule === 'posRelevant' && !posRelevant) {
    return { visible: false, locked: false };
  }
  if (item.domainRule === 'hospitality' && !hospitalityDomain) {
    return { visible: false, locked: false };
  }
  if (item.domainRule === 'membershipRelevant' && !ctx.membershipRelevant) {
    return { visible: false, locked: false };
  }
  if (item.conditionKey === 'quotations' && !domainKnowledge?.inventoryFeatures?.includes('Quotation Management')) {
    return { visible: false, locked: false };
  }

  if (item.isExternal) {
    const access = getNavItemAccess(item.key === 'view-storefront' ? 'store-settings' : item.key, effectiveRole, planTier, businessSettings);
    return { ...access, visible: true };
  }

  return getNavItemAccess(item.key, effectiveRole, planTier, businessSettings);
}
