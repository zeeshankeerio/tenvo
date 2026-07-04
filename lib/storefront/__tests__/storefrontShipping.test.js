import { describe, it, expect } from 'vitest';
import {
  resolveRetailShippingCost,
  resolveStorefrontOrderShippingAmount,
  DEFAULT_STANDARD_SHIPPING_FEE,
  DEFAULT_EXPRESS_SHIPPING_FEE,
} from '@/lib/storefront/storefrontShipping';
import {
  resolveRestaurantShippingCost,
  restaurantOrderModeToShipping,
} from '@/lib/storefront/restaurantMenu';
import { isDigitalPlaceholderAddress } from '@/lib/storefront/digitalProducts';

describe('storefrontShipping', () => {
  it('retail standard fee below threshold', () => {
    expect(
      resolveRetailShippingCost({ subtotal: 500, shippingMethod: 'standard', freeShippingThreshold: 2000 })
    ).toBe(DEFAULT_STANDARD_SHIPPING_FEE);
  });

  it('retail free shipping at threshold', () => {
    expect(
      resolveRetailShippingCost({ subtotal: 2500, shippingMethod: 'standard', freeShippingThreshold: 2000 })
    ).toBe(0);
  });

  it('retail express fee', () => {
    expect(resolveRetailShippingCost({ subtotal: 100, shippingMethod: 'express' })).toBe(
      DEFAULT_EXPRESS_SHIPPING_FEE
    );
  });

  it('retail pickup is free', () => {
    expect(resolveRetailShippingCost({ subtotal: 100, shippingMethod: 'pickup' })).toBe(0);
  });

  it('digital orders have zero shipping', () => {
    expect(
      resolveStorefrontOrderShippingAmount({
        digitalOnlyOrder: true,
        subtotal: 5000,
        shippingMethod: 'express',
      })
    ).toBe(0);
  });

  it('restaurant delivery recalculates server-side', () => {
    const amount = resolveStorefrontOrderShippingAmount({
      isRestaurant: true,
      normalizedRestaurantMode: 'delivery',
      subtotal: 500,
      shippingMethod: 'standard',
      settings: { freeShippingThreshold: 2000 },
      resolveRestaurantShippingCost,
      restaurantOrderModeToShipping,
    });
    expect(amount).toBe(150);
  });

  it('detects digital placeholder addresses', () => {
    expect(isDigitalPlaceholderAddress({ city: 'Digital', address: 'Digital delivery' })).toBe(true);
    expect(isDigitalPlaceholderAddress({ city: 'Karachi', address: 'Street 1' })).toBe(false);
  });
});
