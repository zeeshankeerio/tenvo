/**
 * Regional copy helpers for public storefronts (delivery scope, locale-aware labels).
 */

/**
 * Resolve storefront currency from settings and business registration country.
 * @param {object} [settings]
 * @param {{ country?: string } | null | undefined} [business]
 */
export function resolveStorefrontCurrency(settings = {}, business = null) {
  const direct =
    settings?.currency ||
    settings?.financials?.currency ||
    settings?.storefront?.currency;
  if (direct) return direct;

  const country = String(
    business?.country || settings?.registration?.country_name || ''
  ).toLowerCase();
  if (country.includes('singapore')) return 'SGD';
  if (country.includes('uae') || country.includes('emirates') || country.includes('dubai')) {
    return 'AED';
  }
  if (country.includes('saudi')) return 'SAR';
  if (country.includes('united kingdom') || country === 'uk') return 'GBP';
  if (country.includes('united states') || country === 'usa') return 'USD';
  return 'PKR';
}

/**
 * @param {object} [settings]
 * @param {{ country?: string } | null | undefined} [business]
 */
export function resolveStorefrontLocale(settings = {}, business = null) {
  const direct = settings?.locale || settings?.storefront?.locale;
  if (direct) return direct;

  const currency = resolveStorefrontCurrency(settings, business);
  if (currency === 'SGD') return 'en-SG';
  if (currency === 'AED') return 'en-AE';
  if (currency === 'SAR') return 'ar-SA';
  if (currency === 'GBP') return 'en-GB';
  if (currency === 'USD') return 'en-US';
  return 'en-PK';
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
]);

/**
 * @param {string | null | undefined} heroType
 */
export function isImmersiveFinderHero(heroType) {
  return IMMERSIVE_FINDER_HERO_TYPES.has(heroType);
}
