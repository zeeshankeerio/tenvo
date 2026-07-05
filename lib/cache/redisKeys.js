/** @typedef {'catalog' | 'resolve' | 'settings'} StorefrontCacheKind */

const PREFIX = 'tenvo:v1';

/**
 * Hash-tag slot for a tenant — keeps related keys on one Valkey cluster slot.
 * @param {string} businessId
 */
export function tenantHashTag(businessId) {
  return `{biz:${String(businessId)}}`;
}

/**
 * @param {string} businessId
 * @param {StorefrontCacheKind} kind
 * @param {string} [suffix]
 */
export function tenantCacheKey(businessId, kind, suffix = '') {
  const tag = tenantHashTag(businessId);
  const tail = suffix ? `:${suffix}` : '';
  return `${PREFIX}:${tag}:${kind}${tail}`;
}

/** Domain → businessId index (single-key lookup). */
export function domainIndexKey(normalizedDomain) {
  return `${PREFIX}:domain:${String(normalizedDomain).toLowerCase().trim()}`;
}

/** Per-tenant API rate limit bucket. */
export function rateLimitKey(businessId, minuteBucket) {
  return `${PREFIX}:rl:${tenantHashTag(businessId)}:${minuteBucket}`;
}
