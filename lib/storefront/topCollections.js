/**
 * Build Zellbury-style "Top 10 Collections" cards from live catalog data.
 */
import { getEffectiveProductImageUrl } from './productImageFallback';

/**
 * @typedef {object} TopCollectionItem
 * @property {number} rank
 * @property {string} label
 * @property {string | null} badge
 * @property {string} image
 * @property {string} href
 * @property {string} productId
 */

/**
 * @param {object} product
 * @param {number} rank
 * @returns {string | null}
 */
export function resolveCollectionBadge(product, rank) {
  const sales = Number(product.sales_count) || 0;
  const rating = Number(product.rating) || 0;
  const reviews = Number(product.review_count) || 0;
  const stock = product.stock;

  if (product.is_featured && sales > 3) return 'IN DEMAND';
  if (rating >= 4.5 && reviews > 0) return 'TOP RATED';
  if (product.is_new) return 'NEW ARRIVAL';
  if (product.compare_price && Number(product.compare_price) > Number(product.price)) return 'HOT';
  if (stock != null && stock > 0 && stock <= 5) return 'FEW LEFT';
  if (sales > 15) return 'BEST SELLER';
  if (rank === 1) return 'MOST LOVED';
  return null;
}

/**
 * @param {object} product
 * @param {Array<{ id: string; slug: string; name: string }>} categories
 */
function matchesCategory(product, cat) {
  if (product.category_id && cat.id && product.category_id === cat.id) return true;
  if (product.category_slug && cat.slug && product.category_slug === cat.slug) return true;
  const pCat = String(product.category_name || product.category || '').trim().toLowerCase();
  return pCat && pCat === String(cat.name || '').trim().toLowerCase();
}

/**
 * @param {{
 *   products: object[];
 *   categories?: Array<{ id?: string; slug: string; name: string; product_count?: number; image_url?: string }>;
 *   businessDomain: string;
 *   businessCategory?: string;
 *   max?: number;
 * }} args
 * @returns {TopCollectionItem[]}
 */
export function buildTopCollections({
  products = [],
  categories = [],
  businessDomain,
  businessCategory,
  max = 10,
}) {
  const base = `/store/${businessDomain}`;
  const usedProductIds = new Set();
  /** @type {TopCollectionItem[]} */
  const items = [];

  const sortedProducts = [...products].sort((a, b) => {
    const salesA = Number(a.sales_count) || 0;
    const salesB = Number(b.sales_count) || 0;
    if (salesB !== salesA) return salesB - salesA;
    const ratingA = Number(a.rating) || 0;
    const ratingB = Number(b.rating) || 0;
    if (ratingB !== ratingA) return ratingB - ratingA;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });

  const sortedCategories = [...categories].sort(
    (a, b) => (Number(b.product_count) || 0) - (Number(a.product_count) || 0)
  );

  for (const cat of sortedCategories) {
    if (items.length >= max) break;
    const catProducts = sortedProducts.filter((p) => matchesCategory(p, cat));
    if (!catProducts.length) continue;
    const best = catProducts[0];
    if (usedProductIds.has(best.id)) continue;
    usedProductIds.add(best.id);
    const rank = items.length + 1;
    items.push({
      rank,
      label: String(cat.name || 'Collection').toUpperCase(),
      badge: resolveCollectionBadge(best, rank),
      image:
        getEffectiveProductImageUrl(best, businessCategory) ||
        cat.image_url ||
        getEffectiveProductImageUrl({ name: cat.name }, businessCategory),
      href: `${base}/products?category=${encodeURIComponent(cat.slug)}`,
      productId: best.id,
    });
  }

  for (const product of sortedProducts) {
    if (items.length >= max) break;
    if (usedProductIds.has(product.id)) continue;
    usedProductIds.add(product.id);
    const rank = items.length + 1;
    const labelSource = product.category_name || product.category || product.name || 'Featured';
    items.push({
      rank,
      label: String(labelSource).toUpperCase().slice(0, 28),
      badge: resolveCollectionBadge(product, rank),
      image: getEffectiveProductImageUrl(product, businessCategory),
      href: product.slug
        ? `${base}/products/${product.slug}`
        : `${base}/products?sort=popularity`,
      productId: product.id,
    });
  }

  return items;
}

/**
 * @param {string | null | undefined} country
 */
export function getTopCollectionsTitle(country) {
  const c = String(country || '').trim().toLowerCase();
  if (c.includes('pakistan')) return 'Top 10 Collections Nationwide';
  if (c.includes('uae') || c.includes('emirates')) return 'Top 10 Collections Across UAE';
  if (c.includes('saudi')) return 'Top 10 Collections Kingdom-wide';
  return 'Top 10 Collections';
}
