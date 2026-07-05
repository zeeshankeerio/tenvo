/**
 * Wild-workout elevated fitness / gym storefront — tenant-aware with demo defaults.
 * Isolated to canonical `gym-fitness` vertical.
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import {
  formatElevatedStoreName,
  buildCategoryNavItems,
  buildQuickSearchTerms,
  buildPromoBannersFromCatalog,
  buildTenantHeroSlides,
  enrichCategoryNavImages,
  filterProductsByCategorySlug,
  isDemoStoreDomain,
} from '@/lib/storefront/elevatedStorefrontTenant';
import {
  buildFitnessCategoryIconsFromSeed,
  buildFitnessPromoBannersFromSeed,
  enrichFitnessCategoryNavImages,
  enrichFitnessProductsWithSeedImages,
  mapFitnessSeedRowToStorefrontProduct,
  resolveFitnessShowcaseProducts,
} from '@/lib/dataLab/fitnessSeedHelpers';
import { FITNESS_SEED_PRODUCTS } from '@/lib/dataLab/fitnessDemoCatalog';
import { isStorefrontProductUuid } from '@/lib/utils/storefrontProductRef';
import { isPurchasableStorefrontProduct } from '@/lib/storefront/storefrontPurchasability';

export const FITNESS_ELEVATED_CANONICALS = new Set(['gym-fitness']);

/** Crimson accent palette (Workout Wild inspired, refined for Tenvo). */
export const FITNESS_CRIMSON = '#e11d48';
export const FITNESS_CRIMSON_DARK = '#9f1239';
export const FITNESS_CRIMSON_LIGHT = '#fff1f2';
export const FITNESS_CHARCOAL = '#0a0a0a';

export const FITNESS_ACCENTS = {
  accent: FITNESS_CRIMSON,
  accentDark: FITNESS_CRIMSON_DARK,
  accentLight: FITNESS_CRIMSON_LIGHT,
};

/** CDN assets from Workout Wild reference (archive/fitness.html). */
export const FITNESS_ASSETS = Object.freeze({
  heroAthlete:
    'https://assets.website-files.com/62258d7594580b9078cf9018/62259760d123ca0a7c2f1c20_Image%2011.png',
  heroCircle:
    'https://assets.website-files.com/62258d7594580b9078cf9018/62259e2e971cfa051d543a04_Circle_banner.png',
  spark1:
    'https://assets.website-files.com/62258d7594580b9078cf9018/6225a0d290c7149fb16b7506_Mask%20Group%203.png',
  spark2:
    'https://assets.website-files.com/62258d7594580b9078cf9018/6225a0d2718113aa651d3854_Mask%20Group%206.png',
  spark3:
    'https://assets.website-files.com/62258d7594580b9078cf9018/6225a0d2bd957d931f818946_Image%207.png',
  programStrength:
    'https://assets.website-files.com/62258d7594580b9078cf9018/62259760973610c0a8578542_Group%20100.png',
  programFlex:
    'https://assets.website-files.com/62258d7594580b9078cf9018/62259760d15b8935f9abff2b_Group%20101.png',
  programToning:
    'https://assets.website-files.com/62258d7594580b9078cf9018/62259760ab10d7619d303c29_Group%20102.png',
  pricingAthlete:
    'https://assets.website-files.com/62258d7594580b9078cf9018/622597608ffdf47176ec96d9_Image%2030.png',
  pricingCircle:
    'https://assets.website-files.com/62258d7594580b9078cf9018/6225bba2d15b89cd81ad0b60_Circle_big.png',
  ctaArrow:
    'https://assets.website-files.com/62258d7594580b9078cf9018/622597601d5b31098b6e04ca_Group%20103.svg',
});

const SUPPLEMENT_PATTERN =
  /\b(supplement|protein|whey|bcaa|creatine|pre-workout|preworkout|mass gainer|vitamin|amino|collagen|glutamine|isolate|casein)\b/i;
const MEMBERSHIP_PATTERN =
  /\b(membership|monthly|annual|quarterly|pass|plan|trainer|session|class|pt\b|personal training)\b/i;

/**
 * @param {string | null | undefined} category
 */
export function isFitnessElevatedStore(category) {
  return FITNESS_ELEVATED_CANONICALS.has(resolveDomainKey(category));
}

/**
 * @param {string | null | undefined} name
 */
export function formatFitnessStoreName(name) {
  return formatElevatedStoreName(name, 'Our gym');
}

/**
 * @param {string | null | undefined} country
 */
function isPakistanMarket(country) {
  const c = String(country || '').trim().toLowerCase();
  return c === 'pakistan' || c === 'pk';
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} [businessDomain]
 * @param {{ country?: string | null }} [ctx]
 */
