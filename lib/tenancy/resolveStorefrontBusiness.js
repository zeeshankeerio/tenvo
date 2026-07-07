import 'server-only';

import pool from '@/lib/db';
import { getBusinessRegionalPack } from '@/lib/utils/businessRegionalContext';
import {
  getCachedStorefrontBusiness,
  setCachedStorefrontBusiness,
  purgeCachedStorefrontDomain,
} from '@/lib/cache/storefrontDomainCache';
import { cacheStorefrontRead } from '@/lib/storefront/storefrontCachedRead';
import {
  storefrontBusinessTag,
  STOREFRONT_BUSINESS_REVALIDATE_SEC,
} from '@/lib/storefront/storefrontCacheTags';
import { resolveStorefrontCurrency, resolveStorefrontLocale } from '@/lib/storefront/storefrontRegional';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';

/** @typedef {import('@/lib/actions/_shared/result').ActionResult} ActionResult */

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

function toIsoString(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return String(value);
}

/** @param {string} domain */
export function normalizeStorefrontDomainSegment(domain) {
  if (!domain || typeof domain !== 'string') return '';
  return domain.toLowerCase().trim();
}

/** Hyphen/underscore URL aliases — used for cache purge, not ambiguous DB matching. */
export function expandStorefrontDomainAliasKeys(domain) {
  const normalized = normalizeStorefrontDomainSegment(domain);
  if (!normalized) return [];
  const altHyphen = normalized.replace(/_/g, '-');
  const altUnderscore = normalized.replace(/-/g, '_');
  return [...new Set([normalized, altHyphen, altUnderscore])];
}

function isStorefrontDisabled(row, settings) {
  return (
    row.is_storefront_enabled === false ||
    settings.storefront?.enabled === false ||
    settings.enabled === false
  );
}

/**
 * Prefer exact segment match; only accept a sole alias match when hyphen/underscore
 * variants collapse to one tenant (avoids my-shop vs my_shop cross-tenant routing).
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} normalizedDomain
 */
function pickStorefrontDomainRow(rows, normalizedDomain) {
  if (!rows?.length) return null;
  if (rows.length === 1) return rows[0];

  const exact = rows.filter((row) => String(row.domain).toLowerCase() === normalizedDomain);
  if (exact.length === 1) return exact[0];

  const canonicalDomains = new Set(
    rows.map((row) => String(row.domain).toLowerCase())
  );
  if (canonicalDomains.size === 1) return rows[0];

  console.warn(
    '[resolveStorefrontBusiness] Ambiguous domain match',
    normalizedDomain,
    [...canonicalDomains]
  );
  return null;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} requestDomain
 */
function buildCompactStorefrontBusiness(row, requestDomain) {
  const settings = parseSettingsJson(row.store_settings);
  const pack = getBusinessRegionalPack({ country: row.country, settings });

  return {
    id: row.id,
    business_name: row.business_name,
    email: row.email,
    domain: row.domain,
    phone: row.phone,
    plan_tier: row.plan_tier,
    currency: pack.currency,
    country: row.country,
    city: row.city,
    category: row.category,
    settings,
    _resolvedFrom: requestDomain,
  };
}

/**
 * @param {string} normalizedDomain
 * @param {import('pg').PoolClient} client
 */
