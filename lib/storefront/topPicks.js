/**
 * Top Picks for You, product selection for editorial fashion storefronts.
 */

/**
 * @param {object[]} featured
 * @param {object[]} popular
 * @param {number} [limit]
 */
export function buildTopPicksProducts(featured = [], popular = [], limit = 12) {
  const seen = new Set();
  /** @type {object[]} */
  const merged = [];

  for (const product of [...featured, ...popular]) {
    if (!product?.id || seen.has(product.id)) continue;
    seen.add(product.id);
    merged.push(product);
    if (merged.length >= limit) break;
  }

  return merged;
}

/**
 * @param {object} product
 */
export function getTopPickMetaLine(product) {
  const parts = [];
  const category = product.category_name || product.category;
  if (category) parts.push(String(category).trim());
  if (product.brand?.trim()) parts.push(product.brand.trim());
  if (parts.length) return parts.join(' | ');
  return 'Curated pick';
}

/**
 * @param {object} product
 * @returns {number}
 */
export function getTopPickDiscountPercent(product) {
  const price = Number(product.price);
  const compare = Number(product.compare_price);
  if (!compare || compare <= price) return 0;
  return Math.round(((compare - price) / compare) * 100);
}

/**
 * @param {object} product
 * @returns {string | null}
 */
export function getTopPickStatusBadge(product) {
  if (getTopPickDiscountPercent(product) > 0) return null;
  if (product.is_new) return 'New arrival';
  const stock = product.stock;
  if (stock != null && stock > 0 && stock <= 8) return 'Restocked';
  if (product.is_featured) return 'Trending';
  return null;
}

export const TOP_PICKS_COPY = {
  title: 'Top Picks for You',
  subtitle: "We've handpicked the styles we know you'll love. Explore what's trending now.",
};
