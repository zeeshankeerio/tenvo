/**
 * Domain-aware storefront landing, quick actions, editorial spotlights, deal strips.
 * Inspired by professional B2C patterns (pharmacy, fashion, auto parts, marketplace deals).
 */
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { resolveStorefrontVertical, getDomainConfig } from '../config/storefrontDomains.js';
import { getCanonicalLandingOverrides } from './canonicalLanding.js';
import { getExtendedCanonicalLanding } from './canonicalStorefrontVariants.js';
import { localizeServicePills } from './storefrontRegional.js';

/** @typedef {{ id: string; label: string; href: string; icon: string; description?: string }} QuickAction */
/** @typedef {{ id: string; eyebrow?: string; title: string; subtitle: string; cta: string; href: string; image?: string; tone?: 'light' | 'dark' | 'accent' }} EditorialSpotlight */

/**
 * @param {string | null | undefined} category businesses.category
 * @param {string} businessDomain
 * @param {object} [settings]
 * @param {{ country?: string; category?: string }} [business]
 */
export function getDomainLanding(category, businessDomain, settings = {}, business = {}) {
  const canonical = resolveDomainKey(category);
  const vertical = resolveStorefrontVertical(canonical);
  const domainCfg = getDomainConfig(canonical);
  const base = `/store/${businessDomain}`;
  const country = business?.country || settings?.contact?.country || null;

  /** @type {Record<string, { quickActions: QuickAction[]; spotlights: EditorialSpotlight[]; dealStrip?: { badge: string; title: string; subtitle?: string; cta: string; href: string }; servicePills?: string[]; categoryHeading?: string; gridTitle?: string }>} */
  const presets = {
    pharmacy: {
      categoryHeading: 'Shop by Health Need',
      gridTitle: 'Top picks this week',
      dealStrip: {
        badge: 'Pharmacy Direct',
        title: settings?.announcement || 'Genuine products · Pharmacist support · Fast delivery',
        subtitle: 'Free delivery on qualifying orders',
        cta: 'Shop bestsellers',
        href: `${base}/products?sort=featured`,
      },
      servicePills: ['100% Genuine', 'Licensed advice', 'Secure checkout', 'Fast delivery'],
      quickActions: [
        { id: 'bestsellers', label: 'Bestsellers', href: `${base}/products?sort=featured`, icon: 'star', description: 'Most loved this week' },
        { id: 'vitamins', label: 'Vitamins', href: `${base}/products?category=vitamins`, icon: 'leaf', description: 'Wellness & immunity' },
        { id: 'pain', label: 'Pain Relief', href: `${base}/products?category=pain-relief`, icon: 'heart', description: 'OTC essentials' },
        { id: 'contact', label: 'Ask Pharmacist', href: `${base}/contact`, icon: 'phone', description: 'WhatsApp or call' },
      ],
      spotlights: [
        {
          id: 'wellness',
          eyebrow: 'Wellness',
          title: 'Support your health, every day',
          subtitle: 'Vitamins, probiotics, and pharmacy essentials, curated for your routine.',
          cta: 'Shop wellness',
          href: `${base}/products?sort=featured`,
          tone: 'accent',
        },
      ],
    },
    'fashion-clothing': {
      categoryHeading: 'Shop by Category',
      gridTitle: 'Trending now',
      dealStrip: {
        badge: 'Season Sale',
        title: 'Up to 40% off selected styles',
        subtitle: 'New arrivals & summer essentials',
        cta: 'Shop the sale',
        href: `${base}/products?onSale=true`,
      },
      servicePills: ['Easy returns', 'Authentic brands', 'Secure payment', 'Fast shipping'],
      quickActions: [
        { id: 'new', label: 'New In', href: `${base}/products?sort=newest`, icon: 'sparkles', description: 'Latest drops' },
        { id: 'sale', label: 'Sale', href: `${base}/products?onSale=true`, icon: 'tag', description: 'Up to 50% off' },
        { id: 'mens', label: 'Mens', href: `${base}/products`, icon: 'shirt', description: 'Shirts & more' },
        { id: 'accessories', label: 'Accessories', href: `${base}/products`, icon: 'gift', description: 'Complete the look' },
      ],
      spotlights: [
        {
          id: 'collection',
          eyebrow: 'New Collection',
          title: 'Wear your story',
          subtitle: 'Premium cotton, sharp fits, and everyday essentials, styled for modern retail.',
          cta: 'Explore collection',
          href: `${base}/products?sort=newest`,
          tone: 'dark',
        },
      ],
    },
    'luxury-fashion': {
      categoryHeading: 'Curated collections',
      gridTitle: 'Signature pieces',
      dealStrip: {
        badge: 'Exclusive',
        title: 'Limited editions & bridal collections',
        subtitle: 'Designer edits · Certified quality · Insured delivery',
        cta: 'Explore collection',
        href: `${base}/products?sort=featured`,
      },
      servicePills: ['Certified quality', 'Insured shipping', 'Gift packaging', 'Secure checkout'],
      quickActions: [
        { id: 'featured', label: 'Signature', href: `${base}/products?sort=featured`, icon: 'star', description: 'Curated picks' },
        { id: 'new', label: 'New arrivals', href: `${base}/products?sort=newest`, icon: 'sparkles', description: 'Latest pieces' },
        { id: 'bridal', label: 'Bridal', href: `${base}/products?category=bridal`, icon: 'gift', description: 'Wedding & formal' },
        { id: 'contact', label: 'Consultation', href: `${base}/contact`, icon: 'phone', description: 'Book styling' },
      ],
      spotlights: [
        {
          id: 'heritage',
          eyebrow: 'Fine craftsmanship',
          title: 'Pieces made to be treasured',
          subtitle: 'Hallmarked metals, designer fabrics, and heirloom-quality finishes.',
          cta: 'View signature edit',
          href: `${base}/products?sort=featured`,
          tone: 'dark',
        },
      ],
    },
    supermarket: {
      categoryHeading: 'Aisle shortcuts',
      gridTitle: 'Today\'s deals',
      dealStrip: {
        badge: 'Fresh Deals',
        title: 'Groceries & daily essentials at best prices',
        subtitle: 'Fresh produce · Beverages · Pantry staples',
        cta: 'Start shopping',
        href: `${base}/products`,
      },
      servicePills: ['Fresh daily', 'Best prices', 'Home delivery', 'Quality assured'],
      quickActions: [
        { id: 'deals', label: 'Deals', href: `${base}/products?onSale=true`, icon: 'tag', description: 'Save more today' },
        { id: 'beverages', label: 'Beverages', href: `${base}/products?category=beverages`, icon: 'cup', description: 'Drinks & tea' },
        { id: 'snacks', label: 'Snacks', href: `${base}/products?category=snacks`, icon: 'package', description: 'Quick bites' },
        { id: 'fresh', label: 'Fresh', href: `${base}/products?category=fresh-produce`, icon: 'leaf', description: 'Produce & dairy' },
      ],
      spotlights: [],
    },
    'hardware-parts': {
      categoryHeading: 'Browse departments',
      gridTitle: 'Featured parts & accessories',
      dealStrip: {
        badge: 'Ready to ship',
        title: 'Original & OEM parts, delivered to your door',
        subtitle: 'Filters · Lubricants · Brakes · Electrical',
        cta: 'Shop featured',
        href: `${base}/products?sort=featured`,
      },
      servicePills: ['Genuine parts', 'Workshop network', 'Fast dispatch', 'Expert support'],
      quickActions: [
        { id: 'filters', label: 'Filters', href: `${base}/products?category=filters`, icon: 'filter', description: 'Oil & air filters' },
        { id: 'lubricants', label: 'Lubricants', href: `${base}/products?category=lubricants`, icon: 'droplet', description: 'Engine oils & fluids' },
        { id: 'wipers', label: 'Wipers', href: `${base}/products?category=wipers`, icon: 'wiper', description: 'Blades & refills' },
        { id: 'brakes', label: 'Brakes', href: `${base}/products?category=brakes`, icon: 'disc', description: 'Pads & discs' },
      ],
      spotlights: [
        {
          id: 'performance',
          eyebrow: 'Performance',
          title: 'Upgrade with confidence',
          subtitle: 'Quality parts for every make, sourced from trusted distributors.',
          cta: 'Browse catalog',
          href: `${base}/products`,
          tone: 'dark',
        },
      ],
    },
    'restaurant-cafe': {
      categoryHeading: 'Menu categories',
      gridTitle: 'Chef\'s picks',
      dealStrip: {
        badge: 'Hot & Fresh',
        title: 'Order now, delivered in 30 minutes',
        cta: 'View menu',
        href: `${base}/products`,
      },
      servicePills: ['30-min delivery', 'Fresh ingredients', 'Hygienic kitchen', 'Chef specials'],
      quickActions: [
        { id: 'mains', label: 'Mains', href: `${base}/products`, icon: 'utensils', description: 'Signature dishes' },
        { id: 'deals', label: 'Combos', href: `${base}/products?onSale=true`, icon: 'tag', description: 'Bundle deals' },
        { id: 'new', label: 'New', href: `${base}/products?sort=newest`, icon: 'sparkles', description: 'New on menu' },
        { id: 'contact', label: 'Catering', href: `${base}/contact`, icon: 'phone', description: 'Bulk orders' },
      ],
      spotlights: [],
    },
    'electronics-tech': {
      categoryHeading: 'Shop tech',
      gridTitle: 'Top electronics',
      dealStrip: {
        badge: 'Tech Deals',
        title: 'Latest gadgets with official warranty',
        cta: 'Explore tech',
        href: `${base}/products?sort=featured`,
      },
      servicePills: ['Official warranty', 'Genuine products', 'Insured shipping', 'Easy returns'],
      quickActions: [
        { id: 'featured', label: 'Top Picks', href: `${base}/products?sort=featured`, icon: 'star', description: 'Best sellers' },
        { id: 'sale', label: 'Deals', href: `${base}/products?onSale=true`, icon: 'tag', description: 'Limited offers' },
        { id: 'audio', label: 'Audio', href: `${base}/products?category=electronics`, icon: 'headphones', description: 'Earbuds & more' },
        { id: 'support', label: 'Support', href: `${base}/contact`, icon: 'phone', description: 'Pre-sales help' },
      ],
      spotlights: [],
    },
    'retail-shop': {
      categoryHeading: 'Shop by Category',
      gridTitle: 'Featured Products',
      dealStrip: {
        badge: 'Today\'s Deals',
        title: settings?.announcement || domainCfg.bannerText || 'Quality products at great prices',
        cta: domainCfg.ctaLabel || 'Shop Now',
        href: `${base}/products?onSale=true`,
      },
      servicePills: domainCfg.trustBadges?.slice(0, 4).map((b) => b.title) || [],
      quickActions: [
        { id: 'all', label: 'Shop All', href: `${base}/products`, icon: 'shopping', description: 'Browse catalog' },
        { id: 'sale', label: 'Deals', href: `${base}/products?onSale=true`, icon: 'tag', description: 'Limited offers' },
        { id: 'new', label: 'New Arrivals', href: `${base}/products?sort=newest`, icon: 'sparkles', description: 'Latest products' },
        { id: 'orders', label: 'Track Order', href: `${base}/orders`, icon: 'truck', description: 'Order status' },
      ],
      spotlights: [],
    },
    'bakery-confectionery': {
      categoryHeading: 'Fresh bakes',
      gridTitle: 'Today\'s bakes',
      dealStrip: {
        badge: 'Fresh daily',
        title: 'Artisan breads, cakes & pastries, baked fresh',
        subtitle: 'Order by 2 PM for same-day pickup',
        cta: 'Order fresh',
        href: `${base}/products`,
      },
      servicePills: ['Baked fresh daily', 'Natural ingredients', 'Same-day pickup', 'Custom orders'],
      quickActions: [
        { id: 'cakes', label: 'Cakes', href: `${base}/products?category=cakes`, icon: 'gift', description: 'Celebration cakes' },
        { id: 'bread', label: 'Breads', href: `${base}/products?category=bread`, icon: 'package', description: 'Daily loaves' },
        { id: 'pastries', label: 'Pastries', href: `${base}/products?category=pastries`, icon: 'sparkles', description: 'Sweet treats' },
        { id: 'custom', label: 'Custom order', href: `${base}/contact`, icon: 'phone', description: 'Events & weddings' },
      ],
      spotlights: [
        {
          id: 'celebration',
          eyebrow: 'Celebrations',
          title: 'Cakes made to order',
          subtitle: 'Birthdays, weddings, and corporate events, fresh and beautifully finished.',
          cta: 'Request custom cake',
          href: `${base}/contact`,
          tone: 'accent',
        },
      ],
    },
  };

  let preset = presets[vertical] ?? {
    categoryHeading: 'Shop by Category',
    gridTitle: domainCfg.featuredSectionTitle || 'Featured Products',
    dealStrip: {
      badge: 'Today\'s Deals',
      title: settings?.announcement || domainCfg.bannerText || 'Quality products at great prices',
      cta: domainCfg.ctaLabel || 'Shop Now',
      href: `${base}/products?onSale=true`,
    },
    servicePills: domainCfg.trustBadges?.slice(0, 4).map((b) => b.title) || [],
    quickActions: [
      { id: 'all', label: 'Shop All', href: `${base}/products`, icon: 'shopping', description: 'Browse catalog' },
      { id: 'sale', label: 'Deals', href: `${base}/products?onSale=true`, icon: 'tag', description: 'Limited offers' },
      { id: 'new', label: 'New Arrivals', href: `${base}/products?sort=newest`, icon: 'sparkles', description: 'Latest products' },
      { id: 'contact', label: 'Help', href: `${base}/contact`, icon: 'phone', description: 'Customer care' },
    ],
    spotlights: [],
  };

  const canonicalOverride = getCanonicalLandingOverrides(canonical, base);
  const extendedOverride = getExtendedCanonicalLanding(canonical, base);
  const mergeLanding = (basePreset, patch) => {
    if (!patch) return basePreset;
    return {
      ...basePreset,
      ...patch,
      dealStrip: patch.dealStrip ?? basePreset.dealStrip,
      quickActions: patch.quickActions ?? basePreset.quickActions,
      spotlights: patch.spotlights ?? basePreset.spotlights,
      servicePills: patch.servicePills ?? basePreset.servicePills,
    };
  };

  if (canonicalOverride) {
    preset = mergeLanding(preset, canonicalOverride);
  }
  if (extendedOverride) {
    preset = mergeLanding(preset, extendedOverride);
  }

  if (preset.servicePills?.length) {
    preset = {
      ...preset,
      servicePills: localizeServicePills(preset.servicePills, country),
    };
  }

  return { vertical, canonical, ...preset };
}
