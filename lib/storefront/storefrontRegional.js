/**
 * Regional copy helpers for public storefronts (delivery scope, locale-aware labels).
 */

import { getBusinessRegionalPack } from '@/lib/utils/businessRegionalContext';

/**
 * Merge storefront settings + business row for regional pack resolution.
 * @param {object} [settings]
 * @param {{ country?: string; settings?: object } | null | undefined} [business]
 */
function mergeStorefrontBusinessForPack(settings = {}, business = null) {
  const baseSettings =
    business?.settings && typeof business.settings === 'object' && !Array.isArray(business.settings)
      ? business.settings
      : {};

  return {
    ...(business || {}),
    country: business?.country || settings?.registration?.country_name || baseSettings?.registration?.country_name,
    settings: {
      ...baseSettings,
      ...settings,
      financials: { ...baseSettings?.financials, ...settings?.financials },
      registration: { ...baseSettings?.registration, ...settings?.registration },
    },
  };
}

/**
 * Resolve storefront currency from settings and business registration country.
 * @param {object} [settings]
 * @param {{ country?: string } | null | undefined} [business]
 */
export function resolveStorefrontCurrency(settings = {}, business = null) {
  const storefrontCurrency = settings?.storefront?.currency;
  if (storefrontCurrency) return storefrontCurrency;

  return getBusinessRegionalPack(mergeStorefrontBusinessForPack(settings, business)).currency;
}

/**
 * @param {object} [settings]
 * @param {{ country?: string } | null | undefined} [business]
 */
export function resolveStorefrontLocale(settings = {}, business = null) {
  const direct = settings?.locale || settings?.storefront?.locale;
  if (direct) return direct;

  return getBusinessRegionalPack(mergeStorefrontBusinessForPack(settings, business)).locale;
}

/**
 * @param {string | null | undefined} country
 */
export function getDeliveryScopeLabel(country) {
  const c = String(country || '').trim().toLowerCase();
  if (c.includes('singapore')) return 'Islandwide delivery';
  if (c.includes('uae') || c.includes('emirates') || c.includes('dubai')) return 'UAE-wide delivery';
  if (c.includes('pakistan')) return 'Nationwide delivery';
  if (c.includes('saudi')) return 'Kingdom-wide delivery';
  return 'Reliable delivery';
}

/**
 * Replace generic delivery pills with region-accurate wording.
 * @param {string[]} pills
 * @param {string | null | undefined} country
 */
export function localizeServicePills(pills, country) {
  if (!Array.isArray(pills) || !pills.length) return pills;
  const delivery = getDeliveryScopeLabel(country);
  return pills.map((pill) => {
    const p = String(pill).trim();
    if (/^(islandwide|nationwide|kingdom-wide|uae-wide)\s+delivery$/i.test(p)) {
      return delivery;
    }
    return pill;
  });
}

/** Hero types that ship an integrated finder panel (skip duplicate homepage strips). */
export const IMMERSIVE_FINDER_HERO_TYPES = new Set([
  'parts-finder',
  'pharmacy-finder',
  'pharmacy-elevated',
  'fashion-finder',
  'grocery-finder',
  'restaurant-finder',
  'auto-dealership',
  'auto-marketplace',
  'furniture-elevated',
  'restaurant-elevated',
  'fitness-elevated',
]);

/**
 * @param {string | null | undefined} heroType
 */
export function isImmersiveFinderHero(heroType) {
  return IMMERSIVE_FINDER_HERO_TYPES.has(heroType);
}
