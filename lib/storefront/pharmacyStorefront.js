/**
 * DVAGO-inspired pharmacy storefront helpers — tenant-aware with demo-only defaults.
 * Isolated to canonical `pharmacy` — does not affect dental, vet, or generic retail.
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import {
  formatElevatedStoreName,
  buildCategoryNavItems,
  buildQuickSearchTerms,
  buildPromoBannersFromCatalog,
  buildTenantHeroSlides,
  enrichCategoryNavImages,
  isDemoStoreDomain,
} from '@/lib/storefront/elevatedStorefrontTenant';

export const PHARMACY_ELEVATED_CANONICALS = new Set(['pharmacy']);

export const PHARMACY_GREEN = '#16a34a';
export const PHARMACY_GREEN_DARK = '#15803d';
export const PHARMACY_GREEN_LIGHT = '#f0fdf4';

export const PHARMACY_ACCENTS = {
  accent: PHARMACY_GREEN,
  accentDark: PHARMACY_GREEN_DARK,
  accentLight: PHARMACY_GREEN_LIGHT,
};

/**
 * @param {string | null | undefined} category
 */
export function isPharmacyElevatedStore(category) {
  return PHARMACY_ELEVATED_CANONICALS.has(resolveDomainKey(category));
}

/**
 * Public-facing pharmacy store name (strips legacy "Demo" suffix).
 * @param {string | null | undefined} name
 */
export function formatPharmacyStoreName(name) {
  return formatElevatedStoreName(name, 'Our pharmacy');
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} [businessDomain]
 */
export function getPharmacyConfig(settings = {}, businessDomain) {
  const raw = settings?.storefront?.pharmacy || {};
  const isDemo = isDemoStoreDomain(businessDomain);
  return {
    locationLabel: raw.locationLabel || 'Deliver to',
    defaultLocation: raw.defaultLocation || '',
    searchPlaceholder: raw.searchPlaceholder || 'Search medicines, vitamins, brands…',
    showRefillPromo: raw.showRefillPromo !== false,
    showBrandsRow: raw.showBrandsRow !== false,
    showSeoBlock: raw.showSeoBlock !== false && (raw.showSeoBlock === true || isDemo),
    featuredRailTitle: raw.featuredRailTitle || '',
    featuredRailSubtitle: raw.featuredRailSubtitle || '',
    heroSlides: Array.isArray(raw.heroSlides) && raw.heroSlides.length ? raw.heroSlides : null,
    categoryNav: Array.isArray(raw.categoryNav) && raw.categoryNav.length ? raw.categoryNav : null,
    categoryIcons: Array.isArray(raw.categoryIcons) && raw.categoryIcons.length ? raw.categoryIcons : null,
    promoBanners: Array.isArray(raw.promoBanners) && raw.promoBanners.length ? raw.promoBanners : null,
    careByCondition: Array.isArray(raw.careByCondition) && raw.careByCondition.length ? raw.careByCondition : null,
    brands: Array.isArray(raw.brands) && raw.brands.length ? raw.brands : null,
    quickSearchTerms: Array.isArray(raw.quickSearchTerms) && raw.quickSearchTerms.length ? raw.quickSearchTerms : null,
    trustPillars: Array.isArray(raw.trustPillars) && raw.trustPillars.length ? raw.trustPillars : null,
  };
}

export const PHARMACY_DEMO_QUICK_SEARCH_TERMS = ['Panadol', 'Vitamin C', 'Multivitamins', 'Cold & flu'];
/** @deprecated use resolvePharmacyQuickSearchTerms */
export const PHARMACY_QUICK_SEARCH_TERMS = [];

/**
 * @param {string} base
 * @param {object[]} [categories]
 * @param {object} [settings]
 */
export function getPharmacyNavLinks(base, categories = [], settings = {}) {
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
    { id: 'menu', label: 'All products', href: products },
    { id: 'deals', label: 'Deals', href: `${products}?onSale=true` },
    { id: 'prescription', label: 'Upload Rx', href: `${base}/contact?prescription=1` },
  ];
}

