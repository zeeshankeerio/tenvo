/**
 * Zellbury-inspired editorial hero + navigation for clothing / fashion storefronts.
 * @see https://zellbury.com/
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { getLuxuryFashionVariant } from './luxuryFashion';
import { mergeHeroSlidesWithDefaults, sanitizeHeroSlides, resolveStorefrontHeroSlides } from './heroSlides';
import {
  buildQuickSearchTerms,
  formatElevatedStoreName,
  isDemoStoreDomain,
} from '@/lib/storefront/elevatedStorefrontTenant';
export { resolveFashionPromoBanners } from '@/lib/storefront/fashionPromoBanners';

/** Domains that use the editorial hero + transparent nav pattern (Unstitched / RTW rails). */
export const FASHION_EDITORIAL_CANONICALS = new Set([
  'boutique-fashion',
  'textile-wholesale',
  'garments',
  'leather-footwear',
]);

/** B2B mill / jewellery use luxury styling — not editorial clothing homepage sections. */
export const FASHION_EDITORIAL_EXCLUDED = new Set(['textile-mill', 'gems-jewellery']);

/**
 * @param {string | null | undefined} category
 */
export function isFashionEditorialStore(category) {
  const canonical = resolveDomainKey(category);
  if (FASHION_EDITORIAL_EXCLUDED.has(canonical)) return false;
  return FASHION_EDITORIAL_CANONICALS.has(canonical);
}

/**
 * @typedef {object} FashionEditorialConfig
 * @property {boolean} animations Section scroll-reveal + hero motion effects.
 * @property {boolean} showHeroRating Show the social-proof rating row on hero slides.
 * @property {boolean} showTopCollections Curated top-collections carousel.
 * @property {boolean} showTopPicks Featured "top picks" product row.
 * @property {boolean} showEditorialSpotlight Editorial spotlight banner.
 * @property {boolean} showUnstitched Unstitched category grid.
 * @property {boolean} showReadyToWear Ready-to-wear circle row.
 * @property {boolean} showAccessories Accessories circle row.
 * @property {boolean} showOffers Offers / sale product rail.
 * @property {boolean} showNewArrivals New arrivals product rail.
 * @property {string} unstitchedTitle
 * @property {string} readyToWearTitle
 * @property {string} accessoriesTitle
 * @property {string} offersTitle
 * @property {string} newArrivalsTitle
 * @property {string} searchPlaceholder Header / search drawer placeholder
 * @property {string} featuredRailTitle Top picks row title override
 * @property {string} featuredRailSubtitle Top picks row subtitle override
 * @property {boolean} showTrustStrip Trust pillars strip below hero
 * @property {boolean} showBrandsRow Trusted brands marquee
 * @property {boolean} showPromoBanners Split promo banner row
 * @property {boolean} showSeoBlock Expandable SEO content block
 * @property {object[] | null} trustPillars Owner trust pillar overrides
 * @property {object[] | null} promoBanners Owner promo banner overrides
 * @property {object[] | null} brands Owner brand overrides
 * @property {string[] | null} quickSearchTerms Quick search chip terms
 * @property {object[]} heroSlides Owner-uploaded hero carousel slides
 */

/**
 * Owner-configurable look-and-feel for editorial fashion / textile / clothing stores.
 * Reads `settings.storefront.fashion.*`; every section defaults to shown so
 * existing stores keep their current homepage until the owner opts out.
 * @param {object} [settings]
 * @returns {FashionEditorialConfig}
 */
