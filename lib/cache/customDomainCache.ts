import 'server-only';

import pool from '@/lib/db';
import { getRedisClient } from './redis';

const CUSTOM_DOMAIN_CACHE_TTL = 300; // 5 minutes
const CUSTOM_DOMAIN_CACHE_PREFIX = 'custom-domain:';

/**
 * Lookup which business domain a custom domain points to
 * @param customDomain - The custom domain (e.g., myboutique.com)
 * @returns The business.domain slug (e.g., demo-boutique) or null
 */
export async function lookupCustomDomainFromCache(customDomain: string): Promise<string | null> {
  const normalizedDomain = customDomain.toLowerCase().trim();
  const cacheKey = `${CUSTOM_DOMAIN_CACHE_PREFIX}${normalizedDomain}`;

  try {
    const redis = await getRedisClient();

    // Try Redis L1
    const cached = await redis.get(cacheKey);
    if (cached) {
      return cached === '__null__' ? null : cached;
    }

    // Query DB
    const result = await pool.query(
      `SELECT b.domain as business_domain
       FROM business_custom_domains cd
       JOIN businesses b ON cd.business_id = b.id
       WHERE LOWER(cd.domain) = $1 
         AND cd.is_active = true 
         AND cd.verified_at IS NOT NULL
         AND COALESCE(b.is_active, true) = true
       LIMIT 1`,
      [normalizedDomain]
    );

    const businessDomain = result.rows[0]?.business_domain || null;

    // Cache the result (including null lookups to avoid repeated DB hits)
    await redis.setex(
      cacheKey,
      CUSTOM_DOMAIN_CACHE_TTL,
      businessDomain || '__null__'
    );

    return businessDomain;
  } catch (error) {
    console.error('[lookupCustomDomainFromCache] Error:', error);
    // On cache error, try DB directly without caching
    try {
      const result = await pool.query(
        `SELECT b.domain as business_domain
         FROM business_custom_domains cd
         JOIN businesses b ON cd.business_id = b.id
         WHERE LOWER(cd.domain) = $1 
           AND cd.is_active = true 
           AND cd.verified_at IS NOT NULL
           AND COALESCE(b.is_active, true) = true
         LIMIT 1`,
        [normalizedDomain]
      );
      return result.rows[0]?.business_domain || null;
    } catch (dbError) {
      console.error('[lookupCustomDomainFromCache] DB fallback error:', dbError);
      return null;
    }
  }
}

/**
 * Purge custom domain from cache (call after verification/removal)
 */
export async function purgeCustomDomainCache(customDomain: string): Promise<void> {
  const normalizedDomain = customDomain.toLowerCase().trim();
  const cacheKey = `${CUSTOM_DOMAIN_CACHE_PREFIX}${normalizedDomain}`;

  try {
    const redis = await getRedisClient();
    await redis.del(cacheKey);
  } catch (error) {
    console.error('[purgeCustomDomainCache] Error:', error);
  }
}