export function getFitnessConfig(settings = {}, businessDomain, ctx = {}) {
  const raw = settings?.storefront?.fitness || {};
  const isDemo = isDemoStoreDomain(businessDomain);
  const country = ctx.country ?? settings?.contact?.country ?? null;
  const pakistan = isPakistanMarket(country);
  return {
    heroTitle: raw.heroTitle || 'Be fierce. Train wild.',
    heroSubtitle:
      raw.heroSubtitle ||
      (pakistan
        ? 'Strength, mobility, and conditioning, plus supplements and memberships built for Pakistani gyms.'
        : 'Strength, mobility, and conditioning, plus supplements and memberships for your gym.'),
    searchPlaceholder: raw.searchPlaceholder || 'Search supplements, gear, memberships...',
    membershipSectionTitle: raw.membershipSectionTitle || '',
    membershipSectionSubtitle: raw.membershipSectionSubtitle || '',
    showPrograms: raw.showPrograms !== false,
    showBenefits: raw.showBenefits !== false,
    showMemberships: raw.showMemberships !== false,
    showBookingStrip: raw.showBookingStrip !== false,
    showPromoBanners: raw.showPromoBanners !== false,
    showTrustPillars: raw.showTrustPillars !== false && (raw.showTrustPillars === true || isDemo),
    showTrainers: raw.showTrainers === true || (raw.showTrainers === undefined && isDemo),
    featuredRailTitle: raw.featuredRailTitle || '',
    featuredRailSubtitle: raw.featuredRailSubtitle || '',
    supplementRailTitle: raw.supplementRailTitle || '',
    heroSlides: Array.isArray(raw.heroSlides) && raw.heroSlides.length ? raw.heroSlides : null,
    programs: Array.isArray(raw.programs) && raw.programs.length ? raw.programs : null,
    benefits: Array.isArray(raw.benefits) && raw.benefits.length ? raw.benefits : null,
    membershipTiers: Array.isArray(raw.membershipTiers) && raw.membershipTiers.length ? raw.membershipTiers : null,
    trainers: Array.isArray(raw.trainers) && raw.trainers.length ? raw.trainers : null,
    categoryIcons: Array.isArray(raw.categoryIcons) && raw.categoryIcons.length ? raw.categoryIcons : null,
    promoBanners: Array.isArray(raw.promoBanners) && raw.promoBanners.length ? raw.promoBanners : null,
    trustPillars: Array.isArray(raw.trustPillars) && raw.trustPillars.length ? raw.trustPillars : null,
    quickSearchTerms: Array.isArray(raw.quickSearchTerms) && raw.quickSearchTerms.length ? raw.quickSearchTerms : null,
    bookingItems: Array.isArray(raw.bookingItems) && raw.bookingItems.length ? raw.bookingItems : null,
  };
}

/**
 * Membership section copy — settings override, regional neutral fallback.
 * @param {object} [settings]
 * @param {string | null | undefined} [businessDomain]
 * @param {{ country?: string | null }} [ctx]
 */
export function resolveFitnessMembershipSectionCopy(settings, businessDomain, ctx = {}) {
  const config = getFitnessConfig(settings, businessDomain, ctx);
  const pakistan = isPakistanMarket(ctx.country ?? settings?.contact?.country);
  return {
    title: config.membershipSectionTitle || 'Gents gym & ladies section plans',
    subtitle:
      config.membershipSectionSubtitle ||
      (pakistan
        ? 'Monthly, quarterly, half-year, and annual passes with separate ladies-only access where offered.'
        : 'Monthly, quarterly, half-year, and annual membership passes for your training goals.'),
  };
}

export const FITNESS_DEMO_QUICK_SEARCH_TERMS = [
  'Whey Protein',
  'Gents Monthly',
  'Ladies Section',
  'Personal Training',
  'Creatine',
  'Annual Pass',
];

/**
 * @param {string} base
 * @param {object[]} [categories]
 */
export function getFitnessNavLinks(base, categories = []) {
  const fromDb = buildCategoryNavItems(categories, base, { max: 5, includeDeals: true });
  if (fromDb.length) {
    return fromDb.map((item) => ({ id: item.id, label: item.label, href: item.href }));
  }
  const products = `${base}/products`;
  return [
    { id: 'programs', label: 'Programs', href: `${base}#programs` },
    { id: 'supplements', label: 'Supplements', href: `${products}?search=protein` },
    { id: 'memberships', label: 'Memberships', href: `${base}#memberships` },
    { id: 'book', label: 'Book a session', href: `${base}#book` },
    { id: 'contact', label: 'Contact', href: `${base}/contact` },
  ];
}

export const FITNESS_DEMO_PROGRAMS = [
  {
    id: 'power-up',
    number: '01.',
    title: 'Power Up',
    description:
      'Build serious strength with ropes, barbells, and kettlebells. Train grip, legs, and core with progressive overload.',
    image: FITNESS_ASSETS.programStrength,
    hrefSuffix: '?search=strength',
    cta: 'Start strong',
  },
  {
    id: 'flexible',
    number: '02.',
    title: 'Be Flexible',
    description:
      'Mobility flows and yoga-inspired stretches keep joints young. Perfect for recovery days and desk-bound athletes.',
    image: FITNESS_ASSETS.programFlex,
    hrefSuffix: '?search=yoga',
    cta: 'Move free',
  },
  {
    id: 'toning',
    number: '03.',
    title: 'Super Body Toning',
    description:
      'High-intensity circuits and functional cardio sculpt lean muscle from head to toe while boosting endurance.',
    image: FITNESS_ASSETS.programToning,
    hrefSuffix: '?search=cardio',
    cta: 'Get toned',
  },
];

export const FITNESS_DEMO_BENEFITS = [
  {
    id: 'custom',
    title: 'Customized for you',
    description: 'Workouts tailored to your goals, experience level, and schedule.',
    icon: 'target',
  },
  {
    id: 'support',
    title: '24/7 Support',
    description: 'Message our team anytime for form checks, plan tweaks, and order help.',
    icon: 'headphones',
  },
  {
    id: 'devices',
    title: 'Train on any device',
    description: 'Follow sessions on your phone, tablet, or gym display while you travel.',
    icon: 'devices',
  },
  {
    id: 'value',
    title: 'Honest pricing',
    description: 'Premium coaching and supplements without boutique-gym markup.',
    icon: 'tag',
  },
];

export const FITNESS_DEMO_MEMBERSHIP_TIERS = [
  {
    id: 'trial',
    title: 'Rookie trial',
    priceLabel: 'Rs 997',
    period: 'One-time intro',
    features: [
      'Try gents and ladies zones',
      'Coach-led orientation',
      'Locker for your first visit',
      'Book online or walk in',
    ],
    hrefSuffix: '?search=Rookie%20Trial',
    featured: false,
  },
  {
    id: 'monthly',
    title: 'Monthly passes',
    priceLabel: 'From Rs 4,995',
    period: 'Gents & ladies options',
    features: [
      'Separate gents gym and ladies section',
      'Monthly, 3, 6, and annual packages',
      'Member pricing on supplements',
      'Book a tour before you join',
    ],
    hrefSuffix: '#memberships',
    featured: true,
  },
];

