import { NextResponse } from 'next/server';
import { prismaBase } from '@/lib/db';
import { createCheckoutSession, createCustomer } from '@/lib/payments/stripe';
import { getSessionUser } from '@/lib/auth/session';
import { assertUserHasBusinessAccess } from '@/lib/tenancy/businessAccess';
import { assertBillingRole } from '@/lib/tenancy/billingAccess';
import { shouldUseDevInstantBilling } from '@/lib/config/billingMode';
import { resolvePlanTier } from '@/lib/config/plans';
import { businessHubUrl, stripeCheckoutSuccessUrl } from '@/lib/utils/billingReturnUrls';
import { resolveBillableSku } from '@/lib/payments/billingSku';
import {
  buildCheckoutLineItemFromCatalog,
  buildCheckoutSessionMetadata,
} from '@/lib/payments/stripeCatalog';
import { mergeBusinessSettingsForBilling } from '@/lib/payments/billingActivation';

/**
 * POST /api/billing/create-checkout
 * Body: { business_id, planTier?, domainPackageKey?, currency?, returnUrl? }
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
      domainPackageKey,
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

    if (!planTier && !domainPackageKey) {
      return NextResponse.json(
        { error: 'planTier or domainPackageKey is required', code: 'MISSING_BILLING_SKU' },
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

    // Billing mutations require owner or admin role
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

    const billable = resolveBillableSku({
      planTier,
      domainPackageKey,
      currency,
    });

    if (!billable) {
      return NextResponse.json(
        {
          error: 'Unknown or non-billable plan/package. Enterprise plans require sales contact.',
          code: 'INVALID_BILLING_SKU',
        },
        { status: 400 }
      );
    }

    const { catalog: catalogItem, activation } = billable;

    // Dev / UAT: apply plan locally only when manual mode and Stripe is not configured
    if (shouldUseDevInstantBilling()) {
      const nextSettings = mergeBusinessSettingsForBilling(
        business.settings,
        activation.settingsPatch
      );
      await prismaBase.businesses.update({
        where: { id: businessId },
        data: {
          ...activation.quota,
          settings: nextSettings,
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
        planTier: resolvePlanTier(activation.planTier),
        domainPackageKey: activation.domainPackageKey,
      });
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

    const sessionMetadata = buildCheckoutSessionMetadata(catalogItem, { businessId: business.id });

    const checkoutResult = await createCheckoutSession({
      customerId,
      lineItem: buildCheckoutLineItemFromCatalog(catalogItem),
      successUrl,
      cancelUrl,
      metadata: sessionMetadata,
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
      planTier: catalogItem.planTier,
      domainPackageKey: catalogItem.domainPackageKey,
      currency: catalogItem.currency,
      amountMinor: catalogItem.unitAmountMinor,
    });
  } catch (error) {
    console.error('[Create Checkout] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
