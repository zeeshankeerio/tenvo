/**
 * Pure helpers for Easy mode dashboard tabs — no React dependencies.
 */

/** Prefer hub/storefront display stock when enriched on the product row. */
export function resolveProductStock(product) {
  if (!product || typeof product !== 'object') return 0;
  const display = product.display_stock ?? product.displayStock;
  if (display !== undefined && display !== null && Number.isFinite(Number(display))) {
    return Math.max(0, Number(display));
  }
  return Math.max(0, Number(product.stock) || 0);
}

/**
 * @param {number} pct
 * @param {'growth' | 'expense'} mode
 */
export function deltaVisual(pct, mode = 'growth') {
  const p = Number(pct);
  if (!Number.isFinite(p)) {
    return { text: '—', className: 'text-neutral-400 font-semibold tabular-nums' };
  }
  const r = Math.round(p * 10) / 10;
  if (Math.abs(r) < 0.05) {
    return { text: '0%', className: 'text-neutral-400 font-semibold tabular-nums' };
  }
  const sign = r > 0 ? '+' : '';
  const text = `${sign}${r}%`;
  if (mode === 'expense') {
    if (r > 10) return { text, className: 'text-amber-700 font-semibold tabular-nums' };
    if (r < -0.05) return { text, className: 'text-emerald-700 font-semibold tabular-nums' };
    return { text, className: 'text-neutral-700 font-semibold tabular-nums' };
  }
  return {
    text,
    className: r >= 0 ? 'text-emerald-700 font-semibold tabular-nums' : 'text-rose-700 font-semibold tabular-nums',
  };
}

/**
 * @param {Array<{ date?: string, revenue?: number, expenses?: number }>} chartData
 */
export function normalizeSparklineBars(chartData = [], maxBars = 6) {
  const rows = Array.isArray(chartData) ? chartData : [];
  const slice = rows.slice(-maxBars);
  if (slice.length === 0) return [];
  const maxVal = Math.max(...slice.map((r) => Math.max(Number(r.revenue) || 0, Number(r.expenses) || 0)), 1);
  return slice.map((row) => ({
    label: String(row.date || '').slice(0, 3),
    revenue: Number(row.revenue) || 0,
    expenses: Number(row.expenses) || 0,
    heightPct: Math.max(8, Math.round(((Number(row.revenue) || 0) / maxVal) * 100)),
  }));
}

/**
 * Top SKUs by line revenue in the selected period.
 * @param {Array<Record<string, unknown>>} invoices
 * @param {{ from: Date, to: Date }} dateRange
 * @param {number} limit
 */
