import { isDemoStoreDomain } from '@/lib/storefront/elevatedStorefrontTenant';
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { isRestaurantElevatedStore } from '@/lib/storefront/restaurantStorefront';
import { RESTAURANT_SEED_PRODUCTS, RESTAURANT_SEED_CATEGORIES } from './restaurantDemoCatalog.js';

const seedCategoryBySlug = new Map(
  RESTAURANT_SEED_CATEGORIES.map((row) => [String(row.slug || '').toLowerCase(), row])
);

/**
 * Backfill category hero images from Roll Inn seed when DB rows omit image_url.
 * @param {object[]} categories
 */
export function enrichRestaurantCategoriesWithSeedImages(categories) {
  return (categories || []).map((cat) => {
    if (cat?.image_url) return cat;
    const seed = seedCategoryBySlug.get(String(cat?.slug || '').toLowerCase());
    if (!seed?.image_url) return cat;
    return { ...cat, image_url: seed.image_url };
  });
}

/**
 * Ensure cuisine nav rows have seed CDN images when slug/label matches Roll Inn catalog.
 * @param {object[]} items
 */
export function enrichRestaurantCuisineNavImages(items) {
  return (items || []).map((item) => {
    if (item?.image) return item;
    const slugKey = String(item?.slug || item?.id || '').toLowerCase();
    const seedBySlug = seedCategoryBySlug.get(slugKey);
    if (seedBySlug?.image_url) {
      return { ...item, image: seedBySlug.image_url };
    }
    const labelKey = String(item?.label || '').trim().toLowerCase();
    const seedByLabel = RESTAURANT_SEED_CATEGORIES.find(
      (row) => String(row.name || '').trim().toLowerCase() === labelKey
    );
    if (seedByLabel?.image_url) {
      return { ...item, image: seedByLabel.image_url };
    }
    return item;
  });
}

/**
 * Full demo category rail from Roll Inn seed (accurate images + slugs).
 * @param {string} storeBase
 */
export function buildRestaurantDemoCuisineIcons(storeBase) {
  const productsUrl = `${storeBase}/products`;
  return RESTAURANT_SEED_CATEGORIES.filter((row) => row.slug && row.name).map((row) => ({
    id: row.slug,
    label: row.name,
    slug: row.slug,
    image: row.image_url || '',
    href:
      row.slug === 'deals'
        ? `${productsUrl}?onSale=true`
        : `${productsUrl}?category=${encodeURIComponent(row.slug)}`,
  }));
}

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
