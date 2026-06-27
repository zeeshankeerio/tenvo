import { describe, it, expect } from 'vitest';
import {
  fillProductRailItems,
  ensureRailProducts,
  resolveRailProductId,
} from '@/lib/utils/storefrontProductRail';

describe('resolveRailProductId', () => {
  it('returns id or product_id as string', () => {
    expect(resolveRailProductId({ id: 1 })).toBe('1');
    expect(resolveRailProductId({ product_id: 'abc' })).toBe('abc');
    expect(resolveRailProductId({})).toBeNull();
  });
});

describe('fillProductRailItems', () => {
  it('backfills from pool to reach minItems', () => {
    const featured = Array.from({ length: 5 }, (_, i) => ({ id: `f${i}`, name: `Featured ${i}` }));
    const pool = [
      ...featured,
      ...Array.from({ length: 24 }, (_, i) => ({ id: `p${i}`, name: `Pool ${i}` })),
    ];
    const result = fillProductRailItems(featured, pool, 6, 12);
    expect(result.length).toBeGreaterThanOrEqual(6);
    expect(result.slice(0, 6).map((p) => p.id)).toEqual(['f0', 'f1', 'f2', 'f3', 'f4', 'p0']);
  });

  it('dedupes by product_id when id is missing', () => {
    const primary = [{ product_id: 'a' }, { product_id: 'b' }];
    const pool = [{ product_id: 'a' }, { product_id: 'c' }];
    const result = fillProductRailItems(primary, pool, 6, 12);
    expect(result).toHaveLength(3);
    expect(result.map(resolveRailProductId)).toEqual(['a', 'b', 'c']);
  });
});

describe('ensureRailProducts', () => {
  it('fills 5 featured + 24 pool to at least 6 items', () => {
    const featured = Array.from({ length: 5 }, (_, i) => ({ id: `feat-${i}` }));
    const pool = [
      ...featured,
      ...Array.from({ length: 24 }, (_, i) => ({ id: `extra-${i}` })),
    ];
    const result = ensureRailProducts(featured, pool, 6, 12);
    expect(result.length).toBeGreaterThanOrEqual(6);
    expect(result.length).toBeLessThanOrEqual(12);
  });
});
