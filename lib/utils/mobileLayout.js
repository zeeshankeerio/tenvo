/** Shared mobile layout tokens — keep FABs and overlays above bottom nav. */
export const MOBILE_BOTTOM_NAV_CLASS =
  'bottom-[calc(4.25rem+env(safe-area-inset-bottom))] lg:bottom-6';

export const MOBILE_FLOATING_Z = 'z-[45] lg:z-50';

/** Module FABs sit left of the hub AI chatbot (right-4 + 3.5rem + gap). */
export const MOBILE_MODULE_FAB_RIGHT =
  'right-[calc(1rem+3.5rem+0.75rem)] lg:right-6';

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
  inquiries: 'Inquiries',
  approvals: 'Approvals',
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

/** Tabs where mobile hub already exposes create actions — hide header quick-add only. */
export const MOBILE_HIDE_HEADER_QUICK_ADD_TABS = new Set(['dashboard']);

/** Bottom sheet shell — fixed header + scrollable body (More modules, tool menus) */
export const MOBILE_BOTTOM_SHEET =
  'flex max-h-[min(88dvh,720px)] flex-col gap-0 overflow-hidden rounded-t-3xl border-t p-0';

export const MOBILE_BOTTOM_SHEET_HANDLE = 'mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-gray-200';

export const MOBILE_BOTTOM_SHEET_HEADER =
  'shrink-0 space-y-1 border-b border-gray-100 px-4 py-3 pr-12 text-left';

export const MOBILE_BOTTOM_SHEET_BODY =
  'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]';

/** Hub tab roots — clip accidental horizontal overflow on mobile without blocking inner scroll rails */
export const HUB_MOBILE_ROOT = 'min-w-0 overflow-x-hidden touch-manipulation';

/** Contained horizontal scroll rail (KPI chips, module pills) — never bleeds past viewport */
export const HUB_MOBILE_SCROLL_RAIL =
  'flex min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-none snap-x snap-mandatory';
