/**
 * Public storefront: when `product.image_url` is missing, pick a stable, relevant
 * stock image from curated Unsplash sets (keyword match on product name, then
 * business vertical). Merchant uploads always win.
 */
import { resolveStorefrontVertical, getStorefrontProductPlaceholder } from '@/lib/config/storefrontDomains';
import { normalizeUnsplashUrl, buildUnsplashImageUrl } from '@/lib/storefront/unsplashUrl';
import { isDeadImageUrl } from '@/lib/storefront/deadImageHosts';

const CARD = { w: 600, q: 80 };
const OG = { w: 1200, q: 80 };

/** @param {string} fullPath */
function cardUrl(fullPath) {
  const raw = String(fullPath || '').trim();
  if (!raw) return '';
  if (raw.includes('images.unsplash.com/photo-')) {
    return normalizeUnsplashUrl(raw, CARD);
  }
  const base = raw.includes('?') ? raw.split('?')[0] : raw;
  const match = base.match(/photo-([a-zA-Z0-9_-]+)$/);
  if (match?.[1]) return buildUnsplashImageUrl(match[1], CARD);
  return `${base}?w=${CARD.w}&q=${CARD.q}&auto=format&fit=crop`;
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
    cardUrl('https://images.unsplash.com/photo-1572804013307-28ccbfc7ecb4'),
    cardUrl('https://images.unsplash.com/photo-1490481651871-ab68de25d43d'),
  ],
  pret: [
    cardUrl('https://images.unsplash.com/photo-1490481651871-ab68de25d43d'),
    cardUrl('https://images.unsplash.com/photo-1572804013307-28ccbfc7ecb4'),
    cardUrl('https://images.unsplash.com/photo-1469334031218-e382a71b716b'),
    cardUrl('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f'),
  ],
  accessoryFashion: [
    cardUrl('https://images.unsplash.com/photo-1553062407-98ae227d21a5'),
    cardUrl('https://images.unsplash.com/photo-1548036328-c9fa89d9b363'),
    cardUrl('https://images.unsplash.com/photo-1515562141207-7a88fb7ce338'),
    cardUrl('https://images.unsplash.com/photo-1523381210434-271e8be1f52b'),
    cardUrl('https://images.unsplash.com/photo-1608231387042-66d1773070a5'),
  ],
  footwear: [
    cardUrl('https://images.unsplash.com/photo-1549298916-b41d501d3772'),
    cardUrl('https://images.unsplash.com/photo-1608231387042-66d1773070a5'),
  ],
  pharmacy: [
    cardUrl('https://images.unsplash.com/photo-1584308666744-24d5c474f2ae'),
    cardUrl('https://images.unsplash.com/photo-1587854692152-cbe660dbde88'),
    cardUrl('https://images.unsplash.com/photo-1559757148-5c350d0d3c56'),
    cardUrl('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'),
    cardUrl('https://images.unsplash.com/photo-1585421514738-01798e348b17'),
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
  autoparts: [
    cardUrl('https://images.unsplash.com/photo-1486262715619-67b85e0b08d3'),
    cardUrl('https://images.unsplash.com/photo-1625047509248-ec889cbff817'),
    cardUrl('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7'),
    cardUrl('https://images.unsplash.com/photo-1619644094661-99a4c4e4b711'),
    cardUrl('https://images.unsplash.com/photo-1607868895042-8aabcb736287'),
    cardUrl('https://images.unsplash.com/photo-1627457390561-67c14815660e'),
  ],
  tools: [
    cardUrl('https://images.unsplash.com/photo-1504148455325-0c9e7ed84403'),
    cardUrl('https://images.unsplash.com/photo-1581094794329-c8112a89af12'),
    cardUrl('https://images.unsplash.com/photo-1530124566582-a618bc2615dc'),
  ],
  plumbing: [
    cardUrl('https://images.unsplash.com/photo-1621905252507-b35492cc74b4'),
    cardUrl('https://images.unsplash.com/photo-1585705117036-856f63a4e20e'),
    cardUrl('https://images.unsplash.com/photo-1607472586893-edb57bdc0e39'),
  ],
  textile: [
    cardUrl('https://images.unsplash.com/photo-1594938298603-c8148c4dae35'),
    cardUrl('https://images.unsplash.com/photo-1558171813-e2f8110a3b1e'),
    cardUrl('https://images.unsplash.com/photo-1586796640118-4811f0880a72'),
    cardUrl('https://images.unsplash.com/photo-1490481651871-ab68de25d000'),
  ],
  healthcare: [
    cardUrl('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'),
    cardUrl('https://images.unsplash.com/photo-1559757148-5c350d0d3c56'),
    cardUrl('https://images.unsplash.com/photo-1587854692152-cbe660dbde88'),
  ],
  dental: [
    cardUrl('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'),
    cardUrl('https://images.unsplash.com/photo-1559757148-5c350d0d3c56'),
    cardUrl('https://images.unsplash.com/photo-1587854692152-cbe660dbde88'),
  ],
  furniture: [
    cardUrl('https://images.unsplash.com/photo-1555041469-a586c61ea9bc'),
    cardUrl('https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e'),
    cardUrl('https://images.unsplash.com/photo-1586023492125-27b2c045efd7'),
  ],
  jewellery: [
    cardUrl('https://images.unsplash.com/photo-1515562141207-7a88fbbeb966'),
    cardUrl('https://images.unsplash.com/photo-1611591437281-460bfbe1220a'),
    cardUrl('https://images.unsplash.com/photo-1605100804763-247f67b3557e'),
  ],
  salon: [
    cardUrl('https://images.unsplash.com/photo-1560066984-1388d7fdf550'),
    cardUrl('https://images.unsplash.com/photo-1522337360788-8b13dee1a7e2'),
    cardUrl('https://images.unsplash.com/photo-1487412940907-5b63a3ed0c85'),
  ],
  pet: [
    cardUrl('https://images.unsplash.com/photo-1450778869188-41d060ede37d'),
    cardUrl('https://images.unsplash.com/photo-1587300003388-59208cc962cb'),
    cardUrl('https://images.unsplash.com/photo-1516734212186-a967f81ad9d7'),
  ],
  solar: [
    cardUrl('https://images.unsplash.com/photo-1509391366360-2e959784a276'),
    cardUrl('https://images.unsplash.com/photo-1508514177221-188b1cf16e9d'),
    cardUrl('https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9'),
  ],
  books: [
    cardUrl('https://images.unsplash.com/photo-1481627834876-b7833e8f5570'),
    cardUrl('https://images.unsplash.com/photo-1512820790803-83ca734da794'),
    cardUrl('https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8'),
  ],
  gym: [
    cardUrl('https://images.unsplash.com/photo-1534438327276-14e5300c3a48'),
    cardUrl('https://images.unsplash.com/photo-1571902943202-507ec2618e8f'),
    cardUrl('https://images.unsplash.com/photo-1517836357463-d25dfeac3438'),
  ],
  appliance: [
    cardUrl('https://images.unsplash.com/photo-1585659722983-cb0e1e2f9b47'),
    cardUrl('https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5'),
    cardUrl('https://images.unsplash.com/photo-1586201375761-83865001e31c'),
  ],
  carbattery: [
    cardUrl('https://images.unsplash.com/photo-1626689455954-5652d2f6f0b8'),
    cardUrl('https://images.unsplash.com/photo-1619644094661-99a4c4e4b711'),
  ],
  retail: [
    cardUrl('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da'),
    cardUrl('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d'),
    cardUrl('https://images.unsplash.com/photo-1627123427854-05d3f2b9d900'),
    cardUrl('https://images.unsplash.com/photo-1507473889641-bef09dcb8081'),
  ],
};

