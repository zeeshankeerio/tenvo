import { describe, it, expect } from 'vitest';
import { buildFashionHomeSections } from '../fashionHomeSections.js';

describe('fashionHomeSections', () => {
  const categories = [
    { id: 'c1', name: 'Unstitched Fabric', slug: 'unstitched-fabric', product_count: 12 },
    { id: 'c2', name: 'Stitched Suits', slug: 'stitched-suits', product_count: 8 },
    { id: 'c3', name: 'Accessories', slug: 'accessories', product_count: 5 },
    { id: 'c4', name: 'Lawn', slug: 'lawn', product_count: 6 },
    { id: 'c5', name: 'Semi-Formal', slug: 'semi-formal', product_count: 4 },
  ];

  const products = [
    {
      id: 'p1',
      name: 'Gul Ahmed Digital Lawn 3pc',
      category_name: 'Lawn',
      category_slug: 'lawn',
      category_id: 'c4',
      is_new: true,
      price: 4500,
      image_url: 'https://example.com/lawn.jpg',
    },
    {
      id: 'p2',
      name: 'Embroidered Chiffon Unstitched',
      category_name: 'Unstitched Fabric',
      category_slug: 'unstitched-fabric',
      category_id: 'c1',
      price: 8500,
      image_url: 'https://example.com/emb.jpg',
    },
    {
      id: 'p3',
      name: 'Silk Digital Print Stole',
      category_name: 'Accessories',
      category_slug: 'accessories',
      category_id: 'c3',
      price: 1200,
      image_url: 'https://example.com/stole.jpg',
    },
    {
      id: 'p3b',
      name: 'Pearl Drop Earrings',
      category_name: 'Accessories',
      category_slug: 'accessories',
      category_id: 'c3',
      price: 1890,
      image_url: 'https://example.com/earrings.jpg',
    },
    {
      id: 'p4',
      name: 'Ready to Wear Co-ord Set',
      category_name: 'Stitched Suits',
      category_slug: 'stitched-suits',
      category_id: 'c2',
      is_new: true,
      price: 5990,
      image_url: 'https://example.com/coord.jpg',
    },
    {
      id: 'p5',
      name: 'Formal Embroidered Kurta',
      category_name: 'Semi-Formal',
      category_slug: 'semi-formal',
      category_id: 'c5',
      price: 6500,
      image_url: 'https://example.com/kurta.jpg',
    },
  ];

  it('builds unstitched, accessories, and new arrivals from live categories', () => {
    const sections = buildFashionHomeSections({
      businessDomain: 'demo-boutique',
      businessCategory: 'boutique-fashion',
      categories,
      products,
      newArrivalProducts: products.filter((p) => p.is_new),
    });

    expect(sections.unstitched.show).toBe(true);
    expect(sections.unstitched.tiles.length).toBeGreaterThanOrEqual(2);
    expect(sections.accessories.show).toBe(true);
    expect(sections.newArrivals.products.length).toBe(2);
    expect(sections.readyToWear.show).toBe(true);
  });

  it('skips unstitched for jewellery vertical', () => {
    const sections = buildFashionHomeSections({
      businessDomain: 'demo-jewellery',
      businessCategory: 'gems-jewellery',
      categories: [{ id: 'g1', name: 'Gold', slug: 'gold', product_count: 3 }],
      products: [{ id: 'j1', name: 'Gold Ring', category_name: 'Gold', category_slug: 'gold', price: 50000 }],
      newArrivalProducts: [],
    });
    expect(sections.unstitched.show).toBe(false);
  });

  it('uses fabric-lot titles and hides RTW for textile-wholesale', () => {
    const sections = buildFashionHomeSections({
      businessDomain: 'demo-textile',
      businessCategory: 'textile-wholesale',
      categories: [
        { id: 'c1', name: 'Lawn', slug: 'lawn', product_count: 8 },
        { id: 'c2', name: 'Khaddar', slug: 'khaddar', product_count: 6 },
        { id: 'c3', name: 'Cotton', slug: 'cotton', product_count: 5 },
      ],
      products: [
        {
          id: 't1',
          name: 'Digital Lawn Suit',
          category_name: 'Lawn',
          category_slug: 'lawn',
          price: 4500,
          image_url: 'https://example.com/lawn.jpg',
          is_new: true,
        },
        {
          id: 't2',
          name: 'Winter Khaddar Thaan',
          category_name: 'Khaddar',
          category_slug: 'khaddar',
          price: 8500,
          image_url: 'https://example.com/khaddar.jpg',
        },
        {
          id: 't3',
          name: 'Cotton Suit Pack',
          category_name: 'Cotton',
          category_slug: 'cotton',
          price: 3500,
          image_url: 'https://example.com/cotton.jpg',
        },
      ],
      newArrivalProducts: [],
    });
    expect(sections.unstitched.title).toContain('FABRIC');
    expect(sections.readyToWear.show).toBe(false);
    expect(sections.accessories.show).toBe(false);
    expect(sections.newArrivals.title).toContain('LOTS');
    expect(sections.offers.title).toContain('TRADE');
  });
});
