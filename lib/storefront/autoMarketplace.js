/**
 * Automotive marketplace portal helpers (Tenvo Auto Marketplace template).
 * Distinct from `vehicle-dealership` (single-brand showroom) and `auto-parts` (parts finder).
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { fillProductRailItems } from '@/lib/utils/storefrontProductRail.js';

export const AUTO_MARKETPLACE_CANONICALS = new Set(['auto-marketplace']);

/** Marketplace portal palette */
export const MARKETPLACE_RED = '#E30613';
export const MARKETPLACE_BLUE = '#003DA5';
export const MARKETPLACE_RED_LIGHT = '#FFF0F0';
export const MARKETPLACE_BLUE_LIGHT = '#E8EEF8';

/**
 * @param {string | null | undefined} category
 */
export function isAutoMarketplaceStore(category) {
  return AUTO_MARKETPLACE_CANONICALS.has(resolveDomainKey(category));
}

export const MARKETPLACE_ACCENTS = {
  accent: MARKETPLACE_RED,
  accentDark: MARKETPLACE_BLUE,
  accentLight: MARKETPLACE_RED_LIGHT,
  secondary: MARKETPLACE_BLUE,
};

/**
 * Owner-configurable overrides via `settings.storefront.marketplace`.
 * @param {object} [settings]
 */
export function getMarketplaceConfig(settings = {}) {
  const raw = settings?.storefront?.marketplace || {};
  return {
    heroPromo: {
      eyebrow: raw.heroPromo?.eyebrow || 'Tenvo Auto Marketplace',
      title: raw.heroPromo?.title || 'Your next car, one trusted Tenvo portal',
      subtitle:
        raw.heroPromo?.subtitle ||
        'Search new, used, and rental listings, shop parts, and capture leads from a storefront wired to your Tenvo hub.',
      ctaLabel: raw.heroPromo?.ctaLabel || 'Explore listings',
      ctaHref: raw.heroPromo?.ctaHref || null,
      image:
        raw.heroPromo?.image ||
        'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=85&auto=format&fit=crop',
    },
    coeTicker: {
      label: raw.coeTicker?.label || 'Live demo stock',
      value: raw.coeTicker?.value || '120+ listings',
      change: raw.coeTicker?.change || 'Updated daily',
      href: raw.coeTicker?.href || null,
    },
    showForum: raw.showForum !== false,
    showArticles: raw.showArticles !== false,
    showEShop: raw.showEShop !== false,
    showMarketingBanners: raw.showMarketingBanners !== false,
    showTrustStrip: raw.showTrustStrip !== false,
  };
}

/**
 * @param {string} base `/store/{domain}`
 */
export function getMarketplaceNavLinks(base) {
  const products = `${base}/products`;
  return [
    { id: 'new', label: 'New', href: `${products}?condition=new` },
    { id: 'used', label: 'Used', href: `${products}?condition=pre-owned` },
    { id: 'rental', label: 'Rental', href: `${products}?condition=rental` },
    { id: 'lease', label: 'Lease', href: `${base}/contact?leasing=1` },
    { id: 'sell', label: 'Sell', href: `${base}/contact?sell=1` },
    { id: 'buy', label: 'Buy', href: products },
    { id: 'articles', label: 'Articles', href: `${base}#articles` },
    { id: 'forum', label: 'Forum', href: `${base}#forum` },
    { id: 'eshop', label: 'E-Shop', href: `${base}#eshop` },
    { id: 'resources', label: 'Resources', href: `${base}#resources` },
    { id: 'directory', label: 'Directory', href: `${base}/contact?directory=1` },
    { id: 'parts', label: 'Parts', href: `${products}?category=parts-accessories` },
  ];
}