export function getFashionEditorialConfig(settings = {}, businessDomain) {
  const raw = settings?.storefront?.fashion || {};
  const str = (value) => (typeof value === 'string' ? value.trim() : '');
  const isDemo = isDemoStoreDomain(businessDomain);
  return {
    animations: raw.animations !== false,
    showHeroRating: raw.showHeroRating !== false,
    showTopCollections: raw.showTopCollections !== false,
    showTopPicks: raw.showTopPicks !== false,
    showEditorialSpotlight: raw.showEditorialSpotlight !== false,
    showUnstitched: raw.showUnstitched !== false,
    showReadyToWear: raw.showReadyToWear !== false,
    showAccessories: raw.showAccessories !== false,
    showOffers: raw.showOffers !== false,
    showNewArrivals: raw.showNewArrivals !== false,
    showTrustStrip: raw.showTrustStrip !== false,
    showBrandsRow: raw.showBrandsRow !== false,
    showPromoBanners: raw.showPromoBanners !== false,
    showSeoBlock: raw.showSeoBlock !== false && (raw.showSeoBlock === true || isDemo),
    showHomeEdit: raw.showHomeEdit !== false,
    showSaleMosaic: raw.showSaleMosaic !== false,
    homeEditTitle: str(raw.homeEditTitle),
    homeEditSubtitle: str(raw.homeEditSubtitle),
    saleMosaicTitle: str(raw.saleMosaicTitle),
    homeEdit: raw.homeEdit && typeof raw.homeEdit === 'object' ? raw.homeEdit : null,
    saleMosaic: raw.saleMosaic && typeof raw.saleMosaic === 'object' ? raw.saleMosaic : null,
    unstitchedTitle: str(raw.unstitchedTitle),
    readyToWearTitle: str(raw.readyToWearTitle),
    accessoriesTitle: str(raw.accessoriesTitle),
    offersTitle: str(raw.offersTitle),
    newArrivalsTitle: str(raw.newArrivalsTitle),
    searchPlaceholder: str(raw.searchPlaceholder),
    featuredRailTitle: str(raw.featuredRailTitle),
    featuredRailSubtitle: str(raw.featuredRailSubtitle),
    trustPillars: Array.isArray(raw.trustPillars) && raw.trustPillars.length ? raw.trustPillars : null,
    promoBanners: Array.isArray(raw.promoBanners) && raw.promoBanners.length ? raw.promoBanners : null,
    brands: Array.isArray(raw.brands) && raw.brands.length ? raw.brands : null,
    quickSearchTerms: Array.isArray(raw.quickSearchTerms) && raw.quickSearchTerms.length ? raw.quickSearchTerms : null,
    heroSlides: sanitizeHeroSlides(raw.heroSlides),
  };
}

/**
 * Default editorial homepage section toggles seeded on PK clothing / textile registration.
 * Mirrors runtime defaults in {@link getFashionEditorialConfig} so new tenants ship a
 * full Zellbury-style homepage without visiting Store Settings first.
 * @returns {{ fashion: Record<string, boolean> }}
 */
export function buildDefaultFashionEditorialStorefrontSeed() {
  return {
    fashion: {
      animations: true,
      showHeroRating: true,
      showTopCollections: true,
      showTopPicks: true,
      showEditorialSpotlight: true,
      showUnstitched: true,
      showReadyToWear: true,
      showAccessories: true,
      showOffers: true,
      showNewArrivals: true,
      showTrustStrip: true,
      showBrandsRow: true,
      showPromoBanners: true,
      showSeoBlock: true,
      showHomeEdit: true,
      showSaleMosaic: true,
    },
  };
}

/**
 * Public-facing fashion store name (strips legacy "Demo" suffix).
 * @param {string | null | undefined} name
 */
export function formatFashionStoreName(name) {
  return formatElevatedStoreName(name, 'Our fashion store');
}

export const FASHION_DEFAULT_TRUST_PILLARS = [
  { id: 'quality', label: 'Premium fabrics', desc: 'Curated lawn, cotton, and pret collections' },
  { id: 'returns', label: 'Easy returns', desc: 'Hassle-free exchanges on eligible items' },
  { id: 'delivery', label: 'Nationwide delivery', desc: 'Careful packaging and tracked shipping' },
  { id: 'secure', label: 'Secure checkout', desc: 'Safe payments and order confirmation' },
];

