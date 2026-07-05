import 'server-only';

import pool from '@/lib/db';
import { actionFailure } from '@/lib/actions/_shared/result';
import {
  fetchStorefrontProductsOnClient,
  fetchStorefrontCategoriesOnClient,
} from '@/lib/actions/storefront/products';
import { cacheStorefrontRead } from '@/lib/storefront/storefrontCachedRead';
import {
  storefrontCatalogTag,
  STOREFRONT_CATALOG_REVALIDATE_SEC,
} from '@/lib/storefront/storefrontCacheTags';

const EMPTY_PRODUCTS = { success: false, products: [], total: 0 };

/**
 * Build a minimal query plan for the storefront homepage (one DB connection).
 * @param {{
 *   editorialHero?: boolean;
 *   dealershipHero?: boolean;
 *   marketplaceHero?: boolean;
 *   pharmacyElevatedHero?: boolean;
 *   furnitureElevatedHero?: boolean;
 *   restaurantElevatedHero?: boolean;
 *   fitnessElevatedHero?: boolean;
 *   supermarketElevatedHero?: boolean;
 *   autoPartsHero?: boolean;
 *   needsCatalogBackfill?: boolean;
 *   restaurantDemo?: boolean;
 * }} flags
 */
export function buildStoreHomeCatalogPlan(flags = {}) {
  const needPopularity =
    flags.editorialHero ||
    flags.pharmacyElevatedHero ||
    flags.furnitureElevatedHero ||
    flags.restaurantElevatedHero ||
    flags.fitnessElevatedHero ||
    flags.supermarketElevatedHero ||
    flags.needsCatalogBackfill;

  let popularityLimit = 48;
  if (flags.editorialHero) popularityLimit = 80;
  if (flags.restaurantElevatedHero && flags.restaurantDemo) popularityLimit = 500;

  const needFeatured = true;

  let featuredLimit = 12;
  if (flags.dealershipHero) featuredLimit = Math.max(featuredLimit, 24);
  if (flags.marketplaceHero) featuredLimit = Math.max(featuredLimit, 40);
  if (flags.autoPartsHero) featuredLimit = Math.max(featuredLimit, 48);

  return {
    needFeatured,
    featuredLimit,
    needNewest: true,
    newestLimit: 16,
    needOnSale: true,
    onSaleLimit: 12,
    needPopularity,
    popularityLimit,
    needCategories: true,
  };
}

function planCacheKey(plan) {
  return [
    plan.needFeatured ? `f${plan.featuredLimit}` : 'f0',
    plan.needNewest ? `n${plan.newestLimit}` : 'n0',
    plan.needOnSale ? `s${plan.onSaleLimit}` : 's0',
    plan.needPopularity ? `p${plan.popularityLimit}` : 'p0',
    plan.needCategories ? 'c1' : 'c0',
  ].join('|');
}

/**
 * @param {import('@/lib/actions/_shared/result').ActionResult} result
 */
function asProductSlice(result, limit) {
  if (!result?.success) return EMPTY_PRODUCTS;
  const products = (result.products || []).slice(0, limit);
  return {
    success: true,
    products,
    total: result.total ?? products.length,
  };
}

/**
 * Fetch all homepage catalog rails on a single Postgres connection.
 * @param {string} businessId
 * @param {ReturnType<typeof buildStoreHomeCatalogPlan>} plan
 */