/** Popular brands for grid + filter dropdowns */
export const MARKETPLACE_POPULAR_BRANDS = [
  { id: 'toyota', name: 'Toyota', logoText: 'T', image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&q=80&auto=format&fit=crop' },
  { id: 'honda', name: 'Honda', logoText: 'H', image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&q=80&auto=format&fit=crop' },
  { id: 'bmw', name: 'BMW', logoText: 'BMW', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&q=80&auto=format&fit=crop' },
  { id: 'mercedes', name: 'Mercedes-Benz', logoText: 'MB', image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&q=80&auto=format&fit=crop' },
  { id: 'byd', name: 'BYD', logoText: 'BYD', image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400&q=80&auto=format&fit=crop' },
  { id: 'tesla', name: 'Tesla', logoText: 'TSLA', image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&q=80&auto=format&fit=crop' },
  { id: 'hyundai', name: 'Hyundai', logoText: 'H', image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&q=80&auto=format&fit=crop' },
  { id: 'mazda', name: 'Mazda', logoText: 'M', image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&q=80&auto=format&fit=crop' },
  { id: 'audi', name: 'Audi', logoText: 'AUDI', image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&q=80&auto=format&fit=crop' },
  { id: 'porsche', name: 'Porsche', logoText: 'P', image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80&auto=format&fit=crop' },
  { id: 'kia', name: 'Kia', logoText: 'KIA', image: 'https://images.unsplash.com/photo-1619767886555-efdc259cde1a?w=400&q=80&auto=format&fit=crop' },
  { id: 'nissan', name: 'Nissan', logoText: 'N', image: 'https://images.unsplash.com/photo-1494976388531-d1058498cdd8?w=400&q=80&auto=format&fit=crop' },
];

export const MARKETPLACE_ALL_BRANDS = [
  ...MARKETPLACE_POPULAR_BRANDS,
  { id: 'volkswagen', name: 'Volkswagen', logoText: 'VW', image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&q=80&auto=format&fit=crop' },
  { id: 'lexus', name: 'Lexus', logoText: 'L', image: 'https://images.unsplash.com/photo-1617814076665-75e412d1d0cd?w=400&q=80&auto=format&fit=crop' },
  { id: 'subaru', name: 'Subaru', logoText: 'S', image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&q=80&auto=format&fit=crop' },
  { id: 'mg', name: 'MG', logoText: 'MG', image: 'https://images.unsplash.com/photo-1619767886555-efdc259cde1a?w=400&q=80&auto=format&fit=crop' },
  { id: 'volvo', name: 'Volvo', logoText: 'V', image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&q=80&auto=format&fit=crop' },
];

export const MARKETPLACE_BODY_TYPES = ['SUV', 'Sedan', 'MPV', 'Hatchback', 'Luxury', 'Sports', 'Stationwagon', 'Electric', 'Hybrid'];
export const MARKETPLACE_FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Plug-in Hybrid'];
export const MARKETPLACE_PRICE_BANDS = [
  { label: 'Under $50k', min: 0, max: 50000 },
  { label: '$50k - $100k', min: 50000, max: 100000 },
  { label: '$100k - $200k', min: 100000, max: 200000 },
  { label: '$200k+', min: 200000, max: null },
];

export const MARKETPLACE_USED_QUICK_LINKS = [
  { id: 'direct-owner', label: 'Direct Owner Sale', hrefSuffix: '?condition=pre-owned&source=owner' },
  { id: 'consignment', label: 'Owner Consignment', hrefSuffix: '?condition=pre-owned&source=consignment' },
  { id: 'auction', label: 'Auction', hrefSuffix: '?condition=pre-owned&source=auction' },
  { id: 'dealers', label: 'Dealers', hrefSuffix: '?condition=pre-owned&source=dealer' },
  { id: 'parallel', label: 'Parallel Importers', hrefSuffix: '?condition=pre-owned&source=parallel' },
];

export const MARKETPLACE_ESHOP_CATEGORIES = [
  { id: 'tyres', label: 'Tyres', icon: 'circle', slug: 'tyres' },
  { id: 'grooming', label: 'Car Grooming', icon: 'sparkles', slug: 'car-grooming' },
  { id: 'batteries', label: 'Batteries', icon: 'battery', slug: 'batteries' },
  { id: 'wipers', label: 'Wipers', icon: 'wiper', slug: 'wipers' },
  { id: 'audio', label: 'Audio', icon: 'speaker', slug: 'audio' },
  { id: 'oils', label: 'Engine Oil', icon: 'droplet', slug: 'engine-oil' },
];

/** @type {Array<{ id: string; title: string; subtitle: string; icon: string; href: string }>} */
export function getMarketplaceResources(base) {
  return [
    { id: 'insurance', title: 'Insurance', subtitle: 'Get the best car insurance in 3 easy steps', icon: 'shield', href: `${base}/contact?insurance=1` },
    { id: 'loan', title: 'Car Loan', subtitle: 'Compare rates and get fast approval', icon: 'percent', href: `${base}/contact?finance=1` },
    { id: 'leasing', title: 'Car Leasing', subtitle: 'Best monthly rates for your next car', icon: 'calendar', href: `${base}/contact?leasing=1` },
    { id: 'coe', title: 'Latest COE Result', subtitle: 'Check out the latest COE bidding results', icon: 'chart', href: `${base}#resources` },
    { id: 'valuation', title: 'Free Car Valuation', subtitle: 'Get the true value of your car today', icon: 'gauge', href: `${base}/contact?sell=1` },
    { id: 'tyres', title: 'Buy Tyres Online', subtitle: 'Replace your tyres in 4 easy steps', icon: 'circle', href: `${base}/products?category=tyres` },
  ];
}

export const MARKETPLACE_UTILITY_ICONS = [
  { id: 'garage', label: 'My Garage', hrefSuffix: '/contact?garage=1' },
  { id: 'valuation', label: 'Valuation', hrefSuffix: '/contact?sell=1' },
  { id: 'roadtax', label: 'Road Tax', hrefSuffix: '/contact?roadtax=1' },
  { id: 'coe-history', label: 'COE History', hrefSuffix: '#resources' },
  { id: 'parking', label: 'Parking', hrefSuffix: '/contact?parking=1' },
  { id: 'petrol', label: 'Petrol', hrefSuffix: '/contact?petrol=1' },
];

/** @type {Array<{ id: string; title: string; excerpt: string; date: string; image: string; href: string }>} */
export const MARKETPLACE_ARTICLES = [
  {
    id: 'bmw-ix3',
    title: 'BMW iX3: Impressive All-Rounder',
    excerpt: 'The BMW iX3 delivers a pleasing drive experience, is this the premium compact SUV to get?',
    date: 'Mar 2026',
    image: 'https://images.unsplash.com/photo-1617814076665-75e412d1d0cd?w=800&q=80&auto=format&fit=crop',
    href: '#',
  },
  {
    id: 'coe-analysis',
    title: 'COE Analysis: Is Real Change On Its Way?',
    excerpt: 'COE premiums were lower on average in Q1 2026, but industry shifts continue.',
    date: 'Mar 2026',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80&auto=format&fit=crop',
    href: '#',
  },
  {
    id: 'denza-b5',
    title: 'DENZA B5: Big Is Best',
    excerpt: 'Tough and rugged outside, high comfort within, our first drive review.',
    date: 'Feb 2026',
    image: 'https://images.unsplash.com/photo-1619767886555-efdc259cde1a?w=800&q=80&auto=format&fit=crop',
    href: '#',
  },
  {
    id: 'tyre-guide',
    title: 'Fuel-Saving Tyres For Your Daily Drives',
    excerpt: 'With fuel prices on the rise, consider these fuel-saving tyre options.',
    date: 'Feb 2026',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80&auto=format&fit=crop',
    href: '#',
  },
];

export const MARKETPLACE_PROMOTIONS = [
  {
    id: 'honda-wrv',
    title: "Honda WR-V Vin's Auto Edition",
    subtitle: 'Ready stocks, immediate delivery, while stocks last!',
    image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&q=80&auto=format&fit=crop',
    href: '#',
    badge: 'Limited',
  },
  {
    id: 'byd-promo',
    title: 'BYD Sealion 7 Launch Promo',
    subtitle: 'Exclusive launch pricing on selected electric SUVs.',
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80&auto=format&fit=crop',
    href: '#',
    badge: 'EV',
  },
  {
    id: 'tyre-bundle',
    title: 'Tyre + Alignment Bundle',
    subtitle: 'Save up to 15% on selected tyre brands this month.',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80&auto=format&fit=crop',
    href: '#',
    badge: 'e-Shop',
  },
  {
    id: 'proton-ema5',
    title: 'Proton e.MAS 5 Early Bird',
    subtitle: 'Electric hatch with extended range from authorised dealers.',
    image: 'https://images.unsplash.com/photo-1619767886555-efdc259cde1a?w=800&q=80&auto=format&fit=crop',
    href: '#',
    badge: 'New',
  },
  {
    id: 'toyota-noah',
    title: 'Toyota Noah Hybrid MYCAR Edition',
    subtitle: 'Family MPV with captain seats and hybrid efficiency.',
    image: 'https://images.unsplash.com/photo-1544639917-a0f146b8456b?w=800&q=80&auto=format&fit=crop',
    href: '#',
    badge: 'MPV',
  },
  {
    id: 'dealer-rebate',
    title: 'Dealer rebate event',
    subtitle: 'Stack dealer rebates with exclusive portal pricing this month.',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80&auto=format&fit=crop',
    href: '#',
    badge: 'Deal',
  },
];

/** Hero-overlap marketing tiles (6-card grid). */
export const MARKETPLACE_MARKETING_BANNERS = [
  {
    id: 'new-cars',
    title: 'New car launches',
    subtitle: 'Latest models from authorised distributors',
    badge: 'New',
    image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1200&q=85&auto=format&fit=crop',
    hrefSuffix: '?condition=new',
  },
  {
    id: 'used-deals',
    title: 'Used car deals',
    subtitle: 'Direct owner, consignment, and dealer listings',
    badge: 'Used',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=85&auto=format&fit=crop',
    hrefSuffix: '?condition=pre-owned',
  },
  {
    id: 'rental-plans',
    title: 'Rental & lease',
    subtitle: 'Daily, weekly, and monthly plans from $88/day',
    badge: 'Rental',
    image: 'https://images.unsplash.com/photo-1517048676732-2162716b9996?w=1200&q=85&auto=format&fit=crop',
    hrefSuffix: '?condition=rental',
  },
  {
    id: 'electric',
    title: 'Electric & hybrid',
    subtitle: 'BYD, Tesla, Proton, and more EV picks',
    badge: 'EV',
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200&q=85&auto=format&fit=crop',
    hrefSuffix: '?fuel=electric',
  },
  {
    id: 'eshop',
    title: 'e-Shop accessories',
    subtitle: 'Tyres, batteries, grooming, and car care',
    badge: 'Shop',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1200&q=85&auto=format&fit=crop',
    hrefSuffix: '?category=tyres',
  },
  {
    id: 'valuation',
    title: 'Free car valuation',
    subtitle: 'Sell or trade-in with confidence',
    badge: 'Free',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&q=85&auto=format&fit=crop',
    hrefSuffix: '/contact?sell=1',
  },
];

/**
 * @param {string} base `/store/{domain}`
 * @param {object} [settings]
 */
export function getMarketplaceMarketingBanners(base, settings = {}) {
  const custom = settings?.storefront?.marketplace?.banners;
  const list = Array.isArray(custom) && custom.length ? custom : MARKETPLACE_MARKETING_BANNERS;
  const products = `${base}/products`;
  return list.map((b) => ({
    ...b,
    href: b.href || (b.hrefSuffix?.startsWith('/')
      ? `${base}${b.hrefSuffix}`
      : `${products}${b.hrefSuffix || ''}`),
  }));
}

export const MARKETPLACE_FORUM_TOPICS = [
  { id: 'f1', title: 'First drive: Maxus MIFA 7 Elite', replies: 42, href: '#' },
  { id: 'f2', title: 'Best run-flat tyres for daily drives?', replies: 128, href: '#' },
  { id: 'f3', title: 'Renew vs buy used: what worked for you?', replies: 89, href: '#' },
];

export const MARKETPLACE_BLOG_POSTS = [
  { id: 'b1', title: 'Tenvo marketplace demo: what owners can configure', date: 'Jun 2026', href: '#' },
  { id: 'b2', title: 'Electric vs hybrid: which suits your commute?', date: 'May 2026', href: '#' },
  { id: 'b3', title: 'Workshop spotlight: Mirage Motorwerkz', date: 'Apr 2026', href: '#' },
];

/**
 * @param {string} base
 * @param {object} [settings]
 */
export function getMarketplaceHeroSlides(base, settings = {}) {
  const cfg = getMarketplaceConfig(settings);
  const promo = cfg.heroPromo;
  return [
    {
      eyebrow: promo.eyebrow,
      title: promo.title,
      subtitle: promo.subtitle,
      image: promo.image,
      ctaLabel: promo.ctaLabel,
      ctaHref: promo.ctaHref || `${base}/products`,
    },
    {
      eyebrow: 'New car launches',
      title: 'Latest models from authorised distributors',
      subtitle: 'BYD, Toyota, Honda, Mercedes-Benz and more, compare specs and promotions.',
      image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1920&q=85&auto=format&fit=crop',
      ctaLabel: 'Browse new cars',
      ctaHref: `${base}/products?condition=new`,
      cinematic: true,
    },
  ];
}

/**
 * @param {Array<{ domain_data?: { condition?: string }; category?: string; category_slug?: string; price?: number }>} products
 */
export function partitionMarketplaceInventory(products) {
  const all = Array.isArray(products) ? products : [];
  const isPart = (p) => {
    const cat = String(p?.category_slug || p?.category || '').toLowerCase();
    return /parts|accessories|tyre|tire|battery|wiper|oil|grooming|eshop/.test(cat);
  };
  const cond = (p) => String(p?.domain_data?.condition || '').toLowerCase();
  const isRental = (p) => cond(p) === 'rental' || /rental/.test(String(p?.category_slug || p?.category || '').toLowerCase());
  const isPreOwned = (p) => {
    const c = cond(p);
    if (c === 'pre-owned' || c === 'preowned' || c === 'used') return true;
    const cat = String(p?.category_slug || p?.category || '').toLowerCase();
    return /pre-?owned|used/.test(cat);
  };
  const partsRaw = all.filter(isPart);
  const parts = fillProductRailItems(partsRaw, all, 6, 12);
  const rentalRaw = all.filter((p) => !isPart(p) && isRental(p));
  const rental = fillProductRailItems(rentalRaw, all.filter((p) => !isPart(p)), 4, 8);
  const used = all.filter((p) => !isPart(p) && !isRental(p) && isPreOwned(p));
  const newCars = all.filter((p) => !isPart(p) && !isRental(p) && !isPreOwned(p));
  return { newCars, used, rental, parts };
}

/**
 * @param {string} base
 */
export function getMarketplaceFooterColumns(base) {
  const products = `${base}/products`;
  return [
    {
      title: 'Products & Services',
      links: [
        { label: 'New Cars', href: `${products}?condition=new` },
        { label: 'Used Cars', href: `${products}?condition=pre-owned` },
        { label: 'Electric Cars', href: `${products}?fuel=electric` },
        { label: 'Hybrid Cars', href: `${products}?fuel=hybrid` },
        { label: 'Car Loan', href: `${base}/contact?finance=1` },
        { label: 'Rental Cars', href: `${products}?condition=rental` },
        { label: 'Sell Cars', href: `${base}/contact?sell=1` },
        { label: 'Articles', href: `${base}#articles` },
        { label: 'Forum', href: `${base}#forum` },
        { label: 'Resources', href: `${base}#resources` },
      ],
    },
    {
      title: 'For Owners',
      links: [
        { label: 'e-Shop', href: `${base}#eshop` },
        { label: 'Workshop', href: `${base}/contact?directory=1` },
        { label: 'Products', href: products },
        { label: 'Insurance', href: `${base}/contact?insurance=1` },
        { label: 'Events', href: `${base}/contact` },
      ],
    },
    {
      title: 'Quick Links',
      links: [
        { label: 'Carpark Rates', href: `${base}/contact?parking=1` },
        { label: 'COE Prices', href: `${base}#resources` },
        { label: 'Loan Calculator', href: `${base}/contact?finance=1` },
        { label: 'Car Reviews', href: `${base}#articles` },
        { label: 'Car Advice', href: `${base}#articles` },
      ],
    },
    {
      title: 'About',
      links: [
        { label: 'About Us', href: `${base}/contact` },
        { label: 'Contact Us', href: `${base}/contact` },
        { label: 'Careers', href: `${base}/contact` },
        { label: 'Site Map', href: `${base}` },
        { label: 'Report Error', href: `${base}/contact` },
      ],
    },
  ];
}
