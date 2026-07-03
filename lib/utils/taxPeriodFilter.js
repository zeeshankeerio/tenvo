/**
 * Period helpers for tax and finance reporting.
 * @param {'month'|'quarter'|'year'|'all'} period
 * @param {Date|string} [referenceDate]
 */
export function getTaxPeriodRange(period, referenceDate = new Date()) {
  const ref = new Date(referenceDate);
  if (Number.isNaN(ref.getTime()) || period === 'all') {
    return { start: null, end: null, label: 'All Time' };
  }

  const start = new Date(ref);
  const end = new Date(ref);

  if (period === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const label = start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return { start, end, label };
  }

  if (period === 'quarter') {
    const quarter = Math.floor(ref.getMonth() / 3);
    start.setMonth(quarter * 3, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(quarter * 3 + 3, 0);
    end.setHours(23, 59, 59, 999);
    const label = `Q${quarter + 1} ${start.getFullYear()}`;
    return { start, end, label };
  }

  start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  end.setMonth(11, 31);
  end.setHours(23, 59, 59, 999);
  const label = String(start.getFullYear());
  return { start, end, label };
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @param {string} dateField
 * @param {'month'|'quarter'|'year'|'all'} period
 */
export function filterRecordsByPeriod(items, dateField, period, referenceDate = new Date()) {
  const { start, end } = getTaxPeriodRange(period, referenceDate);
  if (!start || !end) return items;

  return items.filter((item) => {
    const raw = item?.[dateField];
    if (!raw) return false;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return false;
    return date >= start && date <= end;
  });
}

/**
 * Build monthly filing summaries from transactional data.
 * @param {Array} invoices
 * @param {Array} purchases
 */
export function buildTaxPeriodSummaries(invoices = [], purchases = []) {
  const buckets = new Map();

  const ensureBucket = (key, date) => {
    if (!buckets.has(key)) {
      const due = new Date(date.getFullYear(), date.getMonth() + 1, 15);
      buckets.set(key, {
        period: date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        periodKey: key,
        outputTax: 0,
        inputTax: 0,
        taxableSales: 0,
        taxablePurchases: 0,
        dueDate: due.toISOString().split('T')[0],
        invoiceCount: 0,
        purchaseCount: 0,
      });
    }
    return buckets.get(key);
  };

  for (const inv of invoices) {
    const date = new Date(inv.date);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = ensureBucket(key, date);
    bucket.outputTax += Number(inv.tax_total ?? inv.total_tax) || 0;
    bucket.taxableSales += Number(inv.subtotal ?? inv.grand_total) || 0;
    bucket.invoiceCount += 1;
  }

  for (const po of purchases) {
    const date = new Date(po.date);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = ensureBucket(key, date);
    bucket.inputTax += Number(po.tax_total) || 0;
    bucket.taxablePurchases += Number(po.subtotal ?? po.total_amount) || 0;
    bucket.purchaseCount += 1;
  }

  return Array.from(buckets.values())
    .map((row) => ({
      ...row,
      netPayable: Math.max(0, row.outputTax - row.inputTax),
      status: row.netPayable > 0 ? 'Due' : 'Settled',
    }))
    .sort((a, b) => b.periodKey.localeCompare(a.periodKey));
}
