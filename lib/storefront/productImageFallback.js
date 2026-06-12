/**
 * Public storefront: when `product.image_url` is missing, pick a stable, relevant
 * stock image from curated Unsplash sets (keyword match on product name, then
 * business vertical). Merchant uploads always win.
 */
import { resolveStorefrontVertical, getStorefrontProductPlaceholder } from '@/lib/config/storefrontDomains';

const CARD = '?w=600&q=80&auto=format&fit=crop';
const OG = '?w=1200&q=80&auto=format&fit=crop';

/** @param {string} path photo-* id segment only if needed — we use full paths below */
function cardUrl(fullPath) {
  const base = fullPath.includes('?') ? fullPath.split('?')[0] : fullPath;
  return `${base}${CARD}`;
}

/** Curated Unsplash (same CDN as storefrontDomains). */
const POOL = {
  audio: [
    cardUrl('https://images.unsplash.com/photo-1505740420928-5e560c06d30e'),
    cardUrl('https://images.unsplash.com/photo-1546435770-a3e426bf472b'),
    cardUrl('https://images.unsplash.com/photo-1484704849700-f032a568e944'),
  ],
  phone: [
    cardUrl('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9'),
    cardUrl('https://images.unsplash.com/photo-1523206489230-c012c64b2c48'),
    cardUrl('https://images.unsplash.com/photo-1592899677977-99c296376d88'),
  ],
  laptop: [
    cardUrl('https://images.unsplash.com/photo-1496181133206-80ce9b88a853'),
    cardUrl('https://images.unsplash.com/photo-1525547719571-a2d4ac8944e2'),
    cardUrl('https://images.unsplash.com/photo-1517336714731-489689fd1ca8'),
  ],
  tv: [
    cardUrl('https://images.unsplash.com/photo-1593359677879-a4bb92f829d1'),
    cardUrl('https://images.unsplash.com/photo-1461158534269-385e6683c365'),
  ],
  dairy: [
    cardUrl('https://images.unsplash.com/photo-1550583724-b2692b85aa20'),
    cardUrl('https://images.unsplash.com/photo-1563636619-e9143da7973b'),
    cardUrl('https://images.unsplash.com/photo-1488477181946-6428a0291777'),
  ],
  bakery: [
    cardUrl('https://images.unsplash.com/photo-1509440159596-0249088772ff'),
    cardUrl('https://images.unsplash.com/photo-1549931319-a545dcf3bc73'),
    cardUrl('https://images.unsplash.com/photo-1558961363-fa8fdf82db35'),
  ],
  produce: [
    cardUrl('https://images.unsplash.com/photo-1542838132-92c53300491e'),
    cardUrl('https://images.unsplash.com/photo-1610832958506-aa56368176cf'),
    cardUrl('https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c'),
  ],
  meat: [
    cardUrl('https://images.unsplash.com/photo-1607623814075-e51df1bdc82f'),
    cardUrl('https://images.unsplash.com/photo-1544025162-d76694265947'),
  ],
  beverage: [
    cardUrl('https://images.unsplash.com/photo-1544145945-f90425340c7e'),
    cardUrl('https://images.unsplash.com/photo-1437418747212-8d9709afab22'),
    cardUrl('https://images.unsplash.com/photo-1513553404607-988bf2703777'),
  ],
  snack: [
    cardUrl('https://images.unsplash.com/photo-1599490659213-e2b9527bd087'),
    cardUrl('https://images.unsplash.com/photo-1621939514649-280e2ee25f60'),
  ],
  fashion: [
    cardUrl('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04'),
    cardUrl('https://images.unsplash.com/photo-1445205170230-053b83016050'),
    cardUrl('https://images.unsplash.com/photo-1469334031218-e382a71b716b'),
  ],
  footwear: [
    cardUrl('https://images.unsplash.com/photo-1549298916-b41d501d3772'),
    cardUrl('https://images.unsplash.com/photo-1608231387042-66d1773070a5'),
  ],
  pharmacy: [
    cardUrl('https://images.unsplash.com/photo-1584308666744-24d5c474f2ae'),
    cardUrl('https://images.unsplash.com/photo-1587854692152-cbe660dbde88'),
    cardUrl('https://images.unsplash.com/photo-1471864190281-a93a3070a6a9'),
  ],
  restaurant: [
    cardUrl('https://images.unsplash.com/photo-1504674900247-0877df9cc836'),
    cardUrl('https://images.unsplash.com/photo-1414235077428-338989a2e8c0'),
    cardUrl('https://images.unsplash.com/photo-1555939594-58d7cb561ad1'),
  ],
  cleaning: [
    cardUrl('https://images.unsplash.com/photo-1585421514738-01798e348b17'),
    cardUrl('https://images.unsplash.com/photo-1563453392212-326f5e854473'),
  ],
  baby: [
    cardUrl('https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4'),
    cardUrl('https://images.unsplash.com/photo-1522771739844-6a9f6d5f31af'),
  ],
  rice: [
    cardUrl('https://images.unsplash.com/photo-1586201375761-83865001e31c'),
    cardUrl('https://images.unsplash.com/photo-1596797038530-2c107229654b'),
  ],
  spice: [
    cardUrl('https://images.unsplash.com/photo-1596040033229-a9821ebd058d'),
    cardUrl('https://images.unsplash.com/photo-1506368083636-6defb67639a7'),
  ],
  frozen: [
    cardUrl('https://images.unsplash.com/photo-1560008581-09826d1d69c4'),
    cardUrl('https://images.unsplash.com/photo-1497534446932-c925b458314e'),
  ],
};

