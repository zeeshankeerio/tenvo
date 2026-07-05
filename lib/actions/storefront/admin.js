'use server';

import pool from '@/lib/db';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import { StorefrontSyncService } from '@/lib/services/StorefrontSyncService';
import { requireStorefrontHubAccess } from '@/lib/tenancy/storefrontHubAuth';
import {
  invalidateStorefrontCatalog,
  invalidateStorefrontBusiness,
  invalidateStorefrontTenant,
} from '@/lib/storefront/invalidateStorefrontCatalog';
import {
  buildStoreContactPayload,
  flattenStoreContactForForm,
} from '@/lib/storefront/storeContactPayload';
import { getStoreSetupStatus } from '@/lib/storefront/storeSetupStatus';
import { normalizePageSections } from '@/lib/storefront/storePageSections';
import { getMarketplaceConfig } from '@/lib/storefront/autoMarketplace';
import { getDealershipConfig } from '@/lib/storefront/tenvoVehiclesTemplate';
import { getAutoPartsConfig } from '@/lib/storefront/autoParts';
import { getRestaurantConfig } from '@/lib/storefront/restaurantStorefront';
import { getPharmacyConfig } from '@/lib/storefront/pharmacyStorefront';
import { getFurnitureConfig } from '@/lib/storefront/furnitureStorefront';
import { getFitnessConfig } from '@/lib/storefront/fitnessStorefront';
import { getSupermarketAdminFormSettings } from '@/lib/storefront/supermarketStorefront';
import { getFashionEditorialConfig } from '@/lib/storefront/fashionEditorial';
import {
  sanitizeHeroSlides,
  resolveStoredHeroSlides,
  clearLegacyVerticalHeroSlides,
} from '@/lib/storefront/heroSlides';
import { getBookingConfig, normalizeTenantMeetingUrl } from '@/lib/storefront/storefrontBooking';

