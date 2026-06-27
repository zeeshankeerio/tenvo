#!/usr/bin/env node
/**
 * Extract storefront metadata + products from archive/autoparts.html (Autostore.pk snapshot).
 * Run: node scripts/extract-autoparts-archive-seed.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'archive', 'autoparts.html');
const OUT_PATH = path.join(ROOT, 'lib', 'dataLab', 'autopartsArchiveSeed.js');

const html = fs.readFileSync(HTML_PATH, 'utf8');

function decodeHtml(s) {
  return s
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&mdash;/g, '-')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function parseRsPrice(text) {
  const m = String(text).match(/Rs\s*([\d,]+)/i);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

function slugFromName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function toHrefSuffix(href) {
  if (!href) return '?sort=newest';
  try {
    const u = new URL(href, 'https://www.autostore.pk');
    const s = u.searchParams.get('s');
    if (s) return `?search=${encodeURIComponent(s)}`;
    if (u.searchParams.get('on_sale')) return '?onSale=true';
    const catMatch = u.pathname.match(/\/category\/([^/]+)/);
    if (catMatch) {
      const slug = catMatch[1];
      const map = {
        'car-care': 'car-care',
        'oils-and-additives': 'lubricants',
        'led-lights': 'electrical',
        'car-electronics': 'electronics',
        'tyres-and-wheels': 'tyres',
        'car-filters': 'filters',
        'car-accessories': 'accessories',
        '4x4-suv-items': 'accessories',
        tools: 'car-care',
      };
      return `?category=${encodeURIComponent(map[slug] || slug)}`;
    }
  } catch {
    /* fall through */
  }
  return '?sort=newest';
}

function mapCategorySlug(label, href = '') {
  const text = `${label} ${href}`.toLowerCase();
  if (text.includes('car-care') || text.includes('car care')) return 'car-care';
  if (text.includes('oil') || text.includes('lubricant')) return 'lubricants';
  if (text.includes('led')) return 'electrical';
  if (text.includes('wheel') || text.includes('tyre') || text.includes('rim')) return 'tyres';
  if (text.includes('filter')) return 'filters';
  if (text.includes('electronic') || text.includes('audio')) return 'electronics';
  return 'accessories';
}

function mapTrendTabSlug(label) {
  const text = decodeHtml(label).toLowerCase();
  if (text === 'all') return '';
  if (text.includes('car care')) return 'car-care';
  if (text.includes('led')) return 'electrical';
  if (text.includes('4x4') || text.includes('suv')) return 'accessories';
  if (text.includes('car parts')) return 'filters';
  if (text.includes('accessor')) return 'accessories';
  return slugFromName(text);
}

function inferCategory(name, href = '') {
  const n = `${name} ${href}`.toLowerCase();
  if (/spoiler|mud flap|side step|bumper|grill|body kit|bull bar|ppf|fog lamp|wheel|rim|tyre|tire|alloy/i.test(n)) {
    if (/wheel|rim|tyre|tire|alloy/i.test(n)) return 'Tyres';
    return 'Accessories';
  }
  if (/car-care|wax|detail|cleaner|wipe|odor|shampoo|polish|meguiar|chemical guys|turtle|nanoskin/i.test(n)) return 'Car Care';
  if (/oil|lubricant|liqui moly|mobil|kixx|castrol|shell|additive|transmission fluid|atf/i.test(n)) return 'Lubricants';
  if (/filter|mann|mahle/i.test(n)) return 'Filters';
  if (/brake|brembo|ferodo|disc|pad/i.test(n)) return 'Brakes';
  if (/spark|plug|ngk|denso|belt|engine|serpentine/i.test(n)) return 'Engine';
  if (/speaker|jbl|audio|stereo|amplifier|electrical|battery|led|fog lamp|headlight|bulb/i.test(n)) return 'Electrical';
  if (/wheel|rim|tyre|tire|alloy/i.test(n)) return 'Tyres';
  if (/mud flap|side step|spoiler|body kit|bumper|grill|bull bar|exterior|accessor|ppf|wheel|rim|tyre|tire|alloy/i.test(n)) return 'Accessories';
  if (/wiper|suspension|shock|steering|tie rod|monroe/i.test(n)) return 'Accessories';
  return 'Accessories';
}