export const FITNESS_DEMO_TRAINERS = [
  {
    id: 'jamie',
    name: 'Jamie Ford',
    role: 'Strength coach',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80&auto=format&fit=crop',
    bio: 'Former powerlifting competitor focused on safe barbell progressions for all levels.',
  },
  {
    id: 'annie',
    name: 'Annie Summer',
    role: 'Mobility & yoga',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80&auto=format&fit=crop',
    bio: 'Blends athletic yoga and breathwork to unlock hips, shoulders, and recovery.',
  },
  {
    id: 'eddie',
    name: 'Eddie Smith',
    role: 'HIIT & conditioning',
    image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80&auto=format&fit=crop',
    bio: 'Builds fat-burning circuits with battle ropes, sleds, and kettlebell complexes.',
  },
  {
    id: 'emily',
    name: 'Emily Sea',
    role: 'Nutrition & supplements',
    image: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&q=80&auto=format&fit=crop',
    bio: 'Helps members match protein, recovery, and hydration plans to training blocks.',
  },
];

export const FITNESS_DEMO_CATEGORY_ICONS = [
  {
    id: 'protein',
    label: 'Protein',
    slug: '',
    hrefSuffix: '?search=protein',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=200&q=80&auto=format&fit=crop',
  },
  {
    id: 'preworkout',
    label: 'Pre-workout',
    slug: '',
    hrefSuffix: '?search=pre-workout',
    image: 'https://images.unsplash.com/photo-1622484218808-aa8020a849b1?w=200&q=80&auto=format&fit=crop',
  },
  {
    id: 'bcaa',
    label: 'BCAA',
    slug: '',
    hrefSuffix: '?search=bcaa',
    image: 'https://images.unsplash.com/photo-1579722821273-0f6c8d1b1c3f?w=200&q=80&auto=format&fit=crop',
  },
  {
    id: 'vitamins',
    label: 'Vitamins',
    slug: '',
    hrefSuffix: '?search=vitamin',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&q=80&auto=format&fit=crop',
  },
  {
    id: 'gear',
    label: 'Gym gear',
    slug: '',
    hrefSuffix: '?search=gear',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&q=80&auto=format&fit=crop',
  },
  {
    id: 'membership',
    label: 'Memberships',
    slug: '',
    hrefSuffix: '?search=membership',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=80&auto=format&fit=crop',
  },
  {
    id: 'training',
    label: 'PT sessions',
    slug: '',
    hrefSuffix: '?search=training',
    image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=200&q=80&auto=format&fit=crop',
  },
  {
    id: 'deals',
    label: 'Deals',
    slug: '',
    hrefSuffix: '?onSale=true',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=200&q=80&auto=format&fit=crop',
  },
];

export const FITNESS_DEFAULT_TRUST_PILLARS = [
  { id: 'coach', label: 'Certified coaches', desc: 'Form-first programming' },
  { id: 'supps', label: 'Genuine supplements', desc: 'Trusted brands only' },
  { id: 'book', label: 'Easy booking', desc: 'Schedule PT in minutes' },
  { id: 'delivery', label: 'Fast delivery', desc: 'Supplements to your door' },
];

const FITNESS_DEMO_HERO_SLIDES = [
  {
    eyebrow: '{storeName} · Train wild',
    title: 'Be fierce. Train wild.',
    subtitle: 'Strength, mobility, and conditioning with supplements that fuel real progress.',
    image: FITNESS_ASSETS.heroAthlete,
    ctaLabel: 'Shop supplements',
    ctaHref: '/products?search=protein',
  },
];

/**
 * @param {string} base
 * @param {object} [settings]
 * @param {{ storeName?: string; businessDomain?: string; businessDescription?: string; coverImage?: string | null; products?: object[] }} [ctx]
 */
export function getFitnessHeroSlides(base, settings = {}, ctx = {}) {
  const config = getFitnessConfig(settings, ctx.businessDomain);
  const storeName = ctx.storeName || formatFitnessStoreName('');
  const featured = (ctx.products || []).filter((p) => p.is_featured && p.image_url);

  const demoSlides = FITNESS_DEMO_HERO_SLIDES.map((s) => ({
    ...s,
    title: config.heroTitle || s.title,
    subtitle: config.heroSubtitle || s.subtitle,
  }));

  return buildTenantHeroSlides({
    settingsSlides: config.heroSlides,
    base,
    storeName,
    businessDescription: ctx.businessDescription,
    coverImage: ctx.coverImage || FITNESS_ASSETS.heroAthlete,
    demoSlides,
    isDemo: isDemoStoreDomain(ctx.businessDomain),
    featuredProducts: featured.length ? featured : (ctx.products || []).filter((p) => p.image_url).slice(0, 4),
  });
}

/**
 * @param {object} [settings]
 * @param {string} storeBase
 * @param {{ categories?: object[]; businessDomain?: string }} [ctx]
 */
export function resolveFitnessPrograms(settings, storeBase, ctx = {}) {
  const config = getFitnessConfig(settings, ctx.businessDomain);
  const productsUrl = `${storeBase}/products`;
  if (config.programs?.length) {
    return config.programs.map((p) => ({
      ...p,
      href: p.href || `${productsUrl}${p.hrefSuffix || ''}`,
    }));
  }
  if (isDemoStoreDomain(ctx.businessDomain) && config.showPrograms) {
    return FITNESS_DEMO_PROGRAMS.map((p) => ({
      ...p,
      href: `${productsUrl}${p.hrefSuffix}`,
    }));
  }
  return [];
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} [businessDomain]
 */
