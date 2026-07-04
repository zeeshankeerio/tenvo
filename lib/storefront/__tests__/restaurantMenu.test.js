import { describe, it, expect } from 'vitest';
import {
  normalizeRestaurantOrderMode,
  restaurantOrderModeToShipping,
  isRestaurantPickupOrder,
  resolveRestaurantShippingCost,
  getRestaurantFeeLabel,
  buildRestaurantOrderNotes,
  buildRestaurantPickupAddress,
  getRestaurantCheckoutSteps,
} from '../restaurantMenu.js';

describe('restaurantMenu order modes', () => {
  it('normalizes aliases to canonical ids', () => {
    expect(normalizeRestaurantOrderMode('takeaway')).toBe('collection');
    expect(normalizeRestaurantOrderMode('pickup')).toBe('collection');
    expect(normalizeRestaurantOrderMode('dinein')).toBe('dine-in');
    expect(normalizeRestaurantOrderMode('delivery')).toBe('delivery');
  });

  it('maps modes to shipping methods', () => {
    expect(restaurantOrderModeToShipping('delivery')).toBe('standard');
    expect(restaurantOrderModeToShipping('collection')).toBe('pickup');
    expect(restaurantOrderModeToShipping('dine-in')).toBe('pickup');
  });

  it('treats collection and dine-in as pickup', () => {
    expect(isRestaurantPickupOrder('collection')).toBe(true);
    expect(isRestaurantPickupOrder('dine-in')).toBe(true);
    expect(isRestaurantPickupOrder('delivery')).toBe(false);
  });

  it('charges delivery fee only for delivery mode', () => {
    expect(
      resolveRestaurantShippingCost({ orderMode: 'delivery', subtotal: 500 })
    ).toBe(150);
    expect(
      resolveRestaurantShippingCost({
        orderMode: 'delivery',
        subtotal: 2500,
        freeShippingThreshold: 2000,
      })
    ).toBe(0);
    expect(resolveRestaurantShippingCost({ orderMode: 'collection' })).toBe(0);
    expect(resolveRestaurantShippingCost({ orderMode: 'dine-in' })).toBe(0);
  });

  it('builds kitchen notes with table for dine-in', () => {
    expect(
      buildRestaurantOrderNotes({
        orderMode: 'dine-in',
        tableNumber: '7',
        orderNotes: 'No onions',
      })
    ).toContain('Table: 7');
    expect(
      buildRestaurantOrderNotes({
        orderMode: 'collection',
        orderNotes: 'Ready in 20 min',
      })
    ).toContain('Takeaway');
  });

  it('builds pickup placeholder addresses', () => {
    const business = { business_name: 'Demo Cafe', city: 'Karachi', country: 'Pakistan' };
    expect(buildRestaurantPickupAddress(business, 'collection').address).toContain('Takeaway');
    expect(buildRestaurantPickupAddress(business, 'dine-in', '5').address).toContain('Table 5');
  });

  it('skips delivery step for pickup modes', () => {
    expect(getRestaurantCheckoutSteps('delivery').map((s) => s.id)).toEqual([
      'information',
      'shipping',
      'payment',
      'review',
    ]);
    expect(getRestaurantCheckoutSteps('dine-in').map((s) => s.id)).toEqual([
      'information',
      'payment',
      'review',
    ]);
    expect(getRestaurantFeeLabel('dine-in')).toBe('Dine-in service');
  });
});
