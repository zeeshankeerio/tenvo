import { describe, it, expect } from 'vitest';
import {
  buildTopPicksProducts,
  getTopPickMetaLine,
  getTopPickDiscountPercent,
  getTopPickStatusBadge,
} from '../topPicks.js';

describe('topPicks', () => {
  it('merges featured and popular without duplicates', () => {
    const featured = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
    const popular = [{ id: '2', name: 'B' }, { id: '3', name: 'C' }];
    const picks = buildTopPicksProducts(featured, popular, 5);
    expect(picks.map((p) => p.id)).toEqual(['1', '2', '3']);
  });

  it('formats meta line and discount', () => {
    const product = {
      category_name: 'Embroidered',
      brand: 'Cambric',
      price: 3750,
      compare_price: 7500,
    };
    expect(getTopPickMetaLine(product)).toBe('Embroidered | Cambric');
    expect(getTopPickDiscountPercent(product)).toBe(50);
    expect(getTopPickStatusBadge(product)).toBeNull();
  });

  it('shows restocked badge when appropriate', () => {
    expect(getTopPickStatusBadge({ is_new: true, price: 100 })).toBe('New arrival');
    expect(getTopPickStatusBadge({ stock: 5, price: 100 })).toBe('Restocked');
  });
});
