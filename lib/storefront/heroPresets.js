/**
 * Domain-aware storefront hero presets, carousel slides, finder panels, category shortcuts.
 */
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { resolveStorefrontVertical, getDomainConfig } from '../config/storefrontDomains.js';
import { CANONICAL_HERO_VARIANTS, resolveHeroShortcuts } from './canonicalStorefrontVariants.js';
import {
  getLuxuryFashionVariant,
  isLuxuryFashionStore,
  LUXURY_HERO_SLIDES,
  LUXURY_TRUST_PILLS,
} from './luxuryFashion.js';
import {
  isFashionEditorialStore,
  getFashionEditorialSlides,
} from './fashionEditorial.js';
import {
  isAutoDealershipStore,
  getDealershipHeroSlides,
  isTenvoVehiclesShowroomProfile,
} from './autoDealership.js';
import {
  isAutoMarketplaceStore,
  getMarketplaceHeroSlides,
} from './autoMarketplace.js';
import {
  isPharmacyElevatedStore,
  getPharmacyHeroSlides,
  formatPharmacyStoreName,
} from './pharmacyStorefront.js';
import {
  isFurnitureElevatedStore,
  getFurnitureHeroSlides,
  formatFurnitureStoreName,
} from './furnitureStorefront.js';
import {
  isRestaurantElevatedStore,
  getRestaurantHeroSlides,
  formatRestaurantStoreName,
} from './restaurantStorefront.js';
import {
  isFitnessElevatedStore,
  getFitnessHeroSlides,
  formatFitnessStoreName,
  FITNESS_ASSETS,
} from './fitnessStorefront.js';
import {
  VEHICLE_MAKES,
  VEHICLE_MODELS,
  VEHICLE_YEARS,
  isAutoPartsFinderStore,
} from './partsFinder.js';
import { getAutoPartsHeroSlides, getAutoPartsMarqueeBrands, AUTO_PARTS_SHOP_BRANDS } from './autoParts.js';

export { VEHICLE_MAKES, VEHICLE_MODELS, VEHICLE_YEARS };

/** @typedef {{ title: string; subtitle?: string; image: string }} HeroSlide */
/** @typedef {{ id: string; label: string; slug: string; icon: string }} CategoryShortcut */

const PARTS_SLIDES = [
  {
    eyebrow: 'Worldwide delivery',
    title: 'We list over 300 brands',
    subtitle: 'OEM, genuine, and aftermarket parts from trusted manufacturers.',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1600&q=82&auto=format&fit=crop',
  },
  {
    eyebrow: 'Complete catalog',
    title: 'Just about all part types are available',
    subtitle: 'Filters, brakes, lubricants, engine, transmission, suspension, and more.',
    image: 'https://images.unsplash.com/photo-1625047509248-ec889cbff817?w=1600&q=82&auto=format&fit=crop',
  },
  {
    eyebrow: 'Fast lookup',
    title: 'Find the right fit, fast',
    subtitle: 'Search by part number, vehicle, plate, or VIN.',
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1600&q=82&auto=format&fit=crop',
  },
];

const AUTO_CATEGORY_SHORTCUTS = [
  { id: 'car-care', label: 'Car Care', slug: 'car-care', icon: 'droplet' },
  { id: 'accessories', label: 'Accessories', slug: 'accessories', icon: 'wiper' },
  { id: 'lubricants', label: 'Oils', slug: 'lubricants', icon: 'droplet' },
  { id: 'filters', label: 'Filters', slug: 'filters', icon: 'filter' },
  { id: 'brakes', label: 'Brakes', slug: 'brakes', icon: 'disc' },
  { id: 'electrical', label: 'Electrical', slug: 'electrical', icon: 'zap' },
  { id: 'engine', label: 'Engine', slug: 'engine', icon: 'engine' },
  { id: 'deals', label: 'Deals', slug: '', icon: 'tag', hrefSuffix: '?onSale=true' },
];

const HARDWARE_CATEGORY_SHORTCUTS = [
  { id: 'tools', label: 'Tools', slug: 'tools', icon: 'wrench' },
  { id: 'plumbing', label: 'Plumbing', slug: 'plumbing', icon: 'pipe' },
  { id: 'sanitary', label: 'Sanitary', slug: 'sanitary', icon: 'bath' },
  { id: 'power', label: 'Power Tools', slug: 'power-tools', icon: 'zap' },
  { id: 'hardware', label: 'Hardware', slug: 'hardware', icon: 'nut' },
  { id: 'electrical', label: 'Electrical', slug: 'electrical', icon: 'bolt' },
];

