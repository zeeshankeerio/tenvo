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
 * Active per-business (and optionally per-user) overrides keyed by platform flag `key`.
 * Business-level overrides are always loaded. User-level overrides are merged on top
 * when `userId` is provided — user overrides win over business overrides for the same key.
 *
 * @param {string} businessId
 * @param {import('pg').PoolClient} [client]
 * @param {string} [userId] - optional; loads user-level overrides merged on top
 * @returns {Promise<Record<string, boolean>>}
 */
export async function loadPlatformFeatureOverridesForBusiness(businessId, client = null, userId = null) {
  if (!businessId) return {};

  const dbClient = client || (await pool.connect());
  const shouldRelease = !client;

  try {
    // Load both business and user overrides in one query when userId is present
    const conditions = userId
      ? `(fo.target_type = 'business' AND fo.target_id = $1) OR (fo.target_type = 'user' AND fo.target_id = $2)`
      : `fo.target_type = 'business' AND fo.target_id = $1`;

    const params = userId ? [businessId, userId] : [businessId];

    const result = await dbClient.query(
      `SELECT f.key, fo.value, fo.target_type
       FROM platform_feature_flag_overrides fo
       INNER JOIN platform_feature_flags f ON f.id = fo.platform_feature_flag_id
       WHERE (${conditions})
         AND (fo.expires_at IS NULL OR fo.expires_at > NOW())`,
      params
    );

    /** @type {Record<string, boolean>} */
    const map = {};

    // Apply business overrides first, then user overrides on top
    for (const row of result.rows.filter(r => r.target_type === 'business')) {
      if (row.key) map[row.key] = parsePlatformOverrideValue(row.value);
    }
    for (const row of result.rows.filter(r => r.target_type === 'user')) {
      if (row.key) map[row.key] = parsePlatformOverrideValue(row.value);
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
