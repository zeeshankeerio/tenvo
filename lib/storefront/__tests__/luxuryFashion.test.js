import { describe, it, expect } from 'vitest';
import {
  isLuxuryFashionStore,
  getLuxuryFashionVariant,
  LUXURY_HERO_SLIDES,
  LUXURY_TRUST_PILLS,
} from '../luxuryFashion.js';
import { resolveStorefrontVertical } from '@/lib/config/storefrontDomains';

describe('luxuryFashion', () => {
  it('identifies luxury canonical stores', () => {
    expect(isLuxuryFashionStore('gems-jewellery')).toBe(true);
    expect(isLuxuryFashionStore('boutique-fashion')).toBe(true);
    expect(isLuxuryFashionStore('textile-wholesale')).toBe(true);
    expect(isLuxuryFashionStore('leather-footwear')).toBe(true);
    expect(isLuxuryFashionStore('garments')).toBe(true);
    expect(isLuxuryFashionStore('retail-shop')).toBe(false);
  });

  it('maps canonical keys to luxury variants', () => {
    expect(getLuxuryFashionVariant('gems-jewellery')).toBe('jewellery');
    expect(getLuxuryFashionVariant('boutique-fashion')).toBe('boutique');
    expect(getLuxuryFashionVariant('textile-wholesale')).toBe('textile');
    expect(getLuxuryFashionVariant('leather-footwear')).toBe('leather');
  });

  it('routes jewellery and boutique to luxury-fashion vertical', () => {
    expect(resolveStorefrontVertical('gems-jewellery')).toBe('luxury-fashion');
    expect(resolveStorefrontVertical('boutique-fashion')).toBe('luxury-fashion');
    expect(resolveStorefrontVertical('textile-wholesale')).toBe('fashion-clothing');
  });

  it('provides hero slides and trust pills per variant', () => {
    for (const variant of ['jewellery', 'boutique', 'textile', 'leather']) {
      expect(LUXURY_HERO_SLIDES[variant].length).toBeGreaterThanOrEqual(2);
      expect(LUXURY_TRUST_PILLS[variant].length).toBe(4);
    }
  });
});
