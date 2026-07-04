import pool from '@/lib/db';
import Stripe from 'stripe';
import {
  isPlatformStripeConfigured,
  isStorefrontPaymentProviderReady,
} from '@/lib/storefront/storefrontPaymentEligibility';

let _stripe = null;

function getStripe() {
  if (!_stripe && process.env.STRIPE_SECRET_KEY) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
  }
  return _stripe;
}

/**
 * Create (or reuse) a Stripe PaymentIntent for a storefront order awaiting card payment.
 * @param {{ business: { id: string, business_name?: string }, orderNumber: string, customerEmail?: string }} params
 */
export async function createStorefrontStripePaymentIntent({ business, orderNumber, customerEmail }) {
  if (!isPlatformStripeConfigured()) {
    return { ok: false, status: 503, error: 'Card payments are not configured on this platform.' };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, status: 503, error: 'Card payments are not configured on this platform.' };
  }

  const client = await pool.connect();
  try {
    const stripeReady = await isStorefrontPaymentProviderReady(client, business.id, 'stripe');
    if (!stripeReady) {
      return {
        ok: false,
        status: 400,
        error: 'This store has not enabled card payments. Please choose Cash on Delivery.',
      };
    }

    const orderRes = await client.query(
      `SELECT id, order_number, total_amount, currency, customer_email, payment_status, metadata
       FROM storefront_orders
       WHERE business_id = $1::uuid AND order_number = $2
       LIMIT 1`,
      [business.id, orderNumber]
    );
    const order = orderRes.rows[0];
    if (!order) {
      return { ok: false, status: 404, error: 'Order not found' };
    }

    if (customerEmail && order.customer_email?.toLowerCase() !== customerEmail.toLowerCase()) {
      return { ok: false, status: 403, error: 'Order does not match this email address' };
    }

    if (order.payment_status === 'paid') {
      return { ok: false, status: 409, error: 'Order is already paid', code: 'ALREADY_PAID' };
    }

    const meta = order.metadata && typeof order.metadata === 'object' ? order.metadata : {};
    if (meta.payment_method && meta.payment_method !== 'stripe') {
      return { ok: false, status: 400, error: 'Order was not created for card payment' };
    }

    const existingIntentId = meta.stripe?.payment_intent_id;
    if (existingIntentId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(existingIntentId);
        if (existing.status === 'succeeded') {
          return { ok: false, status: 409, error: 'Order is already paid', code: 'ALREADY_PAID' };
        }
        if (existing.client_secret && !['canceled', 'failed'].includes(existing.status)) {
          return {
            ok: true,
            clientSecret: existing.client_secret,
            paymentIntentId: existing.id,
            reused: true,
          };
        }
      } catch {
        /* create fresh intent below */
      }
    }

    const stripeAccountRes = await client.query(
      `SELECT stripe_account_id FROM stripe_connect_accounts
       WHERE business_id = $1::uuid AND is_charges_enabled = true
       LIMIT 1`,
      [business.id]
    );
    const stripeAccountId = stripeAccountRes.rows[0]?.stripe_account_id;
    if (!stripeAccountId) {
      return {
        ok: false,
        status: 400,
        error: 'Card payments are not ready for this store. Please use Cash on Delivery.',
      };
    }

    const amount = parseFloat(String(order.total_amount || '0'));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, status: 400, error: 'Invalid order total' };
    }

    const currency = String(order.currency || 'PKR').toLowerCase();
    const amountMinor = Math.round(amount * 100);
    const applicationFee = Math.round(amountMinor * 0.025);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountMinor,
      currency,
      automatic_payment_methods: { enabled: true },
      application_fee_amount: applicationFee,
      transfer_data: { destination: stripeAccountId },
      metadata: {
        orderId: String(order.id),
        businessId: business.id,
        orderNumber: order.order_number,
        source: 'storefront',
      },
      receipt_email: order.customer_email || customerEmail || undefined,
      description: `${business.business_name || 'Store'} order ${order.order_number}`,
    });

    const existingTx = await client.query(
      `SELECT id FROM payment_transactions
       WHERE stripe_payment_intent_id = $1 AND business_id = $2::uuid
       LIMIT 1`,
      [paymentIntent.id, business.id]
    );
    if (existingTx.rows.length === 0) {
      await client.query(
        `INSERT INTO payment_transactions (
          order_id, business_id, provider, stripe_payment_intent_id,
          amount, currency, status, created_at
        ) VALUES ($1, $2::uuid, 'stripe', $3, $4, $5, 'pending', NOW())`,
        [order.id, business.id, paymentIntent.id, amount, order.currency || 'PKR']
      );
    }

    const nextMeta = {
      ...meta,
      stripe: {
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
      },
    };
    await client.query(
      `UPDATE storefront_orders SET metadata = $1::jsonb, updated_at = NOW()
       WHERE id = $2 AND business_id = $3::uuid`,
      [JSON.stringify(nextMeta), order.id, business.id]
    );

    return {
      ok: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      reused: false,
    };
  } finally {
    client.release();
  }
}
