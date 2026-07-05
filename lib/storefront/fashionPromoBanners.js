/**
 * Fashion editorial promo split banners — copy defaults, inventory images, owner overrides.
 */
import { getLuxuryFashionVariant } from '@/lib/storefront/luxuryFashion';
import { isDemoStoreDomain } from '@/lib/storefront/elevatedStorefrontTenant';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { resolveSpotlightBannerImage } from '@/lib/storefront/storefrontImagePlaceholders';
import { fashionStockImage, FASHION_DEMO_IMAGES } from '@/lib/dataLab/fashionDemoImages';

/** Read owner promo banner overrides without importing fashionEditorial (avoids circular deps). */
function getOwnerPromoBanners(settings = {}) {
  const raw = settings?.storefront?.fashion?.promoBanners;
  return Array.isArray(raw) && raw.length ? raw : null;
}

/** @typedef {{ id: string; title: string; subtitle: string; href: string; tone: 'dark' | 'light' | 'walnut'; image?: string }} FashionPromoBanner */

export const FASHION_PROMO_BANNER_COPY = {
  boutique: [
    {
      id: 'pret',
      title: 'Ready to wear',
      subtitle: 'Fresh pret drops with embroidery and luxury fabrics',
      href: '?sort=newest',
      tone: 'dark',
    },
    {
      id: 'unstitched',
      title: 'Unstitched essentials',
      subtitle: 'Lawn, cotton, and festive collections to stitch your way',
      href: '?search=unstitched',
      tone: 'light',
    },
  ],
  textile: [
    {
      id: 'lawn',
      title: 'Digital lawn',
      subtitle: 'Wholesale-ready prints trusted by retailers nationwide',
      href: '?category=lawn',
      tone: 'dark',
    },
    {
      id: 'bridal',
      title: 'Bridal & festive',
      subtitle: 'Premium embroideries and occasion wear fabrics',
      href: '?category=bridal-collection',
      tone: 'light',
    },
  ],
  leather: [
    {
      id: 'footwear',
      title: 'New footwear',
      subtitle: 'Leather shoes, sandals, and seasonal drops',
      href: '?sort=newest',
      tone: 'dark',
    },
    {
      id: 'bags',
      title: 'Bags & accessories',
      subtitle: 'Handbags, wallets, and everyday carry',
      href: '?search=bag',
      tone: 'light',
    },
  ],
};

const BANNER_IMAGE_KEYWORDS = {
  pret: ['ready to wear', 'pret', 'rtw', 'stitched', 'kurti', 'formal', '3pc stitched'],
  unstitched: ['unstitched', 'un-stitched', 'lawn', 'cotton', 'fabric', '3 piece', '3pc'],
  lawn: ['lawn', 'digital', 'print'],
  bridal: ['bridal', 'festive', 'embroider', 'occasion'],
  footwear: ['footwear', 'shoe', 'sandal', 'boot', 'sneaker'],
  bags: ['bag', 'wallet', 'accessories', 'clutch'],
};

const DEMO_BANNER_IMAGES = {
  boutique: {
    pret: fashionStockImage(FASHION_DEMO_IMAGES.rtw.embroidered),
    unstitched: fashionStockImage(FASHION_DEMO_IMAGES.unstitched.printed),
  },
  textile: {
    lawn: fashionStockImage(FASHION_DEMO_IMAGES.unstitched.lawn),
    bridal: fashionStockImage(FASHION_DEMO_IMAGES.unstitched.embroidered),
  },
  leather: {
    footwear: fashionStockImage(FASHION_DEMO_IMAGES.accessories.footwear),
    bags: fashionStockImage(FASHION_DEMO_IMAGES.accessories.bags),
  },
};

/**
 * @param {string | null | undefined} category
 */
export function getFashionPromoBannerCopy(category) {
  const variant = getLuxuryFashionVariant(category) || 'boutique';
  return FASHION_PROMO_BANNER_COPY[variant] || FASHION_PROMO_BANNER_COPY.boutique;
}

/**
 * @param {object} product
 * @param {string[]} keywords
 */
