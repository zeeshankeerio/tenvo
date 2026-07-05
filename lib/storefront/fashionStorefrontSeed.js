/**
 * Full fashion / textile / jewellery storefront seed for registration and demo labs.
 * Persists Gul Ahmed section tiles so public stores render without owner setup.
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { getLuxuryFashionVariant } from '@/lib/storefront/luxuryFashion';
import { buildDefaultFashionEditorialStorefrontSeed } from '@/lib/storefront/fashionEditorial';
import { supportsFashionGulSections } from '@/lib/storefront/fashionGulSections';
import { getDefaultFashionGulSections } from '@/lib/dataLab/fashionGulAhmedSections';
import { buildDefaultFashionPromoBannerSeed, mergeFashionPromoBannerSettings } from '@/lib/storefront/fashionPromoBanners';

/**
 * @param {string | null | undefined} category
 * @returns {Record<string, unknown> | null} Spread into `settings.storefront`
 */
export function buildFullFashionStorefrontSeed(category) {
  const canonical = resolveDomainKey(category);
  if (!supportsFashionGulSections(canonical)) return null;

  const variant = getLuxuryFashionVariant(canonical) || 'boutique';
  const { homeEdit, saleMosaic } = getDefaultFashionGulSections(variant);
  const promoBanners = buildDefaultFashionPromoBannerSeed(canonical, [], null);
  const editorialToggles = buildDefaultFashionEditorialStorefrontSeed().fashion;

  return {
    fashion: {
      ...editorialToggles,
      showSeoBlock: true,
      homeEdit,
      saleMosaic,
      promoBanners,
    },
  };
}

/**
 * Refresh seeded copy while preserving owner image / link overrides.
 * @param {object | null | undefined} prev
 * @param {object} defaults
 */
function mergeHomeEditSeed(prev, defaults) {
  if (!prev?.tiles?.length) return defaults;
  const defaultById = new Map((defaults.tiles || []).map((tile) => [tile.id, tile]));
  return {
    ...defaults,
    ...prev,
    subtitle: defaults.subtitle,
    title: prev.title || defaults.title,
    tiles: prev.tiles.map((tile) => {
      const seed = defaultById.get(tile.id);
      if (!seed) return tile;
      return {
        ...seed,
        ...tile,
        eyebrow: seed.eyebrow,
        title: tile.title ?? seed.title,
        ctaLabel: tile.ctaLabel || seed.ctaLabel,
      };
    }),
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
        homeEdit: mergeHomeEditSeed(prevFashion.homeEdit, fashionBlock.fashion.homeEdit),
        saleMosaic: prevFashion.saleMosaic?.columns?.length
          ? prevFashion.saleMosaic
          : fashionBlock.fashion.saleMosaic,
        promoBanners:
          prevFashion.promoBanners?.length
            ? mergeFashionPromoBannerSettings(
                fashionBlock.fashion.promoBanners || [],
                prevFashion.promoBanners
              )
            : fashionBlock.fashion.promoBanners,
      },
    },
  };
}
