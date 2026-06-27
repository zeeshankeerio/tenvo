/**
 * Shared purchase order line + header totals (EnhancedPOBuilder, tests).
 */

export function calculatePurchaseLineTotal(quantity, unitCost, taxRate = 0) {
  const q = Number(quantity) || 0;
  const c = Number(unitCost) || 0;
  const t = Number(taxRate) || 0;
  const base = q * c;
  const tax = (base * t) / 100;
  return parseFloat((base + tax).toFixed(2));
}

export function calculatePurchaseTotals(items = []) {
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost ?? item.unit_cost) || 0),
    0
  );
  const taxTotal = items.reduce((sum, item) => {
    const base = (Number(item.quantity) || 0) * (Number(item.unitCost ?? item.unit_cost) || 0);
    const rate = Number(item.taxRate ?? item.tax_rate) || 0;
    return sum + (base * rate) / 100;
  }, 0);
  const total = parseFloat((subtotal + taxTotal).toFixed(2));

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxTotal: parseFloat(taxTotal.toFixed(2)),
    total,
    grandTotal: total,
  };
}
