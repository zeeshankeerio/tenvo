/**
 * Pharmacy demo seed helpers — image enrich and showcase backfill for elevated storefronts.
 */
import { PHARMACY_SEED_PRODUCTS } from './pharmacyDemoCatalog.js';
import { isDemoStoreDomain } from '@/lib/storefront/elevatedStorefrontTenant';
import { isStorefrontProductUuid } from '@/lib/utils/storefrontProductRef';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { isPrescriptionRequiredProduct } from '@/lib/storefront/pharmacyProducts';
import { slugifyCategoryName } from '@/lib/utils/registrationSeed';

/** @type {Map<string, object>} */
const seedBySku = new Map(
  PHARMACY_SEED_PRODUCTS.map((row) => [String(row.sku || '').toLowerCase(), row])
);

/** @type {Map<string, object>} */
const seedByName = new Map(
  PHARMACY_SEED_PRODUCTS.map((row) => [String(row.name || '').toLowerCase(), row])
);

/**
 * @param {object} product
 */
export function findPharmacySeedRow(product) {
  const sku = String(product?.sku || '').toLowerCase();
  if (sku && seedBySku.has(sku)) return seedBySku.get(sku);
  const name = String(product?.name || '').toLowerCase();
  if (name && seedByName.has(name)) return seedByName.get(name);
  return null;
}

/**
 * Enrich live DB rows with seed images/metadata (never replaces UUID ids).
 * @param {object[]} products
 * @param {string | null | undefined} businessDomain
 * @param {string | null | undefined} businessCategory
 */
export function enrichPharmacyProductsWithSeed(products = [], businessDomain, businessCategory = 'pharmacy') {
  return (products || []).map((product) => {
    if (!isStorefrontProductUuid(product?.id)) return product;

    const seed = findPharmacySeedRow(product);
    const image =
      product.image_url?.trim() ||
      getEffectiveProductImageUrl(product, businessCategory) ||
      seed?.image_url ||
      '';

    return {
      ...product,
      image_url: image || product.image_url,
      domain_data: {
        ...(seed?.domain_data || {}),
        ...(product.domain_data || {}),
      },
      compare_price: product.compare_price ?? product.compare_at_price ?? seed?.compare_price ?? null,
      brand: product.brand || seed?.brand || product.brand,
    };
  });
}

/**
 * Demo showcase: DB UUID rows only, enriched from seed catalog when images/domain_data are thin.
 * @param {object[]} dbProducts
 * @param {string | null | undefined} businessDomain
 * @param {string | null | undefined} businessCategory
 */
export function resolvePharmacyShowcaseProducts(dbProducts = [], businessDomain, businessCategory = 'pharmacy') {
  const live = (dbProducts || []).filter((p) => isStorefrontProductUuid(p?.id));
  if (!live.length) return [];
  return enrichPharmacyProductsWithSeed(live, businessDomain, businessCategory);
}

/**
 * @param {object[]} products
 * @param {string | null | undefined} businessDomain
 * @param {string | null | undefined} businessCategory
 */
export function buildPharmacyShopCatalog(products = [], businessDomain, businessCategory = 'pharmacy') {
  const enriched = enrichPharmacyProductsWithSeed(products, businessDomain, businessCategory);
  if (isDemoStoreDomain(businessDomain) && enriched.length < 12) {
    const existingSkus = new Set(enriched.map((p) => String(p.sku || p.name).toLowerCase()));
    for (const seed of PHARMACY_SEED_PRODUCTS) {
      const key = String(seed.sku || seed.name).toLowerCase();
      if (existingSkus.has(key)) continue;
      enriched.push({
        ...seed,
        id: `catalog_preview_${key}`,
        catalog_preview: true,
        slug: slugifyCategoryName(seed.name),
        category_name: seed.category,
      });
      if (enriched.length >= 24) break;
    }
  }
  return enriched;
}

/**
 * Client-side pagination helper for merged pharmacy catalogs.
 * @param {object[]} products
 * @param {object} filters
 */
export function paginatePharmacyShopCatalog(products = [], filters = {}) {
  let rows = [...(products || [])];

  if (filters.category) {
    const cat = String(filters.category).toLowerCase();
    rows = rows.filter((p) => {
      const slug = slugifyCategoryName(p.category_name || p.category || '');
      return slug === cat || slug.includes(cat) || cat.includes(slug);
    });
  }

  if (filters.search) {
    const q = String(filters.search).toLowerCase();
    rows = rows.filter((p) => {
      const meta = p.domain_data || {};
      const generic = meta.genericname || meta.generic_name || '';
      return (
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.brand || '').toLowerCase().includes(q) ||
        String(generic).toLowerCase().includes(q) ||
        String(p.sku || '').toLowerCase().includes(q)
      );
    });
  }

  if (filters.onSale) {
    rows = rows.filter((p) => {
      const compare = p.compare_price ?? p.compare_at_price;
      return compare && Number(compare) > Number(p.price);
    });
  }

  if (filters.rxOnly) {
    rows = rows.filter((p) => isPrescriptionRequiredProduct(p));
  } else if (filters.otcOnly) {
    rows = rows.filter((p) => !isPrescriptionRequiredProduct(p));
  }

  const sort = filters.sort || 'featured';
  if (sort === 'price-asc') rows.sort((a, b) => Number(a.price) - Number(b.price));
  else if (sort === 'price-desc') rows.sort((a, b) => Number(b.price) - Number(a.price));
  else if (sort === 'newest') rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  else if (sort === 'popularity') rows.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Number(filters.limit) || 24);
  const start = (page - 1) * limit;
  const slice = rows.slice(start, start + limit);

  return {
    products: slice,
    total: rows.length,
    hasMore: start + limit < rows.length,
  };
}