function inferBrand(name) {
  const brands = [
    'Meguiar\'s', 'Chemical Guys', 'Liqui Moly', 'Nanoskin', 'Turtle Wax', 'JBL', '3M',
    'Mann Filter', 'Mahle', 'Bosch', 'Denso', 'NGK', 'Shell', 'Castrol', 'Mobil', 'Kixx',
    'Philips', 'Brembo', 'Continental', 'TRW', 'Ferodo', 'Monroe', 'Exide', 'Aisin',
    'TAC System', 'Toyota Genuine', 'Honda Genuine', 'Mercedes-Benz', 'Toyota', 'Honda',
    'Jaecoo', 'Lexus', 'BYD',
  ];
  for (const b of brands) {
    if (name.toLowerCase().includes(b.toLowerCase().replace("'", ''))) return b;
  }
  if (/jaecoo|j7|j5/i.test(name)) return 'TAC System';
  if (/toyota/i.test(name)) return 'Toyota';
  if (/honda|mugen/i.test(name)) return 'Honda';
  if (/mercedes|maybach/i.test(name)) return 'Mercedes-Benz';
  if (/lexus/i.test(name)) return 'Lexus';
  return 'Imported';
}

function inferVehicle(name) {
  const dd = {};
  const patterns = [
    [/jaecoo\s*j7/i, { vehiclemake: 'Jaecoo', vehiclemodel: 'J7', modelyear: '2025', bodytype: 'SUV' }],
    [/jaecoo\s*j5/i, { vehiclemake: 'Jaecoo', vehiclemodel: 'J5', modelyear: '2025-2026', bodytype: 'SUV' }],
    [/toyota\s*fortuner/i, { vehiclemake: 'Toyota', vehiclemodel: 'Fortuner', modelyear: '2016-2022', bodytype: 'SUV' }],
    [/toyota\s*prado/i, { vehiclemake: 'Toyota', vehiclemodel: 'Prado', modelyear: '2020-2024', bodytype: 'SUV' }],
    [/toyota\s*corolla/i, { vehiclemake: 'Toyota', vehiclemodel: 'Corolla', modelyear: '2014-2024', bodytype: 'Sedan' }],
    [/honda\s*civic/i, { vehiclemake: 'Honda', vehiclemodel: 'Civic', modelyear: '2016-2024', bodytype: 'Sedan' }],
    [/honda\s*accord/i, { vehiclemake: 'Honda', vehiclemodel: 'Accord', bodytype: 'Sedan' }],
    [/lexus\s*lx570/i, { vehiclemake: 'Lexus', vehiclemodel: 'LX570', modelyear: '2016-2021', bodytype: 'SUV' }],
    [/byd\s*shark/i, { vehiclemake: 'BYD', vehiclemodel: 'Shark 6', bodytype: 'Pickup' }],
    [/volkswagen|vw|audi/i, { vehiclemake: 'Volkswagen', bodytype: 'Hatchback' }],
  ];
  for (const [re, meta] of patterns) {
    if (re.test(name)) {
      Object.assign(dd, meta, { vehicleclass: 'Passenger', vehicletype: 'car' });
      break;
    }
  }
  return Object.keys(dd).length ? dd : undefined;
}

/** @type {Map<string, object>} */
const productsBySku = new Map();

function addProduct({ name, price, image, href, badge, category, brand, featured }) {
  if (!name || !price) return;
  const sku = slugFromName(name).toUpperCase().slice(0, 40);
  if (productsBySku.has(sku)) return;
  const cat = category || inferCategory(name, href);
  const domain_data = inferVehicle(name);
  productsBySku.set(sku, {
    name: decodeHtml(name),
    brand: brand || inferBrand(name),
    category: cat,
    unit: 'pcs',
    price,
    marketPrices: { PK: price, SG: Math.round(price / 65) },
    compare_price: badge && /sale|deal|best/i.test(badge) ? Math.round(price * 1.12) : undefined,
    cost_price: Math.round(price * 0.72),
    stock: 20 + (sku.length % 40),
    sku,
    description: `${decodeHtml(name)}. Ready to ship from Lahore warehouse.`,
    image_url: image || undefined,
    is_featured: Boolean(featured),
    ...(domain_data ? { domain_data } : {}),
  });
}

