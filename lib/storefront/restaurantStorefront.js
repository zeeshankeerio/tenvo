/**
 * Elevated restaurant / food storefront — tenant-aware with demo-only Supermeal defaults.
 * Isolated to canonical `restaurant-cafe`.
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import {
  formatElevatedStoreName,
  buildCategoryNavItems,
  buildCuratedTabsFromCategories,
  buildQuickSearchTerms,
  filterProductsByCategorySlug,
  buildPromoBannersFromCatalog,
  buildTenantHeroSlides,
  enrichCategoryNavImages,
  isDemoStoreDomain,
} from '@/lib/storefront/elevatedStorefrontTenant';
import { enrichRestaurantCategoriesWithSeedImages, enrichRestaurantCuisineNavImages, buildRestaurantDemoCuisineIcons } from '@/lib/dataLab/restaurantSeedHelpers';
import { getFallbackProductImageUrl } from '@/lib/storefront/productImageFallback';
import { buildUnsplashImageUrl } from '@/lib/storefront/unsplashUrl';
import {
  RESTAURANT_DEFAULT_SUB_NAV,
  RESTAURANT_DELIVERY_NOTICE,
  RESTAURANT_THEME,
  RESTAURANT_UPPER_PROMO_TILES,
  RESTAURANT_DEMO_SPOTLIGHT_CARDS,
} from '@/lib/storefront/restaurantCatalogDefaults';

/** Trusted, always-on food/beverage stock imagery (Unsplash). */
function cuisineImg(name, category, id) {
  return getFallbackProductImageUrl({ name, id }, 'restaurant-cafe', category);
}
const heroImg = (id) => buildUnsplashImageUrl(id, { w: 1600, q: 82 });
const bannerImg = (id) => buildUnsplashImageUrl(id, { w: 900, q: 82 });

export const RESTAURANT_ELEVATED_CANONICALS = new Set(['restaurant-cafe']);

export const SUPERMEAL_PURPLE = '#603cba';
export const SUPERMEAL_PURPLE_DARK = '#4c2d9a';
export const SUPERMEAL_RED = '#ed0000';
export const SUPERMEAL_CREAM = '#f2f2f2';

export const RESTAURANT_ACCENTS = {
  accent: RESTAURANT_THEME.accent,
  accentDark: RESTAURANT_THEME.accentDark,
  accentLight: '#1c1c1c',
  promo: RESTAURANT_THEME.accent,
};

/**
 * @param {string | null | undefined} category
 */
export function isRestaurantElevatedStore(category) {
  return RESTAURANT_ELEVATED_CANONICALS.has(resolveDomainKey(category));
}

/**
 * @param {string | null | undefined} name
 */
export function formatRestaurantStoreName(name) {
  return formatElevatedStoreName(name, 'Our restaurant');
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} [businessDomain]
 */
