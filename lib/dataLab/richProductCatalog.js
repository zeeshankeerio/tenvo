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
import { FURNITURE_SEED_PRODUCTS } from './furnitureDemoCatalog.js';
import { RESTAURANT_SEED_PRODUCTS } from './restaurantDemoCatalog.js';
import { AUTO_PARTS_SEED_CATALOG } from './autopartsSeedCatalog.js';

function slugifyProductName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'product';
}

/** @param {string} photoId Unsplash photo id (after "photo-") @param {number} [w] */
export function stockImage(photoId, w = 800) {
  return buildUnsplashImageUrl(photoId, { w, q: 82 });
}

/** @type {Record<string, Array<Record<string, unknown>>>} */
export const RICH_PRODUCT_CATALOG = {
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
      name: 'Standard T-Shirt, Ring Spun Cotton',
      brand: 'Outfitters',
      category: 'Mens Unstitched',
      unit: 'pcs',
      price: 1290,
      compare_price: 1590,
      cost_price: 780,
      stock: 120,
      sku: 'TEE-STD-WHT-M',
      description: '180 GSM crew neck, white, size M.',
      image_url: stockImage('1521572267360-ee0c2907d7e0'),
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
  ],

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

  supermarket: [
    {
      name: 'Coca-Cola 1.5L PET',
      brand: 'Coca-Cola',
      category: 'Beverages',
      unit: 'pcs',
      price: 150,
      compare_price: 170,
      cost_price: 118,
      stock: 200,
      sku: 'BEV-COLA-15',
      image_url: stockImage('1622483767028-3f66f32aef97'),
      is_featured: true,
    },
    {
      name: 'Lays Classic Salted Large',
      brand: 'Lays',
      category: 'Snacks',
      unit: 'pack',
      price: 100,
      cost_price: 72,
      stock: 180,
      sku: 'SNK-LAY-001',
      image_url: stockImage('1566478989037-e624b0e253bf'),
    },
    {
      name: 'Nestlé EveryDay Milk Powder 400g',
      brand: 'Nestlé',
      category: 'Dairy',
      unit: 'pack',
      price: 650,
      compare_price: 720,
      cost_price: 540,
      stock: 90,
      sku: 'DAI-NLD-400',
      image_url: stockImage('1550583724-b2692b85b150'),
    },
    {
      name: 'Fresh Red Apples (Premium)',
      brand: 'Fresh',
      category: 'Fresh Produce',
      unit: 'kg',
      price: 300,
      cost_price: 210,
      stock: 45,
      sku: 'FR-APL-KG',
      image_url: stockImage('1560806887-1e4cd0b6faa6'),
      domain_data: { is_weight_item: true },
    },
    {
      name: 'Tapal Danedar Tea 950g',
      brand: 'Tapal',
      category: 'Beverages',
      unit: 'pack',
      price: 1250,
      cost_price: 1080,
      stock: 70,
      sku: 'BEV-TPL-950',
      image_url: stockImage('1556679343-5493566d3e7b'),
    },
    {
      name: 'Dalda Cooking Oil 5L',
      brand: 'Dalda',
      category: 'Cooking Oil',
      unit: 'pcs',
      price: 2850,
      compare_price: 3100,
      cost_price: 2480,
      stock: 40,
      sku: 'OIL-DLD-5L',
      image_url: stockImage('1474979266342-cc1e39dca2fe'),
    },
  ],

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
  const rows = RICH_PRODUCT_CATALOG[domainKey];
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
      /autostore\.pk|wp-content\/uploads|comfy\.sg|fantasticfurniture\.com\.au|cloud\.superme\.al/i.test(item.image_url);
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
    const inventoryDefaults = applyReorderDefaults
      ? {
          min_stock_level: item.min_stock_level ?? 10,
          reorder_point: item.reorder_point ?? 15,
          reorder_quantity: item.reorder_quantity ?? 25,
        }
      : {};

    return {
      business_id: businessId,
      name: item.name,
      description: item.description || null,
      category: item.category || 'General',
      unit: item.unit || 'pcs',
      price,
      compare_price,
      cost_price: item.cost_price ?? Math.round(Number(price) * 0.62),
      stock,
      tax_percent: taxRate,
      brand: item.brand || brands[index % Math.max(brands.length, 1)] || '',
      sku: item.sku || `SKU-${slugifyProductName(item.name).slice(0, 16)}`,
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
        seedCatalog: true,
        seedMarket: iso,
        imageCredit: isArchiveImage
          ? 'archive/autoparts.html reference'
          : isUnsplash
            ? 'Unsplash (demo)'
            : null,
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