export function resolveFitnessBenefits(settings, businessDomain) {
  const config = getFitnessConfig(settings, businessDomain);
  if (config.benefits?.length) return config.benefits;
  if (isDemoStoreDomain(businessDomain) && config.showBenefits) return FITNESS_DEMO_BENEFITS;
  return [];
}

/**
 * @param {object} [settings]
 * @param {string} storeBase
 * @param {{ businessDomain?: string }} [ctx]
 */
export function resolveFitnessMembershipTiers(settings, storeBase, ctx = {}) {
  const config = getFitnessConfig(settings, ctx.businessDomain);
  const productsUrl = `${storeBase}/products`;
  if (config.membershipTiers?.length) {
    return config.membershipTiers.map((t) => ({
      ...t,
      href: t.href || `${productsUrl}${t.hrefSuffix || ''}`,
    }));
  }
  if (!isDemoStoreDomain(ctx.businessDomain)) return [];
  return FITNESS_DEMO_MEMBERSHIP_TIERS.map((t) => ({
    ...t,
    href: `${productsUrl}${t.hrefSuffix}`,
  }));
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} [businessDomain]
 */
export function resolveFitnessTrainers(settings, businessDomain) {
  const config = getFitnessConfig(settings, businessDomain);
  if (config.trainers?.length) return config.trainers;
  if (config.showTrainers && isDemoStoreDomain(businessDomain)) return FITNESS_DEMO_TRAINERS;
  return [];
}

/**
 * @param {object} [settings]
 * @param {string} storeBase
 * @param {{ categories?: object[]; businessDomain?: string; products?: object[]; businessCategory?: string }} [ctx]
 */
export function resolveFitnessCategoryIcons(settings, storeBase, ctx = {}) {
  const config = getFitnessConfig(settings, ctx.businessDomain);
  const productsUrl = `${storeBase}/products`;
  const isDemo = isDemoStoreDomain(ctx.businessDomain);

  if (config.categoryIcons?.length) {
    return config.categoryIcons.map((c) => ({
      ...c,
      href: c.href || `${productsUrl}${c.hrefSuffix || (c.slug ? `?category=${c.slug}` : '')}`,
    }));
  }

  if (ctx.categories?.length) {
    const fromDb = enrichFitnessCategoryNavImages(
      buildCategoryNavItems(ctx.categories, storeBase, { max: 6, includeDeals: true }),
      ctx.products || [],
      ctx.businessCategory
    );
    if (fromDb.length) return fromDb;
  }

  if (isDemo) {
    const fromSeed = buildFitnessCategoryIconsFromSeed(storeBase, { max: 6 });
    if (fromSeed.length >= 4) return fromSeed;
    return FITNESS_DEMO_CATEGORY_ICONS.slice(0, 6).map((c) => ({
      ...c,
      href: `${productsUrl}${c.hrefSuffix}`,
    }));
  }

  return [];
}

/**
 * @param {object} [settings]
 * @param {object[]} products
 * @param {string | null | undefined} businessDomain
 * @param {string} [businessCategory]
 */
export function resolveFitnessPromoBanners(settings, products, businessDomain, businessCategory) {
  const config = getFitnessConfig(settings, businessDomain);
  if (config.promoBanners?.length) return config.promoBanners;
  const seedBanners = buildFitnessPromoBannersFromSeed(
    businessDomain ? `/store/${businessDomain}` : '/store'
  );
  return buildPromoBannersFromCatalog(
    products,
    config.promoBanners,
    seedBanners,
    { isDemo: isDemoStoreDomain(businessDomain), businessCategory }
  );
}

/**
 * @param {object} [settings]
 * @param {string | null | undefined} [businessDomain]
 */
export function resolveFitnessTrustPillars(settings, businessDomain) {
  const config = getFitnessConfig(settings, businessDomain);
  if (config.trustPillars?.length) return config.trustPillars;
  if (isDemoStoreDomain(businessDomain) && config.showTrustPillars) return FITNESS_DEFAULT_TRUST_PILLARS;
  return [];
}

/**
 * @param {object} [settings]
 * @param {object[]} [products]
 * @param {object[]} [categories]
 * @param {string | null | undefined} [businessDomain]
 */
export function resolveFitnessQuickSearchTerms(settings, products = [], categories = [], businessDomain) {
  const config = getFitnessConfig(settings, businessDomain);
  const terms = buildQuickSearchTerms(products, categories, config.quickSearchTerms, 6);
  if (terms.length) return terms;
  return isDemoStoreDomain(businessDomain) ? FITNESS_DEMO_QUICK_SEARCH_TERMS : [];
}

/**
 * Map a quick-search label to a category slug when possible.
 * @param {string} term
 * @param {object[]} categories
 */
function resolveFitnessCategoryForTerm(term, categories = []) {
  const norm = String(term || '').toLowerCase().trim();
  if (!norm) return null;
  const slugGuess = norm.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const rows = categories || [];
  return (
    rows.find((c) => String(c.name || '').toLowerCase() === norm) ||
    rows.find((c) => String(c.slug || '').toLowerCase() === slugGuess) ||
    rows.find((c) => {
      const name = String(c.name || '').toLowerCase();
      return name.includes(norm) || norm.includes(name);
    }) ||
    null
  );
}

/**
 * Tenant-aware hero quick links — category filters when slugs exist, else product search.
 * @param {string} base
 * @param {object} [settings]
 * @param {object[]} [products]
 * @param {object[]} [categories]
 * @param {string | null | undefined} [businessDomain]
 * @param {number} [max]
 */
