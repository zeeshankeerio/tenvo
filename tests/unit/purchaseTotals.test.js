import { describe, it, expect } from 'vitest';
import {
  calculatePurchaseLineTotal,
  calculatePurchaseTotals,
} from '@/lib/utils/purchaseTotals';

describe('purchaseTotals', () => {
  it('calculates line total with tax', () => {
    expect(calculatePurchaseLineTotal(10, 100, 18)).toBe(1180);
    expect(calculatePurchaseLineTotal(2, 49.99, 5)).toBe(104.98);
  });

  it('aggregates header totals from items', () => {
    const totals = calculatePurchaseTotals([
      { quantity: 10, unitCost: 100, taxRate: 18 },
      { quantity: 2, unitCost: 50, taxRate: 0 },
    ]);
    expect(totals.subtotal).toBe(1100);
    expect(totals.taxTotal).toBe(180);
    expect(totals.grandTotal).toBe(1280);
  });
});
