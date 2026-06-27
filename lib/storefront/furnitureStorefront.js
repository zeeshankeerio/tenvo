/**
 * Woodin elevated furniture storefront — tenant-aware with demo-only COMFY defaults.
 * Isolated to canonical `furniture` vertical.
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import {
  formatElevatedStoreName,
  buildCategoryNavItems,
  buildCuratedTabsFromCategories,
  buildQuickSearchTerms,
  buildPromoBannersFromCatalog,
  buildTenantHeroSlides,
  enrichCategoryNavImages,
  filterProductsByCategorySlug,
  isDemoStoreDomain,
} from '@/lib/storefront/elevatedStorefrontTenant';

export const FURNITURE_ELEVATED_CANONICALS = new Set(['furniture']);

export const WOODIN_WALNUT = '#78350f';
export const WOODIN_WALNUT_DARK = '#451a03';
export const WOODIN_WALNUT_LIGHT = '#fffbeb';
export const WOODIN_CREAM = '#faf7f2';

export const FURNITURE_ACCENTS = {
  accent: WOODIN_WALNUT,
  accentDark: WOODIN_WALNUT_DARK,
  accentLight: WOODIN_WALNUT_LIGHT,
};

/**
 * @param {string | null | undefined} category
 */
export function isFurnitureElevatedStore(category) {
  return FURNITURE_ELEVATED_CANONICALS.has(resolveDomainKey(category));
}

/**
 * Public-facing store name (strips legacy "Demo" suffix).
 * @param {string | null | undefined} name
 */
export function formatFurnitureStoreName(name) {
  return formatElevatedStoreName(name, 'Our furniture store');
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} [businessDomain]
 */
export function getFurnitureConfig(settings = {}, businessDomain) {
  const raw = settings?.storefront?.furniture || {};
  const isDemo = isDemoStoreDomain(businessDomain);
  return {
    locationLabel: raw.locationLabel || 'Deliver to',
    defaultLocation: raw.defaultLocation || '',
    searchPlaceholder: raw.searchPlaceholder || 'Search sofas, beds, dining sets, tables…',
    showroomLabel: raw.showroomLabel || 'Visit showroom',
    showRoomTiles: raw.showRoomTiles !== false,
    showTestimonials: raw.showTestimonials === true || (raw.showTestimonials === undefined && isDemo),
    showShowroomCta: raw.showShowroomCta !== false,
    featuredRailTitle: raw.featuredRailTitle || '',
    featuredRailSubtitle: raw.featuredRailSubtitle || '',
    heroSlides: Array.isArray(raw.heroSlides) && raw.heroSlides.length ? raw.heroSlides : null,
    roomCollections: Array.isArray(raw.roomCollections) && raw.roomCollections.length ? raw.roomCollections : null,
    categoryIcons: Array.isArray(raw.categoryIcons) && raw.categoryIcons.length ? raw.categoryIcons : null,
    promoBanners: Array.isArray(raw.promoBanners) && raw.promoBanners.length ? raw.promoBanners : null,
    editorialBanners: Array.isArray(raw.editorialBanners) && raw.editorialBanners.length ? raw.editorialBanners : null,
    trustPillars: Array.isArray(raw.trustPillars) && raw.trustPillars.length ? raw.trustPillars : null,
    curatedTabs: Array.isArray(raw.curatedTabs) && raw.curatedTabs.length ? raw.curatedTabs : null,
    quickSearchTerms: Array.isArray(raw.quickSearchTerms) && raw.quickSearchTerms.length ? raw.quickSearchTerms : null,
    testimonials: Array.isArray(raw.testimonials) && raw.testimonials.length ? raw.testimonials : null,
  };
}

export const FURNITURE_DEMO_QUICK_SEARCH_TERMS = ['Sofa', 'King Bed', 'Dining Set', 'Coffee Table', 'Recliner'];
/** @deprecated use resolveFurnitureQuickSearchTerms */
export const FURNITURE_QUICK_SEARCH_TERMS = [];

/**
 * @param {string} base `/store/{domain}`
 */
