#!/usr/bin/env node
/**
 * Sanity-check Tenvo Car Dealership (vehicle-dealership) demo seed wiring.
 */
import { SEHGAL_SHOWROOM_PRODUCTS, SEHGAL_SHOWROOM_CATEGORIES } from '../lib/dataLab/sehgalShowroomCatalog.js';
import { getDefaultTenvoVehiclesHeroSlides, getDefaultTenvoVehiclesMarketingBanners } from '../lib/storefront/tenvoVehiclesTemplate.js';
import { isTenvoVehiclesShowroomProfile } from '../lib/storefront/dealershipShowroomProfile.js';

const errors = [];

if (!SEHGAL_SHOWROOM_PRODUCTS.length) errors.push('missing showroom products');
if (SEHGAL_SHOWROOM_PRODUCTS.length < 30) {
  errors.push(`showroom catalog too small (${SEHGAL_SHOWROOM_PRODUCTS.length})`);
}
if (!SEHGAL_SHOWROOM_CATEGORIES.includes('Auto Store')) {
  errors.push('missing Auto Store category');
}

const vehicles = SEHGAL_SHOWROOM_PRODUCTS.filter((p) => p.unit === 'unit');
const accessories = SEHGAL_SHOWROOM_PRODUCTS.filter((p) => p.unit !== 'unit');
if (vehicles.length < 8) errors.push(`expected 8+ vehicles, got ${vehicles.length}`);
if (accessories.length < 15) errors.push(`expected 15+ accessories, got ${accessories.length}`);

const withImages = SEHGAL_SHOWROOM_PRODUCTS.filter((p) => String(p.image_url || '').trim());
if (withImages.length < SEHGAL_SHOWROOM_PRODUCTS.length) {
  errors.push('some products missing image_url');
}

const skus = new Set();
for (const p of SEHGAL_SHOWROOM_PRODUCTS) {
  const key = String(p.sku || p.name).toLowerCase();
  if (skus.has(key)) errors.push(`duplicate sku/name: ${key}`);
  skus.add(key);
}

const registrationItems = SEHGAL_SHOWROOM_PRODUCTS;
if (!registrationItems.length || registrationItems.length < 30) {
  errors.push(`registration seed too small (${registrationItems.length})`);
}

const slides = getDefaultTenvoVehiclesHeroSlides('/store/demo-showroom');
const banners = getDefaultTenvoVehiclesMarketingBanners('/store/demo-showroom');
if (slides.length < 3) errors.push('expected 3+ hero slides');
if (banners.length < 6) errors.push('expected 6 promo banners');

const tenvoProfile = isTenvoVehiclesShowroomProfile(
  { category: 'vehicle-dealership' },
  { storefront: { dealership: { profile: 'tenvo-vehicles' } } }
);
if (!tenvoProfile) errors.push('tenvo-vehicles profile detection failed');

const fitnessNotShowroom = isTenvoVehiclesShowroomProfile(
  { category: 'gym-fitness', country: 'Pakistan' },
  {}
);
if (fitnessNotShowroom) {
  errors.push('gym-fitness must not resolve as tenvo-vehicles showroom (logo leak)');
}

const pharmacyNotShowroom = isTenvoVehiclesShowroomProfile(
  { category: 'pharmacy', country: 'Pakistan' },
  {}
);
if (pharmacyNotShowroom) {
  errors.push('pharmacy must not resolve as tenvo-vehicles showroom (logo leak)');
}

if (errors.length) {
  console.error('verify:showroom-seed FAILED');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log('verify:showroom-seed OK');
console.log(`  products: ${SEHGAL_SHOWROOM_PRODUCTS.length} (${vehicles.length} vehicles, ${accessories.length} accessories)`);
console.log(`  categories: ${SEHGAL_SHOWROOM_CATEGORIES.length}`);
console.log(`  hero slides: ${slides.length}, promo banners: ${banners.length}`);
console.log('  demo store: /store/demo-showroom');
