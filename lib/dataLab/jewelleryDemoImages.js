/**
 * Curated Unsplash imagery for gems & jewellery demo stores.
 * @see https://unsplash.com/license
 */
import { buildUnsplashImageUrl } from '../storefront/unsplashUrl.js';

/** @param {string} photoId @param {number} [w] */
export function jewelleryStockImage(photoId, w = 900) {
  return buildUnsplashImageUrl(photoId, { w, q: 85 });
}

/**
 * Verified jewellery / gemstone photo ids.
 * @type {Record<string, Record<string, string>>}
 */
export const JEWELLERY_DEMO_IMAGES = {
  gold: {
    ring: '1603561596112-0a132b757442',
    chain: '1573408303075-baf4bbf33442',
    bangle: '1617037621780-d359ef4edc8b',
    coin: '1620196065161-3cbf39dddb88',
    earrings: '1599643477878-1fe643ebb36b',
  },
  diamond: {
    solitaire: '1605100804763-247f67b3557e',
    studs: '1611591437281-460bfecff82f',
    bracelet: '1611591437281-460bfbe1220a',
    pendant: '1601128321169-a4d29284a35c',
  },
  bridal: {
    set: '1515562141207-7a88fb7ce338',
    choker: '1595777457583-95e059d581b8',
    payal: '1535632066927-ab7c8ab7ce1d',
  },
  necklace: {
    ruby: '1515562141207-7a88fbbeb966',
    layered: '1573408303075-baf4bbf33442',
    pearl: '1535632066927-ab7c8ab7ce1d',
  },
  earrings: {
    pearl: '1535632066927-ab7c8ab7ce1d',
    hoops: '1599643477878-1fe643ebb36b',
    drops: '1611591437281-460bfecff82f',
  },
  rings: {
    emerald: '1605100804763-247f67b3557e',
    engagement: '1603561596112-0a132b757442',
  },
  silver: {
    pendant: '1602751582510-5fa7597d4f82',
    toeRings: '1611591437281-460bfbe1220a',
  },
  gifts: {
    locket: '1611591437281-460bfecff82f',
    figurine: '1515562141207-7a88fb7ce338',
  },
};

/**
 * @param {string} department
 * @param {string} key
 * @param {number} [w]
 */
export function getJewelleryDemoImage(department, key, w = 900) {
  const id = JEWELLERY_DEMO_IMAGES[department]?.[key];
  return id ? jewelleryStockImage(id, w) : null;
}
