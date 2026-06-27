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

export const RESTAURANT_ELEVATED_CANONICALS = new Set(['restaurant-cafe']);

export const SUPERMEAL_PURPLE = '#603cba';
export const SUPERMEAL_PURPLE_DARK = '#4c2d9a';
export const SUPERMEAL_RED = '#ed0000';
export const SUPERMEAL_CREAM = '#f2f2f2';

export const RESTAURANT_ACCENTS = {
  accent: SUPERMEAL_PURPLE,
  accentDark: SUPERMEAL_PURPLE_DARK,
  accentLight: SUPERMEAL_CREAM,
  promo: SUPERMEAL_RED,
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
    showRewardsCta: raw.showRewardsCta === true || (raw.showRewardsCta === undefined && isDemo),
    showDeliveryInfo: raw.showDeliveryInfo !== false,
    heroSlides: Array.isArray(raw.heroSlides) && raw.heroSlides.length ? raw.heroSlides : null,
    cuisineIcons: Array.isArray(raw.cuisineIcons) && raw.cuisineIcons.length ? raw.cuisineIcons : null,
    promoBanners: Array.isArray(raw.promoBanners) && raw.promoBanners.length ? raw.promoBanners : null,
    orderModes: Array.isArray(raw.orderModes) && raw.orderModes.length ? raw.orderModes : null,
    trustPillars: Array.isArray(raw.trustPillars) && raw.trustPillars.length ? raw.trustPillars : null,
    curatedTabs: Array.isArray(raw.curatedTabs) && raw.curatedTabs.length ? raw.curatedTabs : null,
    quickSearchTerms: Array.isArray(raw.quickSearchTerms) && raw.quickSearchTerms.length ? raw.quickSearchTerms : null,
    featuredRailTitle: raw.featuredRailTitle || '',
    featuredRailSubtitle: raw.featuredRailSubtitle || '',
    searchPlaceholder: raw.searchPlaceholder || '',
    cateringLabel: raw.cateringLabel || 'Catering',
  };
}

/** Demo-only cuisine icons (Supermeal archive CDN). */
export const RESTAURANT_DEMO_CUISINE_ICONS = [
  { id: 'pakistani', label: 'Pakistani', slug: 'pakistani', category: 'Main Course', image: 'https://cloud.superme.al/p/pk/images/000/000/000000000_pakistani.jpg' },
  { id: 'bbq', label: 'BBQ', slug: 'bbq', category: 'Main Course', image: 'https://cloud.superme.al/p/pk/images/000/000/000000000_bbq.jpg' },
  { id: 'chinese', label: 'Chinese', slug: 'chinese', category: 'Main Course', image: 'https://cloud.superme.al/p/pk/images/000/000/000000000_chinese.jpg' },
  { id: 'italian', label: 'Italian', slug: 'italian', category: 'Main Course', image: 'https://cloud.superme.al/p/pk/images/000/000/000000000_italian.jpg' },
  { id: 'karhai', label: 'Karahi', slug: 'karhai', category: 'Main Course', image: 'https://cloud.superme.al/p/pk/images/000/000/000000000_karahi.jpg' },
  { id: 'appetizers', label: 'Starters', slug: 'appetizers', category: 'Appetizers', image: 'https://cloud.superme.al/p/pk/images/000/000/000000000_appetizers.jpg' },
  { id: 'desserts', label: 'Desserts', slug: 'desserts', category: 'Desserts', image: 'https://cloud.superme.al/p/pk/images/000/000/000000000_dessert.jpg' },
  { id: 'drinks', label: 'Drinks', slug: 'drinks', category: 'Beverages', image: 'https://cloud.superme.al/p/pk/images/000/000/000000000_drinks.jpg' },
  { id: 'deals', label: 'Deals', slug: '', category: '', hrefSuffix: '?onSale=true', image: 'https://cloud.superme.al/p/pk/images/000/141/000141855_shutterstock-2504891743.jpg' },
];

