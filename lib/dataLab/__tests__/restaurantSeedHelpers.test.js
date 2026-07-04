import { describe, it, expect } from 'vitest';
import {
  resolveRestaurantShowcaseProducts,
  shouldUseRestaurantSeedCatalog,
  mapRestaurantSeedRowToStorefrontProduct,
} from '../restaurantSeedHelpers.js';
import { RESTAURANT_SEED_PRODUCTS } from '../restaurantDemoCatalog.js';

describe('restaurantSeedHelpers', () => {
  it('uses seed catalog for demo restaurant domains', () => {
    expect(shouldUseRestaurantSeedCatalog('demo-restaurant', 'restaurant-cafe')).toBe(true);
    expect(shouldUseRestaurantSeedCatalog('my-shop', 'retail')).toBe(false);
  });

  it('returns full seed when DB catalog is empty', () => {
    const products = resolveRestaurantShowcaseProducts([], 'demo-restaurant', 'restaurant-cafe');
    expect(products.length).toBeGreaterThanOrEqual(RESTAURANT_SEED_PRODUCTS.length);
    expect(products[0].catalog_preview).toBe(true);
  });

  it('maps seed rows to storefront shape', () => {
    const row = mapRestaurantSeedRowToStorefrontProduct(RESTAURANT_SEED_PRODUCTS[0]);
    expect(row.name).toBeTruthy();
    expect(row.image_url).toBeTruthy();
    expect(row.image_url).toContain('services.eatx.pk');
    expect(row.catalog_preview).toBe(true);
  });
});
