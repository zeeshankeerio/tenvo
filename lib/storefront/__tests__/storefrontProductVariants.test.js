import { describe, expect, it } from 'vitest';
import {
  productHasSelectableVariants,
  resolveStorefrontVariantRequirement,
  variantHasPurchasableAttributes,
} from '../storefrontProductVariants.js';

describe('storefrontProductVariants', () => {
  it('detects purchasable size/color attributes', () => {
    expect(variantHasPurchasableAttributes({ size: 'M', color: 'Red' })).toBe(true);
    expect(variantHasPurchasableAttributes({ attribute_1_value: 'L' })).toBe(true);
    expect(variantHasPurchasableAttributes({ price: 10 })).toBe(false);
  });

  it('requires selection when multiple apparel variants exist', () => {
    const product = {
      has_variants: true,
      variants: [
        { id: 'a', size: 'S', color: 'Black' },
        { id: 'b', size: 'M', color: 'Black' },
      ],
    };
    expect(productHasSelectableVariants(product)).toBe(true);
    expect(resolveStorefrontVariantRequirement(product)).toEqual({
      required: true,
      defaultVariant: null,
      variantCount: 2,
    });
  });

  it('auto-resolves a single variant matrix row', () => {
    const only = { id: 'solo', size: 'M', color: 'White' };
    const product = { has_variants: true, variants: [only] };
    expect(resolveStorefrontVariantRequirement(product)).toEqual({
      required: false,
      defaultVariant: only,
      variantCount: 1,
    });
  });

  it('flags has_variants products with unloaded variants as requiring PDP', () => {
    expect(resolveStorefrontVariantRequirement({ has_variants: true, variants: [] })).toEqual({
      required: true,
      defaultVariant: null,
      variantCount: 0,
    });
  });
});