export function resolveFitnessHeroQuickLinks(
  base,
  settings = {},
  products = [],
  categories = [],
  businessDomain,
  max = 6
) {
  const productsUrl = `${base}/products`;
  const terms = resolveFitnessQuickSearchTerms(settings, products, categories, businessDomain);
  return terms.slice(0, max).map((term, index) => {
    const cat = resolveFitnessCategoryForTerm(term, categories);
    if (cat?.slug) {
      return {
        id: `cat-${cat.slug}`,
        label: cat.name || term,
        href: `${productsUrl}?category=${encodeURIComponent(cat.slug)}`,
      };
    }
    return {
      id: `search-${index}-${term}`,
      label: term,
      href: `${productsUrl}?search=${encodeURIComponent(term)}`,
    };
  });
}

/**
 * Primary supplements CTA — prefers live whey/supplements category slug.
 * @param {string} base
 * @param {object[]} [categories]
 */
export function resolveFitnessSupplementsShopUrl(base, categories = []) {
  const productsUrl = `${base}/products`;
  const match =
    (categories || []).find((c) => /whey\s*protein/i.test(String(c.name || ''))) ||
    (categories || []).find((c) => /^supplements?$/i.test(String(c.name || '').trim())) ||
    (categories || []).find((c) => /supplement|protein/i.test(String(c.name || '')));
  if (match?.slug) {
    return `${productsUrl}?category=${encodeURIComponent(match.slug)}`;
  }
  return `${productsUrl}?search=${encodeURIComponent('whey protein')}`;
}

function productComparePrice(p) {
  return p?.compare_price ?? p?.compare_at_price;
}

/** @param {object} p */
function productCategory(p) {
  return String(p?.category_name || p?.category || '').toLowerCase();
}

/** @param {object} p */
export function isGymMembershipProduct(p) {
  const cat = productCategory(p);
  if (cat === 'memberships' || cat.includes('membership')) return true;
  const name = String(p?.name || '').toLowerCase();
  return /\b(gym pass|gents gym|ladies section|membership)\b/i.test(name);
}

/** @param {object} p */
export function isFitnessSupplementProduct(p) {
  const name = String(p?.name || '').toLowerCase();
  const cat = productCategory(p);
  if (isGymMembershipProduct(p)) return false;
  if (cat === 'personal training' || cat === 'classes') return false;
  return SUPPLEMENT_PATTERN.test(name) || SUPPLEMENT_PATTERN.test(cat);
}

/** Bookable categories — homepage / booking only, not the shop catalog. */
export const FITNESS_BOOKABLE_CATEGORY_NAMES = Object.freeze([
  'memberships',
  'personal training',
  'classes',
]);

/** @param {object} p */
export function isFitnessServiceProduct(p) {
  const cat = productCategory(p);
  if (cat === 'personal training' || cat === 'classes') return true;
  const name = String(p?.name || '').toLowerCase();
  return /\b(personal training|pt session|group class|class pack|training session)\b/i.test(name);
}

/** @param {object} p */
export function isFitnessBookableProduct(p) {
  if (isGymMembershipProduct(p) || isFitnessServiceProduct(p)) return true;
  const dd = p?.domain_data || {};
  const bookable = dd.bookable;
  if (bookable === true || bookable === 'true' || bookable === 1 || bookable === '1') return true;
  return false;
}

/** Retail / supplement SKUs for `/products` — excludes memberships and training sessions. */
export function isFitnessShopCatalogProduct(p) {
  return !isFitnessBookableProduct(p);
}

/** @param {{ slug?: string; name?: string } | null | undefined} category */
export function isFitnessBookableCategory(category) {
  const slug = String(category?.slug || '')
    .trim()
    .toLowerCase();
  const name = String(category?.name || '')
    .trim()
    .toLowerCase();
  if (FITNESS_BOOKABLE_CATEGORY_NAMES.includes(name)) return true;
  if (slug === 'memberships' || slug === 'personal-training' || slug === 'classes') return true;
  return name.includes('membership') && name !== 'membership deals';
}

/** @param {object[]} categories */
export function filterFitnessShopCategories(categories = []) {
  return (categories || []).filter((c) => !isFitnessBookableCategory(c));
}

/** @param {object[]} products */
export function filterFitnessShopProducts(products = []) {
  return (products || []).filter(isFitnessShopCatalogProduct);
}

function sortFitnessShopProducts(products, sort = 'featured') {
  const list = [...products];
  switch (sort) {
    case 'newest':
      return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    case 'price-asc':
      return list.sort((a, b) => Number(a.price) - Number(b.price));
    case 'price-desc':
      return list.sort((a, b) => Number(b.price) - Number(a.price));
    case 'name-asc':
      return list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    case 'popularity':
      return list.sort(
        (a, b) =>
          (Number(b.sales_count) || 0) - (Number(a.sales_count) || 0) ||
          (Number(b.rating) || 0) - (Number(a.rating) || 0)
      );
    case 'rating':
      return list.sort(
        (a, b) =>
          (Number(b.rating) || 0) - (Number(a.rating) || 0) ||
          (Number(b.review_count) || 0) - (Number(a.review_count) || 0)
      );
    case 'featured':
    default:
      return list.sort((a, b) => {
        const featuredDelta = Number(b.is_featured) - Number(a.is_featured);
        if (featuredDelta) return featuredDelta;
        return (Number(b.sales_count) || 0) - (Number(a.sales_count) || 0);
      });
  }
}

/**
 * Apply storefront filters + pagination to a merged fitness shop catalog (demo backfill path).
 * @param {object[]} products
 * @param {object} filters
 */
