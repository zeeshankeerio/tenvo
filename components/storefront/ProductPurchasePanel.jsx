'use client';

import { useState } from 'react';
import { ProductVariants } from '@/components/storefront/ProductVariants';
import { AddToCartSection } from '@/components/storefront/AddToCartSection';

/**
 * Shared variant selection + add-to-cart for product detail pages.
 */
export function ProductPurchasePanel({ product, businessDomain }) {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const hasVariants = product.has_variants && Array.isArray(product.variants) && product.variants.length > 0;

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
