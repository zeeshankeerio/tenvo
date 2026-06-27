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
]);

/**
 * @param {string} domainKey
 */
export function shouldSeedRichCatalogOnRegistration(domainKey) {
  const canonical = resolveDomainKey(domainKey);
  return REGISTRATION_RICH_CATALOG_VERTICALS.has(canonical) && hasRichCatalog(canonical);
}
