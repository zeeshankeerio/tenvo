/**
 * Storefront domain configuration
 * Maps business category → hero content, color palette, Unsplash image queries,
 * trust badges, and section labels for the public store.
 */
import { BRAND_PRIMARY, BRAND_PRIMARY_DARK, BRAND_50 } from '../theme/brandTokens';
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { getLuxuryAccentPalette } from '../storefront/luxuryFashion.js';
import { isAutoDealershipStore, DEALERSHIP_ACCENTS } from '../storefront/autoDealership.js';
import { isAutoMarketplaceStore, MARKETPLACE_ACCENTS } from '../storefront/autoMarketplace.js';

export const STOREFRONT_DOMAIN_CONFIG = {
  'retail-shop': {
    label: 'General Store',
    heroTagline: 'Everything You Need, All in One Place',
    heroSubtitle: 'Quality products at unbeatable prices, shop with confidence.',
    ctaLabel: 'Shop Now',
    accentColor: BRAND_PRIMARY,
    accentDark: BRAND_PRIMARY_DARK,
    accentLight: BRAND_50,
    heroImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80&auto=format&fit=crop',
    categoryImages: {
      default: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80&auto=format&fit=crop',
    },
    trustBadges: [
      { icon: 'truck', title: 'Fast Delivery', subtitle: 'Same-day & next-day options' },
      { icon: 'shield', title: 'Secure Payment', subtitle: '100% safe checkout' },
      { icon: 'refresh', title: 'Easy Returns', subtitle: '7-day hassle-free returns' },
      { icon: 'star', title: 'Top Quality', subtitle: 'Handpicked products' },
    ],
    featuredSectionTitle: 'Featured Products',
    newArrivalsSectionTitle: 'New Arrivals',
    bannerText: 'Free shipping on qualifying orders',
  },

  supermarket: {
    label: 'Supermarket',
    heroTagline: 'Fresh. Fast. Affordable.',
    heroSubtitle: 'Your one-stop shop for groceries, fresh produce, and daily essentials.',
    ctaLabel: 'Start Shopping',
    accentColor: '#16a34a',
    accentDark: '#15803d',
    accentLight: '#f0fdf4',
    heroImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=80&auto=format&fit=crop',
    categoryImages: {
      default: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80&auto=format&fit=crop',
    },
    trustBadges: [
      { icon: 'leaf', title: 'Fresh Daily', subtitle: 'Sourced every morning' },
      { icon: 'truck', title: 'Home Delivery', subtitle: 'Within 2-4 hours' },
      { icon: 'tag', title: 'Best Prices', subtitle: 'Price match guarantee' },
      { icon: 'shield', title: 'Quality Assured', subtitle: 'Freshness guaranteed' },
    ],
    featuredSectionTitle: 'Today\'s Deals',
    newArrivalsSectionTitle: 'Fresh Arrivals',
    bannerText: '🌿 Fresh produce delivered to your door',
  },

  pharmacy: {
    label: 'Pharmacy',
    heroTagline: 'Your Health, Our Priority',
    heroSubtitle: 'Genuine medicines, health products, and expert advice, delivered fast.',
    ctaLabel: 'Browse Medicines',
    accentColor: '#16a34a',
    accentDark: '#15803d',
    accentLight: '#f0fdf4',
    heroImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1600&q=80&auto=format&fit=crop',
    categoryImages: {
      default: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80&auto=format&fit=crop',
    },
    trustBadges: [
      { icon: 'shield', title: '100% Genuine', subtitle: 'Verified medicines only' },
      { icon: 'clock', title: 'Fast Dispatch', subtitle: 'Same-day delivery' },
      { icon: 'user', title: 'Expert Advice', subtitle: 'Licensed pharmacists' },
      { icon: 'lock', title: 'Safe & Secure', subtitle: 'Encrypted checkout' },
    ],
    featuredSectionTitle: 'Popular Medicines',
    newArrivalsSectionTitle: 'New Products',
    bannerText: '💊 Genuine medicines, verified & certified',
  },

  'restaurant-cafe': {
    label: 'Restaurant',
    heroTagline: 'Taste the Difference',
    heroSubtitle: 'Freshly prepared meals, delivered hot to your door.',
    ctaLabel: 'Order Now',
    accentColor: '#ea580c',
    accentDark: '#c2410c',
    accentLight: '#fff7ed',
    heroImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80&auto=format&fit=crop',
    categoryImages: {
      default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&auto=format&fit=crop',
    },
    trustBadges: [
      { icon: 'clock', title: '30-Min Delivery', subtitle: 'Hot & fresh guaranteed' },
      { icon: 'star', title: 'Chef\'s Special', subtitle: 'Authentic recipes' },
      { icon: 'leaf', title: 'Fresh Ingredients', subtitle: 'Sourced daily' },
      { icon: 'shield', title: 'Hygienic Kitchen', subtitle: 'Food safety certified' },
    ],
    featuredSectionTitle: 'Chef\'s Picks',
    newArrivalsSectionTitle: 'New on the Menu',
    bannerText: '🍽️ Free delivery on qualifying orders',
  },

  'bakery-confectionery': {
    label: 'Bakery',
    heroTagline: 'Baked Fresh, Every Day',
    heroSubtitle: 'Artisan breads, cakes, and pastries made with love.',
    ctaLabel: 'Order Fresh',
    accentColor: '#d97706',
    accentDark: '#b45309',
    accentLight: '#fffbeb',
    heroImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1600&q=80&auto=format&fit=crop',
    categoryImages: {
      default: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80&auto=format&fit=crop',
    },
    trustBadges: [
      { icon: 'star', title: 'Freshly Baked', subtitle: 'Made every morning' },
      { icon: 'leaf', title: 'Natural Ingredients', subtitle: 'No preservatives' },
      { icon: 'truck', title: 'Same-Day Delivery', subtitle: 'Order by 2 PM' },
      { icon: 'gift', title: 'Custom Orders', subtitle: 'Cakes for every occasion' },
    ],
    featuredSectionTitle: 'Today\'s Bakes',
    newArrivalsSectionTitle: 'New Recipes',
    bannerText: '🥐 Fresh baked goods, order by 2 PM for same-day delivery',
  },

  'electronics-tech': {
    label: 'Electronics',
    heroTagline: 'Power Up Your Life',
    heroSubtitle: 'Latest gadgets, electronics, and tech accessories at the best prices.',
    ctaLabel: 'Explore Tech',
    accentColor: '#7c3aed',
    accentDark: '#6d28d9',
    accentLight: '#f5f3ff',
    heroImage: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1600&q=80&auto=format&fit=crop',
    categoryImages: {
      default: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&q=80&auto=format&fit=crop',
    },
    trustBadges: [
      { icon: 'shield', title: 'Warranty Assured', subtitle: 'Official warranty on all items' },
      { icon: 'refresh', title: '15-Day Returns', subtitle: 'No questions asked' },
      { icon: 'truck', title: 'Insured Shipping', subtitle: 'Safe & secure delivery' },
      { icon: 'star', title: 'Genuine Products', subtitle: 'Authorized dealer' },
    ],
    featuredSectionTitle: 'Top Picks',
    newArrivalsSectionTitle: 'Just Arrived',
    bannerText: '⚡ Official warranty on all electronics',
  },

  'fashion-clothing': {
    label: 'Fashion',
    heroTagline: 'Wear Your Story',
    heroSubtitle: 'Curated fashion for every style, new arrivals, seasonal sale, and everyday essentials.',
    ctaLabel: 'Shop Collection',
    accentColor: '#111827',
    accentDark: '#030712',
    accentLight: '#f3f4f6',
    heroImage: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&q=80&auto=format&fit=crop',
    categoryImages: {
      default: 'https://images.unsplash.com/photo-1521572267360-ee0c2907d7e0?w=600&q=80&auto=format&fit=crop',
    },
    trustBadges: [
      { icon: 'refresh', title: 'Easy Returns', subtitle: '14-day return policy' },
      { icon: 'truck', title: 'Fast Shipping', subtitle: 'Nationwide delivery' },
      { icon: 'star', title: 'Authentic Brands', subtitle: 'Verified quality' },
      { icon: 'shield', title: 'Secure Checkout', subtitle: 'SSL encrypted' },
    ],
    featuredSectionTitle: 'Trending Now',
    newArrivalsSectionTitle: 'New In',
    bannerText: 'Summer sale, up to 50% off selected styles',
  },

  'luxury-fashion': {
    label: 'Luxury',
    heroTagline: 'Timeless Elegance',
    heroSubtitle: 'Designer pieces and fine craftsmanship, curated collections for discerning taste.',
    ctaLabel: 'Explore Collection',
    accentColor: '#c9a227',
    accentDark: '#9a7b1a',
    accentLight: '#faf6ef',
    heroImage: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600&q=80&auto=format&fit=crop',
    categoryImages: {
      default: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&q=80&auto=format&fit=crop',
    },
    trustBadges: [
      { icon: 'shield', title: 'Certified Quality', subtitle: 'Hallmarked & authenticated' },
      { icon: 'truck', title: 'Insured Shipping', subtitle: 'Secure, tracked delivery' },
      { icon: 'gift', title: 'Gift Packaging', subtitle: 'Elegant presentation' },
      { icon: 'star', title: 'Curated Edit', subtitle: 'Designer & fine pieces' },
    ],
    featuredSectionTitle: 'Signature Collection',
    newArrivalsSectionTitle: 'New Arrivals',
    bannerText: 'Exclusive pieces, limited editions & bridal collections',
  },

  'hardware-parts': {
    label: 'Auto & Hardware',
    heroTagline: 'Parts Ready To Ship',
    heroSubtitle: 'Original, OEM, and aftermarket parts, filters, oils, and accessories for every vehicle.',
    ctaLabel: 'Shop Parts',
    accentColor: '#b45309',
    accentDark: '#92400e',
    accentLight: '#fffbeb',
    heroImage: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1600&q=80&auto=format&fit=crop',
    categoryImages: {
      default: 'https://images.unsplash.com/photo-1625047509248-ec889cbff817?w=600&q=80&auto=format&fit=crop',
    },
    trustBadges: [
      { icon: 'shield', title: 'Genuine Parts', subtitle: 'Authorized distributors' },
      { icon: 'truck', title: 'Fast Dispatch', subtitle: 'Ready to ship' },
      { icon: 'star', title: 'Top Brands', subtitle: 'Shell · Bosch · OEM' },
      { icon: 'user', title: 'Workshop Network', subtitle: 'Partner garages' },
    ],
    featuredSectionTitle: 'Featured Products',
    newArrivalsSectionTitle: 'New Stock',
    bannerText: '🔧 Original & performance parts, door-to-door delivery',
  },

  'vehicle-dealership': {
    label: 'Vehicle Dealership',
    heroTagline: 'Drive Your Dream Car Home',
    heroSubtitle: 'New, pre-owned, and electric vehicles, finance, leasing, and trade-in under one roof.',
    ctaLabel: 'Explore Inventory',
    accentColor: '#D4AF37',
    accentDark: '#0a0a0a',
    accentLight: '#FAF6EF',
    heroImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1600&q=80&auto=format&fit=crop',
    categoryImages: {
      default: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80&auto=format&fit=crop',
    },
    trustBadges: [
      { icon: 'shield', title: 'Authorised Dealer', subtitle: 'Factory warranty & support' },
      { icon: 'star', title: 'Certified Pre-Owned', subtitle: 'Full inspection reports' },
      { icon: 'credit', title: 'In-House Finance', subtitle: 'Fast approval options' },
      { icon: 'truck', title: 'Islandwide Delivery', subtitle: 'Registration assistance' },
    ],
    featuredSectionTitle: 'Featured Vehicles',
    newArrivalsSectionTitle: 'Latest Arrivals',
    bannerText: 'Book a test drive, new & pre-owned from authorised brands',
  },

  'auto-marketplace': {
    label: 'Tenvo Auto Marketplace',
    heroTagline: 'Tenvo Auto Marketplace',
    heroSubtitle:
      'New, used, and rental listings, e-shop parts, and motoring resources on one Tenvo-branded portal.',
    ctaLabel: 'Explore listings',
    accentColor: '#E30613',
    accentDark: '#003DA5',
    accentLight: '#FFF0F0',
    heroImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1600&q=80&auto=format&fit=crop',
    categoryImages: {
      default: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80&auto=format&fit=crop',
    },
    trustBadges: [
      { icon: 'shield', title: 'Verified Listings', subtitle: 'Dealer & owner listings' },
      { icon: 'star', title: 'Largest Selection', subtitle: 'New, used & rental' },
      { icon: 'tag', title: 'Promotions', subtitle: 'Dealer and portal offers' },
      { icon: 'truck', title: 'e-Shop Parts', subtitle: 'Tyres, batteries & more' },
    ],
    featuredSectionTitle: 'Featured Listings',
    newArrivalsSectionTitle: 'Latest Listings',
    bannerText: 'Tenvo demo portal: listings, promotions, and e-shop accessories',
  },

  default: {
    label: 'Store',
    heroTagline: 'Shop Smart, Live Better',
    heroSubtitle: 'Discover amazing products at great prices.',
    ctaLabel: 'Shop Now',
    accentColor: BRAND_PRIMARY,
    accentDark: BRAND_PRIMARY_DARK,
    accentLight: BRAND_50,
    heroImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80&auto=format&fit=crop',
    categoryImages: {
      default: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80&auto=format&fit=crop',
    },
    trustBadges: [
      { icon: 'truck', title: 'Fast Delivery', subtitle: 'Quick & reliable shipping' },
      { icon: 'shield', title: 'Secure Payment', subtitle: '100% safe checkout' },
      { icon: 'refresh', title: 'Easy Returns', subtitle: 'Hassle-free returns' },
      { icon: 'star', title: 'Quality Products', subtitle: 'Handpicked for you' },
    ],
    featuredSectionTitle: 'Featured Products',
    newArrivalsSectionTitle: 'New Arrivals',
    bannerText: 'Free shipping on qualifying orders',
  },
};

