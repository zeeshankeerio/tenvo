import { describe, it, expect } from 'vitest';
import {
  normalizePageSections,
  sanitizeStoreCtaHref,
  getActivePageSections,
} from '../storePageSections.js';

describe('storePageSections', () => {
  it('sanitizes relative and absolute CTA links', () => {
    expect(sanitizeStoreCtaHref('/products?onSale=true')).toBe('/products?onSale=true');
    expect(sanitizeStoreCtaHref('https://example.com/x')).toBe('https://example.com/x');
    expect(sanitizeStoreCtaHref('')).toBe('/products');
  });

  it('normalizes and caps section count', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`,
      type: 'banner',
      title: `Banner ${i}`,
      enabled: true,
    }));
    expect(normalizePageSections(rows)).toHaveLength(6);
  });

  it('returns only enabled sections with content', () => {
    const active = getActivePageSections([
      { id: '1', type: 'banner', title: 'Sale', enabled: true },
      { id: '2', type: 'banner', title: '', enabled: true },
      { id: '3', type: 'promo-strip', subtitle: 'Free ship', enabled: false },
    ]);
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe('Sale');
  });
});