async function queryBusinessByDomainSegment(normalizedDomain, client) {
  const exact = [normalizedDomain];

  let result;

  try {
    result = await client.query(
      `SELECT
        b.id, b.business_name, b.domain, b.email, b.phone, b.description,
        b.logo_url, b.cover_image_url, b.website, b.category,
        b.address, b.city, b.country, b.postal_code,
        b.is_active, b.is_verified, b.created_at,
        b.plan_tier,
        COALESCE(bs.is_storefront_enabled, true) AS is_storefront_enabled,
        bs.settings AS store_settings
      FROM businesses b
      LEFT JOIN business_settings bs ON b.id = bs.business_id
      WHERE LOWER(b.domain) = ANY($1::text[]) AND COALESCE(b.is_active, true) = true`,
      [exact]
    );
  } catch (tableError) {
    if (tableError.code !== '42P01' && !tableError.message?.includes('business_settings')) {
      throw tableError;
    }
    result = await client.query(
      `SELECT
        b.id, b.business_name, b.domain, b.email, b.phone, b.description,
        b.logo_url, b.cover_image_url, b.website, b.category,
        b.address, b.city, b.country, b.postal_code,
        b.is_active, b.is_verified, b.created_at,
        b.plan_tier,
        true AS is_storefront_enabled,
        null AS store_settings
      FROM businesses b
      WHERE LOWER(b.domain) = ANY($1::text[]) AND COALESCE(b.is_active, true) = true`,
      [exact]
    );
  }

  if (result.rows.length === 0) {
    const aliasKeys = expandStorefrontDomainAliasKeys(normalizedDomain).filter(
      (key) => key !== normalizedDomain
    );
    if (aliasKeys.length === 0) return null;

    try {
      result = await client.query(
        `SELECT
          b.id, b.business_name, b.domain, b.email, b.phone, b.description,
          b.logo_url, b.cover_image_url, b.website, b.category,
          b.address, b.city, b.country, b.postal_code,
          b.is_active, b.is_verified, b.created_at,
          b.plan_tier,
          COALESCE(bs.is_storefront_enabled, true) AS is_storefront_enabled,
          bs.settings AS store_settings
        FROM businesses b
        LEFT JOIN business_settings bs ON b.id = bs.business_id
        WHERE LOWER(b.domain) = ANY($1::text[]) AND COALESCE(b.is_active, true) = true`,
        [aliasKeys]
      );
    } catch (tableError) {
      if (tableError.code !== '42P01' && !tableError.message?.includes('business_settings')) {
        throw tableError;
      }
      result = await client.query(
        `SELECT
          b.id, b.business_name, b.domain, b.email, b.phone, b.description,
          b.logo_url, b.cover_image_url, b.website, b.category,
          b.address, b.city, b.country, b.postal_code,
          b.is_active, b.is_verified, b.created_at,
          b.plan_tier,
          true AS is_storefront_enabled,
          null AS store_settings
        FROM businesses b
        WHERE LOWER(b.domain) = ANY($1::text[]) AND COALESCE(b.is_active, true) = true`,
        [aliasKeys]
      );
    }
  }

  let row = pickStorefrontDomainRow(result.rows, normalizedDomain);

  if (!row) {
    const lookupKeys = expandStorefrontDomainAliasKeys(normalizedDomain);
    try {
      result = await client.query(
        `SELECT
          b.id, b.business_name, b.domain, b.email, b.phone, b.description,
          b.logo_url, b.cover_image_url, b.website, b.category,
          b.address, b.city, b.country, b.postal_code,
          b.is_active, b.is_verified, b.created_at,
          b.plan_tier,
          COALESCE(bs.is_storefront_enabled, true) AS is_storefront_enabled,
          bs.settings AS store_settings
        FROM business_custom_domains cd
        JOIN businesses b ON cd.business_id = b.id
        LEFT JOIN business_settings bs ON b.id = bs.business_id
        WHERE LOWER(cd.domain) = ANY($1::text[])
          AND cd.is_active = true
          AND COALESCE(b.is_active, true) = true
        ORDER BY (LOWER(cd.domain) = $2) DESC, cd.is_primary DESC NULLS LAST, cd.id ASC
        LIMIT 5`,
        [lookupKeys, normalizedDomain]
      );
    } catch (customDomainError) {
      if (customDomainError.code !== '42P01') throw customDomainError;
      return null;
    }

    row = pickStorefrontDomainRow(result.rows, normalizedDomain);
  }

  return row;
}

const BUSINESS_ROW_SELECT = `
  SELECT
    b.id, b.business_name, b.domain, b.email, b.phone, b.description,
    b.logo_url, b.cover_image_url, b.website, b.category,
    b.address, b.city, b.country, b.postal_code,
    b.is_active, b.is_verified, b.created_at,
    b.plan_tier,
    COALESCE(bs.is_storefront_enabled, true) AS is_storefront_enabled,
    bs.settings AS store_settings
  FROM businesses b
  LEFT JOIN business_settings bs ON b.id = bs.business_id`;

const BUSINESS_ROW_SELECT_FALLBACK = `
  SELECT
    b.id, b.business_name, b.domain, b.email, b.phone, b.description,
    b.logo_url, b.cover_image_url, b.website, b.category,
    b.address, b.city, b.country, b.postal_code,
    b.is_active, b.is_verified, b.created_at,
    b.plan_tier,
    true AS is_storefront_enabled,
    null AS store_settings
  FROM businesses b`;

/**
 * Load a business row by primary key (indexed) — used after Redis L2 domain hits.
 * @param {string} businessId
 * @param {import('pg').PoolClient} client
 */
async function queryBusinessRowById(businessId, client) {
  try {
    const result = await client.query(
      `${BUSINESS_ROW_SELECT}
      WHERE b.id = $1::uuid AND COALESCE(b.is_active, true) = true`,
      [businessId]
    );
    return result.rows[0] || null;
  } catch (tableError) {
    if (tableError.code !== '42P01' && !tableError.message?.includes('business_settings')) {
      throw tableError;
    }
    const result = await client.query(
      `${BUSINESS_ROW_SELECT_FALLBACK}
      WHERE b.id = $1::uuid AND COALESCE(b.is_active, true) = true`,
      [businessId]
    );
    return result.rows[0] || null;
  }
}

/**
 * Uncached storefront business resolution (Postgres L3).
 * @param {string} normalizedDomain
 */
