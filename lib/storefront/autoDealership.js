/**
 * Vehicle dealership storefront helpers.
 * Default profile: Tenvo Vehicles template (cars + auto store).
 * Singapore VINCAR profile available via country=Singapore or settings.storefront.dealership.profile=vincar.
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import {
  isTenvoVehiclesShowroomProfile,
  isSehgalShowroomProfile,
  getShowroomNavLinks,
  getShowroomPrimaryNavLinks,
  getShowroomSecondaryNavLinks,
  getShowroomHeroSlides,
  getShowroomFooterColumns,
  SHOWROOM_BRANDS,
  SHOWROOM_BODY_TYPES,
  SHOWROOM_ENGINE_SIZES,
  SHOWROOM_PRICE_BANDS_PKR,
  SHOWROOM_POPULAR_CATEGORIES,
  SHOWROOM_ABOUT_BLOCKS,
  SEHGAL_UAN,
  SEHGAL_UAN_TEL,
} from '@/lib/storefront/dealershipShowroomProfile';
import { getDealershipConfig } from '@/lib/storefront/tenvoVehiclesTemplate';
import { TENVO_VEHICLES_ASSETS } from '@/lib/storefront/tenvoVehiclesAssets';
import { resolveDealershipBookingIntent } from '@/lib/storefront/dealershipBooking';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { resolveShowroomBrandFallback } from '@/lib/storefront/storefrontImagePlaceholders';

/** Canonical keys that receive the elevated dealership storefront treatment. */
export const AUTO_DEALERSHIP_CANONICALS = new Set(['vehicle-dealership']);

export const DEALERSHIP_GOLD = '#D4AF37';
export const DEALERSHIP_GOLD_DARK = '#B8962E';
export const DEALERSHIP_GOLD_LIGHT = '#FAF6EF';

/**
 * @param {string | null | undefined} category
 */
export function isAutoDealershipStore(category) {
  const canonical = resolveDomainKey(category);
  return AUTO_DEALERSHIP_CANONICALS.has(canonical);
}

export const DEALERSHIP_ACCENTS = {
  accent: DEALERSHIP_GOLD,
  accentDark: '#0a0a0a',
  accentLight: DEALERSHIP_GOLD_LIGHT,
};

/**
 * @param {string} base `/store/{domain}`
 */
/**
 * @param {string} base
 * @param {{ country?: string; settings?: object }} [ctx]
 */
export function getDealershipNavLinks(base, ctx = {}) {
  if (isTenvoVehiclesShowroomProfile(ctx, ctx.settings)) {
    return getShowroomNavLinks(base);
  }
  const products = `${base}/products`;
  return [
    { id: 'buy', label: 'Buy / Rent', href: products },
    { id: 'sell', label: 'Sell / Lease', href: `${base}/contact?sell=1` },
    { id: 'finance', label: 'Finance', href: `${base}/contact?finance=1` },
    { id: 'insurance', label: 'Insurance', href: `${base}/contact?insurance=1` },
    { id: 'book', label: 'Book visit', href: `${base}#book` },
    { id: 'newsroom', label: 'Newsroom', href: `${base}#newsroom` },
    { id: 'about', label: 'About Us', href: `${base}/contact` },
  ];
}

/** Primary + secondary nav for Tenvo showroom header. */
export function getDealershipNavGroups(base, ctx = {}) {
  if (isTenvoVehiclesShowroomProfile(ctx, ctx.settings)) {
    return {
      primary: getShowroomPrimaryNavLinks(base),
      secondary: getShowroomSecondaryNavLinks(base),
    };
  }
  const links = getDealershipNavLinks(base, ctx);
  return { primary: links, secondary: [] };
}

export const DEALERSHIP_INVENTORY_CATEGORIES = [
  'All Categories',
  'New Cars',
  'Pre-Owned',
  'Electric',
  'Luxury',
  'MPV',
  'SUV',
];

