/**
 * Build Tenvo Furniture seed catalog from archived COMFY + Fantastic HTML extract.
 * Run: node scripts/build-furniture-seed-catalog.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
const extractPath = path.join(root, 'lib/dataLab/furnitureArchiveExtract.json');
const outPath = path.join(root, 'lib/dataLab/furnitureDemoCatalog.js');

/** @param {number} aud */
function audToPkr(aud) {
  return Math.round(aud * 185);
}

/** @param {number} sgd */
function sgdToPkr(sgd) {
  return Math.round(sgd * 210);
}

/** @param {string} slug */
function slugToTitle(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(2seater|3 Seater|4 Seater)\b/gi, (m) => m.replace(/seater/i, ' Seater'))
    .replace(/\s+/g, ' ')
    .trim();
}

/** COMFY review / hero products with indicative SGD pricing from comfy.sg public listings */
const COMFY_NAMED = [
  { slug: 'irene-electric-recliner-sofa', name: 'Irene Electric Recliner Sofa', category: 'Living Room', priceSgd: 1899, compareSgd: 2299, featured: true, material: 'Top Grain Leather' },
  { slug: 'annie-electric-recliner-sofa', name: 'Annie Electric Recliner Sofa', category: 'Living Room', priceSgd: 1699, compareSgd: 1999, featured: true, material: 'Semi Aniline Leather' },
  { slug: 'heidi-electric-recliner-sofa', name: 'Heidi Electric Recliner Sofa', category: 'Living Room', priceSgd: 1799, compareSgd: 2099, material: 'Top Grain Leather' },
  { slug: 'roslyn-electric-recliner-sofa', name: 'Roslyn Electric Recliner Sofa', category: 'Living Room', priceSgd: 1999, compareSgd: 2399, featured: true, material: 'Power Recliner Leather' },
  { slug: 'emily-electric-recliner-sofa', name: 'Emily Electric Recliner Sofa', category: 'Living Room', priceSgd: 1599, compareSgd: 1899, material: 'Fabric Recliner' },
  { slug: 'candy-electric-recliner-sofa', name: 'Candy Electric Recliner Sofa', category: 'Living Room', priceSgd: 1499, compareSgd: 1799, material: 'Fabric Recliner' },
  { slug: 'anson-electric-recliner-sofa', name: 'Anson Electric Recliner Sofa', category: 'Living Room', priceSgd: 1299, compareSgd: 1499, material: 'Fabric Recliner' },
  { slug: 'irene-electric-recliner-2seater-sofa', name: 'Irene Electric Recliner 2 Seater', category: 'Living Room', priceSgd: 1599, compareSgd: 1899, material: 'Top Grain Leather' },
  { slug: 'heidi-electric-recliner-sofa-2seater', name: 'Heidi Electric Recliner 2 Seater', category: 'Living Room', priceSgd: 1499, compareSgd: 1749, material: 'Top Grain Leather' },
  { slug: 'roslyn-electric-recliner-sofa-armchair', name: 'Roslyn Recliner Armchair', category: 'Living Room', priceSgd: 899, compareSgd: 1099, material: 'Leather Armchair' },
  { slug: 'cherry-marble-dining-table-and-chairs', name: 'Cherry Marble Dining Table Set', category: 'Dining Room', priceSgd: 1299, compareSgd: 1599, featured: true, material: 'Marble Top' },
  { slug: 'carol-black-marble-dining-table', name: 'Carol Black Marble Dining Table', category: 'Dining Room', priceSgd: 999, compareSgd: 1199, material: 'Sintered Stone' },
  { slug: 'carol-marble-dining-table-gold-legs', name: 'Carol Marble Dining Table | Gold Legs', category: 'Dining Room', priceSgd: 1099, compareSgd: 1299, material: 'Marble Top' },
  { slug: 'addison-marble-dining-table', name: 'Addison Marble Dining Table', category: 'Dining Room', priceSgd: 1199, compareSgd: 1399, material: 'Marble Top' },
  { slug: 'sintered-stone-dining-table-and-chairs', name: 'Sintered Stone Dining Table & Chairs', category: 'Dining Room', priceSgd: 1399, compareSgd: 1699, featured: true, material: 'Sintered Stone' },
  { slug: 'dining-table-and-chairs-made-of-sintered-stone', name: 'Sintered Stone Dining Room Set', category: 'Dining Room', priceSgd: 1499, compareSgd: 1799, material: 'Sintered Stone' },
  { slug: 'elliot-coffee-marble-table', name: 'Elliot White Coffee Table', category: 'Coffee Tables', priceSgd: 399, compareSgd: 499, material: 'Marble Top' },
  { slug: 'comfy-sleepperfect-hybrid-mattress', name: 'SleepPerfect Hybrid Mattress', category: 'Bedroom Furniture', priceSgd: 699, compareSgd: 899, featured: true, material: 'Hybrid Foam' },
  { slug: '3_drawer_bedside_table_with_black_top_against_a_wooden_wall', name: 'Jack 3 Drawer Bedside Table', category: 'Bedroom Furniture', priceSgd: 379, compareSgd: 446, material: 'MDF' },
  { slug: 'Round_bedside_table_with_a_beige_body_and_black_trim_on_a_white_background', name: 'Nicholas Round Bedside Table With Drawer', category: 'Bedroom Furniture', priceSgd: 449, compareSgd: 528, material: 'MDF' },
  { slug: 'wooden_round_bedside_table_with_marble_top_and_open_drawer_on_a_neutral_background', name: 'Elijah Round Bedside Table', category: 'Bedroom Furniture', priceSgd: 359, compareSgd: 422, material: 'Wood + Marble' },
  { slug: 'top-grain-leather-recliner-sectional-sofa', name: 'Top Grain Leather Recliner Sectional', category: 'Living Room', priceSgd: 2999, compareSgd: 3499, featured: true, material: 'Top Grain Leather' },
  { slug: 'top-grain-leather-power-reclining-sofa', name: 'Top Grain Leather Power Reclining Sofa', category: 'Living Room', priceSgd: 2199, compareSgd: 2599, material: 'Power Recliner Leather' },
  { slug: 'semi-aniline-leather-recliner-sofa-top-grain', name: 'Semi Aniline Top Grain Leather Recliner', category: 'Living Room', priceSgd: 1899, compareSgd: 2199, material: 'Semi Aniline Leather' },
];

