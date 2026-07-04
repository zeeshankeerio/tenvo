/**
 * Stable fallbacks when merchant/CDN images fail on public storefronts.
 */
import { normalizeUnsplashUrl } from '@/lib/storefront/unsplashUrl';
import { stableStringHash } from '@/lib/storefront/productImageFallback';
import { isDeadImageUrl } from '@/lib/storefront/deadImageHosts';

const CARD = { w: 800, q: 80 };

/** Keep only live URLs, but never return empty (fall back to the original list). */
function liveOnly(urls) {
  const live = urls.filter((u) => !isDeadImageUrl(u));
  return live.length ? live : urls;
}

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
  const tiles = liveOnly(AUTOMOTIVE_TILES);
  const idx = stableStringHash(seed) % tiles.length;
  return normalizeUnsplashUrl(tiles[idx], CARD);
}

/**
 * @param {string} [bodyTypeId]
 * @param {string} [label]
 */
export function resolveBodyTypeTileImage(bodyTypeId, label = '') {
  const key = String(bodyTypeId || '').toLowerCase();
  const mapped = BODY_TYPE_TILES[key];
  if (mapped && !isDeadImageUrl(mapped)) return normalizeUnsplashUrl(mapped, CARD);
  return resolveAutomotiveTileImage(label || bodyTypeId);
}

/**
 * @param {string} [promoId]
 */
export function resolveAutoPartsPromoFallback(promoId) {
  const mapped = AUTO_PARTS_PROMO_FALLBACKS[String(promoId || '').toLowerCase()];
  if (mapped && !isDeadImageUrl(mapped)) return normalizeUnsplashUrl(mapped, CARD);
  return resolveAutomotiveTileImage(promoId);
}

/** Editorial spotlight banners — keyed by spotlight id, then canonical domain. */
const EDITORIAL_SPOTLIGHT_BY_ID = {
  seasonal: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b',
  collection: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04',
  heritage: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338',
  signature: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e',
  'fabric-edit': 'https://images.unsplash.com/photo-1558171813-4c088753af8f',
  wellness: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f',
  'woodin-edit': 'https://images.unsplash.com/photo-1555041469-a32ef8fd9617',
  'custom-cakes': 'https://images.unsplash.com/photo-1578985545062-55a8154f7274',
  trade: 'https://images.unsplash.com/photo-1504148455328-c376675a07ab',
  finder: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3',
};

/** @type {Record<string, string>} */
const EDITORIAL_SPOTLIGHT_BY_CANONICAL = {
  'boutique-fashion': 'https://images.unsplash.com/photo-1469334031218-e382a71b716b',
  'textile-wholesale': 'https://images.unsplash.com/photo-1558171813-4c088753af8f',
  'gems-jewellery': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e',
  'leather-footwear': 'https://images.unsplash.com/photo-1549298916-b41d501d3772',
  garments: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d',
  'fashion-clothing': 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04',
  'luxury-fashion': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338',
  furniture: 'https://images.unsplash.com/photo-1555041469-a32ef8fd9617',
  pharmacy: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f',
  supermarket: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
  bakery: 'https://images.unsplash.com/photo-1578985545062-55a8154f7274',
  'auto-parts': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3',
  'hardware-sanitary': 'https://images.unsplash.com/photo-1504148455328-c376675a07ab',
};

const EDITORIAL_SPOTLIGHT_TILES = liveOnly([
  'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338',
  'https://images.unsplash.com/photo-1555041469-a32ef8fd9617',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f',
]);

const EDITORIAL_BANNER = { w: 1400, q: 82 };

/**
 * Full-bleed background for editorial / marketing spotlight banners.
 * @param {string} [spotlightId]
 * @param {string} [canonical]
 * @param {number} [index]
 */
export function resolveEditorialSpotlightFallback(spotlightId, canonical, index = 0) {
  const id = String(spotlightId || '').toLowerCase();
  const byId = EDITORIAL_SPOTLIGHT_BY_ID[id];
  if (byId && !isDeadImageUrl(byId)) {
    return normalizeUnsplashUrl(byId, EDITORIAL_BANNER);
  }
  const canon = String(canonical || '').toLowerCase();
  const byCanon = EDITORIAL_SPOTLIGHT_BY_CANONICAL[canon];
  if (byCanon && !isDeadImageUrl(byCanon)) {
    return normalizeUnsplashUrl(byCanon, EDITORIAL_BANNER);
  }
  const tiles = EDITORIAL_SPOTLIGHT_TILES;
  const idx = (stableStringHash(id || canon || 'spotlight') + index) % tiles.length;
  return normalizeUnsplashUrl(tiles[idx], EDITORIAL_BANNER);
}

/**
 * Resolve a premium full-bleed banner image for editorial spotlights and promo tiles.
 * Normalizes Unsplash URLs and falls back to domain-aware stock photography.
 * @param {{ id?: string; image?: string; title?: string }} [spotlight]
 * @param {string} [canonical]
 * @param {number} [index]
 */
export function resolveSpotlightBannerImage(spotlight = {}, canonical = '', index = 0) {
  const raw = String(spotlight.image || '').trim();
  const fallback = resolveEditorialSpotlightFallback(
    spotlight.id || spotlight.title,
    canonical,
    index
  );
  if (!raw || isDeadImageUrl(raw)) return fallback;
  if (raw.includes('images.unsplash.com/photo-')) {
    return normalizeUnsplashUrl(raw, EDITORIAL_BANNER);
  }
  return raw;
}

/**
 * Unsplash fallback for showroom marketing banners (index-stable).
 * @param {number} [index]
 */
export function resolveDealershipBannerFallback(index = 0) {
  const urls = liveOnly([
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3',
    'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8',
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70',
    'https://images.unsplash.com/photo-1625047509248-ec889cbff817',
  ]);
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
  if (mapped && !isDeadImageUrl(mapped)) return normalizeUnsplashUrl(mapped, { w: 400, q: 80 });
  // Dead/unknown brand image → a live automotive tile beats a plain monogram.
  return brandId ? resolveAutomotiveTileImage(brandId) : resolveBrandMonogramUrl(brandId);
}