/** Marquee strip for auto-parts storefront (archive vehicle brand logos). */
export const AUTO_PARTS_MARQUEE_BRANDS = getAutoPartsMarqueeBrands();

const DENTAL_SLIDES = [
  {
    title: 'Professional dental care',
    subtitle: 'Preventive, restorative, and cosmetic treatments, book online.',
    image: 'https://images.unsplash.com/photo-1606811842817-55c8f3b6d4f6?w=1600&q=82&auto=format&fit=crop',
  },
  {
    title: 'Modern clinic, trusted team',
    subtitle: 'Diagnostics, whitening, fillings, and routine checkups.',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1600&q=82&auto=format&fit=crop',
  },
];

const DENTAL_SHORTCUTS = [
  { id: 'preventive', label: 'Preventive', slug: 'preventive', icon: 'heart' },
  { id: 'restorative', label: 'Restorative', slug: 'restorative', icon: 'activity' },
  { id: 'cosmetic', label: 'Cosmetic', slug: 'cosmetic', icon: 'sparkles' },
  { id: 'diagnostics', label: 'Diagnostics', slug: 'diagnostics', icon: 'thermometer' },
];

const RESTAURANT_SLIDES = [
  {
    title: 'Hot & fresh to your door',
    subtitle: 'Signature mains, beverages, and desserts, order in minutes.',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=82&auto=format&fit=crop',
  },
  {
    title: 'Chef\'s specials tonight',
    subtitle: 'Biryani, pizza, burgers, and combo deals.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a437?w=1600&q=82&auto=format&fit=crop',
  },
];

const TEXTILE_FASHION_TILES = [
  { label: 'Lawn', hrefSuffix: '?category=lawn', desc: 'Digital prints' },
  { label: 'Cotton', hrefSuffix: '?category=cotton', desc: 'Unstitched' },
  { label: 'Khaddar', hrefSuffix: '?category=khaddar', desc: 'Winter wear' },
  { label: 'Bridal', hrefSuffix: '?category=bridal-collection', desc: 'Formal' },
];

const PHARMACY_SLIDES = [
  {
    title: 'Your health, delivered',
    subtitle: 'Genuine medicines & wellness, pharmacist support available.',
    image: 'https://images.unsplash.com/photo-1587854694152-42e3e8f5b672?w=1600&q=82&auto=format&fit=crop',
  },
  {
    title: 'Shop by health need',
    subtitle: 'Vitamins, pain relief, cold & flu, and more.',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1600&q=82&auto=format&fit=crop',
  },
];

const PHARMACY_SHORTCUTS = [
  { id: 'pain', label: 'Pain Relief', slug: 'pain-relief', icon: 'heart' },
  { id: 'vitamins', label: 'Vitamins', slug: 'vitamins', icon: 'leaf' },
  { id: 'cold', label: 'Cold & Flu', slug: 'cold-flu', icon: 'thermometer' },
  { id: 'diabetes', label: 'Diabetes', slug: 'diabetes-care', icon: 'activity' },
  { id: 'baby', label: 'Mom & Baby', slug: 'moms-kids', icon: 'baby' },
  { id: 'beauty', label: 'Beauty', slug: 'beauty', icon: 'sparkles' },
];

const FASHION_SLIDES = [
  {
    title: 'New season styles',
    subtitle: 'Fresh drops · Summer sale up to 50% off.',
    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&q=82&auto=format&fit=crop',
  },
  {
    title: 'Wear your story',
    subtitle: 'Premium cotton, sharp fits, everyday essentials.',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2907d7e0?w=1600&q=82&auto=format&fit=crop',
  },
];

const GROCERY_SLIDES = [
  {
    title: 'Fresh. Fast. Affordable.',
    subtitle: 'Groceries & daily essentials at best prices.',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=82&auto=format&fit=crop',
  },
];

const BAKERY_SLIDES = [
  {
    title: 'Baked fresh, every day',
    subtitle: 'Artisan breads, cakes, and pastries made with care.',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1600&q=82&auto=format&fit=crop',
  },
  {
    title: 'Celebrate with something sweet',
    subtitle: 'Custom cakes for birthdays, weddings, and corporate events.',
    image: 'https://images.unsplash.com/photo-1578985545069-69928b1d9587?w=1600&q=82&auto=format&fit=crop',
  },
];

const DEFAULT_TECH_SLIDES = [
  {
    title: 'Tech that powers your day',
    subtitle: 'Genuine electronics with official warranty and support.',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1600&q=82&auto=format&fit=crop',
  },
];

