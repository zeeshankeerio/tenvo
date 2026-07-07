/**
 * Static verification for cache layer wiring (no DB / Redis required).
 * Run: node scripts/verify-cache-wiring.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  domainIndexKey,
  rateLimitKey,
  tenantCacheKey,
  tenantHashTag,
} from '../lib/cache/redisKeys.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

const bizId = '550e8400-e29b-41d4-a716-446655440000';

assert(
  tenantHashTag(bizId) === `{biz:${bizId}}`,
  'tenant hash tag must wrap business id'
);

assert(
  tenantCacheKey(bizId, 'catalog', 'page:1').includes(`{biz:${bizId}}`),
  'tenant cache key must use hash tag'
);

assert(domainIndexKey('My-Shop') === 'tenvo:v1:domain:my-shop', 'domain index must normalize');

assert(rateLimitKey(bizId, 12345).includes('{biz:'), 'rate limit key must use hash tag');

assert(
  read('lib/cache/rateLimit.js').includes('checkApiRateLimit'),
  'rateLimit module must export checkApiRateLimit'
);

assert(
  read('lib/tenancy/resolveStorefrontBusiness.js').includes('cacheStorefrontRead'),
  'resolveStorefrontBusiness must use cacheStorefrontRead'
);

assert(
  read('lib/storefront/invalidateStorefrontCatalog.js').includes('purgeStorefrontDataCacheTag'),
  'invalidation must purge data cache tags'
);

assert(
  read('lib/storefront/invalidateStorefrontCatalog.js').includes('purgeStorefrontCacheTagAsync'),
  'invalidation must purge Vercel runtime cache async'
);

assert(
  read('lib/cache/purgeStorefrontCache.js').includes("revalidateTag(tag, DATA_CACHE_LIFE)"),
  'purge must use Next.js 16 cacheLife profile'
);

assert(
  read('lib/services/planLimits.js').includes('checkApiRateLimit'),
  'canMakeApiCall must use distributed rate limit'
);

assert(
  read('lib/cache/redis.js').includes('@upstash/redis'),
  'redis module must support Upstash REST client'
);

assert(
  read('lib/cache/redis.js').includes('hasUpstashRedis'),
  'redis module must detect UPSTASH_REDIS_REST_* env'
);

assert(
  read('lib/tenancy/resolveStorefrontBusiness.js').includes('getCachedStorefrontBusiness'),
  'resolveStorefrontBusiness must use Redis domain L2 cache'
);

assert(
  read('lib/storefront/invalidateStorefrontCatalog.js').includes('purgeCachedStorefrontDomain'),
  'invalidation must purge Redis domain index'
);

assert(
  read('lib/cache/rateLimit.js').includes('REDIS_TTL.rateLimitBucket'),
  'rate limit must use shared Redis TTL constant'
);

assert(
  read('lib/tenancy/resolveStorefrontBusiness.js').includes('STOREFRONT_BUSINESS_COMPACT_CACHE_KEY'),
  'resolveStorefrontBusiness must use compact cache key'
);

assert(
  read('lib/storefront/fetchBusinessByDomain.js').includes('STOREFRONT_BUSINESS_SHELL_CACHE_KEY'),
  'fetchBusinessByDomain must use shell cache key'
);

assert(
  read('lib/tenancy/resolveStorefrontBusiness.js').includes('StorefrontCacheBypassError'),
  'null tenant misses must bypass unstable_cache'
);

assert(
  read('lib/storefront/fetchBusinessByDomain.js').includes('loadStorefrontBusinessShell'),
  'fetchBusinessByDomain must delegate to unified resolver'
);

assert(
  read('lib/storefront/invalidateStorefrontCatalog.js').includes('expandStorefrontDomainAliasKeys'),
  'invalidation must expand hyphen/underscore alias keys'
);

assert(
  read('lib/cache/storefrontDomainCache.js').includes('expandStorefrontDomainAliasKeys'),
  'Redis domain purge must expand hyphen/underscore alias keys'
);

assert(
  read('lib/services/POSService.js').includes('invalidateStorefrontCatalog'),
  'POS sales must invalidate storefront catalog cache'
);

assert(
  read('lib/services/InventoryService.js').includes('if (shouldManageTransaction) invalidateStorefrontCatalog'),
  'InventoryService must only invalidate catalog when owning the transaction'
);

assert(
  read('app/api/storefront/[businessDomain]/orders/route.js').includes('invalidateStorefrontCatalog(business.id)'),
  'checkout must invalidate storefront catalog before commit'
);

if (failures.length) {
  console.error('verify:cache-wiring FAILED');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}

console.log('verify:cache-wiring OK');