/**
 * Storefront Admin Actions
 * Manage storefront settings, enable/disable, sync inventory
 *
 * DB alignment: `business_settings` (Prisma) has `settings` JSON only, not legacy
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
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  const client = await pool.connect();
  
  try {
    // Get business + settings in one query (matches prisma `business_settings.settings`)
    const result = await client.query(
      `SELECT b.id, b.business_name, b.domain, b.category, b.description, b.logo_url, b.cover_image_url,
              b.email, b.phone, b.address, b.city, b.country, b.postal_code, b.website,
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
    const storeDomain = domainResult.rows[0]?.domain || row?.domain || null;
    const marketplaceConfig = getMarketplaceConfig(storeSettings);
    const dealershipConfig = getDealershipConfig(storeSettings);
    const autoPartsConfig = getAutoPartsConfig(storeSettings);
    const restaurantConfig = getRestaurantConfig(storeSettings);
    const pharmacyConfig = getPharmacyConfig(storeSettings);
    const furnitureConfig = getFurnitureConfig(storeSettings);
    const fitnessConfig = getFitnessConfig(storeSettings, storeDomain);
    const supermarketConfig = getSupermarketAdminFormSettings(storeSettings, storeDomain, row?.category);
    const fashionConfig = getFashionEditorialConfig(storeSettings);
    const bookingConfig = getBookingConfig(storeSettings);
    const globalHeroSlides = resolveStoredHeroSlides(storeSettings);
    const jsonOff =
      storeSettings.storefront?.enabled === false || storeSettings.enabled === false;
    const colOff = row?.is_storefront_enabled === false;
    const storefrontEnabled = !colOff && !jsonOff;

    const contactFlat = flattenStoreContactForForm({
      business: row || {},
      storeSettings,
    });
    const setupStatus = getStoreSetupStatus({
      enabled: storefrontEnabled,
      storeDomain,
      description: row?.description || '',
      logoUrl: row?.logo_url || '',
      products: countResult.rows[0] || { total: 0, active: 0 },
      freeShippingThreshold: storeSettings.freeShippingThreshold ?? 2000,
      ...contactFlat,
    });

    return actionSuccess({
      // Flat shape, component spreads this directly
      enabled: storefrontEnabled,
      heroTitle: storeSettings.heroTitle || '',
      heroSubtitle: storeSettings.heroSubtitle || storeSettings.storefront?.heroSubtitle || '',
      announcement: storeSettings.announcement || '',
      theme: storeSettings.theme || 'default',
      currency: storeSettings.currency || 'PKR',
      enableCOD: storeSettings.enableCOD !== false,
      enableCard: storeSettings.enableCard !== false,
      freeShippingThreshold: storeSettings.freeShippingThreshold || 2000,
      returnPolicyDays: storeSettings.returnPolicyDays || 7,
      brand: storeSettings.brand || { primaryColor: '' },
      socialLinks: storeSettings.socialLinks || { facebook: '', instagram: '', twitter: '', youtube: '' },
      pageSections: normalizePageSections(storeSettings.pageSections, {
        brandColor: storeSettings.brand?.primaryColor,
      }),
      marketplace: marketplaceConfig,
      dealership: dealershipConfig,
      autoParts: autoPartsConfig,
      restaurant: restaurantConfig,
      pharmacy: pharmacyConfig,
      furniture: furnitureConfig,
      fitness: fitnessConfig,
      supermarket: supermarketConfig,
      fashion: fashionConfig,
      heroSlides: globalHeroSlides,
      booking: bookingConfig,
      planTier: row?.plan_tier || 'free',
      // Business core fields (for images + info)
      logoUrl: row?.logo_url || '',
      coverImageUrl: row?.cover_image_url || '',
      description: row?.description || '',
      // Public contact (settings.contact + business fallbacks)
      ...contactFlat,
      // Domain
      storeDomain,
      storeUrl: storeDomain ? `/store/${storeDomain}` : null,
      products: countResult.rows[0] || { total: 0, active: 0 },
      setupStatus,
      ownerLoginEmail: row?.email || '',
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
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

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

    await invalidateStorefrontTenant(businessId);

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
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  try {
    console.log(`[syncInventoryToStorefront] Starting sync for business ${businessId}`);
    const result = await StorefrontSyncService.syncInventoryToStorefront(businessId);
    
    if (result.success) {
      console.log(`[syncInventoryToStorefront] Synced ${result.synced} products`);
      invalidateStorefrontCatalog(businessId);
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
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Validate domain format
    const domainRegex = /^[a-z0-9-]+$/;
    if (!domainRegex.test(domain)) {
      return actionFailure('INVALID_DOMAIN', 'Domain can only contain lowercase letters, numbers, and hyphens');
    }
    
    const normalizedDomain = domain.toLowerCase().trim();

    const existingCustom = await client.query(
      `SELECT business_id FROM business_custom_domains
       WHERE LOWER(domain) = LOWER($1) AND business_id != $2::uuid AND is_active = true`,
      [normalizedDomain, businessId]
    );

    if (existingCustom.rows.length > 0) {
      return actionFailure('DOMAIN_TAKEN', 'This domain is already in use');
    }

    const existingCanonical = await client.query(
      `SELECT id FROM businesses
       WHERE LOWER(domain) = LOWER($1) AND id != $2::uuid`,
      [normalizedDomain, businessId]
    );

    if (existingCanonical.rows.length > 0) {
      return actionFailure(
        'DOMAIN_TAKEN',
        'This domain matches another store handle and cannot be used as a custom domain'
      );
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
      [businessId, normalizedDomain]
    );
    
    await client.query('COMMIT');

    await invalidateStorefrontTenant(businessId);
    invalidateStorefrontBusiness(normalizedDomain);

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
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  try {
    console.log(`[initializeStorefront] Initializing for business ${businessId}`);
    
    const result = await StorefrontSyncService.initializeStorefront(businessId, domain);
    
    if (result.success) {
      console.log(`[initializeStorefront] Success: ${result.domain}, synced ${result.productsSynced} products`);
      await invalidateStorefrontTenant(businessId);
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
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      logoUrl,
      coverImageUrl,
      description,
      phone,
      address,
      city,
      country,
      postalCode,
      publicEmail,
      whatsapp,
      businessHours,
      website,
      storeUrl,
      storeDomain,
      products,
      setupStatus,
      contactPublished,
      ownerLoginEmail,
      heroSubtitle,
      pageSections,
      marketplace,
      dealership,
      autoParts,
      restaurant,
      pharmacy,
      furniture,
      fitness,
      fashion,
      supermarket,
      heroSlides,
      booking,
      planTier: _planTier,
      ...storefrontConfig
    } = settings;

    // 1. Update businesses table for core info + images (mirrors public contact for hub use)
    const bizUpdates = {};
    if (logoUrl !== undefined) bizUpdates.logo_url = logoUrl;
    if (coverImageUrl !== undefined) bizUpdates.cover_image_url = coverImageUrl;
    if (description !== undefined) bizUpdates.description = description;
    if (phone !== undefined) bizUpdates.phone = phone?.trim() || null;
    if (address !== undefined) bizUpdates.address = address?.trim() || null;
    if (city !== undefined) bizUpdates.city = city?.trim() || null;
    if (country !== undefined) bizUpdates.country = country?.trim() || null;
    if (postalCode !== undefined) bizUpdates.postal_code = postalCode?.trim() || null;
    if (website !== undefined) bizUpdates.website = website?.trim() || null;

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
    const contactPayload = buildStoreContactPayload(
      { publicEmail, phone, whatsapp, address, city, country, postalCode, businessHours, website },
      currentStoreSettings.contact || {}
    );
    const trimmedHours =
      typeof businessHours === 'string' ? businessHours.trim() : contactPayload.businessHours || '';

    const normalizedSections = normalizePageSections(pageSections, {
      brandColor: storefrontConfig.brand?.primaryColor,
    });
    const trimmedHeroSubtitle = typeof heroSubtitle === 'string' ? heroSubtitle.trim() : '';
    const marketplaceRaw = marketplace;
    const { heroSlides: _dealershipHero, ...dealershipRaw } = dealership || {};
    const { heroSlides: _autoPartsHero, ...autoPartsRaw } = autoParts || {};
    const { heroSlides: _restaurantHero, ...restaurantRaw } = restaurant || {};
    const { heroSlides: _pharmacyHero, ...pharmacyRaw } = pharmacy || {};
    const { heroSlides: _furnitureHero, ...furnitureRaw } = furniture || {};
    const { heroSlides: _fitnessHero, ...fitnessRaw } = fitness || {};
    const { heroSlides: _supermarketHero, ...supermarketRaw } = supermarket || {};
    const { heroSlides: _fashionLegacyHero, ...fashionRaw } = fashion || {};
    const bookingRaw = booking;

    const newStoreSettings = {
      ...currentStoreSettings,
      ...storefrontConfig,
      contact: contactPayload,
      pageSections: normalizedSections,
      ...(heroSubtitle !== undefined
        ? {
            heroSubtitle: trimmedHeroSubtitle,
            storefront: {
              ...(currentStoreSettings.storefront || {}),
              ...(storefrontConfig.storefront || {}),
              heroSubtitle: trimmedHeroSubtitle,
            },
          }
        : {}),
      ...(trimmedHours ? { businessHours: trimmedHours } : {}),
    };

    if (dealershipRaw && typeof dealershipRaw === 'object') {
      const prev = currentStoreSettings.storefront?.dealership || {};
      newStoreSettings.storefront = {
        ...(newStoreSettings.storefront || currentStoreSettings.storefront || {}),
        dealership: {
          ...prev,
          ...dealershipRaw,
          trustStrip: {
            ...(prev.trustStrip || {}),
            ...(dealershipRaw.trustStrip || {}),
          },
          marketingBanners: Array.isArray(dealershipRaw.marketingBanners)
            ? dealershipRaw.marketingBanners
            : prev.marketingBanners,
        },
      };
    }

    if (marketplaceRaw && typeof marketplaceRaw === 'object') {
      newStoreSettings.storefront = {
        ...(newStoreSettings.storefront || currentStoreSettings.storefront || {}),
        marketplace: {
          ...(currentStoreSettings.storefront?.marketplace || {}),
          heroPromo: {
            ...(currentStoreSettings.storefront?.marketplace?.heroPromo || {}),
            ...(marketplaceRaw.heroPromo || {}),
          },
          coeTicker: {
            ...(currentStoreSettings.storefront?.marketplace?.coeTicker || {}),
            ...(marketplaceRaw.coeTicker || {}),
          },
          showForum: marketplaceRaw.showForum !== false,
          showArticles: marketplaceRaw.showArticles !== false,
          showEShop: marketplaceRaw.showEShop !== false,
        },
      };
    }

    if (autoPartsRaw && typeof autoPartsRaw === 'object') {
      const prev = currentStoreSettings.storefront?.autoParts || {};
      newStoreSettings.storefront = {
        ...(newStoreSettings.storefront || currentStoreSettings.storefront || {}),
        autoParts: {
          ...prev,
          ...autoPartsRaw,
          slides: Array.isArray(autoPartsRaw.slides) ? autoPartsRaw.slides : prev.slides,
        },
      };
    }

    if (restaurantRaw && typeof restaurantRaw === 'object') {
      const prev = currentStoreSettings.storefront?.restaurant || {};
      newStoreSettings.storefront = {
        ...(newStoreSettings.storefront || currentStoreSettings.storefront || {}),
        restaurant: {
          ...prev,
          ...restaurantRaw,
          cuisineIcons: Array.isArray(restaurantRaw.cuisineIcons) ? restaurantRaw.cuisineIcons : prev.cuisineIcons,
          promoBanners: Array.isArray(restaurantRaw.promoBanners) ? restaurantRaw.promoBanners : prev.promoBanners,
          trustPillars: Array.isArray(restaurantRaw.trustPillars) ? restaurantRaw.trustPillars : prev.trustPillars,
          upperPromoTiles: Array.isArray(restaurantRaw.upperPromoTiles) ? restaurantRaw.upperPromoTiles : prev.upperPromoTiles,
          curatedTabs: Array.isArray(restaurantRaw.curatedTabs) ? restaurantRaw.curatedTabs : prev.curatedTabs,
          quickSearchTerms: Array.isArray(restaurantRaw.quickSearchTerms) ? restaurantRaw.quickSearchTerms : prev.quickSearchTerms,
          orderModes: Array.isArray(restaurantRaw.orderModes) ? restaurantRaw.orderModes : prev.orderModes,
        },
      };
    }

    if (pharmacyRaw && typeof pharmacyRaw === 'object') {
      const prev = currentStoreSettings.storefront?.pharmacy || {};
      newStoreSettings.storefront = {
        ...(newStoreSettings.storefront || currentStoreSettings.storefront || {}),
        pharmacy: {
          ...prev,
          ...pharmacyRaw,
          categoryNav: Array.isArray(pharmacyRaw.categoryNav) ? pharmacyRaw.categoryNav : prev.categoryNav,
          categoryIcons: Array.isArray(pharmacyRaw.categoryIcons) ? pharmacyRaw.categoryIcons : prev.categoryIcons,
          promoBanners: Array.isArray(pharmacyRaw.promoBanners) ? pharmacyRaw.promoBanners : prev.promoBanners,
          careByCondition: Array.isArray(pharmacyRaw.careByCondition) ? pharmacyRaw.careByCondition : prev.careByCondition,
          brands: Array.isArray(pharmacyRaw.brands) ? pharmacyRaw.brands : prev.brands,
          quickSearchTerms: Array.isArray(pharmacyRaw.quickSearchTerms) ? pharmacyRaw.quickSearchTerms : prev.quickSearchTerms,
          trustPillars: Array.isArray(pharmacyRaw.trustPillars) ? pharmacyRaw.trustPillars : prev.trustPillars,
        },
      };
    }

    if (furnitureRaw && typeof furnitureRaw === 'object') {
      const prev = currentStoreSettings.storefront?.furniture || {};
      newStoreSettings.storefront = {
        ...(newStoreSettings.storefront || currentStoreSettings.storefront || {}),
        furniture: {
          ...prev,
          ...furnitureRaw,
          roomCollections: Array.isArray(furnitureRaw.roomCollections) ? furnitureRaw.roomCollections : prev.roomCollections,
          categoryIcons: Array.isArray(furnitureRaw.categoryIcons) ? furnitureRaw.categoryIcons : prev.categoryIcons,
          promoBanners: Array.isArray(furnitureRaw.promoBanners) ? furnitureRaw.promoBanners : prev.promoBanners,
          editorialBanners: Array.isArray(furnitureRaw.editorialBanners) ? furnitureRaw.editorialBanners : prev.editorialBanners,
          trustPillars: Array.isArray(furnitureRaw.trustPillars) ? furnitureRaw.trustPillars : prev.trustPillars,
          curatedTabs: Array.isArray(furnitureRaw.curatedTabs) ? furnitureRaw.curatedTabs : prev.curatedTabs,
          quickSearchTerms: Array.isArray(furnitureRaw.quickSearchTerms) ? furnitureRaw.quickSearchTerms : prev.quickSearchTerms,
          testimonials: Array.isArray(furnitureRaw.testimonials) ? furnitureRaw.testimonials : prev.testimonials,
        },
      };
    }

    if (fitnessRaw && typeof fitnessRaw === 'object') {
      const prev = currentStoreSettings.storefront?.fitness || {};
      newStoreSettings.storefront = {
        ...(newStoreSettings.storefront || currentStoreSettings.storefront || {}),
        fitness: {
          ...prev,
          ...fitnessRaw,
          programs: Array.isArray(fitnessRaw.programs) ? fitnessRaw.programs : prev.programs,
          benefits: Array.isArray(fitnessRaw.benefits) ? fitnessRaw.benefits : prev.benefits,
          trainers: Array.isArray(fitnessRaw.trainers) ? fitnessRaw.trainers : prev.trainers,
          categoryIcons: Array.isArray(fitnessRaw.categoryIcons) ? fitnessRaw.categoryIcons : prev.categoryIcons,
          promoBanners: Array.isArray(fitnessRaw.promoBanners) ? fitnessRaw.promoBanners : prev.promoBanners,
          trustPillars: Array.isArray(fitnessRaw.trustPillars) ? fitnessRaw.trustPillars : prev.trustPillars,
          quickSearchTerms: Array.isArray(fitnessRaw.quickSearchTerms) ? fitnessRaw.quickSearchTerms : prev.quickSearchTerms,
          membershipTiers: Array.isArray(fitnessRaw.membershipTiers) ? fitnessRaw.membershipTiers : prev.membershipTiers,
          bookingItems: Array.isArray(fitnessRaw.bookingItems) ? fitnessRaw.bookingItems : prev.bookingItems,
        },
      };
    }

    if (fashionRaw && typeof fashionRaw === 'object') {
      const prev = currentStoreSettings.storefront?.fashion || {};
      newStoreSettings.storefront = {
        ...(newStoreSettings.storefront || currentStoreSettings.storefront || {}),
        fashion: {
          ...prev,
          ...fashionRaw,
          promoBanners: Array.isArray(fashionRaw.promoBanners) ? fashionRaw.promoBanners : prev.promoBanners,
          homeEdit:
            fashionRaw.homeEdit && typeof fashionRaw.homeEdit === 'object'
              ? fashionRaw.homeEdit
              : prev.homeEdit,
          saleMosaic:
            fashionRaw.saleMosaic && typeof fashionRaw.saleMosaic === 'object'
              ? fashionRaw.saleMosaic
              : prev.saleMosaic,
        },
      };
    }

    if (supermarketRaw && typeof supermarketRaw === 'object') {
      const prev = currentStoreSettings.storefront?.supermarket || {};
      newStoreSettings.storefront = {
        ...(newStoreSettings.storefront || currentStoreSettings.storefront || {}),
        supermarket: {
          ...prev,
          ...supermarketRaw,
          sectionTitles: { ...(prev.sectionTitles || {}), ...(supermarketRaw.sectionTitles || {}) },
          categoryIcons: Array.isArray(supermarketRaw.categoryIcons) ? supermarketRaw.categoryIcons : prev.categoryIcons,
          brands: Array.isArray(supermarketRaw.brands) ? supermarketRaw.brands : prev.brands,
          upperPromoTiles: Array.isArray(supermarketRaw.upperPromoTiles) ? supermarketRaw.upperPromoTiles : prev.upperPromoTiles,
          midPromoTiles: Array.isArray(supermarketRaw.midPromoTiles) ? supermarketRaw.midPromoTiles : prev.midPromoTiles,
          promoTiles: Array.isArray(supermarketRaw.promoTiles) ? supermarketRaw.promoTiles : prev.promoTiles,
          homeRails: Array.isArray(supermarketRaw.homeRails) ? supermarketRaw.homeRails : prev.homeRails,
          promoBanners: Array.isArray(supermarketRaw.promoBanners) ? supermarketRaw.promoBanners : prev.promoBanners,
          quickSearchTerms: Array.isArray(supermarketRaw.quickSearchTerms) ? supermarketRaw.quickSearchTerms : prev.quickSearchTerms,
          trustPillars: Array.isArray(supermarketRaw.trustPillars) ? supermarketRaw.trustPillars : prev.trustPillars,
          footerTrustPillars: Array.isArray(supermarketRaw.footerTrustPillars) ? supermarketRaw.footerTrustPillars : prev.footerTrustPillars,
          sidebarDepartments: Array.isArray(supermarketRaw.sidebarDepartments) ? supermarketRaw.sidebarDepartments : prev.sidebarDepartments,
          subNavLinks: Array.isArray(supermarketRaw.subNavLinks) ? supermarketRaw.subNavLinks : prev.subNavLinks,
        },
      };
    }

    if (Array.isArray(heroSlides)) {
      const storefrontBase = newStoreSettings.storefront || currentStoreSettings.storefront || {};
      newStoreSettings.storefront = clearLegacyVerticalHeroSlides({
        ...storefrontBase,
        heroSlides: sanitizeHeroSlides(heroSlides),
      });
    }

    if (bookingRaw && typeof bookingRaw === 'object') {
      const prev = currentStoreSettings.storefront?.booking || {};
      const meetingUrl =
        bookingRaw.meetingUrl !== undefined
          ? normalizeTenantMeetingUrl(bookingRaw.meetingUrl)
          : prev.meeting_url ?? null;
      newStoreSettings.storefront = {
        ...(newStoreSettings.storefront || currentStoreSettings.storefront || {}),
        booking: {
          ...prev,
          meeting_url: meetingUrl,
        },
      };
    }

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

    await invalidateStorefrontTenant(businessId);

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