export function getFurnitureNavLinks(base, categories = []) {
  const fromDb = buildCategoryNavItems(categories, base, { max: 6, includeDeals: true });
  if (fromDb.length) {
    return fromDb.map((item) => ({ id: item.id, label: item.label, href: item.href }));
  }
  const products = `${base}/products`;
  return [
    { id: 'all', label: 'All furniture', href: products },
    { id: 'sale', label: 'Sale', href: `${products}?onSale=true` },
    { id: 'contact', label: 'Visit showroom', href: `${base}/contact` },
  ];
}

/** Demo-only room collections (COMFY CDN). */
export const FURNITURE_DEMO_ROOM_COLLECTIONS = [
  {
    id: 'living',
    label: 'Living Room',
    slug: 'living-room',
    desc: 'Sofas, chairs & tables',
    image: 'https://comfy.sg/cdn/shop/collections/steel-grey-leather-sofa-set.jpg?width=800',
  },
  {
    id: 'bedroom',
    label: 'Bedroom',
    slug: 'bedroom-furniture',
    desc: 'Beds & nightstands',
    image: 'https://comfy.sg/cdn/shop/collections/grey-queen-size-bed-frame-bed-room.jpg?width=800',
  },
  {
    id: 'dining',
    label: 'Dining Room',
    slug: 'dining-room',
    desc: 'Tables & chair sets',
    image: 'https://comfy.sg/cdn/shop/collections/modern-white-marble-dining-table-set.jpg?width=800',
  },
  {
    id: 'recliners',
    label: 'Recliner Sofas',
    slug: 'living-room',
    desc: 'Power leather recliners',
    image: 'https://comfy.sg/cdn/shop/collections/grey-leather-recliner-sofa-with-usb-ports.jpg?width=800',
  },
  {
    id: 'sectional',
    label: 'Sectional Sofas',
    slug: 'living-room',
    desc: 'L-shape & modular',
    image: 'https://comfy.sg/cdn/shop/collections/sectional-sofa.jpg?width=800',
  },
  {
    id: 'kids',
    label: 'Kids',
    slug: 'kids-furniture',
    desc: 'Study & bedroom',
    image: 'https://comfy.sg/cdn/shop/collections/kids-furniture-singapore.jpg?width=800',
  },
];

/** Demo-only category icons. */
export const FURNITURE_DEMO_CATEGORY_ICONS = [
  { id: 'sofas', label: 'Sofas', slug: 'living-room', image: 'https://comfy.sg/cdn/shop/collections/dark-blue-3-seater-full-grain-leather-sofa.jpg?width=200' },
  { id: 'beds', label: 'Beds', slug: 'bedroom-furniture', image: 'https://comfy.sg/cdn/shop/collections/grey-queen-size-bed-frame-bed-room.jpg?width=200' },
  { id: 'dining', label: 'Dining', slug: 'dining-room', image: 'https://comfy.sg/cdn/shop/collections/modern-white-marble-dining-table-set.jpg?width=200' },
  { id: 'recliners', label: 'Recliners', slug: 'living-room', image: 'https://comfy.sg/cdn/shop/files/irene-electric-recliner-sofa.jpg?width=200' },
  { id: 'sectional', label: 'Sectionals', slug: 'living-room', image: 'https://comfy.sg/cdn/shop/collections/sectional-sofa.jpg?width=200' },
  { id: 'mattress', label: 'Mattresses', slug: 'bedroom-furniture', image: 'https://comfy.sg/cdn/shop/files/comfy-sleepperfect-hybrid-mattress.webp?width=200' },
  { id: 'coffee', label: 'Coffee Tables', slug: 'coffee-tables', image: 'https://comfy.sg/cdn/shop/files/elliot-coffee-marble-table.jpg?width=200' },
  { id: 'kids', label: 'Kids', slug: 'kids-furniture', image: 'https://comfy.sg/cdn/shop/collections/kids-furniture-singapore.jpg?width=200' },
  { id: 'outdoor', label: 'Outdoor', slug: 'living-room', image: 'https://comfy.sg/cdn/shop/collections/steel-grey-leather-sofa-set.jpg?width=200' },
  { id: 'sale', label: 'Sale', slug: '', hrefSuffix: '?onSale=true', image: 'https://api.fantasticfurniture.com.au/medias/Bridge-Table.png' },
];

