#!/usr/bin/env node
/**
 * Sanity-check pharmacy elevated storefront + demo seed wiring.
 */
import { PHARMACY_SEED_PRODUCTS } from '../lib/dataLab/pharmacyDemoCatalog.js';
import {
  buildPharmacyShopCatalog,
  enrichPharmacyProductsWithSeed,
  findPharmacySeedRow,
  paginatePharmacyShopCatalog,
  resolvePharmacyShowcaseProducts,
} from '../lib/dataLab/pharmacySeedHelpers.js';
import { isPharmacyElevatedStore } from '../lib/storefront/pharmacyStorefront.js';
import {
  isPrescriptionRequiredProduct,
  resolvePharmacyProductMeta,
} from '../lib/storefront/pharmacyProducts.js';

const errors = [];

if (!isPharmacyElevatedStore('pharmacy')) errors.push('pharmacy not elevated storefront');
if (PHARMACY_SEED_PRODUCTS.length < 20) errors.push(`seed catalog too small (${PHARMACY_SEED_PRODUCTS.length})`);

const rxProducts = PHARMACY_SEED_PRODUCTS.filter((p) => isPrescriptionRequiredProduct(p));
const otcProducts = PHARMACY_SEED_PRODUCTS.filter((p) => !isPrescriptionRequiredProduct(p));
if (rxProducts.length < 2) errors.push(`expected 2+ Rx seed SKUs, got ${rxProducts.length}`);
if (otcProducts.length < 10) errors.push(`expected 10+ OTC seed SKUs, got ${otcProducts.length}`);

for (const p of PHARMACY_SEED_PRODUCTS) {
  if (!p.image_url || !String(p.image_url).startsWith('https://')) {
    errors.push(`missing image_url: ${p.name}`);
  }
  if (!p.price || Number(p.price) <= 0) errors.push(`invalid price: ${p.name}`);
  if (!findPharmacySeedRow(p)) errors.push(`seed lookup failed: ${p.name}`);
}

const demoUuid = '550e8400-e29b-41d4-a716-446655440000';
const enriched = enrichPharmacyProductsWithSeed(
  [{ id: demoUuid, name: 'Augmentin 625mg 14 Tablets', sku: 'PH-AUG-625-14', domain_data: {} }],
  'demo-pharmacy',
  'pharmacy'
);
if (!enriched[0]?.image_url) errors.push('seed enrich did not attach image');
if (!isPrescriptionRequiredProduct(enriched[0])) errors.push('Augmentin seed should be Rx');

const showcase = resolvePharmacyShowcaseProducts(
  [{ id: demoUuid, name: 'Panadol Extra 20 Tablets', sku: 'PH-PAN-EXT-20' }],
  'demo-pharmacy'
);
if (showcase.length !== 1) errors.push('showcase should keep live UUID rows only');

const shop = buildPharmacyShopCatalog([], 'demo-pharmacy', 'pharmacy');
if (shop.length < 12) errors.push(`demo shop backfill too small (${shop.length})`);

const paged = paginatePharmacyShopCatalog(shop, { otcOnly: true, page: 1, limit: 12 });
if (!paged.products.length) errors.push('OTC pagination returned no products');

const meta = resolvePharmacyProductMeta(rxProducts[0]);
if (!meta.requiresPrescription) errors.push('Rx meta detection failed');

if (errors.length) {
  console.error('verify:pharmacy-seed FAILED');
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log('verify:pharmacy-seed OK');
console.log(`  seed SKUs: ${PHARMACY_SEED_PRODUCTS.length} (${rxProducts.length} Rx, ${otcProducts.length} OTC)`);