/** Keys that map 1:1 to `STOREFRONT_DOMAIN_CONFIG` (excluding `default`). */
const STOREFRONT_TEMPLATE_KEYS = new Set([
  'retail-shop',
  'supermarket',
  'pharmacy',
  'restaurant-cafe',
  'bakery-confectionery',
  'electronics-tech',
  'fashion-clothing',
  'luxury-fashion',
  'hardware-parts',
  'vehicle-dealership',
  'auto-marketplace',
]);

/**
 * Maps `businesses.category` / domainKnowledge slugs → storefront vertical key.
 * Keeps hero, badges, and placeholders aligned for 55+ registered business types.
 */
export const STOREFRONT_CATEGORY_TO_VERTICAL = {
  // retail.js
  grocery: 'supermarket',
  fmcg: 'supermarket',
  ecommerce: 'retail-shop',
  garments: 'fashion-clothing',
  mobile: 'electronics-tech',
  'electronics-goods': 'electronics-tech',
  'boutique-fashion': 'luxury-fashion',
  'bookshop-stationery': 'retail-shop',
  'leather-footwear': 'fashion-clothing',
  // industrial.js, general B2C store tone unless clearly retail
  chemical: 'default',
  'paper-mill': 'default',
  paint: 'default',
  'plastic-manufacturing': 'default',
  'textile-mill': 'fashion-clothing',
  'printing-packaging': 'retail-shop',
  furniture: 'retail-shop',
  'ceramics-tiles': 'retail-shop',
  'flour-mill': 'default',
  'rice-mill': 'default',
  'sugar-mill': 'default',
  // specialized.js
  'auto-parts': 'hardware-parts',
  'auto-marketplace': 'auto-marketplace',
  'vehicle-dealership': 'vehicle-dealership',
  'computer-hardware': 'electronics-tech',
  electrical: 'electronics-tech',
  agriculture: 'default',
  'gems-jewellery': 'luxury-fashion',
  'real-estate': 'default',
  'hardware-sanitary': 'hardware-parts',
  'hardware-store': 'hardware-parts',
  hardware: 'hardware-parts',
  'poultry-farm': 'default',
  'solar-energy': 'electronics-tech',
  'courier-logistics': 'default',
  'wholesale-distribution': 'retail-shop',
  'petrol-pump': 'default',
  'cold-storage': 'default',
  'book-publishing': 'retail-shop',
  'steel-iron': 'default',
  'construction-material': 'retail-shop',
  'dairy-farm': 'supermarket',
  // services.js
  travel: 'default',
  'auto-workshop': 'hardware-parts',
  'diagnostic-lab': 'pharmacy',
  'gym-fitness': 'default',
  'hotel-guesthouse': 'default',
  'event-management': 'default',
  'rent-a-car': 'default',
  'school-library': 'retail-shop',
  'clinics-healthcare': 'pharmacy',
  'logistics-transport': 'default',
  // expansion.js
  'salon-spa': 'retail-shop',
  'dental-clinic': 'pharmacy',
  'veterinary-clinic': 'pharmacy',
  'bakery-confectionery': 'bakery-confectionery',
  pharmacy: 'pharmacy',
  'mobile-phone-shop': 'electronics-tech',
  'mobile-repairing': 'electronics-tech',
  // edu_livestock.js
  'school-education': 'default',
  'livestock-cattle': 'default',
  // textile.js
  'textile-wholesale': 'fashion-clothing',
  textile: 'fashion-clothing',
  garments: 'fashion-clothing',
  apparel: 'fashion-clothing',
  restaurant: 'restaurant-cafe',
  cafe: 'restaurant-cafe',
};

