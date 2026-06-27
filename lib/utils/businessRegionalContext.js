/**
 * Resolve registration country ISO and merge business_settings into client payloads.
 */
import { getRegionalStandards } from './regionalHelpers';
import { getDomainKnowledge } from '../domainKnowledge.js';

/**
 * @param {Record<string, unknown> | null | undefined} business
 * @returns {string}
 */
export function resolveBusinessCountryIso(business) {
  if (!business) return 'PK';
  const settings = business.settings;
  const fromSettings =
    settings &&
    typeof settings === 'object' &&
    !Array.isArray(settings) &&
    settings.registration &&
    typeof settings.registration === 'object'
      ? settings.registration.country_iso
      : null;

  const raw =
    business.registration_country_iso ||
    fromSettings ||
    business.country ||
    business.city ||
    'PK';

  return getRegionalStandards(raw).countryCode;
}

/**
 * @param {Record<string, unknown> | null | undefined} business
 */
export function getRegionalStandardsForBusiness(business) {
  return getRegionalStandards(resolveBusinessCountryIso(business));
}

/**
 * Full regional pack for a business — merges registration + financials + registry defaults.
 * Use for currency, tax labels, locale, and default tax rate across hub, POS, and print.
 *
 * @param {Record<string, unknown> | null | undefined} business
 */
export function getBusinessRegionalPack(business) {
  const registry = getRegionalStandardsForBusiness(business);
  const settings =
    business?.settings && typeof business.settings === 'object' && !Array.isArray(business.settings)
      ? business.settings
      : {};
  const registration =
    settings.registration && typeof settings.registration === 'object'
      ? settings.registration
      : {};
  const financials =
    settings.financials && typeof settings.financials === 'object' ? settings.financials : {};

  const countryIso = registration.country_iso || registry.countryCode;
  const finRate = financials.defaultTaxRate;
  const regRate = registration.default_tax_rate;

  let defaultTaxRate = registry.defaultTaxRate;
  if (Number.isFinite(Number(regRate))) defaultTaxRate = Number(regRate);
  if (Number.isFinite(Number(finRate))) defaultTaxRate = Number(finRate);

  return {
    countryIso,
    countryName: registration.country_name || business?.country || registry.countryName,
    currency: financials.currency || registry.currency,
    currencySymbol: financials.currencySymbol || registry.currencySymbol,
    taxLabel: financials.taxLabel || registration.tax_label || registry.taxLabel,
    taxIdLabel: financials.taxIdLabel || registration.tax_id_label || registry.taxIdLabel,
    defaultTaxRate,
    locale: registration.locale || financials.locale || registry.locale,
    timeZone: registration.time_zone || financials.timeZone || registry.timeZone,
    taxStrategy: registration.tax_strategy || financials.taxStrategy || registry.taxStrategy,
    phoneCode: registry.phoneCode,
  };
}

/**
 * Domain knowledge merged with the business registration market.
 * @param {string} category
 * @param {Record<string, unknown> | string | null | undefined} businessOrCountryIso
 */
export function getDomainKnowledgeForBusiness(category, businessOrCountryIso) {
  const countryIso =
    typeof businessOrCountryIso === 'string'
      ? businessOrCountryIso
      : resolveBusinessCountryIso(businessOrCountryIso);
  return getDomainKnowledge(category, { countryIso });
}

/**
 * Default line-item tax % for forms: domain override when set, else registration country rate.
 * @param {Record<string, unknown> | null | undefined} business
 * @param {string} category
 */
export function resolveFormDefaultTaxRate(business, category) {
  const pack = getBusinessRegionalPack(business);
  const knowledge = getDomainKnowledgeForBusiness(category, business);
  const domainTax = Number(knowledge?.defaultTax);
  if (Number.isFinite(domainTax) && domainTax > 0) return domainTax;
  const regionalRate = Number(pack?.defaultTaxRate);
  return Number.isFinite(regionalRate) && regionalRate >= 0 ? regionalRate : 0;
}

/**
 * Merge `business_settings.settings.registration` into the business row for hub clients.
 * @param {Record<string, unknown> | null | undefined} business
 */
export function enrichBusinessForClient(business) {
  if (!business) return business;

  const settingsRow = business.business_settings;
  const rowSettings =
    settingsRow?.settings && typeof settingsRow.settings === 'object'
      ? settingsRow.settings
      : null;
  const registration =
    rowSettings?.registration ||
    (business.settings &&
    typeof business.settings === 'object' &&
    !Array.isArray(business.settings)
      ? business.settings.registration
      : null);
  const financials =
    rowSettings?.financials ||
    (business.settings &&
    typeof business.settings === 'object' &&
    !Array.isArray(business.settings)
      ? business.settings.financials
      : null);

  const prevSettings =
    business.settings && typeof business.settings === 'object' && !Array.isArray(business.settings)
      ? business.settings
      : {};

  const mergedSettings = {
    ...prevSettings,
    ...(registration ? { registration } : {}),
    ...(financials ? { financials } : {}),
  };

  const { business_settings: _drop, ...rest } = business;

  return {
    ...rest,
    settings: Object.keys(mergedSettings).length ? mergedSettings : prevSettings,
    registration_country_iso: registration?.country_iso || null,
  };
}
