/**
 * Build compliant Unsplash CDN URLs (requires ixlib or images 404).
 * @see https://unsplash.com/documentation#hotlinking
 */

const IXLIB = 'rb-4.1.0';

/**
 * @param {string} photoId segment after "photo-" (e.g. "1594938298603-c8148c4dae35")
 * @param {{ w?: number; q?: number; h?: number }} [opts]
 */
export function buildUnsplashImageUrl(photoId, opts = {}) {
  const id = String(photoId || '').trim();
  if (!id) return '';
  const params = new URLSearchParams();
  params.set('ixlib', IXLIB);
  params.set('auto', 'format');
  params.set('fit', 'crop');
  if (opts.w) params.set('w', String(opts.w));
  if (opts.h) params.set('h', String(opts.h));
  params.set('q', String(opts.q ?? 82));
  return `https://images.unsplash.com/photo-${id}?${params.toString()}`;
}

/**
 * Ensure stored / legacy Unsplash URLs include ixlib and sizing params.
 * @param {string | null | undefined} url
 * @param {{ w?: number; q?: number }} [opts]
 */
export function normalizeUnsplashUrl(url, opts = {}) {
  const raw = String(url || '').trim();
  if (!raw || !raw.includes('images.unsplash.com/photo-')) return raw;

  try {
    const parsed = new URL(raw);
    if (!parsed.searchParams.has('ixlib')) parsed.searchParams.set('ixlib', IXLIB);
    if (!parsed.searchParams.has('auto')) parsed.searchParams.set('auto', 'format');
    if (!parsed.searchParams.has('fit')) parsed.searchParams.set('fit', 'crop');
    if (opts.w && !parsed.searchParams.has('w')) parsed.searchParams.set('w', String(opts.w));
    if (opts.q && !parsed.searchParams.has('q')) parsed.searchParams.set('q', String(opts.q));
    return parsed.toString();
  } catch {
    return raw;
  }
}

/**
 * @param {string} url
 */
export function extractUnsplashPhotoId(url) {
  const match = String(url || '').match(/images\.unsplash\.com\/photo-([a-zA-Z0-9_-]+)/);
  return match?.[1] || null;
}
