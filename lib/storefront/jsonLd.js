/**
 * JSON-LD for public storefront (schema.org), SEO + rich results hints.
 * Safe when NEXT_PUBLIC_APP_URL is unset (returns null).
 */

import { getOpenGraphProductImageUrl } from '@/lib/storefront/productImageFallback';

function storeBaseUrl(businessDomain) {
  const raw = typeof process.env.NEXT_PUBLIC_APP_URL === 'string' ? process.env.NEXT_PUBLIC_APP_URL.trim() : '';
  if (!raw) return null;
  const base = raw.replace(/\/$/, '');
  try {
    return new URL(`${base}/store/${encodeURIComponent(businessDomain)}`);
  } catch {
    return null;
  }
}

/**
 * @param {{ business: object; businessDomain: string }} args
 * @returns {object | null}
 */
export function buildStoreJsonLd({ business, businessDomain }) {
  const storeUrl = storeBaseUrl(businessDomain);
  if (!storeUrl) return null;

  const sameAs = [business?.website].filter(Boolean);
  const node = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${storeUrl.href}#store`,
    name: business.business_name,
    url: storeUrl.href,
    description: business.description || undefined,
    image: business.logo_url || business.cover_image_url || undefined,
    telephone: business.phone || undefined,
    email: business.email || undefined,
  };
  if (sameAs.length) node.sameAs = sameAs;
  if (business.city || business.country) {
    node.address = {
      '@type': 'PostalAddress',
      streetAddress: business.address || undefined,
      addressLocality: business.city || undefined,
      addressCountry: business.country || undefined,
      postalCode: business.postal_code || undefined,
    };
  }
  return node;
}

/**
 * Product detail, schema.org Product + Offer.
 * @param {{ business: object; businessDomain: string; product: object; currency?: string }} args
 */
export function buildProductJsonLd({ business, businessDomain, product, currency = 'PKR' }) {
  const storeUrl = storeBaseUrl(businessDomain);
  if (!storeUrl || !product?.name) return null;
  const origin = storeUrl.origin;
  const slug = encodeURIComponent(businessDomain);
  const pathSlug = encodeURIComponent(product.slug || product.id);
  const productPath = `${origin}/store/${slug}/products/${pathSlug}`;
  const price = Number(product.price);
  const inStock =
    product.stock === null || product.stock === undefined ? true : Number(product.stock) > 0;
  const plainDesc =
    product.description && typeof product.description === 'string'
      ? product.description.replace(/<[^>]+>/g, '').trim().slice(0, 500)
      : undefined;

  let images;
  const trimmed = typeof product.image_url === 'string' ? product.image_url.trim() : '';
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    images = [trimmed];
  } else if (Array.isArray(product.images) && product.images.length) {
    images = product.images
      .map((i) => (typeof i === 'string' ? i : i?.url))
      .filter((u) => typeof u === 'string' && (u.startsWith('https://') || u.startsWith('http://')));
  }
  if (!images?.length) {
    const catalog = getOpenGraphProductImageUrl(product, business.category);
    if (catalog) images = [catalog];
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: plainDesc || undefined,
    sku: product.sku || undefined,
    image: images?.length ? images : undefined,
    brand: { '@type': 'Brand', name: business.business_name },
    offers: {
      '@type': 'Offer',
      url: productPath,
      priceCurrency: currency,
      price: Number.isFinite(price) && price > 0 ? String(price) : undefined,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: business.business_name },
    },
  };
}

/**
 * WebSite + SearchAction for on-site product search (Google sitelinks search box).
 */
export function buildStoreWebSiteJsonLd({ business, businessDomain }) {
  const storeUrl = storeBaseUrl(businessDomain);
  if (!storeUrl) return null;
  const origin = storeUrl.origin;
  const slug = encodeURIComponent(businessDomain);
  const urlTemplate = `${origin}/store/${slug}/products?search={search_term_string}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${storeUrl.href}#website`,
    name: business.business_name,
    url: storeUrl.href,
    publisher: { '@id': `${storeUrl.href}#store` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
