/**
 * Stable fallbacks when merchant/CDN images fail on public storefronts.
 */
import { normalizeUnsplashUrl } from '@/lib/storefront/unsplashUrl';
import { stableStringHash } from '@/lib/storefront/productImageFallback';

const CARD = { w: 800, q: 80 };

const AUTOMOTIVE_TILES = [
  'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3',
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70',
  'https://images.unsplash.com/photo-1619644094661-99a4c4e4b711',
  'https://images.unsplash.com/photo-1625047509248-ec889cbff817',
  'https://images.unsplash.com/photo-1607868895042-8aabcb736287',
];

/** @type {Record<string, string>} */
const BODY_TYPE_TILES = {
  suv: 'https://images.unsplash.com/photo-1519641471654-76ce5427da69',
  sedan: 'https://images.unsplash.com/photo-1555215695-3004980ad54e',
  hatchback: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2',
  mpv: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b',
  'luxury-suv': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8',
  'luxury-sedan': 'https://images.unsplash.com/photo-1617814076665-75e412d1d0cd',
};

/** @type {Record<string, string>} */
const AUTO_PARTS_PROMO_FALLBACKS = {
  'byd-shark-6': 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7',
  'detailing-equipment': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3',
  'floor-mats': 'https://images.unsplash.com/photo-1625047509248-ec889cbff817',
  'air-fresheners': 'https://images.unsplash.com/photo-1619644094661-99a4c4e4b711',
  'engine-oils': 'https://images.unsplash.com/photo-1607868895042-8aabcb736287',
  'body-kits': 'https://images.unsplash.com/photo-1627457390561-67c14815660e',
};

/**
 * @param {string} name
 * @param {{ bg?: string; color?: string }} [opts]
 */
export function resolveBrandMonogramUrl(name, opts = {}) {
  const label = encodeURIComponent(String(name || 'Brand').trim());
  const bg = opts.bg || 'f3f4f6';
  const color = opts.color || '374151';
  return `https://ui-avatars.com/api/?name=${label}&background=${bg}&color=${color}&size=128&bold=true&format=png`;
}

/**
 * @param {string} [seed]
 */
export function resolveAutomotiveTileImage(seed = '') {
  const idx = stableStringHash(seed) % AUTOMOTIVE_TILES.length;
  return normalizeUnsplashUrl(AUTOMOTIVE_TILES[idx], CARD);
}

/**
 * @param {string} [bodyTypeId]
 * @param {string} [label]
 */
export function resolveBodyTypeTileImage(bodyTypeId, label = '') {
  const key = String(bodyTypeId || '').toLowerCase();
  const mapped = BODY_TYPE_TILES[key];
  if (mapped) return normalizeUnsplashUrl(mapped, CARD);
  return resolveAutomotiveTileImage(label || bodyTypeId);
}

/**
 * @param {string} [promoId]
 */
export function resolveAutoPartsPromoFallback(promoId) {
  const mapped = AUTO_PARTS_PROMO_FALLBACKS[String(promoId || '').toLowerCase()];
  if (mapped) return normalizeUnsplashUrl(mapped, CARD);
  return resolveAutomotiveTileImage(promoId);
}

/**
 * Unsplash fallback for showroom marketing banners (index-stable).
 * @param {number} [index]
 */
export function resolveDealershipBannerFallback(index = 0) {
  const urls = [
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3',
    'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8',
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70',
    'https://images.unsplash.com/photo-1625047509248-ec889cbff817',
  ];
  return normalizeUnsplashUrl(urls[index % urls.length], CARD);
}

/** @type {Record<string, string>} */
const SHOWROOM_BRAND_UNSplash = {
  toyota: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb',
  honda: 'https://images.unsplash.com/photo-1590362891991-f776e747a588',
  hyundai: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24',
  suzuki: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d',
  kia: 'https://images.unsplash.com/photo-1619767886555-efdc259cde1a',
  audi: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6',
  bmw: 'https://images.unsplash.com/photo-1555215695-3004980ad54e',
  mercedes: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8',
  haval: 'https://images.unsplash.com/photo-1619767886555-efdc259cde1a',
  tesla: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89',
  lexus: 'https://images.unsplash.com/photo-1617814076665-75e412d1d0cd',
  ford: 'https://images.unsplash.com/photo-1494976388531-d1058498cdd8',
  'land-rover': 'https://images.unsplash.com/photo-1519641471654-76ce5427da69',
  peugeot: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d',
  mg: 'https://images.unsplash.com/photo-1619767886555-efdc259cde1a',
  changan: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7',
};

/**
 * @param {string} brandId
 */
export function resolveShowroomBrandFallback(brandId) {
  const mapped = SHOWROOM_BRAND_UNSplash[String(brandId || '').toLowerCase()];
  if (mapped) return normalizeUnsplashUrl(mapped, { w: 400, q: 80 });
  return resolveBrandMonogramUrl(brandId);
}
