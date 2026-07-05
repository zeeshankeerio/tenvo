/**
 * Idempotent repair — seed default homepage marketing banners for demo storefronts.
 */
import { mergeDemoPageSectionsIntoSettings } from './demoPageSectionsSeed.js';
import { getDemoStorefrontProfile } from './demoStoreProfiles.js';
import { getActivePageSections } from '../storefront/storePageSections.js';
import { resolveDomainKey } from '../config/domainKeyAliases.js';

/**
 * @param {import('pg').Pool} pool
 * @param {{ domain: string; key?: string; country?: string; businessName?: string; dryRun?: boolean }} opts
 */
export async function patchDemoPageSections(pool, { domain, key, country, businessName, dryRun = false }) {
  const domainHandle = String(domain || '').trim().toLowerCase();
  if (!domainHandle) return { domain, skipped: true, reason: 'missing domain' };

  const client = await pool.connect();
  try {
    const row = await client.query(
      `
      SELECT b.id, b.category, b.business_name, b.country, bs.settings
      FROM businesses b
      LEFT JOIN business_settings bs ON bs.business_id = b.id
      WHERE LOWER(b.domain) = $1
      LIMIT 1
      `,
      [domainHandle]
    );
    const business = row.rows[0];
    if (!business) return { domain: domainHandle, skipped: true, reason: 'business not found' };

    const prevSettings =
      business.settings && typeof business.settings === 'object' ? business.settings : {};
    if (getActivePageSections(prevSettings.pageSections).length > 0) {
      return { domain: domainHandle, patched: false, reason: 'pageSections already configured' };
    }

    const canonical = resolveDomainKey(key || business.category);
    const imgRes = await client.query(
      `
      SELECT image_url FROM products
      WHERE business_id = $1::uuid
        AND (is_deleted = false OR is_deleted IS NULL)
        AND image_url IS NOT NULL AND TRIM(image_url) <> ''
      ORDER BY is_featured DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT 3
      `,
      [business.id]
    );
    const productImages = imgRes.rows.map((r) => String(r.image_url || '').trim()).filter(Boolean);

    const storefrontProfile = getDemoStorefrontProfile(
      canonical,
      { countryName: country || business.country },
      businessName || business.business_name
    );

    const nextSettings = mergeDemoPageSectionsIntoSettings(prevSettings, {
      domainKey: canonical,
      domainHandle,
      storefrontProfile,
      productImages,
    });

    if (JSON.stringify(prevSettings.pageSections || []) === JSON.stringify(nextSettings.pageSections || [])) {
      return { domain: domainHandle, patched: false };
    }

    if (dryRun) {
      return { domain: domainHandle, patched: true, dryRun: true, sections: nextSettings.pageSections?.length ?? 0 };
    }

    await client.query(
      `
      INSERT INTO business_settings (business_id, is_storefront_enabled, settings)
      VALUES ($1::uuid, true, $2::jsonb)
      ON CONFLICT (business_id) DO UPDATE SET
        is_storefront_enabled = COALESCE(business_settings.is_storefront_enabled, true),
        settings = COALESCE(business_settings.settings, '{}'::jsonb) || $2::jsonb
      `,
      [business.id, JSON.stringify({ pageSections: nextSettings.pageSections })]
    );

    return {
      domain: domainHandle,
      patched: true,
      sections: getActivePageSections(nextSettings.pageSections).length,
    };
  } finally {
    client.release();
  }
}

/**
 * @param {import('pg').Pool} pool
 * @param {Array<{ domain: string; key?: string; country?: string; name?: string }>} specs
 * @param {{ dryRun?: boolean }} [opts]
 */
export async function patchDemoPageSectionsBatch(pool, specs, opts = {}) {
  const results = [];
  for (const spec of specs) {
    results.push(
      await patchDemoPageSections(pool, {
        domain: spec.domain,
        key: spec.key,
        country: spec.country,
        businessName: spec.name,
        dryRun: opts.dryRun,
      })
    );
  }
  return results;
}
