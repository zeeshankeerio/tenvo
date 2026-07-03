/**
 * Non-generated helpers for gym-fitness seed catalog.
 * Data lives in `fitnessDemoCatalog.js` (regenerate via build-fitness-seed-catalog.mjs).
 */
import { FITNESS_SEED_CATEGORIES, FITNESS_SEED_PRODUCTS } from './fitnessDemoCatalog.js';
import { enrichCategoryNavImages, isDemoStoreDomain } from '@/lib/storefront/elevatedStorefrontTenant';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { slugifyCategoryName } from '@/lib/utils/registrationSeed';

/** Map hub / domain-knowledge category labels → seed catalog category for archive tile PNGs. */
const FITNESS_CATEGORY_SEED_ALIASES = Object.freeze({
  'membership plans': 'Memberships',
  memberships: 'Memberships',
  membership: 'Memberships',
  'personal training': 'Personal Training',
  training: 'Personal Training',
  classes: 'Classes',
  'whey protein': 'Whey Protein',
  protein: 'Whey Protein',
  'vitamins & supps': 'Vitamins & Minerals',
  'vitamins and supps': 'Vitamins & Minerals',
  'vitamins & minerals': 'Vitamins & Minerals',
  vitamins: 'Vitamins & Minerals',
  'gym gear': 'Fitness Accessories',
  'fitness accessories': 'Fitness Accessories',
  accessories: 'Fitness Accessories',
  gear: 'Fitness Accessories',
  'pre workout': 'Pre Workout',
  preworkout: 'Pre Workout',
  creatine: 'Creatine',
  'amino acids': 'Amino Acids',
  bcaa: 'Amino Acids',
  deals: 'Deals',
  'weight gainer': 'Weight Gainer',
  'omega 3 & fish oil': 'Omega 3 & Fish Oil',
  'protein bars': 'Protein Bars',
  'weight loss': 'Weight Loss',
});

/** Align category slugs with registration / hub inventory (`slugifyCategoryName`). */
export function slugifyFitnessCategory(name) {
  return slugifyCategoryName(name) || 'supplements';
}

/**
 * First product image per seed category (archive CDN URLs).
 * @param {string} category
 */
export function getFitnessSeedImageForCategory(category) {
  const row = FITNESS_SEED_PRODUCTS.find(
    (p) => p.category === category && typeof p.image_url === 'string' && p.image_url
  );
  return row?.image_url || '';
}

/**
 * Resolve archive PNG for a storefront category label/slug (image only — not products).
 * @param {string | null | undefined} label
 * @param {string | null | undefined} [slug]
 */
export function resolveFitnessArchiveCategoryImage(label, slug) {
  const normLabel = String(label || '')
    .trim()
    .toLowerCase();
  const normSlug = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, ' ');

  const direct =
    FITNESS_CATEGORY_SEED_ALIASES[normLabel] ||
    FITNESS_CATEGORY_SEED_ALIASES[normSlug] ||
    null;
  if (direct) {
    const img = getFitnessSeedImageForCategory(direct);
    if (img) return img;
  }

  for (const seedName of FITNESS_SEED_CATEGORIES) {
    const seedNorm = seedName.toLowerCase();
    if (
      normLabel === seedNorm ||
      normSlug === seedNorm.replace(/[^a-z0-9]+/g, ' ').trim() ||
      normLabel.includes(seedNorm) ||
      seedNorm.includes(normLabel)
    ) {
      const img = getFitnessSeedImageForCategory(seedName);
      if (img) return img;
    }
  }

  return '';
}

/**
 * Best product photo for a category nav tile (featured first, alias-aware).
 * @param {object[]} products
 * @param {{ label?: string; slug?: string; id?: string }} item
 * @param {string | null | undefined} [businessCategory]
 */
function findFitnessCategoryProductImage(products, item, businessCategory) {
  const label = String(item.label || '').trim().toLowerCase();
  const slug = String(item.slug || item.id || '')
    .trim()
    .toLowerCase();
  const seedName = FITNESS_CATEGORY_SEED_ALIASES[label] || FITNESS_CATEGORY_SEED_ALIASES[slug.replace(/-/g, ' ')];

  const matches = (products || []).filter((p) => {
    if (!p?.image_url?.trim()) return false;
    const pSlug = String(p.category_slug || '').toLowerCase();
    const pName = String(p.category_name || p.category || '').toLowerCase();
    if (slug && pSlug && (pSlug === slug || slug.includes(pSlug) || pSlug.includes(slug))) return true;
    if (label && pName && (pName === label || pName.includes(label) || label.includes(pName))) return true;
    if (seedName && pName === seedName.toLowerCase()) return true;
    return false;
  });

  const featured = matches.find((p) => p.is_featured);
  const pick = featured || matches[0];
  return pick ? getEffectiveProductImageUrl(pick, businessCategory) : '';
}

/**
 * Category shop tiles: DB image_url → product photo → archive PNG (gym vertical).
 * @param {object[]} items
 * @param {object[]} [products]
 * @param {string | null | undefined} [businessCategory]
 */
export function enrichFitnessCategoryNavImages(items, products, businessCategory) {
  const base = enrichCategoryNavImages(items, products, businessCategory);
  return base.map((item) => {
    if (item.image?.trim()) return item;

    const fromProduct = findFitnessCategoryProductImage(products, item, businessCategory);
    if (fromProduct) return { ...item, image: fromProduct };

    if (item.id === 'deals' || item.label?.toLowerCase() === 'deals') {
      const dealProduct = (products || []).find(
        (p) =>
          p?.image_url?.trim() &&
          p.compare_price &&
          Number(p.compare_price) > Number(p.price)
      );
      if (dealProduct) {
        return { ...item, image: getEffectiveProductImageUrl(dealProduct, businessCategory) };
      }
    }

    const archive = resolveFitnessArchiveCategoryImage(item.label, item.slug || item.id);
    if (archive) return { ...item, image: archive };

    return item;
  });
}