/**
 * Keyword inference for 55+ `businesses.category` slugs not explicitly mapped above.
 * @param {string} c normalized lowercase slug
 * @returns {keyof typeof STOREFRONT_DOMAIN_CONFIG | null}
 */
function inferVerticalFromCategorySlug(c) {
  if (!c) return null;
  if (/bakery|confectionery/.test(c)) return 'bakery-confectionery';
  if (/restaurant|cafe|pizza|hotel-guesthouse|food-service|meal|kitchen|hospitality/.test(c)) {
    return 'restaurant-cafe';
  }
  if (/pharmacy|clinic|dental|healthcare|veterinary|diagnostic|lab|hospital/.test(c)) return 'pharmacy';
  if (/supermarket|grocery|fmcg|dairy-farm|produce/.test(c)) return 'supermarket';
  if (/jewell|jewelry|gems/.test(c)) return 'luxury-fashion';
  if (/boutique/.test(c)) return 'luxury-fashion';
  if (/garment|fashion|textile|leather|apparel/.test(c)) {
    return 'fashion-clothing';
  }
  if (/vehicle-dealership|car-dealer|auto-dealer|dealership|vincar/.test(c)) return 'vehicle-dealership';
  if (/auto-marketplace|car-marketplace|sgcarmart/.test(c)) return 'auto-marketplace';
  if (/hardware|auto-parts|sanitary|automotive|workshop/.test(c)) return 'hardware-parts';
  if (/electronics|mobile|computer|solar|appliance|tech/.test(c)) return 'electronics-tech';
  if (/salon|spa|beauty|barber/.test(c)) return 'retail-shop';
  return null;
}

