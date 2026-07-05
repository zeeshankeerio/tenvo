import { describe, it, expect } from 'vitest';
import {
  isFashionEditorialStore,
  getFashionEditorialSlides,
  getFashionEditorialNav,
} from '../fashionEditorial.js';

describe('fashionEditorial', () => {
  it('enables editorial mode for clothing domains', () => {
    expect(isFashionEditorialStore('boutique-fashion')).toBe(true);
    expect(isFashionEditorialStore('textile-wholesale')).toBe(true);
    expect(isFashionEditorialStore('gems-jewellery')).toBe(false);
    expect(isFashionEditorialStore('textile-mill')).toBe(false);
    expect(isFashionEditorialStore('pharmacy')).toBe(false);
  });

  it('returns Zellbury-style slides with CTA and ratings', () => {
    const slides = getFashionEditorialSlides('/store/demo-boutique', 'boutique-fashion');
    expect(slides.length).toBeGreaterThanOrEqual(2);
    expect(slides[0].ctaLabel).toBeTruthy();
    expect(slides[0].ctaHref).toContain('/products');
    expect(slides[0].rating).toBeGreaterThan(4);
  });

  it('builds nav tabs and promo banners', () => {
    const nav = getFashionEditorialNav('/store/demo-boutique', 'boutique-fashion');
    expect(nav.tabs.length).toBeGreaterThanOrEqual(2);
    expect(nav.promos.length).toBe(2);
    expect(nav.tabs[0].categories.length).toBeGreaterThan(0);
  });
});