function productMatchesKeywords(product, keywords) {
  const hay = [
    product.name,
    product.category,
    product.category_name,
    product.brand,
    product.description,
    product.domain_data?.stitchingtype,
    product.domain_data?.fabrictype,
    product.domain_data?.department,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return keywords.some((kw) => hay.includes(kw.toLowerCase()));
}

/**
 * @param {object[]} products
 * @param {string} bannerId
 * @param {number} index
 * @param {string | null | undefined} businessCategory
 */
export function pickFashionPromoBannerProductImage(products, bannerId, index, businessCategory) {
  const pool = (products || []).filter((p) => getEffectiveProductImageUrl(p, businessCategory));
  if (!pool.length) return '';

  const keywords = BANNER_IMAGE_KEYWORDS[bannerId] || [];
  const featured = pool.filter((p) => p.is_featured);
  const featuredMatch = featured.find((p) => productMatchesKeywords(p, keywords));
  if (featuredMatch) return getEffectiveProductImageUrl(featuredMatch, businessCategory);

  const match = pool.find((p) => productMatchesKeywords(p, keywords));
  if (match) return getEffectiveProductImageUrl(match, businessCategory);

  const fallback = pool[index % pool.length];
  return getEffectiveProductImageUrl(fallback, businessCategory);
}

/**
 * @param {FashionPromoBanner[]} copy
 * @param {object[]} products
 * @param {string | null | undefined} businessCategory
 * @param {string | null | undefined} businessDomain
 */
export function enrichFashionPromoBanners(copy, products, businessCategory, businessDomain) {
  const variant = getLuxuryFashionVariant(businessCategory) || 'boutique';
  const demoImages = DEMO_BANNER_IMAGES[variant] || DEMO_BANNER_IMAGES.boutique;

  return copy.map((banner, index) => {
    const inventoryImage = pickFashionPromoBannerProductImage(
      products,
      banner.id,
      index,
      businessCategory
    );
    const demoImage = demoImages[banner.id] || '';
    const image =
      String(banner.image || '').trim() ||
      inventoryImage ||
      (isDemoStoreDomain(businessDomain) ? demoImage : '');

    return {
      ...banner,
      image: image || resolveSpotlightBannerImage(banner, businessCategory, index),
    };
  });
}

/**
 * @param {FashionPromoBanner[]} defaults
 * @param {FashionPromoBanner[]} ownerBanners
 */
export function mergeFashionPromoBannerSettings(defaults, ownerBanners) {
  if (!Array.isArray(ownerBanners) || !ownerBanners.length) return defaults;
  const byId = new Map(defaults.map((b) => [b.id, b]));

  return ownerBanners.map((owner, index) => {
    const base = byId.get(owner.id) || defaults[index] || defaults[0];
    if (!base) return owner;
    return {
      ...base,
      ...owner,
      id: owner.id || base.id,
      title: String(owner.title || '').trim() || base.title,
      subtitle: String(owner.subtitle || '').trim() || base.subtitle,
      href: String(owner.href || '').trim() || base.href,
      tone: owner.tone || base.tone,
      image: String(owner.image || '').trim() || base.image,
    };
  });
}

/**
 * @param {string | null | undefined} category
 * @param {object[]} [products]
 * @param {string | null | undefined} [businessDomain]
 */
export function buildDefaultFashionPromoBannerSeed(category, products = [], businessDomain) {
  const copy = getFashionPromoBannerCopy(category);
  return enrichFashionPromoBanners(copy, products, category, businessDomain);
}

/**
 * @param {object} [settings]
 * @param {object[]} [products]
 * @param {string | null | undefined} [businessCategory]
 * @param {string | null | undefined} [businessDomain]
 */
export function resolveFashionPromoBanners(settings = {}, products = [], businessCategory, businessDomain) {
  const copy = getFashionPromoBannerCopy(businessCategory);
  const enriched = enrichFashionPromoBanners(copy, products, businessCategory, businessDomain);
  const ownerBanners = getOwnerPromoBanners(settings);

  if (ownerBanners) {
    return mergeFashionPromoBannerSettings(enriched, ownerBanners);
  }

  return enriched;
}

/**
 * Resolve display image for a promo banner tile.
 */
export function resolveFashionPromoBannerImage(banner, businessCategory, index = 0) {
  const raw = String(banner?.image || '').trim();
  if (raw) return raw;
  return resolveSpotlightBannerImage(banner, businessCategory, index);
}
