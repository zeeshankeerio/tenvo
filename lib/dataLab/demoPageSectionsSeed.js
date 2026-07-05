/**
 * Default owner marketing banners for data-lab demo storefronts.
 * Persisted on `business_settings.settings.pageSections`.
 */
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { createEmptyPageSection } from '../storefront/storePageSections.js';
import { resolveSpotlightBannerImage } from '../storefront/storefrontImagePlaceholders.js';
import { getActivePageSections } from '../storefront/storePageSections.js';

/**
 * @param {{ domainKey: string; domainHandle?: string; storefrontProfile?: Record<string, unknown>; productImages?: string[] }} params
 * @returns {object[]}
 */
export function buildDemoPageSectionsSeed({
  domainKey,
  domainHandle = '',
  storefrontProfile = {},
  productImages = [],
}) {
  const canonical = resolveDomainKey(domainKey);
  const handle = String(domainHandle || '').trim().toLowerCase();
  const accent = String(storefrontProfile.accentColor || '#2563eb').trim();
  const announcement = String(storefrontProfile.announcement || '').trim();
  const description = String(storefrontProfile.description || '').trim();
  const freeShip = Number(storefrontProfile.freeShippingThreshold);
  const cover = String(storefrontProfile.cover_image_url || '').trim();
  const fallback = resolveSpotlightBannerImage({ id: handle || canonical }, canonical, 0);
  const heroImage = productImages[0] || cover || fallback;
  const midImage = productImages[1] || productImages[0] || cover || fallback;

  const afterHero = {
    ...createEmptyPageSection('banner'),
    id: `demo-${handle || canonical}-after-hero`,
    placement: 'after-hero',
    design: heroImage ? 'image-only' : 'gradient',
    title: announcement.split('·')[0]?.trim() || 'Shop online today',
    subtitle: description.slice(0, 200) || '',
    imageUrl: heroImage,
    backgroundColor: accent,
    gradientFrom: accent,
    gradientTo: '#0f172a',
    textColor: '#ffffff',
    ctaLabel: 'Browse catalog',
    ctaHref: '/products',
    sortOrder: 0,
    enabled: true,
  };

  const midTitle =
    Number.isFinite(freeShip) && freeShip > 0
      ? `Free delivery on qualifying orders`
      : announcement || 'New arrivals · Order online';

  const midPage = {
    ...createEmptyPageSection('promo-strip'),
    id: `demo-${handle || canonical}-mid`,
    placement: 'mid-page',
    design: 'gradient',
    title: midTitle,
    subtitle:
      Number.isFinite(freeShip) && freeShip > 0
        ? `Spend above store threshold for complimentary delivery`
        : description.slice(0, 120) || 'Secure checkout and reliable fulfillment',
    backgroundColor: accent,
    gradientFrom: accent,
    gradientTo: '#1e3a8a',
    textColor: '#ffffff',
    ctaLabel: 'View products',
    ctaHref: '/products',
    sortOrder: 1,
    enabled: true,
  };

  const beforeFooter = {
    ...createEmptyPageSection('banner'),
    id: `demo-${handle || canonical}-footer`,
    placement: 'before-footer',
    design: midImage ? 'image' : 'gradient',
    title: 'Questions? We are here to help',
    subtitle: String(storefrontProfile.businessHours || 'Mon - Sat, 9:00 AM - 6:00 PM'),
    imageUrl: midImage,
    backgroundColor: accent,
    gradientFrom: '#0f172a',
    gradientTo: accent,
    textColor: '#ffffff',
    ctaLabel: 'Contact us',
    ctaHref: '/contact',
    sortOrder: 2,
    enabled: true,
  };

  return [afterHero, midPage, beforeFooter];
}

/**
 * Merge demo page sections only when tenant has none active.
 * @param {object} settings
 * @param {{ domainKey: string; domainHandle?: string; storefrontProfile?: Record<string, unknown>; productImages?: string[] }} ctx
 */
export function mergeDemoPageSectionsIntoSettings(settings, ctx) {
  const prev = settings && typeof settings === 'object' ? settings : {};
  const active = getActivePageSections(prev.pageSections);
  if (active.length > 0) return prev;

  return {
    ...prev,
    pageSections: buildDemoPageSectionsSeed(ctx),
  };
}
