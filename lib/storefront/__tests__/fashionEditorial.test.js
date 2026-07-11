import { describe, it, expect } from 'vitest';
import {
  isFashionEditorialStore,
  getFashionEditorialSlides,
  getFashionEditorialNav,
  getFashionEditorialConfig,
  buildDefaultFashionEditorialStorefrontSeed,
  resolveFashionSearchPlaceholder,
  resolveFashionTrustPillars,
  getFashionMetadataCopy,
  formatFashionStoreName,
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

  it('exposes premium config toggles with safe defaults', () => {
    const config = getFashionEditorialConfig({}, 'demo-boutique');
    expect(config.showTrustStrip).toBe(true);
    expect(config.showBrandsRow).toBe(true);
    expect(config.showPromoBanners).toBe(true);
    expect(config.showSeoBlock).toBe(true);
  });

  it('seeds full editorial homepage on registration', () => {
    const seed = buildDefaultFashionEditorialStorefrontSeed();
    expect(seed.fashion.showTrustStrip).toBe(true);
    expect(seed.fashion.showUnstitched).toBe(true);
    expect(seed.fashion.showReadyToWear).toBe(true);
  });

  it('seeds B2B fabric defaults for textile-wholesale only', () => {
    const wholesale = buildDefaultFashionEditorialStorefrontSeed('textile-wholesale');
    expect(wholesale.fashion.showReadyToWear).toBe(false);
    expect(wholesale.fashion.showAccessories).toBe(false);
    expect(wholesale.fashion.unstitchedTitle).toContain('FABRIC');
    expect(wholesale.fashion.featuredRailTitle).toContain('Wholesale');

    const garments = buildDefaultFashionEditorialStorefrontSeed('garments');
    expect(garments.fashion.showReadyToWear).toBe(true);
    expect(garments.fashion.showAccessories).toBe(true);
    expect(garments.fashion.unstitchedTitle).toBeUndefined();
  });

  it('applies wholesale trust pillars and config defaults by category', () => {
    const config = getFashionEditorialConfig({}, 'demo-textile', 'textile-wholesale');
    expect(config.showReadyToWear).toBe(false);
    expect(config.showAccessories).toBe(false);
    expect(config.unstitchedTitle).toContain('FABRIC');
    const pillars = resolveFashionTrustPillars({}, 'demo-textile', 'textile-wholesale');
    expect(pillars.some((p) => /bulk|trade|wholesale/i.test(p.label + p.desc))).toBe(true);
  });

  it('resolves variant-aware search placeholder and metadata', () => {
    expect(resolveFashionSearchPlaceholder({}, 'textile-wholesale')).toContain('lawn');
    const meta = getFashionMetadataCopy('garments', 'Lahore', 'Tenvo Boutique');
    expect(meta.description).toContain('Tenvo Boutique');
    expect(meta.keywords).toContain('unstitched');
    expect(formatFashionStoreName('Tenvo Boutique Demo')).toBe('Tenvo Boutique');
  });

  it('returns trust pillars for demo stores', () => {
    const pillars = resolveFashionTrustPillars({}, 'demo-boutique');
    expect(pillars.length).toBeGreaterThanOrEqual(3);
  });
});