// --- Hero slides ---
const heroSlides = [];
const heroRe = /<div class="hero-slide"[^>]*style="[^"]*background-color:([^;]+);background-image:url\('([^']+)'\)[^"]*"[^>]*>[\s\S]*?<div class="hero-big">([^<]+)<\/div>[\s\S]*?<div class="hero-sub">([^<]+)<\/div>[\s\S]*?<a href="([^"]+)"[^>]*class="hero-cta">([^<]+)<\/a>/gi;
let hm;
while ((hm = heroRe.exec(html)) !== null) {
  heroSlides.push({
    accent: hm[1].trim(),
    image: hm[2].trim(),
    title: decodeHtml(hm[3]),
    subtitle: decodeHtml(hm[4]),
    ctaHref: hm[5].trim(),
    ctaHrefSuffix: toHrefSuffix(hm[5].trim()),
    ctaLabel: decodeHtml(hm[6]),
    eyebrow: 'autostore.pk',
  });
}

// --- Promo cards ---
const promoCards = [];
const pcRe = /<a href="([^"]+)" class="pc-card"><div class="pc-top"><div class="pc-title">([^<]+)<\/div><div class="pc-desc">([^<]+)<\/div><\/div><div class="pc-img"><img[^>]+src="([^"]+)"[^>]+alt="([^"]*)"/gi;
let pcm;
while ((pcm = pcRe.exec(html)) !== null) {
  promoCards.push({
    id: slugFromName(pcm[2]),
    title: decodeHtml(pcm[2]),
    description: decodeHtml(pcm[3]),
    image: pcm[4].trim(),
    href: pcm[1].trim(),
    hrefSuffix: toHrefSuffix(pcm[1].trim()),
  });
}

// --- Featured categories ---
const featuredCategories = [];
const fcRe = /<a href="([^"]+)" class="hv8-fc-card" data-images='(\[[^\']+\])'>[\s\S]*?<div class="hv8-card-title">([\s\S]*?)<\/div>[\s\S]*?<div class="hv8-card-count">([^<]+)<\/div>/gi;
let fcm;
while ((fcm = fcRe.exec(html)) !== null) {
  let images = [];
  try { images = JSON.parse(fcm[2].replace(/&quot;/g, '"')); } catch { /* ignore */ }
  featuredCategories.push({
    id: slugFromName(decodeHtml(fcm[3])),
    label: decodeHtml(fcm[3].replace(/<br\s*\/?>/gi, ' ')),
    slug: mapCategorySlug(decodeHtml(fcm[3]), fcm[1]),
    href: fcm[1].trim(),
    hrefSuffix: toHrefSuffix(fcm[1].trim()),
    productCount: decodeHtml(fcm[4]),
    images,
  });
}

// --- Featured deals ---
const featuredDeals = [];
const fdRe = /<a href="([^"]+)" class="fd-card"[^>]*>[\s\S]*?<span class="fd-bonus">([^<]+)<\/span>[\s\S]*?<div class="fd-free">([^<]+)<\/div>[\s\S]*?<div class="fd-desc">([^<]+)<\/div>[\s\S]*?<img[^>]+src="([^"]+)"[^>]+alt="([^"]*)"/gi;
let fdm;
while ((fdm = fdRe.exec(html)) !== null) {
  const price = parseRsPrice(fdm[3]);
  const name = decodeHtml(fdm[6] || fdm[4]);
  featuredDeals.push({
    href: fdm[1].trim(),
    badge: decodeHtml(fdm[2]),
    priceLabel: decodeHtml(fdm[3]),
    price,
    name,
    image: fdm[5].trim(),
  });
  addProduct({ name, price, image: fdm[5].trim(), href: fdm[1], badge: fdm[2], featured: true });
}

// --- Vehicle brands ---
const vehicleBrands = [];
const vbRe = /<a href="[^"]+" class="brand-card">[\s\S]*?src="([^"]+)"[^>]+alt="([^"]*)"[\s\S]*?<div class="brand-name">([^<]+)<\/div>/gi;
let vbm;
while ((vbm = vbRe.exec(html)) !== null) {
  const name = decodeHtml(vbm[3]);
  if (name === 'All Brands') continue;
  vehicleBrands.push({
    id: slugFromName(name),
    name,
    image: vbm[1].trim(),
  });
}

// --- Trending tabs ---
const trendingTabs = [{ id: 'all', label: 'All', slug: '' }];
const ttTabRe = /<a href="([^"]+)" class="tt-fbtn">([^<]+)<\/a>/gi;
let ttm;
while ((ttm = ttTabRe.exec(html)) !== null) {
  const label = decodeHtml(ttm[2]);
  trendingTabs.push({
    id: slugFromName(label),
    label,
    slug: mapTrendTabSlug(label),
    href: ttm[1].trim(),
  });
}

