/**
 * Shared tenant-aware helpers for elevated public storefronts.
 * Prefer business settings, live categories, and catalog over static demo defaults.
 */
import { isDemoStoreDomain } from '@/lib/storefront/storeContactSanitize';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';

/**
 * @param {string | null | undefined} name
 * @param {string} [fallback]
 */
export function formatElevatedStoreName(name, fallback = 'Store') {
  const raw = String(name || '').trim();
  return raw.replace(/\s+Demo$/i, '').trim() || fallback;
}

/**
 * @param {Array<{ id?: string; name?: string; slug?: string; image_url?: string }>} categories
 * @param {string} storeBase
 * @param {{ max?: number; includeDeals?: boolean }} [opts]
 */
export function buildCategoryNavItems(categories, storeBase, opts = {}) {
  const { max = 12, includeDeals = true } = opts;
  const productsUrl = `${storeBase}/products`;
  const items = (categories || [])
    .filter((c) => c?.name && c?.slug)
    .slice(0, max)
    .map((cat) => ({
      id: String(cat.slug || cat.id),
      label: cat.name,
      slug: cat.slug,
      image: cat.image_url || '',
      href: `${productsUrl}?category=${encodeURIComponent(cat.slug)}`,
    }));

  if (includeDeals) {
    const hasDeals = items.some(
      (item) => item.id === 'deals' || String(item.slug || '').toLowerCase() === 'deals'
    );
    if (!hasDeals) {
      items.push({
        id: 'deals',
        label: 'Deals',
        slug: '',
        image: '',
        href: `${productsUrl}?onSale=true`,
        hrefSuffix: '?onSale=true',
      });
    }
  }
  return items;
}

/**
 * @param {Array<{ name?: string; slug?: string; id?: string }>} categories
 * @param {Array<{ id: string; label: string; slug: string }>} fallbackTabs
 */
export function buildCuratedTabsFromCategories(categories, fallbackTabs) {
  const rows = (categories || []).filter((c) => c?.name && c?.slug);
  if (rows.length >= 2) {
    return rows.slice(0, 6).map((c) => ({
      id: String(c.slug),
      label: c.name,
      slug: c.slug,
    }));
  }
  return fallbackTabs;
}

/**
 * @param {object[]} products
 * @param {object[]} categories
 * @param {string[] | null | undefined} configuredTerms
 * @param {number} [max]
 */
export function buildQuickSearchTerms(products, categories, configuredTerms, max = 6) {
  if (Array.isArray(configuredTerms) && configuredTerms.length) {
    return configuredTerms.slice(0, max);
  }
  const fromCategories = (categories || []).slice(0, 4).map((c) => c.name).filter(Boolean);
  const fromFeatured = (products || [])
    .filter((p) => p.is_featured && p.name)
    .slice(0, 3)
    .map((p) => String(p.name).split(/\s+/).slice(0, 2).join(' '));
  const merged = [...new Set([...fromCategories, ...fromFeatured])].filter(Boolean).slice(0, max);
  return merged;
}

/**
 * @param {object[]} products
 * @param {string} slug
 */
export function filterProductsByCategorySlug(products, slug) {
  const normalized = String(slug || '').toLowerCase().trim();
  if (!normalized) return products;
  return (products || []).filter((p) => {
    const catSlug = String(p.category_slug || '').toLowerCase();
    const catName = String(p.category_name || p.category || '').toLowerCase();
    if (catSlug) {
      if (catSlug === normalized) return true;
      if (catSlug.includes(normalized) || normalized.includes(catSlug)) return true;
    }
    const nameAsSlug = catName.replace(/\s+/g, '-');
    const nameSpaced = normalized.replace(/-/g, ' ');
    if (catName === nameSpaced || nameAsSlug === normalized) return true;
    if (normalized.includes('main') && catName.includes('main')) return true;
    if (normalized.includes('appetizer') && catName.includes('appetizer')) return true;
    if (normalized.includes('dessert') && catName.includes('dessert')) return true;
    if (normalized.includes('beverage') && catName.includes('beverage')) return true;
    return catName.includes(normalized);
  });
}

