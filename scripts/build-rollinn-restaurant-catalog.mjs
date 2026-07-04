/**
 * Build restaurant demo catalog from Roll Inn (rollinnbbq.pk) eatx API extract.
 * Run: node scripts/fetch-rollinn-menu.mjs && node scripts/build-rollinn-restaurant-catalog.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
const extractPath = path.join(root, 'lib/dataLab/rollinnArchiveExtract.json');
const outPath = path.join(root, 'lib/dataLab/restaurantDemoCatalog.js');
const categoriesOutPath = path.join(root, 'lib/dataLab/restaurantSeedCategories.json');

const extract = JSON.parse(fs.readFileSync(extractPath, 'utf8'));
const imageBase = extract.imageBase || 'https://services.eatx.pk/';
const brand = extract.brand || 'Roll Inn';

/** @param {string | null | undefined} rel */
function imageUrl(rel) {
  if (!rel || typeof rel !== 'string') return '';
  const trimmed = rel.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http')) return trimmed;
  return `${imageBase.replace(/\/$/, '')}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

/** @param {string | null | undefined} text */
function cleanDescription(text) {
  if (!text) return '';
  return String(text).replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
}

/** @param {string} name */
function inferUnit(name, category) {
  const n = `${name} ${category}`.toLowerCase();
  if (/beverage|soda|lemonade|drink|water|juice/.test(n)) return 'pcs';
  if (/fries|extra|soup/.test(n)) return 'portion';
  return 'portion';
}

/** @param {string} category */
function slugifyCategory(category) {
  return String(category || 'menu')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

const pricingByDetail = new Map(
  (extract.pricing || []).map((row) => [row.ProductDetailId, row])
);

/** @type {Map<number, object>} */
const byProductId = new Map();

for (const row of extract.menuItems || extract.products || []) {
  const id = row.ProductId;
  if (!id) continue;
  const existing = byProductId.get(id);
  const pricing = pricingByDetail.get(row.ProductDetailId);
  const price = Number(
    pricing?.AmountAfterDiscount ?? row.Price ?? row.ProductPrice ?? 0
  );
  const compare = Number(
    pricing?.AmountBeforeDiscount ?? row.PriceBeforeDiscount ?? 0
  );
  const candidate = {
    ...row,
    resolvedPrice: price,
    resolvedCompare: compare > price ? compare : null,
    resolvedDescription: cleanDescription(row.ProductDescription),
    resolvedImage: imageUrl(row.ProductImage),
  };
  if (!existing) {
    byProductId.set(id, candidate);
    continue;
  }
  const pick =
    (candidate.resolvedImage && !existing.resolvedImage) ||
    (candidate.resolvedDescription.length > existing.resolvedDescription.length) ||
  (candidate.resolvedPrice > 0 && existing.resolvedPrice <= 0) ||
    (candidate.resolvedPrice < existing.resolvedPrice && candidate.resolvedPrice > 0)
      ? candidate
      : existing;
  byProductId.set(id, pick);
}

/** @type {Array<Record<string, unknown>>} */
const products = [];

for (const row of byProductId.values()) {
  const name = String(row.ProductName || '').trim();
  const category = String(row.CategoryName || 'Menu').trim();
  const price = Number(row.resolvedPrice || 0);
  const image_url = row.resolvedImage;
  if (!name || !image_url || !Number.isFinite(price) || price <= 0) continue;
  if (row.OnlyForDeal && !row.IsDeal) continue;

  const description =
    row.resolvedDescription ||
    `${name} from Roll Inn — prepared fresh with authentic Desi BBQ flavour.`;

  products.push({
    name,
    brand,
    category,
    unit: inferUnit(name, category),
    price: Math.round(price),
    compare_price: row.resolvedCompare ? Math.round(row.resolvedCompare) : undefined,
    cost_price: Math.max(50, Math.round(price * 0.38)),
    stock: 999,
    sku: `RIN-${row.ProductId}`,
    description,
    image_url,
    is_featured: Boolean(row.IsBestSeller || row.IsPromotion),
    on_sale: Boolean(row.resolvedCompare && row.resolvedCompare > price),
    domain_data: {
      source: 'rollinnbbq.pk',
      category_id: row.CategoryId,
      category_slug: slugifyCategory(category),
      is_deal: Boolean(row.IsDeal),
      product_tag: row.ProductTag || null,
    },
  });
}

products.sort((a, b) => {
  const cat = String(a.category).localeCompare(String(b.category));
  if (cat !== 0) return cat;
  return String(a.name).localeCompare(String(b.name));
});

const categoryMeta = [];
const seenCategories = new Set();
for (const row of extract.menuItems || extract.products || []) {
  const name = row.CategoryName;
  if (!name || seenCategories.has(name)) continue;
  seenCategories.add(name);
  categoryMeta.push({
    name,
    slug: slugifyCategory(name),
    image_url: imageUrl(row.CategoryImage),
    sort_order: row.CategorySortOrder ?? 999,
  });
}
categoryMeta.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999) || a.name.localeCompare(b.name));

const header = `/**
 * Roll Inn demo menu — sourced from https://rollinnbbq.pk/ (eatx.pk public API).
 * Images hosted on services.eatx.pk ProductImages CDN.
 * Regenerate: node scripts/fetch-rollinn-menu.mjs && node scripts/build-rollinn-restaurant-catalog.mjs
 */
`;

const body = `${header}export const RESTAURANT_SEED_BRAND = ${JSON.stringify(brand)};\n\nexport const RESTAURANT_SEED_CATEGORIES = ${JSON.stringify(
  categoryMeta.map(({ name, slug, image_url }) => ({ name, slug, image_url })),
  null,
  2
)};\n\nexport const RESTAURANT_SEED_PRODUCTS = ${JSON.stringify(products, null, 2)};\n`;

fs.writeFileSync(outPath, body);
fs.writeFileSync(categoriesOutPath, JSON.stringify(categoryMeta, null, 2));

console.log(
  `Wrote ${outPath}: ${products.length} products, ${categoryMeta.length} categories`
);