/** @type {{ test: (n: string) => boolean; urls: string[] }[]} */
const NAME_RULES = [
  { test: (n) => /headphone|earphone|earbud|airpod|headset|audio\s*speaker/.test(n), urls: POOL.audio },
  { test: (n) => /\b(iphone|galaxy\s*s|pixel\s*[0-9]|oneplus|xiaomi|oppo|vivo|smartphone)\b/.test(n) || /\bmobile\s*phone\b/.test(n), urls: POOL.phone },
  { test: (n) => /\b(laptop|macbook|notebook\s*pc|chromebook)\b/.test(n), urls: POOL.laptop },
  { test: (n) => /\b(tablet|ipad|surface\s*pro)\b/.test(n), urls: POOL.laptop },
  { test: (n) => /\b(tv|television|oled|qled|monitor\s*[0-9])\b/.test(n) || /\b([0-9]{2}"?\s*inch)\b.*\b(tv|monitor)\b/.test(n), urls: POOL.tv },
  { test: (n) => /\b(charger|cable|power\s*bank|adapter|usb-?c)\b/.test(n), urls: POOL.phone },
  { test: (n) => /\b(milk|yogurt|dairy|cheese|butter|cream|curd|ghee)\b/.test(n), urls: POOL.dairy },
  { test: (n) => /\b(bread|bun|bagel|croissant|pastry|cake|donut|biscuit)\b/.test(n), urls: POOL.bakery },
  { test: (n) => /\b(rice|flour|atta|lentil|daal|dal|pulse|bean)\b/.test(n), urls: POOL.rice },
  { test: (n) => /\b(apple|banana|orange|mango|grape|fruit|berries|vegetable|tomato|onion|potato|salad)\b/.test(n), urls: POOL.produce },
  { test: (n) => /\b(chicken|beef|mutton|fish|meat|prawn|seafood|steak)\b/.test(n), urls: POOL.meat },
  { test: (n) => /\b(water|juice|soda|cola|drink|beverage|tea|coffee|energy\s*drink)\b/.test(n), urls: POOL.beverage },
  { test: (n) => /\b(snack|chips|crisp|chocolate|candy|nuts)\b/.test(n), urls: POOL.snack },
  { test: (n) => /\b(spice|masala|herb|seasoning)\b/.test(n), urls: POOL.spice },
  { test: (n) => /\b(frozen|ice\s*cream)\b/.test(n), urls: POOL.frozen },
  { test: (n) => /\b(diaper|baby|infant|formula|stroller)\b/.test(n), urls: POOL.baby },
  { test: (n) => /\b(detergent|soap|cleaner|bleach|disinfect|shampoo)\b/.test(n), urls: POOL.cleaning },
  { test: (n) => /\b(shirt|dress|jeans|trouser|kurta|sari|saree|hoodie|jacket|apparel|fashion)\b/.test(n), urls: POOL.fashion },
  { test: (n) => /\b(shoe|sandal|sneaker|boot|footwear|loafer)\b/.test(n), urls: POOL.footwear },
  { test: (n) => /\b(foundation|lipstick|mascara|moisturizer|skincare|cosmetic|perfume|cologne|serum)\b/.test(n), urls: POOL.fashion },
  { test: (n) => /\b(medicine|tablet|syrup|vitamin|capsule|ointment|bandage|injection|antibiotic)\b/.test(n), urls: POOL.pharmacy },
  { test: (n) => /\b(pizza|burger|biryani|meal|platter|catering|sandwich)\b/.test(n), urls: POOL.restaurant },
];

  const VERTICAL_POOLS = {
  supermarket: [
    ...POOL.produce,
    ...POOL.dairy,
    ...POOL.bakery,
    cardUrl('https://images.unsplash.com/photo-1588964895597-cfccd6bf2d57'),
    cardUrl('https://images.unsplash.com/photo-1578916171728-46688e8478c8'),
  ],
  'retail-shop': [
    cardUrl('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da'),
    cardUrl('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d'),
    cardUrl('https://images.unsplash.com/photo-1472851294608-062f824d29cc'),
    cardUrl('https://images.unsplash.com/photo-1604719312566-8912e9227c6a'),
  ],
  pharmacy: [...POOL.pharmacy, ...POOL.baby],
  'restaurant-cafe': [...POOL.restaurant, ...POOL.beverage],
  'bakery-confectionery': [...POOL.bakery, ...POOL.beverage],
  'electronics-tech': [
    ...POOL.phone,
    ...POOL.laptop,
    cardUrl('https://images.unsplash.com/photo-1498049794561-7780e7231661'),
    cardUrl('https://images.unsplash.com/photo-1527443224154-c4a3942d3acf'),
  ],
  'fashion-clothing': [...POOL.fashion, ...POOL.footwear],
  default: [
    cardUrl('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da'),
    cardUrl('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d'),
    cardUrl('https://images.unsplash.com/photo-1472851294608-062f824d29cc'),
  ],
};

/**
 * @param {string} input
 * @returns {number} unsigned
 */
export function stableStringHash(input) {
  const str = String(input ?? '');
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

function pickFromPool(urls, seedStr) {
  if (!urls?.length) return null;
  const idx = stableStringHash(seedStr) % urls.length;
  return urls[idx];
}

/**
 * @param {{ name?: string; id?: string | number } | null | undefined} product
 * @param {string | null | undefined} businessCategory
 * @returns {string}
 */
export function getFallbackProductImageUrl(product, businessCategory) {
  const name = (product?.name ?? '').toLowerCase().trim();
  const seed = `${product?.id ?? ''}::${name}`;
  for (const rule of NAME_RULES) {
    if (name && rule.test(name)) {
      const u = pickFromPool(rule.urls, seed);
      if (u) return u;
    }
  }
  const vertical = resolveStorefrontVertical(businessCategory);
  const pool = VERTICAL_POOLS[vertical] || VERTICAL_POOLS.default;
  const fromVertical = pickFromPool(pool, seed);
  if (fromVertical) return fromVertical;
  return getStorefrontProductPlaceholder(businessCategory);
}

/**
 * Merchant `image_url` wins; otherwise name/vertical fallback (https Unsplash).
 * @param {{ name?: string; id?: string | number; image_url?: string | null } | null | undefined} product
 * @param {string | null | undefined} businessCategory
 * @returns {string}
 */
export function getEffectiveProductImageUrl(product, businessCategory) {
  const raw = typeof product?.image_url === 'string' ? product.image_url.trim() : '';
  if (
    raw &&
    (raw.startsWith('https://') || raw.startsWith('http://') || raw.startsWith('data:'))
  ) {
    return raw;
  }
  return getFallbackProductImageUrl(product, businessCategory);
}

/**
 * Open Graph / metadata: never `data:` URLs.
 * @param {{ name?: string; id?: string | number; image_url?: string | null } | null | undefined} product
 * @param {string | null | undefined} businessCategory
 * @returns {string | null}
 */
export function getOpenGraphProductImageUrl(product, businessCategory) {
  const raw = typeof product?.image_url === 'string' ? product.image_url.trim() : '';
  if (raw.startsWith('https://')) return raw;
  if (raw.startsWith('http://')) return raw;
  const fb = getFallbackProductImageUrl(product, businessCategory);
  return fb && fb.startsWith('https://') ? fb.replace(/\?.*$/, '') + OG : null;
}
