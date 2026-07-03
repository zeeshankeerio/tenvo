/**
 * Code-driven SaaS billing catalog for Stripe — amounts from `PLAN_TIERS` and
 * `DOMAIN_PACKAGES`, not dashboard Price IDs or STRIPE_PRICE_* env vars.
 *
 * Checkout uses `price_data` (Stripe-recommended for dynamic subscriptions).
 * Plan changes reuse Prices via stable `lookup_key` values derived from catalog keys.
 */

import { PLAN_TIERS, getPlanListPrice, resolvePlanTier } from '@/lib/config/plans';
import { getDomainPackage } from '@/lib/config/domainPackages';

/** Currencies we sell SaaS subscriptions in today. */
export const BILLING_CURRENCIES = Object.freeze(['pkr', 'usd']);

/**
 * @param {string | null | undefined} currency
 * @returns {'pkr' | 'usd'}
 */
export function normalizeBillingCurrency(currency) {
  const c = String(currency || 'pkr').toLowerCase().trim();
  return c === 'usd' ? 'usd' : 'pkr';
}

/**
 * Stripe amounts are in the smallest currency unit (e.g. cents, paisa).
 * @param {number} majorUnitAmount
 * @param {string} currency
 */
export function toStripeMinorUnits(majorUnitAmount, currency) {
  const amount = Number(majorUnitAmount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Invalid billing amount');
  }
  const cur = normalizeBillingCurrency(currency);
  // PKR and USD both use 2 decimal minor units in Stripe.
  return Math.round(amount * 100);
}

/**
 * @typedef {Object} BillingCatalogItem
 * @property {'plan' | 'domain_package'} kind
 * @property {string} planTier
 * @property {string | null} domainPackageKey
 * @property {string} currency
 * @property {number} unitAmountMinor
 * @property {string} productName
 * @property {string} [description]
 * @property {string} lookupKey
 * @property {Record<string, string>} metadata
 */

/**
 * Resolve a billable catalog row from in-app plan config or a domain package SKU.
 *
 * @param {{
 *   planTier?: string | null,
 *   domainPackageKey?: string | null,
 *   currency?: string,
 *   interval?: 'monthly' | 'yearly',
 * }} params
 * @returns {BillingCatalogItem | null}
 */
export function resolveBillingCatalogItem({
  planTier,
  domainPackageKey,
  currency = 'pkr',
  interval = 'monthly',
}) {
  const cur = normalizeBillingCurrency(currency);
  const stripeCurrency = cur;
  const packageKey =
    typeof domainPackageKey === 'string' && domainPackageKey.trim()
      ? domainPackageKey.trim()
      : null;

  if (packageKey) {
    const pkg = getDomainPackage(packageKey);
    if (!pkg) return null;
    const tier = resolvePlanTier(pkg.recommendedPlanTier);
    const major =
      cur === 'usd' ? pkg.pricing.price_usd : pkg.pricing.price_pkr;
    if (!major || major <= 0) return null;
    return {
      kind: 'domain_package',
      planTier: tier,
      domainPackageKey: packageKey,
      currency: stripeCurrency,
      unitAmountMinor: toStripeMinorUnits(major, stripeCurrency),
      productName: `Tenvo ${pkg.name}`,
      description: pkg.tagline,
      lookupKey: `tenvo_pkg_${packageKey}_${interval}_${stripeCurrency}`,
      metadata: {
        billingKind: 'domain_package',
        domainPackageKey: packageKey,
        planTier: tier,
        catalogInterval: interval,
        catalogCurrency: stripeCurrency,
        catalogVersion: '1',
        platform: 'tenvo',
      },
    };
  }

  const tier = resolvePlanTier(planTier || '');
  if (!tier || tier === 'free' || tier === 'enterprise') return null;
  if (!PLAN_TIERS[tier]) return null;

  const listPrice = getPlanListPrice(tier, { interval });
  const major = cur === 'usd' ? listPrice.usd : listPrice.pkr;
  if (!major || major <= 0) return null;

  const planName = PLAN_TIERS[tier].name || tier;
  return {
    kind: 'plan',
    planTier: tier,
    domainPackageKey: null,
    currency: stripeCurrency,
    unitAmountMinor: toStripeMinorUnits(major, stripeCurrency),
    productName: `Tenvo ${planName} Plan`,
    description: PLAN_TIERS[tier].tagline || PLAN_TIERS[tier].description || '',
    lookupKey: `tenvo_plan_${tier}_${interval}_${stripeCurrency}`,
    metadata: {
      billingKind: 'plan',
      planTier: tier,
      catalogInterval: interval,
      catalogCurrency: stripeCurrency,
      catalogVersion: '1',
      platform: 'tenvo',
    },
  };
}

/**
 * Checkout Session line item using inline `price_data` (no pre-created Price ID).
 * @param {BillingCatalogItem} item
 */
export function buildCheckoutLineItemFromCatalog(item) {
  return {
    quantity: 1,
    price_data: {
      currency: item.currency,
      unit_amount: item.unitAmountMinor,
      recurring: { interval: 'month' },
      product_data: {
        name: item.productName,
        ...(item.description ? { description: item.description.slice(0, 500) } : {}),
        metadata: item.metadata,
      },
    },
  };
}

/**
 * Create or reuse a Stripe Price for subscription updates (lookup_key from catalog).
 * @param {import('stripe').Stripe} stripe
 * @param {BillingCatalogItem} item
 * @returns {Promise<string>} Stripe Price ID
 */
export async function ensureStripePriceForCatalogItem(stripe, item) {
  const lookupKey = item.lookupKey;

  try {
    const listed = await stripe.prices.list({
      lookup_keys: [lookupKey],
      limit: 1,
      active: true,
    });
    const existing = listed.data?.[0];
    if (
      existing &&
      existing.unit_amount === item.unitAmountMinor &&
      existing.currency === item.currency
    ) {
      return existing.id;
    }
  } catch (err) {
    console.warn('[Stripe Catalog] lookup_key list failed, creating price:', err?.message || err);
  }

  const created = await stripe.prices.create({
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    currency: item.currency,
    unit_amount: item.unitAmountMinor,
    recurring: { interval: 'month' },
    product_data: {
      name: item.productName,
      ...(item.description ? { description: item.description.slice(0, 500) } : {}),
      metadata: item.metadata,
    },
    metadata: item.metadata,
  });

  return created.id;
}

/**
 * Metadata persisted on Checkout Session + Subscription for webhooks.
 * @param {BillingCatalogItem} item
 * @param {{ businessId: string }} ctx
 */
export function buildCheckoutSessionMetadata(item, { businessId }) {
  return {
    businessId: String(businessId),
    planTier: item.planTier,
    currency: item.currency,
    billingKind: item.kind,
    catalogLookupKey: item.lookupKey,
    ...(item.domainPackageKey ? { domainPackageKey: item.domainPackageKey } : {}),
  };
}
