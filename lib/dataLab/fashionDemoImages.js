/**
 * Curated, verified Unsplash imagery for Pakistani fashion demo stores.
 * Each id was checked against images.unsplash.com with ixlib=rb-4.1.0.
 */
import { buildUnsplashImageUrl } from '../storefront/unsplashUrl.js';

/** @param {string} photoId @param {number} [w] */
export function fashionStockImage(photoId, w = 900) {
  return buildUnsplashImageUrl(photoId, { w, q: 85 });
}

/**
 * @type {Record<string, Record<string, string>>}
 */
export const FASHION_DEMO_IMAGES = {
  unstitched: {
    summer: '1594938298603-c8148c4dae35',
    embroidered: '1490481651871-ab68de25d43d',
    printed: '1469334031218-e382a71b716b',
    lawn: '1617137968427-85924c800a22',
    cotton: '1617137968427-85924c800a22',
    chiffon: '1490481651871-ab68de25d43d',
  },
  rtw: {
    embroidered: '1556905055-8f358a7a47b2',
    printed: '1509631179647-0177331693ae',
    solids: '1445205170230-053b83016050',
    coords: '1515886657613-9f3515b0c78f',
    formals: '1566174053879-31528523f8ae',
    kurtis: '1441984904996-e0b6ba687e04',
    bottoms: '1549298916-b41d501d3772',
    silk: '1490481651871-ab68de25d43d',
  },
  western: {
    top: '1441984904996-e0b6ba687e04',
    lounge: '1515886657613-9f3515b0c78f',
  },
  accessories: {
    footwear: '1608231387042-66d1773070a5',
    bags: '1594223274512-ad4803739b7c',
    jewellery: '1515562141207-7a88fb7ce338',
    wallets: '1607082348824-0a96f2a4b9da',
    shawls: '1523381210434-271e8be1f52b',
    scarves: '1472851294608-062f824d29cc',
    sunglasses: '1611591437281-460bfbe1220a',
    watches: '1523275335684-37898b6baf30',
    hair: '1611591437281-460bfbe1220a',
    dupattas: '1556905055-8f358a7a47b2',
    slides: '1543163521-1bf539c55dd2',
    stole: '1472851294608-062f824d29cc',
    scarf: '1523381210434-271e8be1f52b',
    bag: '1594223274512-ad4803739b7c',
    wallet: '1607082348824-0a96f2a4b9da',
    shawl: '1523381210434-271e8be1f52b',
    dupatta: '1556905055-8f358a7a47b2',
    watch: '1523275335684-37898b6baf30',
  },
  hero: {
    editorial: '1441984904996-e0b6ba687e04',
    pret: '1469334031218-e382a71b716b',
    accessories: '1515562141207-7a88fb7ce338',
  },
};

const RULE_IMAGE_MAP = {
  summer: ['unstitched', 'summer'],
  embroidered: ['unstitched', 'embroidered'],
  printed: ['unstitched', 'printed'],
  lawn: ['unstitched', 'lawn'],
  solids: ['rtw', 'solids'],
  coords: ['rtw', 'coords'],
  formals: ['rtw', 'formals'],
  kurtis: ['rtw', 'kurtis'],
  bottoms: ['rtw', 'bottoms'],
  footwear: ['accessories', 'footwear'],
  bags: ['accessories', 'bags'],
  jewellery: ['accessories', 'jewellery'],
  wallets: ['accessories', 'wallets'],
  shawls: ['accessories', 'shawls'],
  scarves: ['accessories', 'scarves'],
  sunglasses: ['accessories', 'sunglasses'],
  watches: ['accessories', 'watches'],
  hair: ['accessories', 'hair'],
  dupattas: ['accessories', 'dupattas'],
};

/**
 * @param {string} department
 * @param {string} key
 * @param {number} [w]
 */
export function getFashionDemoImage(department, key, w = 900) {
  const id = FASHION_DEMO_IMAGES[department]?.[key];
  return id ? fashionStockImage(id, w) : null;
}

/**
 * @param {string} ruleId
 * @param {number} [w]
 * @param {'unstitched' | 'rtw' | 'accessories'} [section]
 */
export function getFashionRuleImage(ruleId, w = 600, section = 'unstitched') {
  if (section === 'rtw' && FASHION_DEMO_IMAGES.rtw?.[ruleId]) {
    return getFashionDemoImage('rtw', ruleId, w);
  }
  if (section === 'accessories' && FASHION_DEMO_IMAGES.accessories?.[ruleId]) {
    return getFashionDemoImage('accessories', ruleId, w);
  }
  const mapping = RULE_IMAGE_MAP[ruleId];
  if (!mapping) return null;
  const [dept, key] = mapping;
  return getFashionDemoImage(dept, key, w);
}
