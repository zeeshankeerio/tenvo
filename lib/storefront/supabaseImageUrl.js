/**
 * Supabase Storage image delivery helpers.
 * Prefer CDN transform URLs over Next.js /_next/image for tenant product grids.
 */

const SUPABASE_OBJECT_PATH =
  /^(https?:\/\/[^/]+\.supabase\.(?:co|in))\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i;

const SUPABASE_RENDER_PATH =
  /^(https?:\/\/[^/]+\.supabase\.(?:co|in))\/storage\/v1\/render\/image\/public\/([^/]+)\/(.+)$/i;

/** @typedef {'thumb' | 'card' | 'detail' | 'hero'} StorefrontImageVariant */

const VARIANT_PRESETS = {
  thumb: { width: 256, quality: 72 },
  card: { width: 512, quality: 78 },
  detail: { width: 960, quality: 82 },
  hero: { width: 1920, quality: 85 },
};

/**
 * @param {string | null | undefined} url
 * @returns {boolean}
 */
export function isSupabaseStorageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return SUPABASE_OBJECT_PATH.test(url) || SUPABASE_RENDER_PATH.test(url);
}

/**
 * Parse a Supabase public object or render URL into bucket + object path.
 * @param {string} url
 * @returns {{ origin: string, bucket: string, objectPath: string } | null}
 */
export function parseSupabaseStorageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const objectMatch = url.match(SUPABASE_OBJECT_PATH);
  if (objectMatch) {
    return {
      origin: objectMatch[1],
      bucket: objectMatch[2],
      objectPath: objectMatch[3].split('?')[0],
    };
  }
  const renderMatch = url.match(SUPABASE_RENDER_PATH);
  if (renderMatch) {
    return {
      origin: renderMatch[1],
      bucket: renderMatch[2],
      objectPath: renderMatch[3].split('?')[0],
    };
  }
  return null;
}

/**
 * Build a Supabase render/transform URL (served from Supabase CDN).
 * @param {string} url
 * @param {{ width?: number, height?: number, quality?: number, format?: 'webp' | 'origin' }} [opts]
 * @returns {string}
 */
export function buildSupabaseTransformUrl(url, opts = {}) {
  const parsed = parseSupabaseStorageUrl(url);
  if (!parsed) return url;

  const { width, height, quality = 80, format = 'webp' } = opts;
  const params = new URLSearchParams();
  if (width) params.set('width', String(Math.round(width)));
  if (height) params.set('height', String(Math.round(height)));
  params.set('quality', String(Math.min(100, Math.max(1, Math.round(quality)))));
  if (format && format !== 'origin') params.set('format', format);

  const qs = params.toString();
  return `${parsed.origin}/storage/v1/render/image/public/${parsed.bucket}/${parsed.objectPath}${qs ? `?${qs}` : ''}`;
}

/**
 * Direct object/public URL (fallback when render/transform is unavailable).
 * @param {string} url
 * @returns {string}
 */
export function buildSupabaseObjectPublicUrl(url) {
  const parsed = parseSupabaseStorageUrl(url);
  if (!parsed) return url;
  return `${parsed.origin}/storage/v1/object/public/${parsed.bucket}/${parsed.objectPath}`;
}

/**
 * Resolve the best delivery URL for storefront product imagery.
 * Supabase URLs use CDN transforms; other HTTPS URLs stay as-is for next/image.
 *
 * @param {string | null | undefined} url
 * @param {{ variant?: StorefrontImageVariant, width?: number, height?: number }} [opts]
 * @returns {string}
 */
export function resolveStorefrontImageSrc(url, opts = {}) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:')) return trimmed;

  if (!isSupabaseStorageUrl(trimmed)) {
    return trimmed;
  }

  const preset = opts.variant ? VARIANT_PRESETS[opts.variant] : null;
  const width = opts.width ?? preset?.width;
  const height = opts.height;
  const quality = preset?.quality ?? 80;

  return buildSupabaseTransformUrl(trimmed, { width, height, quality, format: 'webp' });
}

/**
 * Whether the URL should bypass next/image and use a plain img (CDN-direct).
 * @param {string | null | undefined} url
 * @returns {boolean}
 */
export function shouldUseDirectCdnImage(url) {
  return isSupabaseStorageUrl(url);
}

/**
 * Infer image variant from rendered width for grid cards vs PDP.
 * @param {number | undefined} width
 * @returns {StorefrontImageVariant}
 */
export function inferImageVariantFromWidth(width) {
  if (!width || width <= 280) return 'thumb';
  if (width <= 640) return 'card';
  if (width <= 1200) return 'detail';
  return 'hero';
}
