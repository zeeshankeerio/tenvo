/**
 * Demo / registration product catalog with realistic names, pricing, and
 * Unsplash stock imagery (https://unsplash.com/license, safe for demos).
 *
 * We do NOT scrape Amazon, Daraz, or Shopify storefronts (ToS + copyright).
 * Images are chosen via keyword + vertical matching in productImageFallback.js.
 */

import { resolveSeedProductImageUrl } from '../storefront/productImageFallback.js';
import { buildUnsplashImageUrl } from '../storefront/unsplashUrl.js';
import { getDomainKnowledge } from '../domainKnowledge.js';
import { BOUTIQUE_FASHION_SEED_PRODUCTS } from './fashionDemoCatalog.js';
import { GEMS_JEWELLERY_SEED_PRODUCTS } from './jewelleryDemoCatalog.js';
import { VEHICLE_DEALERSHIP_SEED_PRODUCTS } from './vehicleDealershipCatalog.js';
import { AUTO_MARKETPLACE_SEED_PRODUCTS } from './autoMarketplaceCatalog.js';
import { PHARMACY_SEED_PRODUCTS } from './pharmacyDemoCatalog.js';
import { SUPERMARKET_SEED_PRODUCTS } from './supermarketDemoCatalog.js';
import { resolveStorefrontVertical } from '../config/storefrontDomains.js';
import { FURNITURE_SEED_PRODUCTS } from './furnitureDemoCatalog.js';
import { RESTAURANT_SEED_PRODUCTS } from './restaurantDemoCatalog.js';
import { AUTO_PARTS_SEED_CATALOG } from './autopartsSeedCatalog.js';
import { FITNESS_SEED_PRODUCTS } from './fitnessDemoCatalog.js';
import {
  GARMENTS_SEED_PRODUCTS,
  TEXTILE_MILL_SEED_PRODUCTS,
  TEXTILE_WHOLESALE_IMPORTED_SUPPLEMENT,
} from './pakistanClothingSeedCatalog.js';

function slugifyProductName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'product';
}

// ── Apparel size/color variant seeding ──────────────────────────────────────
// Clothing verticals ship stitched / ready-to-wear ("Pret") garments that need
// BOTH a size and a color picker to sell online. We generate a size × color
// matrix so shoppers pick size + color at checkout. Fabric/unstitched/accessory
// SKUs are sold by the piece/meter and must NOT get sizes/colors.
const APPAREL_VARIANT_DOMAIN_KEYS = new Set(['garments', 'boutique-fashion']);
const ADULT_SIZE_RUN = ['S', 'M', 'L', 'XL'];
const KIDS_SIZE_RUN = ['2-3Y', '4-5Y', '6-7Y', '8-9Y'];

// Plausible color runs per garment type (demo data owners can edit in the hub).
const APPAREL_COLOR_PALETTES = [
  { re: /kid|child|boys?|girls?/, colors: ['Red', 'Royal Blue', 'Green'] },
  { re: /jeans|denim|trouser|bottom/, colors: ['Blue', 'Black', 'Charcoal'] },
  { re: /formal|\bshirt\b/, colors: ['White', 'Sky Blue', 'Black'] },
  { re: /kurta/, colors: ['White', 'Black', 'Maroon'] },
  { re: /co-?ord|lounge|\btop\b|western|dress|abaya/, colors: ['Black', 'Maroon', 'Beige'] },
  { re: /suit|pret/, colors: ['Ivory', 'Teal', 'Rust'] },
];
const DEFAULT_APPAREL_COLORS = ['Black', 'White', 'Navy'];

function isSizedApparelSeedItem(item) {
  const name = String(item?.name || '');
  const category = String(item?.category || '');
  const stitching = String(
    item?.domain_data?.stitchingstatus || item?.domain_data?.stitchingtype || ''
  );
  const unit = String(item?.unit || '').toLowerCase();
  const hay = `${name} ${category} ${stitching}`.toLowerCase();

  if (/accessor|scarf|stole|dupatta|\bbag\b|jewell|footwear|\bshoe/.test(hay)) return false;
  if (/unstitch|fabric|thaan|\byarn\b|\broll\b|\bdye\b/.test(hay)) return false;
  if (['meter', 'metre', 'thaan', 'kg', 'roll', 'yard'].includes(unit)) return false;

  if (/ready|stitched|pret/.test(stitching.toLowerCase())) return true;
  if (/\(pret\)|\bpret\b/.test(name.toLowerCase())) return true;
  if (/stitched|western|semi-?formal|co-?ord/.test(category.toLowerCase())) return true;
  if (
    /shirt|kurta|jeans|trouser|\btop\b|co-?ord|suit|dress|abaya/.test(name.toLowerCase()) &&
    ['pcs', 'set', 'piece'].includes(unit)
  ) {
    return true;
  }
  return false;
}

