import { isDemoStoreDomain } from '@/lib/storefront/elevatedStorefrontTenant';
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { isRestaurantElevatedStore } from '@/lib/storefront/restaurantStorefront';
import { RESTAURANT_SEED_PRODUCTS } from './restaurantDemoCatalog.js';

/**
 * @param {string | null | undefined} businessDomain
 * @param {string | null | undefined} businessCategory
 */
export function shouldUseRestaurantSeedCatalog(businessDomain, businessCategory) {
  if (isDemoStoreDomain(businessDomain)) return true;
  return isRestaurantElevatedStore(businessCategory);
}

/**
 * @param {typeof RESTAURANT_SEED_PRODUCTS[number]} row
 */
export function mapRestaurantSeedRowToStorefrontProduct(row) {
  const name = String(row.name || 'Menu item');
  return {
    id: row.sku || name.toLowerCase().replace(/\s+/g, '-'),
    slug: null,
    sku: row.sku,
    name,
    price: row.price,
    compare_price: row.compare_price,
    compare_at_price: row.compare_price,
    image_url: row.image_url,
    category_name: row.category,
    category: row.category,
    brand: row.brand,
    stock: row.stock ?? 999,
    is_featured: Boolean(row.is_featured),
    domain_data: row.domain_data || {},
    catalog_preview: true,
  };
}

/**
 * @param {object[]} products
 */
export function enrichRestaurantProductsWithSeedImages(products) {
  const bySku = new Map(
    RESTAURANT_SEED_PRODUCTS.map((row) => [String(row.sku || '').toLowerCase(), row])
  );
  const byName = new Map(
    RESTAURANT_SEED_PRODUCTS.map((row) => [String(row.name || '').trim().toLowerCase(), row])
  );

  return (products || []).map((p) => {
    if (p.image_url) return p;
    const seed =
      bySku.get(String(p.sku || '').toLowerCase()) ||
      byName.get(String(p.name || '').trim().toLowerCase());
    if (!seed?.image_url) return p;
    return { ...p, image_url: seed.image_url };
  });
}

/**
 * Demo kitchen: merge DB menu with archive seed for full homepage rails.
 * @param {object[]} dbProducts
 * @param {string | null | undefined} businessDomain
 * @param {string | null | undefined} [businessCategory]
 */
export function resolveRestaurantShowcaseProducts(dbProducts, businessDomain, businessCategory) {
  const list = Array.isArray(dbProducts) ? dbProducts.filter(Boolean) : [];
  if (!shouldUseRestaurantSeedCatalog(businessDomain, businessCategory)) {
    return list;
  }

  if (list.length >= 12) {
    return enrichRestaurantProductsWithSeedImages(list);
  }

  const seedCards = RESTAURANT_SEED_PRODUCTS.map(mapRestaurantSeedRowToStorefrontProduct);
  if (!list.length) {
    return seedCards;
  }

  const seen = new Set(list.map((p) => String(p.sku || p.name || '').toLowerCase()));
  const merged = [...list];
  for (const seed of seedCards) {
    const key = String(seed.sku || seed.name || '').toLowerCase();
    if (seen.has(key)) continue;
    merged.push(seed);
    seen.add(key);
  }
  return merged;
}
