import Stripe from 'stripe';
import { resolvePlanTier } from '@/lib/config/plans';
import { TRIAL_CONFIG } from '@/lib/config/platform';

// Lazy initialization of Stripe
let stripeInstance = null;

export function getStripe() {
  if (!stripeInstance && process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
  }
  return stripeInstance;
}

/**
 * Create a Stripe customer for a business
 */
export async function createCustomer({ email, name, metadata = {} }) {
  const stripe = getStripe();
  if (!stripe) {
    console.log('[Stripe] Not configured, skipping customer creation');
    return { id: null, skipped: true };
  }

  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        ...metadata,
        platform: 'tenvo',
      },
    });

    return { id: customer.id, customer };
  } catch (error) {
    console.error('[Stripe] Create customer error:', error);
    throw error;
  }
}

/**
 * Create a subscription for a business
 */
export async function createSubscription({
  customerId,
  priceId,
  trialDays = TRIAL_CONFIG.durationDays,
  metadata = {},
}) {
  const stripe = getStripe();
  if (!stripe) {
    console.log('[Stripe] Not configured, skipping subscription creation');
    return { id: null, skipped: true };
  }

  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: trialDays,
      metadata: {
        ...metadata,
        platform: 'tenvo',
      },
      automatic_tax: { enabled: true },
      collection_method: 'charge_automatically',
    });

    return { id: subscription.id, subscription };
  } catch (error) {
    console.error('[Stripe] Create subscription error:', error);
    throw error;
  }
}

/**
 * Create a checkout session for plan upgrade (dynamic `price_data` from catalog).
 * @param {{ customerId: string, lineItem: object, successUrl: string, cancelUrl: string, metadata?: object }} params
 */
export async function createCheckoutSession({
  customerId,
  lineItem,
  successUrl,
  cancelUrl,
  metadata = {},
}) {
  const stripe = getStripe();
  if (!stripe) {
    console.log('[Stripe] Not configured, skipping checkout session');
    return { id: null, skipped: true, url: null };
  }

  if (!lineItem || typeof lineItem !== 'object') {
    throw new Error('Checkout line item is required');
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [lineItem],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...metadata,
        platform: 'tenvo',
      },
      subscription_data: {
        trial_period_days: TRIAL_CONFIG.durationDays,
        metadata: {
          ...metadata,
          platform: 'tenvo',
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      // Required when reusing an existing Stripe customer with tax ID collection enabled.
      customer_update: { name: 'auto', address: 'auto' },
      ...(process.env.STRIPE_AUTOMATIC_TAX === 'true'
        ? { automatic_tax: { enabled: true } }
        : {}),
    });

    return { id: session.id, url: session.url };
  } catch (error) {
    console.error('[Stripe] Create checkout session error:', error);
    throw error;
  }
}

/**
 * Create a billing portal session for customer management
 */
