/**
 * Domain-specific knowledge and configurations
 * Provides intelligent defaults and options for each business category
 * Refactored into modular components for better maintainability
 */

import { retailDomains } from './domainData/retail.js';
import { industrialDomains } from './domainData/industrial.js';
import { serviceDomains } from './domainData/services.js';
import { specializedDomains } from './domainData/specialized.js';
import { textileDomains } from './domainData/textile.js';
import { expansionDomains } from './domainData/expansion.js';

import { eduLivestockDomains } from './domainData/edu_livestock.js';
import { getMarketFeatures } from './regionalMarket/index.js';
import { resolveDomainKey } from './config/domainKeyAliases.js';
import { buildRegionalTaxCategoryDefaults, getRegionalStandards } from './utils/regionalHelpers.ts';

/** Human-readable label from a domain slug (used when a row has no explicit `name`). */
function displayNameForDomainKey(key) {
  return String(key || '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Baseline fields merged into every domain row so downstream UI (inventory, tax, AI hints)
 * never sees undefined arrays for core lists.
 */
const DOMAIN_KNOWLEDGE_DEFAULTS = {
    pakistaniFeatures: {
        paymentGateways: ['jazzcash', 'easypaisa', 'payfast', 'bank_transfer', 'cod'],
        taxCompliance: ['fbr', 'ntn', 'srn', 'provincial_tax', 'wht'],
        languages: ['en', 'ur'],
    },
    intelligence: {
        seasonality: 'medium',
        peakMonths: [],
        perishability: 'low',
        shelfLife: 365,
        demandVolatility: 0.5,
        minOrderQuantity: 1,
        leadTime: 14,
    },
};

/**
 * Consolidated domain knowledge object
 * Merges all specialized domain configurations
 */
export const domainKnowledge = {
  ...retailDomains,
  ...industrialDomains,
  ...serviceDomains,
  ...specializedDomains,
  ...textileDomains,
  ...expansionDomains,
  ...eduLivestockDomains,
};

/** Sorted list of all vertical keys (59+) for admin pickers and integrity checks */
export const DOMAIN_KNOWLEDGE_KEYS = Object.freeze(Object.keys(domainKnowledge).sort());
/**
 * Get domain knowledge for a specific category
 * Falls back to retail-shop if category is not found
 *
 * @param {string} category - The domain category slug
 * @param {{ countryIso?: string }} [options] - When set, `pakistaniFeatures` reflects that market (PK, AE, US, CN, …)
 * @returns {Object} Domain configuration
 */
export function getDomainKnowledge(category, options = {}) {
  const key = String(category || '').trim();
  const resolvedKey = resolveDomainKey(key);
  const row = domainKnowledge[resolvedKey] || domainKnowledge['retail-shop'];
  const countryIso = options.countryIso || 'PK';
  const marketFeatures = getMarketFeatures(countryIso, resolvedKey, row.pakistaniFeatures || {});
  const regional = getRegionalStandards(countryIso);
  const rowDefaultTax = Number(row.defaultTax);
  const defaultTax =
    countryIso === 'PK' && Number.isFinite(rowDefaultTax) && rowDefaultTax > 0
      ? rowDefaultTax
      : regional.defaultTaxRate;

  return {
    ...DOMAIN_KNOWLEDGE_DEFAULTS,
    ...row,
    defaultTax,
    /** Shown in dashboards and AI prompts when not set on the row */
    name: row.name || displayNameForDomainKey(key),
    countryIso: marketFeatures.countryCode,
    taxCategories:
      Array.isArray(row.taxCategories) && row.taxCategories.length > 0
        ? row.taxCategories
        : buildRegionalTaxCategoryDefaults(countryIso),
    /** Legacy key — holds country-aware market features (not PK-only). */
    pakistaniFeatures: marketFeatures,
    marketFeatures,
    intelligence: { ...DOMAIN_KNOWLEDGE_DEFAULTS.intelligence, ...(row.intelligence || {}) },
  };
}

/**
 * Get intelligent defaults for a domain
 * 
 * @param {string} category - The domain category slug
 * @returns {Object} Default values for new products
 */
export function getDomainDefaults(category, options = {}) {
  const countryIso = options.countryIso || 'PK';
  const knowledge = getDomainKnowledge(category, { countryIso });
  const regional = getRegionalStandards(countryIso);
  const domainTax = Number(knowledge.defaultTax);
  const defaultTax =
    Number.isFinite(domainTax) && domainTax > 0 ? domainTax : regional.defaultTaxRate;
  return {
    defaultTax,
    defaultUnit: knowledge.units?.[0] || 'pcs',
    productFields: knowledge.productFields || [],
    paymentTerms: knowledge.paymentTerms || ['Cash'],
    inventoryFeatures: knowledge.inventoryFeatures || [],
    reports: knowledge.reports || [],
    setupTemplate: knowledge.setupTemplate || { categories: [], suggestedProducts: [] },
  };
}