export function getRestaurantConfig(settings = {}, businessDomain) {
  const raw = settings?.storefront?.restaurant || {};
  const isDemo = isDemoStoreDomain(businessDomain);
  return {
    locationLabel: raw.locationLabel || 'Deliver to',
    defaultLocation: raw.defaultLocation || '',
    showCuisineCarousel: raw.showCuisineCarousel !== false,
    showSuperPicks: raw.showSuperPicks !== false,
    showOrderModes: raw.showOrderModes !== false,
    showTrustStrip: raw.showTrustStrip !== false,
    showUpperPromoTiles: raw.showUpperPromoTiles !== false,
    showDeliveryBanner: raw.showDeliveryBanner !== false,
    showRewardsCta: raw.showRewardsCta === true,
    showDeliveryInfo: raw.showDeliveryInfo !== false,
    deliveryNotice: raw.deliveryNotice || settings?.announcement || RESTAURANT_DELIVERY_NOTICE,
    promoStripLabel: raw.promoStripLabel || 'Order now',
    promoStripHref: raw.promoStripHref || '/products',
    searchPlaceholder: raw.searchPlaceholder || 'Search dishes, categories, or specials…',
    heroSlides: Array.isArray(raw.heroSlides) && raw.heroSlides.length ? raw.heroSlides : null,
    cuisineIcons: Array.isArray(raw.cuisineIcons) && raw.cuisineIcons.length ? raw.cuisineIcons : null,
    promoBanners: Array.isArray(raw.promoBanners) && raw.promoBanners.length ? raw.promoBanners : null,
    upperPromoTiles: Array.isArray(raw.upperPromoTiles) && raw.upperPromoTiles.length ? raw.upperPromoTiles : null,
    orderModes: Array.isArray(raw.orderModes) && raw.orderModes.length ? raw.orderModes : null,
    trustPillars: Array.isArray(raw.trustPillars) && raw.trustPillars.length ? raw.trustPillars : null,
    curatedTabs: Array.isArray(raw.curatedTabs) && raw.curatedTabs.length ? raw.curatedTabs : null,
    quickSearchTerms: Array.isArray(raw.quickSearchTerms) && raw.quickSearchTerms.length ? raw.quickSearchTerms : null,
    featuredRailTitle: raw.featuredRailTitle || '',
    featuredRailSubtitle: raw.featuredRailSubtitle || '',
    cateringLabel: raw.cateringLabel || 'Catering',
  };
}

/** Demo-only cuisine icons (curated Unsplash food imagery). */
export const RESTAURANT_DEMO_CUISINE_ICONS = [
  { id: 'pakistani', label: 'Pakistani', slug: 'pakistani', category: 'Main Course', image: cuisineImg('Pakistani curry karahi', 'Main Course', 'pakistani') },
  { id: 'bbq', label: 'BBQ', slug: 'bbq', category: 'Main Course', image: cuisineImg('BBQ grilled meat tikka', 'Main Course', 'bbq') },
  { id: 'chinese', label: 'Chinese', slug: 'chinese', category: 'Main Course', image: cuisineImg('Chinese noodles meal', 'Main Course', 'chinese') },
  { id: 'italian', label: 'Italian', slug: 'italian', category: 'Main Course', image: cuisineImg('Italian pizza pasta meal', 'Main Course', 'italian') },
  { id: 'karhai', label: 'Karahi', slug: 'karhai', category: 'Main Course', image: cuisineImg('Chicken karahi platter', 'Main Course', 'karhai') },
  { id: 'appetizers', label: 'Starters', slug: 'appetizers', category: 'Appetizers', image: cuisineImg('Starters appetizers platter', 'Appetizers', 'appetizers') },
  { id: 'desserts', label: 'Desserts', slug: 'desserts', category: 'Desserts', image: cuisineImg('Dessert cake sweet', 'Desserts', 'desserts') },
  { id: 'drinks', label: 'Drinks', slug: 'drinks', category: 'Beverages', image: cuisineImg('Drinks beverage juice', 'Beverages', 'drinks') },
  { id: 'deals', label: 'Deals', slug: '', category: '', hrefSuffix: '?onSale=true', image: cuisineImg('Meal deal combo platter', 'Main Course', 'deals') },
];

export const RESTAURANT_DEFAULT_TRUST_PILLARS = [
  { id: 'delivery', label: 'Fast delivery', desc: 'Delivery or pickup when you need it' },
  { id: 'fresh', label: 'Freshly prepared', desc: 'Made to order from our kitchen' },
  { id: 'stock', label: 'Live availability', desc: 'Stock reflects what we can fulfill now' },
  { id: 'support', label: 'Order support', desc: 'Help with orders, changes, and catering' },
];

export const RESTAURANT_DEMO_TRUST_PILLARS = [
  { id: 'delivery', label: 'Fast delivery', desc: 'Hot meals to your door across Karachi' },
  { id: 'fresh', label: 'Freshly prepared', desc: 'Desi BBQ, rolls, and biryani made to order' },
  { id: 'stock', label: 'Live menu', desc: 'Prices and availability sync with our kitchen' },
  { id: 'support', label: 'Order support', desc: 'Help with orders, changes, and catering' },
];