export const FASHION_DEMO_BRANDS = [
  { id: 'khaadi', name: 'Khaadi', slug: 'khaadi' },
  { id: 'gul-ahmed', name: 'Gul Ahmed', slug: 'gul-ahmed' },
  { id: 'alkaram', name: 'Al-Karam', slug: 'al-karam' },
  { id: 'jj', name: 'Junaid Jamshed', slug: 'junaid-jamshed' },
  { id: 'sapphire', name: 'Sapphire', slug: 'sapphire' },
  { id: 'nishat', name: 'Nishat Linen', slug: 'nishat-linen' },
];

export const FASHION_DEMO_QUICK_SEARCH_TERMS = {
  boutique: ['Lawn', 'Unstitched', 'Ready to wear', 'Embroidered', 'Formal', 'Accessories'],
  textile: ['Lawn', 'Cotton', 'Khaddar', 'Unstitched', 'Bridal', 'Wholesale'],
  leather: ['Footwear', 'Bags', 'Leather', 'New arrivals', 'Sale'],
};

const FASHION_SEO_BLOCKS = {
  boutique: [
    {
      id: 'collections',
      title: 'Shop unstitched, pret, and accessories',
      body: 'Browse lawn, cotton, khaddar, and luxury pret from your favourite Pakistani brands. Filter by fabric, size, and sourcing to find the perfect outfit for every season.',
    },
    {
      id: 'quality',
      title: 'Quality you can trust',
      body: 'Every piece is sourced with care — from premium unstitched fabrics to ready-to-wear collections with refined embroidery and modern silhouettes.',
    },
  ],
  textile: [
    {
      id: 'wholesale',
      title: 'Wholesale fabrics & seasonal collections',
      body: 'Explore digital lawn, khaddar, cotton, and bridal ranges for retailers and bulk buyers. Seasonal drops with consistent quality and competitive pricing.',
    },
    {
      id: 'sourcing',
      title: 'Local & imported sourcing',
      body: 'Filter by local or imported sourcing, fabric type, and season to match your inventory needs. Trusted by boutiques and retailers across Pakistan.',
    },
  ],
};

/**
 * @param {string | null | undefined} category
 * @param {string | null | undefined} [city]
 * @param {string} [storeName]
 */
export function getFashionMetadataCopy(category, city = '', storeName = '') {
  const variant = getLuxuryFashionVariant(category) || 'boutique';
  const region = city ? ` in ${city}` : '';
  const atStore = storeName ? ` at ${storeName}` : '';
  if (variant === 'textile') {
    return {
      description: `Shop premium fabrics, lawn, cotton, and unstitched collections${atStore}${region}. Wholesale-ready textile catalog with seasonal drops and trusted quality.`,
      keywords: `textile store, lawn fabric, unstitched, wholesale fabrics, Pakistani textiles${city ? `, ${city}` : ''}`,
    };
  }
  if (variant === 'leather') {
    return {
      description: `Shop leather footwear, bags, and accessories${atStore}${region}. Crafted quality with refined details for everyday style.`,
      keywords: `leather store, footwear, bags, accessories${city ? `, ${city}` : ''}`,
    };
  }
  return {
    description: `Shop unstitched, ready-to-wear, and accessories${atStore}${region}. Premium Pakistani fashion with lawn, pret, embroidery, and seasonal collections.`,
    keywords: `online boutique, unstitched, ready to wear, lawn, pret, Pakistani fashion${city ? `, ${city}` : ''}`,
  };
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} category
 * @param {string | null | undefined} [businessDomain]
 */
export function resolveFashionSearchPlaceholder(settings = {}, category, businessDomain) {
  const config = getFashionEditorialConfig(settings, businessDomain);
  if (config.searchPlaceholder) return config.searchPlaceholder;
  const variant = getLuxuryFashionVariant(category) || 'boutique';
  if (variant === 'textile') return 'Search lawn, cotton, khaddar, unstitched…';
  if (variant === 'leather') return 'Search footwear, bags, leather goods…';
  return 'Search unstitched, pret, lawn, accessories…';
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} [businessDomain]
 */