/**
 * Shop-by-category icons aligned with registration seed categories.
 * @param {string} storeBase `/store/{domain}`
 * @param {{ max?: number }} [opts]
 */
export function buildFitnessCategoryIconsFromSeed(storeBase, opts = {}) {
  const { max = 8 } = opts;
  const productsUrl = `${storeBase}/products`;
  const icons = [];

  for (const category of FITNESS_SEED_CATEGORIES) {
    const slug = slugifyFitnessCategory(category);
    const image = getFitnessSeedImageForCategory(category);
    if (!image) continue;
    icons.push({
      id: slug,
      label: category,
      slug,
      image,
      href: `${productsUrl}?category=${encodeURIComponent(slug)}`,
    });
    if (icons.length >= max) break;
  }

  if (!icons.some((i) => i.id === 'deals')) {
    const dealsImage =
      getFitnessSeedImageForCategory('Deals') ||
      getFitnessSeedImageForCategory('Whey Protein');
    icons.push({
      id: 'deals',
      label: 'Deals',
      slug: '',
      image: dealsImage,
      href: `${productsUrl}?onSale=true`,
    });
  }

  return icons.slice(0, max);
}

/** @type {Map<string, typeof FITNESS_SEED_PRODUCTS[number]>} */
const SEED_BY_SKU = new Map(
  FITNESS_SEED_PRODUCTS.filter((p) => p.sku).map((p) => [String(p.sku), p])
);

/** @type {Map<string, typeof FITNESS_SEED_PRODUCTS[number]>} */
const SEED_BY_NAME = new Map(
  FITNESS_SEED_PRODUCTS.map((p) => [String(p.name || '').trim().toLowerCase(), p])
);

/**
 * Attach archive product photography when hub rows omit image_url.
 * Live tenants: only enrich preview/seed rows; demo tenants may backfill from seed catalog.
 * @param {object[]} products
 * @param {string | null | undefined} [businessDomain]
 */
export function enrichFitnessProductsWithSeedImages(products = [], businessDomain) {
  const allowSeedBackfill = isDemoStoreDomain(businessDomain);
  return (products || []).map((product) => {
    if (!allowSeedBackfill && !product?.catalog_preview) return product;
    const existing = product?.image_url?.trim();
    if (existing && !existing.includes('unsplash.com')) return product;
    const seed =
      (product?.sku && SEED_BY_SKU.get(String(product.sku))) ||
      SEED_BY_NAME.get(String(product.name || '').trim().toLowerCase());
    if (!seed?.image_url) return product;
    return {
      ...product,
      image_url: seed.image_url,
      brand: product.brand || seed.brand,
      category_name: product.category_name || product.category || seed.category,
    };
  });
}

/**
 * Map seed catalog rows to storefront product cards (demo fallback).
 * @param {typeof FITNESS_SEED_PRODUCTS[number]} row
 */
export function mapFitnessSeedRowToStorefrontProduct(row) {
  const name = String(row.name || 'Product');
  const slug = slugifyFitnessCategory(name);
  return {
    id: row.sku || slug,
    slug,
    sku: row.sku,
    name,
    price: row.price,
    compare_price: row.compare_price,
    image_url: row.image_url,
    category_name: row.category,
    category: row.category,
    brand: row.brand,
    stock: row.stock ?? 24,
    is_featured: Boolean(row.is_featured),
    domain_data: row.domain_data || {},
    /** Static seed row — not purchasable until registered in hub/DB */
    catalog_preview: true,
  };
}

/**
 * Demo storefront: prefer archive seed catalog when DB products lack photography.
 * @param {object[]} dbProducts
 * @param {string | null | undefined} businessDomain
 */
export function resolveFitnessShowcaseProducts(dbProducts, businessDomain) {
  const list = Array.isArray(dbProducts) ? dbProducts.filter(Boolean) : [];
  if (list.length > 0) {
    return enrichFitnessProductsWithSeedImages(list, businessDomain);
  }
  if (isDemoStoreDomain(businessDomain)) {
    return FITNESS_SEED_PRODUCTS.map(mapFitnessSeedRowToStorefrontProduct);
  }
  return [];
}

/**
 * Promo banners using real archive product photography.
 * @param {string} storeBase
 */
export function buildFitnessPromoBannersFromSeed(storeBase) {
  const productsUrl = `${storeBase}/products`;
  const whey = getFitnessSeedImageForCategory('Whey Protein');
  const pre = getFitnessSeedImageForCategory('Pre Workout');
  const membership = FITNESS_SEED_PRODUCTS.find((p) => p.sku === 'TF-GYM-MEM-M-1M')?.image_url;

  return [
    {
      id: 'protein',
      title: 'Fuel your lifts',
      subtitle: 'Whey isolates, mass gainers, and recovery from trusted brands',
      image: whey,
      href: `${productsUrl}?category=whey-protein`,
      tone: 'crimson',
    },
    {
      id: 'preworkout',
      title: 'Pre-workout power',
      subtitle: 'Energy, focus, and pump for every training block',
      image: pre || whey,
      href: `${productsUrl}?category=pre-workout`,
      tone: 'dark',
    },
    {
      id: 'membership',
      title: 'Join the pack',
      subtitle: 'Monthly passes, trial classes, and PT bundles',
      image: membership,
      href: `${productsUrl}?category=memberships`,
      tone: 'crimson',
    },
  ].filter((b) => b.image);
}