export const RESTAURANT_ORDER_MODES = [
  { id: 'delivery', label: 'Delivery', desc: 'Hot meals to your door', icon: 'bike' },
  { id: 'collection', label: 'Takeaway', desc: 'Pick up when ready', icon: 'bag' },
  { id: 'dine-in', label: 'Dine-in', desc: 'Reserve a table', icon: 'utensils' },
];

export const RESTAURANT_DEFAULT_CURATED_TABS = [
  { id: 'all', label: 'All items', slug: '' },
];

const RESTAURANT_DEMO_HERO_SLIDES = [
  {
    eyebrow: 'Roll Inn · Desi BBQ',
    title: 'Smoky grills, tikka, and karahi',
    subtitle: 'Order BBQ platters, boti, and kababs for delivery or pickup.',
    image: 'https://services.eatx.pk/ProductImages/d838a46d-20b8-4146-a349-ace9101c9e57.jpg',
    ctaLabel: 'Browse BBQ',
    ctaHref: '/products?category=bbq',
  },
  {
    eyebrow: 'Biryani & rice',
    title: 'Handi biryani and rice favourites',
    subtitle: 'Chicken tikka biryani, boneless handi, and classic rice dishes.',
    image: 'https://services.eatx.pk/ProductImages/60f4ca4c-de06-4b85-a676-eef2a2976efd.jpg',
    ctaLabel: 'View biryani',
    ctaHref: '/products?category=biryani',
  },
  {
    eyebrow: 'Rolls & broast',
    title: 'Signature rolls and crispy broast',
    subtitle: 'Behari rolls, malai rolls, and broast combos ready to order.',
    image: 'https://services.eatx.pk/ProductImages/6496cce2-7ae9-4f1d-bd0f-4cfecd311ec1.jpg',
    ctaLabel: 'Explore menu',
    ctaHref: '/products',
  },
];

const RESTAURANT_DEMO_PROMO_BANNERS = RESTAURANT_DEMO_SPOTLIGHT_CARDS.map((card) => ({
  id: card.id,
  title: card.title,
  subtitle: card.subtitle,
  image: card.image,
  href: card.href,
  tone: card.id === 'deals' ? 'red' : 'warm',
}));

/**
 * @param {string} base
 * @param {object} [settings]
 * @param {{ storeName?: string; businessDomain?: string; businessDescription?: string; coverImage?: string | null; products?: object[] }} [ctx]
 */
export function getRestaurantHeroSlides(base, settings = {}, ctx = {}) {
  const config = getRestaurantConfig(settings);
  const storeName = ctx.storeName || formatRestaurantStoreName('');
  const isDemo = isDemoStoreDomain(ctx.businessDomain);
  const featured = (ctx.products || []).filter((p) => p.is_featured && p.image_url);

  return buildTenantHeroSlides({
    settingsSlides: config.heroSlides,
    base,
    storeName,
    businessDescription: ctx.businessDescription,
    coverImage: ctx.coverImage,
    demoSlides: RESTAURANT_DEMO_HERO_SLIDES,
    isDemo,
    featuredProducts: featured.length ? featured : (ctx.products || []).filter((p) => p.image_url).slice(0, 4),
  });
}

/**
 * @param {string} base
 * @param {object[]} [categories]
 * @param {object} [settings]
 */
export function getRestaurantNavLinks(base, categories = [], settings = {}) {
  const fromDb = buildCategoryNavItems(categories, base, { max: 6, includeDeals: true });
  if (fromDb.length) {
    return fromDb.map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
    }));
  }
  const products = `${base}/products`;
  return [
    { id: 'menu', label: 'Full menu', href: products },
    { id: 'deals', label: 'Deals', href: `${products}?onSale=true` },
    { id: 'contact', label: getRestaurantConfig(settings).cateringLabel, href: `${base}/contact` },
  ];
}

