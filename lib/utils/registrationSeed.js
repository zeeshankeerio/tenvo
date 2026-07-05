/**
 * Country- and domain-aware registration provisioning.
 *
 * Registration path: category shells for most verticals.
 * vehicle-dealership receives the Tenvo Vehicles starter catalog.
 * auto-parts receives the archive-backed parts catalog (33 SKUs).
 * gym-fitness receives supplements (archive/fitness-products.html) + membership SKUs.
 * PK garments, boutique-fashion, textile-wholesale, and textile-mill receive local + imported clothing seed.
 * Supermarket-family verticals (supermarket, fmcg, grocery, dairy-farm, poultry, livestock) receive the archive grocery catalog.
 * Data-lab path: `buildDemoCatalogPayload` — rich catalog with images for platform-owner demos only.
 */
import { getDomainKnowledge } from '../domainKnowledge.js';
import { getRegionalStandards } from './regionalHelpers';
import { getBrandsForMarket } from '../regionalMarket/index.js';
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { buildRichSeedItems, buildTemplateDemoItems } from '../dataLab/richProductCatalog.js';
import { shouldSeedRichCatalogOnRegistration } from '../onboarding/registrationRichVerticals.js';
import { resolveRegistrationCategories } from '../onboarding/registrationCategoryPresets.js';
import { BOUTIQUE_FASHION_SEED_CATEGORIES } from '../dataLab/fashionDemoCatalog.js';
import { GEMS_JEWELLERY_SEED_CATEGORIES } from '../dataLab/jewelleryDemoCatalog.js';
import { RESTAURANT_SEED_CATEGORIES } from '../dataLab/restaurantDemoCatalog.js';

/**
 * Serializable domain profile stored on new businesses — powers AI, automations, and hub defaults.
 * @param {{ domainKey: string, countryIso: string }} params
 */
export function buildRegistrationDomainProfile({ domainKey, countryIso }) {
  const iso = String(countryIso || 'PK').trim().toUpperCase();
  const canonicalKey = resolveDomainKey(domainKey);
  const knowledge = getDomainKnowledge(canonicalKey, { countryIso: iso });
  const template = knowledge?.setupTemplate;
  const categories = Array.isArray(template?.categories)
    ? template.categories
    : [];

  return {
    knowledge,
    domainSnapshot: {
      key: canonicalKey,
      name: knowledge.name || canonicalKey,
      countryIso: iso,
      defaultTax: knowledge.defaultTax ?? null,
      units: knowledge.units || [],
      taxCategories: knowledge.taxCategories || [],
      productFields: knowledge.productFields || [],
      inventoryFeatures: knowledge.inventoryFeatures || [],
      reports: knowledge.reports || [],
    },
    intelligence: knowledge.intelligence || {},
    automation: {
      lowStockAlerts: Boolean(knowledge.reorderEnabled),
      reorderEnabled: Boolean(knowledge.reorderEnabled),
      serialTrackingEnabled: Boolean(knowledge.serialTrackingEnabled),
      batchTrackingEnabled: Boolean(knowledge.batchTrackingEnabled),
      expiryTrackingEnabled: Boolean(knowledge.expiryTrackingEnabled),
      multiLocationEnabled: Boolean(knowledge.multiLocationEnabled),
      stockValuationMethod: knowledge.stockValuationMethod || 'FIFO',
    },
    domainDefaults: {
      stockValuationMethod: knowledge.stockValuationMethod || 'FIFO',
      paymentTerms: knowledge.paymentTerms || [],
      multiCurrency: iso !== 'PK',
    },
    categories,
    marketFeatures: knowledge.marketFeatures || knowledge.pakistaniFeatures || null,
  };
}

/**
 * Registration seed — category shells for most verticals; rich catalogs for auto-parts, vehicle-dealership, gym-fitness, and supermarket-family grocery verticals.
 * @param {{ businessId: string, domainKey: string, countryIso: string, domainPackageKey?: string | null }} params
 */
