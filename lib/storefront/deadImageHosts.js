/**
 * Known-dead external image hosts. URLs on these hosts no longer resolve
 * (DNS ENOTFOUND / permanently offline CDNs), so we treat them as missing and
 * fall back to curated stock imagery instead of letting the Next.js image
 * optimizer hammer them and spam `fetch failed` / `upstream image response failed`.
 */
export const DEAD_IMAGE_HOSTS = new Set([
  'cloud.superme.al',
]);

/**
 * @param {string | null | undefined} url
 * @returns {boolean} true when the URL points at a known-dead image host.
 */
export function isDeadImageUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  for (const host of DEAD_IMAGE_HOSTS) {
    if (url.includes(`//${host}/`) || url.endsWith(`//${host}`)) return true;
  }
  return false;
}