/**
 * @param {object} [settings]
 * @param {string} storeBase
 * @param {{ categories?: object[]; businessDomain?: string; products?: object[]; businessCategory?: string }} [ctx]
 */
export function resolveRestaurantCuisineIcons(settings = {}, storeBase, ctx = {}) {
  const config = getRestaurantConfig(settings);
  const productsUrl = `${storeBase}/products`;

  if (config.cuisineIcons) {
    return config.cuisineIcons.map((c) => ({
      ...c,
      href: c.hrefSuffix
        ? `${productsUrl}${c.hrefSuffix}`
        : c.slug
          ? `${productsUrl}?category=${encodeURIComponent(c.slug)}`
          : c.category
            ? `${productsUrl}?category=${encodeURIComponent(String(c.category).toLowerCase())}`
            : `${productsUrl}`,
    }));
  }

  if (isDemoStoreDomain(ctx.businessDomain)) {
    return enrichRestaurantCuisineNavImages(buildRestaurantDemoCuisineIcons(storeBase));
  }

  const categoryRows = enrichRestaurantCategoriesWithSeedImages(ctx.categories);

  const fromDb = enrichRestaurantCuisineNavImages(
    enrichCategoryNavImages(
      buildCategoryNavItems(categoryRows, storeBase, { max: 24, includeDeals: true }),
      ctx.products,
      ctx.businessCategory
    ).filter((c) => c.label)
  );

  if (fromDb.length >= 2) return fromDb;

  return fromDb;
}

/**
 * @param {object} [settings]
 * @param {object[]} [categories]
 */
export function resolveRestaurantCuratedTabs(settings = {}, categories = []) {
  const config = getRestaurantConfig(settings);
  if (config.curatedTabs) return config.curatedTabs;
  return buildCuratedTabsFromCategories(categories, RESTAURANT_DEFAULT_CURATED_TABS);
}

/**
 * @param {object} [settings]
 * @param {object[]} [products]
 * @param {object[]} [categories]
 */
export function resolveRestaurantQuickSearchTerms(settings = {}, products = [], categories = []) {
  const config = getRestaurantConfig(settings);
  return buildQuickSearchTerms(products, categories, config.quickSearchTerms);
}

/**
 * Four-up homepage spotlight cards — demo seed categories or live DB categories.
 * @param {object} [settings]
 * @param {object[]} [categories]
 * @param {string | null | undefined} businessDomain
 * @param {string} storeBase
 */
export function resolveRestaurantSpotlightCards(settings = {}, categories = [], businessDomain, storeBase) {
  const config = getRestaurantConfig(settings, businessDomain);
  const productsUrl = `${storeBase}/products`;

  if (Array.isArray(config.spotlightCards) && config.spotlightCards.length) {
    return config.spotlightCards.slice(0, 4).map((card) => ({
      ...card,
      href: card.href?.startsWith('/')
        ? `${storeBase}${card.href}`
        : `${productsUrl}${card.href || ''}`,
    }));
  }

  if (isDemoStoreDomain(businessDomain)) {
    return RESTAURANT_DEMO_SPOTLIGHT_CARDS.map((card) => ({
      ...card,
      href: `${productsUrl}${card.href}`,
    }));
  }

  const fromDb = (categories || [])
    .filter((c) => c.image_url || c.name)
    .slice(0, 4)
    .map((c) => ({
      id: c.slug || c.id,
      title: c.name,
      subtitle: c.product_count ? `${c.product_count} items` : 'Browse category',
      image: c.image_url || null,
      href: `${productsUrl}?category=${encodeURIComponent(c.slug || '')}`,
    }));

  if (fromDb.length >= 4) return fromDb;

  return RESTAURANT_DEMO_SPOTLIGHT_CARDS.map((card) => ({
    ...card,
    href: `${productsUrl}${card.href}`,
  })).slice(0, 4);
}

/**
 * @param {object} [settings]
 * @param {object[]} [products]
 * @param {string | null | undefined} businessDomain
 * @param {string | null | undefined} businessCategory
 */
