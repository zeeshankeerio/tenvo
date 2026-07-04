/**
 * Storefront checkout payment eligibility — COD default, Stripe/Crypto only when configured.
 */

import { isNowPaymentsConfigured } from '@/lib/payments/nowpayments';

export const STOREFRONT_COD_METHOD = {
  id: 'cod-default',
  provider: 'cod',
  display_name: 'Cash on Delivery (COD)',
  description: 'Pay when your order is delivered',
  supports_cod: true,
  fee_percentage: 0,
  fee_fixed: 0,
};

/** Platform Stripe keys present (Connect + Elements). */
export function isPlatformStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()
  );
}

/** Platform NOWPayments API key present. */
export function isPlatformCryptoConfigured() {
  return isNowPaymentsConfigured();
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 */
export async function loadStorefrontPaymentContext(client, businessId) {
  const [methodsRes, stripeRes, settingsRes] = await Promise.all([
    client.query(
      `SELECT id, provider, display_name, description, icon_url,
              supports_cod, supports_cards, supports_wallet, supports_bank_transfer,
              fee_percentage, fee_fixed, is_active, is_default, sort_order
       FROM business_payment_methods
       WHERE business_id = $1::uuid AND is_active = true
       ORDER BY is_default DESC, sort_order ASC NULLS LAST`,
      [businessId]
    ),
    client.query(
      `SELECT stripe_account_id, is_charges_enabled, is_details_submitted
       FROM stripe_connect_accounts
       WHERE business_id = $1::uuid
       LIMIT 1`,
      [businessId]
    ),
    client.query(
      `SELECT allow_cod, allow_prepaid FROM store_payment_settings WHERE business_id = $1::uuid`,
      [businessId]
    ),
  ]);

  return {
    methods: methodsRes.rows || [],
    stripeConnect: stripeRes.rows[0] || null,
    settings: settingsRes.rows[0] || null,
  };
}

/**
 * @param {{
 *   methods: Array<Record<string, unknown>>,
 *   stripeConnect: Record<string, unknown> | null,
 *   settings: Record<string, unknown> | null,
 * }} context
 */
export function resolveEligibleStorefrontPaymentMethods(context) {
  const { methods, stripeConnect, settings } = context;
  const allowCod = settings?.allow_cod !== false;

  const stripeReady =
    isPlatformStripeConfigured() &&
    Boolean(stripeConnect?.is_charges_enabled) &&
    methods.some((m) => m.provider === 'stripe');

  const cryptoReady =
    isPlatformCryptoConfigured() && methods.some((m) => m.provider === 'crypto');

  const eligible = [];

  for (const method of methods) {
    if (method.provider === 'stripe' && !stripeReady) continue;
    if (method.provider === 'crypto' && !cryptoReady) continue;
    eligible.push(method);
  }

  if (allowCod && !eligible.some((m) => m.provider === 'cod')) {
    eligible.unshift({ ...STOREFRONT_COD_METHOD, is_default: true });
  }

  if (eligible.length === 0) {
    eligible.push({ ...STOREFRONT_COD_METHOD, is_default: true });
  }

  eligible.sort((a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (b.is_default && !a.is_default) return 1;
    if (a.provider === 'cod') return -1;
    if (b.provider === 'cod') return 1;
    return Number(a.sort_order || 0) - Number(b.sort_order || 0);
  });

  return eligible;
}

/**
 * Pick a safe payment method for checkout. Falls back to COD when requested provider is unavailable.
 * @param {string | undefined | null} requested
 * @param {Array<{ provider: string }>} eligible
 */
export function coerceStorefrontPaymentMethod(requested, eligible) {
  const normalized = String(requested || '').trim().toLowerCase();
  const providers = new Set(eligible.map((m) => m.provider));
  if (normalized && providers.has(normalized)) return normalized;
  return eligible.find((m) => m.provider === 'cod')?.provider || eligible[0]?.provider || 'cod';
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string} provider
 */
export async function isStorefrontPaymentProviderReady(client, businessId, provider) {
  const ctx = await loadStorefrontPaymentContext(client, businessId);
  const eligible = resolveEligibleStorefrontPaymentMethods(ctx);
  return eligible.some((m) => m.provider === provider);
}

export function getPlatformPaymentCapabilities() {
  return {
    stripePlatform: isPlatformStripeConfigured(),
    cryptoPlatform: isPlatformCryptoConfigured(),
  };
}