export function resolveFashionTrustPillars(settings = {}, businessDomain) {
  const config = getFashionEditorialConfig(settings, businessDomain);
  const raw = config.trustPillars || FASHION_DEFAULT_TRUST_PILLARS;
  return (raw || [])
    .filter((pillar) => pillar && typeof pillar === 'object')
    .map((pillar) => ({
      id: pillar.id,
      label: pillar.label || pillar.title,
      desc: pillar.desc || pillar.description,
    }))
    .filter((pillar) => pillar.id && pillar.label);
}

/**
 * @param {object} [settings]
 * @param {object[]} [products]
 * @param {string | null | undefined} [businessDomain]
 */
export function resolveFashionBrands(settings = {}, products = [], businessDomain) {
  const config = getFashionEditorialConfig(settings, businessDomain);
  if (config.brands) return config.brands;
  const fromProducts = [...new Set((products || []).map((p) => p.brand).filter(Boolean))].slice(0, 12);
  if (fromProducts.length >= 2) {
    return fromProducts.map((name, i) => ({
      id: `brand-${i}`,
      name: String(name),
      slug: String(name).toLowerCase().replace(/\s+/g, '-'),
    }));
  }
  return isDemoStoreDomain(businessDomain) ? FASHION_DEMO_BRANDS : [];
}

/**
 * @param {object} [settings]
 * @param {object[]} [products]
 * @param {object[]} [categories]
 * @param {string | null | undefined} [businessCategory]
 * @param {string | null | undefined} [businessDomain]
 */
export function resolveFashionQuickSearchTerms(
  settings = {},
  products = [],
  categories = [],
  businessCategory,
  businessDomain
) {
  const config = getFashionEditorialConfig(settings, businessDomain);
  const terms = buildQuickSearchTerms(products, categories, config.quickSearchTerms, 6);
  if (terms.length) return terms;
  const variant = getLuxuryFashionVariant(businessCategory) || 'boutique';
  const demoTerms = FASHION_DEMO_QUICK_SEARCH_TERMS[variant] || FASHION_DEMO_QUICK_SEARCH_TERMS.boutique;
  return isDemoStoreDomain(businessDomain) ? demoTerms : [];
}

/**
 * @param {string} storeName
 * @param {string | null | undefined} [businessCategory]
 * @param {string} [businessDescription]
 * @param {string} [country]
 */
export function resolveFashionSeoBlocks(storeName, businessCategory, businessDescription = '', country = '') {
  const displayName = formatFashionStoreName(storeName);
  const variant = getLuxuryFashionVariant(businessCategory) || 'boutique';
  const region = country ? ` in ${country}` : '';
  const intro = String(businessDescription || '').trim();
  const blocks = FASHION_SEO_BLOCKS[variant] || FASHION_SEO_BLOCKS.boutique;
  return [
    {
      id: 'about',
      title: `${displayName}, premium fashion online${region}`,
      body: intro || `Discover unstitched fabrics, ready-to-wear pret, and accessories from ${displayName}. Shop seasonal collections with fabric filters, size guides, and secure checkout.`,
    },
    ...blocks,
  ];
}

/**
 * @typedef {object} EditorialSlide
 * @property {string} eyebrow
 * @property {string} title
 * @property {string} subtitle
 * @property {string} image
 * @property {string} ctaLabel
 * @property {string} ctaHref
 * @property {number} [rating]
 * @property {string} [ratingText]
 * @property {string} [promoTag]
 */

/**
 * @param {string} base `/store/{domain}`
 * @param {string} canonical
 * @returns {EditorialSlide[]}
 */
