/**
 * Idempotent repair — persist full fashion / Gul Ahmed section seed in business_settings.
 */
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { supportsFashionGulSections } from '../storefront/fashionGulSections.js';
import { mergeFashionStorefrontIntoSettings } from '../storefront/fashionStorefrontSeed.js';

/**
 * @param {import('pg').Pool} pool
 * @param {{ domain: string, category?: string | null, dryRun?: boolean }} opts
 */
export async function patchFashionStorefrontSettings(pool, { domain, category, dryRun = false }) {
  const domainHandle = String(domain || '').trim().toLowerCase();
  if (!domainHandle) return { domain, skipped: true, reason: 'missing domain' };

  const client = await pool.connect();
  try {
    const row = await client.query(
      `
      SELECT b.id, b.category, bs.settings
      FROM businesses b
      LEFT JOIN business_settings bs ON bs.business_id = b.id
      WHERE LOWER(b.domain) = $1
      LIMIT 1
      `,
      [domainHandle]
    );
    const business = row.rows[0];
    if (!business) return { domain: domainHandle, skipped: true, reason: 'business not found' };

    const canonical = resolveDomainKey(category || business.category);
    if (!supportsFashionGulSections(canonical)) {
      return { domain: domainHandle, skipped: true, reason: 'not a fashion Gul vertical' };
    }

    const prevSettings =
      business.settings && typeof business.settings === 'object' ? business.settings : {};
    const nextSettings = mergeFashionStorefrontIntoSettings(prevSettings, canonical);
    const prevFashion = prevSettings?.storefront?.fashion || {};
    const nextFashion = nextSettings?.storefront?.fashion || {};
    const changed =
      JSON.stringify(prevFashion) !== JSON.stringify(nextFashion) ||
      !prevSettings?.storefront?.fashion;

    if (!changed) {
      return { domain: domainHandle, patched: false, category: canonical };
    }

    if (dryRun) {
      return { domain: domainHandle, patched: true, dryRun: true, category: canonical };
    }

    await client.query(
      `
      INSERT INTO business_settings (business_id, is_storefront_enabled, settings)
      VALUES ($1::uuid, true, $2::jsonb)
      ON CONFLICT (business_id) DO UPDATE SET
        is_storefront_enabled = COALESCE(business_settings.is_storefront_enabled, true),
        settings = $2::jsonb
      `,
      [business.id, JSON.stringify(nextSettings)]
    );

    return { domain: domainHandle, patched: true, category: canonical };
  } finally {
    client.release();
  }
}

/**
 * @param {import('pg').Pool} pool
 * @param {Array<{ domain: string, key?: string }>} specs
 * @param {{ dryRun?: boolean }} [opts]
 */
export async function patchFashionStorefrontSettingsBatch(pool, specs, opts = {}) {
  const results = [];
  for (const spec of specs) {
    const canonical = resolveDomainKey(spec.key);
    if (!supportsFashionGulSections(canonical)) continue;
    results.push(
      await patchFashionStorefrontSettings(pool, {
        domain: spec.domain,
        category: canonical,
        dryRun: opts.dryRun,
      })
    );
  }
  return results;
}