function seedApparelColor(item) {
  const matrix = item?.domain_data?.sizecolormatrix;
  if (typeof matrix === 'string' && matrix.includes('-')) {
    const parts = matrix.split('-').map((s) => s.trim()).filter(Boolean);
    const color = parts[parts.length - 1];
    if (color && !/^\d/.test(color) && !/^(xs|s|m|l|xl|xxl)$/i.test(color)) return color;
  }
  return null;
}

function seedApparelColors(item) {
  const label = `${item?.name || ''} ${item?.category || ''}`.toLowerCase();
  let palette = DEFAULT_APPAREL_COLORS;
  for (const p of APPAREL_COLOR_PALETTES) {
    if (p.re.test(label)) {
      palette = p.colors;
      break;
    }
  }
  const derived = seedApparelColor(item);
  if (derived) {
    palette = [derived, ...palette.filter((c) => c.toLowerCase() !== derived.toLowerCase())].slice(0, 3);
  }
  return palette;
}

function colorCode(color) {
  return String(color).replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || 'CLR';
}

/**
 * Build a size × color variant matrix for a sized apparel seed item, splitting the
 * headline stock across combinations. Returns null for non-apparel/unstitched items.
 */
function buildApparelVariantsForSeed(item, { sku, price, costPrice, stock }) {
  if (!isSizedApparelSeedItem(item)) return null;
  const label = `${item?.name || ''} ${item?.category || ''}`.toLowerCase();
  const isKids = /\bkid|child|boys?|girls?\b/.test(label);
  const sizes = isKids ? KIDS_SIZE_RUN : ADULT_SIZE_RUN;
  const colors = seedApparelColors(item);
  const baseSku = (sku || slugifyProductName(item?.name).slice(0, 16)).toUpperCase();

  const combos = [];
  for (const size of sizes) {
    for (const color of colors) {
      combos.push({ size, color });
    }
  }

  const total = Number(stock) > 0 ? Math.floor(Number(stock)) : combos.length * 3;
  const per = Math.max(1, Math.floor(total / combos.length));
  let remaining = total;

  return combos.map(({ size, color }, i) => {
    const qty = i === combos.length - 1 ? Math.max(0, remaining) : per;
    remaining -= qty;
    return {
      variant_sku: `${baseSku}-${String(size).replace(/[^A-Za-z0-9]/g, '')}-${colorCode(color)}`,
      variant_name: `${size} / ${color}`,
      size,
      color,
      price: Number(price) || 0,
      cost_price: Number(costPrice) || 0,
      stock: qty,
    };
  });
}

/** @param {string} photoId Unsplash photo id (after "photo-") @param {number} [w] */
export function stockImage(photoId, w = 800) {
  return buildUnsplashImageUrl(photoId, { w, q: 82 });
}

