import { describe, it, expect } from 'vitest';
import {
  enrichFashionPromoBanners,
  getFashionPromoBannerCopy,
  mergeFashionPromoBannerSettings,
  pickFashionPromoBannerProductImage,
} from '../fashionPromoBanners.js';

describe('fashionPromoBanners', () => {
  it('returns distinct copy for boutique banners', () => {
    const copy = getFashionPromoBannerCopy('boutique-fashion');
    expect(copy).toHaveLength(2);
    expect(copy[0].id).toBe('pret');
    expect(copy[1].id).toBe('unstitched');
  });

  it('picks different inventory images for pret vs unstitched', () => {
    const products = [
      {
        id: '1',
        name: '3 Piece Lawn Suit (Unstitched)',
        category: 'Lawn',
        image_url: 'https://cdn.example/unstitched.jpg',
        domain_data: { stitchingtype: 'Unstitched' },
      },
      {
        id: '2',
        name: 'Embroidered Pret Kurti',
        category: 'Ready to Wear',
        image_url: 'https://cdn.example/pret.jpg',
        domain_data: { stitchingtype: 'Stitched' },
        is_featured: true,
      },
    ];

    const pretImage = pickFashionPromoBannerProductImage(products, 'pret', 0, 'boutique-fashion');
    const unstitchedImage = pickFashionPromoBannerProductImage(products, 'unstitched', 1, 'boutique-fashion');
    expect(pretImage).toContain('pret.jpg');
    expect(unstitchedImage).toContain('unstitched.jpg');
  });

  it('enriches demo banners with unique default images', () => {
    const copy = getFashionPromoBannerCopy('boutique-fashion');
    const enriched = enrichFashionPromoBanners(copy, [], 'boutique-fashion', 'demo-boutique');
    expect(enriched[0].image).toBeTruthy();
    expect(enriched[1].image).toBeTruthy();
    expect(enriched[0].image).not.toBe(enriched[1].image);
  });

  it('merges owner overrides without dropping inventory image', () => {
    const defaults = [
      { id: 'pret', title: 'Ready to wear', subtitle: 'A', href: '?a', tone: 'dark', image: 'https://cdn/a.jpg' },
      { id: 'unstitched', title: 'Unstitched', subtitle: 'B', href: '?b', tone: 'light', image: 'https://cdn/b.jpg' },
    ];
    const merged = mergeFashionPromoBannerSettings(defaults, [
      { id: 'pret', title: 'Custom pret', image: '' },
    ]);
    expect(merged[0].title).toBe('Custom pret');
    expect(merged[0].image).toBe('https://cdn/a.jpg');
  });
});
