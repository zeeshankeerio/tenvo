import { describe, it, expect } from 'vitest';
import {
  buildTopCollections,
  resolveCollectionBadge,
  getTopCollectionsTitle,
} from '../topCollections.js';

describe('topCollections', () => {
  const sampleProducts = [
    {
      id: '1',
      name: 'Embroidered Kurta',
      slug: 'embroidered-kurta',
      category_name: 'Signature Pret',
      category_slug: 'signature-pret',
      is_featured: true,
      sales_count: 50,
      rating: 4.8,
      review_count: 12,
      image_url: 'https://example.com/a.jpg',
    },
    {
      id: '2',
      name: 'Co-Ord Set',
      slug: 'coord-set',
      category_name: 'Co-Ord Set',
      category_slug: 'co-ord-set',
      is_new: true,
      sales_count: 5,
      rating: 4.9,
      review_count: 8,
      image_url: 'https://example.com/b.jpg',
    },
  ];

  const categories = [
    { id: 'c1', slug: 'signature-pret', name: 'Signature Pret', product_count: 12 },
    { id: 'c2', slug: 'co-ord-set', name: 'Co-Ord Set', product_count: 8 },
  ];

  it('builds up to 10 ranked collection cards', () => {
    const items = buildTopCollections({
      products: sampleProducts,
      categories,
      businessDomain: 'demo-boutique',
      businessCategory: 'boutique-fashion',
    });
    expect(items.length).toBe(2);
    expect(items[0].rank).toBe(1);
    expect(items[0].label).toBe('SIGNATURE PRET');
    expect(items[0].href).toContain('category=signature-pret');
    expect(items[0].image).toBeTruthy();
  });

  it('assigns credibility badges from product signals', () => {
    expect(resolveCollectionBadge(sampleProducts[0], 1)).toBe('IN DEMAND');
    expect(resolveCollectionBadge(sampleProducts[1], 2)).toBe('TOP RATED');
  });

  it('localizes section title by country', () => {
    expect(getTopCollectionsTitle('Pakistan')).toBe('Top 10 Collections Nationwide');
    expect(getTopCollectionsTitle('UAE')).toContain('UAE');
  });
});