/** @type {Record<string, Array<Record<string, unknown>>>} */
export const RICH_PRODUCT_CATALOG = {
  garments: GARMENTS_SEED_PRODUCTS,

  'textile-wholesale': [
    {
      name: 'Gul Ahmed Digital Print Lawn 3pc',
      brand: 'Gul Ahmed',
      category: 'Lawn',
      unit: 'suit',
      price: 4500,
      compare_price: 5200,
      cost_price: 3200,
      stock: 48,
      sku: 'GA-LWN-DGT-001',
      description: 'Premium digital print lawn, shirt, dupatta, trouser.',
      image_url: stockImage('1594938298603-c8148c4dae35'),
      imageCredit: 'Unsplash',
      domain_data: { fabrictype: 'Lawn', korafinished: 'Printed', articleno: 'GA-101' },
      is_featured: true,
    },
    {
      name: 'Al-Karam Cotton Mens Unstitched',
      brand: 'Al-Karam',
      category: 'Cotton',
      unit: 'suit',
      price: 3500,
      compare_price: 3990,
      cost_price: 2600,
      stock: 36,
      sku: 'AK-COT-M-002',
      description: 'Fine Egyptian cotton mens collection.',
      image_url: stockImage('1558171813-e2f8110a3b1e'),
      domain_data: { fabrictype: 'Cotton', korafinished: 'Finished' },
    },
    {
      name: 'Double Ghora Khaddar Winter',
      brand: 'Local Mill',
      category: 'Khaddar',
      unit: 'thaan',
      price: 8500,
      cost_price: 6200,
      stock: 22,
      sku: 'DG-KHD-TH-003',
      description: 'Double width khaddar thaan (~40m) for winter shawls & suits.',
      image_url: stockImage('1586796640118-4811f0880a72'),
      domain_data: { thaanlength: 40, fabrictype: 'Khaddar' },
    },
    {
      name: 'Mens Unstitched Wash & Wear Suit Pack',
      brand: 'Faisalabad Mill',
      category: 'Mens Unstitched',
      unit: 'suit',
      price: 2200,
      compare_price: 2590,
      cost_price: 1650,
      stock: 80,
      sku: 'TW-MU-WW-014',
      description: 'Wholesale mens wash & wear unstitched suit pack for retailer restock.',
      image_url: stockImage('1617137968427-85924c800a22'),
      domain_data: {
        fabrictype: 'Wash & Wear',
        korafinished: 'Finished',
        articleno: 'MU-WW-014',
        designno: 'D-214',
        sourcing: 'local',
      },
      is_featured: true,
    },
    {
      name: 'Sana Safinaz Luxury Chiffon',
      brand: 'Sana Safinaz',
      category: 'Chiffon',
      unit: 'suit',
      price: 12500,
      compare_price: 14900,
      cost_price: 9200,
      stock: 14,
      sku: 'SS-CHF-LUX-005',
      description: 'Embroidered luxury chiffon formal.',
      image_url: stockImage('1591047139820-d6a65d336856'),
      domain_data: { fabrictype: 'Chiffon', korafinished: 'Embroidered' },
    },
    {
      name: 'Grace Wash & Wear Executive',
      brand: 'Grace',
      category: 'Wash & Wear',
      unit: 'suit',
      price: 2800,
      cost_price: 2100,
      stock: 55,
      sku: 'GR-WW-EX-006',
      description: 'Premium mens wash & wear 2pc.',
      image_url: stockImage('1617137968427-85924c800a22'),
    },
    {
      name: 'Premium Cotton Thaan (35m Roll)',
      brand: 'Faisalabad Mill',
      category: 'Cotton',
      unit: 'thaan',
      price: 15000,
      cost_price: 11800,
      stock: 10,
      sku: 'CTN-THN-35',
      description: 'Bleached cotton roll for wholesale cutting.',
      image_url: stockImage('1509042237730-0909102a63ed'),
      domain_data: { thaanlength: 35 },
    },
    {
      name: 'Maria B Embroidered Festive',
      brand: 'Maria B',
      category: 'Bridal Collection',
      unit: 'suit',
      price: 18900,
      compare_price: 22000,
      cost_price: 14500,
      stock: 8,
      sku: 'MB-FST-008',
      description: 'Festive embroidered 3pc with organza dupatta.',
      image_url: stockImage('1490481651871-ab68de25d000'),
      is_featured: true,
    },
    ...TEXTILE_WHOLESALE_IMPORTED_SUPPLEMENT,
  ],

  'textile-mill': TEXTILE_MILL_SEED_PRODUCTS,

  'boutique-fashion': BOUTIQUE_FASHION_SEED_PRODUCTS,

  'gems-jewellery': GEMS_JEWELLERY_SEED_PRODUCTS,
  'vehicle-dealership': VEHICLE_DEALERSHIP_SEED_PRODUCTS,
  'auto-marketplace': AUTO_MARKETPLACE_SEED_PRODUCTS,

  'retail-shop': [
    {
      name: 'Standard T-Shirt, Cotton Crew Neck',
      brand: 'Outfitters',
      category: 'Clothing',
      unit: 'pcs',
      price: 850,
      compare_price: 1100,
      cost_price: 520,
      stock: 80,
      sku: 'RTL-TEE-001',
      image_url: stockImage('1521572267360-ee0c2907d7e0'),
      domain_data: { size: 'M', color: 'White' },
    },
    {
      name: 'Leather Bifold Wallet',
      brand: 'Local',
      category: 'Accessories',
      unit: 'pcs',
      price: 1500,
      compare_price: 1899,
      cost_price: 900,
      stock: 35,
      sku: 'RTL-WLT-002',
      image_url: stockImage('1627123427854-05d3f2b9d900'),
    },
    {
      name: 'LED Desk Lamp, USB Powered',
      brand: 'Imported',
      category: 'Home & Living',
      unit: 'pcs',
      price: 2400,
      compare_price: 2999,
      cost_price: 1650,
      stock: 24,
      sku: 'RTL-LMP-003',
      image_url: stockImage('1507473889641-bef09dcb8081'),
      is_featured: true,
    },
    {
      name: 'Wireless Earbuds Pro',
      brand: 'Imported',
      category: 'Electronics',
      unit: 'pcs',
      price: 3499,
      compare_price: 4299,
      cost_price: 2400,
      stock: 40,
      sku: 'RTL-EAR-004',
      image_url: stockImage('1598331668826-35b359a186de'),
    },
    {
      name: 'Running Sneakers, Unisex',
      brand: 'Imported',
      category: 'Footwear',
      unit: 'pcs',
      price: 4990,
      compare_price: 5990,
      cost_price: 3200,
      stock: 28,
      sku: 'RTL-SNK-005',
      image_url: stockImage('1542291026-7eec264c27ff'),
    },
    {
      name: 'Stainless Steel Water Bottle 1L',
      brand: 'Local',
      category: 'Personal Care',
      unit: 'pcs',
      price: 890,
      cost_price: 550,
      stock: 60,
      sku: 'RTL-BTL-006',
      image_url: stockImage('1602143407151-7111542de6e8'),
    },
  ],

  supermarket: SUPERMARKET_SEED_PRODUCTS,
  fmcg: SUPERMARKET_SEED_PRODUCTS,
  'dairy-farm': SUPERMARKET_SEED_PRODUCTS,
  'poultry-farm': SUPERMARKET_SEED_PRODUCTS,
  'livestock-cattle': SUPERMARKET_SEED_PRODUCTS,

  pharmacy: PHARMACY_SEED_PRODUCTS,

  furniture: FURNITURE_SEED_PRODUCTS,

  restaurant: RESTAURANT_SEED_PRODUCTS,

  'restaurant-cafe': RESTAURANT_SEED_PRODUCTS,

  'dental-clinic': [
    {
      name: 'Dental Cleaning & Scaling',
      brand: 'Clinic',
      category: 'Preventive',
      unit: 'service',
      price: 4500,
      cost_price: 1200,
      stock: 999,
      sku: 'DNT-SCL-001',
      image_url: stockImage('1582719478250-c89cae4dc85b'),
    },
    {
      name: 'Composite Filling (1 Surface)',
      brand: 'Clinic',
      category: 'Restorative',
      unit: 'service',
      price: 6500,
      cost_price: 2200,
      stock: 999,
      sku: 'DNT-FIL-001',
      image_url: stockImage('1587854692152-cbe660dbde88'),
    },
    {
      name: 'OPG X-Ray Full Mouth',
      brand: 'Clinic',
      category: 'Diagnostics',
      unit: 'service',
      price: 2500,
      cost_price: 800,
      stock: 999,
      sku: 'DNT-XRY-OPG',
      image_url: stockImage('1559757148-5c350d0d3c56'),
    },
    {
      name: 'Teeth Whitening Session',
      brand: 'Clinic',
      category: 'Cosmetic',
      unit: 'service',
      price: 15000,
      compare_price: 18000,
      cost_price: 5500,
      stock: 999,
      sku: 'DNT-WHT-001',
      image_url: stockImage('1584308666744-24d5c474f2ae'),
      is_featured: true,
    },
    {
      name: 'Root Canal Treatment (Molar)',
      brand: 'Clinic',
      category: 'Restorative',
      unit: 'service',
      price: 18000,
      cost_price: 6500,
      stock: 999,
      sku: 'DNT-RCT-MOL',
      image_url: stockImage('1582719478250-c89cae4dc85b'),
    },
    {
      name: 'Dental Implant Consultation',
      brand: 'Clinic',
      category: 'Cosmetic',
      unit: 'service',
      price: 2500,
      cost_price: 900,
      stock: 999,
      sku: 'DNT-IMP-CON',
      image_url: stockImage('1559757148-5c350d0d3c56'),
      is_featured: true,
    },
  ],

  'auto-parts': AUTO_PARTS_SEED_CATALOG,

  'gym-fitness': FITNESS_SEED_PRODUCTS,

  'hardware-sanitary': [
    {
      name: 'Stanley 25ft Tape Measure',
      brand: 'Stanley',
      category: 'Tools',
      unit: 'pcs',
      price: 1850,
      compare_price: 2200,
      cost_price: 1200,
      stock: 45,
      sku: 'HW-TAP-25',
      image_url: stockImage('1504148455325-0c9e7ed84403'),
    },
    {
      name: 'PVC Pipe 1" Class B (3m)',
      brand: 'Popular',
      category: 'Plumbing',
      unit: 'pcs',
      price: 420,
      cost_price: 310,
      stock: 120,
      sku: 'HW-PVC-1IN',
      image_url: stockImage('1621905252507-b35492cc74b4'),
    },
    {
      name: 'Bosch Drill Machine 500W',
      brand: 'Bosch',
      category: 'Power Tools',
      unit: 'pcs',
      price: 8900,
      compare_price: 10500,
      cost_price: 7200,
      stock: 12,
      sku: 'HW-DRB-500',
      image_url: stockImage('1504148455325-0c9e7ed84403'),
      is_featured: true,
    },
    {
      name: 'Grohe Single Lever Basin Mixer',
      brand: 'Grohe',
      category: 'Sanitary',
      unit: 'pcs',
      price: 12500,
      cost_price: 9800,
      stock: 8,
      sku: 'HW-GRH-MIX',
      image_url: stockImage('1585705117036-856f63a4e20e'),
    },
    {
      name: 'Premium Door Handle Set, Matte Black',
      brand: 'Local',
      category: 'Hardware',
      unit: 'set',
      price: 2400,
      cost_price: 1650,
      stock: 30,
      sku: 'HW-DHS-BLK',
      image_url: stockImage('1558618666-fcd25c85cd64'),
    },
    {
      name: 'Philips LED Bulb 12W Warm White (Pack of 2)',
      brand: 'Philips',
      category: 'Electrical',
      unit: 'pack',
      price: 680,
      compare_price: 750,
      cost_price: 520,
      stock: 85,
      sku: 'HW-LED-12W',
      image_url: stockImage('1558618666-fcd25c85cd64'),
      is_featured: true,
    },
  ],
};

