/** Next.js cache tag for a tenant's public catalog (products, categories, PDP). */
export function storefrontCatalogTag(businessId) {
  return `storefront-catalog-${String(businessId)}`;
}

/** Next.js cache tag for tenant business shell (layout metadata, settings). */
export function storefrontBusinessTag(domain) {
  return `storefront-business-${String(domain).toLowerCase().trim()}`;
}

/** unstable_cache key prefix — RSC shell (`loadStorefrontBusinessShell`). */
export const STOREFRONT_BUSINESS_SHELL_CACHE_KEY = 'storefront-business-shell';

/** unstable_cache key prefix — API compact resolver (`resolveStorefrontBusiness`). */
export const STOREFRONT_BUSINESS_COMPACT_CACHE_KEY = 'storefront-business-compact';

/** Stable JSON key for product list filters (sorted keys). */
export function serializeStorefrontFilters(filters = {}) {
  const numericKeys = new Set(['page', 'limit', 'minPrice', 'maxPrice', 'year']);
  const sorted = Object.keys(filters)
    .sort()
    .reduce((acc, key) => {
      let value = filters[key];
      if (value === undefined || value === null || value === '') return acc;
      if (numericKeys.has(key) && value !== '') {
        const num = Number(value);
        if (!Number.isNaN(num)) value = num;
      }
      acc[key] = value;
      return acc;
    }, {});
  return JSON.stringify(sorted);
}

/** Fallback TTL when tag invalidation is missed (seconds). */
export const STOREFRONT_CATALOG_REVALIDATE_SEC = 120;

export const STOREFRONT_BUSINESS_REVALIDATE_SEC = 300;
