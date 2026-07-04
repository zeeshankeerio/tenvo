/**
 * Domain-aware copy for Visual Studio chart tiles.
 * Keeps analytics readable per vertical without hard-coding in UI components.
 */

/** @typedef {import('./domainOperationsIntelligence.js').resolveOperationsProfile extends (...args: any[]) => infer R ? R : never} OperationsProfile */

const DEFAULT_COPY = {
  revenueTitle: 'Revenue trajectory',
  revenueDesc: 'Period revenue vs profit',
  categoryTitle: 'Category composition',
  categoryDesc: 'Stock value by category',
  topTitle: 'Top performers',
  topDesc: 'Best sellers in period',
  barTitle: 'Monthly pulse',
  barDesc: 'Revenue bars by month',
  emptyHint: 'Record dated sales and categorized products to unlock the chart grid.',
};

/** @type {Record<string, Partial<typeof DEFAULT_COPY>>} */
const MODE_COPY = {
  parts_desk: {
    revenueTitle: 'Parts revenue trajectory',
    revenueDesc: 'Counter & workshop revenue vs margin',
    categoryTitle: 'Part families',
    categoryDesc: 'Inventory value by category',
    topTitle: 'Fast-moving SKUs',
    topDesc: 'Top parts by sales in period',
    barTitle: 'Weekly parts pulse',
    barDesc: 'Revenue trend across the period',
    emptyHint: 'Log parts invoices with dates to unlock parts analytics.',
  },
  showroom: {
    revenueTitle: 'Showroom revenue',
    revenueDesc: 'Unit sales & deal flow in period',
    categoryTitle: 'Model mix',
    categoryDesc: 'Inventory by vehicle or unit type',
    topTitle: 'Hot listings',
    topDesc: 'Highest traction units',
    barTitle: 'Sales cadence',
    barDesc: 'Deal volume over time',
    emptyHint: 'Add showroom invoices to visualize deal momentum.',
  },
  pharmacy_desk: {
    revenueTitle: 'Dispensing revenue',
    revenueDesc: 'Rx & OTC revenue vs margin',
    categoryTitle: 'Therapeutic mix',
    categoryDesc: 'Stock by category',
    topTitle: 'Top dispensed lines',
    topDesc: 'Highest volume SKUs',
    barTitle: 'Weekly dispensing',
    barDesc: 'Revenue rhythm in period',
    emptyHint: 'Post dated pharmacy invoices to unlock dispensing charts.',
  },
  clinical_ops: {
    revenueTitle: 'Service revenue',
    revenueDesc: 'Visits & procedures vs consumables',
    categoryTitle: 'Service mix',
    categoryDesc: 'Revenue by service category',
    topTitle: 'Top services',
    topDesc: 'Most booked services in period',
    barTitle: 'Visit rhythm',
    barDesc: 'Service revenue over time',
    emptyHint: 'Record service invoices to see clinical performance charts.',
  },
  hospitality: {
    revenueTitle: 'Floor revenue',
    revenueDesc: 'Covers & ticket revenue in period',
    categoryTitle: 'Menu / category mix',
    categoryDesc: 'Sales by menu category',
    topTitle: 'Best sellers',
    topDesc: 'Top items by revenue',
    barTitle: 'Daily covers pulse',
    barDesc: 'Revenue by day',
    emptyHint: 'Run dated POS or invoice entries to unlock floor analytics.',
  },
  online_store: {
    revenueTitle: 'Store revenue',
    revenueDesc: 'Online & invoice channel revenue',
    categoryTitle: 'Catalog mix',
    categoryDesc: 'Inventory value by collection',
    topTitle: 'Bestsellers',
    topDesc: 'Top SKUs in period',
    barTitle: 'Sales pulse',
    barDesc: 'Revenue trend across the period',
    emptyHint: 'Sync storefront orders or invoices to unlock store charts.',
  },
  manufacturing: {
    revenueTitle: 'Production revenue',
    revenueDesc: 'Finished goods revenue vs cost',
    categoryTitle: 'Product lines',
    categoryDesc: 'Output mix by category',
    topTitle: 'Top finished goods',
    topDesc: 'Best moving production SKUs',
    barTitle: 'Output rhythm',
    barDesc: 'Shipped revenue over time',
    emptyHint: 'Complete production orders and invoices to unlock charts.',
  },
};

/**
 * @param {OperationsProfile | null | undefined} profile
 */
export function getVisualAnalyticsCopy(profile) {
  const mode = profile?.mode || 'operations';
  const tabLabel = profile?.tabLabel || 'Operations';
  const overrides = MODE_COPY[mode] || {};
  return {
    ...DEFAULT_COPY,
    ...overrides,
    studioSubtitle: `${tabLabel} · visual analytics for this period`,
  };
}
