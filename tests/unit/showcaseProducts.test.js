import { describe, it, expect } from 'vitest';
import { trimToShowcaseRows } from '@/lib/storefront/showcaseProducts';

describe('trimToShowcaseRows', () => {
  it('keeps full rows only when above minimum', () => {
    const items = Array.from({ length: 14 }, (_, i) => ({ id: i }));
    expect(trimToShowcaseRows(items, 6, 2)).toHaveLength(12);
  });

  it('returns all when below minimum row count', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ id: i }));
    expect(trimToShowcaseRows(items, 6, 2)).toHaveLength(8);
  });
});
