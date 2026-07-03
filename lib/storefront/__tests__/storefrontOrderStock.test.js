import { describe, expect, it } from 'vitest';
import {
  parseStockNumber,
  resolveSellableStockQty,
} from '@/lib/storefront/storefrontOrderStock';

describe('storefrontOrderStock', () => {
  it('parseStockNumber handles null and numeric strings', () => {
    expect(parseStockNumber(null)).toBeNull();
    expect(parseStockNumber('12')).toBe(12);
  });

  it('resolveSellableStockQty aligns catalog with warehouse rows', () => {
    expect(
      resolveSellableStockQty({ headlineStock: 2, locationQty: 15, variants: [] })
    ).toBe(15);
  });

  it('resolveSellableStockQty uses variant max when variants exist', () => {
    expect(
      resolveSellableStockQty({
        headlineStock: 1,
        locationQty: null,
        variants: [{ stock: 4 }, { stock: 6 }],
      })
    ).toBe(10);
  });
});
