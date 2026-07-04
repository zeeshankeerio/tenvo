#!/usr/bin/env node
/**
 * Sanity-check Roll Inn restaurant seed catalog.
 */
import { RESTAURANT_SEED_PRODUCTS, RESTAURANT_SEED_CATEGORIES, RESTAURANT_SEED_BRAND } from '../lib/dataLab/restaurantDemoCatalog.js';
import {
  resolveRestaurantShowcaseProducts,
  shouldUseRestaurantSeedCatalog,
  mapRestaurantSeedRowToStorefrontProduct,
} from '../lib/dataLab/restaurantSeedHelpers.js';
import { buildRichSeedItems, hasRichCatalog } from '../lib/dataLab/richProductCatalog.js';

const errors = [];

if (RESTAURANT_SEED_BRAND !== 'Roll Inn') {
  errors.push(`expected brand Roll Inn, got ${RESTAURANT_SEED_BRAND}`);
}
if (!hasRichCatalog('restaurant-cafe')) {
  errors.push('restaurant-cafe missing from RICH_PRODUCT_CATALOG');
}
if (!shouldUseRestaurantSeedCatalog('demo-restaurant', 'restaurant-cafe')) {
  errors.push('demo-restaurant should use restaurant seed catalog');
}
if (RESTAURANT_SEED_PRODUCTS.length < 80) {
  errors.push(`seed catalog too small (${RESTAURANT_SEED_PRODUCTS.length})`);
}
if (RESTAURANT_SEED_CATEGORIES.length < 10) {
  errors.push(`seed categories too few (${RESTAURANT_SEED_CATEGORIES.length})`);
}

const skus = new Set();
let eatxImages = 0;
for (const p of RESTAURANT_SEED_PRODUCTS) {
  const key = String(p.sku || p.name).toLowerCase();
  if (skus.has(key)) errors.push(`duplicate sku/name: ${key}`);
  skus.add(key);
  if (!p.image_url || !String(p.image_url).startsWith('https://')) {
    errors.push(`missing image_url: ${p.name}`);
  } else if (String(p.image_url).includes('services.eatx.pk')) {
    eatxImages += 1;
  }
  if (!p.price || Number(p.price) <= 0) errors.push(`invalid price: ${p.name}`);
  if (p.brand !== 'Roll Inn') errors.push(`wrong brand on ${p.name}`);
}

if (eatxImages < 80) {
  errors.push(`expected eatx.pk CDN images, got ${eatxImages}`);
}

const rolls = RESTAURANT_SEED_PRODUCTS.filter((p) => /roll/i.test(p.category) || /roll/i.test(p.name));
if (rolls.length < 5) errors.push(`expected roll SKUs, got ${rolls.length}`);

const registrationItems = buildRichSeedItems({
  businessId: 'verify-business-id',
  domainKey: 'restaurant-cafe',
  countryIso: 'PK',
  taxRate: 16,
  brands: ['Roll Inn'],
});
if (registrationItems.length !== RESTAURANT_SEED_PRODUCTS.length) {
  errors.push(
    `buildRichSeedItems count ${registrationItems.length} !== seed ${RESTAURANT_SEED_PRODUCTS.length}`
  );
}

const preview = resolveRestaurantShowcaseProducts([], 'demo-restaurant', 'restaurant-cafe');
if (!preview.length || !preview.every((p) => p.catalog_preview)) {
  errors.push('empty DB should fall back to catalog_preview seed on demo-restaurant');
}
const mapped = mapRestaurantSeedRowToStorefrontProduct(RESTAURANT_SEED_PRODUCTS[0]);
if (!mapped.image_url?.includes('services.eatx.pk')) {
  errors.push('mapped storefront product should keep Roll Inn CDN image');
}

if (errors.length) {
  console.error('verify-restaurant-seed FAILED:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log(
  `verify-restaurant-seed OK (${RESTAURANT_SEED_PRODUCTS.length} products, ${RESTAURANT_SEED_CATEGORIES.length} categories, ${eatxImages} Roll Inn images)`
);