export const RESTAURANT_DEFAULT_TRUST_PILLARS = [
  { id: 'delivery', label: 'Fast delivery', desc: 'Delivery or pickup when you need it' },
  { id: 'fresh', label: 'Freshly prepared', desc: 'Made to order from our kitchen' },
  { id: 'stock', label: 'Live availability', desc: 'Stock reflects what we can fulfill now' },
  { id: 'support', label: 'Order support', desc: 'Help with orders, changes, and catering' },
];

export const RESTAURANT_DEMO_TRUST_PILLARS = [
  { id: 'delivery', label: 'Fast delivery', desc: 'Track-ready riders across the city' },
  { id: 'fresh', label: 'Freshly prepared', desc: 'Chef specials from partner kitchens' },
  { id: 'cashback', label: 'e-Cash rewards', desc: 'Earn on every qualifying order' },
  { id: 'support', label: 'Live support', desc: 'Help with orders, refunds, and catering' },
];

export const RESTAURANT_ORDER_MODES = [
  { id: 'delivery', label: 'Delivery', desc: 'Hot meals to your door', icon: 'bike' },
  { id: 'collection', label: 'Collection', desc: 'Pick up when ready', icon: 'bag' },
  { id: 'dine-in', label: 'Dine-in', desc: 'Reserve a table', icon: 'utensils' },
];

export const RESTAURANT_DEFAULT_CURATED_TABS = [
  { id: 'all', label: 'All items', slug: '' },
];

const RESTAURANT_DEMO_HERO_SLIDES = [
  {
    eyebrow: '{storeName} · Order online',
    title: 'Your favourite meals, delivered fast',
    subtitle: 'Browse full menus with prices. Delivery, collection, and dine-in.',
    image: 'https://cloud.superme.al/p/pk/images/000/141/000141867_download---2025-10-09T123101.687.jfif',
    ctaLabel: 'Order now',
    ctaHref: '/products',
  },
  {
    eyebrow: 'Featured · Hot deals',
    title: 'Chef specials and combo favourites',
    subtitle: 'Transparent pricing with items synced from your live menu.',
    image: 'https://cloud.superme.al/p/pk/images/000/141/000141855_shutterstock-2504891743.jpg',
    ctaLabel: 'View deals',
    ctaHref: '/products?onSale=true',
  },
  {
    eyebrow: 'Fresh · Fast · Local',
    title: 'Craving something delicious?',
    subtitle: 'Search by dish or category and checkout in minutes.',
    image: 'https://cloud.superme.al/p/pk/images/000/141/000141897_Burger-Hut.jpg',
    ctaLabel: 'Explore menu',
    ctaHref: '/products',
  },
];

const RESTAURANT_DEMO_PROMO_BANNERS = [
  {
    id: 'pizza',
    title: 'Wood-fired pizzas',
    subtitle: 'Classic, stuffed crust, and gourmet toppings',
    image: 'https://cloud.superme.al/p/pk/images/000/141/000141853_shutterstock-2272273435.jpg',
    href: '?search=pizza',
    tone: 'purple',
  },
  {
    id: 'bbq',
    title: 'BBQ & grills',
    subtitle: 'Mixed platters, tikka, and karahi specials',
    image: 'https://cloud.superme.al/p/pk/images/000/141/000141867_download---2025-10-09T123101.687.jfif',
    href: '?search=grill',
    tone: 'cream',
  },
  {
    id: 'deals',
    title: 'Today\'s best deals',
    subtitle: 'Combos and bundles with instant savings',
    image: 'https://cloud.superme.al/p/pk/images/000/141/000141905_shutterstock-2492633903.jpg',
    href: '?onSale=true',
    tone: 'red',
  },
];

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

  const fromDb = enrichCategoryNavImages(
    buildCategoryNavItems(ctx.categories, storeBase, { max: 11, includeDeals: true }),
    ctx.products,
    ctx.businessCategory
  ).filter((c) => c.label);

  if (fromDb.length >= 2) return fromDb;

  if (isDemoStoreDomain(ctx.businessDomain)) {
    return RESTAURANT_DEMO_CUISINE_ICONS.map((c) => ({
      ...c,
      href: c.hrefSuffix
        ? `${productsUrl}${c.hrefSuffix}`
        : c.slug
          ? `${productsUrl}?category=${encodeURIComponent(c.slug)}`
          : `${productsUrl}`,
    }));
  }

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
