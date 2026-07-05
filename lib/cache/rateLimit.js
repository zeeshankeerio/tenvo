import 'server-only';

import { rateLimitKey } from '@/lib/cache/redisKeys';
import { REDIS_TTL } from '@/lib/cache/redisTtl';
import { redisExpire, redisIncr } from '@/lib/cache/redis';

/** Requests per minute by plan tier. */
export const RATE_LIMITS = {
  free: 60,
  basic: 120,
  starter: 120,
  standard: 300,
  professional: 300,
  premium: 600,
  business: 600,
  enterprise: 1200,
};

const WINDOW_MS = 60 * 1000;

/** @type {Map<string, { count: number; resetAt: number }>} */
const memoryStore = new Map();

/**
 * @param {string} businessId
 * @param {string} [planTier]
 * @returns {{ limit: number; remaining: number; reset: number; exceeded: boolean }}
 */
export function trackRateLimitSync(businessId, planTier = 'free') {
  const limit = RATE_LIMITS[planTier] || RATE_LIMITS.free;
  const now = Date.now();

  let entry = memoryStore.get(businessId);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    memoryStore.set(businessId, entry);
  } else {
    entry.count += 1;
  }

  const remaining = Math.max(0, limit - entry.count);
  const reset = Math.ceil(entry.resetAt / 1000);

  return { limit, remaining, reset, exceeded: entry.count > limit };
}

/**
 * Distributed rate limit — Redis (VPC) → Vercel Runtime Cache → in-memory fallback.
 * @param {string} businessId
 * @param {string} [planTier]
 * @returns {Promise<{ limit: number; remaining: number; reset: number; exceeded: boolean }>}
 */
export async function trackRateLimit(businessId, planTier = 'free') {
  const limit = RATE_LIMITS[planTier] || RATE_LIMITS.free;
  const now = Date.now();
  const bucket = Math.floor(now / WINDOW_MS);
  const resetAt = (bucket + 1) * WINDOW_MS;
  const reset = Math.ceil(resetAt / 1000);

  const redisKey = rateLimitKey(businessId, bucket);
  const redisCount = await redisIncr(redisKey);
  if (redisCount != null) {
    if (redisCount === 1) await redisExpire(redisKey, REDIS_TTL.rateLimitBucket);
    return {
      limit,
      remaining: Math.max(0, limit - redisCount),
      reset,
      exceeded: redisCount > limit,
    };
  }

  if (process.env.VERCEL === '1') {
    try {
      const { getCache } = await import('@vercel/functions');
      const cache = getCache({ namespace: 'tenvo-rl' });
      const cacheKey = `${businessId}:${bucket}`;
      const prev = Number((await cache.get(cacheKey)) || 0);
      const count = prev + 1;
      await cache.set(cacheKey, count, { ttl: 120, name: 'api-rate-limit' });
      return {
        limit,
        remaining: Math.max(0, limit - count),
        reset,
        exceeded: count > limit,
      };
    } catch {
      // fall through to memory
    }
  }

  return trackRateLimitSync(businessId, planTier);
}

/**
 * Enforce API rate limits (used by plan limit middleware).
 * @param {string} businessId
 * @param {string} [planTier]
 * @returns {Promise<{ allowed: boolean; reason?: string; retryAfter?: number }>}
 */
export async function checkApiRateLimit(businessId, planTier = 'free') {
  if (!businessId) return { allowed: true };

  const { exceeded, reset } = await trackRateLimit(businessId, planTier);
  if (!exceeded) return { allowed: true };

  const retryAfter = Math.max(1, reset - Math.floor(Date.now() / 1000));
  return {
    allowed: false,
    reason: 'API rate limit exceeded for your plan tier',
    retryAfter,
  };
}

/** Prevent unbounded memory growth in long-lived Node processes. */
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [businessId, entry] of memoryStore.entries()) {
    if (now >= entry.resetAt) memoryStore.delete(businessId);
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