// --- Trending products ---
const trendingProducts = [];
const ttRe = /<a href="([^"]+)" class="tt-card">[\s\S]*?src="([^"]+)"[^>]+alt="([^"]*)"[\s\S]*?(?:<span class="tt-badge">([^<]*)<\/span>)?[\s\S]*?<div class="tt-name">([^<]+)<\/div>[\s\S]*?<div class="tt-price">([^<]+)<\/div>/gi;
let ttp;
while ((ttp = ttRe.exec(html)) !== null) {
  const price = parseRsPrice(ttp[6]);
  const name = decodeHtml(ttp[5]);
  trendingProducts.push({ href: ttp[1].trim(), image: ttp[2].trim(), name, price, badge: ttp[4] ? decodeHtml(ttp[4]) : null });
  addProduct({ name, price, image: ttp[2].trim(), href: ttp[1], featured: Boolean(ttp[4]) });
}

// --- Category rail products (wheels + car care) ---
const categoryRails = [];
const railRe = /<div class="(wheels|care)-section">[\s\S]*?<h2 class="(?:wheels|care)-title">([^<]+)<\/h2>[\s\S]*?<p class="(?:wheels|care)-sub">([^<]+)<\/p>([\s\S]*?)<div class="wheels-cta">/gi;
let rm;
while ((rm = railRe.exec(html)) !== null) {
  const railId = rm[1] === 'wheels' ? 'wheels' : 'car-care';
  const title = decodeHtml(rm[2]);
  const subtitle = decodeHtml(rm[3]);
  const block = rm[4];
  const items = [];
  const prodRe = /<a href="([^"]+)" class="prod-card">[\s\S]*?src="([^"]+)"[^>]+alt="([^"]*)"[\s\S]*?<div class="prod-name">([^<]+)<\/div>[\s\S]*?<div class="prod-price">([^<]+)<\/div>/gi;
  let pm;
  while ((pm = prodRe.exec(block)) !== null) {
    const price = parseRsPrice(pm[5]);
    const name = decodeHtml(pm[4]);
    items.push({ href: pm[1].trim(), image: pm[2].trim(), name, price });
    addProduct({ name, price, image: pm[2].trim(), href: pm[1] });
  }
  categoryRails.push({ id: railId, title, subtitle, items });
}

// --- Trending searches ---
const trendingSearches = [];
const tsRe = /data-term="([^"]+)"/g;
let tsm;
while ((tsm = tsRe.exec(html)) !== null) {
  if (!trendingSearches.includes(tsm[1])) trendingSearches.push(tsm[1]);
}

// --- Trust section ---
const trustStats = [];
const statRe = /<div class="wcu-stat-number">([^<]+)<\/div>[\s\S]*?<div class="wcu-stat-label">([^<]+)<\/div>[\s\S]*?<div class="wcu-stat-desc">([^<]+)<\/div>/gi;
let stm;
while ((stm = statRe.exec(html)) !== null) {
  trustStats.push({
    value: decodeHtml(stm[1]),
    label: decodeHtml(stm[2]),
    description: decodeHtml(stm[3]),
  });
}

const trustFeatures = [];
const featRe = /<div class="wcu-card-title">([^<]+)<\/div>[\s\S]*?<div class="wcu-card-text">([^<]+)<\/div>/gi;
let ftm;
while ((ftm = featRe.exec(html)) !== null) {
  const title = decodeHtml(ftm[1]);
  const idMap = {
    'FREE DELIVERY': 'delivery',
    'CASH ON DELIVERY': 'cod',
    'DIRECT SOURCING': 'sourcing',
    'OEM QUALITY': 'quality',
  };
  trustFeatures.push({
    id: idMap[title] || slugFromName(title),
    title,
    text: decodeHtml(ftm[2]),
  });
}