/** Fantastic Furniture promos with archive media URLs */
const FF_MEDIA = {
  'Newhaven 4 Seater Round Dining Table': 'https://api.fantasticfurniture.com.au/medias/Bridge-Table.png',
  'Jonnie Black Dining Chair': 'https://api.fantasticfurniture.com.au/medias/Photo.png',
  'Sawyer Queen Bed Frame with Storage': 'https://api.fantasticfurniture.com.au/medias/BF-B-ROYO-D-VEL-BG-ABC-07-1-1-.png',
  'Benson Walnut Bedside Table': 'https://api.fantasticfurniture.com.au/medias/BF-B-ROYO-D-VEL-BG-ABC-07-2-1-.png',
  'Sleepapedic Queen Mattress': 'https://api.fantasticfurniture.com.au/medias/MAT-A10-M908-D-06-1.png',
  'Kaidon Double Beige Velvet Bed Frame': 'https://api.fantasticfurniture.com.au/medias/BF-B-ROYO-D-VEL-BG-ABC-07-1-1-.png',
  'Elwine 3 Seater Light Grey Sofa with Ottoman': 'https://api.fantasticfurniture.com.au/medias/SOF-NICO-LGY-ABC-07-1-1.png',
  'Cooshy Cloud Queen Medium Mattress': 'https://api.fantasticfurniture.com.au/medias/MAT-A10-M908-D-06-2.png',
};

const FF_CATEGORY = {
  'Newhaven 4 Seater Round Dining Table': 'Dining Room',
  'Jonnie Black Dining Chair': 'Dining Room',
  'Sawyer Queen Bed Frame with Storage': 'Bedroom Furniture',
  'Benson Walnut Bedside Table': 'Bedroom Furniture',
  'Sleepapedic Queen Mattress': 'Bedroom Furniture',
  'Kaidon Double Beige Velvet Bed Frame': 'Bedroom Furniture',
  'Elwine 3 Seater Light Grey Sofa with Ottoman': 'Living Room',
  'Cooshy Cloud Queen Medium Mattress': 'Bedroom Furniture',
};

