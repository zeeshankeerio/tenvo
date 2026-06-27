import { NextResponse } from 'next/server';
import { prismaBase } from '@/lib/db';
import { createCheckoutSession, getPriceIdForPlan, createCustomer } from '@/lib/payments/stripe';
import { getSessionUser } from '@/lib/auth/session';
import { assertUserHasBusinessAccess } from '@/lib/tenancy/businessAccess';
import { isManualBillingMode } from '@/lib/config/billingMode';
import { getPlanTierQuotaUpdateData, resolvePlanTier } from '@/lib/config/plans';
import { businessHubUrl, stripeCheckoutSuccessUrl } from '@/lib/utils/billingReturnUrls';

/**
 * POST /api/billing/create-checkout
 * Body: { business_id, planTier, currency?, returnUrl? }
 */
export async function POST(request) {
  try {
    const sessionWrap = await getSessionUser();
    if (!sessionWrap?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      planTier,
      currency = 'pkr',
      returnUrl,
      business_id: businessIdSnake,
      businessId: businessIdCamel,
    } = body;

    const businessId = businessIdSnake || businessIdCamel;
    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id is required', code: 'MISSING_BUSINESS_ID' },
        { status: 400 }
      );
    }

    if (!planTier) {
      return NextResponse.json(
        { error: 'Plan tier is required', code: 'MISSING_PLAN_TIER' },
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

    // Dev / UAT: apply plan locally, no Stripe (set BILLING_MODE=manual in .env)
    if (isManualBillingMode()) {
      const tier = resolvePlanTier(planTier);
      const quota = getPlanTierQuotaUpdateData(tier);
      if (!quota) {
        return NextResponse.json(
          { error: 'Unknown plan tier', code: 'INVALID_PLAN' },
          { status: 400 }
        );
      }
      await prismaBase.businesses.update({
        where: { id: businessId },
        data: {
          ...quota,
          stripe_subscription_status: 'manual_dev',
          plan_expires_at: null,
        },
      });
      return NextResponse.json({
        success: true,
        manual: true,
        code: 'MANUAL_BILLING_PLAN_APPLIED',
        message:
          'Development billing: plan saved on this business. No payment processor, treat as manual/offline payment for testing.',
        planTier: tier,
      });
    }

    const priceId = getPriceIdForPlan(planTier, currency);
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for plan: ${planTier}`, code: 'MISSING_PRICE_ID' },
        { status: 400 }
      );
    }

    let customerId = business.stripe_customer_id;

    if (!customerId) {
      const customerResult = await createCustomer({
        email: business.email,
        name: business.business_name,
        metadata: {
          businessId: business.id,
          businessName: business.business_name,
        },
      });

      if (customerResult.skipped) {
        return NextResponse.json(
          { error: 'Payment provider not configured', code: 'STRIPE_NOT_CONFIGURED' },
          { status: 503 }
        );
      }

      customerId = customerResult.id;

      await prismaBase.businesses.update({
        where: { id: business.id },
        data: { stripe_customer_id: customerId },
      });
    }

    const base = (returnUrl || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    const domainSlug = String(business.domain || '').trim().toLowerCase();
    const successUrl = stripeCheckoutSuccessUrl(base, domainSlug);
    const cancelUrl = domainSlug
      ? businessHubUrl(base, domainSlug, { tab: 'settings', billing: 'cancelled' })
      : `${base}/pricing?billing=cancelled`;

    const checkoutResult = await createCheckoutSession({
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      metadata: {
        businessId: business.id,
        planTier,
        currency,
      },
    });

    if (checkoutResult.skipped) {
      return NextResponse.json(
        { error: 'Payment provider not configured', code: 'STRIPE_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutResult.url,
      sessionId: checkoutResult.id,
    });
  } catch (error) {
    console.error('[Create Checkout] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
