import { NextResponse } from 'next/server';
import { prismaBase } from '@/lib/db';
import { getPriceIdForPlan, updateSubscription, getSubscription } from '@/lib/payments/stripe';
import { getSessionUser } from '@/lib/auth/session';
import { assertUserHasBusinessAccess } from '@/lib/tenancy/businessAccess';
import { isManualBillingMode } from '@/lib/config/billingMode';
import { getPlanTierQuotaUpdateData, resolvePlanTier } from '@/lib/config/plans';

/**
 * POST /api/billing/update
 * Body: { business_id?, businessId?, newPlanTier, currency?, prorationBehavior? }
 * Upgrades/downgrades an existing Stripe subscription, or applies tier in manual billing mode.
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

    const body = await request.json().catch(() => ({}));
    const {
      newPlanTier,
      currency: bodyCurrency,
      prorationBehavior = 'create_prorations',
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

    if (!newPlanTier || typeof newPlanTier !== 'string') {
      return NextResponse.json(
        { error: 'newPlanTier is required', code: 'MISSING_PLAN_TIER' },
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

    const resolved = resolvePlanTier(newPlanTier);
    const quota = getPlanTierQuotaUpdateData(resolved);
    if (!quota) {
      return NextResponse.json(
        { error: 'Unknown plan tier', code: 'INVALID_PLAN' },
        { status: 400 }
      );
    }

    const currentResolved = resolvePlanTier(business.plan_tier);
    if (currentResolved === resolved) {
      return NextResponse.json({
        success: true,
        noOp: true,
        planTier: resolved,
        message: 'Business is already on this plan tier.',
      });
    }

    if (resolved === 'free') {
      return NextResponse.json(
        {
          error:
            'To move to the free plan, cancel your subscription from billing settings or contact support.',
          code: 'USE_CANCEL_FOR_FREE',
        },
        { status: 400 }
      );
    }

    if (isManualBillingMode()) {
      await prismaBase.businesses.update({
        where: { id: businessId },
        data: {
          ...quota,
          stripe_subscription_status: 'manual_dev',
          plan_expires_at: null,
          updated_at: new Date(),
        },
      });
      try {
        await prismaBase.subscription_history.create({
          data: {
            business_id: businessId,
            plan_tier: resolved,
            status: 'manual_dev_plan_update',
            stripe_subscription_id: business.stripe_subscription_id,
            metadata: {
              manualBilling: true,
              previous_plan_tier: business.plan_tier,
              updatedBy: sessionWrap.user.id,
            },
          },
        });
      } catch {
        // subscription_history optional until migrations
      }
      return NextResponse.json({
        success: true,
        manual: true,
        planTier: resolved,
        code: 'MANUAL_BILLING_PLAN_APPLIED',
      });
    }

    if (!business.stripe_subscription_id) {
      return NextResponse.json(
        {
          error: 'No Stripe subscription on this business. Start a subscription from pricing or checkout.',
          code: 'NO_STRIPE_SUBSCRIPTION',
        },
        { status: 400 }
      );
    }

    let currency = typeof bodyCurrency === 'string' ? bodyCurrency.toLowerCase() : null;
    if (!currency) {
      const stripeSub = await getSubscription(business.stripe_subscription_id);
      const fromStripe = stripeSub?.items?.data?.[0]?.price?.currency;
      currency = fromStripe ? String(fromStripe).toLowerCase() : null;
    }
    if (!currency && business.currency) {
      currency = String(business.currency).toLowerCase();
    }
    if (!currency) {
      currency = 'pkr';
    }

    const priceId = getPriceIdForPlan(resolved, currency);
    if (!priceId) {
      return NextResponse.json(
        {
          error: `No Stripe price is configured for plan "${resolved}" in ${currency}. Add the matching STRIPE_PRICE_* env var or pass currency.`,
          code: 'MISSING_PRICE_ID',
        },
        { status: 400 }
      );
    }

    const updateResult = await updateSubscription(business.stripe_subscription_id, {
      newPriceId: priceId,
      prorationBehavior,
      metadata: {
        businessId,
        planTier: resolved,
      },
    });

    if (updateResult.skipped) {
      return NextResponse.json(
        { error: 'Payment provider not configured', code: 'STRIPE_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    await prismaBase.businesses.update({
      where: { id: businessId },
      data: {
        ...quota,
        stripe_subscription_status: updateResult.subscription?.status || business.stripe_subscription_status,
        updated_at: new Date(),
      },
    });

    try {
      await prismaBase.subscription_history.create({
        data: {
          business_id: businessId,
          plan_tier: resolved,
          status: 'self_serve_plan_update',
          stripe_subscription_id: business.stripe_subscription_id,
          metadata: {
            previous_plan_tier: business.plan_tier,
            price_id: priceId,
            currency,
            updatedBy: sessionWrap.user.id,
          },
        },
      });
    } catch {
      // optional history
    }

    return NextResponse.json({
      success: true,
      planTier: resolved,
      subscriptionId: business.stripe_subscription_id,
      subscriptionStatus: updateResult.subscription?.status ?? null,
    });
  } catch (error) {
    console.error('[Billing Update] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