export function getFashionEditorialSlides(base, canonical) {
  const products = `${base}/products`;
  const variant = getLuxuryFashionVariant(canonical) || 'boutique';

  /** @type {Record<string, EditorialSlide[]>} */
  const byVariant = {
    boutique: [
      {
        eyebrow: 'Loved by 100,000+ Women',
        title: 'Ready-to-Wear, Ready to Style',
        subtitle: 'Effortless styles designed for your everyday glow, no stitching, no waiting.',
        image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Pret',
        ctaHref: `${products}?sort=newest`,
        rating: 4.8,
        ratingText: 'from 70,000+ reviews',
        promoTag: 'New arrivals',
      },
      {
        eyebrow: 'Premium Embroidery',
        title: 'Elegance in Every Stitch',
        subtitle: 'Intricate embroidery and luxurious fabrics, timeless sophistication for every occasion.',
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Discover Luxury Pret',
        ctaHref: `${products}?sort=featured`,
        rating: 4.8,
        ratingText: 'from 30,500+ luxury shoppers',
        promoTag: 'Luxury pret',
      },
      {
        eyebrow: 'Trusted by Modern Gentlemen',
        title: 'Tradition Tailored to Perfection',
        subtitle: 'Classic eastern wear redefined with modern cuts, elevated details, and unmatched comfort.',
        image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Men Eastern',
        ctaHref: `${products}?category=eastern-wear`,
        rating: 4.8,
        ratingText: 'from 100,000+ satisfied customers',
        promoTag: 'Men',
      },
      {
        eyebrow: 'Premium Fabrics, Trusted Quality',
        title: 'Your Style, Your Stitch',
        subtitle: 'Clean contrasts, premium fabrics, and effortless sophistication, tailor every look your way.',
        image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Monochrome',
        ctaHref: `${products}?category=unstitched`,
        rating: 4.9,
        ratingText: 'from 20,000+ happy customers',
        promoTag: 'Monochrome',
      },
      {
        eyebrow: 'Trusted by Modern Men',
        title: 'Built for Everyday Style',
        subtitle: 'Smart fits and effortless essentials for work, weekends, and everything in between.',
        image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Men',
        ctaHref: `${products}?category=shirts`,
        rating: 4.7,
        ratingText: 'from 10,000+ reviews',
        promoTag: 'Menswear',
      },
      {
        eyebrow: 'Loved by Stylish Moms',
        title: 'Tiny Styles, Big Smiles',
        subtitle: 'Comfortable, playful, and adorable outfits designed for every little moment.',
        image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Kids',
        ctaHref: `${products}?category=kids`,
        rating: 4.9,
        ratingText: 'from 11,000+ happy parents',
        promoTag: 'Kids',
      },
    ],
    textile: [
      {
        eyebrow: 'Premium Fabrics, Trusted Quality',
        title: 'Your Style, Your Stitch',
        subtitle: 'Clean contrasts, premium fabrics, and effortless sophistication, tailor every look your way.',
        image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Fabrics',
        ctaHref: `${products}?category=lawn`,
        rating: 4.9,
        ratingText: 'from 20,000+ happy customers',
        promoTag: 'Lawn',
      },
      {
        eyebrow: 'Wholesale excellence',
        title: 'Trending Textures & Colours',
        subtitle: 'Digital lawn, khaddar, and bridal ranges trusted by retailers nationwide.',
        image: 'https://images.unsplash.com/photo-1583292650118-0c8d2f9a9f2d?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Browse Collection',
        ctaHref: products,
        rating: 4.8,
        ratingText: 'from 15,000+ retailers',
        promoTag: 'Khaddar',
      },
    ],
    leather: [
      {
        eyebrow: 'Crafted leather',
        title: 'Step Into Quality',
        subtitle: 'Hand-finished shoes, bags, and belts, durable materials with refined details.',
        image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Footwear',
        ctaHref: `${products}?category=footwear`,
        rating: 4.7,
        ratingText: 'from 10,000+ reviews',
        promoTag: 'Footwear',
      },
      {
        eyebrow: 'New season',
        title: 'Built for Everyday Style',
        subtitle: 'Smart fits and effortless essentials for work, weekends, and everything in between.',
        image: 'https://images.unsplash.com/photo-1520639882103-d7964dc5a26a?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Leather',
        ctaHref: `${products}?category=leather`,
        rating: 4.8,
        ratingText: 'from 8,500+ shoppers',
        promoTag: 'Leather',
      },
    ],
    jewellery: [
      {
        eyebrow: 'Fine jewellery',
        title: 'Timeless Pieces, Crafted to Last',
        subtitle: 'Certified gold, diamonds, and bridal sets, hallmarked quality with insured delivery.',
        image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Gold',
        ctaHref: `${products}?category=gold`,
        rating: 4.9,
        ratingText: 'from 12,000+ buyers',
        promoTag: 'Gold',
      },
      {
        eyebrow: 'Bridal heritage',
        title: 'Celebrate Every Milestone',
        subtitle: 'Wedding sets, engagement rings, and heirloom designs for your special day.',
        image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Explore Bridal',
        ctaHref: `${products}?category=bridal`,
        rating: 4.9,
        ratingText: 'from 5,000+ bridal clients',
        promoTag: 'Bridal',
      },
    ],
  };

  return byVariant[variant] || byVariant.boutique;
}

