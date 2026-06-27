import { describe, it, expect } from 'vitest';
import { buildRichSeedItems } from '../richProductCatalog.js';
import { BOUTIQUE_FASHION_SEED_PRODUCTS } from '../fashionDemoCatalog.js';
import { getFashionDemoImage } from '../fashionDemoImages.js';

describe('fashionDemoCatalog', () => {
  it('boutique seed has Limelight-style departments with curated images', () => {
    expect(BOUTIQUE_FASHION_SEED_PRODUCTS.length).toBeGreaterThanOrEqual(20);
    const unstitched = BOUTIQUE_FASHION_SEED_PRODUCTS.filter((p) =>
      String(p.domain_data?.stitchingtype || '').toLowerCase().includes('unstitched')
    );
    const accessories = BOUTIQUE_FASHION_SEED_PRODUCTS.filter((p) => p.category === 'Accessories');
    expect(unstitched.length).toBeGreaterThanOrEqual(4);
    expect(accessories.length).toBeGreaterThanOrEqual(6);
    for (const product of BOUTIQUE_FASHION_SEED_PRODUCTS) {
      expect(String(product.image_url || '')).toMatch(/^https:\/\/images\.unsplash\.com\//);
    }
  });

  it('buildRichSeedItems preserves explicit catalog image_url', () => {
    const sample = BOUTIQUE_FASHION_SEED_PRODUCTS[0];
    const [item] = buildRichSeedItems({
      businessId: '00000000-0000-0000-0000-000000000001',
      domainKey: 'boutique-fashion',
      countryIso: 'PK',
      taxRate: 17,
    });
    expect(item.image_url).toBe(sample.image_url);
    expect(item.is_new).toBe(true);
    expect(item.domain_data.collection).toBe('Summer');
  });

  it('resolves department image helpers', () => {
    const url = getFashionDemoImage('unstitched', 'lawn');
    expect(url).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });
});