/** Demo-only category nav (Pakistan pharmacy vertical). */
export const PHARMACY_DEMO_CATEGORY_NAV = [
  { id: 'pain-relief', label: 'Medicines & Pain Relief', href: '?category=pain-relief' },
  { id: 'personal-care', label: 'Personal Care', href: '?category=personal-care' },
  { id: 'mother-baby', label: 'Mother & Baby', href: '?category=mother-baby' },
  { id: 'vitamins', label: 'Vitamins & Supplements', href: '?category=vitamins' },
  { id: 'skincare', label: 'Skin Care', href: '?category=skin-care' },
  { id: 'devices', label: 'Devices & Support', href: '?category=devices' },
  { id: 'cough-cold', label: 'Cough & Cold', href: '?category=cough-cold' },
  { id: 'deals', label: 'Deals', href: '?onSale=true' },
];

/** Demo-only category icons with accurate Lucide icons. */
export const PHARMACY_DEMO_CATEGORY_ICONS = [
  { id: 'pain-relief', label: 'Pain Relief', slug: 'pain-relief', icon: 'pill' },
  { id: 'cough-cold', label: 'Cough & Cold', slug: 'cough-cold', icon: 'thermometer' },
  { id: 'antibiotics', label: 'Antibiotics', slug: 'antibiotics', icon: 'syringe' },
  { id: 'antiseptics', label: 'Antiseptics', slug: 'antiseptics', icon: 'shield-check' },
  { id: 'vitamins', label: 'Vitamins', slug: 'vitamins', icon: 'heart-pulse' },
  { id: 'personal-care', label: 'Personal Care', slug: 'personal-care', icon: 'sparkles' },
  { id: 'skincare', label: 'Skincare', slug: 'skincare', icon: 'sun' },
  { id: 'chronic-care', label: 'Chronic Care', slug: 'chronic-care', icon: 'stethoscope' },
  { id: 'mother-baby', label: 'Mother & Baby', slug: 'mother-baby', icon: 'baby' },
  { id: 'skin-care', label: 'Skin Care', slug: 'skin-care', icon: 'droplet' },
  { id: 'deals', label: 'Deals', slug: '', hrefSuffix: '?onSale=true', icon: 'tag' },
];

const PHARMACY_DEMO_HERO_SLIDES = [
  {
    eyebrow: '{storeName} · Trusted care',
    title: 'Genuine medicines, delivered nationwide',
    subtitle: 'OTC essentials, vitamins, personal care, and Rx refills from licensed distributors.',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1920&q=85&auto=format&fit=crop',
    ctaLabel: 'Shop medicines',
    ctaHref: '/products',
  },
  {
    eyebrow: 'Wellness · up to 15% off',
    title: 'Better health starts here',
    subtitle: 'Vitamins, baby care, and personal care favourites with pharmacist guidance on every order.',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1920&q=85&auto=format&fit=crop',
    ctaLabel: 'Browse vitamins',
    ctaHref: '/products?category=vitamins',
  },
  {
    eyebrow: 'Licensed prescription service',
    title: 'Upload your prescription online',
    subtitle: 'Our pharmacists verify every Rx order. Schedule H medicines ship only with a valid prescription.',
    image: 'https://images.unsplash.com/photo-1587854694152-42e3e8f5b672?w=1920&q=85&auto=format&fit=crop',
    ctaLabel: 'Upload prescription',
    ctaHref: '/contact?prescription=1',
  },
];

/**
 * @param {string} base
 * @param {object} [settings]
 * @param {{ storeName?: string; businessDomain?: string; businessDescription?: string; coverImage?: string | null; products?: object[] }} [ctx]
 */
export function getPharmacyHeroSlides(base, settings = {}, ctx = {}) {
  const config = getPharmacyConfig(settings, ctx.businessDomain);
  const storeName = ctx.storeName || formatPharmacyStoreName('');
  const featured = (ctx.products || []).filter((p) => p.is_featured && p.image_url);

  return buildTenantHeroSlides({
    settingsSlides: config.heroSlides,
    base,
    storeName,
    businessDescription: ctx.businessDescription,
    coverImage: ctx.coverImage,
    demoSlides: PHARMACY_DEMO_HERO_SLIDES,
    isDemo: isDemoStoreDomain(ctx.businessDomain),
    featuredProducts: featured.length ? featured : (ctx.products || []).filter((p) => p.image_url).slice(0, 4),
  });
}