/**
 * Resolve fashion editorial hero slides — owner uploads override template defaults.
 * @param {string} base `/store/{domain}`
 * @param {object} [settings] business_settings.settings
 * @param {{ canonical?: string; storeName?: string; coverImage?: string | null }} [ctx]
 */
export function getFashionHeroSlides(base, settings = {}, ctx = {}) {
  const canonical = ctx.canonical || 'garments';
  const defaultSlides = getFashionEditorialSlides(base, canonical);
  const slides = resolveStorefrontHeroSlides(settings, defaultSlides, {
    coverImage: ctx.coverImage,
    verticalKey: 'fashion',
  });

  return slides.map((s) => ({
    ...s,
    ctaHref: s.ctaHref?.startsWith('http')
      ? s.ctaHref
      : s.ctaHref?.startsWith('/store/')
        ? s.ctaHref
        : s.ctaHref?.startsWith('/')
          ? `${base}${s.ctaHref}`
          : s.ctaHref || `${base}/products?sort=newest`,
  }));
}

/**
 * @typedef {{ id: string; label: string; icon: string; href: string }} NavCategory
 * @typedef {{ id: string; label: string; categories: NavCategory[] }} NavTab
 */

/**
 * @param {string} base
 * @param {string} canonical
 * @param {Array<{ slug: string; name: string }>} [storeCategories]
 * @returns {{ tabs: NavTab[]; promos: Array<{ title: string; subtitle?: string; href: string; image: string }> }}
 */
