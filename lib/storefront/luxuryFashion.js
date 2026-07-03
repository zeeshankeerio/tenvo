/**
 * Luxury fashion / jewellery / textile storefront helpers.
 * Used for hero styling, theme accents, and domain-aware copy.
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { normalizeKey } from '@/lib/utils/domainHelpers';

/** Canonical keys that receive the elevated luxury storefront treatment. */
export const LUXURY_FASHION_CANONICALS = new Set([
  'gems-jewellery',
  'boutique-fashion',
  'garments',
  'textile-wholesale',
  'textile-mill',
  'leather-footwear',
]);

/** @typedef {'jewellery' | 'boutique' | 'textile' | 'leather'} LuxuryFashionVariant */

/**
 * @param {string | null | undefined} category
 */
export function isLuxuryFashionStore(category) {
  const canonical = resolveDomainKey(category);
  return LUXURY_FASHION_CANONICALS.has(canonical);
}

/**
 * @param {string | null | undefined} category
 * @returns {LuxuryFashionVariant | null}
 */
export function getLuxuryFashionVariant(category) {
  const canonical = resolveDomainKey(category);
  switch (canonical) {
    case 'gems-jewellery':
      return 'jewellery';
    case 'boutique-fashion':
    case 'garments':
      return 'boutique';
    case 'textile-wholesale':
    case 'textile-mill':
      return 'textile';
    case 'leather-footwear':
      return 'leather';
    default:
      return null;
  }
}

/** Human-readable product specs from clothing domain_data for storefront detail tabs. */
export function buildClothingSpecifications(domainData = {}) {
  const dd = domainData && typeof domainData === 'object' ? domainData : {};
  /** @type {Record<string, string>} */
  const out = {};
  const fields = [
    ['fabrictype', 'Fabric'],
    ['sourcing', 'Sourcing'],
    ['season', 'Season'],
    ['stitchingstatus', 'Stitching'],
    ['stitchingtype', 'Stitching type'],
    ['sizecolormatrix', 'Size / color'],
    ['designertracking', 'Designer'],
    ['designer', 'Designer'],
    ['collection', 'Collection'],
    ['articleno', 'Article no'],
    ['designno', 'Design no'],
    ['korafinished', 'Kora / finished'],
    ['yarntype', 'Yarn type'],
    ['countgsm', 'Count / GSM'],
  ];
  for (const [key, label] of fields) {
    const val = dd[key] ?? dd[normalizeKey(key)];
    if (val != null && String(val).trim()) {
      out[label] = String(val).trim();
    }
  }
  if (out.Sourcing) {
    out.Sourcing = out.Sourcing.charAt(0).toUpperCase() + out.Sourcing.slice(1);
  }
  return out;
}

/** @type {Record<LuxuryFashionVariant, { accent: string; accentDark: string; accentLight: string }>} */
export const LUXURY_ACCENTS = {
  jewellery: { accent: '#c9a227', accentDark: '#9a7b1a', accentLight: '#faf6ef' },
  boutique: { accent: '#1c1917', accentDark: '#0c0a09', accentLight: '#f5f5f4' },
  textile: { accent: '#9a3412', accentDark: '#7c2d12', accentLight: '#fff7ed' },
  leather: { accent: '#78350f', accentDark: '#451a03', accentLight: '#fffbeb' },
};

/**
 * @param {string | null | undefined} category
 */
export function getLuxuryAccentPalette(category) {
  const variant = getLuxuryFashionVariant(category);
  if (!variant) return null;
  return LUXURY_ACCENTS[variant];
}

