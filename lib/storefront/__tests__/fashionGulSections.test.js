import { describe, it, expect } from 'vitest';
import {
  supportsFashionGulSections,
  resolveFashionHomeEdit,
  resolveFashionSaleMosaic,
} from '../fashionGulSections.js';

describe('fashionGulSections', () => {
  it('supports editorial and jewellery verticals', () => {
    expect(supportsFashionGulSections('garments')).toBe(true);
    expect(supportsFashionGulSections('gems-jewellery')).toBe(true);
    expect(supportsFashionGulSections('pharmacy')).toBe(false);
  });

  it('resolves apparel home edit defaults for demo boutique', () => {
    const section = resolveFashionHomeEdit({}, 'boutique-fashion', 'demo-boutique', '/store/demo-boutique');
    expect(section?.title).toBe('The Style Edit');
    expect(section?.tiles.length).toBe(4);
    expect(section?.tiles[0].href).toContain('/products');
  });

  it('enriches home edit tiles from live categories', () => {
    const section = resolveFashionHomeEdit(
      {
        storefront: {
          fashion: {
            homeEdit: {
              title: 'Custom edit',
              tiles: [
                {
                  id: 'lawn-tile',
                  slot: 'hero',
                  href: '?category=lawn',
                  image: 'https://fallback.example/fallback.jpg',
                },
              ],
            },
          },
        },
      },
      'boutique-fashion',
      'live-boutique',
      '/store/live-boutique',
      [{ id: 'c1', name: 'Lawn', slug: 'lawn', product_count: 5 }],
      [{ id: 'p1', name: 'Digital Lawn 3pc', category_slug: 'lawn', category_name: 'Lawn', image_url: 'https://example.com/lawn.jpg' }]
    );
    expect(section?.tiles[0].href).toContain('category=lawn');
    expect(section?.tiles[0].image).toContain('example.com');
  });

  it('resolves sale mosaic with five columns', () => {
    const section = resolveFashionSaleMosaic({}, 'garments', 'demo-boutique', '/store/demo-boutique');
    expect(section?.title).toBe('Sale');
    expect(section?.columns.length).toBe(5);
    expect(section?.columns[0].tiles[0].label).toBe('Kids');
  });

  it('uses jewellery-specific defaults for demo jewellery', () => {
    const home = resolveFashionHomeEdit({}, 'gems-jewellery', 'demo-jewellery', '/store/demo-jewellery');
    expect(home?.title).toBe('The Jewellery Edit');
  });
});