export async function createBillingPortalSession({ customerId, returnUrl }) {
  const stripe = getStripe();
  if (!stripe) {
    console.log('[Stripe] Not configured, skipping portal session');
    return { id: null, skipped: true, url: null };
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { id: session.id, url: session.url };
  } catch (error) {
    console.error('[Stripe] Create billing portal session error:', error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId, { cancelAtPeriodEnd = true } = {}) {
  const stripe = getStripe();
  if (!stripe) {
    console.log('[Stripe] Not configured, skipping cancellation');
    return { cancelled: false, skipped: true };
  }

  try {
    if (cancelAtPeriodEnd) {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return { cancelled: true, atPeriodEnd: true, subscription };
    } else {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return { cancelled: true, atPeriodEnd: false, subscription };
    }
  } catch (error) {
    console.error('[Stripe] Cancel subscription error:', error);
    throw error;
  }
}

/**
 * Update subscription (upgrade/downgrade)
 */
export async function updateSubscription(
  subscriptionId,
  { newPriceId, prorationBehavior = 'create_prorations', metadata: metadataPatch } = {}
) {
  const stripe = getStripe();
  if (!stripe) {
    console.log('[Stripe] Not configured, skipping update');
    return { updated: false, skipped: true };
  }

  try {
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const firstItem = subscription.items?.data?.[0];
    if (!firstItem?.id) {
      throw new Error('Subscription has no billable items to update');
    }

    const payload = {
      items: [
        {
          id: firstItem.id,
          price: newPriceId,
        },
      ],
      proration_behavior: prorationBehavior,
    };

    if (metadataPatch && typeof metadataPatch === 'object') {
      const merged = { ...(subscription.metadata || {}) };
      for (const [k, v] of Object.entries(metadataPatch)) {
        if (v === undefined || v === null) continue;
        merged[k] = String(v);
      }
      payload.metadata = merged;
    }

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, payload);

    return { updated: true, subscription: updatedSubscription };
  } catch (error) {
    console.error('[Stripe] Update subscription error:', error);
    throw error;
  }
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId) {
  const stripe = getStripe();
  if (!stripe) {
    return null;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('[Stripe] Get subscription error:', error);
    return null;
  }
}

/**
 * List Stripe Billing invoices for the SaaS customer (not AR invoices in Postgres).
 * @param {string} customerId
 * @param {number} [limit]
 */
export async function listStripeCustomerInvoices(customerId, limit = 12) {
  const stripe = getStripe();
  if (!stripe || !customerId) {
    return [];
  }
  try {
    const list = await stripe.invoices.list({
      customer: customerId,
      limit,
    });
    return list.data.map((inv) => ({
      id: inv.id,
      invoice_number: inv.number,
      amount_due: inv.amount_due,
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      period_start: inv.period_start,
      period_end: inv.period_end,
      paid_at: inv.status_transitions?.paid_at ?? null,
      hosted_invoice_url: inv.hosted_invoice_url,
      created_at: inv.created,
    }));
  } catch (error) {
    console.error('[Stripe] List invoices error:', error);
    return [];
  }
}

/**
 * List customer subscriptions
 */
export async function listCustomerSubscriptions(customerId) {
  const stripe = getStripe();
  if (!stripe) {
    return [];
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
    });
    return subscriptions.data;
  } catch (error) {
    console.error('[Stripe] List subscriptions error:', error);
    return [];
  }
}

// Legacy dashboard Price IDs — optional fallback only; prefer `lib/payments/stripeCatalog.js`.
export const STRIPE_PRICE_IDS = {
  // Pakistan pricing
  starter_monthly_pkr: process.env.STRIPE_PRICE_STARTER_MONTHLY_PKR,
  growth_monthly_pkr: process.env.STRIPE_PRICE_GROWTH_MONTHLY_PKR,
  professional_monthly_pkr: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY_PKR,
  business_monthly_pkr: process.env.STRIPE_PRICE_BUSINESS_MONTHLY_PKR,
  
  // USD pricing (international)
  starter_monthly_usd: process.env.STRIPE_PRICE_STARTER_MONTHLY_USD,
  growth_monthly_usd: process.env.STRIPE_PRICE_GROWTH_MONTHLY_USD,
  professional_monthly_usd: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY_USD,
  business_monthly_usd: process.env.STRIPE_PRICE_BUSINESS_MONTHLY_USD,
};

/**
 * @deprecated Prefer `resolveBillingCatalogItem` + `ensureStripePriceForCatalogItem`.
 * Returns env-configured Price ID when present (legacy deployments).
 */
export function getPriceIdForPlan(planTier, currency = 'pkr') {
  const cur = currency.toLowerCase();
  const resolved = resolvePlanTier(planTier);
  const key = `${resolved}_monthly_${cur}`;
  const primary = STRIPE_PRICE_IDS[key];
  if (primary) return primary;
  // Backward compat: older env used STRIPE_PRICE_GROWTH_* for the mid tier.
  if (resolved === 'professional') {
    const legacy = STRIPE_PRICE_IDS[`growth_monthly_${cur}`];
    if (legacy) return legacy;
  }
  return null;
}

export default {
  createCustomer,
  createSubscription,
  createCheckoutSession,
  createBillingPortalSession,
  cancelSubscription,
  updateSubscription,
  getSubscription,
  listStripeCustomerInvoices,
  listCustomerSubscriptions,
  getPriceIdForPlan,
  getStripe,
};
