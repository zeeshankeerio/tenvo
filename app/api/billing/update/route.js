import { NextResponse } from 'next/server';
import { prismaBase } from '@/lib/db';
import { updateSubscription, getSubscription, getStripe } from '@/lib/payments/stripe';
import { getSessionUser } from '@/lib/auth/session';
import { assertUserHasBusinessAccess } from '@/lib/tenancy/businessAccess';
import { assertBillingRole } from '@/lib/tenancy/billingAccess';
import { shouldUseDevInstantBilling } from '@/lib/config/billingMode';
import { resolvePlanTier } from '@/lib/config/plans';
import { resolveBillableSku } from '@/lib/payments/billingSku';
import {
  ensureStripePriceForCatalogItem,
  normalizeBillingCurrency,
} from '@/lib/payments/stripeCatalog';
import { mergeBusinessSettingsForBilling } from '@/lib/payments/billingActivation';

/**
 * POST /api/billing/update
 * Body: { business_id?, businessId?, newPlanTier?, domainPackageKey?, currency?, prorationBehavior? }
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
      domainPackageKey,
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

    if (!newPlanTier && !domainPackageKey) {
      return NextResponse.json(
        { error: 'newPlanTier or domainPackageKey is required', code: 'MISSING_BILLING_SKU' },
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

    // Plan upgrades/downgrades are owner/admin only
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

    let currency = typeof bodyCurrency === 'string' ? normalizeBillingCurrency(bodyCurrency) : null;
    if (!currency) {
      const stripeSub = business.stripe_subscription_id
        ? await getSubscription(business.stripe_subscription_id)
        : null;
      const fromStripe = stripeSub?.items?.data?.[0]?.price?.currency;
      currency = fromStripe ? normalizeBillingCurrency(fromStripe) : null;
    }
    if (!currency && business.currency) {
      currency = normalizeBillingCurrency(business.currency);
    }
    if (!currency) {
      currency = 'pkr';
    }

    const billable = resolveBillableSku({
      planTier: newPlanTier,
      domainPackageKey,
      currency,
    });
    if (!billable) {
      return NextResponse.json(
        { error: 'Unknown or non-billable plan/package', code: 'INVALID_BILLING_SKU' },
        { status: 400 }
      );
    }

    const { catalog: catalogItem, activation } = billable;

    const resolved = resolvePlanTier(activation.planTier);
    const currentResolved = resolvePlanTier(business.plan_tier);

    const sameTier =
      currentResolved === resolved &&
      !domainPackageKey &&
      !catalogItem.domainPackageKey;
    if (sameTier) {
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
              domainPackageKey: activation.domainPackageKey,
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
        domainPackageKey: activation.domainPackageKey,
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

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment provider not configured', code: 'STRIPE_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    const priceId = await ensureStripePriceForCatalogItem(stripe, catalogItem);

    const updateResult = await updateSubscription(business.stripe_subscription_id, {
      newPriceId: priceId,
      prorationBehavior,
      metadata: {
        businessId,
        planTier: resolved,
        ...(activation.domainPackageKey
          ? { domainPackageKey: activation.domainPackageKey }
          : {}),
        billingKind: catalogItem.kind,
        catalogLookupKey: catalogItem.lookupKey,
      },
    });

    if (updateResult.skipped) {
      return NextResponse.json(
        { error: 'Payment provider not configured', code: 'STRIPE_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    const nextSettings = mergeBusinessSettingsForBilling(
      business.settings,
      activation.settingsPatch
    );

    await prismaBase.businesses.update({
      where: { id: businessId },
      data: {
        ...activation.quota,
        settings: nextSettings,
        stripe_subscription_status:
          updateResult.subscription?.status || business.stripe_subscription_status,
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
            catalog_lookup_key: catalogItem.lookupKey,
            domainPackageKey: activation.domainPackageKey,
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
      domainPackageKey: activation.domainPackageKey,
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
