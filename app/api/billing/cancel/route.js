export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prismaBase } from '@/lib/db';
import { cancelSubscription } from '@/lib/payments/stripe';
import { getSessionUser } from '@/lib/auth/session';
import { assertUserHasBusinessAccess } from '@/lib/tenancy/businessAccess';
import { assertBillingRole } from '@/lib/tenancy/billingAccess';
import { shouldUseDevInstantBilling } from '@/lib/config/billingMode';

/**
 * POST /api/billing/cancel
 * Body: { business_id?, businessId?, atPeriodEnd? }
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
    const { atPeriodEnd = true, business_id: businessIdSnake, businessId: businessIdCamel } =
      body;
    const businessId = businessIdSnake || businessIdCamel;

    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id is required', code: 'MISSING_BUSINESS_ID' },
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

    // Cancellation is a destructive billing action — owner/admin only
    const roleCheck = await assertBillingRole({ userId: sessionWrap.user.id, businessId, sessionUser: sessionWrap.user });
    if (!roleCheck.allowed) {
      return NextResponse.json({ error: roleCheck.error, code: 'INSUFFICIENT_ROLE' }, { status: 403 });
    }

    const business = await prismaBase.businesses.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (shouldUseDevInstantBilling()) {
      await prismaBase.$transaction(async (tx) => {
        await tx.businesses.update({
          where: { id: business.id },
          data: {
            plan_tier: 'free',
            stripe_subscription_status: null,
            stripe_subscription_id: null,
            plan_expires_at: null,
            updated_at: new Date(),
          },
        });
        try {
          await tx.subscription_history.create({
            data: {
              business_id: business.id,
              plan_tier: 'free',
              status: 'manual_dev_cancelled',
              stripe_subscription_id: null,
              metadata: {
                manualBilling: true,
                cancelledBy: sessionWrap.user.id,
              },
            },
          });
        } catch {
          // subscription_history table may not exist until migrations are applied
        }
      });

      return NextResponse.json({
        success: true,
        manual: true,
        cancelled: true,
        message: 'Manual billing mode: subscription cleared and plan set to free.',
      });
    }

    if (!business.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found', code: 'NO_SUBSCRIPTION' },
        { status: 400 }
      );
    }

    const cancelResult = await cancelSubscription(business.stripe_subscription_id, {
      cancelAtPeriodEnd: atPeriodEnd,
    });

    if (cancelResult.skipped) {
      return NextResponse.json(
        { error: 'Payment provider not configured', code: 'STRIPE_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    await prismaBase.$transaction(async (tx) => {
      if (atPeriodEnd) {
        await tx.businesses.update({
          where: { id: business.id },
          data: {
            stripe_subscription_status: 'cancellation_scheduled',
            updated_at: new Date(),
          },
        });
      } else {
        await tx.businesses.update({
          where: { id: business.id },
          data: {
            stripe_subscription_status: 'canceled',
            plan_tier: 'free',
            stripe_subscription_id: null,
            plan_expires_at: null,
            updated_at: new Date(),
          },
        });
      }

      await tx.subscription_history.create({
        data: {
          business_id: business.id,
          plan_tier: business.plan_tier,
          status: atPeriodEnd ? 'cancellation_scheduled' : 'canceled',
          stripe_subscription_id: business.stripe_subscription_id,
          metadata: {
            atPeriodEnd,
            cancelledBy: sessionWrap.user.id,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      cancelled: true,
      atPeriodEnd,
      message: atPeriodEnd
        ? 'Subscription will be cancelled at the end of your billing period'
        : 'Subscription cancelled immediately',
    });
  } catch (error) {
    console.error('[Cancel Subscription] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
