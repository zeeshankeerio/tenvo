export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prismaBase } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { assertUserHasBusinessAccess } from '@/lib/tenancy/businessAccess';
import { getSubscription, listStripeCustomerInvoices } from '@/lib/payments/stripe';
import { shouldUseDevInstantBilling, isStripeCheckoutEnabled } from '@/lib/config/billingMode';
import { getManualPaymentRequestState } from '@/lib/payments/manualPaymentRequests';

/**
 * GET /api/billing/subscription?business_id=...
 * Current SaaS subscription for a business (Stripe + local `businesses` row).
 */
export async function GET(request) {
  try {
    const sessionWrap = await getSessionUser();
    if (!sessionWrap?.user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId =
      searchParams.get('business_id') || searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json(
        {
          error: 'business_id query parameter is required',
          code: 'MISSING_BUSINESS_ID',
        },
        { status: 400 }
      );
    }

    const allowed = await assertUserHasBusinessAccess({
      userId: sessionWrap.user.id,
      businessId,
      sessionUser: sessionWrap.user,
    });
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
    }

    const business = await prismaBase.businesses.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const stripeEnabled = isStripeCheckoutEnabled();

    let stripeSubscription = null;
    if (business.stripe_subscription_id && stripeEnabled) {
      stripeSubscription = await getSubscription(business.stripe_subscription_id);
    }

    let invoices = [];
    if (stripeEnabled && business.stripe_customer_id) {
      invoices = await listStripeCustomerInvoices(business.stripe_customer_id, 10);
    }

    let history = [];
    try {
      history = await prismaBase.subscription_history.findMany({
        where: { business_id: businessId },
        orderBy: { created_at: 'desc' },
        take: 5,
      });
    } catch {
      // Table may be missing before migrations
    }

    const status =
      business.stripe_subscription_status ||
      (business.plan_tier === 'free' ? 'inactive' : 'unknown');

    /** Stripe dunning / incomplete payment, keep access like typical SaaS grace until hard cancel. */
    const graceWhilePaidTier =
      business.plan_tier &&
      business.plan_tier !== 'free' &&
      ['past_due', 'unpaid', 'incomplete'].includes(status);

    const needsBillingAttention = [
      'past_due',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'cancellation_scheduled',
    ].includes(status);

    const isActive =
      status === 'active' ||
      status === 'trialing' ||
      status === 'manual_dev' ||
      status === 'manual_payment_active' ||
      status === 'cancellation_scheduled' ||
      graceWhilePaidTier;

    const settingsObj =
      business.settings && typeof business.settings === 'object' && !Array.isArray(business.settings)
        ? business.settings
        : {};
    const manualPayment = getManualPaymentRequestState(settingsObj);
    const pendingManualPayment =
      manualPayment.pending?.status === 'pending' ? manualPayment.pending : null;

    let manualAccessExpiresSoon = false;
    if (status === 'manual_payment_active' && business.plan_expires_at) {
      const msUntilExpiry = new Date(business.plan_expires_at).getTime() - Date.now();
      manualAccessExpiresSoon = msUntilExpiry > 0 && msUntilExpiry <= 7 * 24 * 60 * 60 * 1000;
    }

    return NextResponse.json({
      billingMode: shouldUseDevInstantBilling() ? 'manual' : 'stripe',
      stripeCheckoutAvailable: stripeEnabled,
      devInstantBilling: shouldUseDevInstantBilling(),
      offlinePaymentAvailable: true,
      manualPayment: {
        pending: pendingManualPayment,
        recentHistory: manualPayment.history.slice(0, 5),
        accessExpiresSoon: manualAccessExpiresSoon,
      },
      subscription: {
        planTier: business.plan_tier,
        status,
        isActive,
        needsBillingAttention,
        isTrial: status === 'trialing',
        startDate: business.created_at,
        endDate: business.plan_expires_at,
        trialEndDate: null,
        lastPaymentDate: null,
        billingCycle: null,
        autoRenew: status !== 'canceled' && status !== 'cancelled',
        stripeSubscriptionId: business.stripe_subscription_id,
        stripeCustomerId: business.stripe_customer_id,
        stripeDetails: stripeSubscription
          ? {
              currentPeriodStart: stripeSubscription.current_period_start,
              currentPeriodEnd: stripeSubscription.current_period_end,
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            }
          : null,
      },
      invoices,
      history,
    });
  } catch (error) {
    console.error('[Get Subscription] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
