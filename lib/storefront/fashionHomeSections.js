/**
 * Fashion homepage department sections, maps live inventory + categories to
 * Unstitched, Ready to Wear, Accessories, and New Arrivals blocks.
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { getLuxuryFashionVariant } from './luxuryFashion';
import { getEffectiveProductImageUrl } from './productImageFallback';
import { getFashionRuleImage } from '@/lib/dataLab/fashionDemoImages';

/** @typedef {{ id: string; label: string; href: string; image: string; productCount?: number }} DeptTile */
/** @typedef {{ id: string; label: string; href: string; image: string }} CircleTile */

const UNSTITCHED_KEYWORDS = [
  'unstitched', 'un-stitched', 'fabric', 'lawn', 'cotton', 'khaddar', 'chiffon',
  'wash & wear', 'wash and wear', 'thaan', 'roll', 'textile', 'monochrome',
];

const UNSTITCHED_TILE_RULES = [
  { id: 'summer', label: 'SUMMER', keywords: ['summer', 'essential summer', 'lawn', 'signature summer'] },
  { id: 'embroidered', label: 'EMBROIDERED', keywords: ['embroider', 'chikankari', 'festive', 'bridal', 'formal'] },
  { id: 'printed', label: 'PRINTED', keywords: ['print', 'digital', 'monochrome', 'graphic'] },
  { id: 'lawn', label: 'LAWN', keywords: ['lawn'] },
];

const RTW_KEYWORDS = [
  'ready to wear', 'ready-to-wear', 'pret', 'stitched', 'formal', 'co-ord', 'coord',
  'kurti', 'kurta', 'bottom', 'eastern', 'semi-formal', 'luxury pret', 'tunic',
];

const RTW_CIRCLE_RULES = [
  { id: 'embroidered', label: 'EMBROIDERED', keywords: ['embroider', 'chikankari'] },
  { id: 'printed', label: 'PRINTED', keywords: ['print', 'digital'] },
  { id: 'solids', label: 'SOLIDS', keywords: ['solid', 'monochrome', 'basic'] },
  { id: 'coords', label: 'CO-ORDS', keywords: ['co-ord', 'coord', 'co ord'] },
  { id: 'formals', label: 'FORMALS', keywords: ['formal', 'bridal', 'party'] },
  { id: 'kurtis', label: 'KURTIS', keywords: ['kurti', 'kurta', 'tunic'] },
  { id: 'bottoms', label: 'BOTTOMS', keywords: ['bottom', 'trouser', 'pant'] },
];

const ACCESSORY_KEYWORDS = [
  'accessories', 'accessory', 'bag', 'wallet', 'jewell', 'jewelry', 'scarf', 'shawl',
  'sunglass', 'watch', 'footwear', 'shoe', 'sandal', 'belt', 'cap', 'stole', 'hair',
];

