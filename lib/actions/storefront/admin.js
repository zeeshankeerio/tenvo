'use server';

import pool from '@/lib/db';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import { StorefrontSyncService } from '@/lib/services/StorefrontSyncService';

/**
 * Storefront Admin Actions
 * Manage storefront settings, enable/disable, sync inventory
 *
 * DB alignment: `business_settings` (Prisma) has `settings` JSON only — not legacy
 * `store_settings` / `is_storefront_enabled` / `plan_tier` columns on that table.
 * Plan tier lives on `businesses.plan_tier`. Storefront on/off is stored at
 * `settings.storefront.enabled` (JSON).
 */

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
 * Get storefront settings for a business
 */
export async function getStorefrontSettings(businessId) {
  const client = await pool.connect();
  
  try {
    // Get business + settings in one query (matches prisma `business_settings.settings`)
    const result = await client.query(
      `SELECT b.id, b.business_name, b.domain, b.description, b.logo_url, b.cover_image_url,
              b.email, b.phone, b.address, b.city, b.country,
              b.plan_tier,
              bs.settings AS store_settings,
              COALESCE(bs.is_storefront_enabled, true) AS is_storefront_enabled
       FROM businesses b
       LEFT JOIN business_settings bs ON bs.business_id = b.id
       WHERE b.id = $1::uuid`,
      [businessId]
    );

    const row = result.rows[0];
    
    // Get domain info
    const domainResult = await client.query(
      `SELECT domain, is_active, is_primary 
       FROM business_custom_domains 
       WHERE business_id = $1::uuid AND is_active = true
       LIMIT 1`,
      [businessId]
    ).catch(() => ({ rows: [] }));
    
    // Get product count
    const countResult = await client.query(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN is_active = true THEN 1 END) as active
       FROM products 
       WHERE business_id = $1::uuid AND is_deleted = false`,
      [businessId]
    ).catch(() => ({ rows: [{ total: 0, active: 0 }] }));

    const storeSettings = parseSettingsJson(row?.store_settings);
    const jsonOff =
      storeSettings.storefront?.enabled === false || storeSettings.enabled === false;
    const colOff = row?.is_storefront_enabled === false;
    const storefrontEnabled = !colOff && !jsonOff;

    const storeDomain = domainResult.rows[0]?.domain || row?.domain || null;
    
    return actionSuccess({
      // Flat shape — component spreads this directly
      enabled: storefrontEnabled,
      heroTitle: storeSettings.heroTitle || '',
      announcement: storeSettings.announcement || '',
      theme: storeSettings.theme || 'default',
      currency: storeSettings.currency || 'PKR',
      enableCOD: storeSettings.enableCOD !== false,
      enableCard: storeSettings.enableCard !== false,
      freeShippingThreshold: storeSettings.freeShippingThreshold || 2000,
      returnPolicyDays: storeSettings.returnPolicyDays || 7,
      brand: storeSettings.brand || { primaryColor: '' },
      socialLinks: storeSettings.socialLinks || { facebook: '', instagram: '', twitter: '', youtube: '' },
      // Business core fields (for images + info)
      logoUrl: row?.logo_url || '',
      coverImageUrl: row?.cover_image_url || '',
      description: row?.description || '',
      phone: row?.phone || '',
      address: row?.address || '',
      // Domain
      storeDomain,
      storeUrl: storeDomain ? `/store/${storeDomain}` : null,
      products: countResult.rows[0] || { total: 0, active: 0 },
    });
    
  } catch (error) {
    console.error('[getStorefrontSettings] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Toggle storefront enabled/disabled
 */
export async function toggleStorefront(businessId, enabled) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO business_settings (business_id, settings, is_storefront_enabled, created_at, updated_at)
       VALUES (
         $1::uuid,
         jsonb_set('{}'::jsonb, '{storefront,enabled}', to_jsonb($2::boolean), true),
         $2::boolean,
         NOW(),
         NOW()
       )
       ON CONFLICT (business_id) DO UPDATE SET
         settings = jsonb_set(
           COALESCE(business_settings.settings, '{}'::jsonb),
           '{storefront,enabled}',
           to_jsonb($2::boolean),
           true
         ),
         is_storefront_enabled = $2::boolean,
         updated_at = NOW()`,
      [businessId, enabled]
    );
    
    await client.query('COMMIT');
    
    console.log(`[toggleStorefront] Storefront ${enabled ? 'enabled' : 'disabled'} for business ${businessId}`);
    return actionSuccess({ enabled, businessId });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[toggleStorefront] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Sync inventory to storefront
 * Bulk enable all active inventory products for storefront
 */
export async function syncInventoryToStorefront(businessId) {
  try {
    console.log(`[syncInventoryToStorefront] Starting sync for business ${businessId}`);
    const result = await StorefrontSyncService.syncInventoryToStorefront(businessId);
    
    if (result.success) {
      console.log(`[syncInventoryToStorefront] Synced ${result.synced} products`);
    } else {
      console.error(`[syncInventoryToStorefront] Failed:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('[syncInventoryToStorefront] Error:', error);
    return actionFailure('SYNC_ERROR', error.message);
  }
}

/**
 * Configure custom domain for storefront
 */
export async function configureStorefrontDomain(businessId, domain) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Validate domain format
    const domainRegex = /^[a-z0-9-]+$/;
    if (!domainRegex.test(domain)) {
      return actionFailure('INVALID_DOMAIN', 'Domain can only contain lowercase letters, numbers, and hyphens');
    }
    
    // Check if domain is already taken by another business
    const existingResult = await client.query(
      `SELECT business_id FROM business_custom_domains 
       WHERE domain = $1 AND business_id != $2 AND is_active = true`,
      [domain, businessId]
    );
    
    if (existingResult.rows.length > 0) {
      return actionFailure('DOMAIN_TAKEN', 'This domain is already in use');
    }
    
    // Deactivate any existing primary domains for this business
    await client.query(
      `UPDATE business_custom_domains 
       SET is_primary = false, is_active = false
       WHERE business_id = $1::uuid`,
      [businessId]
    );
    
    // Create or reactivate the domain
    await client.query(
      `INSERT INTO business_custom_domains (business_id, domain, is_active, is_primary, created_at)
       VALUES ($1, $2, true, true, NOW())
       ON CONFLICT (business_id, domain) 
       DO UPDATE SET is_active = true, is_primary = true`,
      [businessId, domain]
    );
    
    await client.query('COMMIT');
    
    console.log(`[configureStorefrontDomain] Domain ${domain} configured for business ${businessId}`);
    return actionSuccess({ domain, businessId, url: `/store/${domain}` });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[configureStorefrontDomain] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Initialize storefront for a new business
 * Sets up domain and syncs initial products
 */
export async function initializeStorefront(businessId, domain) {
  try {
    console.log(`[initializeStorefront] Initializing for business ${businessId}`);
    
    const result = await StorefrontSyncService.initializeStorefront(businessId, domain);
    
    if (result.success) {
      console.log(`[initializeStorefront] Success: ${result.domain}, synced ${result.productsSynced} products`);
    }
    
    return result;
  } catch (error) {
    console.error('[initializeStorefront] Error:', error);
    return actionFailure('INIT_ERROR', error.message);
  }
}

/**
 * Update business storefront settings
 */
export async function updateBusinessSettings(businessId, settings) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Separate business core fields from storefront config
    const { logoUrl, coverImageUrl, description, phone, address, ...storefrontConfig } = settings;

    // 1. Update businesses table for core info + images
    const bizUpdates = {};
    if (logoUrl !== undefined) bizUpdates.logo_url = logoUrl;
    if (coverImageUrl !== undefined) bizUpdates.cover_image_url = coverImageUrl;
    if (description !== undefined) bizUpdates.description = description;
    if (phone !== undefined) bizUpdates.phone = phone;
    if (address !== undefined) bizUpdates.address = address;

    if (Object.keys(bizUpdates).length > 0) {
      const setClauses = Object.keys(bizUpdates).map((k, i) => `${k} = $${i + 2}`).join(', ');
      await client.query(
        `UPDATE businesses SET ${setClauses}, updated_at = NOW() WHERE id = $1::uuid`,
        [businessId, ...Object.values(bizUpdates)]
      );
    }

    // 2. Merge storefront config into business_settings.settings (JSON)
    const currentRow = await client.query(
      `SELECT settings FROM business_settings WHERE business_id = $1`,
      [businessId]
    );

    const currentStoreSettings = parseSettingsJson(currentRow.rows[0]?.settings);

    const newStoreSettings = { ...currentStoreSettings, ...storefrontConfig };
    if (storefrontConfig.enabled !== undefined && storefrontConfig.enabled !== null) {
      const flag = Boolean(storefrontConfig.enabled);
      newStoreSettings.storefront = { ...newStoreSettings.storefront, enabled: flag };
    }

    const enabledColumn =
      storefrontConfig.enabled !== undefined && storefrontConfig.enabled !== null
        ? Boolean(storefrontConfig.enabled)
        : null;

    await client.query(
      `INSERT INTO business_settings (business_id, settings, is_storefront_enabled, created_at, updated_at)
       VALUES ($1::uuid, $2::jsonb, COALESCE($3, true), NOW(), NOW())
       ON CONFLICT (business_id) DO UPDATE SET
         settings = COALESCE(business_settings.settings, '{}'::jsonb) || $2::jsonb,
         is_storefront_enabled = CASE
           WHEN $3 IS NULL THEN business_settings.is_storefront_enabled
           ELSE $3::boolean
         END,
         updated_at = NOW()`,
      [businessId, JSON.stringify(newStoreSettings), enabledColumn]
    );
    
    await client.query('COMMIT');
    
    console.log(`[updateBusinessSettings] Settings updated for business ${businessId}`);
    return actionSuccess({ businessId, settings: newStoreSettings });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[updateBusinessSettings] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}