const FURNITURE_DEMO_HERO_SLIDES = [
  {
    eyebrow: '{storeName} · Modern living',
    title: 'Sofas designed for modern homes',
    subtitle: 'Power recliners, sectionals, and leather sofas with free assembly on qualifying orders.',
    image: 'https://comfy.sg/cdn/shop/files/comfy-sofa-singapore.webp?width=1920',
    ctaLabel: 'Shop sofas',
    ctaHref: '/products?category=living-room',
  },
  {
    eyebrow: 'Up to 35% off',
    title: 'Dining & bedroom collections',
    subtitle: 'Dining sets, storage beds, and mattresses with nationwide delivery.',
    image: 'https://comfy.sg/cdn/shop/files/best-selling-sintered-stone-dining-table-set.webp?width=1920',
    ctaLabel: 'View sale',
    ctaHref: '/products?onSale=true',
  },
  {
    eyebrow: 'Visit our showroom',
    title: 'See, touch, and test before you buy',
    subtitle: 'Expert styling advice, fabric swatches, and custom sizing available in-store.',
    image: 'https://comfy.sg/cdn/shop/files/comfy-singapore-showrooms.webp?width=1920',
    ctaLabel: 'Book a visit',
    ctaHref: '/contact',
  },
];

/**
 * @param {string} base
 * @param {object} [settings]
 * @param {{ storeName?: string; businessDomain?: string; businessDescription?: string; coverImage?: string | null; products?: object[] }} [ctx]
 */
export function getFurnitureHeroSlides(base, settings = {}, ctx = {}) {
  const config = getFurnitureConfig(settings, ctx.businessDomain);
  const storeName = ctx.storeName || formatFurnitureStoreName('');
  const featured = (ctx.products || []).filter((p) => p.is_featured && p.image_url);

  return buildTenantHeroSlides({
    settingsSlides: config.heroSlides,
    base,
    storeName,
    businessDescription: ctx.businessDescription,
    coverImage: ctx.coverImage,
    demoSlides: FURNITURE_DEMO_HERO_SLIDES,
    isDemo: isDemoStoreDomain(ctx.businessDomain),
    featuredProducts: featured.length ? featured : (ctx.products || []).filter((p) => p.image_url).slice(0, 4),
  });
}

/** Demo-only promo banners. */
export const FURNITURE_DEMO_PROMO_BANNERS = [
  {
    id: 'sofas',
    title: 'Recliner & Sectional Sofas',
    subtitle: 'Power recliners, L-shapes, and leather sets',
    image: 'https://comfy.sg/cdn/shop/collections/grey-leather-recliner-sofa-with-usb-ports.jpg?width=900',
    href: '?category=living-room',
    tone: 'walnut',
  },
  {
    id: 'dining',
    title: 'Sintered Stone Dining',
    subtitle: 'Scratch-resistant tables with chair sets',
    image: 'https://comfy.sg/cdn/shop/files/sintered-stone-dining-table-and-chairs.jpg?width=900',
    href: '?category=dining-room',
    tone: 'cream',
  },
  {
    id: 'beds',
    title: 'Bedroom & Mattresses',
    subtitle: 'Bed frames, bedside tables, and hybrid mattresses',
    image: 'https://comfy.sg/cdn/shop/collections/grey-queen-size-bed-frame-bed-room.jpg?width=900',
    href: '?category=bedroom-furniture',
    tone: 'walnut',
  },
  {
    id: 'value',
    title: 'Best value picks',
    subtitle: 'Dining tables, sofas, and mattresses on offer',
    image: 'https://api.fantasticfurniture.com.au/medias/SOF-NICO-LGY-ABC-07-1-1.png',
    href: '?onSale=true',
    tone: 'cream',
  },
];

/** Demo-only editorial banners. */
export const FURNITURE_DEMO_EDITORIAL_BANNERS = [
  {
    id: 'leather',
    eyebrow: 'Top grain leather',
    title: 'Leather recliner sofas',
    subtitle: 'Semi-aniline leather with power recline. Classic and modern silhouettes in multiple colours.',
    image: 'https://comfy.sg/cdn/shop/files/semi-aniline-leather-recliner-sofa-top-grain.webp?width=1200',
    href: '?category=living-room',
  },
  {
    id: 'mattress',
    eyebrow: 'Sleep collection',
    title: 'Mattresses designed for comfort',
    subtitle: 'Cooling hybrid layers and medium-firm support for restful nights.',
    image: 'https://comfy.sg/cdn/shop/files/comfy-sleepperfect-hybrid-mattress.webp?width=1200',
    href: '?category=bedroom-furniture',
  },
  {
    id: 'dining-chairs',
    eyebrow: 'Dining chairs',
    subtitle: 'Seat your guests in style with upholstered and cane-back designs.',
    title: 'Dining chairs & benches',
    image: 'https://comfy.sg/cdn/shop/files/stylish-dining-chair-set-dual-color.webp?width=1200',
    href: '?category=dining-room',
  },
];

