/**
 * Pakistan brand catalog, local + relevant imported brands for MVP launch.
 */
import { pakistaniBrands } from '../../domainData/pakistaniBrands.js';

export const PK_BRAND_CATALOG = pakistaniBrands;

export function getPakistanBrands(category) {
  return PK_BRAND_CATALOG[category] || PK_BRAND_CATALOG.general || [];
}
