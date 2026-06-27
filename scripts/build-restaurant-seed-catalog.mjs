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
  products.push({
    name: dishName,
    brand: 'Tenvo Kitchen',
    category: cuisineToCategory(cuisine.label),
    unit: cuisine.slug === 'drinks' ? 'pcs' : 'portion',
    price: cuisine.slug === 'desserts' ? 450 : cuisine.slug === 'drinks' ? 350 : cuisine.slug === 'appetizers' ? 550 : 850,
    compare_price: cuisine.slug === 'main' ? null : undefined,
    cost_price: 280,
    stock: 999,
    sku: `RST-CUI-${cuisine.slug.toUpperCase().slice(0, 8)}`,
    description: `House favourite ${cuisine.label.toLowerCase()} dish, prepared fresh to order.`,
    image_url: cuisine.image,
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
    image_url: r.bannerImage,
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
    image_url: extract.restaurants.find((x) => /pizza/i.test(x.name))?.bannerImage || extract.heroImages[0],
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
    image_url: extract.restaurants.find((x) => /grill|bbq|meat/i.test(x.name))?.bannerImage || extract.cuisines.find((c) => c.slug === 'bbq')?.image,
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
    image_url: extract.restaurants.find((x) => /burger/i.test(x.name))?.bannerImage || extract.heroImages[1],
    on_sale: true,
  }
);

const header = `/**
 * Tenvo Kitchen demo menu — generated from archive/restraint.html (Supermeal.pk).
 * Regenerate: node scripts/extract-restaurant-archive.mjs && node scripts/build-restaurant-seed-catalog.mjs
 */
`;

const body = `export const RESTAURANT_SEED_PRODUCTS = ${JSON.stringify(products, null, 2)};\n`;
fs.writeFileSync(outPath, header + body);
console.log(`Wrote ${outPath}: ${products.length} menu items`);