/**
 * Resolve domainKnowledge / DB category slug → storefront template key.
 * @param {string | null | undefined} category
 * @returns {keyof typeof STOREFRONT_DOMAIN_CONFIG}
 */
export function resolveStorefrontVertical(category) {
  if (!category || typeof category !== 'string') return 'default';
  const c = category.trim().toLowerCase();
  if (STOREFRONT_TEMPLATE_KEYS.has(c)) return c;
  const mapped = STOREFRONT_CATEGORY_TO_VERTICAL[c];
  if (mapped && STOREFRONT_DOMAIN_CONFIG[mapped]) return mapped;
  const inferred = inferVerticalFromCategorySlug(c);
  if (inferred && STOREFRONT_DOMAIN_CONFIG[inferred]) return inferred;
  return 'default';
}

export function getDomainConfig(category) {
  const canonical = resolveDomainKey(category);
  const key = resolveStorefrontVertical(canonical);
  return STOREFRONT_DOMAIN_CONFIG[key] || STOREFRONT_DOMAIN_CONFIG.default;
}

/**
 * Placeholder image when a product has no `image_url` (domain-aware).
 */
export function getStorefrontProductPlaceholder(category) {
  const cfg = getDomainConfig(category);
  return cfg.categoryImages?.default || cfg.heroImage;
}