/**
 * @param {{ businessId: string, domainKey: string, countryIso: string, taxRate: number, brands?: string[] }} params
 */
export function buildRichSeedItems({ businessId, domainKey, countryIso, taxRate, brands = [] }) {
  let rows = RICH_PRODUCT_CATALOG[domainKey];
  if ((!Array.isArray(rows) || rows.length === 0) && resolveStorefrontVertical(domainKey) === 'supermarket') {
    rows = SUPERMARKET_SEED_PRODUCTS;
  }
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const iso = String(countryIso || 'PK').trim().toUpperCase();
  const knowledge = getDomainKnowledge(domainKey, { countryIso: iso });
  const applyReorderDefaults = Boolean(knowledge?.reorderEnabled);

  return rows.map((item, index) => {
    const price =
      item.marketPrices?.[iso] ??
      item.marketPrices?.DEFAULT ??
      item.price ??
      0;
    const compare_price =
      item.compare_marketPrices?.[iso] ??
      item.compare_marketPrices?.DEFAULT ??
      item.compare_price ??
      null;
    const image_url =
      (typeof item.image_url === 'string' && item.image_url.trim()) ||
      resolveSeedProductImageUrl({
        name: item.name,
        category: String(item.category || ''),
        domainKey,
        seedKey: item.sku || slugifyProductName(item.name),
      });
    const isArchiveImage =
      typeof item.image_url === 'string' &&
      /autostore\.pk|wp-content\/uploads|synergize\.pk|website-files\.com|comfy\.sg|fantasticfurniture\.com\.au|cloud\.superme\.al/i.test(
        item.image_url
      );
    const isUnsplash = typeof image_url === 'string' && image_url.includes('unsplash.com');
    const images = image_url
      ? [
          {
            url: image_url,
            alt: item.name,
            primary: true,
            source: isArchiveImage ? 'archive-reference' : isUnsplash ? 'unsplash' : 'curated-demo',
          },
        ]
      : [];
    const stock = item.stock ?? 50;
    const cost_price = item.cost_price ?? Math.round(Number(price) * 0.62);
    const inventoryDefaults = applyReorderDefaults
      ? {
          min_stock_level: item.min_stock_level ?? 10,
          reorder_point: item.reorder_point ?? 15,
          reorder_quantity: item.reorder_quantity ?? 25,
        }
      : {};

    const sku = item.sku || `SKU-${slugifyProductName(item.name).slice(0, 16)}`;
    const explicitVariants = Array.isArray(item.variants) && item.variants.length > 0 ? item.variants : null;
    const generatedVariants = APPAREL_VARIANT_DOMAIN_KEYS.has(domainKey)
      ? buildApparelVariantsForSeed(item, { sku, price, costPrice: cost_price, stock })
      : null;
    const variants = explicitVariants || generatedVariants;
    const sizeColorMatrix =
      variants && variants.length > 0
        ? Object.fromEntries(
            variants
              .filter((v) => v.size && v.color)
              .map((v) => [`${v.size}-${v.color}`, Number(v.stock) || 0])
          )
        : null;

    return {
      business_id: businessId,
      name: item.name,
      description: item.description || null,
      category: item.category || 'General',
      unit: item.unit || 'pcs',
      price,
      compare_price,
      cost_price,
      stock,
      ...(variants && variants.length > 0 ? { variants } : {}),
      tax_percent: taxRate,
      brand: item.brand || brands[index % Math.max(brands.length, 1)] || '',
      sku,
      barcode: item.barcode || null,
      image_url,
      images,
      is_featured: Boolean(item.is_featured),
      is_new: Boolean(item.is_new),
      is_active: true,
      slug: slugifyProductName(item.name),
      ...inventoryDefaults,
      domain_data: {
        ...(item.domain_data || {}),
        ...(sizeColorMatrix && Object.keys(sizeColorMatrix).length > 0
          ? { size_color_matrix: sizeColorMatrix }
          : {}),
        seedCatalog: true,
        seedMarket: iso,
        imageCredit:
          item.imageCredit ||
          (isArchiveImage ? 'archive reference' : isUnsplash ? 'Unsplash (demo)' : null),
      },
    };
  });
}

