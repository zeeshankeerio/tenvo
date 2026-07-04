/**
 * Owner-defined homepage marketing sections for public storefronts.
 * Persisted on `business_settings.settings.pageSections`.
 */
import { resolveSpotlightBannerImage } from './storefrontImagePlaceholders.js';

export const MAX_PAGE_SECTIONS = 6;

/** @typedef {'banner' | 'promo-strip'} PageSectionType */
/** @typedef {'image' | 'gradient' | 'solid'} BannerDesignMode */

/**
 * @param {PageSectionType} [type]
 */
export function createEmptyPageSection(type = 'banner') {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    type,
    enabled: true,
    sortOrder: 0,
    title: '',
    subtitle: '',
    imageUrl: '',
    design: type === 'banner' ? 'gradient' : 'solid',
    backgroundColor: '',
    gradientFrom: '',
    gradientTo: '',
    textColor: '#ffffff',
    ctaLabel: '',
    ctaHref: '/products',
  };
}

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * @param {string | null | undefined} value
 * @param {string} [fallback]
 */
function cleanColor(value, fallback = '') {
  const v = String(value || '').trim();
  if (HEX_COLOR.test(v)) return v;
  return fallback;
}

/**
 * @param {string | null | undefined} href
 */
export function sanitizeStoreCtaHref(href) {
  const raw = String(href || '').trim();
  if (!raw) return '/products';
  if (raw.startsWith('/')) return raw.slice(0, 240);
  if (/^https?:\/\//i.test(raw)) return raw.slice(0, 500);
  return `/products`;
}

/**
 * @param {unknown} raw
 * @param {{ brandColor?: string }} [opts]
 * @returns {object[]}
 */
export function normalizePageSections(raw, opts = {}) {
  if (!Array.isArray(raw)) return [];

  const brand = cleanColor(opts.brandColor, '#2563eb') || '#2563eb';
  const brandDark = cleanColor(opts.brandColorDark, '#1e3a8a') || '#1e3a8a';

  return raw
    .slice(0, MAX_PAGE_SECTIONS)
    .map((row, index) => {
      if (!row || typeof row !== 'object') return null;
      const type = row.type === 'promo-strip' ? 'promo-strip' : 'banner';
      const design =
        row.design === 'image' || row.design === 'solid' || row.design === 'gradient'
          ? row.design
          : type === 'banner'
            ? 'gradient'
            : 'solid';

      return {
        id: String(row.id || `sec-${index}`).slice(0, 64),
        type,
        enabled: row.enabled !== false,
        sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : index,
        title: String(row.title || '').trim().slice(0, 120),
        subtitle: String(row.subtitle || '').trim().slice(0, 280),
        imageUrl: String(row.imageUrl || '').trim().slice(0, 2000),
        design,
        backgroundColor: cleanColor(row.backgroundColor, brand),
        gradientFrom: cleanColor(row.gradientFrom, brand),
        gradientTo: cleanColor(row.gradientTo, brandDark),
        textColor: cleanColor(row.textColor, '#ffffff') || '#ffffff',
        ctaLabel: String(row.ctaLabel || '').trim().slice(0, 48),
        ctaHref: sanitizeStoreCtaHref(row.ctaHref),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row, index) => ({ ...row, sortOrder: index }));
}

/**
 * @param {object} section
 * @param {string} [fallbackAccent]
 */
export function getSectionBackgroundStyle(section, fallbackAccent = '#2563eb') {
  const accent = cleanColor(section.backgroundColor, fallbackAccent) || fallbackAccent;
  const from = cleanColor(section.gradientFrom, accent) || accent;
  const to = cleanColor(section.gradientTo, accent) || accent;

  if (section.type === 'banner') {
    const imageUrl =
      String(section.imageUrl || '').trim() ||
      resolveSpotlightBannerImage(
        { id: section.id, title: section.title },
        'retail-shop',
        Number(section.sortOrder) || 0
      );
    return {
      backgroundImage: `linear-gradient(to right, rgba(15,23,42,0.78), rgba(15,23,42,0.34)), url(${imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  if (section.design === 'image' && section.imageUrl) {
    return {
      backgroundImage: `linear-gradient(to right, rgba(15,23,42,0.72), rgba(15,23,42,0.35)), url(${section.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  if (section.design === 'gradient') {
    return { background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` };
  }
  return { backgroundColor: accent };
}

/**
 * @param {unknown} sections
 */
export function getActivePageSections(sections) {
  return normalizePageSections(sections).filter((s) => s.enabled && (s.title || s.subtitle || s.imageUrl));
}