export function buildRegistrationSeedPayload({ businessId, domainKey, countryIso, domainPackageKey = null }) {
  const iso = String(countryIso || 'PK').trim().toUpperCase();
  const standards = getRegionalStandards(iso);
  const canonicalKey = resolveDomainKey(domainKey);
  const profile = buildRegistrationDomainProfile({ domainKey, countryIso: iso });

  if (shouldSeedRichCatalogOnRegistration(canonicalKey, iso, { domainPackageKey })) {
    const knowledge = getDomainKnowledge(canonicalKey, { countryIso: iso });
    const brands = getBrandsForMarket(iso, canonicalKey);
    const taxRate = knowledge.defaultTax ?? standards.defaultTaxRate ?? 0;
    const richItems = buildRichSeedItems({
      businessId,
      domainKey: canonicalKey,
      countryIso: iso,
      taxRate,
      brands,
    });
    return {
      items: richItems,
      categories: resolveRegistrationCategories(canonicalKey, profile.categories),
      knowledge: profile.knowledge,
      standards,
      marketFeatures: profile.marketFeatures,
      domainProfile: profile,
    };
  }

  return {
    items: [],
    categories: profile.categories,
    knowledge: profile.knowledge,
    standards,
    marketFeatures: profile.marketFeatures,
    domainProfile: profile,
  };
}

/**
 * Data-lab demo catalog — rich products with images, SKUs, and regional pricing.
 * @param {{ businessId: string, domainKey: string, countryIso: string }} params
 */
export function buildDemoCatalogPayload({ businessId, domainKey, countryIso }) {
  const iso = String(countryIso || 'PK').trim().toUpperCase();
  const standards = getRegionalStandards(iso);
  const canonicalKey = resolveDomainKey(domainKey);
  const knowledge = getDomainKnowledge(canonicalKey, { countryIso: iso });
  const template = knowledge?.setupTemplate;
  const brands = getBrandsForMarket(iso, canonicalKey);
  const taxRate = knowledge.defaultTax ?? standards.defaultTaxRate ?? 0;

  let richItems = buildRichSeedItems({
    businessId,
    domainKey: canonicalKey,
    countryIso: iso,
    taxRate,
    brands,
  });

  if (richItems.length === 0 && Array.isArray(template?.suggestedProducts)) {
    richItems = buildTemplateDemoItems({
      businessId,
      suggestedProducts: template.suggestedProducts,
      taxRate,
      brands,
      countryIso: iso,
      domainKey: canonicalKey,
    });
  }

  const categoriesFromItems = [...new Set(richItems.map((i) => i.category).filter(Boolean))];
  const restaurantCategories =
    canonicalKey === 'restaurant-cafe' && RESTAURANT_SEED_CATEGORIES.length
      ? RESTAURANT_SEED_CATEGORIES.map((c) => c.name)
      : null;
  const presetCategories =
    restaurantCategories?.length
      ? restaurantCategories
      : canonicalKey === 'boutique-fashion'
        ? BOUTIQUE_FASHION_SEED_CATEGORIES
        : canonicalKey === 'gems-jewellery'
          ? GEMS_JEWELLERY_SEED_CATEGORIES
          : null;
  const categories =
    presetCategories?.length
      ? presetCategories
      : categoriesFromItems.length > 0
        ? categoriesFromItems
        : Array.isArray(template?.categories)
          ? template.categories
          : [];

  return {
    items: richItems,
    categories,
    knowledge,
    standards,
    marketFeatures: knowledge.marketFeatures || knowledge.pakistaniFeatures || null,
  };
}

/** @param {string} name */
export function slugifyCategoryName(name) {
  return (
    String(name || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'general'
  );
}

/**
 * @param {string} countryIso
 * @param {import('./regionalHelpers').RegionalStandards} [regional]
 * @param {{ domainVertical?: string }} [extra]
 */
export function buildRegistrationSettingsSnapshot(countryIso, regional = null, extra = {}) {
  const r = regional || getRegionalStandards(countryIso);
  return {
    completed_via: 'register_wizard',
    country_iso: r.countryCode,
    country_name: r.countryName,
    tax_label: r.taxLabel,
    tax_id_label: r.taxIdLabel,
    default_tax_rate: r.defaultTaxRate,
    tax_strategy: r.taxStrategy,
    locale: r.locale,
    time_zone: r.timeZone,
    market_profile: r.countryCode,
    brand_catalog: r.countryCode,
    ...(extra.domainVertical ? { domain_vertical: extra.domainVertical } : {}),
  };
}

/** @param {string} countryIso @param {import('./regionalHelpers').RegionalStandards} regional */
export function buildRegistrationFinancialsSnapshot(regional) {
  return {
    currency: regional.currency,
    currencySymbol: regional.currencySymbol,
    defaultTaxRate: regional.defaultTaxRate,
    taxLabel: regional.taxLabel,
    taxIdLabel: regional.taxIdLabel,
    taxStrategy: regional.taxStrategy,
    locale: regional.locale,
    timeZone: regional.timeZone,
  };
}
