#!/usr/bin/env node
/**
 * Sanity-check gym-fitness archive seed wiring.
 */
import { FITNESS_SEED_CATEGORIES, FITNESS_SEED_PRODUCTS } from '../lib/dataLab/fitnessDemoCatalog.js';
import {
  buildFitnessCategoryIconsFromSeed,
  buildFitnessPromoBannersFromSeed,
  enrichFitnessCategoryNavImages,
  resolveFitnessArchiveCategoryImage,
  resolveFitnessShowcaseProducts,
  slugifyFitnessCategory,
} from '../lib/dataLab/fitnessSeedHelpers.js';
import { isStorefrontProductUuid } from '../lib/utils/storefrontProductRef.js';
import { buildRichSeedItems, hasRichCatalog } from '../lib/dataLab/richProductCatalog.js';
import { FITNESS_ASSETS, isFitnessElevatedStore, buildFitnessSupplementShowcase, buildFitnessServiceCatalog, buildFitnessMembershipCatalog, buildFitnessShopCatalog, isFitnessBookableProduct, isFitnessShopCatalogProduct, filterFitnessShopCategories, paginateFitnessShopCatalog, resolveFitnessQuickSearchTerms, resolveFitnessTrainers } from '../lib/storefront/fitnessStorefront.js';
import { mapFitnessSeedRowToStorefrontProduct } from '../lib/dataLab/fitnessSeedHelpers.js';
import { shouldSeedRichCatalogOnRegistration } from '../lib/onboarding/registrationRichVerticals.js';
import { resolveRegistrationCategories } from '../lib/onboarding/registrationCategoryPresets.js';

const errors = [];

if (!hasRichCatalog('gym-fitness')) errors.push('gym-fitness missing from RICH_PRODUCT_CATALOG');
if (!shouldSeedRichCatalogOnRegistration('gym-fitness', 'PK')) {
  errors.push('gym-fitness not in registration rich catalog verticals');
}
if (!isFitnessElevatedStore('gym-fitness')) errors.push('gym-fitness not elevated storefront');

if (FITNESS_SEED_PRODUCTS.length < 40) {
  errors.push(`seed catalog too small (${FITNESS_SEED_PRODUCTS.length})`);
}
if (FITNESS_SEED_CATEGORIES.length < 10) {
  errors.push(`seed categories too few (${FITNESS_SEED_CATEGORIES.length})`);
}

const skus = new Set();
for (const p of FITNESS_SEED_PRODUCTS) {
  const key = String(p.sku || p.name).toLowerCase();
  if (skus.has(key)) errors.push(`duplicate sku/name: ${key}`);
  skus.add(key);
  if (!p.image_url || !String(p.image_url).startsWith('https://')) {
    errors.push(`missing image_url: ${p.name}`);
  }
  if (!p.price || Number(p.price) <= 0) errors.push(`invalid price: ${p.name}`);
}

const membership = FITNESS_SEED_PRODUCTS.filter((p) => p.category === 'Memberships');
if (membership.length < 8) errors.push(`expected 8+ membership packages, got ${membership.length}`);

const gents = membership.filter((p) => p.domain_data?.gender === 'male');
const ladies = membership.filter((p) => p.domain_data?.gender === 'female');
if (gents.length < 4) errors.push(`expected 4 gents packages, got ${gents.length}`);
if (ladies.length < 4) errors.push(`expected 4 ladies packages, got ${ladies.length}`);

const supplements = FITNESS_SEED_PRODUCTS.filter((p) =>
  /protein|vitamin|creatine|whey|bcaa|omega|pre/i.test(String(p.name))
);
if (supplements.length < 20) {
  errors.push(`too few supplement SKUs (${supplements.length})`);
}

const archiveImages = FITNESS_SEED_PRODUCTS.filter((p) =>
  /synergize\.pk|website-files\.com/i.test(String(p.image_url))
);
if (archiveImages.length < 30) {
  errors.push(`expected archive CDN images, got ${archiveImages.length}`);
}

if (!FITNESS_ASSETS.heroAthlete?.includes('website-files.com')) {
  errors.push('FITNESS_ASSETS.heroAthlete missing webflow archive URL');
}

const regCategories = resolveRegistrationCategories('gym-fitness', []);
if (regCategories.length < FITNESS_SEED_CATEGORIES.length) {
  errors.push('registration categories shorter than seed categories');
}

const icons = buildFitnessCategoryIconsFromSeed('/store/demo-fitness');
if (icons.length < 6) errors.push(`category icons too few (${icons.length})`);
for (const icon of icons) {
  if (!icon.image) errors.push(`category icon missing image: ${icon.id}`);
}

const promos = buildFitnessPromoBannersFromSeed('/store/demo-fitness');
if (promos.length < 2) errors.push('promo banners too few');

const registrationItems = buildRichSeedItems({
  businessId: 'verify-business-id',
  domainKey: 'gym-fitness',
  countryIso: 'PK',
  taxRate: 16,
  brands: ['Tenvo Fitness'],
});

if (registrationItems.length !== FITNESS_SEED_PRODUCTS.length) {
  errors.push(
    `buildRichSeedItems count ${registrationItems.length} !== seed ${FITNESS_SEED_PRODUCTS.length}`
  );
}

