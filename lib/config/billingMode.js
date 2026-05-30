/**
 * Billing runtime mode (server-side).
 *
 * `BILLING_MODE=manual` — development / UAT: apply selected plan in Postgres only; no Stripe
 * checkout, portal, or subscription API calls. Use to test ERP features against a chosen tier.
 *
 * Production: omit or set `BILLING_MODE=stripe` (default).
 */
export function getBillingMode() {
  return (process.env.BILLING_MODE || 'stripe').toLowerCase().trim();
}

export function isManualBillingMode() {
  return getBillingMode() === 'manual' || getBillingMode() === 'dev';
}

export function isStripeBillingMode() {
  return !isManualBillingMode();
}
