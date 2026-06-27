#!/usr/bin/env node
/**
 * Sanity-check auto-parts archive seed wiring.
 */
import { AUTOPARTS_ARCHIVE_META, AUTOPARTS_ARCHIVE_PRODUCTS } from '../lib/dataLab/autopartsArchiveSeed.js';
import { AUTO_PARTS_SEED_CATALOG, AUTO_PARTS_SEED_CATEGORIES } from '../lib/dataLab/autopartsSeedCatalog.js';
import { buildRichSeedItems } from '../lib/dataLab/richProductCatalog.js';
import {
  AUTO_PARTS_DEFAULT_SLIDES,
  AUTO_PARTS_PROMO_CARDS,
  AUTO_PARTS_FEATURED_CATEGORIES,
  AUTO_PARTS_VEHICLE_BRANDS,
  AUTO_PARTS_TRENDING_SEARCHES,
} from '../lib/storefront/autoPartsArchiveMap.js';

const errors = [];

if (!AUTOPARTS_ARCHIVE_META.heroSlides?.length) errors.push('missing heroSlides');
if (!AUTOPARTS_ARCHIVE_META.promoCards?.length) errors.push('missing promoCards');
if (!AUTOPARTS_ARCHIVE_META.featuredCategories?.length) errors.push('missing featuredCategories');
if (!AUTOPARTS_ARCHIVE_PRODUCTS.length) errors.push('missing archive products');
if (AUTO_PARTS_SEED_CATALOG.length < 25) {
  errors.push(`seed catalog too small (${AUTO_PARTS_SEED_CATALOG.length})`);
}

const skus = new Set();
for (const p of AUTO_PARTS_SEED_CATALOG) {
  const key = String(p.sku || p.name).toLowerCase();
  if (skus.has(key)) errors.push(`duplicate sku/name: ${key}`);
  skus.add(key);
}

if (AUTO_PARTS_DEFAULT_SLIDES.length !== AUTOPARTS_ARCHIVE_META.heroSlides.length) {
  errors.push('slide map count mismatch');
}
if (AUTO_PARTS_PROMO_CARDS.length !== AUTOPARTS_ARCHIVE_META.promoCards.length) {
  errors.push('promo card map count mismatch');
}
if (AUTO_PARTS_FEATURED_CATEGORIES.length !== AUTOPARTS_ARCHIVE_META.featuredCategories.length) {
  errors.push('featured category map count mismatch');
}
if (AUTO_PARTS_VEHICLE_BRANDS.length < AUTOPARTS_ARCHIVE_META.vehicleBrands.length) {
  errors.push('vehicle brand map incomplete');
}
if (AUTO_PARTS_TRENDING_SEARCHES.length < 10) {
  errors.push('trending searches too few');
}

const registrationItems = buildRichSeedItems({
  businessId: 'verify-business-id',
  domainKey: 'auto-parts',
  countryIso: 'PK',
  taxRate: 18,
  brands: [],
});
if (!registrationItems.length || registrationItems.length < 25) {
  errors.push(`registration seed too small (${registrationItems.length})`);
}
const regCats = new Set(AUTO_PARTS_SEED_CATEGORIES);
for (const p of registrationItems) {
  if (p.category && !regCats.has(p.category)) {
    errors.push(`registration product category not seeded: ${p.category}`);
    break;
  }
}
const sampleAutoPart = registrationItems[0];
if (!sampleAutoPart?.reorder_point || !sampleAutoPart?.min_stock_level) {
  errors.push('registration auto-parts items missing reorder defaults');
}
if (!sampleAutoPart?.domain_data?.seedCatalog) {
  errors.push('registration items missing seedCatalog domain_data flag');
}

if (errors.length) {
  console.error('verify:autoparts-seed FAILED');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

console.log(
  `verify:autoparts-seed OK (${AUTO_PARTS_SEED_CATALOG.length} products, ${AUTOPARTS_ARCHIVE_META.shopBrands.length} shop brands, registration seeds ${registrationItems.length} products)`
);
