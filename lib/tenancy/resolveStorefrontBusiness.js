import 'server-only';
import pool from '@/lib/db';
import { getBusinessRegionalPack } from '@/lib/utils/businessRegionalContext';

function parseSettingsJson(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Resolve a storefront business from URL domain segment.
 * Case-insensitive, hyphen/underscore aliases, custom domains, storefront-enabled check.
 * @param {string} domain
 * @returns {Promise<{ id: string; business_name: string; email: string; domain: string; currency: string } | null>}
 */
export async function resolveStorefrontBusiness(domain) {
  if (!domain || typeof domain !== 'string') return null;

  const normalizedDomain = domain.toLowerCase().trim();
  if (!normalizedDomain) return null;

  const altDomain = normalizedDomain.replace(/-/g, '_');
  const altDomain2 = normalizedDomain.replace(/_/g, '-');
  const domainVariants = [normalizedDomain, altDomain, altDomain2];

  const client = await pool.connect();

  try {
    let result;

    try {
      result = await client.query(
        `SELECT
          b.id, b.business_name, b.domain, b.email, b.phone, b.country,
          b.is_active, b.plan_tier,
          COALESCE(bs.is_storefront_enabled, true) AS is_storefront_enabled,
          bs.settings AS store_settings
        FROM businesses b
        LEFT JOIN business_settings bs ON b.id = bs.business_id
        WHERE LOWER(b.domain) = ANY($1) AND COALESCE(b.is_active, true) = true`,
        [domainVariants]
      );
    } catch (tableError) {
      if (tableError.code !== '42P01' && !tableError.message?.includes('business_settings')) {
        throw tableError;
      }
      result = await client.query(
        `SELECT
          b.id, b.business_name, b.domain, b.email, b.phone, b.country,
          b.is_active, b.plan_tier,
          true AS is_storefront_enabled,
          null AS store_settings
        FROM businesses b
        WHERE LOWER(b.domain) = ANY($1) AND COALESCE(b.is_active, true) = true`,
        [domainVariants]
      );
    }

    if (result.rows.length === 0) {
      try {
        result = await client.query(
          `SELECT
            b.id, b.business_name, b.domain, b.email, b.phone, b.country,
            b.is_active, b.plan_tier,
            COALESCE(bs.is_storefront_enabled, true) AS is_storefront_enabled,
            bs.settings AS store_settings
          FROM business_custom_domains cd
          JOIN businesses b ON cd.business_id = b.id
          LEFT JOIN business_settings bs ON b.id = bs.business_id
          WHERE LOWER(cd.domain) = ANY($1) AND cd.is_active = true AND COALESCE(b.is_active, true) = true`,
          [domainVariants]
        );
      } catch (customDomainError) {
        if (customDomainError.code !== '42P01') throw customDomainError;
        return null;
      }
    }

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const settings = parseSettingsJson(row.store_settings);
    const storefrontOff =
      row.is_storefront_enabled === false ||
      settings.storefront?.enabled === false ||
      settings.enabled === false;

    if (storefrontOff) return null;

    const pack = getBusinessRegionalPack({ country: row.country, settings });

    return {
      id: row.id,
      business_name: row.business_name,
      email: row.email,
      domain: row.domain,
      phone: row.phone,
      plan_tier: row.plan_tier,
      currency: pack.currency,
    };
  } finally {
    client.release();
  }
}