// --- BRAND_LIST from JS ---
const brandList = [];
const blMatch = html.match(/var BRAND_LIST = \[([\s\S]*?)\];/);
if (blMatch) {
  const entryRe = /\{\s*name:\s*'([^']*(?:\\'[^']*)*)',\s*url:\s*'([^']+)'\s*\}/g;
  let bl;
  while ((bl = entryRe.exec(blMatch[1])) !== null) {
    brandList.push({
      name: bl[1].replace(/\\'/g, "'"),
      url: bl[2],
    });
  }
}

// --- CAR_BRANDS keys ---
const carBrandModels = {};
const cbMatch = html.match(/var CAR_BRANDS = \{([\s\S]*?)\};\s*\n\s*var BRAND_LIST/);
if (cbMatch) {
  const brandBlockRe = /(\w+|'[^']+'):\s*\[([\s\S]*?)\](?=,\s*(?:\w+|'[^']+'):|\s*\})/g;
  let bb;
  while ((bb = brandBlockRe.exec(cbMatch[1])) !== null) {
    const brandKey = bb[1].replace(/'/g, '');
    const models = [];
    const modelRe = /\{\s*name:\s*'([^']+)',\s*url:\s*'([^']+)'\s*\}/g;
    let mm;
    while ((mm = modelRe.exec(bb[2])) !== null) {
      models.push({ name: mm[1], url: mm[2] });
    }
    carBrandModels[brandKey] = models;
  }
}

// --- NAV_ITEMS ---
const navItems = [];
const navMatch = html.match(/var NAV_ITEMS = \[([\s\S]*?)\];/);
if (navMatch) {
  const navRe = /\{\s*label:\s*'([^']+)',\s*panel:\s*'([^']+)'(?:,\s*url:\s*'([^']*)')?(?:,\s*deals:\s*true)?\s*\}/g;
  let nm;
  while ((nm = navRe.exec(navMatch[1])) !== null) {
    navItems.push({ label: nm[1], panel: nm[2], url: nm[3] || '#' });
  }
}

// --- CTA strip ---
let ctaStrip = { title: '', subtitle: '', label: '', href: '' };
const ctaMatch = html.match(/<h2 class="cta-heading">([^<]+)<\/h2>[\s\S]*?<p class="cta-sub">([^<]+)<\/p>[\s\S]*?<a href="([^"]+)" class="cta-btn">([^<]+)<\/a>/);
if (ctaMatch) {
  ctaStrip = {
    title: decodeHtml(ctaMatch[1]),
    subtitle: decodeHtml(ctaMatch[2]),
    href: ctaMatch[3].trim(),
    label: decodeHtml(ctaMatch[4]),
  };
}

const products = [...productsBySku.values()];

const seed = {
  source: 'archive/autoparts.html',
  extractedAt: new Date().toISOString().slice(0, 10),
  heroSlides,
  promoCards,
  featuredCategories,
  featuredDeals,
  vehicleBrands,
  shopBrands: brandList.map((b) => b.name),
  brandList,
  carBrandModels,
  navItems,
  trendingTabs,
  trendingSearches,
  trendingProducts,
  categoryRails,
  trust: {
    title: 'WHY CHOOSE US',
    subtitle: "Pakistan's Trusted Auto Store",
    stats: trustStats,
    features: trustFeatures,
  },
  ctaStrip,
  products,
};

const out = `/**
 * Auto-parts seed metadata extracted from archive/autoparts.html (Autostore.pk snapshot).
 * Regenerate: node scripts/extract-autoparts-archive-seed.mjs
 * @generated ${seed.extractedAt}
 */
export const AUTOPARTS_ARCHIVE_META = ${JSON.stringify({
  heroSlides: seed.heroSlides,
  promoCards: seed.promoCards,
  featuredCategories: seed.featuredCategories,
  featuredDeals: seed.featuredDeals,
  vehicleBrands: seed.vehicleBrands,
  shopBrands: seed.shopBrands,
  brandList: seed.brandList,
  carBrandModels: seed.carBrandModels,
  navItems: seed.navItems,
  trendingTabs: seed.trendingTabs,
  trendingSearches: seed.trendingSearches,
  categoryRails: seed.categoryRails,
  trust: seed.trust,
  ctaStrip: seed.ctaStrip,
}, null, 2)};

/** @type {Array<Record<string, unknown>>} */
export const AUTOPARTS_ARCHIVE_PRODUCTS = ${JSON.stringify(seed.products, null, 2)};
`;

fs.writeFileSync(OUT_PATH, out, 'utf8');
console.log(`Wrote ${OUT_PATH}`);
console.log(`  hero slides: ${heroSlides.length}`);
console.log(`  promo cards: ${promoCards.length}`);
console.log(`  featured categories: ${featuredCategories.length}`);
console.log(`  featured deals: ${featuredDeals.length}`);
console.log(`  vehicle brands: ${vehicleBrands.length}`);
console.log(`  shop brands: ${brandList.length}`);
console.log(`  products: ${products.length}`);
console.log(`  trending searches: ${trendingSearches.length}`);
