/**
 * Billing runtime mode (server-side).
 *
 * `BILLING_MODE=manual` (or `dev`): when Stripe is **not** configured, checkout applies plans
 * locally for UAT. When `STRIPE_SECRET_KEY` is set, card checkout still uses Stripe so both
 * card and offline (JazzCash / bank) paths work together.
 *
 * `BILLING_MODE=stripe` (or unset; default): Stripe Checkout + webhooks for card subscriptions.
 * Offline owner submit + admin approval always remains available regardless of mode.
 *
 * Crypto (NOWPayments) remains available via `/api/billing/crypto/*` when `NOWPAYMENTS_API_KEY` is set.
 */
export function getBillingMode() {
  return (process.env.BILLING_MODE || 'stripe').toLowerCase().trim();
}

export function isManualBillingMode() {
  return getBillingMode() === 'manual' || getBillingMode() === 'dev';
}

export function isStripeCheckoutEnabled() {
  return Boolean(String(process.env.STRIPE_SECRET_KEY || '').trim());
}

/**
 * Dev-only instant plan apply (no Stripe). Skipped when Stripe keys are present so card + offline both work.
 */
export function shouldUseDevInstantBilling() {
  return isManualBillingMode() && !isStripeCheckoutEnabled();
}

export function isStripeBillingMode() {
  return isStripeCheckoutEnabled() || !isManualBillingMode();
}
