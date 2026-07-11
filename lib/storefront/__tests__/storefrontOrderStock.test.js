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

  it('resolveSellableStockQty uses location sum only when location rows exist', () => {
    expect(
      resolveSellableStockQty({ headlineStock: 2, locationQty: 15, variants: [] })
    ).toBe(15);
    expect(
      resolveSellableStockQty({ headlineStock: 100, locationQty: 10, variants: [] })
    ).toBe(10);
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

  it('resolveSellableStockQty ignores locations for variant products', () => {
    expect(
      resolveSellableStockQty({
        headlineStock: 1,
        locationQty: 50,
        variants: [{ stock: 4 }, { stock: 6 }],
      })
    ).toBe(10);
  });
});
