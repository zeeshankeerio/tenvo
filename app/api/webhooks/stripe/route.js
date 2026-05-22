import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import pool from '@/lib/db';
import { sendSubscriptionConfirmationEmail } from '@/lib/email/subscription-emails';

// Stripe instance for webhook verification
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request) {
  if (!stripe || !webhookSecret) {
    console.log('[Stripe Webhook] Not configured');
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  console.log('[Stripe Webhook] Event received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      }

      case 'invoice.payment_succeeded': {
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      }

      case 'invoice.payment_failed': {
        await handleInvoicePaymentFailed(event.data.object);
        break;
      }

      case 'customer.subscription.created': {
        await handleSubscriptionCreated(event.data.object);
        break;
      }

      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event.data.object);
        break;
      }

      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        await handleTrialWillEnd(event.data.object);
        break;
      }

      // Payment Intent Events for Storefront
      case 'payment_intent.succeeded': {
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      }

      case 'payment_intent.payment_failed': {
        await handlePaymentIntentFailed(event.data.object);
        break;
      }

      case 'payment_intent.created': {
        await handlePaymentIntentCreated(event.data.object);
        break;
      }

      // Account Events for Stripe Connect
      case 'account.updated': {
        await handleAccountUpdated(event.data.object);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Stripe Webhook] Handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed
 */