async function loadResolveStorefrontBusinessUncached(normalizedDomain) {
  const redisCached = await getCachedStorefrontBusiness(normalizedDomain);
  
  if (redisCached?.id) {
    const client = await pool.connect();
    try {
      const domainRow = await queryBusinessByDomainSegment(normalizedDomain, client);
      
      if (domainRow?.id === redisCached.id) {
        const settings = parseSettingsJson(domainRow.store_settings);
        if (!isStorefrontDisabled(domainRow, settings)) {
          const resolved = buildCompactStorefrontBusiness(domainRow, normalizedDomain);
          // BLOCKING cache update (not void) - FIX #2
          await setCachedStorefrontBusiness(normalizedDomain, resolved);
          return resolved;
        }
      }
      // ID mismatch → purge stale cache immediately - FIX #2
      await purgeCachedStorefrontDomain(normalizedDomain);
    } finally {
      client.release();
    }
  }

  const client = await pool.connect();

  try {
    const row = await queryBusinessByDomainSegment(normalizedDomain, client);
    
    if (!row) return null;

    const settings = parseSettingsJson(row.store_settings);
    if (isStorefrontDisabled(row, settings)) return null;

    const resolved = buildCompactStorefrontBusiness(row, normalizedDomain);
    // BLOCKING cache update - FIX #2
    await setCachedStorefrontBusiness(normalizedDomain, resolved);
    return resolved;
  } finally {
    client.release();
  }
}

/**
 * Resolve a storefront business from URL domain segment (compact, API/checkout).
 * @param {string} domain
 */
export async function resolveStorefrontBusiness(domain) {
  const normalizedDomain = normalizeStorefrontDomainSegment(domain);
  if (!normalizedDomain) return null;

  return cacheStorefrontRead(
    () => loadResolveStorefrontBusinessUncached(normalizedDomain),
    ['storefront-business', normalizedDomain],
    {
      tags: [storefrontBusinessTag(normalizedDomain), 'storefront-business'],
      revalidate: STOREFRONT_BUSINESS_REVALIDATE_SEC,
    }
  );
}

/**
 * Full storefront shell for RSC (business + settings + categories).
 * @param {string} domain
 * @returns {Promise<ActionResult>}
 */
export async function loadStorefrontBusinessShell(domain) {
  if (!domain || typeof domain !== 'string') {
    return actionFailure('INVALID_DOMAIN', 'Domain parameter is required and must be a string');
  }

  const normalizedDomain = normalizeStorefrontDomainSegment(domain);
  if (!normalizedDomain) {
    return actionFailure('INVALID_DOMAIN', 'Domain parameter is required and must be a string');
  }

  const redisCached = await getCachedStorefrontBusiness(normalizedDomain);
  const client = await pool.connect();

  try {
    let row = null;

    if (redisCached?.id) {
      const redisSettings = parseSettingsJson(redisCached.settings);
      if (!isStorefrontDisabled(redisCached, redisSettings)) {
        row = await queryBusinessRowById(redisCached.id, client);
      }
    }

    if (!row) {
      row = await queryBusinessByDomainSegment(normalizedDomain, client);
    }

    if (!row) {
      return actionFailure('BUSINESS_NOT_FOUND', 'Business not found');
    }

    const rawSettingsEarly = parseSettingsJson(row.store_settings);
    if (isStorefrontDisabled(row, rawSettingsEarly)) {
      return actionFailure('STOREFRONT_DISABLED', 'Storefront is not enabled for this business');
    }

    const compact = buildCompactStorefrontBusiness(row, normalizedDomain);
    void setCachedStorefrontBusiness(normalizedDomain, compact);

    let categoriesResult = { rows: [] };
    try {
      categoriesResult = await client.query(
        `SELECT id, name, slug, description, image_url, parent_id, sort_order
        FROM product_categories
        WHERE business_id = $1::uuid AND COALESCE(is_active, true) = true
        ORDER BY COALESCE(sort_order, 0), name`,
        [row.id]
      );
    } catch (categoriesError) {
      if (
        categoriesError.code === '42P01' ||
        categoriesError.code === '42703' ||
        categoriesError.message?.includes('product_categories') ||
        categoriesError.message?.includes('does not exist')
      ) {
        categoriesResult = { rows: [] };
      } else {
        throw categoriesError;
      }
    }

    const businessPayload = {
      id: row.id,
      business_name: row.business_name,
      domain: row.domain,
      email: row.email,
      phone: row.phone,
      description: row.description,
      logo_url: row.logo_url,
      cover_image_url: row.cover_image_url,
      website: row.website,
      category: row.category,
      address: row.address,
      city: row.city,
      country: row.country,
      postal_code: row.postal_code,
      is_verified: row.is_verified,
      created_at: toIsoString(row.created_at),
    };

    const dbOff = row.is_storefront_enabled === false;
    const jsonOff =
      rawSettingsEarly.storefront?.enabled === false || rawSettingsEarly.enabled === false;

    return actionSuccess({
      business: businessPayload,
      settings: {
        ...rawSettingsEarly,
        currency: resolveStorefrontCurrency(rawSettingsEarly, businessPayload),
        locale: resolveStorefrontLocale(rawSettingsEarly, businessPayload),
        is_storefront_enabled: !dbOff && !jsonOff,
      },
      categories: categoriesResult.rows,
      plan: {
        tier: row.plan_tier || 'starter',
        features: {},
      },
    });
  } catch (error) {
    console.error('[loadStorefrontBusinessShell] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}
