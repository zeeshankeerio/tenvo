/**
 * Platform sales / demo scheduling (Calendly or equivalent).
 * Tenant storefront booking (dealership test drives, etc.) stays on store contact flows.
 */

const DEFAULT_SALES_MEETING_URL = 'https://calendly.com/zeeshan-mindscape/30min';

/**
 * @returns {string} Public Calendly (or sales) URL for book-a-meeting CTAs.
 */
export function getSalesMeetingUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_SALES_MEETING_URL,
    process.env.NEXT_PUBLIC_MEETING_URL,
    process.env.SALES_MEETING_URL,
    process.env.MEETING_URL,
    process.env.meeting_url,
  ];
  for (const raw of candidates) {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value) return value;
  }
  return DEFAULT_SALES_MEETING_URL;
}

/** @param {string} [href] */
export function isExternalHref(href) {
  return typeof href === 'string' && /^https?:\/\//i.test(href);
}

/** Direct scheduling link (enterprise, talk to sales, book demo). */
export function getBookMeetingHref() {
  return getSalesMeetingUrl();
}

/**
 * Demo landing page (request form + schedule CTA). Use for nav/footer when a full page is preferred.
 * @param {{ source?: string; planTier?: string; hash?: string }} [opts]
 */
export function getBookDemoPageHref(opts = {}) {
  const q = new URLSearchParams();
  if (opts.source) q.set('source', opts.source);
  if (opts.planTier) q.set('planTier', opts.planTier);
  const qs = q.toString();
  const base = qs ? `/demo?${qs}` : '/demo';
  return opts.hash ? `${base}#${opts.hash.replace(/^#/, '')}` : base;
}