/** @type {Record<LuxuryFashionVariant, Array<{ title: string; subtitle: string; image: string; eyebrow?: string }>>} */
export const LUXURY_HERO_SLIDES = {
  jewellery: [
    {
      eyebrow: 'Fine jewellery',
      title: 'Timeless pieces, crafted to last',
      subtitle: 'Certified gold, diamonds, and bridal sets, hallmarked quality with insured delivery.',
      image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600&q=82&auto=format&fit=crop',
    },
    {
      eyebrow: 'Bridal heritage',
      title: 'Celebrate every milestone',
      subtitle: 'Wedding sets, engagement rings, and heirloom designs for your special day.',
      image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1600&q=82&auto=format&fit=crop',
    },
  ],
  boutique: [
    {
      eyebrow: 'Designer edit',
      title: 'Curated style for every occasion',
      subtitle: 'Limited-edition pieces, runway-inspired silhouettes, and personal styling.',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=82&auto=format&fit=crop',
    },
    {
      eyebrow: 'New season',
      title: 'Arrivals from leading labels',
      subtitle: 'Discover designer pret, luxury formals, and accessories that complete the look.',
      image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1600&q=82&auto=format&fit=crop',
    },
  ],
  textile: [
    {
      eyebrow: 'Premium fabrics',
      title: 'Lawn, silk & bridal collections',
      subtitle: 'Wholesale fabrics trusted by retailers, digital prints, unstitched, and formal ranges.',
      image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1600&q=82&auto=format&fit=crop',
    },
    {
      eyebrow: 'Seasonal edit',
      title: 'Trending textures & colours',
      subtitle: 'Khaddar, cotton, and luxury bridal, sourced for quality and consistency.',
      image: 'https://images.unsplash.com/photo-1583292650118-0c8d2f9a9f2d?w=1600&q=82&auto=format&fit=crop',
    },
  ],
  leather: [
    {
      eyebrow: 'Crafted leather',
      title: 'Footwear & leather goods',
      subtitle: 'Hand-finished shoes, bags, and belts, durable materials, refined details.',
      image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1600&q=82&auto=format&fit=crop',
    },
    {
      eyebrow: 'New arrivals',
      title: 'Step into quality',
      subtitle: 'Seasonal styles in premium leather, from everyday essentials to statement pieces.',
      image: 'https://images.unsplash.com/photo-1520639882103-d7964dc5a26a?w=1600&q=82&auto=format&fit=crop',
    },
  ],
};

/** @type {Record<LuxuryFashionVariant, string[]>} */
export const LUXURY_TRUST_PILLS = {
  jewellery: ['Certified gold', 'Insured shipping', 'Gift packaging', 'Hallmark assured'],
  boutique: ['Designer labels', 'Easy returns', 'Secure checkout', 'Personal styling'],
  textile: ['Wholesale pricing', 'Bulk orders', 'Quality fabrics', 'Nationwide delivery'],
  leather: ['Genuine leather', 'Durable craft', 'Easy returns', 'Secure checkout'],
};

/**
 * Optional background image per hero category tile.
 * @param {LuxuryFashionVariant} variant
 * @param {string} label
 */
export function getLuxuryTileImage(variant, label) {
  /** @type {Record<LuxuryFashionVariant, Record<string, string>>} */
  const map = {
    jewellery: {
      Gold: 'https://images.unsplash.com/photo-1603561596112-0a132b757442?w=800&q=80&auto=format&fit=crop',
      Diamonds: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80&auto=format&fit=crop',
      Bridal: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80&auto=format&fit=crop',
      Gifts: 'https://images.unsplash.com/photo-1611591437281-460bfecff82f?w=800&q=80&auto=format&fit=crop',
    },
    boutique: {
      'New In': 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80&auto=format&fit=crop',
      Designer: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80&auto=format&fit=crop',
      Sale: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80&auto=format&fit=crop',
      Accessories: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80&auto=format&fit=crop',
    },
    textile: {
      Lawn: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&q=80&auto=format&fit=crop',
      Cotton: 'https://images.unsplash.com/photo-1583292650118-0c8d2f9a9f2d?w=800&q=80&auto=format&fit=crop',
      Khaddar: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80&auto=format&fit=crop',
      Bridal: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80&auto=format&fit=crop',
    },
    leather: {
      Footwear: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80&auto=format&fit=crop',
      Leather: 'https://images.unsplash.com/photo-1548036328-c9fa89d9b363?w=800&q=80&auto=format&fit=crop',
      New: 'https://images.unsplash.com/photo-1520639882103-d7964dc5a26a?w=800&q=80&auto=format&fit=crop',
      Sale: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80&auto=format&fit=crop',
    },
  };
  return map[variant]?.[label] || null;
}
