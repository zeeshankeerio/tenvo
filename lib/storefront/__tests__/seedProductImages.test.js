import { describe, it, expect } from 'vitest';
import {
  resolveSeedProductImageUrl,
  getFallbackProductImageUrl,
} from '../productImageFallback.js';

describe('seed product images', () => {
  it('matches bakery products to bakery imagery', () => {
    const url = resolveSeedProductImageUrl({
      name: 'Chocolate Fudge Cake (2lb)',
      category: 'Cakes',
      domainKey: 'bakery-confectionery',
      seedKey: 'cake-1',
    });
    expect(url).toMatch(/^https:\/\/images\.unsplash\.com\//);
    expect(url).not.toContain('ef1f0b8b8b8b');
  });

  it('matches auto parts by product name', () => {
    const url = resolveSeedProductImageUrl({
      name: 'Bosch Front Brake Pads, Honda Civic FB',
      category: 'Brakes',
      domainKey: 'auto-parts',
      seedKey: 'brake-1',
    });
    expect(url).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });

  it('matches smartphones to phone pool', () => {
    const url = resolveSeedProductImageUrl({
      name: 'Latest Smartphone Model',
      category: 'Smartphones',
      domainKey: 'mobile-phone-shop',
      seedKey: 'phone-1',
    });
    expect(url).toMatch(/photo-1511707171634|photo-1523206489230|photo-1592899677977/);
  });

  it('uses category in haystack for clinic services', () => {
    const url = getFallbackProductImageUrl(
      { name: 'Initial Medical Check-up', id: 'chk-1' },
      'clinics-healthcare',
      'Check-ups'
    );
    expect(url).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });

  it('matches solar products', () => {
    const url = resolveSeedProductImageUrl({
      name: 'Solar Panel 550W Mono',
      category: 'Panels',
      domainKey: 'solar-energy',
      seedKey: 'solar-1',
    });
    expect(url).toMatch(/photo-1509391366360|photo-1508514177221|photo-1497435334941/);
  });
});
