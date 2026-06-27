/**
 * Auto-parts storefront template (parts-finder vertical).
 * Template metadata sourced from archive/autoparts.html via autoPartsArchiveMap.js.
 * Owner overrides via `settings.storefront.autoParts`.
 */
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { isAutoPartsFinderStore } from './partsFinder.js';
import {
  AUTO_PARTS_DEFAULT_SLIDES,
  AUTO_PARTS_PROMO_CARDS,
  AUTO_PARTS_FEATURED_CATEGORIES,
  AUTO_PARTS_VEHICLE_BRANDS,
  AUTO_PARTS_SHOP_BRANDS,
  AUTO_PARTS_TRENDING_TABS,
  AUTO_PARTS_TRENDING_SEARCHES,
  AUTO_PARTS_TRUST_DEFAULTS,
  AUTO_PARTS_CATEGORY_RAILS,
  AUTO_PARTS_NAV_ITEMS,
  AUTO_PARTS_BRAND_LIST,
  AUTO_PARTS_CAR_BRAND_MODELS,
  AUTO_PARTS_ARCHIVE_FEATURED_DEALS,
  AUTO_PARTS_CTA_DEFAULTS,
} from './autoPartsArchiveMap.js';

export {
  AUTO_PARTS_DEFAULT_SLIDES,
  AUTO_PARTS_PROMO_CARDS,
  AUTO_PARTS_FEATURED_CATEGORIES,
  AUTO_PARTS_VEHICLE_BRANDS,
  AUTO_PARTS_SHOP_BRANDS,
  AUTO_PARTS_TRENDING_TABS,
  AUTO_PARTS_TRENDING_SEARCHES,
  AUTO_PARTS_TRUST_DEFAULTS,
  AUTO_PARTS_CATEGORY_RAILS,
  AUTO_PARTS_NAV_ITEMS,
  AUTO_PARTS_BRAND_LIST,
  AUTO_PARTS_CAR_BRAND_MODELS,
};

export function isAutoPartsStore(category) {
  return isAutoPartsFinderStore(category);
}

/**
 * @param {object} [settings] business settings
 */
export function getAutoPartsConfig(settings = {}) {
  const raw = settings?.storefront?.autoParts || settings?.autoParts || {};
  return {
    showPromoCards: raw.showPromoCards !== false,
    showFeaturedCategories: raw.showFeaturedCategories !== false,
    showFeaturedDeals: raw.showFeaturedDeals !== false,
    showVehicleBrands: raw.showVehicleBrands !== false,
    showTrending: raw.showTrending !== false,
    showTrustSection: raw.showTrustSection !== false,
    showCategoryRails: raw.showCategoryRails !== false,
    showMarketingBanners: raw.showMarketingBanners !== false,
    showBottomCta: raw.showBottomCta === true,
    trustTitle: raw.trustTitle || AUTO_PARTS_TRUST_DEFAULTS.title,
    trustSubtitle: raw.trustSubtitle || AUTO_PARTS_TRUST_DEFAULTS.subtitle,
    trustStats: Array.isArray(raw.trustStats) && raw.trustStats.length
      ? raw.trustStats
      : AUTO_PARTS_TRUST_DEFAULTS.stats,
    trustFeatures: Array.isArray(raw.trustFeatures) && raw.trustFeatures.length
      ? raw.trustFeatures
      : AUTO_PARTS_TRUST_DEFAULTS.features,
    trendingSearches: Array.isArray(raw.trendingSearches) && raw.trendingSearches.length
      ? raw.trendingSearches
      : AUTO_PARTS_TRENDING_SEARCHES,
    ctaTitle: raw.ctaTitle || AUTO_PARTS_CTA_DEFAULTS.title,
    ctaSubtitle: raw.ctaSubtitle || AUTO_PARTS_CTA_DEFAULTS.subtitle,
    ctaLabel: raw.ctaLabel || AUTO_PARTS_CTA_DEFAULTS.label,
  };
}

/**
 * Hero slides with optional owner overrides and cover image on first slide.
 * @param {string} base `/store/{domain}`
 * @param {object} [settings]
 * @param {string} [customCover]
 */
