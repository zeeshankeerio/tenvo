/**
 * Merged auto-parts demo catalog: archive homepage products + OEM mechanical SKUs.
 */
import { AUTOPARTS_ARCHIVE_PRODUCTS } from './autopartsArchiveSeed.js';
import { AUTO_PARTS_OEM_SUPPLEMENT } from './autopartsOemSupplement.js';

function dedupeBySku(products) {
  const seen = new Set();
  return products.filter((p) => {
    const key = String(p.sku || p.name).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Hub + registration category shells aligned with storefront filters and seed SKUs. */
export const AUTO_PARTS_SEED_CATEGORIES = [
  'Car Care',
  'Accessories',
  'Electrical',
  'Lubricants',
  'Filters',
  'Brakes',
  'Engine',
  'Tyres',
];

/** @type {Array<Record<string, unknown>>} */
export const AUTO_PARTS_SEED_CATALOG = dedupeBySku([
  ...AUTOPARTS_ARCHIVE_PRODUCTS,
  ...AUTO_PARTS_OEM_SUPPLEMENT,
]);
