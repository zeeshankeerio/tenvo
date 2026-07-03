/**
 * Build Tenvo Restaurant seed catalog from Supermeal archive extract.
 * Run: node scripts/build-restaurant-seed-catalog.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
const extractPath = path.join(root, 'lib/dataLab/restaurantArchiveExtract.json');
const outPath = path.join(root, 'lib/dataLab/restaurantDemoCatalog.js');

const extract = JSON.parse(fs.readFileSync(extractPath, 'utf8'));

/** @param {string} name */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

/** @param {string} label */
function cuisineToCategory(label) {
  const l = label.toLowerCase();
  if (l === 'drinks') return 'Beverages';
  if (l === 'desserts') return 'Desserts';
  if (l === 'salads' || l === 'soup' || l === 'appetizers') return 'Appetizers';
  return 'Main Course';
}

/**
 * Trusted, always-on Unsplash food/beverage photo ids (same curated set used by
 * `lib/storefront/productImageFallback.js`). The previous Supermeal CDN is dead,
 * so seed images are derived from dish name + category instead.
 */
const FOOD_IMG = {
  grill: ['1607623814075-e51df1bdc82f', '1544025162-d76694265947'],
  burger: ['1555939594-58d7cb561ad1'],
  spread: ['1504674900247-0877df9cc836'],
  table: ['1414235077428-338989a2e8c0'],
  beverage: ['1544145945-f90425340c7e', '1437418747212-8d9709afab22', '1513553404607-988bf2703777'],
  dessert: ['1509440159596-0249088772ff', '1549931319-a545dcf3bc73', '1558961363-fa8fdf82db35'],
  produce: ['1542838132-92c53300491e', '1610832958506-aa56368176cf'],
};

function hash(str) {
  let h = 5381;
  const s = String(str || '');
  for (let i = 0; i < s.length; i += 1) h = (h * 33) ^ s.charCodeAt(i);
  return h >>> 0;
}

