/**
 * Billing runtime mode (server-side).
 *
 * `BILLING_MODE=manual`, plan changes apply in Postgres only (no Stripe Checkout). Use for UAT,
 * offline / assisted sales, or when Stripe price IDs are not configured yet. Crypto (NOWPayments)
 * remains available via `/api/billing/crypto/*` whenever `NOWPAYMENTS_API_KEY` is set.
 *
 * `BILLING_MODE=stripe` (or unset; default in code is `stripe`), Stripe Checkout + webhooks for subscriptions.
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