/** Demo-only promo banners. */
export const PHARMACY_DEMO_PROMO_BANNERS = [
  {
    id: 'skincare',
    title: 'Skin Care',
    subtitle: 'Derma, sun care & daily essentials',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80&auto=format&fit=crop',
    href: '?category=skincare',
    tone: 'white',
  },
  {
    id: 'health',
    title: 'Better Health',
    subtitle: 'Vitamins, immunity & chronic care',
    image: 'https://images.unsplash.com/photo-1550572017-edd951aaee62?w=800&q=80&auto=format&fit=crop',
    href: '?category=vitamins',
    tone: 'green',
  },
  {
    id: 'baby',
    title: 'Mother & Baby',
    subtitle: 'Diapers, formula & gentle care',
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e8170dc0?w=800&q=80&auto=format&fit=crop',
    href: '?category=mother-baby',
    tone: 'white',
  },
  {
    id: 'devices',
    title: 'Devices & Support',
    subtitle: 'Nebulizers, monitors & mobility aids',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508a118?w=800&q=80&auto=format&fit=crop',
    href: '?category=devices',
    tone: 'green',
  },
];

/** Demo-only care tiles. */
export const PHARMACY_DEMO_CARE_BY_CONDITION = [
  { id: 'hair', label: 'Hair Care', slug: 'hair-care', image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&q=80&auto=format&fit=crop' },
  { id: 'cough', label: 'Cough Relief', slug: 'cough-cold', image: 'https://images.unsplash.com/photo-1587854694152-42e3e8f5b672?w=400&q=80&auto=format&fit=crop' },
  { id: 'bones', label: 'Bones & Joints', slug: 'bones-joints', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80&auto=format&fit=crop' },
  { id: 'acne', label: 'Acne', slug: 'acne', image: 'https://images.unsplash.com/photo-1570172619644-dfd955f5b7a3?w=400&q=80&auto=format&fit=crop' },
  { id: 'pain', label: 'Pain & Fever', slug: 'pain-relief', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80&auto=format&fit=crop' },
  { id: 'sleep', label: 'Sleep Health', slug: 'sleep', image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&q=80&auto=format&fit=crop' },
  { id: 'sun', label: 'Sunscreen', slug: 'sunscreen', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80&auto=format&fit=crop' },
  { id: 'diabetes', label: 'Diabetes Care', slug: 'diabetes-care', image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80&auto=format&fit=crop' },
];

/** Demo-only brand row. */
export const PHARMACY_DEMO_BRANDS = [
  { id: 'getz', name: 'Getz Pharma', slug: 'getz-pharma' },
  { id: 'searle', name: 'Searle', slug: 'searle' },
  { id: 'abbott', name: 'Abbott', slug: 'abbott' },
  { id: 'gsk', name: 'GSK', slug: 'gsk' },
  { id: 'pfizer', name: 'Pfizer', slug: 'pfizer' },
  { id: 'hilton', name: 'Hilton Pharma', slug: 'hilton-pharma' },
  { id: 'martin', name: 'Martin Dow', slug: 'martin-dow' },
  { id: 'novartis', name: 'Novartis', slug: 'novartis' },
  { id: 'sanofi', name: 'Sanofi', slug: 'sanofi' },
  { id: 'ferozsons', name: 'Ferozsons', slug: 'ferozsons' },
];

export function getPharmacyFooterColumns(base) {
  const products = `${base}/products`;
  return [
    {
      title: 'Shop',
      links: [
        { label: 'Medicines', href: `${products}?category=medicines` },
        { label: 'Personal Care', href: `${products}?category=personal-care` },
        { label: 'Mother & Baby', href: `${products}?category=mother-baby` },
        { label: 'Vitamins', href: `${products}?category=vitamins` },
        { label: 'Deals', href: `${products}?onSale=true` },
      ],
    },
    {
      title: 'Services',
      links: [
        { label: 'Upload Prescription', href: `${base}/contact?prescription=1` },
        { label: 'Monthly Refill Reminders', href: `${base}/contact?refill=1` },
        { label: 'Track Order', href: `${base}/orders` },
        { label: 'Contact Pharmacist', href: `${base}/contact` },
      ],
    },
    {
      title: 'Help',
      links: [
        { label: 'FAQs', href: `${base}/faqs` },
        { label: 'Shipping', href: `${base}/shipping` },
        { label: 'Returns', href: `${base}/returns` },
        { label: 'Privacy', href: `${base}/privacy` },
      ],
    },
  ];
}

export const PHARMACY_DEFAULT_TRUST_PILLARS = [
  { id: 'genuine', label: 'Genuine products', desc: 'Sourced from authorised distributors' },
  { id: 'delivery', label: 'Fast delivery', desc: 'Nationwide shipping on qualifying orders' },
  { id: 'refill', label: 'Refill support', desc: 'Contact us for repeat prescriptions' },
  { id: 'support', label: 'Pharmacist support', desc: 'Help with orders and product questions' },
];

export const PHARMACY_DEMO_SEO_BLOCKS = [
  {
    id: 'buy-online',
    title: 'Buy medicine online with confidence',
    body: 'Browse genuine medicines, OTC products, and wellness essentials from authorised distributors. Prescription medicines require a valid Rx upload before dispatch when applicable.',
  },
  {
    id: 'refill',
    title: 'Never miss a monthly refill',
    body: 'Contact us to set refill reminders for chronic care essentials. We help you reorder with a valid prescription when required.',
  },
  {
    id: 'safety',
    title: 'Safe, secure, and pharmacist-backed',
    body: 'We follow dispensing protocols, protect your health data, and deliver nationwide. Counterfeit products are never listed on our platform.',
  },
];

/** @deprecated demo-only */
export const PHARMACY_SEO_BLOCKS = PHARMACY_DEMO_SEO_BLOCKS;

/** @type {Record<string, { subject: string; title: string; subtitle: string; messagePlaceholder: string }>} */
export const PHARMACY_CONTACT_INTENTS = {
  prescription: {
    subject: 'prescription',
    title: 'Upload prescription',
    subtitle: 'Send your prescription and our licensed pharmacists will verify and prepare your order.',
    messagePlaceholder: 'Describe your medicines, dosage, and any special instructions. You can also mention if you will attach a photo separately via WhatsApp.',
  },
  refill: {
    subject: 'refill',
    title: 'Set refill reminder',
    subtitle: 'Tell us which chronic care medicines you take and we will remind you before you run out.',
    messagePlaceholder: 'List medicines, typical quantity, and how often you refill (e.g. monthly).',
  },
};

/**
 * @param {URLSearchParams | { get: (key: string) => string | null }} searchParams
 */
export function resolvePharmacyContactIntent(searchParams) {
  for (const key of Object.keys(PHARMACY_CONTACT_INTENTS)) {
    if (searchParams.get(key) === '1' || searchParams.get('intent') === key) {
      return { key, ...PHARMACY_CONTACT_INTENTS[key] };
    }
  }
  return null;
}

function productComparePrice(p) {
  return p?.compare_price ?? p?.compare_at_price;
}

/**
 * Partition catalog into homepage carousels (fill to 6+ at render via StoreProductRail).
 * @param {object[]} products
 */
export function partitionPharmacyProducts(products = []) {
  const inStock = (products || []).filter((p) => p.stock == null || Number(p.stock) > 0);
  const pool = inStock.length ? inStock : products;
  const onSale = pool.filter((p) => {
    const compare = productComparePrice(p);
    return compare && Number(compare) > Number(p.price);
  });
  const featured = pool.filter((p) => p.is_featured);

  return {
    topSelling: featured.length ? featured : pool.slice(0, 12),
    deals: onSale.length ? onSale : pool.filter((p) => productComparePrice(p)).slice(0, 12),
    featured: featured.length ? featured : pool.slice(0, 12),
  };
}

/**
 * Resolve category nav with owner overrides.
 * @param {object} [settings]
 * @param {string} base
 */
export function resolvePharmacyCategoryNav(settings, base, categories = []) {
  const config = getPharmacyConfig(settings);
  const fromDb = buildCategoryNavItems(categories, base, { max: 8, includeDeals: true });
  if (fromDb.length >= 2) {
    return fromDb.map((item) => ({ id: item.id, label: item.label, href: item.href }));
  }
  const items = config.categoryNav || (isDemoStoreDomain(base.split('/').pop()) ? PHARMACY_DEMO_CATEGORY_NAV : []);
  return items.map((item) => ({
    ...item,
    href: item.href?.startsWith('http') ? item.href : `${base}/products${item.href || ''}`,
  }));
}

/**
 * @param {object} [settings]
 * @param {string} storeBase
 * @param {{ categories?: object[]; businessDomain?: string; products?: object[]; businessCategory?: string }} [ctx]
 */
export function resolvePharmacyCategoryIcons(settings, storeBase, ctx = {}) {
  const config = getPharmacyConfig(settings, ctx.businessDomain);
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
    return PHARMACY_DEMO_CATEGORY_ICONS.map((item) => ({
      ...item,
      href: `${productsUrl}${item.hrefSuffix || (item.slug ? `?category=${encodeURIComponent(item.slug)}` : '')}`,
    }));
  }

  return fromDb;
}

/**
 * @param {object} [settings]
 * @param {object[]} [products]
 * @param {object[]} [categories]
 */
export function resolvePharmacyQuickSearchTerms(settings = {}, products = [], categories = [], businessDomain) {
  const config = getPharmacyConfig(settings, businessDomain);
  const terms = buildQuickSearchTerms(products, categories, config.quickSearchTerms);
  if (terms.length) return terms;
  return isDemoStoreDomain(businessDomain) ? PHARMACY_DEMO_QUICK_SEARCH_TERMS : [];
}

/**
 * @param {object} [settings]
 * @param {object[]} [products]
 * @param {string | null | undefined} businessDomain
 * @param {string | null | undefined} businessCategory
 */
export function resolvePharmacyPromoBanners(settings = {}, products = [], businessDomain, businessCategory) {
  const config = getPharmacyConfig(settings, businessDomain);
  return buildPromoBannersFromCatalog(
    products,
    config.promoBanners,
    PHARMACY_DEMO_PROMO_BANNERS,
    { isDemo: isDemoStoreDomain(businessDomain), businessCategory }
  ).map((b) => ({ ...b, tone: b.tone || (b.id?.length % 2 === 0 ? 'green' : 'white') }));
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} businessDomain
 */
export function resolvePharmacyCareByCondition(settings = {}, storeBase, ctx = {}) {
  const config = getPharmacyConfig(settings, ctx.businessDomain);
  if (config.careByCondition) {
    return config.careByCondition.map((item) => ({
      ...item,
      href: `${storeBase}/products?category=${encodeURIComponent(item.slug)}`,
    }));
  }
  const fromDb = enrichCategoryNavImages(
    buildCategoryNavItems(ctx.categories, storeBase, { max: 8, includeDeals: false }),
    ctx.products,
    ctx.businessCategory
  );
  if (fromDb.length >= 2) return fromDb;
  if (isDemoStoreDomain(ctx.businessDomain)) {
    return PHARMACY_DEMO_CARE_BY_CONDITION.map((item) => ({
      ...item,
      href: `${storeBase}/products?category=${encodeURIComponent(item.slug)}`,
    }));
  }
  return fromDb;
}

/**
 * @param {object} [settings]
 * @param {object[]} [products]
 * @param {string | null | undefined} businessDomain
 */
export function resolvePharmacyBrands(settings = {}, products = [], businessDomain) {
  const config = getPharmacyConfig(settings, businessDomain);
  if (config.brands) return config.brands;
  const fromProducts = [...new Set((products || []).map((p) => p.brand).filter(Boolean))].slice(0, 10);
  if (fromProducts.length >= 2) {
    return fromProducts.map((name, i) => ({
      id: `brand-${i}`,
      name: String(name),
      slug: String(name).toLowerCase().replace(/\s+/g, '-'),
    }));
  }
  return isDemoStoreDomain(businessDomain) ? PHARMACY_DEMO_BRANDS : [];
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} businessDomain
 */
export function resolvePharmacyTrustPillars(settings = {}, businessDomain) {
  const config = getPharmacyConfig(settings, businessDomain);
  return config.trustPillars || PHARMACY_DEFAULT_TRUST_PILLARS;
}

/**
 * @param {string} storeName
 * @param {string} [businessDescription]
 * @param {string} [country]
 */
export function resolvePharmacySeoBlocks(storeName, businessDescription = '', country = '') {
  const displayName = formatPharmacyStoreName(storeName);
  const region = country ? ` in ${country}` : '';
  const intro = String(businessDescription || '').trim();
  return [
    {
      id: 'about',
      title: `${displayName}, your trusted online pharmacy${region}`,
      body: intro || `Browse genuine medicines, OTC products, and wellness essentials from ${displayName}. Prescription items may require a valid Rx upload before dispatch.`,
    },
    ...PHARMACY_DEMO_SEO_BLOCKS.slice(1),
  ];
}

// Legacy exports
export const PHARMACY_CATEGORY_NAV = PHARMACY_DEMO_CATEGORY_NAV;
export const PHARMACY_CATEGORY_ICONS = PHARMACY_DEMO_CATEGORY_ICONS;
export const PHARMACY_PROMO_BANNERS = PHARMACY_DEMO_PROMO_BANNERS;
export const PHARMACY_CARE_BY_CONDITION = PHARMACY_DEMO_CARE_BY_CONDITION;
export const PHARMACY_BRANDS = PHARMACY_DEMO_BRANDS;
