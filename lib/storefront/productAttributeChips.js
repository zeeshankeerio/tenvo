import { normalizeKey } from '@/lib/utils/domainHelpers';

/** Read domain_data field with legacy key normalization. */
export function domainField(domainData, key) {
  const val = domainData?.[key] ?? domainData?.[normalizeKey(key)];
  if (val == null) return null;
  const s = String(val).trim();
  return s || null;
}

/** Honest storefront label for sourcing values. */
export function formatSourcingLabel(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'local') return 'Local';
  if (v === 'imported') return 'Imported';
  const trimmed = String(raw || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : '';
}

/** Whether sourcing should render as a top-level badge (local / imported). */
export function isCanonicalSourcingBadge(raw) {
  const v = String(raw || '').trim().toLowerCase();
  return v === 'local' || v === 'imported';
}

/**
 * @param {string} businessDomain
 * @param {string} filterKey
 * @param {string} value
 */
export function buildStorefrontFilterHref(businessDomain, filterKey, value) {
  if (!businessDomain || !value || !filterKey) return null;
  const params = new URLSearchParams();
  params.set(filterKey, String(value).trim());
  return `/store/${businessDomain}/products?${params.toString()}`;
}

/**
 * Clothing / textile attribute rows for product detail and cards.
 * @param {object} product
 * @returns {Array<{ key: string, label: string, value: string, filterKey?: string, badge?: boolean }>}
 */
export function buildClothingAttributeRows(product) {
  const dd = product?.domain_data || {};
  /** @type {Array<{ key: string, label: string, value: string, filterKey?: string, badge?: boolean }>} */
  const rows = [];

  const brand =
    product?.brand?.trim() ||
    domainField(dd, 'designertracking') ||
    domainField(dd, 'designer') ||
    domainField(dd, 'brand');
  if (brand) {
    rows.push({ key: 'brand', label: 'Brand', value: brand, filterValue: brand, filterKey: 'brand' });
  }

  const fabric = domainField(dd, 'fabrictype') || domainField(dd, 'fabric');
  if (fabric) {
    rows.push({ key: 'fabric', label: 'Fabric', value: fabric, filterValue: fabric, filterKey: 'fabric' });
  }

  const sourcing = domainField(dd, 'sourcing');
  if (sourcing) {
    rows.push({
      key: 'sourcing',
      label: 'Sourcing',
      value: formatSourcingLabel(sourcing),
      filterValue: String(sourcing).trim().toLowerCase(),
      filterKey: 'sourcing',
      badge: isCanonicalSourcingBadge(sourcing),
    });
  }

  const size = domainField(dd, 'size') || domainField(dd, 'sizecolormatrix');
  if (size) rows.push({ key: 'size', label: 'Size', value: size, filterValue: size, filterKey: 'size' });

  const color = domainField(dd, 'color');
  if (color) rows.push({ key: 'color', label: 'Color', value: color });

  const origin = domainField(dd, 'origin');
  if (origin) rows.push({ key: 'origin', label: 'Origin', value: origin });

  const season = domainField(dd, 'season');
  if (season) rows.push({ key: 'season', label: 'Season', value: season });

  const stitching = domainField(dd, 'stitchingstatus') || domainField(dd, 'stitchingtype');
  if (stitching) rows.push({ key: 'stitching', label: 'Stitching', value: stitching });

  const collection = domainField(dd, 'collection');
  if (collection) rows.push({ key: 'collection', label: 'Collection', value: collection });

  const article = domainField(dd, 'articleno') || domainField(dd, 'designno');
  if (article) rows.push({ key: 'article', label: 'Article', value: article });

  return rows;
}

/**
 * Auto-parts attribute rows for product detail.
 * @param {object} product
 */
export function buildPartsAttributeRows(product) {
  const dd = product?.domain_data || {};
  const rows = [];
  const partNumber = domainField(dd, 'partnumber') || product?.sku;
  if (partNumber) rows.push({ key: 'partnumber', label: 'Part number', value: partNumber });

  const oem = domainField(dd, 'oemnumber');
  if (oem) rows.push({ key: 'oem', label: 'OEM', value: oem });

  const fitment = [domainField(dd, 'vehiclemake'), domainField(dd, 'vehiclemodel'), domainField(dd, 'modelyear')]
    .filter(Boolean)
    .join(' ');
  if (fitment) {
    rows.push({ key: 'fitment', label: 'Fits', value: fitment, filterValue: fitment, filterKey: 'brand' });
  }

  return rows;
}

/** Resolve canonical local/imported sourcing for top-level badges. */
export function resolveSourcingBadge(domainData) {
  const raw = domainField(domainData, 'sourcing');
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === 'local' || v === 'imported') return v;
  return null;
}
