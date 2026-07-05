/**
 * Static verification for storefront cache tag wiring (no DB required).
 * Run: node scripts/verify-storefront-cache.mjs
 */

import { storefrontCatalogTag, storefrontBusinessTag, serializeStorefrontFilters } from '../lib/storefront/storefrontCacheTags.js';

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(
  storefrontCatalogTag('550e8400-e29b-41d4-a716-446655440000') ===
    'storefront-catalog-550e8400-e29b-41d4-a716-446655440000',
  'catalog tag must include business id'
);

assert(
  storefrontBusinessTag('My-Shop') === 'storefront-business-my-shop',
  'business tag must normalize domain'
);

const keyA = serializeStorefrontFilters({ page: '2', limit: 24, category: 'shoes' });
const keyB = serializeStorefrontFilters({ limit: 24, category: 'shoes', page: 2 });
assert(keyA === keyB, 'filter serializer must normalize page/limit types');

assert(
  serializeStorefrontFilters({ page: 1, search: '' }) === serializeStorefrontFilters({ page: 1 }),
  'empty filter values must be omitted'
);

if (failures.length) {
  console.error('verify:storefront-cache FAILED');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}

console.log('verify:storefront-cache OK');