function unsplashFood(id) {
  return `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;
}

/**
 * @param {string} name
 * @param {string} category
 * @param {string} seed
 */
function pickFoodImage(name, category, seed) {
  const n = String(name || '').toLowerCase();
  const c = String(category || '').toLowerCase();
  let pool;
  if (/bbq|grill|karahi|karhai|tikka|meat|kebab|chicken|mutton|beef/.test(n)) pool = FOOD_IMG.grill;
  else if (/burger|sandwich|club|wrap|shawarma/.test(n)) pool = FOOD_IMG.burger;
  else if (/pizza|pasta|italian|margherita|feast|combo|family/.test(n)) pool = FOOD_IMG.spread;
  else if (/salad|soup|spring roll|starter|appetizer/.test(n) || c.includes('appetizer')) pool = FOOD_IMG.produce;
  else if (/brownie|cake|dessert|sweet|ice cream/.test(n) || c.includes('dessert')) pool = FOOD_IMG.dessert;
  else if (/lemonade|drink|juice|shake|tea|coffee|beverage|mint/.test(n) || c.includes('beverage')) pool = FOOD_IMG.beverage;
  else if (/biryani|rice|chow mein|noodle|wok|pad thai|chinese|thai|butter chicken|naan|pakistani|indian|arabic/.test(n)) pool = FOOD_IMG.table;
  else pool = FOOD_IMG.spread;
  return unsplashFood(pool[hash(seed) % pool.length]);
}

/** Signature dish names per cuisine */
const CUISINE_DISH = {
  chinese: 'Chicken Chow Mein',
  salads: 'Garden Fresh Salad Bowl',
  soup: 'Hot & Sour Soup',
  bbq: 'Mixed Grill Platter',
  desserts: 'Chocolate Fudge Brownie',
  drinks: 'Fresh Mint Lemonade',
  arabic: 'Chicken Shawarma Plate',
  karhai: 'Chicken Karahi (Full)',
  thai: 'Pad Thai Noodles',
  pakistani: 'Chicken Biryani (Full)',
  indian: 'Butter Chicken with Naan',
  appetizers: 'Crispy Spring Rolls (6 pcs)',
  italian: 'Wood-fired Margherita Pizza',
};

/** @param {{ name: string; minOrder: number }} r */
function inferDish(r) {
  const n = r.name.toLowerCase();
  if (n.includes('pizza')) return { suffix: 'Special Pizza', category: 'Main Course', unit: 'pcs', price: Math.max(499, Math.round(r.minOrder * 0.55)) };
  if (n.includes('burger')) return { suffix: 'Signature Burger', category: 'Main Course', unit: 'pcs', price: Math.max(450, Math.round(r.minOrder * 0.5)) };
  if (n.includes('subway') || n.includes('sandwich')) return { suffix: 'Club Sandwich', category: 'Main Course', unit: 'pcs', price: 550 };
  if (n.includes('grill') || n.includes('bbq') || n.includes('meat')) return { suffix: 'Grill Platter', category: 'Main Course', unit: 'portion', price: Math.max(750, Math.round(r.minOrder * 0.65)) };
  if (n.includes('chicken')) return { suffix: 'Roast Chicken Meal', category: 'Main Course', unit: 'portion', price: 850 };
  if (n.includes('spicy') || n.includes('snack')) return { suffix: 'Spicy Combo Box', category: 'Appetizers', unit: 'pcs', price: 650 };
  if (n.includes('sultan') || n.includes('karahi')) return { suffix: 'Karahi Special', category: 'Main Course', unit: 'portion', price: 950 };
  if (n.includes('chinese') || n.includes('fan chao')) return { suffix: 'Wok Special', category: 'Main Course', unit: 'portion', price: 750 };
  if (n.includes('apple') || n.includes('golden')) return { suffix: 'Family Feast Box', category: 'Main Course', unit: 'portion', price: 1200 };
  return { suffix: 'Chef Special', category: 'Main Course', unit: 'portion', price: Math.max(550, Math.round(r.minOrder * 0.6)) };
}

/** @type {Array<Record<string, unknown>>} */
const products = [];

for (const cuisine of extract.cuisines) {
  if (/default-cuisine-icon/i.test(cuisine.image)) continue;
  const dishName = CUISINE_DISH[cuisine.slug] || `${cuisine.label} Special`;
  const category = cuisineToCategory(cuisine.label);
  products.push({
    name: dishName,
    brand: 'Tenvo Kitchen',
    category,
    unit: cuisine.slug === 'drinks' ? 'pcs' : 'portion',
    price: cuisine.slug === 'desserts' ? 450 : cuisine.slug === 'drinks' ? 350 : cuisine.slug === 'appetizers' ? 550 : 850,
    compare_price: cuisine.slug === 'main' ? null : undefined,
    cost_price: 280,
    stock: 999,
    sku: `RST-CUI-${cuisine.slug.toUpperCase().slice(0, 8)}`,
    description: `House favourite ${cuisine.label.toLowerCase()} dish, prepared fresh to order.`,
    image_url: pickFoodImage(dishName, category, `cui-${cuisine.slug}`),
    is_featured: ['pakistani', 'bbq', 'italian', 'chinese'].includes(cuisine.slug),
  });
}

for (const r of extract.restaurants) {
  const dish = inferDish(r);
  const name = `${r.name} ${dish.suffix}`.replace(/\s+/g, ' ').trim();
  products.push({
    name,
    brand: 'Tenvo Kitchen',
    category: dish.category,
    unit: dish.unit,
    price: dish.price,
    compare_price: r.superPick ? Math.round(dish.price * 1.12) : undefined,
    cost_price: Math.round(dish.price * 0.42),
    stock: 999,
    sku: `RST-${slugify(r.name).slice(0, 12).toUpperCase()}`,
    description: `Signature item inspired by ${r.name}. Min order Rs ${r.minOrder}. ${r.deliveryFee}.`,
    image_url: pickFoodImage(`${name} ${dish.suffix}`, dish.category, `rst-${slugify(r.name)}`),
    is_featured: Boolean(r.superPick),
    on_sale: Boolean(r.superPick),
  });
}

// Combos from archive promos
products.push(
  {
    name: 'Family Pizza & Drinks Combo',
    brand: 'Tenvo Kitchen',
    category: 'Main Course',
    unit: 'pcs',
    price: 1499,
    compare_price: 1799,
    cost_price: 620,
    stock: 999,
    sku: 'RST-CMB-PIZZA',
    description: 'Large pizza, garlic bread, and 1.5L drink. Perfect for sharing.',
    image_url: pickFoodImage('Family Pizza Combo', 'Main Course', 'cmb-pizza'),
    is_featured: true,
    on_sale: true,
  },
  {
    name: 'BBQ Feast for Two',
    brand: 'Tenvo Kitchen',
    category: 'Main Course',
    unit: 'portion',
    price: 1899,
    compare_price: 2199,
    cost_price: 780,
    stock: 999,
    sku: 'RST-CMB-BBQ',
    description: 'Mixed grill, naan, raita, and salad for two.',
    image_url: pickFoodImage('BBQ Mixed Grill Feast', 'Main Course', 'cmb-bbq'),
    is_featured: true,
    on_sale: true,
  },
  {
    name: 'Midnight Burger Box',
    brand: 'Tenvo Kitchen',
    category: 'Main Course',
    unit: 'pcs',
    price: 999,
    compare_price: 1150,
    cost_price: 410,
    stock: 999,
    sku: 'RST-CMB-BRG',
    description: 'Two burgers, fries, and soft drinks. Late-night favourite.',
    image_url: pickFoodImage('Midnight Burger Box', 'Main Course', 'cmb-brg'),
    on_sale: true,
  }
);

const header = `/**
 * Tenvo Kitchen demo menu — generated from archive/restraint.html.
 * Images use curated Unsplash food photography (the original Supermeal CDN is offline).
 * Regenerate: node scripts/extract-restaurant-archive.mjs && node scripts/build-restaurant-seed-catalog.mjs
 */
`;

const body = `export const RESTAURANT_SEED_PRODUCTS = ${JSON.stringify(products, null, 2)};\n`;
fs.writeFileSync(outPath, header + body);
console.log(`Wrote ${outPath}: ${products.length} menu items`);