export function getAutoPartsHeroSlides(base, settings = {}, customCover) {
  const custom = settings?.storefront?.autoParts?.slides;
  const slides = Array.isArray(custom) && custom.length
    ? custom
    : AUTO_PARTS_DEFAULT_SLIDES;

  return slides.map((s, i) => ({
    eyebrow: s.eyebrow || '',
    title: s.title || '',
    subtitle: s.subtitle || '',
    image: i === 0 && customCover ? customCover : (s.image || AUTO_PARTS_DEFAULT_SLIDES[0].image),
    ctaLabel: s.ctaLabel,
    ctaHref: s.ctaHref || (s.ctaHrefSuffix ? `${base}/products${s.ctaHrefSuffix}` : `${base}/products`),
    accent: s.accent,
  }));
}

/**
 * Partition catalog for homepage sections.
 * @param {object[]} products
 */
export function partitionAutoPartsCatalog(products = []) {
  const norm = (p) => String(p?.category || '').toLowerCase().replace(/\s+/g, '-');
  const byCat = (slug) =>
    products.filter((p) => norm(p).includes(slug) || norm(p) === slug);

  const onSale = products.filter((p) => {
    const price = Number(p.display_price ?? p.price ?? 0);
    const compare = Number(p.compare_price) || 0;
    return compare > price;
  });

  const carCare = byCat('car-care');
  const lubricants = byCat('lubricant');
  const wheels = [...byCat('wheel'), ...byCat('tyre')];

  return {
    featured: products.filter((p) => p.is_featured),
    onSale,
    trending: products.filter((p) => p.is_featured || onSale.includes(p)),
    carCare,
    'car-care': carCare,
    lubricants,
    filters: byCat('filter'),
    electrical: byCat('electrical'),
    accessories: byCat('accessor'),
    brakes: byCat('brake'),
    tyres: byCat('tyre'),
    wheels,
    engine: byCat('engine'),
  };
}

/**
 * Resolve featured deal cards from sale products or catalog highlights.
 * @param {object[]} products
 * @param {string} base
 * @param {number} [limit]
 */
export function buildAutoPartsDealCards(products, base, limit = 6) {
  const pool = partitionAutoPartsCatalog(products);
  const candidates = [...pool.onSale, ...pool.featured].filter(
    (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
  );

  const dealTones = ['#1a5276', '#2c3e50', '#d42b2b', '#1c2833', '#34495e', '#1a6b3c'];
  const defaultBadges = ['Trending', 'Best seller', 'Top pick', 'Popular', 'Steady seller', 'New'];

  const findArchiveDeal = (productName) => {
    const norm = String(productName || '').toLowerCase();
    return (AUTO_PARTS_ARCHIVE_FEATURED_DEALS || []).find((d) => {
      const dn = String(d.name || '').toLowerCase();
      return norm.includes(dn) || dn.includes(norm);
    });
  };

  return candidates.slice(0, limit).map((p, i) => {
    const archiveDeal = findArchiveDeal(p.name);
    const price = Number(p.display_price ?? p.price ?? 0);
    const compare = Number(p.compare_price) || 0;
    return {
      id: p.id,
      badge: archiveDeal?.badge || defaultBadges[i % defaultBadges.length],
      title: p.name,
      price,
      comparePrice: compare,
      image: getEffectiveProductImageUrl(p, 'auto-parts'),
      href: `${base}/products/${p.slug || p.id}`,
      tone: dealTones[i % dealTones.length],
    };
  });
}

/**
 * @param {string | null | undefined} category
 */
export function resolveAutoPartsCanonical(category) {
  const canonical = resolveDomainKey(category);
  return canonical === 'auto-parts' ? canonical : null;
}

/** Vehicle make tiles for parts-finder marquee (archive logos). */
export function getAutoPartsMarqueeBrands() {
  return AUTO_PARTS_VEHICLE_BRANDS.filter((b) => !b.isAll).map((b) => ({
    id: b.id,
    name: b.name,
    image: b.image,
  }));
}