async function fetchStoreHomeCatalogUncached(businessId, plan) {
  if (!businessId) {
    return actionFailure('INVALID_INPUT', 'Business ID is required');
  }

  const client = await pool.connect();

  try {
    const featured = plan.needFeatured
      ? await fetchStorefrontProductsOnClient(client, businessId, {
          sort: 'featured',
          limit: plan.featuredLimit,
        })
      : EMPTY_PRODUCTS;

    const newest = plan.needNewest
      ? await fetchStorefrontProductsOnClient(client, businessId, {
          sort: 'newest',
          limit: plan.newestLimit,
        })
      : EMPTY_PRODUCTS;

    const onSale = plan.needOnSale
      ? await fetchStorefrontProductsOnClient(client, businessId, {
          sort: 'featured',
          limit: plan.onSaleLimit,
          onSale: true,
        })
      : EMPTY_PRODUCTS;

    const popularity = plan.needPopularity
      ? await fetchStorefrontProductsOnClient(client, businessId, {
          sort: 'popularity',
          limit: plan.popularityLimit,
        })
      : EMPTY_PRODUCTS;

    const categories = plan.needCategories
      ? await fetchStorefrontCategoriesOnClient(client, businessId)
      : { success: false, categories: [] };

    return {
      success: true,
      featured,
      newest,
      onSale,
      popularity,
      categories,
    };
  } catch (error) {
    console.error('[fetchStoreHomeCatalogUncached] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Cached homepage catalog bundle (single connection per cache miss).
 * @param {string} businessId
 * @param {ReturnType<typeof buildStoreHomeCatalogPlan>} plan
 */
export async function getStoreHomeCatalog(businessId, plan) {
  const cacheKey = planCacheKey(plan);

  return cacheStorefrontRead(
    () => fetchStoreHomeCatalogUncached(businessId, plan),
    ['storefront-home-catalog', String(businessId), cacheKey],
    {
      tags: [storefrontCatalogTag(businessId), 'storefront-catalog'],
      revalidate: STOREFRONT_CATALOG_REVALIDATE_SEC,
    }
  );
}

/**
 * Map bundled catalog results to the legacy per-rail shape used by the store homepage.
 * @param {Awaited<ReturnType<typeof getStoreHomeCatalog>>} bundle
 * @param {ReturnType<typeof buildStoreHomeCatalogPlan>} plan
 * @param {{
 *   editorialHero?: boolean;
 *   dealershipHero?: boolean;
 *   marketplaceHero?: boolean;
 *   pharmacyElevatedHero?: boolean;
 *   furnitureElevatedHero?: boolean;
 *   restaurantElevatedHero?: boolean;
 *   fitnessElevatedHero?: boolean;
 *   supermarketElevatedHero?: boolean;
 *   autoPartsHero?: boolean;
 *   needsCatalogBackfill?: boolean;
 * }} flags
 */
export function mapStoreHomeCatalogRails(bundle, plan, flags) {
  if (!bundle?.success) {
    const empty = EMPTY_PRODUCTS;
    return {
      featuredResult: empty,
      newArrivalsResult: empty,
      categoriesResult: { success: false, categories: [] },
      onSaleResult: empty,
      topCatalogResult: empty,
      catalogSnapshotResult: empty,
      dealershipCatalogResult: empty,
      marketplaceCatalogResult: empty,
      pharmacyCatalogResult: empty,
      furnitureCatalogResult: empty,
      restaurantCatalogResult: empty,
      fitnessCatalogResult: empty,
      supermarketCatalogResult: empty,
      autoPartsCatalogResult: empty,
      catalogBackfillResult: empty,
    };
  }

  const featuredResult = asProductSlice(bundle.featured, 12);
  const newArrivalsResult = bundle.newest?.success ? bundle.newest : EMPTY_PRODUCTS;
  const categoriesResult = bundle.categories?.success
    ? bundle.categories
    : { success: false, categories: [] };
  const onSaleResult = bundle.onSale?.success ? bundle.onSale : EMPTY_PRODUCTS;
  const popularity = bundle.popularity?.success ? bundle.popularity : EMPTY_PRODUCTS;

  return {
    featuredResult,
    newArrivalsResult,
    categoriesResult,
    onSaleResult,
    topCatalogResult: flags.editorialHero ? asProductSlice(popularity, 40) : EMPTY_PRODUCTS,
    catalogSnapshotResult: flags.editorialHero ? asProductSlice(popularity, 80) : EMPTY_PRODUCTS,
    dealershipCatalogResult: flags.dealershipHero ? asProductSlice(bundle.featured, 24) : EMPTY_PRODUCTS,
    marketplaceCatalogResult: flags.marketplaceHero ? asProductSlice(bundle.featured, 40) : EMPTY_PRODUCTS,
    pharmacyCatalogResult: flags.pharmacyElevatedHero ? asProductSlice(popularity, 48) : EMPTY_PRODUCTS,
    furnitureCatalogResult: flags.furnitureElevatedHero ? asProductSlice(popularity, 48) : EMPTY_PRODUCTS,
    restaurantCatalogResult: flags.restaurantElevatedHero ? popularity : EMPTY_PRODUCTS,
    fitnessCatalogResult: flags.fitnessElevatedHero ? asProductSlice(popularity, 48) : EMPTY_PRODUCTS,
    supermarketCatalogResult: flags.supermarketElevatedHero ? asProductSlice(popularity, 48) : EMPTY_PRODUCTS,
    autoPartsCatalogResult: flags.autoPartsHero ? asProductSlice(bundle.featured, 48) : EMPTY_PRODUCTS,
    catalogBackfillResult: flags.needsCatalogBackfill ? asProductSlice(popularity, 12) : EMPTY_PRODUCTS,
  };
}
