/**
 * One-off extractor: COMFY + Fantastic Furniture saved HTML → JSON catalog draft.
 * Run: node scripts/extract-furniture-archive.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

function normalizeUrl(u) {
  if (!u) return '';
  let url = String(u).trim().replace(/\\u0026/g, '&');
  if (url.startsWith('//')) url = `https:${url}`;
  if (url.includes('width=')) {
    url = url.replace(/([?&])width=\d+/, '$1width=1200');
  } else if (url.includes('?')) {
    url += '&width=1200';
  } else {
    url += '?width=1200';
  }
  return url;
}

function extractComfy(html) {
  const collections = [];
  const re = /<a\s+href="(\/collections\/[^"]+)"[^>]*aria-label="([^"]*)"[\s\S]*?<img[^>]+alt="([^"]*)"[^>]+src="(\/\/comfy\.sg[^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    collections.push({
      href: m[1],
      label: (m[2] || m[3]).trim(),
      image: normalizeUrl(m[4]),
    });
  }

  // Dedupe by href
  const seen = new Set();
  const unique = collections.filter((c) => {
    if (seen.has(c.href)) return false;
    seen.add(c.href);
    return c.label && !/logo|favicon|share/i.test(c.image);
  });

  const fileImages = [...html.matchAll(/\/\/comfy\.sg\/cdn\/shop\/files\/([a-zA-Z0-9_-]+)\.(webp|jpg|jpeg|png)/g)].map((x) => ({
    slug: x[1],
    url: normalizeUrl(`//comfy.sg/cdn/shop/files/${x[1]}.${x[2]}`),
  }));

  const editorial = [];
  const editorialRe = /<h2[^>]*>([\s\S]*?)<\/h2>[\s\S]{0,2500}?<img[^>]+src="(\/\/comfy\.sg[^"]+)"/gi;
  while ((m = editorialRe.exec(html)) !== null) {
    const title = m[1].replace(/<[^>]+>/g, '').trim();
    if (title.length > 3 && title.length < 120) {
      editorial.push({ title, image: normalizeUrl(m[2]) });
    }
  }

  const heroImages = [...html.matchAll(/\/\/comfy\.sg\/cdn\/shop\/files\/comfy-[a-z-]+\.(webp|jpg)/gi)].map((x) =>
    normalizeUrl(x[0].startsWith('//') ? x[0] : `//comfy.sg/cdn/shop/files/${x[0]}`)
  );

  return { collections: unique, fileImages: [...new Map(fileImages.map((f) => [f.slug, f])).values()], editorial, heroImages: [...new Set(heroImages)] };
}

function extractFantastic(html) {
  const medias = [...html.matchAll(/https:\/\/api\.fantasticfurniture\.com\.au\/medias\/([^?"'\s]+)\.(webp|png|jpg)/gi)].map((x) => ({
    name: x[1].replace(/-/g, ' ').replace(/\s+/g, ' ').trim(),
    url: `https://api.fantasticfurniture.com.au/medias/${x[1]}.${x[2]}`,
  }));

  const productLike = medias.filter(
    (m) =>
      !/banner|hero|logo|icon|menu|sale.*web-assets|EOFY-EXTRA|Latitude|Delivery|Gift|Package|Promo|Category tile|wide-save|Group 4|Photo\.png|BRENT|Button|OE-TAF|click and collect|securecheckout/i.test(
        m.name
      )
  );

  // Text blobs from minified HTML (product promos from saved page)
  const promos = [];
  const promoPatterns = [
    /Newhaven 4 Seater Round Dining Table[^$]*NOW \$([0-9,]+)[^$]*SAVE \$([0-9,]+)/i,
    /Jonnie Black Dining Chair[^$]*NOW \$([0-9,]+)[^$]*SAVE \$([0-9,]+)/i,
    /Sawyer[^$]*Queen Bed[^$]*NOW \$([0-9,]+)/i,
    /Benson[^$]*Walnut Bedside Table[^$]*NOW \$([0-9,]+)/i,
    /Sleepapedic[^$]*Mattress[^$]*NOW \$([0-9,]+)/i,
    /Kaidon[^$]*Double Beige Bed Frame[^$]*NOW \$([0-9,]+)[^$]*SAVE \$([0-9,]+)/i,
    /Elwine 3 Seater[^$]*Sofa[^$]*NOW \$([0-9,]+)[^$]*SAVE \$([0-9,]+)/i,
    /Cooshy Cloud Queen Medium Mattress[^$]*NOW \$([0-9,]+)[^$]*SAVE \$([0-9,]+)/i,
  ];
  const promoNames = [
    'Newhaven 4 Seater Round Dining Table',
    'Jonnie Black Dining Chair',
    'Sawyer Queen Bed Frame with Storage',
    'Benson Walnut Bedside Table',
    'Sleepapedic Queen Mattress',
    'Kaidon Double Beige Velvet Bed Frame',
    'Elwine 3 Seater Light Grey Sofa with Ottoman',
    'Cooshy Cloud Queen Medium Mattress',
  ];
  promoPatterns.forEach((pat, i) => {
    const match = html.match(pat);
    if (match) {
      promos.push({ name: promoNames[i], priceAud: Number(match[1].replace(/,/g, '')), saveAud: match[2] ? Number(match[2].replace(/,/g, '')) : null });
    }
  });

  return { productLike: [...new Map(productLike.map((p) => [p.url, p])).values()], promos };
}

const comfyHtml = fs.readFileSync(path.join(root, 'archive', 'furctinure1.html'), 'utf8');
const ffHtml = fs.readFileSync(path.join(root, 'archive', 'furtiniture2.html'), 'utf8');

const comfy = extractComfy(comfyHtml);
const ff = extractFantastic(ffHtml);

const out = { comfy, ff, generatedAt: new Date().toISOString() };
fs.writeFileSync(path.join(root, 'lib/dataLab/furnitureArchiveExtract.json'), JSON.stringify(out, null, 2));

console.log('COMFY collections:', comfy.collections.length);
console.log('COMFY editorial:', comfy.editorial.length);
console.log('COMFY sample collections:', comfy.collections.slice(0, 8).map((c) => c.label));
console.log('FF product-like medias:', ff.productLike.length);
console.log('FF promos:', ff.promos);
console.log('FF sample medias:', ff.productLike.slice(0, 10).map((p) => p.name));
console.log('Wrote lib/dataLab/furnitureArchiveExtract.json');