const slugSet = new Set(FITNESS_SEED_CATEGORIES.map(slugifyFitnessCategory));
if (!slugSet.has('whey-protein') || !slugSet.has('memberships')) {
  errors.push('category slug mapping failed');
}

const memTile = resolveFitnessArchiveCategoryImage('Membership Plans', 'membership-plans');
if (!memTile?.startsWith('https://')) {
  errors.push('Membership Plans category tile should resolve archive PNG');
}

const enrichedTiles = enrichFitnessCategoryNavImages(
  [{ id: 'membership-plans', label: 'Membership Plans', slug: 'membership-plans', image: '', href: '/store/x/products?category=membership-plans' }],
  [],
  'gym-fitness'
);
if (!enrichedTiles[0]?.image?.startsWith('https://')) {
  errors.push('enrichFitnessCategoryNavImages should backfill category tile PNG');
}

const dbBacked = resolveFitnessShowcaseProducts(
  [{ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: 'DB Whey', sku: 'DB-001', image_url: '' }],
  'demo-fitness'
);
if (dbBacked.length !== 1 || dbBacked[0].id !== 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee') {
  errors.push('resolveFitnessShowcaseProducts must keep DB products (not replace with seed SKUs)');
}
if (dbBacked[0].catalog_preview) {
  errors.push('DB-backed showcase products must not be catalog_preview');
}

const previewOnly = resolveFitnessShowcaseProducts([], 'demo-fitness');
if (!previewOnly.length || !previewOnly.every((p) => p.catalog_preview)) {
  errors.push('empty DB should fall back to catalog_preview seed rows on demo domain');
}
if (previewOnly.some((p) => isStorefrontProductUuid(p.id))) {
  errors.push('seed preview rows must not use UUID-shaped ids');
}

const liveSparse = buildFitnessSupplementShowcase(
  [{ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: 'Live Whey', sku: 'LW-001', category_name: 'Whey Protein', price: 5000, stock: 10 }],
  'my-gym-store',
  12
);
if (liveSparse.length !== 1) {
  errors.push(`non-demo supplement showcase must not seed-fill (got ${liveSparse.length}, expected 1)`);
}
if (liveSparse[0]?.catalog_preview) {
  errors.push('non-demo showcase must not mark DB products as catalog_preview');
}

const demoFill = buildFitnessSupplementShowcase([], 'demo-fitness', 12);
if (demoFill.length < 12) {
  errors.push(`demo supplement showcase should seed-fill to 12 (got ${demoFill.length})`);
}

const liveMembership = buildFitnessMembershipCatalog([], 'my-gym-store');
if (liveMembership.memberships.length > 0 || liveMembership.trials.length > 0) {
  errors.push('non-demo membership catalog must not seed-fill when inventory is empty');
}

const liveQuickTerms = resolveFitnessQuickSearchTerms({}, [], [], 'my-gym-store');
if (liveQuickTerms.length > 0) {
  errors.push('non-demo quick search must not fall back to demo terms');
}

const liveTrainers = resolveFitnessTrainers({ storefront: { fitness: { showTrainers: true } } }, 'my-gym-store');
if (liveTrainers.length > 0) {
  errors.push('non-demo trainers must not fall back to demo coaches when showTrainers is on');
}

const seedRows = FITNESS_SEED_PRODUCTS.map(mapFitnessSeedRowToStorefrontProduct);
const bookableSeed = seedRows.filter(isFitnessBookableProduct);
const shopSeed = seedRows.filter(isFitnessShopCatalogProduct);
if (bookableSeed.length < 10) {
  errors.push(`expected 10+ bookable seed SKUs, got ${bookableSeed.length}`);
}
if (shopSeed.length < 40) {
  errors.push(`expected 40+ shop catalog seed SKUs, got ${shopSeed.length}`);
}

const demoShop = buildFitnessShopCatalog([], 'demo-fitness');
if (demoShop.length < shopSeed.length) {
  errors.push(`demo shop catalog should backfill seed retail SKUs (got ${demoShop.length})`);
}
if (demoShop.some(isFitnessBookableProduct)) {
  errors.push('shop catalog must exclude memberships and training sessions');
}

const liveShop = buildFitnessShopCatalog([], 'my-gym-store');
if (liveShop.length > 0) {
  errors.push('non-demo shop catalog must not seed-fill when inventory is empty');
}

const filteredCats = filterFitnessShopCategories(
  FITNESS_SEED_CATEGORIES.map((name) => ({ name, slug: slugifyFitnessCategory(name) }))
);
if (filteredCats.some((c) => /membership|personal training|^classes$/i.test(c.name))) {
  errors.push('shop category filter should remove bookable categories');
}

const paged = paginateFitnessShopCatalog(demoShop, { page: 1, limit: 24, sort: 'featured' });
if (paged.products.length < 1 || paged.total < shopSeed.length) {
  errors.push('paginateFitnessShopCatalog should return full demo shop totals');
}

if (errors.length) {
  console.error('verify-fitness-seed FAILED:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log(
  `verify-fitness-seed OK (${FITNESS_SEED_PRODUCTS.length} products, ${FITNESS_SEED_CATEGORIES.length} categories, ${archiveImages.length} archive images)`
);
