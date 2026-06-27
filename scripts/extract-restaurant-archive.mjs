/**
 * Extract Supermeal.pk saved HTML → JSON for restaurant storefront seed.
 * Run: node scripts/extract-restaurant-archive.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'archive/restraint.html');
const outPath = path.join(root, 'lib/dataLab/restaurantArchiveExtract.json');

const html = fs.readFileSync(htmlPath, 'utf8');

/** @param {string} u */
function normalizeUrl(u) {
  if (!u) return '';
  let url = String(u).trim();
  if (url.startsWith('//')) url = `https:${url}`;
  return url;
}

/** @type {Array<{ label: string; slug: string; image: string }>} */
const cuisines = [];
const cuisineRe =
  /popular-item-name">([^<]+)<\/span>[\s\S]*?background-image:url\('([^']+)'\)/gi;
let m;
while ((m = cuisineRe.exec(html)) !== null) {
  const label = m[1].trim();
  const image = normalizeUrl(m[2]);
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!cuisines.some((c) => c.slug === slug)) {
    cuisines.push({ label, slug, image });
  }
}

/** @type {Array<{ name: string; bannerImage: string; logoImage: string; minOrder: number; deliveryFee: string; distance: string; superPick?: boolean; isNew?: boolean }>} */
const restaurants = [];
const restaurantRe =
  /alt\s+="([^"]+)"\s+data-src="(https:\/\/cloud\.superme\.al[^"]+)"/gi;
const blocks = html.split('res-list-fooditem-wrap');
for (const block of blocks) {
  const nameMatch = block.match(/res-list-fooditem-name-heading"><a>([^<]+)<\/a>/);
  if (!nameMatch) continue;
  const name = nameMatch[1].trim();
  const bannerMatch = block.match(/lazy-new"[^>]+data-src="(https:\/\/cloud\.superme\.al[^"]+)"/);
  const logoMatch = block.match(/data-src\s*=\s*"(https:\/\/cloud\.superme\.al[^"]+logo[^"]*)"/i)
    || block.match(/data-src\s*=\s*"(https:\/\/cloud\.superme\.al[^"]+)"/);
  const minMatch = block.match(/Min:\s*Rs\s*([\d,]+)/i);
  const deliveryMatch = block.match(/fa-motorcycle[\s\S]{0,80}?>([^<]+)</);
  const distanceMatch = block.match(/fa-map-pin[\s\S]{0,80}?>([^<]+)</);
  const superPick = /sponser-label">Super Pick/.test(block);
  const isNew = /ribbon"><span>New/.test(block);

  if (bannerMatch) {
    restaurants.push({
      name,
      bannerImage: normalizeUrl(bannerMatch[1]),
      logoImage: logoMatch ? normalizeUrl(logoMatch[1]) : normalizeUrl(bannerMatch[1]),
      minOrder: minMatch ? Number(minMatch[1].replace(/,/g, '')) : 500,
      deliveryFee: deliveryMatch ? deliveryMatch[1].trim() : 'from Rs 50',
      distance: distanceMatch ? distanceMatch[1].trim() : '',
      superPick,
      isNew,
    });
  }
}

// Dedupe restaurants by name
const seenNames = new Set();
const uniqueRestaurants = restaurants.filter((r) => {
  if (seenNames.has(r.name)) return false;
  seenNames.add(r.name);
  return !/no-image/i.test(r.bannerImage);
});

const heroImages = uniqueRestaurants
  .slice(0, 6)
  .map((r) => r.bannerImage)
  .filter(Boolean);

const extract = {
  source: 'archive/restraint.html',
  brand: 'Supermeal.pk',
  theme: { purple: '#603cba', red: '#ed0000', grey: '#484848', bg: '#f2f2f2' },
  cuisines,
  restaurants: uniqueRestaurants,
  heroImages,
};

fs.writeFileSync(outPath, JSON.stringify(extract, null, 2));
console.log(`Wrote ${outPath}: ${cuisines.length} cuisines, ${uniqueRestaurants.length} restaurants`);
