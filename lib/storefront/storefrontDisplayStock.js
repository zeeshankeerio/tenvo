/**
 * Storefront display stock — mirrors hub ProductService.resolveDisplayStock
 * for public catalog payloads (headline stock, variant sum, warehouse rows).
 */

function toFiniteNumber(val, fallback = 0) {
  if (val == null) return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {{ stock?: number | null, variants?: Array<{ stock?: number | null }>, locationQty?: number | null }} input
 * @returns {number | null} null when stock tracking is disabled
 */
export function resolveStorefrontDisplayStock({ stock, variants = [], locationQty = null } = {}) {
  const base = stock == null ? null : toFiniteNumber(stock, 0);
  const locSum = locationQty == null ? null : toFiniteNumber(locationQty, 0);
  const vars = Array.isArray(variants) ? variants : [];
  const variantSum =
    vars.length > 0
      ? vars.reduce((sum, v) => sum + toFiniteNumber(v?.stock, 0), 0)
      : null;

  if (base == null && variantSum == null && locSum == null) return null;

  if (vars.length > 0) {
    return Math.max(base ?? 0, variantSum ?? 0, locSum ?? 0);
  }

  if (locSum != null && locSum > 0) {
    return Math.max(base ?? 0, locSum);
  }

  return base;
}

/**
 * @param {number | null | undefined} stock
 */
export function resolveStorefrontStockStatus(stock) {
  if (stock == null || stock === undefined) return 'in_stock';
  if (stock <= 0) return 'out_of_stock';
  if (stock <= 5) return 'low_stock';
  return 'in_stock';
}

/**
 * Normalize catalog product stock for storefront UI and cart (mirrors hub display stock).
 * @param {object} product
 * @param {{ locationQty?: number | null, variants?: Array<{ stock?: number | null }> }} [options]
 */
export function enrichStorefrontProductStock(product, { locationQty = null, variants = null } = {}) {
  if (!product || typeof product !== 'object') return product;

  const vars = variants ?? product.variants ?? [];
  const headlineStock =
    product.display_stock !== undefined && product.display_stock !== null
      ? product.display_stock
      : product.stock;

  const displayStock = resolveStorefrontDisplayStock({
    stock: headlineStock,
    variants: vars,
    locationQty,
  });
  const stockStatus = resolveStorefrontStockStatus(displayStock);

  return {
    ...product,
    display_stock: displayStock,
    stock: displayStock,
    stock_status: stockStatus,
  };
}