/**
 * @param {object[]} products
 * @param {object[] | null | undefined} settingsBanners
 * @param {object[]} demoBanners
 * @param {{ isDemo?: boolean; businessCategory?: string }} ctx
 */
export function buildPromoBannersFromCatalog(products, settingsBanners, demoBanners, ctx = {}) {
  if (Array.isArray(settingsBanners) && settingsBanners.length) return settingsBanners;
  if (ctx.isDemo && demoBanners?.length) return demoBanners;

  const pool = (products || []).filter((p) => p.image_url || p.images?.length);
  const featured = pool.filter((p) => p.is_featured);
  const source = (featured.length ? featured : pool).slice(0, 4);
  if (!source.length) return [];

  return source.map((p, i) => ({
    id: String(p.id || `promo-${i}`),
    title: p.name,
    subtitle: p.category_name || p.category || 'Available now',
    image: getEffectiveProductImageUrl(p, ctx.businessCategory),
    href: p.slug ? `?search=${encodeURIComponent(String(p.name).split(/\s+/)[0])}` : '?onSale=true',
    tone: i % 2 === 0 ? 'purple' : 'cream',
  }));
}

/**
 * @param {object} params
 */
export function buildTenantHeroSlides({
  settingsSlides,
  base,
  storeName,
  businessDescription,
  coverImage,
  demoSlides,
  isDemo,
  featuredProducts = [],
}) {
  if (Array.isArray(settingsSlides) && settingsSlides.length) {
    return settingsSlides.map((s) => ({
      ...s,
      ctaHref: s.ctaHref?.startsWith('/')
        ? `${base.replace(/\/products$/, '')}${s.ctaHref}`
        : s.ctaHref || `${base}/products`,
    }));
  }

  if (isDemo && Array.isArray(demoSlides) && demoSlides.length) {
    return demoSlides.map((s, i) => ({
      ...s,
      eyebrow: s.eyebrow?.replace(/\{storeName\}/g, storeName) || s.eyebrow,
      title: s.title?.replace(/\{storeName\}/g, storeName) || s.title,
      ctaHref: s.ctaHref?.startsWith('/')
        ? `${base.replace(/\/products$/, '')}${s.ctaHref}`
        : s.ctaHref || `${base}/products`,
      ...(i === 0 && coverImage ? { image: coverImage } : {}),
    }));
  }

  const slides = [];
  const subtitle =
    String(businessDescription || '').trim() ||
    `Browse our full menu with live prices and availability.`;

  slides.push({
    eyebrow: storeName,
    title: subtitle.split('.')[0]?.trim() || `Order from ${storeName}`,
    subtitle,
    image: coverImage || featuredProducts[0]?.image_url || '',
    ctaLabel: 'View menu',
    ctaHref: `${base}/products`,
  });

  for (const p of featuredProducts.slice(0, 3)) {
    if (!p?.image_url) continue;
    slides.push({
      eyebrow: p.category_name || p.category || storeName,
      title: p.name,
      subtitle: p.description?.slice(0, 120) || 'Order now while stock lasts.',
      image: p.image_url,
      ctaLabel: 'Order now',
      ctaHref: `${base}/products${p.slug ? `/${p.slug}` : ''}`,
    });
  }

  return slides;
}

/**
 * Enrich category nav rows with a representative product image when missing.
 * @param {object[]} items
 * @param {object[]} products
 * @param {string | null | undefined} businessCategory
 */
export function enrichCategoryNavImages(items, products, businessCategory) {
  return items.map((item) => {
    if (item.image) return item;
    const match = (products || []).find(
      (p) =>
        (p.category_slug && item.slug && p.category_slug === item.slug) ||
        (p.category_name && item.label && String(p.category_name).toLowerCase() === String(item.label).toLowerCase())
    );
    const image = match ? getEffectiveProductImageUrl(match, businessCategory) : '';
    return { ...item, image };
  });
}

export { isDemoStoreDomain };
