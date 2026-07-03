/** Shared mobile layout tokens — keep FABs and overlays above bottom nav. */
export const MOBILE_BOTTOM_NAV_CLASS =
  'bottom-[calc(4.25rem+env(safe-area-inset-bottom))] lg:bottom-6';

export const MOBILE_FLOATING_Z = 'z-[45] lg:z-50';

/** Public storefront bottom nav (h-14) + safe area + 1rem gap. */
export const STOREFRONT_FLOAT_BOTTOM =
  'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-6';

export const STOREFRONT_FLOAT_RIGHT = 'right-4 lg:right-6';

/** Above storefront nav (z-50) and footer content. */
export const STOREFRONT_CHAT_Z = 'z-[60]';

/** Stack scroll-to-top above chat FAB (3.5rem) with 0.75rem gap. */
export const STOREFRONT_BACK_TO_TOP_BOTTOM =
  'bottom-[calc(8.75rem+env(safe-area-inset-bottom))] lg:bottom-24';

export const MOBILE_TAB_LABELS = {
  dashboard: 'Home',
  inventory: 'Stock',
  invoices: 'Sales',
  customers: 'Customers',
  sales: 'Sales',
  quotations: 'Quotes',
  vendors: 'Vendors',
  payments: 'Payments',
  purchases: 'Purchases',
  manufacturing: 'Production',
  warehouses: 'Locations',
  batches: 'Batches',
  gst: 'Tax',
  settings: 'Settings',
  reports: 'Reports',
  analytics: 'Analytics',
  finance: 'Finance',
  orders: 'Orders',
  pos: 'POS',
  refunds: 'Refunds',
  loyalty: 'Loyalty',
  memberships: 'Members',
  'store-settings': 'Store',
  restaurant: 'Restaurant',
  campaigns: 'Campaigns',
};

/** Hub tabs with their own mobile search/filters — hide global header chrome. */
export const MOBILE_MINIMAL_HEADER_TABS = new Set([
  'orders',
  'pos',
  'refunds',
  'loyalty',
  'memberships',
  'store-settings',
  'quotations',
  'sales',
  'restaurant',
]);
