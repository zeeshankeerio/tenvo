import 'server-only';

import pool from '@/lib/db';
import {
  purgeStorefrontCacheTagAsync,
  purgeStorefrontDataCacheTag,
} from '@/lib/cache/purgeStorefrontCache';
import { purgeCachedStorefrontDomain } from '@/lib/cache/storefrontDomainCache';
import { storefrontCatalogTag, storefrontBusinessTag } from '@/lib/storefront/storefrontCacheTags';

/**
 * Bust cached storefront catalog reads after inventory or product mutations.
 */
export function invalidateStorefrontCatalog(businessId) {
  if (!businessId) return;
  const tag = storefrontCatalogTag(businessId);
  purgeStorefrontDataCacheTag(tag);
  purgeStorefrontCacheTagAsync(tag);
}

/**
 * Bust cached business shell when settings/branding/domain change.
 */
export function invalidateStorefrontBusiness(domain) {
  if (!domain) return;
  const normalized = String(domain).toLowerCase().trim();
  const tag = storefrontBusinessTag(normalized);
  purgeStorefrontDataCacheTag(tag);
  purgeStorefrontCacheTagAsync(tag);
  void purgeCachedStorefrontDomain(normalized);
}

/**
 * Invalidate catalog + all known domain keys for a tenant (canonical + custom).
 * @param {string} businessId
 */
export async function invalidateStorefrontTenant(businessId) {
  if (!businessId) return;
  invalidateStorefrontCatalog(businessId);

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT b.domain, cd.domain AS custom_domain
       FROM businesses b
       LEFT JOIN business_custom_domains cd
         ON cd.business_id = b.id AND cd.is_active = true
       WHERE b.id = $1::uuid`,
      [businessId]
    );
    for (const row of result.rows) {
      if (row.domain) invalidateStorefrontBusiness(row.domain);
      if (row.custom_domain) invalidateStorefrontBusiness(row.custom_domain);
    }
  } catch (error) {
    console.warn('[invalidateStorefrontTenant] Domain lookup skipped:', error?.message);
  } finally {
    client.release();
  }
}