function buildCatalog(extract) {
  const imageBySlug = new Map(extract.comfy.fileImages.map((f) => [f.slug, f.url]));
  const products = [];
  let skuIdx = 1;

  for (const row of COMFY_NAMED) {
    const image = imageBySlug.get(row.slug);
    if (!image) continue;
    const price = sgdToPkr(row.priceSgd);
    const compare = sgdToPkr(row.compareSgd);
    products.push({
      name: row.name,
      brand: 'Tenvo Home',
      category: row.category,
      unit: row.category.includes('Table') && !row.name.includes('Set') ? 'pcs' : 'set',
      price,
      compare_price: compare,
      cost_price: Math.round(price * 0.72),
      stock: 6 + (skuIdx % 8),
      sku: `TF-COMFY-${String(skuIdx++).padStart(3, '0')}`,
      description: `${row.name}. ${row.material} construction with professional delivery and assembly available.`,
      image_url: image,
      imageCredit: 'comfy.sg (archive)',
      is_featured: Boolean(row.featured),
      domain_data: { material: row.material, color: 'As shown', assemblyrequired: true },
    });
  }

  // Collection hero products (archive collection images)
  for (const coll of extract.comfy.collections) {
    if (products.some((p) => p.name === coll.label)) continue;
    const price = sgdToPkr(899 + (skuIdx % 5) * 200);
    products.push({
      name: coll.label,
      brand: 'Tenvo Home',
      category: coll.label.includes('Dining')
        ? 'Dining Room'
        : coll.label.includes('Bed') || coll.label === 'Bedroom'
          ? 'Bedroom Furniture'
          : coll.label === 'Kids'
            ? 'Kids Furniture'
            : 'Living Room',
      unit: 'set',
      price,
      compare_price: Math.round(price * 1.25),
      cost_price: Math.round(price * 0.7),
      stock: 4 + (skuIdx % 6),
      sku: `TF-COLL-${String(skuIdx++).padStart(3, '0')}`,
      description: `${coll.label} collection. Curated living, dining, and bedroom essentials.`,
      image_url: coll.image,
      imageCredit: 'comfy.sg (archive)',
      domain_data: { material: 'Mixed', assemblyrequired: true },
    });
  }

  for (const promo of extract.ff.promos) {
    const price = audToPkr(promo.priceAud);
    const compare = promo.saveAud ? price + audToPkr(promo.saveAud) : Math.round(price * 1.18);
    products.push({
      name: promo.name,
      brand: 'Tenvo Home',
      category: FF_CATEGORY[promo.name] || 'Living Room',
      unit: promo.name.includes('Chair') ? 'pcs' : 'set',
      price,
      compare_price: compare,
      cost_price: Math.round(price * 0.68),
      stock: 5 + (skuIdx % 10),
      sku: `TF-FF-${String(skuIdx++).padStart(3, '0')}`,
      description: `${promo.name}. Best-value furniture with fast delivery and easy returns.`,
      image_url: FF_MEDIA[promo.name] || extract.ff.productLike[0]?.url,
      imageCredit: 'fantasticfurniture.com.au (archive)',
      is_featured: promo.name.includes('Sofa') || promo.name.includes('Dining Table'),
      domain_data: { material: 'Engineered Wood', assemblyrequired: true },
    });
  }

  return products;
}

const extract = JSON.parse(fs.readFileSync(extractPath, 'utf8'));
const products = buildCatalog(extract);

const file = `/**
 * Tenvo Furniture demo catalog — seeded from archived COMFY (furctinure1.html)
 * and Fantastic Furniture (furtiniture2.html) storefront HTML with real CDN images.
 * Regenerate: node scripts/build-furniture-seed-catalog.mjs
 */
/** @type {Array<Record<string, unknown>>} */
export const FURNITURE_SEED_PRODUCTS = ${JSON.stringify(products, null, 2)};
`;

fs.writeFileSync(outPath, file);
console.log(`Wrote ${products.length} products to ${outPath}`);