/**
 * Get the effective accent color for a store.
 * Priority: settings.brand.primaryColor > domain default
 */
export function getStoreAccentColor(settings, category) {
  if (settings?.brand?.primaryColor) return settings.brand.primaryColor;
  if (isAutoDealershipStore(category)) return DEALERSHIP_ACCENTS.accent;
  if (isAutoMarketplaceStore(category)) return MARKETPLACE_ACCENTS.accent;
  const luxuryPalette = getLuxuryAccentPalette(category);
  if (luxuryPalette) return luxuryPalette.accent;
  return getDomainConfig(category).accentColor;
}

/**
 * Effective accent dark/light for luxury canonicals (owner brand color still wins for accent only).
 * @param {object} [settings]
 * @param {string | null | undefined} category
 */
export function getStoreAccentPalette(settings, category) {
  const cfg = getDomainConfig(category);
  const luxury = getLuxuryAccentPalette(category);
  const dealership = isAutoDealershipStore(category) ? DEALERSHIP_ACCENTS : null;
  const marketplace = isAutoMarketplaceStore(category) ? MARKETPLACE_ACCENTS : null;
  const accent = getStoreAccentColor(settings, category);
  return {
    accent,
    accentDark: marketplace?.accentDark || dealership?.accentDark || luxury?.accentDark || cfg.accentDark || accent,
    accentLight: marketplace?.accentLight || dealership?.accentLight || luxury?.accentLight || cfg.accentLight || '#f8fafc',
  };
}
