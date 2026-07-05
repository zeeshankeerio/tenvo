/**
 * Ensure demo storefront catalogs meet minimum depth for public store sections.
 */
import { slugifyCategoryName } from '../utils/registrationSeed.js';
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { resolveSeedProductImageUrl } from '../storefront/productImageFallback.js';

/**
 * @param {{ key: string; domain?: string; fullSeed?: boolean }} spec
 */
export function resolveDemoCatalogMinProducts(spec) {
  const key = resolveDomainKey(spec?.key);
  if (key === 'gym-fitness') return 12;
  if (key === 'restaurant-cafe') return 40;
  if (key === 'auto-parts') return 12;
  if (key === 'vehicle-dealership' || key === 'auto-marketplace') return 12;
  if (key === 'furniture') return 12;
  if (key === 'pharmacy' || key === 'supermarket') return 12;
  return spec?.fullSeed !== false ? 10 : 8;
}

/**
 * Pad thin demo catalogs by cloning base SKUs with distinct names/SKUs.
 * @param {object[]} items
 * @param {number} minCount
 * @param {{ businessId: string; domainKey: string; countryIso?: string }} ctx
 */
export function ensureMinimumDemoCatalogItems(items = [], minCount = 8, ctx = {}) {
  if (!Array.isArray(items) || items.length === 0 || items.length >= minCount) return items;

  const { businessId = 'demo', domainKey = 'retail-shop', countryIso = 'PK' } = ctx;
  const out = [...items];
  let idx = 0;

  while (out.length < minCount && idx < minCount * 4) {
    const base = items[idx % items.length];
    idx += 1;
    const variantNo = out.length - items.length + 1;
    const name = `${String(base.name || 'Product').trim()} · ${variantNo}`;
    const sku = `${String(base.sku || 'DEMO').slice(0, 16)}-V${String(variantNo).padStart(2, '0')}`;
    if (out.some((row) => row.sku === sku)) continue;

    const image_url =
      base.image_url ||
      resolveSeedProductImageUrl({
        name,
        category: String(base.category || ''),
        domainKey,
        seedKey: `${businessId}-${slugifyCategoryName(name)}`,
      });

    out.push({
      ...base,
      name,
      sku,
      slug: slugifyCategoryName(name),
      stock: Math.max(5, Math.round(Number(base.stock || 20) * 0.75)),
      is_featured: false,
      image_url,
      images: base.images?.length
        ? base.images
        : [{ url: image_url, alt: name, primary: true, source: 'unsplash' }],
      domain_data: {
        ...(base.domain_data || {}),
        seedVariant: variantNo,
        seedMarket: countryIso,
      },
    });
  }

  return out.slice(0, Math.max(minCount, out.length));
}