export const FURNITURE_DEFAULT_TRUST_PILLARS = [
  { id: 'delivery', label: 'Delivery & assembly', desc: 'On qualifying orders' },
  { id: 'custom', label: 'Customisation options', desc: 'Fabrics, sizes, and finishes' },
  { id: 'warranty', label: 'Peace of mind promise', desc: 'Simple returns and warranty' },
  { id: 'homes', label: 'Made for modern homes', desc: 'Smart scale for any space' },
];

export const FURNITURE_DEFAULT_CURATED_TABS = [{ id: 'all', label: 'All items', slug: '' }];

/** Demo-only testimonials. */
export const FURNITURE_DEMO_TESTIMONIALS = [
  {
    id: '1',
    quote: 'The Irene sofa was a clear winner the moment we sat on it. Knowledgeable staff, non-pushy service, and fuss-free delivery.',
    product: 'Cloud Fiber Sofa',
    author: 'Google Review',
  },
  {
    id: '2',
    quote: 'Excellent quality and great customer service. We found a dining set in stock and had it delivered within the week.',
    product: 'Royal Cane Luxe Dining',
    author: 'Google Review',
  },
  {
    id: '3',
    quote: 'Love the buttery soft leather and sophisticated recliner features. The purchasing process was straightforward.',
    product: 'Lowe L-Shaped Sofa',
    author: 'Google Review',
  },
  {
    id: '4',
    quote: 'Delivery and installation were done professionally. Quality arrived in immaculate condition.',
    product: 'Ondina Bed',
    author: 'Google Review',
  },
];

function productComparePrice(p) {
  return p?.compare_price ?? p?.compare_at_price;
}

/**
 * Partition catalog into homepage rails.
 * @param {object[]} products
 */
export function partitionFurnitureProducts(products = []) {
  const inStock = (products || []).filter((p) => p.stock == null || Number(p.stock) > 0);
  const pool = inStock.length ? inStock : products;
  const onSale = pool.filter((p) => {
    const compare = productComparePrice(p);
    return compare && Number(compare) > Number(p.price);
  });
  const featured = pool.filter((p) => p.is_featured);

  return {
    topPicks: featured.length ? featured : pool.slice(0, 12),
    deals: onSale.length ? onSale : pool.filter((p) => productComparePrice(p)).slice(0, 12),
    newArrivals: pool.slice(0, 12),
  };
}

export function filterFurnitureByCategorySlug(products = [], slug) {
  return filterProductsByCategorySlug(products, slug);
}

/**
 * @param {object} [settings]
 * @param {string} base
 */
export function resolveFurnitureCategoryIcons(settings, storeBase, ctx = {}) {
  const config = getFurnitureConfig(settings, ctx.businessDomain);
  const productsUrl = `${storeBase}/products`;

  if (config.categoryIcons) {
    return config.categoryIcons.map((item) => ({
      ...item,
      href: `${productsUrl}${item.hrefSuffix || (item.slug ? `?category=${encodeURIComponent(item.slug)}` : '')}`,
    }));
  }

  const fromDb = enrichCategoryNavImages(
    buildCategoryNavItems(ctx.categories, storeBase, { max: 10, includeDeals: true }),
    ctx.products,
    ctx.businessCategory
  ).filter((c) => c.label);

  if (fromDb.length >= 2) return fromDb;

  if (isDemoStoreDomain(ctx.businessDomain)) {
    return FURNITURE_DEMO_CATEGORY_ICONS.map((item) => ({
      ...item,
      href: `${productsUrl}${item.hrefSuffix || (item.slug ? `?category=${encodeURIComponent(item.slug)}` : '')}`,
    }));
  }

  return fromDb;
}

