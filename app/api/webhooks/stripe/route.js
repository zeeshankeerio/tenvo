export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { prismaBase } from '@/lib/db';
import { sendSubscriptionConfirmationEmail } from '@/lib/email/subscription-emails';
import { resolvePlanTier } from '@/lib/config/plans';
import {
  getBillingActivationPayload,
  mergeBusinessSettingsForBilling,
} from '@/lib/payments/billingActivation';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/stripe
 */
export async function POST(request) {
  if (!stripe || !webhookSecret) {
    console.error('[Stripe Webhook] Not configured, set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET');
    return NextResponse.json(
      { error: 'Stripe webhook not configured' },
      { status: 503 }
    );
  }

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[Stripe Webhook] Event received:', event.type);

  let subscriptionDeletedEmails = null;
  let storefrontOrderPaidHook = null;

  try {
    await prismaBase.$transaction(
      async (tx) => {
        await tx.stripe_webhook_events.create({
          data: {
            stripe_event_id: event.id,
            event_type: event.type,
            metadata: { livemode: event.livemode },
          },
        });

        switch (event.type) {
          case 'checkout.session.completed':
            await handleCheckoutSessionCompletedTx(tx, event.data.object);
            break;
          case 'checkout.session.expired':
            // No DB mutation needed — the checkout simply didn't complete.
            // Log for observability; the business row is unchanged.
            console.log('[Stripe Webhook] Checkout session expired:', event.data.object.id,
              '| business:', event.data.object.metadata?.businessId ?? 'unknown');
            break;
          case 'invoice.payment_succeeded':
            await handleInvoicePaymentSucceededTx(tx, event.data.object);
            break;
          case 'invoice.payment_failed':
            await handleInvoicePaymentFailedTx(tx, event.data.object);
            break;
          case 'customer.subscription.created':
            await handleSubscriptionCreatedTx(tx, event.data.object);
            break;
          case 'customer.subscription.updated':
            await handleSubscriptionUpdatedTx(tx, event.data.object);
            break;
          case 'customer.subscription.deleted':
            subscriptionDeletedEmails = await handleSubscriptionDeletedTx(tx, event.data.object);
            break;
          case 'customer.subscription.trial_will_end':
            await handleTrialWillEndTx(tx, event.data.object);
            break;
          case 'payment_intent.succeeded':
            storefrontOrderPaidHook = await handlePaymentIntentSucceededTx(tx, event.data.object);
            break;
          case 'payment_intent.payment_failed':
            await handlePaymentIntentFailedTx(tx, event.data.object);
            break;
          case 'payment_intent.created':
            console.log('[Stripe Webhook] Payment intent created:', event.data.object.id);
            break;
          case 'account.updated':
            await handleAccountUpdatedTx(tx, event.data.object);
            break;
          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
      },
      {
        maxWait: 10_000,
        timeout: 25_000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    if (subscriptionDeletedEmails?.length) {
      const { sendSubscriptionCancelledEmail } = await import('@/lib/email/subscription-emails');
      for (const m of subscriptionDeletedEmails) {
        sendSubscriptionCancelledEmail({
          to: m.to,
          businessName: m.businessName,
        }).catch(console.error);
      }
    }

    if (storefrontOrderPaidHook?.businessId && storefrontOrderPaidHook?.orderId) {
      const { onStorefrontOrderPaidAsync } = await import('@/lib/memberships/membershipOrderHooks');
      void onStorefrontOrderPaidAsync(
        storefrontOrderPaidHook.businessId,
        storefrontOrderPaidHook.orderId
      );
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { businessId, planTier } = session.metadata || {};
      if (businessId && planTier) {
        const row = await prismaBase.businesses.findUnique({
          where: { id: businessId },
          select: { email: true, business_name: true },
        });
        if (row) {
          sendSubscriptionConfirmationEmail({
            to: row.email,
            businessName: row.business_name,
            planTier,
          }).catch(console.error);
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }
    console.error('[Stripe Webhook] Handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {import('stripe').Stripe.Checkout.Session} session
 */
async function handleCheckoutSessionCompletedTx(tx, session) {
  const { businessId, planTier, domainPackageKey } = session.metadata || {};
  if (!businessId || !planTier) {
    console.error('[Stripe Webhook] Missing metadata in checkout session');
    return;
  }

  const activation = getBillingActivationPayload({ planTier, domainPackageKey });
  if (!activation) {
    console.error('[Stripe Webhook] Invalid billing activation for checkout metadata:', {
      planTier,
      domainPackageKey,
    });
    return;
  }

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id || null;

  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id || null;

  const amountMinor =
    typeof session.amount_total === 'number' && session.amount_total != null
      ? session.amount_total
      : null;

  let stripeSub = null;
  if (stripe && subscriptionId) {
    try {
      stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
    } catch (e) {
      console.error('[Stripe Webhook] Could not retrieve subscription for checkout:', e?.message || e);
    }
  }

  let stripeStatus = stripeSub?.status || 'active';
  let planExpiresAt = null;
  if (stripeSub?.status === 'trialing' && stripeSub.trial_end) {
    planExpiresAt = new Date(stripeSub.trial_end * 1000);
  }

  const historyStatus = stripeStatus;

  const existing = await tx.businesses.findUnique({
    where: { id: businessId },
    select: { settings: true },
  });
  const nextSettings = mergeBusinessSettingsForBilling(
    existing?.settings,
    activation.settingsPatch
  );

  await tx.businesses.update({
    where: { id: businessId },
    data: {
      ...activation.quota,
      settings: nextSettings,
      stripe_subscription_id: subscriptionId,
      ...(customerId ? { stripe_customer_id: customerId } : {}),
      stripe_subscription_status: stripeStatus,
      plan_expires_at: planExpiresAt,
      updated_at: new Date(),
    },
  });

  await tx.subscription_history.create({
    data: {
      business_id: businessId,
      plan_tier: activation.quota.plan_tier,
      status: historyStatus,
      stripe_subscription_id: subscriptionId,
      amount_minor: amountMinor,
      currency: session.currency || null,
      metadata: {
        checkout_session_id: session.id,
        customer: customerId,
        stripe_subscription_status: stripeStatus,
        domainPackageKey: activation.domainPackageKey,
        billingKind: session.metadata?.billingKind || null,
      },
    },
  });

  console.log('[Stripe Webhook] Checkout completed for business:', businessId);
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {import('stripe').Stripe.Invoice} invoice
 */
async function handleInvoicePaymentSucceededTx(tx, invoice) {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id || null;
  if (!subscriptionId) return;

  // Retrieve the subscription metadata to re-apply quota on renewal / trial-to-paid conversion.
  // This ensures plan_seats and feature flags stay correct after each billing cycle.
  let quotaPatch = null;
  let settingsPatch = null;
  if (stripe) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const planFromMeta = sub.metadata?.planTier || sub.metadata?.plan_tier;
      const domainPackageKey = sub.metadata?.domainPackageKey || null;
      if (planFromMeta) {
        const activation = getBillingActivationPayload({ planTier: planFromMeta, domainPackageKey });
        if (activation) {
          quotaPatch = activation.quota;
          settingsPatch = activation.settingsPatch;
        }
      }
    } catch (e) {
      console.warn('[Stripe Webhook] Could not retrieve subscription for invoice.payment_succeeded:', e?.message);
    }
  }

  const rows = await tx.businesses.findMany({
    where: { stripe_subscription_id: subscriptionId },
    select: { id: true, settings: true },
  });

  for (const biz of rows) {
    const data = {
      stripe_subscription_status: 'active',
      plan_expires_at: null,
      updated_at: new Date(),
    };
    if (quotaPatch) Object.assign(data, quotaPatch);
    if (settingsPatch && Object.keys(settingsPatch).length) {
      data.settings = mergeBusinessSettingsForBilling(biz.settings, settingsPatch);
    }
    await tx.businesses.update({ where: { id: biz.id }, data });
  }

  console.log('[Stripe Webhook] Payment succeeded for subscription:', subscriptionId);
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {import('stripe').Stripe.Invoice} invoice
 */
async function handleInvoicePaymentFailedTx(tx, invoice) {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id || null;
  if (!subscriptionId) return;

  const updated = await tx.businesses.updateMany({
    where: { stripe_subscription_id: subscriptionId },
    data: {
      stripe_subscription_status: 'past_due',
      plan_expires_at: null,
      updated_at: new Date(),
    },
  });

  if (updated.count > 0) {
    const row = await tx.businesses.findFirst({
      where: { stripe_subscription_id: subscriptionId },
      select: { email: true, business_name: true },
    });
    if (row) {
      void import('@/lib/email/subscription-emails').then(({ sendPaymentFailedEmail }) =>
        sendPaymentFailedEmail({
          to: row.email,
          businessName: row.business_name,
          invoiceUrl: invoice.hosted_invoice_url,
        }).catch(console.error)
      );
    }
  }

  console.log('[Stripe Webhook] Payment failed for subscription:', subscriptionId);
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {import('stripe').Stripe.Subscription} subscription
 */
async function handleSubscriptionCreatedTx(tx, subscription) {
  const { businessId } = subscription.metadata || {};
  if (!businessId) {
    console.log('[Stripe Webhook] Subscription created (no business metadata):', subscription.id);
    return;
  }

  await tx.businesses.updateMany({
    where: { id: businessId },
    data: {
      stripe_subscription_id: subscription.id,
      stripe_subscription_status: subscription.status,
      ...(subscription.status === 'trialing' && subscription.trial_end
        ? { plan_expires_at: new Date(subscription.trial_end * 1000) }
        : { plan_expires_at: null }),
      updated_at: new Date(),
    },
  });
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {import('stripe').Stripe.Subscription} subscription
 */
async function handleSubscriptionUpdatedTx(tx, subscription) {
  const planFromMeta = subscription.metadata?.planTier || subscription.metadata?.plan_tier;
  const domainPackageKey = subscription.metadata?.domainPackageKey || null;

  // If metadata is missing (e.g., subscription was modified directly in Stripe dashboard),
  // we fall back to reading the plan from the current businesses row — no stale overwrites.
  const hasPlanMeta = planFromMeta && typeof planFromMeta === 'string';

  const activation =
    hasPlanMeta
      ? getBillingActivationPayload({ planTier: planFromMeta, domainPackageKey })
      : null;
  const quotaPatch = activation?.quota || null;
  const data = {
    stripe_subscription_status: subscription.status,
    updated_at: new Date(),
  };
  if (subscription.status === 'trialing' && subscription.trial_end) {
    data.plan_expires_at = new Date(subscription.trial_end * 1000);
  } else if (subscription.status === 'active') {
    // Clear trial expiry when subscription transitions to active (payment succeeded)
    data.plan_expires_at = null;
  }
  // Only patch plan/quota if we have valid metadata — don't clobber on metadata-less events
  if (quotaPatch) {
    Object.assign(data, quotaPatch);
  } else if (hasPlanMeta) {
    data.plan_tier = resolvePlanTier(planFromMeta);
  }

  const res = await tx.businesses.updateMany({
    where: { stripe_subscription_id: subscription.id },
    data,
  });

  if (res.count === 0 && subscription.metadata?.businessId) {
    const existing = await tx.businesses.findUnique({
      where: { id: subscription.metadata.businessId },
      select: { settings: true },
    });
    const fallbackData = {
      stripe_subscription_id: subscription.id,
      stripe_subscription_status: subscription.status,
      updated_at: new Date(),
    };
    if (subscription.status === 'trialing' && subscription.trial_end) {
      fallbackData.plan_expires_at = new Date(subscription.trial_end * 1000);
    } else if (subscription.status === 'active') {
      fallbackData.plan_expires_at = null;
    }
    if (quotaPatch) {
      Object.assign(fallbackData, quotaPatch);
    } else if (hasPlanMeta) {
      fallbackData.plan_tier = resolvePlanTier(planFromMeta);
    }
    if (activation?.settingsPatch && Object.keys(activation.settingsPatch).length) {
      fallbackData.settings = mergeBusinessSettingsForBilling(
        existing?.settings,
        activation.settingsPatch
      );
    }
    await tx.businesses.updateMany({
      where: { id: subscription.metadata.businessId },
      data: fallbackData,
    });
  } else if (activation?.settingsPatch && Object.keys(activation.settingsPatch).length && res.count > 0) {
    const rows = await tx.businesses.findMany({
      where: { stripe_subscription_id: subscription.id },
      select: { id: true, settings: true },
    });
    for (const row of rows) {
      await tx.businesses.update({
        where: { id: row.id },
        data: {
          settings: mergeBusinessSettingsForBilling(row.settings, activation.settingsPatch),
        },
      });
    }
  }

  console.log('[Stripe Webhook] Subscription updated:', subscription.id);
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {import('stripe').Stripe.Subscription} subscription
 * @returns {Promise<Array<{ to: string; businessName: string }>>}
 */
async function handleSubscriptionDeletedTx(tx, subscription) {
  const rows = await tx.businesses.findMany({
    where: { stripe_subscription_id: subscription.id },
    select: { id: true, email: true, business_name: true },
  });

  await tx.businesses.updateMany({
    where: { stripe_subscription_id: subscription.id },
    data: {
      stripe_subscription_status: 'canceled',
      plan_tier: 'free',
      stripe_subscription_id: null,
      plan_expires_at: null,
      updated_at: new Date(),
    },
  });

  for (const b of rows) {
    await tx.subscription_history.create({
      data: {
        business_id: b.id,
        plan_tier: 'free',
        status: 'canceled',
        stripe_subscription_id: subscription.id,
        metadata: { source: 'customer.subscription.deleted' },
      },
    });
  }

  console.log('[Stripe Webhook] Subscription cancelled:', subscription.id);
  return rows.map((b) => ({ to: b.email, businessName: b.business_name }));
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {import('stripe').Stripe.Subscription} subscription
 */
async function handleTrialWillEndTx(tx, subscription) {
  const rows = await tx.businesses.findMany({
    where: { stripe_subscription_id: subscription.id },
    select: { email: true, business_name: true },
  });
  for (const business of rows) {
    void import('@/lib/email/subscription-emails').then(({ sendTrialEndingEmail }) =>
      sendTrialEndingEmail({
        to: business.email,
        businessName: business.business_name,
        daysLeft: 3,
      }).catch(console.error)
    );
  }
  console.log('[Stripe Webhook] Trial ending soon for:', subscription.id);
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {import('stripe').Stripe.PaymentIntent} paymentIntent
 */
async function handlePaymentIntentSucceededTx(tx, paymentIntent) {
  const { orderId, businessId } = paymentIntent.metadata || {};
  if (!orderId || !businessId) {
    console.error('[Stripe Webhook] Missing metadata in payment intent');
    return null;
  }

  const orderIdNum = Number.parseInt(String(orderId), 10);
  if (Number.isNaN(orderIdNum)) {
    console.error('[Stripe Webhook] Invalid orderId in payment intent metadata');
    return null;
  }

  await tx.payment_transactions.updateMany({
    where: {
      stripe_payment_intent_id: paymentIntent.id,
      business_id: businessId,
    },
    data: {
      status: 'completed',
      updated_at: new Date(),
    },
  });

  await tx.storefront_orders.updateMany({
    where: {
      id: orderIdNum,
      business_id: businessId,
    },
    data: {
      payment_status: 'paid',
      status: 'confirmed',
      updated_at: new Date(),
    },
  });

  const order = await tx.storefront_orders.findFirst({
    where: { id: orderIdNum, business_id: businessId },
    include: { businesses: { select: { email: true, business_name: true } } },
  });

  if (order?.customer_email && order.businesses) {
    void import('@/lib/email/resend').then(({ sendOrderConfirmationEmail }) =>
      sendOrderConfirmationEmail({
        to: order.customer_email,
        order,
        business: {
          name: order.businesses.business_name,
          email: order.businesses.email,
        },
      }).catch(console.error)
    );
  }

  console.log('[Stripe Webhook] Payment succeeded for order:', orderId);
  return { businessId, orderId: orderIdNum };
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {import('stripe').Stripe.PaymentIntent} paymentIntent
 */
async function handlePaymentIntentFailedTx(tx, paymentIntent) {
  const { orderId, businessId } = paymentIntent.metadata || {};
  if (!orderId || !businessId) {
    console.error('[Stripe Webhook] Missing orderId/businessId in payment intent');
    return;
  }

  const orderIdNum = Number.parseInt(String(orderId), 10);
  if (Number.isNaN(orderIdNum)) return;

  await tx.payment_transactions.updateMany({
    where: {
      stripe_payment_intent_id: paymentIntent.id,
      business_id: businessId,
    },
    data: {
      status: 'failed',
      updated_at: new Date(),
    },
  });

  await tx.storefront_orders.updateMany({
    where: { id: orderIdNum, business_id: businessId },
    data: {
      payment_status: 'failed',
      updated_at: new Date(),
    },
  });

  console.log('[Stripe Webhook] Payment failed for order:', orderId);
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {import('stripe').Stripe.Account} account
 */
async function handleAccountUpdatedTx(tx, account) {
  await tx.stripe_connect_accounts.updateMany({
    where: { stripe_account_id: account.id },
    data: {
      is_charges_enabled: account.charges_enabled,
      is_payouts_enabled: account.payouts_enabled,
      is_details_submitted: account.details_submitted ?? false,
      updated_at: new Date(),
    },
  });
  console.log('[Stripe Webhook] Account updated:', account.id);
}