const ACCESSORY_CIRCLE_RULES = [
  { id: 'footwear', label: 'FOOTWEAR', keywords: ['footwear', 'shoe', 'sandal', 'heel'] },
  { id: 'bags', label: 'BAGS', keywords: ['bag', 'tote', 'cross-body', 'shoulder'] },
  { id: 'jewellery', label: 'JEWELLERY', keywords: ['jewell', 'jewelry', 'earring', 'necklace'] },
  { id: 'wallets', label: 'WALLETS', keywords: ['wallet', 'card holder'] },
  { id: 'shawls', label: 'SHAWLS', keywords: ['shawl'] },
  { id: 'scarves', label: 'SCARVES', keywords: ['scarf', 'stole'] },
  { id: 'sunglasses', label: 'SUNGLASSES', keywords: ['sunglass'] },
  { id: 'watches', label: 'WATCHES', keywords: ['watch'] },
  { id: 'hair', label: 'HAIR ACCESSORIES', keywords: ['hair clip', 'hair pin', 'hair accessory', 'hair'] },
  { id: 'dupattas', label: 'DUPATTAS', keywords: ['dupatta'] },
];

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function haystack(product) {
  const dd = product.domain_data && typeof product.domain_data === 'object' ? product.domain_data : {};
  return [
    product.name,
    product.category,
    product.category_name,
    product.brand,
    product.description,
    dd.fabrictype,
    dd.korafinished,
    dd.stitchingtype,
    dd.collection,
    dd.line,
    dd.department,
    dd.accessoryType,
    dd.footwearType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function haystackCategory(cat) {
  return [cat.name, cat.slug, cat.description].filter(Boolean).join(' ').toLowerCase();
}

/**
 * @param {object} product
 * @param {object} cat
 */
function productInCategory(product, cat) {
  if (product.category_id && cat.id && product.category_id === cat.id) return true;
  if (product.category_slug && cat.slug && product.category_slug === cat.slug) return true;
  const pCat = norm(product.category_name || product.category);
  const cName = norm(cat.name);
  const cSlug = norm(cat.slug);
  return (pCat && (pCat === cName || pCat.replace(/\s+/g, '-') === cSlug));
}

/**
 * @param {object[]} products
 * @param {string[]} keywords
 */
function filterProductsByKeywords(products, keywords) {
  return products.filter((p) => keywords.some((k) => haystack(p).includes(k)));
}

/**
 * @param {object[]} categories
 * @param {string[]} keywords
 */
function filterCategoriesByKeywords(categories, keywords) {
  return categories.filter((c) => keywords.some((k) => haystackCategory(c).includes(k)));
}

/**
 * @param {string} base
 * @param {object} cat
 */
function categoryHref(base, cat) {
  return `${base}/products?category=${encodeURIComponent(cat.slug)}`;
}

/**
 * @param {object} args
 */
function resolveSectionImage({ ruleId, section, imageProduct, businessCategory, rule, usedImages }) {
  const curated = getFashionRuleImage(ruleId, 700, section);
  const productUrl =
    imageProduct && getEffectiveProductImageUrl(imageProduct, businessCategory);
  const candidates = [curated, productUrl].filter(Boolean);
  for (const url of candidates) {
    if (!usedImages?.has(url)) {
      usedImages?.add(url);
      return url;
    }
  }
  return (
    curated ||
    productUrl ||
    getFashionRuleImage(ruleId, 700, section) ||
    getEffectiveProductImageUrl({ name: rule.label, category: rule.label }, businessCategory)
  );
}

/**
 * @param {object} args
 */
function pickCategoryTile({
  base,
  rule,
  categories,
  products,
  businessCategory,
  usedCategoryIds,
  section = 'unstitched',
  usedImages,
}) {
  const matchedCats = filterCategoriesByKeywords(categories, rule.keywords)
    .filter((c) => !usedCategoryIds.has(c.id))
    .sort((a, b) => (Number(b.product_count) || 0) - (Number(a.product_count) || 0));

  if (matchedCats[0]) {
    const cat = matchedCats[0];
    usedCategoryIds.add(cat.id);
    const catProducts = products.filter((p) => productInCategory(p, cat));
    const imageProduct = catProducts[0] || products.find((p) => rule.keywords.some((k) => haystack(p).includes(k)));
    return {
      id: rule.id,
      label: rule.label,
      href: categoryHref(base, cat),
      image: resolveSectionImage({
        ruleId: rule.id,
        section,
        imageProduct,
        businessCategory,
        rule,
        usedImages,
      }),
      productCount: Number(cat.product_count) || catProducts.length,
    };
  }

  const matchedProducts = filterProductsByKeywords(products, rule.keywords);
  if (!matchedProducts.length) return null;

  const best = matchedProducts[0];
  const slug = norm(best.category_name || best.category).replace(/\s+/g, '-');
  return {
    id: rule.id,
    label: rule.label,
    href: slug
      ? `${base}/products?category=${encodeURIComponent(slug)}`
      : `${base}/products?search=${encodeURIComponent(rule.keywords[0])}`,
    image: resolveSectionImage({
      ruleId: rule.id,
      section,
      imageProduct: best,
      businessCategory,
      rule,
      usedImages,
    }),
    productCount: matchedProducts.length,
  };
}

/**
 * @param {object} args
 */
function pickCircleTile({
  base,
  rule,
  categories,
  products,
  businessCategory,
  usedCategoryIds,
  section = 'rtw',
  usedImages,
}) {
  const tile = pickCategoryTile({
    base,
    rule,
    categories,
    products,
    businessCategory,
    usedCategoryIds,
    section,
    usedImages,
  });
  if (!tile) return null;
  return {
    id: tile.id,
    label: rule.label,
    href: tile.href,
    image: tile.image,
  };
}

/**
 * @param {string} base
 * @param {object[]} categories
 * @param {object[]} products
 * @param {string} businessCategory
 */
function buildAccessoryCircles(base, categories, products, businessCategory) {
  const used = new Set();
  const usedImages = new Set();
  /** @type {CircleTile[]} */
  const circles = [];
  const accessoryProducts = filterProductsByKeywords(products, ACCESSORY_KEYWORDS);

  for (const rule of ACCESSORY_CIRCLE_RULES) {
    const tile = pickCircleTile({
      base,
      rule,
      categories,
      products: accessoryProducts.length ? accessoryProducts : products,
      businessCategory,
      usedCategoryIds: used,
      section: 'accessories',
      usedImages,
    });
    if (tile) circles.push(tile);
  }

  if (circles.length < 2) {
    const seenIds = new Set(circles.map((c) => c.id));
    for (const product of accessoryProducts) {
      const rule = ACCESSORY_CIRCLE_RULES.find((r) => r.keywords.some((k) => haystack(product).includes(k)));
      const id = rule?.id || `product-${product.id}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const slug = norm(product.category_name || product.category).replace(/\s+/g, '-');
      circles.push({
        id,
        label:
          rule?.label ||
          String(product.name || 'Accessory')
            .split(/\s+/)
            .slice(0, 2)
            .join(' ')
            .toUpperCase(),
        href: product.slug
          ? `${base}/products/${product.slug}`
          : slug
            ? `${base}/products?category=${encodeURIComponent(slug)}`
            : `${base}/products?search=${encodeURIComponent(product.name || 'accessories')}`,
        image: getFashionRuleImage(id, 500, 'accessories') ||
          getEffectiveProductImageUrl(product, businessCategory),
      });
      if (circles.length >= 2) return circles;
    }
  }

  if (circles.length < 2) {
    const accessoryCats = filterCategoriesByKeywords(categories, ACCESSORY_KEYWORDS)
      .sort((a, b) => (Number(b.product_count) || 0) - (Number(a.product_count) || 0))
      .slice(0, 9);

    const seenIds = new Set(circles.map((c) => c.id));
    for (const cat of accessoryCats) {
      const catId = cat.id || cat.slug;
      if (seenIds.has(catId)) continue;
      seenIds.add(catId);
      const catProducts = products.filter((p) => productInCategory(p, cat));
      const imageProduct = catProducts[0];
      circles.push({
        id: catId,
        label: String(cat.name || 'Accessory').toUpperCase(),
        href: categoryHref(base, cat),
        image:
          (imageProduct && getEffectiveProductImageUrl(imageProduct, businessCategory)) ||
          cat.image_url ||
          getEffectiveProductImageUrl({ name: cat.name, category: 'Accessories' }, businessCategory),
      });
      if (circles.length >= 2) break;
    }
  }

  return circles;
}

/**
 * @param {{
 *   businessDomain: string;
 *   businessCategory?: string;
 *   categories?: object[];
 *   products?: object[];
 *   newArrivalProducts?: object[];
 *   offerProducts?: object[];
 * }} args
 */
export function buildFashionHomeSections({
  businessDomain,
  businessCategory,
  categories = [],
  products = [],
  newArrivalProducts = [],
  offerProducts = [],
}) {
  const base = `/store/${businessDomain}`;
  const canonical = resolveDomainKey(businessCategory);
  const variant = getLuxuryFashionVariant(canonical) || 'boutique';

  const unstitchedProducts = filterProductsByKeywords(products, UNSTITCHED_KEYWORDS);
  const rtwProducts = filterProductsByKeywords(products, RTW_KEYWORDS);
  const accessoryProducts = filterProductsByKeywords(products, ACCESSORY_KEYWORDS);

  const usedUnstitched = new Set();
  const unstitchedImages = new Set();
  /** @type {DeptTile[]} */
  const unstitchedTiles = [];
  for (const rule of UNSTITCHED_TILE_RULES) {
    const tile = pickCategoryTile({
      base,
      rule,
      categories: filterCategoriesByKeywords(categories, UNSTITCHED_KEYWORDS).length
        ? filterCategoriesByKeywords(categories, UNSTITCHED_KEYWORDS)
        : categories,
      products: unstitchedProducts.length ? unstitchedProducts : products,
      businessCategory,
      usedCategoryIds: usedUnstitched,
      section: 'unstitched',
      usedImages: unstitchedImages,
    });
    if (tile) unstitchedTiles.push(tile);
  }

  const usedRtw = new Set();
  const rtwImages = new Set();
  /** @type {CircleTile[]} */
  const readyToWearCircles = [];
  for (const rule of RTW_CIRCLE_RULES) {
    const tile = pickCircleTile({
      base,
      rule,
      categories: filterCategoriesByKeywords(categories, RTW_KEYWORDS).length
        ? filterCategoriesByKeywords(categories, RTW_KEYWORDS)
        : categories,
      products: rtwProducts.length ? rtwProducts : products,
      businessCategory,
      usedCategoryIds: usedRtw,
      section: 'rtw',
      usedImages: rtwImages,
    });
    if (tile) readyToWearCircles.push(tile);
  }

  const accessoryCircles = buildAccessoryCircles(
    base,
    categories,
    accessoryProducts.length ? accessoryProducts : products,
    businessCategory
  );

  const newArrivals = [...newArrivalProducts]
    .sort((a, b) => {
      if (a.is_new && !b.is_new) return -1;
      if (!a.is_new && b.is_new) return 1;
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    })
    .slice(0, 16);

  // Offers: on-sale products (compare_price above selling price), biggest markdown first.
  const offers = [...offerProducts]
    .filter((p) => {
      const price = Number(p.price) || 0;
      const compare = Number(p.compare_price) || 0;
      return compare > price && price > 0;
    })
    .sort((a, b) => {
      const da = (Number(a.compare_price) - Number(a.price)) / (Number(a.compare_price) || 1);
      const db = (Number(b.compare_price) - Number(b.price)) / (Number(b.compare_price) || 1);
      return db - da;
    })
    .slice(0, 16);

  const flags = {
    boutique: { unstitched: true, rtw: true, accessories: true, newArrivals: true },
    textile: { unstitched: true, rtw: false, accessories: false, newArrivals: true },
    leather: { unstitched: false, rtw: false, accessories: true, newArrivals: true },
    jewellery: { unstitched: false, rtw: false, accessories: true, newArrivals: true },
  }[variant] || { unstitched: true, rtw: true, accessories: true, newArrivals: true };

  return {
    variant,
    unstitched: {
      title: 'UNSTITCHED',
      tiles: unstitchedTiles,
      show: flags.unstitched && unstitchedTiles.length >= 2,
      viewAllHref: `${base}/products?search=${encodeURIComponent('unstitched')}`,
    },
    readyToWear: {
      title: 'READY TO WEAR',
      circles: readyToWearCircles,
      show: flags.rtw && readyToWearCircles.length >= 3,
      viewAllHref: `${base}/products?search=${encodeURIComponent('ready to wear')}`,
    },
    accessories: {
      title: 'ACCESSORIES',
      circles: accessoryCircles,
      show: flags.accessories && accessoryCircles.length >= 2,
      viewAllHref: `${base}/products?search=${encodeURIComponent('accessories')}`,
    },
    offers: {
      title: 'OFFERS & SALE',
      products: offers,
      catalogPool: offers,
      show: offers.length >= 2,
      viewAllHref: `${base}/products?onSale=true`,
    },
    newArrivals: {
      title: 'NEW ARRIVALS',
      products: newArrivals,
      catalogPool: products,
      show: flags.newArrivals && newArrivals.length >= 2,
      viewAllHref: `${base}/products?sort=newest`,
    },
  };
}
