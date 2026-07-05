/**
 * Full fashion / textile / jewellery storefront seed for registration and demo labs.
 * Persists Gul Ahmed section tiles so public stores render without owner setup.
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { getLuxuryFashionVariant } from '@/lib/storefront/luxuryFashion';
import { buildDefaultFashionEditorialStorefrontSeed } from '@/lib/storefront/fashionEditorial';
import { supportsFashionGulSections } from '@/lib/storefront/fashionGulSections';
import { getDefaultFashionGulSections } from '@/lib/dataLab/fashionGulAhmedSections';

/**
 * @param {string | null | undefined} category
 * @returns {Record<string, unknown> | null} Spread into `settings.storefront`
 */
export function buildFullFashionStorefrontSeed(category) {
  const canonical = resolveDomainKey(category);
  if (!supportsFashionGulSections(canonical)) return null;

  const variant = getLuxuryFashionVariant(canonical) || 'boutique';
  const { homeEdit, saleMosaic } = getDefaultFashionGulSections(variant);
  const editorialToggles = buildDefaultFashionEditorialStorefrontSeed().fashion;

  return {
    fashion: {
      ...editorialToggles,
      showSeoBlock: true,
      homeEdit,
      saleMosaic,
    },
  };
}

/**
 * Deep-merge fashion block into existing business_settings.settings JSON.
 * @param {Record<string, unknown>} settings
 * @param {string | null | undefined} category
 */
export function mergeFashionStorefrontIntoSettings(settings = {}, category) {
  const fashionBlock = buildFullFashionStorefrontSeed(category);
  if (!fashionBlock) return settings;

  const base = settings && typeof settings === 'object' ? { ...settings } : {};
  const storefront = base.storefront && typeof base.storefront === 'object' ? { ...base.storefront } : {};
  const prevFashion =
    storefront.fashion && typeof storefront.fashion === 'object' ? { ...storefront.fashion } : {};

  return {
    ...base,
    storefront: {
      ...storefront,
      fashion: {
        ...fashionBlock.fashion,
        ...prevFashion,
        // Always refresh Gul section tiles unless owner explicitly saved custom arrays
        homeEdit: prevFashion.homeEdit?.tiles?.length ? prevFashion.homeEdit : fashionBlock.fashion.homeEdit,
        saleMosaic: prevFashion.saleMosaic?.columns?.length
          ? prevFashion.saleMosaic
          : fashionBlock.fashion.saleMosaic,
      },
    },
  };
}