/** @type {{ test: (n: string) => boolean; urls: string[] }[]} */
const NAME_RULES = [
  { test: (n) => /headphone|earphone|earbud|airpod|headset|audio\s*speaker/.test(n), urls: POOL.audio },
  { test: (n) => /\b(iphone|galaxy\s*s|pixel\s*[0-9]|oneplus|xiaomi|oppo|vivo|smartphone|latest smartphone)\b/.test(n) || /\bmobile\s*phone\b/.test(n), urls: POOL.phone },
  { test: (n) => /\b(screen guard|tempered glass|phone case)\b/.test(n), urls: POOL.phone },
  { test: (n) => /\b(laptop|macbook|notebook\s*pc|chromebook|computing)\b/.test(n), urls: POOL.laptop },
  { test: (n) => /\b(tablet|ipad|surface\s*pro)\b/.test(n), urls: POOL.laptop },
  { test: (n) => /\b(tv|television|oled|qled|smart\s*led)\b/.test(n) || /\b([0-9]{2}"?\s*inch)\b/.test(n), urls: POOL.tv },
  { test: (n) => /\b(refrigerator|fridge|microwave|oven|appliance|washing\s*machine)\b/.test(n), urls: POOL.appliance },
  { test: (n) => /\b(charger|cable|power\s*bank|adapter|usb-?c|fast charging)\b/.test(n), urls: POOL.phone },
  { test: (n) => /\b(milk|yogurt|dairy|cheese|butter|cream|curd|ghee|milk powder)\b/.test(n), urls: POOL.dairy },
  { test: (n) => /\b(bread|bun|bagel|croissant|pastry|cake|donut|biscuit|confectionery|sweets|cookies)\b/.test(n), urls: POOL.bakery },
  { test: (n) => /\b(rice|flour|atta|lentil|daal|dal|pulse|bean)\b/.test(n), urls: POOL.rice },
  { test: (n) => /\b(cooking oil|dalda|sunflower oil)\b/.test(n), urls: POOL.rice },
  { test: (n) => /\b(apple|banana|orange|mango|grape|fruit|berries|vegetable|tomato|onion|potato|salad|produce)\b/.test(n), urls: POOL.produce },
  { test: (n) => /\b(chicken|beef|mutton|fish|meat|prawn|seafood|steak)\b/.test(n), urls: POOL.meat },
  { test: (n) => /\b(water|juice|soda|cola|coca|drink|beverage|tea|coffee|energy\s*drink|lemonade)\b/.test(n), urls: POOL.beverage },
  { test: (n) => /\b(snack|chips|crisp|lays|chocolate|candy|nuts)\b/.test(n), urls: POOL.snack },
  { test: (n) => /\b(spice|masala|herb|seasoning)\b/.test(n), urls: POOL.spice },
  { test: (n) => /\b(frozen|ice\s*cream)\b/.test(n), urls: POOL.frozen },
  { test: (n) => /\b(diaper|baby|infant|formula|stroller)\b/.test(n), urls: POOL.baby },
  { test: (n) => /\b(detergent|soap|cleaner|bleach|disinfect|shampoo|dettol|antiseptic)\b/.test(n), urls: POOL.cleaning },
  { test: (n) => /\b(lawn|cotton|chiffon|khaddar|unstitched|thaan|fabric|textile|embroidered|suit|dupatta|organza|cambric)\b/.test(n), urls: POOL.textile },
  { test: (n) => /\b(pret|ready to wear|ready-to-wear|kurta|kurti|co-ord|coord|stitched suit)\b/.test(n), urls: POOL.pret },
  { test: (n) => /\b(scarf|stole|shawl|dupatta|viscose)\b/.test(n), urls: POOL.accessoryFashion },
  { test: (n) => /\b(earring|necklace|jewell|jewelry|bracelet)\b/.test(n), urls: POOL.jewellery },
  { test: (n) => /\b(handbag|crossbody|tote|clutch)\b/.test(n), urls: POOL.accessoryFashion },
  { test: (n) => /\b(sunglass|watch|wallet)\b/.test(n), urls: POOL.retail },
  { test: (n) => /\b(slide|sandal|heel|footwear)\b/.test(n), urls: POOL.footwear },
  { test: (n) => /\b(shirt|dress|jeans|trouser|sari|saree|hoodie|jacket|apparel|fashion|boutique|western|top)\b/.test(n), urls: POOL.fashion },
  { test: (n) => /\b(shoe|sandal|sneaker|boot|footwear|loafer|leather)\b/.test(n), urls: POOL.footwear },
  { test: (n) => /\b(foundation|lipstick|mascara|moisturizer|skincare|cosmetic|perfume|cologne|serum|salon|spa|bridal)\b/.test(n), urls: POOL.salon },
  { test: (n) => /\b(jewell|jewelry|gold|gem|ring|necklace)\b/.test(n), urls: POOL.jewellery },
  { test: (n) => /\b(sofa|chair|table|furniture|mattress|bed)\b/.test(n), urls: POOL.furniture },
  { test: (n) => /\b(book|textbook|stationery|geometry|isbn|publisher)\b/.test(n), urls: POOL.books },
  { test: (n) => /\b(gym|fitness|workout|membership|training)\b/.test(n), urls: POOL.gym },
  { test: (n) => /\b(solar|inverter|panel)\b/.test(n), urls: POOL.solar },
  { test: (n) => /\b(pet|veterinary|grooming|nutrition)\b/.test(n), urls: POOL.pet },
  { test: (n) => /\b(consultation|check-?up|checkup|vaccination|physician|clinic)\b/.test(n), urls: POOL.healthcare },
  { test: (n) => /\b(blood test|cbc|lab test|diagnostic|laboratory)\b/.test(n), urls: POOL.healthcare },
  { test: (n) => /\b(dental|scaling|filling|x-?ray|whitening|teeth)\b/.test(n), urls: POOL.dental },
  { test: (n) => /\b(panadol|medicine|tablet|syrup|vitamin|capsule|ointment|bandage|injection|antibiotic|augmentin|centrum|glucose strip|accu-chek)\b/.test(n), urls: POOL.pharmacy },
  { test: (n) => /\b(pizza|burger|biryani|meal|platter|catering|sandwich|dessert|lava cake)\b/.test(n), urls: POOL.restaurant },
  { test: (n) => /\b(wallet|lamp|desk)\b/.test(n), urls: POOL.retail },
  { test: (n) => /\b(drill|tape measure|tool|power tool)\b/.test(n), urls: POOL.tools },
  { test: (n) => /\b(pvc|pipe|plumbing|mixer|sanitary|faucet|basin)\b/.test(n), urls: POOL.plumbing },
  { test: (n) => /\b(door handle|hardware)\b/.test(n), urls: POOL.plumbing },
  { test: (n) => /\b(brake pad|brake disc|brake fluid|ferodo)\b/.test(n), urls: POOL.autoparts },
  { test: (n) => /\b(car battery|ns60)\b/.test(n), urls: POOL.carbattery },
  { test: (n) => /\b(oil filter|air filter|spark plug|wiper|shock|strut|serpentine|tie rod|transmission fluid|atf|headlight|bulb|cabin filter|lubricant|5w-30|0w-20|shell helix|castrol)\b/.test(n), urls: POOL.autoparts },
  { test: (n) => /\b(part|oem|aftermarket|genuine|filter|mann|denso|bosch|ngk|brembo)\b/.test(n), urls: POOL.autoparts },
];

const VERTICAL_POOLS = {
  supermarket: [
    ...POOL.produce,
    ...POOL.dairy,
    ...POOL.bakery,
    ...POOL.beverage,
    cardUrl('https://images.unsplash.com/photo-1588964895597-cfccd6bf2d57'),
  ],
  'retail-shop': [
    cardUrl('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da'),
    cardUrl('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d'),
    cardUrl('https://images.unsplash.com/photo-1472851294608-062f824d29cc'),
    ...POOL.fashion,
  ],
  pharmacy: [...POOL.pharmacy, ...POOL.baby],
  'restaurant-cafe': [...POOL.restaurant, ...POOL.beverage],
  'bakery-confectionery': [...POOL.bakery, ...POOL.beverage],
  'electronics-tech': [...POOL.phone, ...POOL.laptop, ...POOL.tv, ...POOL.appliance],
  'fashion-clothing': [...POOL.fashion, ...POOL.textile, ...POOL.pret, ...POOL.footwear, ...POOL.accessoryFashion],
  'hardware-parts': [...POOL.tools, ...POOL.plumbing, ...POOL.autoparts],
  'clinics-healthcare': [...POOL.healthcare, ...POOL.pharmacy],
  'diagnostic-lab': [...POOL.healthcare],
  'dental-clinic': [...POOL.dental],
  'veterinary-clinic': [...POOL.pet, ...POOL.pharmacy],
  'salon-spa': [...POOL.salon],
  'gems-jewellery': [...POOL.jewellery],
  furniture: [...POOL.furniture],
  'bookshop-stationery': [...POOL.books],
  'gym-fitness': [...POOL.gym],
  'solar-energy': [...POOL.solar],
  'mobile-repairing': [...POOL.phone, ...POOL.tools],
  'textile-wholesale': [...POOL.textile, ...POOL.fashion, ...POOL.pret],
  'boutique-fashion': [...POOL.pret, ...POOL.textile, ...POOL.fashion, ...POOL.accessoryFashion, ...POOL.footwear],
  fmcg: [...POOL.snack, ...POOL.beverage, ...POOL.cleaning],
  ecommerce: [...POOL.retail, ...POOL.fashion],
  'leather-footwear': [...POOL.footwear, ...POOL.fashion],
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
 * @param {string} [productCategory]
 * @returns {string}
 */
export function getFallbackProductImageUrl(product, businessCategory, productCategory = '') {
  const name = (product?.name ?? '').toLowerCase().trim();
  const cat = String(productCategory || '').toLowerCase().trim();
  const haystack = cat ? `${name} ${cat}` : name;
  const seed = `${product?.id ?? ''}::${haystack}`;
  for (const rule of NAME_RULES) {
    if (haystack && rule.test(haystack)) {
      const u = pickFromPool(rule.urls, seed);
      if (u) return u;
    }
  }
  const vertical = resolveStorefrontVertical(businessCategory);
  const pool = VERTICAL_POOLS[vertical] || VERTICAL_POOLS[businessCategory] || VERTICAL_POOLS.default;
  const fromVertical = pickFromPool(pool, seed);
  if (fromVertical) return fromVertical;
  return getStorefrontProductPlaceholder(businessCategory);
}

/**
 * Pick a category-accurate Unsplash image for data-lab / template seed products.
 * @param {{ name: string; category?: string; domainKey?: string; seedKey?: string }} args
 */
export function resolveSeedProductImageUrl({ name, category = '', domainKey = '', seedKey = '' }) {
  return getFallbackProductImageUrl(
    { name, id: seedKey || name },
    domainKey || category,
    category
  );
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
    !isDeadImageUrl(raw) &&
    (raw.startsWith('https://') || raw.startsWith('http://') || raw.startsWith('data:'))
  ) {
    if (raw.includes('images.unsplash.com/photo-')) {
      return normalizeUnsplashUrl(raw, CARD);
    }
    return raw;
  }
  const fb = getFallbackProductImageUrl(product, businessCategory, product?.category);
  return fb && fb.includes('images.unsplash.com/photo-') ? normalizeUnsplashUrl(fb, CARD) : fb;
}

/**
 * Open Graph / metadata: never `data:` URLs.
 * @param {{ name?: string; id?: string | number; image_url?: string | null } | null | undefined} product
 * @param {string | null | undefined} businessCategory
 * @returns {string | null}
 */
export function getOpenGraphProductImageUrl(product, businessCategory) {
  const raw = typeof product?.image_url === 'string' ? product.image_url.trim() : '';
  if (!isDeadImageUrl(raw)) {
    if (raw.startsWith('https://')) return raw;
    if (raw.startsWith('http://')) return raw;
  }
  const fb = getFallbackProductImageUrl(product, businessCategory);
  return fb && fb.startsWith('https://') ? normalizeUnsplashUrl(fb, OG) : null;
}