export function getFashionEditorialNav(base, canonical, storeCategories = []) {
  const products = `${base}/products`;
  const slides = getFashionEditorialSlides(base, canonical);
  const promos = slides.slice(0, 2).map((s) => ({
    title: s.promoTag || s.ctaLabel,
    subtitle: s.eyebrow,
    href: s.ctaHref,
    image: s.image,
  }));

  const fromStore = storeCategories.slice(0, 8).map((c) => ({
    id: c.slug,
    label: c.name,
    icon: 'shirt',
    href: `${products}?category=${encodeURIComponent(c.slug)}`,
  }));

  if (fromStore.length >= 4) {
    return {
      promos,
      tabs: [{ id: 'shop', label: 'Shop', categories: fromStore }],
    };
  }

  const variant = getLuxuryFashionVariant(canonical) || 'boutique';

  /** @type {Record<string, NavTab[]>} */
  const presetTabs = {
    boutique: [
      {
        id: 'women',
        label: 'Women',
        categories: [
          { id: 'pret', label: 'Ready To Wear', icon: 'sparkles', href: `${products}?sort=newest` },
          { id: 'unstitched', label: 'Unstitched', icon: 'package', href: `${products}?category=unstitched` },
          { id: 'formal', label: 'Formal', icon: 'gift', href: `${products}?category=formal` },
          { id: 'accessories', label: 'Accessories', icon: 'star', href: `${products}?category=accessories` },
          { id: 'fragrance', label: 'Fragrance', icon: 'droplet', href: `${products}?category=fragrance` },
          { id: 'outerwear', label: 'Outerwear', icon: 'shirt', href: `${products}?category=outerwear` },
        ],
      },
      {
        id: 'men',
        label: 'Men',
        categories: [
          { id: 'eastern', label: 'Eastern Wear', icon: 'shirt', href: `${products}?category=eastern-wear` },
          { id: 'tees', label: 'T-Shirts', icon: 'tag', href: `${products}?category=t-shirts` },
          { id: 'shirts', label: 'Shirts', icon: 'shirt', href: `${products}?category=shirts` },
          { id: 'bottoms', label: 'Bottoms', icon: 'package', href: `${products}?category=bottoms` },
          { id: 'unstitched-m', label: 'Unstitched', icon: 'package', href: `${products}?category=unstitched` },
          { id: 'accessories-m', label: 'Accessories', icon: 'star', href: `${products}?category=accessories` },
        ],
      },
      {
        id: 'kids',
        label: 'Kids',
        categories: [
          { id: 'boys', label: 'Boys', icon: 'shirt', href: `${products}?category=boys` },
          { id: 'girls', label: 'Girls', icon: 'sparkles', href: `${products}?category=girls` },
        ],
      },
    ],
    textile: [
      {
        id: 'fabrics',
        label: 'Fabrics',
        categories: [
          { id: 'lawn', label: 'Lawn', icon: 'sparkles', href: `${products}?category=lawn` },
          { id: 'cotton', label: 'Cotton', icon: 'shirt', href: `${products}?category=cotton` },
          { id: 'khaddar', label: 'Khaddar', icon: 'package', href: `${products}?category=khaddar` },
          { id: 'bridal', label: 'Bridal', icon: 'gift', href: `${products}?category=bridal-collection` },
          { id: 'unstitched', label: 'Unstitched', icon: 'package', href: `${products}?category=unstitched` },
          { id: 'sale', label: 'Deals', icon: 'tag', href: `${products}?onSale=true` },
        ],
      },
      {
        id: 'men',
        label: 'Men',
        categories: [
          { id: 'mens-cotton', label: 'Cotton', icon: 'shirt', href: `${products}?category=cotton` },
          { id: 'mens-unstitched', label: 'Unstitched', icon: 'package', href: `${products}?category=unstitched` },
        ],
      },
      {
        id: 'women',
        label: 'Women',
        categories: [
          { id: 'w-lawn', label: 'Lawn', icon: 'sparkles', href: `${products}?category=lawn` },
          { id: 'w-bridal', label: 'Bridal', icon: 'gift', href: `${products}?category=bridal-collection` },
        ],
      },
    ],
    leather: [
      {
        id: 'shop',
        label: 'Shop',
        categories: [
          { id: 'footwear', label: 'Footwear', icon: 'shirt', href: `${products}?category=footwear` },
          { id: 'leather', label: 'Leather Goods', icon: 'package', href: `${products}?category=leather` },
          { id: 'new', label: 'New In', icon: 'sparkles', href: `${products}?sort=newest` },
          { id: 'sale', label: 'Sale', icon: 'tag', href: `${products}?onSale=true` },
        ],
      },
    ],
    jewellery: [
      {
        id: 'collections',
        label: 'Collections',
        categories: [
          { id: 'gold', label: 'Gold', icon: 'star', href: `${products}?category=gold` },
          { id: 'diamonds', label: 'Diamonds', icon: 'sparkles', href: `${products}?category=diamonds` },
          { id: 'bridal', label: 'Bridal', icon: 'gift', href: `${products}?category=bridal` },
          { id: 'gifts', label: 'Gifts', icon: 'package', href: `${products}?sort=featured` },
        ],
      },
    ],
  };

  return { tabs: presetTabs[variant] || presetTabs.boutique, promos };
}
