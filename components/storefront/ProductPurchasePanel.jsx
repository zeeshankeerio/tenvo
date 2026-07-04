'use client';

import { useState } from 'react';
import { ProductVariants } from '@/components/storefront/ProductVariants';
import { AddToCartSection } from '@/components/storefront/AddToCartSection';
import { productHasSelectableVariants } from '@/lib/storefront/storefrontProductVariants';

/**
 * Shared variant selection + add-to-cart for product detail pages.
 */
export function ProductPurchasePanel({ product, businessDomain }) {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const hasVariants = productHasSelectableVariants(product);

  return (
    <>
      {hasVariants ? (
        <ProductVariants
          product={product}
          businessDomain={businessDomain}
          onVariantSelect={setSelectedVariant}
        />
      ) : null}
      <AddToCartSection
        product={product}
        businessDomain={businessDomain}
        selectedVariant={selectedVariant}
      />
    </>
  );
}