export function resolveFurnitureRoomCollections(settings, storeBase, ctx = {}) {
  const config = getFurnitureConfig(settings, ctx.businessDomain);

  if (config.roomCollections) {
    return config.roomCollections.map((item) => ({
      ...item,
      href: `${storeBase}/products?category=${encodeURIComponent(item.slug)}`,
    }));
  }

  const fromDb = enrichCategoryNavImages(
    buildCategoryNavItems(ctx.categories, storeBase, { max: 6, includeDeals: false }),
    ctx.products,
    ctx.businessCategory
  ).map((item) => ({
    id: item.id,
    label: item.label,
    slug: item.slug,
    desc: '',
    image: item.image,
    href: item.href,
  }));

  if (fromDb.length >= 2) return fromDb;

  if (isDemoStoreDomain(ctx.businessDomain)) {
    return FURNITURE_DEMO_ROOM_COLLECTIONS.map((item) => ({
      ...item,
      href: `${storeBase}/products?category=${encodeURIComponent(item.slug)}`,
    }));
  }

  return fromDb;
}

export function resolveFurnitureCuratedTabs(settings = {}, categories = []) {
  const config = getFurnitureConfig(settings);
  if (config.curatedTabs) return config.curatedTabs;
  return buildCuratedTabsFromCategories(categories, FURNITURE_DEFAULT_CURATED_TABS);
}

export function resolveFurnitureQuickSearchTerms(settings = {}, products = [], categories = [], businessDomain) {
  const config = getFurnitureConfig(settings, businessDomain);
  const terms = buildQuickSearchTerms(products, categories, config.quickSearchTerms);
  if (terms.length) return terms;
  return isDemoStoreDomain(businessDomain) ? FURNITURE_DEMO_QUICK_SEARCH_TERMS : terms;
}

export function resolveFurniturePromoBanners(settings = {}, products = [], businessDomain, businessCategory) {
  const config = getFurnitureConfig(settings, businessDomain);
  return buildPromoBannersFromCatalog(
    products,
    config.promoBanners,
    FURNITURE_DEMO_PROMO_BANNERS,
    { isDemo: isDemoStoreDomain(businessDomain), businessCategory }
  ).map((b, i) => ({ ...b, tone: b.tone || (i % 2 === 0 ? 'walnut' : 'cream') }));
}

export function resolveFurnitureEditorialBanners(settings = {}, products = [], businessDomain, businessCategory) {
  const config = getFurnitureConfig(settings, businessDomain);
  if (config.editorialBanners) return config.editorialBanners;
  if (isDemoStoreDomain(businessDomain)) return FURNITURE_DEMO_EDITORIAL_BANNERS;
  const pool = (products || []).filter((p) => p.image_url).slice(0, 3);
  return pool.map((p, i) => ({
    id: String(p.id || i),
    eyebrow: p.category_name || p.category || '',
    title: p.name,
    subtitle: p.description?.slice(0, 100) || '',
    image: p.image_url,
    href: `?search=${encodeURIComponent(String(p.name).split(/\s+/)[0])}`,
  }));
}

export function resolveFurnitureTrustPillars(settings = {}, businessDomain) {
  const config = getFurnitureConfig(settings, businessDomain);
  return config.trustPillars || FURNITURE_DEFAULT_TRUST_PILLARS;
}

export function resolveFurnitureTestimonials(settings = {}, businessDomain) {
  const config = getFurnitureConfig(settings, businessDomain);
  if (config.testimonials) return config.testimonials;
  return isDemoStoreDomain(businessDomain) ? FURNITURE_DEMO_TESTIMONIALS : [];
}

// Legacy exports
export const FURNITURE_ROOM_COLLECTIONS = FURNITURE_DEMO_ROOM_COLLECTIONS;
export const FURNITURE_CATEGORY_ICONS = FURNITURE_DEMO_CATEGORY_ICONS;
export const FURNITURE_PROMO_BANNERS = FURNITURE_DEMO_PROMO_BANNERS;
export const FURNITURE_EDITORIAL_BANNERS = FURNITURE_DEMO_EDITORIAL_BANNERS;
export const FURNITURE_TRUST_PILLARS = FURNITURE_DEFAULT_TRUST_PILLARS;
export const FURNITURE_CURATED_TABS = FURNITURE_DEFAULT_CURATED_TABS;
export const FURNITURE_TESTIMONIALS = FURNITURE_DEMO_TESTIMONIALS;
