/**
 * Gul Ahmed–style homepage section resolvers (The Home Edit + Sale mosaic).
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { getLuxuryFashionVariant } from '@/lib/storefront/luxuryFashion';
import { isDemoStoreDomain } from '@/lib/storefront/elevatedStorefrontTenant';
import { FASHION_EDITORIAL_CANONICALS } from '@/lib/storefront/fashionEditorial';
import { getDefaultFashionGulSections } from '@/lib/dataLab/fashionGulAhmedSections';

/** Verticals that receive Gul Ahmed–style Home Edit + Sale mosaic sections. */
export const FASHION_GUL_SECTIONS_CANONICALS = new Set([
  ...FASHION_EDITORIAL_CANONICALS,
  'gems-jewellery',
]);

/**
 * @param {string | null | undefined} category
 */
export function supportsFashionGulSections(category) {
  return FASHION_GUL_SECTIONS_CANONICALS.has(resolveDomainKey(category));
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} [businessDomain]
 */
export function getFashionGulSectionsConfig(settings = {}, businessDomain) {
  const raw = settings?.storefront?.fashion || {};
  const str = (value) => (typeof value === 'string' ? value.trim() : '');
  const isDemo = isDemoStoreDomain(businessDomain);
  return {
    showHomeEdit: raw.showHomeEdit !== false,
    showSaleMosaic: raw.showSaleMosaic !== false && (raw.showSaleMosaic === true || isDemo || raw.showSaleMosaic !== false),
    homeEditTitle: str(raw.homeEditTitle),
    homeEditSubtitle: str(raw.homeEditSubtitle),
    saleMosaicTitle: str(raw.saleMosaicTitle),
    homeEdit: raw.homeEdit && typeof raw.homeEdit === 'object' ? raw.homeEdit : null,
    saleMosaic: raw.saleMosaic && typeof raw.saleMosaic === 'object' ? raw.saleMosaic : null,
  };
}

/**
 * @param {string} storeBase `/store/{domain}`
 * @param {string} href
 */
export function resolveFashionGulHref(storeBase, href) {
  const raw = String(href || '').trim();
  if (!raw) return `${storeBase}/products`;
  if (raw.startsWith('http')) return raw;
  if (raw.startsWith('/store/')) return raw;
  if (raw.startsWith('/products')) return `${storeBase}${raw.replace(/^\/products/, '/products')}`;
  if (raw.startsWith('?')) return `${storeBase}/products${raw}`;
  if (raw.startsWith('/')) return `${storeBase}${raw}`;
  return `${storeBase}/products?${raw}`;
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} businessCategory
 * @param {string | null | undefined} businessDomain
 * @param {string} storeBase
 */
export function resolveFashionHomeEdit(settings = {}, businessCategory, businessDomain, storeBase) {
  const config = getFashionGulSectionsConfig(settings, businessDomain);
  const variant = getLuxuryFashionVariant(businessCategory) || 'boutique';
  const defaults = getDefaultFashionGulSections(variant).homeEdit;
  const source = config.homeEdit?.tiles?.length ? config.homeEdit : defaults;
  if (!source?.tiles?.length) return null;

  return {
    title: config.homeEditTitle || source.title || defaults.title,
    subtitle: config.homeEditSubtitle || source.subtitle || defaults.subtitle,
    viewAllHref: resolveFashionGulHref(storeBase, source.viewAllHref || defaults.viewAllHref),
    tiles: source.tiles.map((tile) => ({
      ...tile,
      href: resolveFashionGulHref(storeBase, tile.href),
    })),
  };
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} businessCategory
 * @param {string | null | undefined} businessDomain
 * @param {string} storeBase
 */
export function resolveFashionSaleMosaic(settings = {}, businessCategory, businessDomain, storeBase) {
  const config = getFashionGulSectionsConfig(settings, businessDomain);
  const variant = getLuxuryFashionVariant(businessCategory) || 'boutique';
  const defaults = getDefaultFashionGulSections(variant).saleMosaic;
  const source = config.saleMosaic?.columns?.length ? config.saleMosaic : defaults;
  if (!source?.columns?.length) return null;

  return {
    title: config.saleMosaicTitle || source.title || defaults.title,
    columns: source.columns.map((col) => ({
      ...col,
      tiles: (col.tiles || []).map((tile) => ({
        ...tile,
        href: resolveFashionGulHref(storeBase, tile.href),
      })),
    })),
  };
}
