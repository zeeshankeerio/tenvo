import Stripe from 'stripe';

// Lazy initialization of Stripe
let stripeInstance = null;

function getStripe() {
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
  trialDays = 14,
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
 * Create a checkout session for plan upgrade
 */
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata = {},
}) {
  const stripe = getStripe();
  if (!stripe) {
    console.log('[Stripe] Not configured, skipping checkout session');
    return { id: null, skipped: true, url: null };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...metadata,
        platform: 'tenvo',
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          ...metadata,
          platform: 'tenvo',
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
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
export async function updateSubscription(subscriptionId, { newPriceId, prorationBehavior = 'create_prorations' }) {
  const stripe = getStripe();
  if (!stripe) {
    console.log('[Stripe] Not configured, skipping update');
    return { updated: false, skipped: true };
  }

  try {
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentItemId = subscription.items.data[0].id;

    // Update subscription item with new price
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: currentItemId,
          price: newPriceId,
        },
      ],
      proration_behavior: prorationBehavior,
    });

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

// Price IDs mapping for plans (these should be created in your Stripe Dashboard)
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
 * Get Stripe price ID for a plan tier and currency
 */
export function getPriceIdForPlan(planTier, currency = 'pkr') {
  const key = `${planTier}_monthly_${currency.toLowerCase()}`;
  return STRIPE_PRICE_IDS[key] || null;
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
};