export function buildTopProductsFromInvoices(invoices = [], dateRange, limit = 4) {
  const from = new Date(dateRange.from);
  const to = new Date(dateRange.to);
  const map = new Map();

  for (const inv of invoices) {
    const status = String(inv?.status || '').toLowerCase();
    if (['cancelled', 'draft'].includes(status)) continue;
    const rawDate = inv?.date;
    const parsed = rawDate ? new Date(rawDate) : null;
    if (!parsed || Number.isNaN(parsed.getTime()) || parsed < from || parsed > to) continue;

    const items = Array.isArray(inv?.items) ? inv.items : [];
    for (const item of items) {
      const name = String(item?.name || item?.product_name || 'Line item');
      const qty = Number(item?.quantity) || 0;
      const lineTotal =
        Number(item?.total) ||
        Number(item?.line_total) ||
        (Number(item?.price) || 0) * qty ||
        0;
      const prev = map.get(name) || { name, qty: 0, revenue: 0 };
      map.set(name, { name, qty: prev.qty + qty, revenue: prev.revenue + lineTotal });
    }
  }

  return [...map.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/**
 * Mini sparkline heights (0–100) for a product's line revenue across recent months in chartData order.
 * @param {Array<Record<string, unknown>>} invoices
 * @param {string} productName
 * @param {{ from: Date, to: Date }} dateRange
 * @param {number} buckets
 */
export function buildProductSparkHeights(invoices = [], productName, dateRange, buckets = 4) {
  const from = new Date(dateRange.from);
  const to = new Date(dateRange.to);
  const duration = Math.max(1, to.getTime() - from.getTime());
  const bucketMs = duration / buckets;
  const totals = Array.from({ length: buckets }, () => 0);

  for (const inv of invoices) {
    const status = String(inv?.status || '').toLowerCase();
    if (['cancelled', 'draft'].includes(status)) continue;
    const rawDate = inv?.date;
    const parsed = rawDate ? new Date(rawDate) : null;
    if (!parsed || Number.isNaN(parsed.getTime()) || parsed < from || parsed > to) continue;

    const idx = Math.min(buckets - 1, Math.floor((parsed.getTime() - from.getTime()) / bucketMs));
    const items = Array.isArray(inv?.items) ? inv.items : [];
    for (const item of items) {
      const name = String(item?.name || item?.product_name || 'Line item');
      if (name !== productName) continue;
      const qty = Number(item?.quantity) || 0;
      const lineTotal =
        Number(item?.total) ||
        Number(item?.line_total) ||
        (Number(item?.price) || 0) * qty ||
        0;
      totals[idx] += lineTotal;
    }
  }

  const max = Math.max(...totals, 1);
  return totals.map((v) => Math.max(12, Math.round((v / max) * 100)));
}

/**
 * @param {Array<{ category?: string, value?: number, amount?: number }>} expenseBreakdown
 */
export function normalizeExpenseRows(expenseBreakdown = [], limit = 5) {
  return expenseBreakdown
    .map((row) => ({
      label: String(row.category || row.name || 'Other'),
      value: Number(row.value ?? row.amount ?? 0),
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export const EASY_PRESET_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'mtd', label: 'MTD' },
];

function inDateRange(rawDate, from, to) {
  const parsed = rawDate ? new Date(rawDate) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return false;
  return parsed >= from && parsed <= to;
}

/**
 * Paid vs open sales documents in the selected period.
 */
export function buildSalesStatusBreakdown(invoices = [], dateRange) {
  const from = new Date(dateRange.from);
  const to = new Date(dateRange.to);
  let paidCount = 0;
  let openCount = 0;
  let pendingCount = 0;
  let paidRevenue = 0;
  let openRevenue = 0;

  for (const inv of invoices) {
    const status = String(inv?.status || '').toLowerCase();
    if (['cancelled', 'draft'].includes(status)) continue;
    if (!inDateRange(inv?.date, from, to)) continue;

    const amount = Number(inv?.grand_total) || Number(inv?.amount) || 0;
    if (status === 'paid') {
      paidCount += 1;
      paidRevenue += amount;
    } else {
      openCount += 1;
      openRevenue += amount;
      if (status.includes('pending') || status.includes('processing')) {
        pendingCount += 1;
      }
    }
  }

  return { paidCount, openCount, pendingCount, paidRevenue, openRevenue };
}

/**
 * Top customers by invoice revenue in period.
 */
export function buildTopCustomersFromInvoices(invoices = [], dateRange, limit = 5) {
  const from = new Date(dateRange.from);
  const to = new Date(dateRange.to);
  const map = new Map();

  for (const inv of invoices) {
    const status = String(inv?.status || '').toLowerCase();
    if (['cancelled', 'draft'].includes(status)) continue;
    if (!inDateRange(inv?.date, from, to)) continue;

    const key = String(inv?.customer_name || inv?.customer_id || 'Walk-in customer');
    const amount = Number(inv?.grand_total) || Number(inv?.amount) || 0;
    const orders = (map.get(key)?.orders || 0) + 1;
    map.set(key, { name: key, revenue: (map.get(key)?.revenue || 0) + amount, orders });
  }

  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

/**
 * SKUs at or below safety stock.
 */
export function buildLowStockSkus(products = [], limit = 6) {
  return products
    .map((p) => {
      const stock = resolveProductStock(p);
      const safety =
        Number(p?.reorder_point) ||
        Number(p?.min_stock) ||
        Number(p?.minStock) ||
        Number(p?.min_stock_level) ||
        10;
      return {
        id: String(p?.id || p?.sku || p?.name || ''),
        name: String(p?.name || 'Unnamed SKU'),
        sku: String(p?.sku || '—'),
        stock,
        safety,
        gap: Math.max(0, safety - stock),
      };
    })
    .filter((row) => row.stock <= row.safety)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, limit);
}

/** Count SKUs with zero stock. */
export function countOutOfStock(products = []) {
  return products.filter((p) => resolveProductStock(p) <= 0).length;
}

/**
 * Inventory value grouped by product category.
 */
export function buildCategoryInventory(products = [], limit = 5) {
  const map = new Map();
  for (const p of products) {
    const cat = String(p?.category || 'Uncategorized');
    const stock = resolveProductStock(p);
    const unitCost = Number(p?.cost_price) || Number(p?.purchase_price) || Number(p?.price) || 0;
    const prev = map.get(cat) || { category: cat, units: 0, value: 0, skus: 0 };
    map.set(cat, {
      category: cat,
      units: prev.units + stock,
      value: prev.value + stock * unitCost,
      skus: prev.skus + 1,
    });
  }
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}

/**
 * Open / overdue / collected invoice buckets (workspace-wide).
 */
export function buildInvoiceAging(invoices = []) {
  const now = new Date();
  let openCount = 0;
  let overdueCount = 0;
  let paidCount = 0;
  let openAmount = 0;
  let overdueAmount = 0;
  let collectedAmount = 0;

  for (const inv of invoices) {
    const status = String(inv?.status || '').toLowerCase();
    const amount = Number(inv?.grand_total) || Number(inv?.amount) || 0;
    if (status === 'paid') {
      paidCount += 1;
      collectedAmount += amount;
      continue;
    }
    if (['cancelled', 'draft', 'voided'].includes(status)) continue;

    openCount += 1;
    openAmount += amount;

    const dueRaw = inv?.due_date;
    const isOverdue =
      status.includes('overdue') ||
      status.includes('unpaid') ||
      (dueRaw && new Date(dueRaw) < now);
    if (isOverdue) {
      overdueCount += 1;
      overdueAmount += amount;
    }
  }

  return { openCount, overdueCount, paidCount, openAmount, overdueAmount, collectedAmount };
}

/** Simple period net margin %. */
export function computeNetMarginPct(revenue, expenses) {
  const rev = Number(revenue) || 0;
  const exp = Number(expenses) || 0;
  if (rev <= 0) return 0;
  return ((rev - exp) / rev) * 100;
}

/**
 * Expense-focused sparkline from monthly chart data.
 */
export function normalizeExpenseSparkline(chartData = [], maxBars = 6) {
  const rows = Array.isArray(chartData) ? chartData : [];
  const slice = rows.slice(-maxBars);
  if (slice.length === 0) return [];
  const maxVal = Math.max(...slice.map((r) => Number(r.expenses) || 0), 1);
  return slice.map((row) => ({
    label: String(row.date || '').slice(0, 3),
    value: Number(row.expenses) || 0,
    heightPct: Math.max(8, Math.round(((Number(row.expenses) || 0) / maxVal) * 100)),
  }));
}

/**
 * Dual-series chart rows for accounts tab.
 */
export function normalizeDualSparkline(chartData = [], maxBars = 6) {
  const rows = Array.isArray(chartData) ? chartData : [];
  const slice = rows.slice(-maxBars);
  if (slice.length === 0) return [];
  const maxVal = Math.max(
    ...slice.map((r) => Math.max(Number(r.revenue) || 0, Number(r.expenses) || 0)),
    1
  );
  return slice.map((row) => ({
    label: String(row.date || '').slice(0, 3),
    revenue: Number(row.revenue) || 0,
    expenses: Number(row.expenses) || 0,
    revenuePct: Math.max(6, Math.round(((Number(row.revenue) || 0) / maxVal) * 100)),
    expensePct: Math.max(6, Math.round(((Number(row.expenses) || 0) / maxVal) * 100)),
  }));
}
