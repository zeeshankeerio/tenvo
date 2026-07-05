/**
 * Redis TTLs tuned for Upstash free tier (256 MB, 10k cmd/s).
 * Keep values small; large storefront payloads stay in Next.js Data Cache.
 */
export const REDIS_TTL = {
  /** Domain → tenant resolve (aligned with STOREFRONT_BUSINESS_REVALIDATE_SEC). */
  domainIndex: 300,
  /** Rate-limit bucket retention (minute window + buffer). */
  rateLimitBucket: 120,
  /** Idle tenant metadata eviction (inactive domains drop from Redis). */
  tenantIdle: 48 * 60 * 60,
};
