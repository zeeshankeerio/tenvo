import { describe, it, expect } from 'vitest';
import { buildRichSeedItems, hasRichCatalog } from '../richProductCatalog.js';
import {
  GEMS_JEWELLERY_SEED_PRODUCTS,
  GEMS_JEWELLERY_SEED_CATEGORIES,
} from '../jewelleryDemoCatalog.js';
import { getJewelleryDemoImage } from '../jewelleryDemoImages.js';

describe('jewelleryDemoCatalog', () => {
  it('has a rich catalog for gems-jewellery', () => {
    expect(hasRichCatalog('gems-jewellery')).toBe(true);
    expect(GEMS_JEWELLERY_SEED_PRODUCTS.length).toBeGreaterThanOrEqual(20);
    expect(GEMS_JEWELLERY_SEED_CATEGORIES).toContain('Gold');
    expect(GEMS_JEWELLERY_SEED_CATEGORIES).toContain('Diamonds');
    expect(GEMS_JEWELLERY_SEED_CATEGORIES).toContain('Bridal');
  });

  it('every product has a curated Unsplash image', () => {
    for (const product of GEMS_JEWELLERY_SEED_PRODUCTS) {
      expect(String(product.image_url || '')).toMatch(/^https:\/\/images\.unsplash\.com\//);
      expect(product.sku).toBeTruthy();
      expect(Number(product.price)).toBeGreaterThan(0);
    }
  });

  it('covers gold, diamond, and bridal departments', () => {
    const gold = GEMS_JEWELLERY_SEED_PRODUCTS.filter((p) => p.category === 'Gold');
    const diamonds = GEMS_JEWELLERY_SEED_PRODUCTS.filter((p) => p.category === 'Diamonds');
    const bridal = GEMS_JEWELLERY_SEED_PRODUCTS.filter((p) => p.category === 'Bridal');
    expect(gold.length).toBeGreaterThanOrEqual(3);
    expect(diamonds.length).toBeGreaterThanOrEqual(3);
    expect(bridal.length).toBeGreaterThanOrEqual(2);
  });

  it('buildRichSeedItems preserves jewellery catalog fields', () => {
    const items = buildRichSeedItems({
      businessId: '00000000-0000-0000-0000-000000000001',
      domainKey: 'gems-jewellery',
      countryIso: 'PK',
      taxRate: 3,
    });
    expect(items.length).toBe(GEMS_JEWELLERY_SEED_PRODUCTS.length);
    const solitaire = items.find((i) => i.sku === 'DIA-SOL-050-GIA');
    expect(solitaire?.image_url).toMatch(/^https:\/\/images\.unsplash\.com\//);
    expect(solitaire?.domain_data?.certification).toBe('GIA');
    expect(solitaire?.is_featured).toBe(true);
  });

  it('resolves department image helpers', () => {
    const url = getJewelleryDemoImage('gold', 'ring');
    expect(url).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });
});