/**
 * @param {object} args
 */
function buildSearchFinderPreset({ slides, shortcuts, searchPlaceholder, trendingTerms, customCover, storeName, base }) {
  return {
    type: 'pharmacy-finder',
    slides: slides.map((s, i) => (i === 0 && customCover ? { ...s, image: customCover } : s)),
    categoryShortcuts: shortcuts,
    searchPlaceholder,
    trendingTerms,
    storeName,
    base,
  };
}

/**
 * @param {string | null | undefined} category
 * @param {string} businessDomain
 * @param {object} [settings]
 * @param {{ business_name?: string; cover_image_url?: string }} [business]
 */
export function getHeroPreset(category, businessDomain, settings = {}, business = {}) {
  const canonical = resolveDomainKey(category);
  const vertical = resolveStorefrontVertical(canonical);
  const domainCfg = getDomainConfig(canonical);
  const base = `/store/${businessDomain}`;
  const storeName = business?.business_name?.trim() || domainCfg.label || 'Store';

  const customCover = business?.cover_image_url?.startsWith('http') ? business.cover_image_url : null;

  if (isAutoDealershipStore(canonical)) {
    const slides = getDealershipHeroSlides(base, { country: business?.country, settings });
    const dealershipCfg = settings?.storefront?.dealership || {};
    const isTenvoShowroom = isTenvoVehiclesShowroomProfile(business, settings);
    return {
      type: 'auto-dealership',
      slides: slides.map((s, i) => (i === 0 && customCover ? { ...s, image: customCover, videoPoster: customCover } : s)),
      storeName,
      base,
      settings,
      videoUrl: dealershipCfg.videoUrl || '',
      isTenvoShowroom,
    };
  }

  if (isAutoMarketplaceStore(canonical)) {
    const slides = getMarketplaceHeroSlides(base, settings);
    return {
      type: 'auto-marketplace',
      slides: slides.map((s, i) => (i === 0 && customCover ? { ...s, image: customCover } : s)),
      storeName,
      base,
      settings,
    };
  }

  if (isPharmacyElevatedStore(canonical)) {
    const slides = getPharmacyHeroSlides(base, settings, {
      storeName: formatPharmacyStoreName(storeName),
      businessDomain,
      businessDescription: business?.description || settings?.description,
      coverImage: customCover,
    });
    return {
      type: 'pharmacy-elevated',
      slides: slides.map((s, i) => (i === 0 && customCover ? { ...s, image: customCover } : s)),
      storeName: formatPharmacyStoreName(storeName),
      base,
      settings,
    };
  }

  if (isFurnitureElevatedStore(canonical)) {
    const slides = getFurnitureHeroSlides(base, settings, {
      storeName: formatFurnitureStoreName(storeName),
      businessDomain,
      businessDescription: business?.description || settings?.description,
      coverImage: customCover,
    });
    return {
      type: 'furniture-elevated',
      slides: slides.map((s, i) => (i === 0 && customCover ? { ...s, image: customCover } : s)),
      storeName: formatFurnitureStoreName(storeName),
      base,
      settings,
    };
  }

  if (isRestaurantElevatedStore(canonical)) {
    const slides = getRestaurantHeroSlides(base, settings, {
      storeName: formatRestaurantStoreName(storeName),
      businessDomain,
      businessDescription: business?.description || settings?.description,
      coverImage: customCover,
    });
    return {
      type: 'restaurant-elevated',
      slides: slides.map((s, i) => (i === 0 && customCover ? { ...s, image: customCover } : s)),
      storeName: formatRestaurantStoreName(storeName),
      base,
      settings,
    };
  }

  if (isFitnessElevatedStore(canonical)) {
    const slides = getFitnessHeroSlides(base, settings, {
      storeName: formatFitnessStoreName(storeName),
      businessDomain,
      businessDescription: business?.description || settings?.description,
      coverImage: customCover || FITNESS_ASSETS?.heroAthlete,
    });
    return {
      type: 'fitness-elevated',
      slides,
      storeName: formatFitnessStoreName(storeName),
      base,
      settings,
    };
  }

  if (vertical === 'hardware-parts' || canonical === 'auto-parts') {
    const isAuto = isAutoPartsFinderStore(canonical);
    const slides = isAuto
      ? getAutoPartsHeroSlides(base, settings, customCover)
      : PARTS_SLIDES.map((s, i) => (i === 0 && customCover ? { ...s, image: customCover } : s));
    const shortcuts = isAuto
      ? AUTO_CATEGORY_SHORTCUTS.map((s) => ({
          ...s,
          href: s.hrefSuffix ? `${base}/products${s.hrefSuffix}` : undefined,
        }))
      : HARDWARE_CATEGORY_SHORTCUTS;
    return {
      type: 'parts-finder',
      finderMode: isAuto ? 'auto' : 'hardware',
      slides,
      categoryShortcuts: shortcuts,
      brands: isAuto ? AUTO_PARTS_SHOP_BRANDS.slice(0, 12) : ['Bosch', 'Denso', 'NGK', 'Shell', 'Toyota', 'Honda'],
      accentLabel: isAuto ? 'Auto Parts' : 'Hardware & Parts',
    };
  }

  if (vertical === 'pharmacy') {
    const isDental = canonical === 'dental-clinic';
    const variant = !isDental ? CANONICAL_HERO_VARIANTS[canonical] : null;
    if (variant?.slides) {
      return buildSearchFinderPreset({
        slides: variant.slides,
        shortcuts: resolveHeroShortcuts(variant, `${base}/products`),
        searchPlaceholder: variant.searchPlaceholder || 'Search health products & services…',
        trendingTerms: variant.trendingTerms || [],
        customCover,
        storeName,
        base,
      });
    }
    return buildSearchFinderPreset({
      slides: isDental ? DENTAL_SLIDES : PHARMACY_SLIDES,
      shortcuts: isDental ? DENTAL_SHORTCUTS : PHARMACY_SHORTCUTS,
      searchPlaceholder: isDental
        ? 'Search treatments, whitening, diagnostics…'
        : 'Search medicines, vitamins, brands…',
      trendingTerms: isDental
        ? ['Cleaning', 'Whitening', 'Filling', 'X-Ray']
        : ['Panadol', 'Probiotics', 'Vitamin C', 'Cold & flu'],
      customCover,
      storeName,
      base,
    });
  }

  if (canonical === 'salon-spa') {
    const variant = CANONICAL_HERO_VARIANTS['salon-spa'];
    return buildSearchFinderPreset({
      slides: variant.slides,
      shortcuts: resolveHeroShortcuts(variant, `${base}/products`),
      searchPlaceholder: variant.searchPlaceholder,
      trendingTerms: variant.trendingTerms,
      customCover,
      storeName,
      base,
    });
  }

  if (vertical === 'bakery-confectionery') {
    return {
      type: 'restaurant-finder',
      slides: BAKERY_SLIDES.map((s, i) => (i === 0 && customCover ? { ...s, image: customCover } : s)),
      categoryShortcuts: [
        { id: 'cakes', label: 'Cakes', slug: 'cakes', icon: 'gift' },
        { id: 'bread', label: 'Breads', slug: 'bread', icon: 'package' },
        { id: 'pastries', label: 'Pastries', slug: 'pastries', icon: 'sparkles' },
        { id: 'custom', label: 'Custom', slug: '', icon: 'tag', href: `${base}/contact` },
      ],
      storeName,
      base,
    };
  }

  if (vertical === 'electronics-tech') {
    const variant = CANONICAL_HERO_VARIANTS[canonical];
    const slides = variant?.slides || DEFAULT_TECH_SLIDES;
    const shortcuts = variant
      ? resolveHeroShortcuts(variant, `${base}/products`)
      : [
          { id: 'featured', label: 'Top picks', slug: '', href: `${base}/products?sort=featured`, icon: 'star' },
          { id: 'sale', label: 'Deals', slug: '', href: `${base}/products?onSale=true`, icon: 'tag' },
          { id: 'audio', label: 'Audio', slug: 'audio', icon: 'headphones' },
          { id: 'support', label: 'Support', slug: '', href: `${base}/contact`, icon: 'phone' },
        ];
    return buildSearchFinderPreset({
      slides,
      shortcuts,
      searchPlaceholder: variant?.searchPlaceholder || 'Search gadgets, brands, accessories…',
      trendingTerms: variant?.trendingTerms || ['Samsung', 'Laptop', 'Earbuds', 'Smart watch'],
      customCover,
      storeName,
      base,
    });
  }

  if (vertical === 'restaurant-cafe') {
    return {
      type: 'restaurant-finder',
      slides: RESTAURANT_SLIDES.map((s, i) => (i === 0 && customCover ? { ...s, image: customCover } : s)),
      categoryShortcuts: [
        { id: 'mains', label: 'Mains', slug: 'main-course', icon: 'utensils' },
        { id: 'drinks', label: 'Drinks', slug: 'beverages', icon: 'cup' },
        { id: 'desserts', label: 'Desserts', slug: 'desserts', icon: 'gift' },
        { id: 'combos', label: 'Combos', slug: '', icon: 'tag', href: `${base}/products?onSale=true` },
      ],
      storeName,
      base,
    };
  }

  if (vertical === 'fashion-clothing' || vertical === 'luxury-fashion') {
    if (isFashionEditorialStore(canonical)) {
      const slides = getFashionEditorialSlides(base, canonical);
      return {
        type: 'fashion-editorial',
        slides: slides.map((s, i) => (i === 0 && customCover ? { ...s, image: customCover } : s)),
        storeName,
        base,
      };
    }

    const fashionVariant = CANONICAL_HERO_VARIANTS[canonical];
    const luxuryVariant = getLuxuryFashionVariant(canonical);
    const isLuxury = vertical === 'luxury-fashion' || isLuxuryFashionStore(canonical);

    let tiles;
    if (canonical === 'textile-wholesale') {
      tiles = TEXTILE_FASHION_TILES.map((t) => ({ ...t, href: `${base}/products${t.hrefSuffix}` }));
    } else if (fashionVariant?.tiles) {
      tiles = fashionVariant.tiles.map((t) => ({ ...t, href: `${base}/products${t.hrefSuffix}` }));
    }

    const slides = luxuryVariant
      ? LUXURY_HERO_SLIDES[luxuryVariant]
      : FASHION_SLIDES;

    return {
      type: 'fashion-finder',
      luxury: isLuxury,
      luxuryVariant: luxuryVariant || undefined,
      trustPills: luxuryVariant ? LUXURY_TRUST_PILLS[luxuryVariant] : undefined,
      slides: slides.map((s, i) => (i === 0 && customCover ? { ...s, image: customCover } : s)),
      tiles,
      storeName,
      base,
    };
  }

  if (vertical === 'supermarket') {
    return {
      type: 'grocery-finder',
      slides: GROCERY_SLIDES.map((s, i) => (i === 0 && customCover ? { ...s, image: customCover } : s)),
      categoryShortcuts: [
        { id: 'bev', label: 'Beverages', slug: 'beverages', icon: 'cup' },
        { id: 'snacks', label: 'Snacks', slug: 'snacks', icon: 'package' },
        { id: 'dairy', label: 'Dairy', slug: 'dairy', icon: 'milk' },
        { id: 'fresh', label: 'Fresh', slug: 'fresh-produce', icon: 'leaf' },
        { id: 'oil', label: 'Cooking Oil', slug: 'cooking-oil', icon: 'droplet' },
        { id: 'deals', label: 'Deals', slug: '', icon: 'tag', href: `${base}/products?onSale=true` },
      ],
      storeName,
      base,
    };
  }

  return {
    type: 'commerce-carousel',
    slides: [
      {
        title: settings?.heroTitle || settings?.storefront?.heroTitle || domainCfg.heroTagline,
        subtitle: domainCfg.heroSubtitle,
        image: customCover || domainCfg.heroImage,
      },
      {
        title: domainCfg.featuredSectionTitle || 'Shop the catalog',
        subtitle: domainCfg.bannerText,
        image: domainCfg.heroImage,
      },
    ],
    ctaLabel: domainCfg.ctaLabel || 'Shop Now',
    storeName,
    base,
  };
}

/**
 * Whether this category should use the immersive finder hero (skip generic hero block).
 * @param {string | null | undefined} category
 */
export function usesFinderHero(category) {
  const canonical = resolveDomainKey(category);
  const vertical = resolveStorefrontVertical(canonical);
  return (
    vertical === 'hardware-parts' ||
    vertical === 'vehicle-dealership' ||
    vertical === 'auto-marketplace' ||
    isAutoDealershipStore(canonical) ||
    isAutoMarketplaceStore(canonical) ||
    vertical === 'pharmacy' ||
    vertical === 'fashion-clothing' ||
    vertical === 'luxury-fashion' ||
    isFashionEditorialStore(canonical) ||
    vertical === 'supermarket' ||
    vertical === 'restaurant-cafe' ||
    vertical === 'bakery-confectionery' ||
    vertical === 'electronics-tech' ||
    canonical === 'auto-parts' ||
    canonical === 'salon-spa' ||
    isFurnitureElevatedStore(canonical) ||
    isRestaurantElevatedStore(canonical) ||
    isFitnessElevatedStore(canonical)
  );
}
