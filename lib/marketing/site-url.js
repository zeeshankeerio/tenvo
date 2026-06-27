/**
 * Canonical public site origin (no trailing slash).
 * Production: https://www.tenvo.store (set NEXT_PUBLIC_APP_URL + BETTER_AUTH_URL).
 */
export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'https://www.tenvo.store';
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
