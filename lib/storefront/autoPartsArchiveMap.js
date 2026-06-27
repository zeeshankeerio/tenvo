/**
 * Maps raw archive/autoparts.html seed data to storefront-ready shapes.
 * Regenerate source: `node scripts/extract-autoparts-archive-seed.mjs`
 */
import { AUTOPARTS_ARCHIVE_META } from '../dataLab/autopartsArchiveSeed.js';

const ARCHIVE = AUTOPARTS_ARCHIVE_META;

/** Archive tab id → product category filter token used by partition/filter logic. */
const TRENDING_TAB_FILTER = {
  'car-accessories': 'accessor',
  'car-care': 'car-care',
  'led-lights': 'electrical',
  '4-215-4-suv': 'accessor',
  'car-parts': 'filter',
};

function titleCase(label) {
  return String(label || '')
    .replace(/&#215;/g, 'x')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const AUTO_PARTS_DEFAULT_SLIDES = ARCHIVE.heroSlides.map((s) => ({
  eyebrow: s.eyebrow || 'autostore.pk',
  title: titleCase(s.title),
  subtitle: s.subtitle,
  image: s.image,
  ctaLabel: titleCase(s.ctaLabel),
  ctaHrefSuffix: s.ctaHrefSuffix || '?sort=newest',
  accent: s.accent,
}));

export const AUTO_PARTS_PROMO_CARDS = ARCHIVE.promoCards.map((c) => ({
  id: c.id,
  title: titleCase(c.title),
  description: c.description,
  image: c.image,
  hrefSuffix: c.hrefSuffix || '?sort=newest',
}));

export const AUTO_PARTS_FEATURED_CATEGORIES = ARCHIVE.featuredCategories.map((c) => ({
  id: c.id,
  label: titleCase(c.label),
  slug: c.slug,
  productCount: c.productCount,
  images: c.images?.length ? c.images : [],
}));

export const AUTO_PARTS_VEHICLE_BRANDS = [
  ...ARCHIVE.vehicleBrands.map((b) => ({
    id: b.id,
    name: b.name,
    image: b.image,
  })),
  { id: 'all', name: 'All brands', image: null, isAll: true },
];

export const AUTO_PARTS_SHOP_BRANDS = ARCHIVE.shopBrands;

export const AUTO_PARTS_TRENDING_TABS = ARCHIVE.trendingTabs.map((t) => ({
  id: t.id,
  label: t.label.replace(/&#215;/g, '×'),
  slug: t.id === 'all' ? '' : (TRENDING_TAB_FILTER[t.id] || t.slug),
  filterSlug: t.id === 'all' ? '' : (TRENDING_TAB_FILTER[t.id] || t.slug),
}));

export const AUTO_PARTS_TRENDING_SEARCHES = ARCHIVE.trendingSearches;

export const AUTO_PARTS_TRUST_DEFAULTS = {
  title: titleCase(ARCHIVE.trust.title),
  subtitle: ARCHIVE.trust.subtitle,
  stats: ARCHIVE.trust.stats.map((s) => ({
    value: s.value,
    label: s.label,
    description: s.description,
  })),
  features: ARCHIVE.trust.features.map((f) => ({
    id: f.id,
    title: titleCase(f.title),
    text: f.text,
  })),
};

export const AUTO_PARTS_CATEGORY_RAILS = ARCHIVE.categoryRails.map((r) => ({
  id: r.id,
  title: r.title,
  subtitle: r.subtitle,
  slug: r.id === 'wheels' ? 'tyres' : 'car-care',
}));

export const AUTO_PARTS_NAV_ITEMS = ARCHIVE.navItems;
export const AUTO_PARTS_BRAND_LIST = ARCHIVE.brandList;
export const AUTO_PARTS_CAR_BRAND_MODELS = ARCHIVE.carBrandModels;
export const AUTO_PARTS_ARCHIVE_FEATURED_DEALS = ARCHIVE.featuredDeals;

export const AUTO_PARTS_CTA_DEFAULTS = {
  title: titleCase(ARCHIVE.ctaStrip.title),
  subtitle: ARCHIVE.ctaStrip.subtitle,
  label: titleCase(ARCHIVE.ctaStrip.label),
};
