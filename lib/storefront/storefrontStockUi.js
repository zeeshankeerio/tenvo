import { resolveStorefrontStockStatus } from '@/lib/storefront/storefrontDisplayStock';

/**
 * Client-safe stock state for storefront product cards and add-to-cart.
 * Prefers API-enriched `stock_status` / `display_stock` from enrichStorefrontProductStock.
 *
 * @param {object} product
 * @param {{ stock?: number | null, stock_status?: string } | null} [selectedVariant]
 */
export function getStorefrontStockState(product, selectedVariant = null) {
  const hasVariantStock =
    selectedVariant &&
    selectedVariant.stock !== undefined &&
    selectedVariant.stock !== null;

  const stock = hasVariantStock
    ? selectedVariant.stock
    : product?.display_stock !== undefined && product?.display_stock !== null
      ? product.display_stock
      : product?.stock;

  const stockStatus =
    (hasVariantStock ? selectedVariant.stock_status : null) ||
    product?.stock_status ||
    resolveStorefrontStockStatus(stock);

  const isOutOfStock = stockStatus === 'out_of_stock';
  const isLowStock = stockStatus === 'low_stock';

  return {
    stock,
    stockStatus,
    isOutOfStock,
    isLowStock,
    tracksInventory: stock !== null && stock !== undefined,
  };
}
