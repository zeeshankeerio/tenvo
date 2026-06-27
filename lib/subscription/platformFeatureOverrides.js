/**
 * Read path for platform_feature_flag_overrides (per-business).
 * Merged into `planHasFeatureWithPackaging` — does not replace plan tiers or owner packaging.
 */

import pool from '@/lib/db';

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function parsePlatformOverrideValue(raw) {
  if (raw === true || raw === false) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Boolean(parsed);
    } catch {
      return raw === 'true';
    }
  }
  return Boolean(raw);
}

/**
 * Active per-business overrides keyed by platform flag `key` (matches plan feature keys when aligned).
 *
 * @param {string} businessId
 * @param {import('pg').PoolClient} [client]
 * @returns {Promise<Record<string, boolean>>}
 */
export async function loadPlatformFeatureOverridesForBusiness(businessId, client = null) {
  if (!businessId) return {};

  const dbClient = client || (await pool.connect());
  const shouldRelease = !client;

  try {
    const result = await dbClient.query(
      `SELECT f.key, fo.value
       FROM platform_feature_flag_overrides fo
       INNER JOIN platform_feature_flags f ON f.id = fo.platform_feature_flag_id
       WHERE fo.target_type = 'business'
         AND fo.target_id = $1
         AND (fo.expires_at IS NULL OR fo.expires_at > NOW())`,
      [businessId]
    );

    /** @type {Record<string, boolean>} */
    const map = {};
    for (const row of result.rows) {
      if (row.key) {
        map[row.key] = parsePlatformOverrideValue(row.value);
      }
    }
    return map;
  } catch (error) {
    const msg = error?.message || String(error);
    if (error?.code !== '42P01') {
      console.warn('[platformFeatureOverrides] load failed:', msg);
    }
    return {};
  } finally {
    if (shouldRelease) dbClient.release();
  }
}
