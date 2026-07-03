/**
 * Category shells for registration seed — aligned with hub filters and rich catalogs.
 */
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { AUTO_PARTS_SEED_CATEGORIES } from '../dataLab/autopartsSeedCatalog.js';
import { BOUTIQUE_FASHION_SEED_CATEGORIES } from '../dataLab/fashionDemoCatalog.js';
import { GEMS_JEWELLERY_SEED_CATEGORIES } from '../dataLab/jewelleryDemoCatalog.js';
import { SEHGAL_SHOWROOM_CATEGORIES } from '../dataLab/sehgalShowroomCatalog.js';
import {
  GARMENTS_SEED_CATEGORIES,
  TEXTILE_WHOLESALE_SEED_CATEGORIES,
  TEXTILE_MILL_SEED_CATEGORIES,
} from '../dataLab/pakistanClothingSeedCatalog.js';
import { FITNESS_SEED_CATEGORIES } from '../dataLab/fitnessDemoCatalog.js';

/** @type {Record<string, string[] | (() => string[])>} */
const PRESETS = {
  'vehicle-dealership': () =>
    SEHGAL_SHOWROOM_CATEGORIES.length ? SEHGAL_SHOWROOM_CATEGORIES : [],
  'auto-parts': () => AUTO_PARTS_SEED_CATEGORIES,
  'boutique-fashion': BOUTIQUE_FASHION_SEED_CATEGORIES,
  'gems-jewellery': GEMS_JEWELLERY_SEED_CATEGORIES,
  garments: GARMENTS_SEED_CATEGORIES,
  'textile-wholesale': TEXTILE_WHOLESALE_SEED_CATEGORIES,
  'textile-mill': TEXTILE_MILL_SEED_CATEGORIES,
  'gym-fitness': FITNESS_SEED_CATEGORIES,
};

/**
 * @param {string} domainKey
 * @param {string[]} fallbackCategories from setupTemplate
 */
export function resolveRegistrationCategories(domainKey, fallbackCategories = []) {
  const canonical = resolveDomainKey(domainKey);
  const preset = PRESETS[canonical];
  if (!preset) return fallbackCategories;
  const resolved = typeof preset === 'function' ? preset() : preset;
  return Array.isArray(resolved) && resolved.length > 0 ? resolved : fallbackCategories;
}
