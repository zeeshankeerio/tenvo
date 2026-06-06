/**
 * Storefront domain configuration
 * Maps business category → hero content, color palette, Unsplash image queries,
 * trust badges, and section labels for the public store.
 */

export const STOREFRONT_DOMAIN_CONFIG = {
  'retail-shop': {
    label: 'General Store',
    heroTagline: 'Everything You Need, All in One Place',
    heroSubtitle: 'Quality products at unbeatable prices — shop with confidence.',
    ctaLabel: 'Shop Now',
    accentColor: '#e34242',
    accentDark: '#b91c1c',
    accentLight: '#fef2f2',
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
    heroSubtitle: 'Genuine medicines, health products, and expert advice — delivered fast.',
    ctaLabel: 'Browse Medicines',
    accentColor: '#0284c7',
    accentDark: '#0369a1',
    accentLight: '#f0f9ff',
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
    bannerText: '💊 Genuine medicines — verified & certified',
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
    bannerText: '🥐 Fresh baked goods — order by 2 PM for same-day delivery',
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
    heroSubtitle: 'Curated fashion for every style, every occasion.',
    ctaLabel: 'Shop the Look',
    accentColor: '#db2777',
    accentDark: '#be185d',
    accentLight: '#fdf2f8',
    heroImage: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&q=80&auto=format&fit=crop',
    categoryImages: {
      default: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&q=80&auto=format&fit=crop',
    },
    trustBadges: [
      { icon: 'refresh', title: 'Easy Returns', subtitle: '14-day return policy' },
      { icon: 'truck', title: 'Free Shipping', subtitle: 'On qualifying orders' },
      { icon: 'star', title: 'Authentic Brands', subtitle: 'Verified sellers only' },
      { icon: 'shield', title: 'Secure Checkout', subtitle: 'SSL encrypted' },
    ],
    featuredSectionTitle: 'Trending Now',
    newArrivalsSectionTitle: 'New Collection',
    bannerText: '👗 New collection just dropped — shop the latest styles',
  },

  default: {
    label: 'Store',
    heroTagline: 'Shop Smart, Live Better',
    heroSubtitle: 'Discover amazing products at great prices.',
    ctaLabel: 'Shop Now',
    accentColor: '#e34242',
    accentDark: '#b91c1c',
    accentLight: '#fef2f2',
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
  'boutique-fashion': 'fashion-clothing',
  'bookshop-stationery': 'retail-shop',
  'leather-footwear': 'fashion-clothing',
  // industrial.js — general B2C store tone unless clearly retail
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
  'auto-parts': 'retail-shop',
  'computer-hardware': 'electronics-tech',
  electrical: 'electronics-tech',
  agriculture: 'default',
  'gems-jewellery': 'fashion-clothing',
  'real-estate': 'default',
  'hardware-sanitary': 'retail-shop',
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
  'auto-workshop': 'retail-shop',
  'diagnostic-lab': 'pharmacy',
  'gym-fitness': 'default',
  'hotel-guesthouse': 'default',
  'event-management': 'default',
  'rent-a-car': 'default',
  'school-library': 'retail-shop',
  'clinics-healthcare': 'pharmacy',
  'logistics-transport': 'default',
  // expansion.js
  'salon-spa': 'default',
  'dental-clinic': 'pharmacy',
  'veterinary-clinic': 'default',
  // edu_livestock.js
  'school-education': 'default',
  'livestock-cattle': 'default',
  'mobile-repairing': 'electronics-tech',
  // textile.js
  'textile-wholesale': 'fashion-clothing',
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
  if (/garment|fashion|boutique|jewell|jewelry|textile-wholesale|textile-mill|leather|apparel/.test(c)) {
    return 'fashion-clothing';
  }
  if (/electronics|mobile|computer|solar|hardware|appliance|tech/.test(c)) return 'electronics-tech';
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
  const key = resolveStorefrontVertical(category);
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
  return settings?.brand?.primaryColor || getDomainConfig(category).accentColor;
}
