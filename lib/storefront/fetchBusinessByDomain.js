import 'server-only';

import { cache } from 'react';
import pool from '@/lib/db';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import { resolveStorefrontCurrency, resolveStorefrontLocale } from '@/lib/storefront/storefrontRegional';
import {
  storefrontBusinessTag,
  STOREFRONT_BUSINESS_REVALIDATE_SEC,
} from '@/lib/storefront/storefrontCacheTags';
import { cacheStorefrontRead } from '@/lib/storefront/storefrontCachedRead';

const STOREFRONT_DEBUG =
  process.env.STOREFRONT_DEBUG === '1' || process.env.STOREFRONT_DEBUG === 'true';

function toIsoString(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return String(value);
}

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
 * Uncached storefront business lookup (domain → business shell + categories).
 */
async function loadBusinessByDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    console.error('[fetchBusinessByDomain] Invalid domain parameter:', domain);
    return actionFailure('INVALID_DOMAIN', 'Domain parameter is required and must be a string');
  }

  const client = await pool.connect();

  try {
    const normalizedDomain = domain.toLowerCase().trim();
    const altDomain = normalizedDomain.replace(/-/g, '_');
    const altDomain2 = normalizedDomain.replace(/_/g, '-');

    if (STOREFRONT_DEBUG) {
      console.log(
        `[fetchBusinessByDomain] Looking for domain: ${normalizedDomain} (alternatives: ${altDomain}, ${altDomain2})`
      );
    }

    let result;

    try {
      result = await client.query(
        `SELECT 
          b.id, b.business_name, b.domain, b.email, b.phone, b.description,
          b.logo_url, b.cover_image_url, b.website, b.category,
          b.address, b.city, b.country, b.postal_code,
          b.is_active, b.is_verified, b.created_at,
          b.plan_tier,
          COALESCE(bs.is_storefront_enabled, true) as is_storefront_enabled,
          bs.settings as store_settings,
          null as plan_features
        FROM businesses b
        LEFT JOIN business_settings bs ON b.id = bs.business_id
        WHERE LOWER(b.domain) = ANY($1) AND COALESCE(b.is_active, true) = true`,
        [[normalizedDomain, altDomain, altDomain2]]
      );
    } catch (tableError) {
      if (tableError.message?.includes('business_settings') || tableError.code === '42P01') {
        console.log('[fetchBusinessByDomain] Business settings table missing, using fallback query');
        result = await client.query(
          `SELECT 
            b.id, b.business_name, b.domain, b.email, b.phone, b.description,
            b.logo_url, b.cover_image_url, b.website, b.category,
            b.address, b.city, b.country, b.postal_code,
            b.is_active, b.is_verified, b.created_at,
            'free' as plan_tier,
            true as is_storefront_enabled,
            null as store_settings,
            null as plan_features
          FROM businesses b
          WHERE LOWER(b.domain) = ANY($1) AND COALESCE(b.is_active, true) = true`,
          [[normalizedDomain, altDomain, altDomain2]]
        );
      } else {
        throw tableError;
      }
    }

    if (result.rows.length === 0) {
      if (STOREFRONT_DEBUG) {
        console.log('[fetchBusinessByDomain] Not found in businesses table, checking custom domains...');
      }
      try {
        result = await client.query(
          `SELECT 
            b.id, b.business_name, b.domain, b.email, b.phone, b.description,
            b.logo_url, b.cover_image_url, b.website, b.category,
            b.address, b.city, b.country, b.postal_code,
            b.is_active, b.is_verified, b.created_at,
            b.plan_tier,
            COALESCE(bs.is_storefront_enabled, true) as is_storefront_enabled,
            bs.settings as store_settings,
            null as plan_features
          FROM business_custom_domains cd
          JOIN businesses b ON cd.business_id = b.id
          LEFT JOIN business_settings bs ON b.id = bs.business_id
          WHERE LOWER(cd.domain) = ANY($1) AND cd.is_active = true AND COALESCE(b.is_active, true) = true`,
          [[normalizedDomain, altDomain, altDomain2]]
        );
      } catch (customDomainError) {
        if (
          customDomainError.message?.includes('business_custom_domains') ||
          customDomainError.code === '42P01'
        ) {
          console.log('[fetchBusinessByDomain] Custom domains table missing, skipping custom domain check');
          result = { rows: [] };
        } else {
          throw customDomainError;
        }
      }
    }

    if (result.rows.length === 0) {
      console.log(`[fetchBusinessByDomain] Business not found for domain: ${domain}`);
      return actionFailure('BUSINESS_NOT_FOUND', 'Business not found');
    }

    const business = result.rows[0];
    if (STOREFRONT_DEBUG) {
      console.log(`[fetchBusinessByDomain] Found business: ${business.business_name} (ID: ${business.id})`);
    }

    const rawSettingsEarly = parseSettingsJson(business.store_settings);
    const dbOff = business.is_storefront_enabled === false;
    const jsonOff =
      rawSettingsEarly.storefront?.enabled === false || rawSettingsEarly.enabled === false;

    if (dbOff || jsonOff) {
      if (STOREFRONT_DEBUG) {
        console.log(`[fetchBusinessByDomain] Storefront disabled for business: ${business.id}`);
      }
      return actionFailure('STOREFRONT_DISABLED', 'Storefront is not enabled for this business');
    }

    let categoriesResult = { rows: [] };
    try {
      categoriesResult = await client.query(
        `SELECT id, name, slug, description, image_url, parent_id, sort_order
        FROM product_categories
        WHERE business_id = $1::uuid AND COALESCE(is_active, true) = true
        ORDER BY COALESCE(sort_order, 0), name`,
        [business.id]
      );
    } catch (categoriesError) {
      if (
        categoriesError.code === '42P01' ||
        categoriesError.code === '42703' ||
        categoriesError.message?.includes('product_categories') ||
        categoriesError.message?.includes('does not exist')
      ) {
        console.warn('[fetchBusinessByDomain] Categories query skipped:', categoriesError.message);
        categoriesResult = { rows: [] };
      } else {
        throw categoriesError;
      }
    }

    const businessPayload = {
      id: business.id,
      business_name: business.business_name,
      domain: business.domain,
      email: business.email,
      phone: business.phone,
      description: business.description,
      logo_url: business.logo_url,
      cover_image_url: business.cover_image_url,
      website: business.website,
      category: business.category,
      address: business.address,
      city: business.city,
      country: business.country,
      postal_code: business.postal_code,
      is_verified: business.is_verified,
      created_at: toIsoString(business.created_at),
    };

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
        tier: business.plan_tier || 'starter',
        features: business.plan_features || {},
      },
    });
  } catch (error) {
    console.error('[fetchBusinessByDomain] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Cached storefront business resolver.
 * React cache() dedupes within a request; unstable_cache shares across requests.
 */
export const fetchBusinessByDomain = cache(async (domain) => {
  if (!domain || typeof domain !== 'string') {
    return actionFailure('INVALID_DOMAIN', 'Domain parameter is required and must be a string');
  }

  const normalized = domain.toLowerCase().trim();

  return cacheStorefrontRead(
    () => loadBusinessByDomain(normalized),
    ['storefront-business', normalized],
    {
      tags: [storefrontBusinessTag(normalized), 'storefront-business'],
      revalidate: STOREFRONT_BUSINESS_REVALIDATE_SEC,
    }
  );
});
