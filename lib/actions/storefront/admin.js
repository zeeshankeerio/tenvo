'use server';

import pool from '@/lib/db';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import { StorefrontSyncService } from '@/lib/services/StorefrontSyncService';

/**
 * Storefront Admin Actions
 * Manage storefront settings, enable/disable, sync inventory
 */

/**
 * Get storefront settings for a business
 */
export async function getStorefrontSettings(businessId) {
  const client = await pool.connect();
  
  try {
    // Get business settings
    const settingsResult = await client.query(
      `SELECT settings FROM business_settings WHERE business_id = $1`,
      [businessId]
    );
    
    // Get domain info
    const domainResult = await client.query(
      `SELECT domain, is_active, is_primary 
       FROM business_custom_domains 
       WHERE business_id = $1::uuid AND is_active = true
       LIMIT 1`,
      [businessId]
    );
    
    // Get product count
    const countResult = await client.query(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN is_active = true THEN 1 END) as active,
              COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
       FROM products 
       WHERE business_id = $1::uuid AND is_deleted = false`,
      [businessId]
    );
    
    let settings = {};
    if (settingsResult.rows.length > 0) {
      try {
        settings = typeof settingsResult.rows[0].settings === 'string' 
          ? JSON.parse(settingsResult.rows[0].settings)
          : settingsResult.rows[0].settings;
      } catch (e) {
        console.error('Error parsing settings:', e);
        settings = {};
      }
    }
    
    return actionSuccess({
      storefront: {
        enabled: settings?.storefront?.enabled !== false, // Default true
        settings: settings?.storefront || {},
      },
      domain: domainResult.rows[0] || null,
      products: countResult.rows[0] || { total: 0, active: 0, inactive: 0 },
      url: domainResult.rows[0] 
        ? `/store/${domainResult.rows[0].domain}` 
        : null
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
    
    // Get current settings
    const settingsResult = await client.query(
      `SELECT settings FROM business_settings WHERE business_id = $1`,
      [businessId]
    );
    
    let settings = {};
    if (settingsResult.rows.length > 0) {
      try {
        settings = typeof settingsResult.rows[0].settings === 'string'
          ? JSON.parse(settingsResult.rows[0].settings)
          : settingsResult.rows[0].settings;
      } catch (e) {
        settings = {};
      }
    }
    
    // Update storefront enabled status
    const newSettings = {
      ...settings,
      storefront: {
        ...(settings?.storefront || {}),
        enabled: enabled
      }
    };
    
    if (settingsResult.rows.length === 0) {
      // Insert new settings
      await client.query(
        `INSERT INTO business_settings (business_id, settings, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [businessId, JSON.stringify(newSettings)]
      );
    } else {
      // Update existing settings
      await client.query(
        `UPDATE business_settings 
         SET settings = $1, updated_at = NOW()
         WHERE business_id = $2`,
        [JSON.stringify(newSettings), businessId]
      );
    }
    
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
    
    // Get current settings
    const settingsResult = await client.query(
      `SELECT settings FROM business_settings WHERE business_id = $1`,
      [businessId]
    );
    
    let currentSettings = {};
    if (settingsResult.rows.length > 0) {
      try {
        currentSettings = typeof settingsResult.rows[0].settings === 'string'
          ? JSON.parse(settingsResult.rows[0].settings)
          : settingsResult.rows[0].settings;
      } catch (e) {
        currentSettings = {};
      }
    }
    
    // Merge new settings
    const newSettings = {
      ...currentSettings,
      storefront: {
        ...(currentSettings?.storefront || {}),
        ...settings
      }
    };
    
    if (settingsResult.rows.length === 0) {
      // Insert new settings
      await client.query(
        `INSERT INTO business_settings (business_id, settings, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [businessId, JSON.stringify(newSettings)]
      );
    } else {
      // Update existing settings
      await client.query(
        `UPDATE business_settings 
         SET settings = $1, updated_at = NOW()
         WHERE business_id = $2`,
        [JSON.stringify(newSettings), businessId]
      );
    }
    
    await client.query('COMMIT');
    
    console.log(`[updateBusinessSettings] Settings updated for business ${businessId}`);
    return actionSuccess({ businessId, settings: newSettings.storefront });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[updateBusinessSettings] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}
