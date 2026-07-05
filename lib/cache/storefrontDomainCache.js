import 'server-only';

import { domainIndexKey } from '@/lib/cache/redisKeys';
import { REDIS_TTL } from '@/lib/cache/redisTtl';
import { isRedisConfigured, redisDel, redisGet, redisSetEx } from '@/lib/cache/redis';

/**
 * L2 hot-path cache: domain → resolved storefront business (compact JSON, ~1 KB).
 * L1 remains Next.js unstable_cache; Postgres is L3.
 *
 * @param {string} normalizedDomain
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function getCachedStorefrontBusiness(normalizedDomain) {
  if (!isRedisConfigured() || !normalizedDomain) return null;
  const raw = await redisGet(domainIndexKey(normalizedDomain));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} normalizedDomain
 * @param {Record<string, unknown>} business
 */
export async function setCachedStorefrontBusiness(normalizedDomain, business) {
  if (!isRedisConfigured() || !normalizedDomain || !business?.id) return false;
  return redisSetEx(
    domainIndexKey(normalizedDomain),
    JSON.stringify(business),
    REDIS_TTL.domainIndex
  );
}

/**
 * @param {string} normalizedDomain
 */
export async function purgeCachedStorefrontDomain(normalizedDomain) {
  if (!normalizedDomain) return false;
  return redisDel(domainIndexKey(normalizedDomain));
}