/**
 * @param {string} domainKey
 * @returns {boolean}
 */
export function hasRichCatalog(domainKey) {
  return Array.isArray(RICH_PRODUCT_CATALOG[domainKey]) && RICH_PRODUCT_CATALOG[domainKey].length > 0;
}

/** Template seeds use resolveSeedProductImageUrl (productImageFallback.js). */

/**
 * Build demo products from domain `setupTemplate.suggestedProducts` when no rich catalog exists.
 * @param {{ businessId: string, suggestedProducts?: object[]; taxRate: number; brands?: string[]; countryIso: string; domainKey?: string }} params
 */
export function buildTemplateDemoItems({
  businessId,
  suggestedProducts,
  taxRate,
  brands = [],
  countryIso,
  domainKey = '',
}) {
  if (!Array.isArray(suggestedProducts) || suggestedProducts.length === 0) return [];

  const iso = String(countryIso || 'PK').trim().toUpperCase();

  return suggestedProducts.map((item, index) => {
    const name = String(item.name || `Item ${index + 1}`).trim();
    const price = Number(item.defaultPrice ?? item.price ?? 100);
    const stock = Number(item.startingStock ?? item.stock ?? 25);
    const category = item.category || 'General';
    const image_url = resolveSeedProductImageUrl({
      name,
      category: String(category),
      domainKey,
      seedKey: `${businessId}-${slugifyProductName(name)}`,
    });

    return {
      business_id: businessId,
      name,
      description: item.description || null,
      category,
      unit: item.unit || 'pcs',
      price,
      compare_price: price > 0 ? Math.round(price * 1.12) : null,
      cost_price: Math.round(price * 0.65),
      stock,
      tax_percent: taxRate,
      brand: item.brand || brands[index % Math.max(brands.length, 1)] || '',
      sku: item.sku || `DEMO-${slugifyProductName(name).slice(0, 12).toUpperCase()}`,
      barcode: null,
      image_url,
      images: [{ url: image_url, alt: name, primary: true, source: 'unsplash' }],
      is_featured: index === 0,
      is_active: true,
      slug: slugifyProductName(name),
      domain_data: {
        seedCatalog: true,
        seedMarket: iso,
        seedSource: 'setupTemplate',
        imageCredit: 'Unsplash (demo)',
      },
    };
  });
}