export function paginateFitnessShopCatalog(products = [], filters = {}) {
  let list = filterFitnessShopProducts(products);

  if (filters.category) {
    if (isFitnessBookableCategory({ slug: filters.category })) {
      return { products: [], total: 0, hasMore: false };
    }
    list = filterProductsByCategorySlug(list, filters.category);
  }

  if (filters.search) {
    const term = String(filters.search).trim().toLowerCase();
    if (term) {
      list = list.filter((p) => {
        const name = String(p.name || '').toLowerCase();
        const desc = String(p.description || '').toLowerCase();
        const sku = String(p.sku || '').toLowerCase();
        return name.includes(term) || desc.includes(term) || sku.includes(term);
      });
    }
  }

  if (filters.onSale) {
    list = list.filter((p) => {
      const compare = productComparePrice(p);
      return compare && Number(compare) > Number(p.price);
    });
  }

  if (filters.featured === 'only') {
    list = list.filter((p) => p.is_featured);
  }

  if (filters.inStock === true) {
    list = list.filter((p) => p.stock == null || Number(p.stock) > 0);
  }

  if (filters.minPrice != null) {
    list = list.filter((p) => Number(p.price) >= Number(filters.minPrice));
  }
  if (filters.maxPrice != null) {
    list = list.filter((p) => Number(p.price) <= Number(filters.maxPrice));
  }

  list = sortFitnessShopProducts(list, filters.sort);

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Number(filters.limit) || 24);
  const total = list.length;
  const offset = (page - 1) * limit;

  return {
    products: list.slice(offset, offset + limit),
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Full shop catalog for `/products` — DB rows plus demo seed backfill for retail SKUs only.
 * @param {object[]} products
 * @param {string | null | undefined} [businessDomain]
 */
export function buildFitnessShopCatalog(products = [], businessDomain) {
  const slotMap = new Map();

  const upsert = (p) => {
    if (!isFitnessShopCatalogProduct(p) || !isPurchasableStorefrontProduct(p)) return;
    const key = String(p.sku || p.id || p.name || '')
      .trim()
      .toLowerCase();
    if (!key) return;
    const existing = slotMap.get(key);
    if (existing) {
      if (isStorefrontProductUuid(p.id) && !isStorefrontProductUuid(existing.id)) {
        slotMap.set(key, p);
      }
      return;
    }
    slotMap.set(key, p);
  };

  for (const p of products || []) upsert(p);

  return enrichFitnessProductsWithSeedImages([...slotMap.values()], businessDomain);
}

/** @param {object} p */
export function getGymMembershipGender(p) {
  const dd = p?.domain_data || {};
  const g = String(dd.gender || dd.facility || '').toLowerCase();
  if (g === 'female' || g === 'ladies' || g === 'women') return 'female';
  if (g === 'male' || g === 'gents' || g === 'men') return 'male';
  if (/\bladies|women|female\b/i.test(String(p?.name || ''))) return 'female';
  if (/\bgents|men\b/i.test(String(p?.name || ''))) return 'male';
  return 'male';
}

const DURATION_ORDER = ['monthly', '3month', '6month', 'yearly', 'trial'];

/** @param {object} p */
export function getGymMembershipDuration(p) {
  const dd = p?.domain_data || {};
  const raw = String(dd.duration || dd.membershiptype || '').toLowerCase();
  if (raw === 'monthly' || raw === 'month') return 'monthly';
  if (raw === '3month' || raw === 'quarterly' || raw === '3 months') return '3month';
  if (raw === '6month' || raw === 'semi-annual' || raw === '6 months') return '6month';
  if (raw === 'yearly' || raw === 'annual' || raw === '12month') return 'yearly';
  if (raw === 'trial' || raw === 'student') return 'trial';
  const name = String(p?.name || '').toLowerCase();
  if (/annual|yearly|12.?month/.test(name)) return 'yearly';
  if (/6.?month/.test(name)) return '6month';
  if (/3.?month/.test(name)) return '3month';
  if (/monthly|month\b/.test(name)) return 'monthly';
  if (/trial|rookie/.test(name)) return 'trial';
  return 'monthly';
}

export const GYM_MEMBERSHIP_GENDERS = Object.freeze([
  {
    id: 'male',
    label: 'Gents gym',
    subtitle: 'Main floor · free weights · machines · cardio',
  },
  {
    id: 'female',
    label: 'Ladies section',
    subtitle: 'Ladies-only floor · female trainers on duty',
  },
]);

export const GYM_MEMBERSHIP_DURATION_LABELS = Object.freeze({
  monthly: 'Monthly',
  '3month': '3 months',
  '6month': '6 months',
  yearly: 'Annual',
  trial: 'Trial',
});

/**
 * Merge DB membership SKUs with seed tiers so gents + ladies grids stay complete on demo/partial catalogs.
 * @param {object[]} products
 * @param {string | null | undefined} [businessDomain]
 */
export function buildFitnessMembershipCatalog(products = [], businessDomain) {
  const slotMap = new Map();
  const trials = [];

  for (const p of products || []) {
    if (!isGymMembershipProduct(p)) continue;
    const duration = getGymMembershipDuration(p);
    if (duration === 'trial') {
      trials.push(p);
      continue;
    }
    const gender = getGymMembershipGender(p);
    const key = `${gender}:${duration}`;
    const existing = slotMap.get(key);
    if (!existing) {
      slotMap.set(key, p);
      continue;
    }
    if (isStorefrontProductUuid(p.id) && !isStorefrontProductUuid(existing.id)) {
      slotMap.set(key, p);
    }
  }

  const shouldFillFromSeed = isDemoStoreDomain(businessDomain);
  if (shouldFillFromSeed) {
    for (const seed of FITNESS_SEED_PRODUCTS) {
      if (String(seed.category || '') !== 'Memberships') continue;
      if (seed.domain_data?.duration === 'trial' || /trial|rookie/i.test(String(seed.name || ''))) {
        if (!trials.length) {
          trials.push(mapFitnessSeedRowToStorefrontProduct(seed));
        }
        continue;
      }
      const mapped = mapFitnessSeedRowToStorefrontProduct(seed);
      const key = `${getGymMembershipGender(mapped)}:${getGymMembershipDuration(mapped)}`;
      if (!slotMap.has(key)) {
        slotMap.set(key, mapped);
      }
    }
  }

  const memberships = enrichFitnessProductsWithSeedImages([...slotMap.values()], businessDomain).sort(
    (a, b) =>
      DURATION_ORDER.indexOf(getGymMembershipDuration(a)) -
      DURATION_ORDER.indexOf(getGymMembershipDuration(b))
  );

  return { memberships, trials };
}

/**
 * @param {string} storeBase
 * @param {object[]} [categories]
 */
export function resolveFitnessMembershipsCategoryHref(storeBase, categories = []) {
  const productsUrl = `${storeBase}/products`;
  const match = (categories || []).find((c) =>
    /membership/i.test(String(c.name || ''))
  );
  if (match?.slug) {
    return `${productsUrl}?category=${encodeURIComponent(match.slug)}`;
  }
  return `${productsUrl}?category=memberships`;
}

/**
 * Group membership SKUs for homepage package grid.
 * @param {object[]} products
 * @param {string} storeBase
 * @param {{ meetingUrl?: string | null; contactHref?: string; businessDomain?: string }} [opts]
 */
export function resolveGymMembershipPackages(products = [], storeBase, opts = {}) {
  const productsUrl = `${storeBase}/products`;
  const contactHref = opts.contactHref || `${storeBase}/contact`;
  const meetingUrl = opts.meetingUrl || null;

  const { memberships, trials } = buildFitnessMembershipCatalog(products, opts.businessDomain);

  const packages = memberships.map((p) => {
      const duration = getGymMembershipDuration(p);
      const gender = getGymMembershipGender(p);
      const compare = productComparePrice(p);
      const price = Number(p.price) || 0;
      const savings =
        compare && Number(compare) > price
          ? Math.round(((Number(compare) - price) / Number(compare)) * 100)
          : 0;
      const slug = p.slug || (isStorefrontProductUuid(p.id) ? p.id : null);
      const productHref = slug
        ? `${storeBase}/products/${slug}`
        : p.sku
          ? `${productsUrl}?search=${encodeURIComponent(String(p.sku))}`
          : `${productsUrl}?search=${encodeURIComponent(String(p.name || ''))}`;
      const bookHref =
        meetingUrl ||
        `${contactHref}?subject=booking&package=${encodeURIComponent(String(p.name || ''))}`;

      return {
        id: p.sku || p.id || `${gender}-${duration}`,
        product: p,
        gender,
        duration,
        durationLabel: GYM_MEMBERSHIP_DURATION_LABELS[duration] || duration,
        name: String(p.name || ''),
        description: String(p.description || ''),
        price,
        comparePrice: compare ? Number(compare) : null,
        savings,
        image: p.image_url,
        productHref,
        bookHref,
        bookExternal: Boolean(meetingUrl),
        featured: duration === 'yearly' || duration === '6month',
      };
    })
    .sort(
      (a, b) =>
        DURATION_ORDER.indexOf(a.duration) - DURATION_ORDER.indexOf(b.duration)
    );

  const byGender = {
    male: packages.filter((pkg) => pkg.gender === 'male'),
    female: packages.filter((pkg) => pkg.gender === 'female'),
  };

  const trial =
    trials[0] ||
    (products || []).find(
      (p) =>
        getGymMembershipDuration(p) === 'trial' || /rookie trial/i.test(String(p.name || ''))
    );

  return { packages, byGender, trial, meetingUrl, contactHref, productsUrl };
}

/**
 * Merge DB training/class SKUs with seed catalog for homepage carousel.
 * @param {object[]} products
 * @param {string | null | undefined} [businessDomain]
 */
export function buildFitnessServiceCatalog(products = [], businessDomain) {
  const slotMap = new Map();

  const upsert = (p) => {
    if (!isFitnessServiceProduct(p)) return;
    const key = String(p.sku || p.id || p.name || '')
      .trim()
      .toLowerCase();
    if (!key) return;
    const existing = slotMap.get(key);
    if (!existing) {
      slotMap.set(key, p);
      return;
    }
    if (isStorefrontProductUuid(p.id) && !isStorefrontProductUuid(existing.id)) {
      slotMap.set(key, p);
    }
  };

  for (const p of products || []) upsert(p);

  const shouldFillFromSeed = isDemoStoreDomain(businessDomain);
  if (shouldFillFromSeed) {
    for (const seed of FITNESS_SEED_PRODUCTS) {
      const cat = String(seed.category || '');
      if (cat !== 'Personal Training' && cat !== 'Classes') continue;
      const mapped = mapFitnessSeedRowToStorefrontProduct(seed);
      upsert(mapped);
    }
  }

  return enrichFitnessProductsWithSeedImages(dedupeFitnessServices([...slotMap.values()]), businessDomain);
}

/**
 * Up to 12 supplement SKUs for the Fuel your training grid (DB + seed).
 * @param {object[]} products
 * @param {string | null | undefined} [businessDomain]
 * @param {number} [max]
 */
export function buildFitnessSupplementShowcase(products = [], businessDomain, max = 12) {
  const slotMap = new Map();

  const upsert = (p) => {
    if (!isFitnessSupplementProduct(p)) return;
    const key = String(p.sku || p.id || p.name || '')
      .trim()
      .toLowerCase();
    if (!key) return;
    const existing = slotMap.get(key);
    if (existing) {
      if (isStorefrontProductUuid(p.id) && !isStorefrontProductUuid(existing.id)) {
        slotMap.set(key, p);
      }
      return;
    }
    if (slotMap.size >= max) return;
    slotMap.set(key, p);
  };

  for (const p of products || []) upsert(p);

  const hasDbSupplements = [...slotMap.values()].some(
    (p) => isStorefrontProductUuid(p.id) && !p.catalog_preview && isFitnessSupplementProduct(p)
  );

  const shouldFillFromSeed = isDemoStoreDomain(businessDomain) && !hasDbSupplements;
  if (shouldFillFromSeed) {
    const seedSupps = FITNESS_SEED_PRODUCTS.map(mapFitnessSeedRowToStorefrontProduct).filter(
      isFitnessSupplementProduct
    );
    seedSupps.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
    for (const mapped of seedSupps) {
      if (slotMap.size >= max) break;
      upsert(mapped);
    }
  }

  return enrichFitnessProductsWithSeedImages([...slotMap.values()], businessDomain)
    .filter((p) => {
      const purchasable = isStorefrontProductUuid(p.id) && !p.catalog_preview;
      if (purchasable) return true;
      return !hasDbSupplements && isDemoStoreDomain(businessDomain);
    })
    .slice(0, max);
}

/**
 * @param {object[]} products
 * @param {string | null | undefined} [businessDomain]
 */
export function partitionFitnessProducts(products = [], businessDomain) {
  const inStock = (products || []).filter((p) => p.stock == null || Number(p.stock) > 0);
  const pool = inStock.length ? inStock : products;

  const supplements = buildFitnessSupplementShowcase(pool, businessDomain, 12);
  const memberships = pool.filter(isGymMembershipProduct);
  const services = buildFitnessServiceCatalog(pool, businessDomain);

  const onSale = pool.filter((p) => {
    const compare = productComparePrice(p);
    return compare && Number(compare) > Number(p.price);
  });

  const supplementDeals = onSale.filter(isFitnessSupplementProduct);
  const topPicks = pool.filter((p) => p.is_featured && isFitnessSupplementProduct(p)).slice(0, 12);

  return {
    supplements: supplements.length
      ? supplements
      : isDemoStoreDomain(businessDomain) && !pool.some((p) => isStorefrontProductUuid(p.id) && isFitnessSupplementProduct(p))
        ? buildFitnessSupplementShowcase([], businessDomain, 12)
        : [],
    memberships: memberships.length ? memberships : [],
    services,
    topPicks: topPicks.length ? topPicks : supplements.slice(0, 12),
    deals: supplementDeals.length ? supplementDeals.slice(0, 12) : supplements.slice(0, 8),
    newArrivals: [...supplements]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 8),
  };
}