async function handleCheckoutSessionCompleted(session) {
  const { businessId, planTier } = session.metadata || {};
  
  if (!businessId || !planTier) {
    console.error('[Stripe Webhook] Missing metadata in checkout session');
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Update business subscription
    await client.query(
      `UPDATE businesses 
       SET current_plan = $1,
           subscription_status = 'active',
           stripe_subscription_id = $2,
           subscription_start_date = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [planTier, session.subscription, businessId]
    );

    // Record subscription history
    await client.query(
      `INSERT INTO subscription_history 
       (business_id, plan_tier, stripe_subscription_id, status, amount_paid, currency, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [businessId, planTier, session.subscription, 'active', session.amount_total / 100, session.currency]
    );

    await client.query('COMMIT');

    // Send confirmation email
    const businessResult = await pool.query(
      'SELECT email, business_name FROM businesses WHERE id = $1',
      [businessId]
    );

    if (businessResult.rows.length > 0) {
      const business = businessResult.rows[0];
      sendSubscriptionConfirmationEmail({
        to: business.email,
        businessName: business.business_name,
        planTier,
      }).catch(console.error);
    }

    console.log('[Stripe Webhook] Checkout completed for business:', businessId);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Handle invoice.payment_succeeded
 */
async function handleInvoicePaymentSucceeded(invoice) {
  const subscriptionId = invoice.subscription;
  
  if (!subscriptionId) return;

  try {
    await pool.query(
      `UPDATE businesses 
       SET subscription_status = 'active',
           last_payment_date = NOW(),
           updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [subscriptionId]
    );

    console.log('[Stripe Webhook] Payment succeeded for subscription:', subscriptionId);
  } catch (error) {
    console.error('[Stripe Webhook] Payment success handler error:', error);
  }
}

/**
 * Handle invoice.payment_failed
 */
async function handleInvoicePaymentFailed(invoice) {
  const subscriptionId = invoice.subscription;
  
  if (!subscriptionId) return;

  try {
    const result = await pool.query(
      `UPDATE businesses 
       SET subscription_status = 'past_due',
           updated_at = NOW()
       WHERE stripe_subscription_id = $1
       RETURNING email, business_name`,
      [subscriptionId]
    );

    if (result.rows.length > 0) {
      const business = result.rows[0];
      
      // Send payment failed notification
      const { sendPaymentFailedEmail } = await import('@/lib/email/subscription-emails');
      sendPaymentFailedEmail({
        to: business.email,
        businessName: business.business_name,
        invoiceUrl: invoice.hosted_invoice_url,
      }).catch(console.error);
    }

    console.log('[Stripe Webhook] Payment failed for subscription:', subscriptionId);
  } catch (error) {
    console.error('[Stripe Webhook] Payment failed handler error:', error);
  }
}

/**
 * Handle customer.subscription.created
 */
async function handleSubscriptionCreated(subscription) {
  console.log('[Stripe Webhook] Subscription created:', subscription.id);
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription) {
  const { businessId } = subscription.metadata || {};
  
  if (!businessId) return;

  try {
    await pool.query(
      `UPDATE businesses 
       SET subscription_status = $1,
           current_plan = $2,
           updated_at = NOW()
       WHERE stripe_subscription_id = $3`,
      [subscription.status, subscription.metadata?.planTier || 'unknown', subscription.id]
    );

    console.log('[Stripe Webhook] Subscription updated:', subscription.id);
  } catch (error) {
    console.error('[Stripe Webhook] Subscription update handler error:', error);
  }
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription) {
  try {
    const result = await pool.query(
      `UPDATE businesses 
       SET subscription_status = 'cancelled',
           current_plan = 'free',
           stripe_subscription_id = NULL,
           updated_at = NOW()
       WHERE stripe_subscription_id = $1
       RETURNING email, business_name`,
      [subscription.id]
    );

    if (result.rows.length > 0) {
      const business = result.rows[0];
      
      // Send cancellation email
      const { sendSubscriptionCancelledEmail } = await import('@/lib/email/subscription-emails');
      sendSubscriptionCancelledEmail({
        to: business.email,
        businessName: business.business_name,
      }).catch(console.error);
    }

    console.log('[Stripe Webhook] Subscription cancelled:', subscription.id);
  } catch (error) {
    console.error('[Stripe Webhook] Subscription deletion handler error:', error);
  }
}

/**
 * Handle customer.subscription.trial_will_end
 */
async function handleTrialWillEnd(subscription) {
  try {
    const result = await pool.query(
      `SELECT email, business_name 
       FROM businesses 
       WHERE stripe_subscription_id = $1`,
      [subscription.id]
    );

    if (result.rows.length > 0) {
      const business = result.rows[0];
      
      // Send trial ending reminder
      const { sendTrialEndingEmail } = await import('@/lib/email/subscription-emails');
      sendTrialEndingEmail({
        to: business.email,
        businessName: business.business_name,
        daysLeft: 3,
      }).catch(console.error);
    }

    console.log('[Stripe Webhook] Trial ending soon for:', subscription.id);
  } catch (error) {
    console.error('[Stripe Webhook] Trial ending handler error:', error);
  }
}

/**
 * Handle payment_intent.succeeded
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  const client = await pool.connect();
  
  try {
    const { orderId, businessId } = paymentIntent.metadata || {};
    
    if (!orderId || !businessId) {
      console.error('[Stripe Webhook] Missing metadata in payment intent');
      return;
    }

    await client.query('BEGIN');

    // Update transaction status
    await client.query(
      `UPDATE payment_transactions 
       SET status = 'completed', 
           provider_response = $1,
           completed_at = NOW(),
           updated_at = NOW(),
           card_last_four = $2,
           card_brand = $3
       WHERE stripe_payment_intent_id = $4`,
      [
        JSON.stringify(paymentIntent),
        paymentIntent.charges?.data?.[0]?.payment_method_details?.card?.last4 || null,
        paymentIntent.charges?.data?.[0]?.payment_method_details?.card?.brand || null,
        paymentIntent.id,
      ]
    );

    // Update order status
    await client.query(
      `UPDATE orders 
       SET payment_status = 'paid',
           order_status = 'confirmed',
           updated_at = NOW()
       WHERE id = $1::uuid AND business_id = $2::uuid`,
      [orderId, businessId]
    );

    await client.query('COMMIT');

    // Send order confirmation email
    const orderResult = await pool.query(
      `SELECT o.*, b.email as business_email, b.business_name 
       FROM orders o 
       JOIN businesses b ON o.business_id = b.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length > 0) {
      const order = orderResult.rows[0];
      const { sendOrderConfirmationEmail } = await import('@/lib/email/resend');
      sendOrderConfirmationEmail({
        to: order.customer_email,
        order: order,
        business: {
          name: order.business_name,
          email: order.business_email,
        },
      }).catch(console.error);
    }

    console.log('[Stripe Webhook] Payment succeeded for order:', orderId);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Stripe Webhook] Payment success handler error:', error);
  } finally {
    client.release();
  }
}

/**
 * Handle payment_intent.payment_failed
 */
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    const { orderId } = paymentIntent.metadata || {};
    
    if (!orderId) {
      console.error('[Stripe Webhook] Missing orderId in payment intent');
      return;
    }

    await pool.query(
      `UPDATE payment_transactions 
       SET status = 'failed', 
           error_message = $1,
           provider_response = $2,
           updated_at = NOW()
       WHERE stripe_payment_intent_id = $3`,
      [
        paymentIntent.last_payment_error?.message || 'Payment failed',
        JSON.stringify(paymentIntent),
        paymentIntent.id,
      ]
    );

    // Update order status
    await pool.query(
      `UPDATE orders 
       SET payment_status = 'failed',
           updated_at = NOW()
       WHERE id = $1::uuid`,
      [orderId]
    );

    console.log('[Stripe Webhook] Payment failed for order:', orderId);

  } catch (error) {
    console.error('[Stripe Webhook] Payment failed handler error:', error);
  }
}

/**
 * Handle payment_intent.created
 */
async function handlePaymentIntentCreated(paymentIntent) {
  console.log('[Stripe Webhook] Payment intent created:', paymentIntent.id);
}

/**
 * Handle account.updated (Stripe Connect)
 */
async function handleAccountUpdated(account) {
  try {
    // Update Stripe Connect account status
    await pool.query(
      `UPDATE stripe_connect_accounts 
       SET is_charges_enabled = $1,
           is_payouts_enabled = $2,
           requirements_due = $3,
           card_payments_enabled = $4,
           transfers_enabled = $5,
           onboarding_complete = $6,
           updated_at = NOW()
       WHERE stripe_account_id = $7`,
      [
        account.charges_enabled,
        account.payouts_enabled,
        JSON.stringify(account.requirements?.currently_due || []),
        account.capabilities?.card_payments === 'active',
        account.capabilities?.transfers === 'active',
        account.charges_enabled && account.payouts_enabled,
        account.id,
      ]
    );

    console.log('[Stripe Webhook] Account updated:', account.id);

  } catch (error) {
    console.error('[Stripe Webhook] Account update handler error:', error);
  }
}
