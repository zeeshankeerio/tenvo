import 'server-only';

import { domainIndexKey } from '@/lib/cache/redisKeys';
import { REDIS_TTL } from '@/lib/cache/redisTtl';
import { isRedisConfigured, redisDel, redisGet, redisSetEx } from '@/lib/cache/redis';
import { expandStorefrontDomainAliasKeys } from '@/lib/tenancy/resolveStorefrontBusiness';

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
  const payload = JSON.stringify(business);
  const keys = new Set(expandStorefrontDomainAliasKeys(normalizedDomain));
  const canonical = business.domain;
  if (canonical) {
    for (const key of expandStorefrontDomainAliasKeys(String(canonical))) {
      keys.add(key);
    }
  }

  let ok = false;
  for (const key of keys) {
    const wrote = await redisSetEx(domainIndexKey(key), payload, REDIS_TTL.domainIndex);
    ok = ok || wrote;
  }
  return ok;
}

/**
 * @param {string} normalizedDomain
 */
export async function purgeCachedStorefrontDomain(normalizedDomain) {
  if (!normalizedDomain) return false;

  const keys = expandStorefrontDomainAliasKeys(normalizedDomain);
  let ok = false;
  for (const key of keys) {
    const deleted = await redisDel(domainIndexKey(key));
    ok = ok || deleted;
  }
  return ok;
}