/**
 * @param {object[]} products
 */
export function dedupeFitnessServices(products = []) {
  const seen = new Set();
  return (products || []).filter((p) => {
    const key = String(p.sku || p.id || p.name || '')
      .trim()
      .toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * @param {object[]} products
 * @param {string} slug
 */
export function filterFitnessByCategorySlug(products, slug) {
  return filterProductsByCategorySlug(products, slug);
}

/**
 * Booking strip items — settings override, demo defaults, empty for live tenants without config.
 * @param {object} [settings]
 * @param {string} storeBase
 * @param {string | null | undefined} [businessDomain]
 */
export function resolveFitnessBookingItems(settings, storeBase, businessDomain) {
  const config = getFitnessConfig(settings, businessDomain);
  const contact = `${storeBase}/contact`;
  if (config.bookingItems?.length) {
    return config.bookingItems.map((item) => ({
      ...item,
      href: item.href || `${storeBase}${item.hrefSuffix || ''}`,
    }));
  }
  if (isDemoStoreDomain(businessDomain)) {
    return getFitnessBookingStripItems(storeBase);
  }
  return [
    { id: 'trial', label: 'Free trial class', icon: 'calendar', href: `${storeBase}#memberships` },
    { id: 'pt', label: 'Personal training', icon: 'dumbbell', href: `${contact}?subject=appointment` },
    { id: 'membership', label: 'Membership consult', icon: 'users', href: `${storeBase}#memberships` },
    { id: 'nutrition', label: 'Nutrition check-in', icon: 'leaf', href: `${contact}?subject=visit` },
  ];
}

/**
 * @deprecated use resolveFitnessBookingItems
 * @param {string} storeBase
 */
export function getFitnessBookingStripItems(storeBase) {
  const contact = `${storeBase}/contact`;
  return [
    { id: 'trial', label: 'Free trial class', icon: 'calendar', href: `${storeBase}#memberships` },
    { id: 'pt', label: 'Personal training', icon: 'dumbbell', href: `${contact}?subject=appointment` },
    { id: 'membership', label: 'Membership consult', icon: 'users', href: `${storeBase}#memberships` },
    { id: 'nutrition', label: 'Nutrition check-in', icon: 'leaf', href: `${contact}?subject=visit` },
  ];
}

/** Compact footer columns for elevated fitness storefronts. */
export function getFitnessFooterColumns(base, categories = []) {
  const products = `${base}/products`;
  const shopCategories = filterFitnessShopCategories(categories);
  const shopLinks = shopCategories.length
    ? [
        ...shopCategories.slice(0, 4).map((c) => ({
          label: c.name,
          href: `${products}?category=${encodeURIComponent(c.slug)}`,
        })),
        { label: 'Hot deals', href: `${products}?onSale=true` },
      ]
    : [
        { label: 'All products', href: products },
        { label: 'Hot deals', href: `${products}?onSale=true` },
      ];

  return [
    {
      title: 'Shop',
      links: shopLinks,
    },
    {
      title: 'Gym',
      links: [
        { label: 'Programs', href: `${base}#programs` },
        { label: 'Book a session', href: `${base}#book` },
        { label: 'Contact', href: `${base}/contact` },
        { label: 'Track order', href: `${base}/orders` },
      ],
    },
  ];
}

export { resolveFitnessShowcaseProducts };
