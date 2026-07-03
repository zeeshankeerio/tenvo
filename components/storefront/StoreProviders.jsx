'use client';

import { StorefrontProvider } from '@/lib/context/StorefrontContext';
import { CartProvider } from '@/lib/context/CartContext';

/**
 * Single client boundary for storefront context + cart so nested client components
 * (ProductGrid, ProductCard, CartDrawer) always share one provider tree during SSR/streaming.
 */
export function StoreProviders({ business, settings, categories, plan, children }) {
  return (
    <StorefrontProvider business={business} settings={settings} categories={categories} plan={plan}>
      <CartProvider businessId={business?.id}>{children}</CartProvider>
    </StorefrontProvider>
  );
}