/** @type {Array<{ id: string; name: string; logoText: string; image: string }>} */
export const DEALERSHIP_BRAND_GRID = [
  { id: 'gac', name: 'GAC', logoText: 'GAC', image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400&q=80&auto=format&fit=crop' },
  { id: 'proton', name: 'Proton', logoText: 'PROTON', image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&q=80&auto=format&fit=crop' },
  { id: 'honda', name: 'Honda', logoText: 'HONDA', image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&q=80&auto=format&fit=crop' },
  { id: 'toyota', name: 'Toyota', logoText: 'TOYOTA', image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&q=80&auto=format&fit=crop' },
  { id: 'byd', name: 'BYD', logoText: 'BYD', image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400&q=80&auto=format&fit=crop' },
  { id: 'mercedes', name: 'Mercedes-Benz', logoText: 'MB', image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&q=80&auto=format&fit=crop' },
  { id: 'bmw', name: 'BMW', logoText: 'BMW', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&q=80&auto=format&fit=crop' },
  { id: 'audi', name: 'Audi', logoText: 'AUDI', image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&q=80&auto=format&fit=crop' },
  { id: 'porsche', name: 'Porsche', logoText: 'PORSCHE', image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80&auto=format&fit=crop' },
  { id: 'volkswagen', name: 'Volkswagen', logoText: 'VW', image: 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=400&q=80&auto=format&fit=crop' },
  { id: 'volvo', name: 'Volvo', logoText: 'VOLVO', image: 'https://images.unsplash.com/photo-1617469767053-d3b6472530de?w=400&q=80&auto=format&fit=crop' },
  { id: 'hyundai', name: 'Hyundai', logoText: 'HYUNDAI', image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&q=80&auto=format&fit=crop' },
  { id: 'mazda', name: 'Mazda', logoText: 'MAZDA', image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&q=80&auto=format&fit=crop' },
];

export const DEALERSHIP_BODY_TYPES = ['SUV', 'Sedan', 'MPV', 'Hatchback', 'Electric', 'Luxury'];
export const DEALERSHIP_FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
export const DEALERSHIP_PRICE_BANDS = [
  { id: '', label: 'Any price' },
  { id: '0-50000', label: 'Under $50k', min: 0, max: 50000 },
  { id: '50000-100000', label: '$50k - $100k', min: 50000, max: 100000 },
  { id: '100000-200000', label: '$100k - $200k', min: 100000, max: 200000 },
  { id: '200000+', label: '$200k+', min: 200000, max: null },
];

/** @type {Record<string, string[]>} */
export const DEALERSHIP_MODELS_BY_BRAND = {
  GAC: ['E9', 'Aion Y Plus', 'M8'],
  Proton: ['S70', 'X50', 'X70'],
  Honda: ['Civic', 'City', 'HR-V', 'e:N1'],
  Toyota: ['Noah', 'Corolla Cross', 'Harrier'],
  BYD: ['Atto 3', 'Seal', 'Dolphin'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'GLC'],
  BMW: ['320i', 'X3', 'iX1'],
  Audi: ['A3', 'Q3', 'Q7', 'e-tron GT'],
  Porsche: ['Cayenne', 'Macan', '911'],
  Volkswagen: ['Tiguan', 'Golf GTI', 'ID.4'],
  Volvo: ['XC40', 'XC60', 'EX30'],
  Hyundai: ['Ioniq 5', 'Tucson', 'Santa Fe'],
  Mazda: ['CX-5', 'CX-30', '3'],
  GWM: ['ORA 07', 'Haval H6'],
  'Land Rover': ['Defender', 'Range Rover Sport', 'Discovery'],
};

/**
 * @param {string} base
 * @param {{ country?: string; settings?: object }} [ctx]
 */
export function getDealershipHeroSlides(base, ctx = {}) {
  if (isTenvoVehiclesShowroomProfile(ctx, ctx.settings)) {
    return getShowroomHeroSlides(base, ctx.settings);
  }
  return [
    {
      eyebrow: 'Singapore\'s trusted automotive partner',
      title: 'Drive your dream car home today',
      subtitle: 'New, pre-owned, and electric vehicles from authorised brands, finance, leasing, and trade-in under one roof.',
      image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=85&auto=format&fit=crop',
      videoPoster: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920&q=85&auto=format&fit=crop',
      ctaLabel: 'Explore inventory',
      ctaHref: `${base}/products`,
    },
    {
      eyebrow: 'Authorised dealer network',
      title: 'Premium brands. Transparent pricing.',
      subtitle: 'GAC, Proton, Honda, Toyota and more, showroom-ready with warranty and after-sales support.',
      image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1920&q=85&auto=format&fit=crop',
      ctaLabel: 'Book test drive',
      ctaHref: `${base}/contact?testdrive=1`,
    },
    {
      eyebrow: 'Electric & hybrid lineup',
      title: 'The future is already here',
      subtitle: 'Explore BYD, GAC, and Honda e:N models with charging guidance and EV grants support.',
      image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1920&q=85&auto=format&fit=crop',
      ctaLabel: 'View EV range',
      ctaHref: `${base}/products?fuel=electric`,
    },
    {
      eyebrow: 'Certified pre-owned',
      title: 'Quality assured. Value guaranteed.',
      subtitle: 'Inspected BMW, Mercedes-Benz, and Toyota pre-owned cars with warranty options.',
      image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1920&q=85&auto=format&fit=crop',
      ctaLabel: 'Browse pre-owned',
      ctaHref: `${base}/products?condition=pre-owned`,
    },
  ];
}

/** @type {Array<{ id: string; title: string; image: string; href: string }>} */
export const DEALERSHIP_STORIES = [
  {
    id: 's1',
    title: 'GAC E9 launch day',
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80&auto=format&fit=crop',
    href: '#',
  },
  {
    id: 's2',
    title: 'Showroom walkthrough',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80&auto=format&fit=crop',
    href: '#',
  },
  {
    id: 's3',
    title: 'Customer handover',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&q=80&auto=format&fit=crop',
    href: '#',
  },
  {
    id: 's4',
    title: 'EV test drive',
    image: 'https://images.unsplash.com/photo-1619767886555-efdc259cde1a?w=600&q=80&auto=format&fit=crop',
    href: '#',
  },
  {
    id: 's5',
    title: 'Weekend showcase',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80&auto=format&fit=crop',
    href: '#',
  },
  {
    id: 's6',
    title: 'Behind the scenes',
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80&auto=format&fit=crop',
    href: '#',
  },
];

/**
 * Map price band id to min/max for product filters.
 * @param {string} bandId
 */
export function resolveDealershipPriceBand(bandId) {
  const band = DEALERSHIP_PRICE_BANDS.find((b) => b.id === bandId);
  if (!band || !band.id) return {};
  return { minPrice: band.min ?? undefined, maxPrice: band.max ?? undefined };
}

/** @type {Array<{ id: string; title: string; subtitle: string; icon: string; href: string; image: string }>} */
export function getDealershipServices(base) {
  return [
    {
      id: 'new',
      title: 'New Cars',
      subtitle: 'Latest models with factory warranty',
      icon: 'car',
      href: `${base}/products?condition=new`,
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80&auto=format&fit=crop',
    },
    {
      id: 'preowned',
      title: 'Pre-Owned Cars',
      subtitle: 'Certified used vehicles inspected end-to-end',
      icon: 'badge',
      href: `${base}/products?condition=pre-owned`,
      image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80&auto=format&fit=crop',
    },
    {
      id: 'leasing',
      title: 'Leasing & Rental',
      subtitle: 'Flexible plans for personal and fleet',
      icon: 'calendar',
      href: `${base}/contact?leasing=1`,
      image: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800&q=80&auto=format&fit=crop',
    },
    {
      id: 'insurance',
      title: 'Insurance',
      subtitle: 'Comprehensive cover arranged in-house',
      icon: 'shield',
      href: `${base}/contact?insurance=1`,
      image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80&auto=format&fit=crop',
    },
    {
      id: 'financing',
      title: 'Financing',
      subtitle: 'Competitive rates with fast approval',
      icon: 'percent',
      href: `${base}/contact?finance=1`,
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80&auto=format&fit=crop',
    },
    {
      id: 'tradein',
      title: 'Trade-In',
      subtitle: 'Value your car and upgrade seamlessly',
      icon: 'refresh',
      href: `${base}/contact?sell=1`,
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80&auto=format&fit=crop',
    },
  ];
}

/**
 * Simple monthly instalment estimate for showroom cards (7-year flat display).
 * @param {number} price
 */
export function estimateVehicleMonthlyPayment(price) {
  const p = Number(price) || 0;
  if (p <= 0) return 0;
  return Math.round((p * 1.02) / 84);
}

/**
 * Build newsroom cards from live inventory (featured first), fallback to static editorial.
 * @param {Array<Record<string, unknown>>} products
 * @param {string} base
 */
export function buildDealershipNewsroomFromProducts(products, base) {
  const all = Array.isArray(products) ? products : [];
  const picks = all.filter((p) => p.is_featured).slice(0, 4);
  const source = picks.length >= 3 ? picks : all.slice(0, 4);
  if (source.length === 0) return DEALERSHIP_NEWSROOM;

  return source.map((p, i) => {
    const slug = p.slug || p.id;
    const cond = String(p?.domain_data?.condition || '').toLowerCase();
    const label = cond === 'pre-owned' || cond === 'used' ? 'Pre-owned highlight' : 'New arrival';
    return {
      id: String(slug || `inv-${i}`),
      title: String(p.name || 'Showroom highlight'),
      excerpt: String(p.description || 'Available now at our Singapore showroom. Book a test drive today.').slice(0, 140),
      date: label,
      image: getEffectiveProductImageUrl(p, 'vehicle-dealership') || DEALERSHIP_NEWSROOM[i % DEALERSHIP_NEWSROOM.length]?.image,
      href: slug ? `${base}/products/${slug}` : `${base}/products`,
    };
  });
}

/**
 * Stories strip linked to inventory highlights.
 * @param {Array<Record<string, unknown>>} products
 * @param {string} base
 */
export function buildDealershipStoriesFromProducts(products, base) {
  const all = Array.isArray(products) ? products : [];
  const picks = all.filter((p) => p.is_featured).slice(0, 6);
  const source = picks.length >= 4 ? picks : all.slice(0, 6);
  if (source.length === 0) return DEALERSHIP_STORIES;

  return source.map((p, i) => {
    const slug = p.slug || p.id;
    const make = p?.domain_data?.vehiclemake || p.brand || '';
    const model = p?.domain_data?.vehiclemodel || '';
    return {
      id: String(slug || `story-${i}`),
      title: model ? `${make} ${model}`.trim() : String(p.name || 'Showroom'),
      image: getEffectiveProductImageUrl(p, 'vehicle-dealership') || DEALERSHIP_STORIES[i % DEALERSHIP_STORIES.length]?.image,
      href: slug ? `${base}/products/${slug}` : `${base}/products`,
    };
  });
}

/** @type {Array<{ id: string; title: string; excerpt: string; date: string; image: string; href: string }>} */
export const DEALERSHIP_NEWSROOM = [
  {
    id: 'gac-e9-launch',
    title: 'GAC E9 Electric MPV arrives in Singapore',
    excerpt: 'Seven-seat luxury EV with 700km range, bookings now open at our Alexandra showroom.',
    date: 'Mar 2026',
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80&auto=format&fit=crop',
    href: '#',
  },
  {
    id: 'proton-s70',
    title: 'Proton S70 flagship sedan preview',
    excerpt: 'Turbocharged performance meets ADAS safety, first units landing this quarter.',
    date: 'Feb 2026',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80&auto=format&fit=crop',
    href: '#',
  },
  {
    id: 'toyota-noah',
    title: 'Toyota Noah hybrid family MPV',
    excerpt: 'Spacious third-row seating with outstanding fuel economy for growing families.',
    date: 'Jan 2026',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80&auto=format&fit=crop',
    href: '#',
  },
  {
    id: 'ev-showcase',
    title: 'Electric vehicle showcase weekend',
    excerpt: 'Test drive BYD, GAC, and Honda e:N models, specialists on hand for charging & grants.',
    date: 'Dec 2025',
    image: 'https://images.unsplash.com/photo-1619767886555-efdc259cde1a?w=800&q=80&auto=format&fit=crop',
    href: '#',
  },
];

/** @type {Array<{ id: string; quote: string; author: string; vehicle: string; image: string }>} */
export const DEALERSHIP_TESTIMONIALS = [
  {
    id: 't1',
    quote: 'Seamless purchase from test drive to registration. The team explained every finance option clearly.',
    author: 'Marcus T.',
    vehicle: 'Toyota Noah Hybrid',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop',
  },
  {
    id: 't2',
    quote: 'Traded in my old sedan and drove home in a GAC E9 the same week. Outstanding service.',
    author: 'Priya S.',
    vehicle: 'GAC E9 Electric',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format&fit=crop',
  },
  {
    id: 't3',
    quote: 'Pre-owned BMW was immaculate, full inspection report and warranty gave us total confidence.',
    author: 'Daniel L.',
    vehicle: 'BMW 320i M Sport',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80&auto=format&fit=crop',
  },
];

/**
 * Split products into new vs pre-owned using domain_data.condition or category slug.
 * @param {Array<{ domain_data?: { condition?: string }; category?: string; category_slug?: string }>} products
 */
export function partitionDealershipInventory(products) {
  const all = Array.isArray(products) ? products : [];
  const isPreOwned = (p) => {
    const cond = String(p?.domain_data?.condition || '').toLowerCase();
    if (cond === 'pre-owned' || cond === 'preowned' || cond === 'used') return true;
    const cat = String(p?.category_slug || p?.category || '').toLowerCase();
    return /pre-?owned|used|certified/.test(cat);
  };
  const preOwned = all.filter(isPreOwned);
  const newCars = all.filter((p) => !isPreOwned(p));
  return { newCars, preOwned };
}

/**
 * Profile-aware dealership config for homepage sections.
 * @param {{ country?: string; settings?: object }} [business]
 */
export function getDealershipStorefrontConfig(business = {}) {
  const settings = business.settings || {};
  const tenvo = isTenvoVehiclesShowroomProfile(business, settings);
  const templateCfg = getDealershipConfig(settings);
  const brandAssets = TENVO_VEHICLES_ASSETS.brands;
  return {
    profile: tenvo ? 'tenvo-vehicles' : 'vincar',
    brands: tenvo
      ? SHOWROOM_BRANDS.map((b) => {
          const primary = brandAssets[b.id] || brandAssets.toyota;
          return {
            ...b,
            image: primary,
            imageFallback: resolveShowroomBrandFallback(b.id),
          };
        })
      : DEALERSHIP_BRAND_GRID,
    bodyTypes: tenvo ? SHOWROOM_BODY_TYPES : DEALERSHIP_BODY_TYPES.map((b) => ({ id: b.toLowerCase(), label: b, filter: b })),
    engineSizes: tenvo ? SHOWROOM_ENGINE_SIZES : [],
    priceBands: tenvo ? SHOWROOM_PRICE_BANDS_PKR : DEALERSHIP_PRICE_BANDS,
    popularCategories: tenvo ? SHOWROOM_POPULAR_CATEGORIES : [],
    aboutBlocks: templateCfg.aboutBlocks?.length ? templateCfg.aboutBlocks : tenvo ? SHOWROOM_ABOUT_BLOCKS : [],
    uan: templateCfg.uan || (tenvo ? SEHGAL_UAN : null),
    uanTel: templateCfg.uanTel || (tenvo ? SEHGAL_UAN_TEL : null),
    tagline: templateCfg.tagline || (tenvo
      ? 'A tradition of car quality since 1979'
      : 'Singapore\'s trusted automotive partner'),
    welcomeTitle: templateCfg.welcomeTitle || (tenvo
      ? 'Welcome to your ultimate car destination'
      : 'Welcome to Your Ultimate Car Destination in Singapore'),
    showTrustStrip: templateCfg.showTrustStrip,
    showMarketingBanners: templateCfg.showMarketingBanners,
    trustStrip: templateCfg.trustStrip,
    videoUrl: templateCfg.videoUrl,
  };
}

/**
 * @param {string} base
 * @param {{ country?: string; settings?: object }} [ctx]
 */
export function getDealershipFooterColumns(base, ctx = {}) {
  if (isTenvoVehiclesShowroomProfile(ctx, ctx.settings)) {
    return getShowroomFooterColumns(base);
  }
  const products = `${base}/products`;
  return [
    {
      title: 'Services',
      links: [
        { label: 'New Cars', href: `${products}?condition=new` },
        { label: 'Pre-Owned', href: `${products}?condition=pre-owned` },
        { label: 'Financing', href: `${base}/contact?finance=1` },
        { label: 'Leasing', href: `${base}/contact?leasing=1` },
        { label: 'Insurance', href: `${base}/contact?insurance=1` },
        { label: 'Trade-In', href: `${base}/contact?sell=1` },
      ],
    },
    {
      title: 'Quick Links',
      links: [
        { label: 'Book Test Drive', href: `${base}/contact?testdrive=1` },
        { label: 'Value My Car', href: `${base}/contact?sell=1` },
        { label: 'All Inventory', href: products },
        { label: 'Newsroom', href: `${base}#newsroom` },
        { label: 'Contact', href: `${base}/contact` },
      ],
    },
    {
      title: 'About Us',
      links: [
        { label: 'Our Showrooms', href: `${base}/contact` },
        { label: 'Careers', href: `${base}/contact` },
        { label: 'Book Test Drive', href: `${base}/contact?testdrive=1` },
        { label: 'Newsroom', href: `${base}#newsroom` },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: `${base}/privacy` },
        { label: 'Terms of Use', href: `${base}/terms` },
      ],
    },
  ];
}

/** VINCAR Singapore contact intents */
export const VINCAR_CONTACT_INTENTS = {
  testdrive: {
    subject: 'testdrive',
    title: 'Schedule a test drive',
    subtitle: 'Pick a date and tell us which model you would like to experience at our showroom.',
    messagePlaceholder: 'Preferred showroom (Alexandra or Leng Kee), preferred time, and any special requests.',
  },
  sell: {
    subject: 'sell',
    title: 'Value my car',
    subtitle: 'Share your vehicle details for a trade-in or sell valuation from our team.',
    messagePlaceholder: 'Make, model, year, mileage, and condition of your vehicle.',
  },
  finance: {
    subject: 'finance',
    title: 'Finance inquiry',
    subtitle: 'Get competitive rates and fast approval options for your next car.',
    messagePlaceholder: 'Vehicle of interest, loan amount, and preferred tenure.',
  },
  leasing: {
    subject: 'leasing',
    title: 'Leasing inquiry',
    subtitle: 'Flexible personal and fleet leasing plans tailored to your needs.',
    messagePlaceholder: 'Vehicle type, lease duration, and estimated monthly budget.',
  },
  insurance: {
    subject: 'insurance',
    title: 'Insurance inquiry',
    subtitle: 'Comprehensive cover arranged in-house with competitive premiums.',
    messagePlaceholder: 'Vehicle details and current policy expiry if applicable.',
  },
  buy: {
    subject: 'buy',
    title: 'Buy inquiry',
    subtitle: 'Tell us which vehicle you are interested in and we will get back to you.',
    messagePlaceholder: 'Model, colour preference, and timeline to purchase.',
  },
};

/** @deprecated Use getDealershipBookingIntents from dealershipBooking.js */
export const DEALERSHIP_CONTACT_INTENTS = {};

/**
 * @param {URLSearchParams | { get: (k: string) => string | null }} searchParams
 * @param {{ country?: string; settings?: object }} [business]
 */
export function resolveDealershipContactIntent(searchParams, business = {}) {
  return resolveDealershipBookingIntent(searchParams, business, business.settings);
}

const VEHICLE_CATEGORY_RE = /^(all cars|new cars|pre-?owned|used cars|luxury|imported|bikes|suv|mpv|electric)$/i;
const ACCESSORY_CATEGORY_RE = /auto store|car care|led|modification|interior|exterior|gadget|music|security|utility|perfume|mobile|car mats|ppf|conversion|window film/i;

/**
 * @param {Array<Record<string, unknown>>} products
 */
export function isShowroomVehicleProduct(product) {
  const cat = String(product?.category || '').trim();
  if (VEHICLE_CATEGORY_RE.test(cat)) return true;
  if (ACCESSORY_CATEGORY_RE.test(cat)) return false;
  return Boolean(product?.domain_data?.bodytype || product?.domain_data?.vehiclemake);
}

/**
 * Full showroom catalog partition (Sehgal-style homepage sections).
 * @param {Array<Record<string, unknown>>} products
 */
export function partitionShowroomCatalog(products) {
  const all = Array.isArray(products) ? products : [];
  const vehicles = all.filter(isShowroomVehicleProduct);
  const accessories = all.filter((p) => !isShowroomVehicleProduct(p));

  const isPreOwned = (p) => {
    const cond = String(p?.domain_data?.condition || '').toLowerCase();
    if (cond === 'pre-owned' || cond === 'preowned' || cond === 'used') return true;
    const cat = String(p?.category || '').toLowerCase();
    return /pre-?owned|used/.test(cat);
  };

  const catIncludes = (p, kw) => String(p?.category || '').toLowerCase().includes(kw);

  return {
    all,
    vehicles,
    accessories,
    bikes: vehicles.filter((p) => catIncludes(p, 'bike')),
    newCars: vehicles.filter((p) => !isPreOwned(p) && (catIncludes(p, 'new') || String(p?.domain_data?.condition || '').toLowerCase() === 'new')),
    preOwned: vehicles.filter(isPreOwned),
    luxury: vehicles.filter((p) => catIncludes(p, 'luxury') || String(p?.domain_data?.bodytype || '').toLowerCase().includes('luxury')),
    imported: vehicles.filter((p) => catIncludes(p, 'imported')),
    bestSellers: accessories.filter((p) => p.is_featured).length >= 4
      ? accessories.filter((p) => p.is_featured)
      : accessories.slice(0, 10),
    recentlyAdded: vehicles.filter((p) => p.is_featured).length >= 3
      ? vehicles.filter((p) => p.is_featured).slice(0, 8)
      : vehicles.slice(0, 8),
    onSale: all.filter((p) => {
      const price = Number(p.price) || 0;
      const compare = Number(p.compare_price) || 0;
      return compare > price;
    }),
  };
}

export { isTenvoVehiclesShowroomProfile, isSehgalShowroomProfile, SEHGAL_UAN, SEHGAL_UAN_TEL };