export function resolveRestaurantPromoBanners(settings = {}, products = [], businessDomain, businessCategory) {
  const config = getRestaurantConfig(settings);
  return buildPromoBannersFromCatalog(
    products,
    config.promoBanners,
    RESTAURANT_DEMO_PROMO_BANNERS,
    { isDemo: isDemoStoreDomain(businessDomain), businessCategory }
  );
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} businessDomain
 */
export function resolveRestaurantTrustPillars(settings = {}, businessDomain) {
  const config = getRestaurantConfig(settings);
  if (config.trustPillars) return config.trustPillars;
  return isDemoStoreDomain(businessDomain) ? RESTAURANT_DEMO_TRUST_PILLARS : RESTAURANT_DEFAULT_TRUST_PILLARS;
}

/**
 * @param {object} [settings]
 * @param {string} storeBase
 */
export function resolveRestaurantUpperPromoTiles(settings = {}, storeBase) {
  const config = getRestaurantConfig(settings);
  const productsUrl = `${storeBase}/products`;
  const source = config.upperPromoTiles || RESTAURANT_UPPER_PROMO_TILES;
  return source.map((tile) => ({
    ...tile,
    href: tile.href?.startsWith('/')
      ? `${storeBase}${tile.href}`
      : `${productsUrl}${tile.href || ''}`,
  }));
}

/**
 * @param {object} [settings]
 * @param {string} storeBase
 * @param {{ categories?: object[] }} [ctx]
 */
export function resolveRestaurantSubNav(settings = {}, storeBase, ctx = {}) {
  const fromLinks = getRestaurantNavLinks(storeBase, ctx.categories, settings);
  if (fromLinks.length >= 2) return fromLinks;
  return RESTAURANT_DEFAULT_SUB_NAV.map((link) => ({
    ...link,
    href: `${storeBase}${link.hrefSuffix}`,
  }));
}

/**
 * Resolve accent colors — brand override or Supermeal defaults.
 * @param {object} [settings]
 */
export function resolveRestaurantTheme(settings = {}) {
  const brand = settings?.brand?.primaryColor;
  if (brand && /^#[0-9a-f]{3,6}$/i.test(String(brand))) {
    return { ...RESTAURANT_THEME, accent: brand, promoBar: brand };
  }
  return RESTAURANT_THEME;
}

function productComparePrice(p) {
  return p?.compare_price ?? p?.compare_at_price;
}

/**
 * @param {object[]} products
 */
export function partitionRestaurantProducts(products = []) {
  const inStock = (products || []).filter((p) => p.stock == null || Number(p.stock) > 0);
  const pool = inStock.length ? inStock : products;
  const onSale = pool.filter((p) => {
    const compare = productComparePrice(p);
    return compare && Number(compare) > Number(p.price);
  });
  const featured = pool.filter((p) => p.is_featured);
  const superPicks = featured.length ? featured : pool.slice(0, 8);

  return {
    superPicks,
    deals: onSale.length ? onSale : pool.filter((p) => productComparePrice(p)).slice(0, 12),
    popular: pool.slice(0, 12),
    combos: pool.filter((p) => /combo|box|feast|bundle/i.test(String(p.name || ''))),
  };
}

/** @deprecated use filterProductsByCategorySlug via filterRestaurantByCategorySlug */
export function filterRestaurantByCategorySlug(products = [], slug) {
  if (!slug) return products;
  return filterProductsByCategorySlug(products, slug);
}

// Legacy exports for demo seed scripts only
export const RESTAURANT_CUISINE_ICONS = RESTAURANT_DEMO_CUISINE_ICONS;
export const RESTAURANT_QUICK_SEARCH_TERMS = [];
export const RESTAURANT_PROMO_BANNERS = RESTAURANT_DEMO_PROMO_BANNERS;
export const RESTAURANT_TRUST_PILLARS = RESTAURANT_DEFAULT_TRUST_PILLARS;
export const RESTAURANT_CURATED_TABS = RESTAURANT_DEFAULT_CURATED_TABS;
