/**
 * Storefront domain resolution + cache alias wiring (no DB required).
 * Run: node scripts/verify-storefront-domain-resolution.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

function normalizeStorefrontDomainSegment(domain) {
  if (!domain || typeof domain !== 'string') return '';
  return domain.toLowerCase().trim();
}

function expandStorefrontDomainAliasKeys(domain) {
  const normalized = normalizeStorefrontDomainSegment(domain);
  if (!normalized) return [];
  const altHyphen = normalized.replace(/_/g, '-');
  const altUnderscore = normalized.replace(/-/g, '_');
  return [...new Set([normalized, altHyphen, altUnderscore])];
}

assert(normalizeStorefrontDomainSegment(' My-Shop ') === 'my-shop', 'normalize trims and lowercases');
assert(
  expandStorefrontDomainAliasKeys('my-shop').sort().join(',') === 'my-shop,my_shop',
  'alias keys include hyphen and underscore forms'
);
assert(
  expandStorefrontDomainAliasKeys('my_shop').sort().join(',') === 'my-shop,my_shop',
  'alias keys symmetric for underscore input'
);

const resolveSrc = read('lib/tenancy/resolveStorefrontBusiness.js');
const fetchSrc = read('lib/storefront/fetchBusinessByDomain.js');
assert(resolveSrc.includes('pickStorefrontDomainRow'), 'ambiguous match guard must exist');
assert(resolveSrc.includes('loadStorefrontBusinessShell'), 'RSC shell loader must be exported');
assert(
  resolveSrc.includes('shouldFallbackBusinessSettings'),
  'business_settings missing-column fallback (42703) must exist'
);
assert(
  resolveSrc.includes('STOREFRONT_BUSINESS_COMPACT_CACHE_KEY'),
  'API resolver must use compact cache key (separate from RSC shell)'
);

assert(
  fetchSrc.includes('STOREFRONT_BUSINESS_SHELL_CACHE_KEY'),
  'fetchBusinessByDomain must use shell cache key (separate from API compact)'
);

assert(
  !fetchSrc.includes("['storefront-business', normalized]") ||
    fetchSrc.includes('STOREFRONT_BUSINESS_SHELL_CACHE_KEY'),
  'shell and compact resolvers must not share the same unstable_cache key'
);

assert(fetchSrc.includes('loadStorefrontBusinessShell'), 'fetchBusinessByDomain must delegate to unified resolver');

const invalidateSrc = read('lib/storefront/invalidateStorefrontCatalog.js');
assert(
  invalidateSrc.includes('expandStorefrontDomainAliasKeys'),
  'invalidation must purge alias domain keys'
);

assert(
  read('app/api/storefront/[businessDomain]/products/[productId]/stock/route.js').includes(
    'resolveStorefrontBusiness'
  ),
  'stock route must resolve tenant from businessDomain path'
);

assert(
  read('app/api/storefront/[businessDomain]/cart/sync/route.js').includes('resolveStorefrontBusiness'),
  'cart sync route must resolve tenant from businessDomain path'
);

assert(
  resolveSrc.includes('domainRow?.id === redisCached.id'),
  'Redis cache hit must revalidate domain → tenant mapping via Postgres'
);

assert(
  read('app/api/storefront/[businessDomain]/cart/sync/route.js').includes('status: 503'),
  'cart sync must fail closed on error'
);

assert(
  !read('lib/context/CartContext.js').includes('/api/storefront/products/'),
  'CartContext must not call legacy domain-less stock API'
);

const adminSrc = read('lib/actions/storefront/admin.js');
assert(adminSrc.includes('existingCanonical'), 'custom domain must check businesses.domain collision');

if (failures.length) {
  console.error('verify:storefront-domain-resolution FAILED');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}

console.log('verify:storefront-domain-resolution OK');
