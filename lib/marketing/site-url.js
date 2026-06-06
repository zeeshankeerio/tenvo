/**
 * Canonical public site origin (no trailing slash).
 * Default matches initial production host; set NEXT_PUBLIC_APP_URL when moving to tenvo.com / .org.
 */
export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL || 'https://tenvo.mindscapeanalytics.com';
  return raw.replace(/\/$/, '');
}

/**
 * Public support inbox shown in marketing / registration UI.
 * Set NEXT_PUBLIC_SUPPORT_EMAIL in production (e.g. support@tenvo.com).
 */
export function getPublicSupportEmail() {
  const v = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return v || 'support@tenvo.com';
}

/**
 * Canonical customer-facing storefront URL for a business domain slug (`businesses.domain`).
 */
export function getPublicStoreUrl(businessDomain) {
  const base = getSiteUrl();
  const slug = String(businessDomain || '')
    .trim()
    .toLowerCase();
  if (!slug) return `${base}/store`;
  return `${base}/store/${encodeURIComponent(slug)}`;
}
