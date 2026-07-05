/**
 * Verticals that ship a market-ready product catalog on registration (not data-lab only).
 * Other domains receive category shells from setupTemplate; owners add inventory in hub.
 */
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { hasRichCatalog } from '../dataLab/richProductCatalog.js';

/** @type {ReadonlySet<string>} */
export const REGISTRATION_RICH_CATALOG_VERTICALS = new Set([
  'vehicle-dealership',
  'auto-parts',
  'gym-fitness',
]);

/** Grocery / FMCG / supermarket-family verticals — Naheed–DSM archive catalog on signup. */
/** @type {ReadonlySet<string>} */
export const SUPERMARKET_REGISTRATION_VERTICALS = new Set([
  'supermarket',
  'grocery',
  'fmcg',
  'dairy-farm',
  'poultry-farm',
  'livestock-cattle',
]);

/**
 * Pakistan clothing / textile verticals — local + imported starter catalog on registration.
 * @type {ReadonlySet<string>}
 */
export const PK_CLOTHING_REGISTRATION_VERTICALS = new Set([
  'garments',
  'boutique-fashion',
  'textile-wholesale',
  'textile-mill',
]);

/** Domain packages that ship a rich starter catalog regardless of country gate. */
/** @type {ReadonlyMap<string, ReadonlySet<string>>} */
export const PACKAGE_RICH_CATALOG_VERTICALS = new Map([
  ['clothing-commerce', PK_CLOTHING_REGISTRATION_VERTICALS],
  ['pharmacy-commerce', new Set(['pharmacy'])],
  ['furniture-commerce', new Set(['furniture'])],
  ['fitness-commerce', new Set(['gym-fitness'])],
]);

/**
 * @param {string} domainKey
 */
export function isSupermarketRegistrationVertical(domainKey) {
  const canonical = resolveDomainKey(domainKey);
  return SUPERMARKET_REGISTRATION_VERTICALS.has(canonical);
}

/**
 * @param {string} domainKey
 * @param {string} [countryIso]
 * @param {{ domainPackageKey?: string | null }} [options]
 */
export function shouldSeedRichCatalogOnRegistration(domainKey, countryIso = 'PK', options = {}) {
  const canonical = resolveDomainKey(domainKey);
  const iso = String(countryIso || 'PK').trim().toUpperCase();
  const packageKey = String(options?.domainPackageKey || '').trim();

  if (REGISTRATION_RICH_CATALOG_VERTICALS.has(canonical) && hasRichCatalog(canonical)) {
    return true;
  }
  if (SUPERMARKET_REGISTRATION_VERTICALS.has(canonical) && hasRichCatalog(canonical)) {
    return true;
  }
  if (PK_CLOTHING_REGISTRATION_VERTICALS.has(canonical) && hasRichCatalog(canonical)) {
    if (iso === 'PK' || packageKey === 'clothing-commerce') {
      return true;
    }
  }
  if (packageKey) {
    const packageVerticals = PACKAGE_RICH_CATALOG_VERTICALS.get(packageKey);
    if (packageVerticals?.has(canonical) && hasRichCatalog(canonical)) {
      return true;
    }
  }
  return false;
}
