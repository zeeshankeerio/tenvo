import { NextResponse } from 'next/server';
import { prismaBase } from '@/lib/db';
import { createBillingPortalSession } from '@/lib/payments/stripe';
import { getSessionUser } from '@/lib/auth/session';
import { assertUserHasBusinessAccess } from '@/lib/tenancy/businessAccess';
import { isManualBillingMode } from '@/lib/config/billingMode';
import { businessHubUrl } from '@/lib/utils/billingReturnUrls';

/**
 * POST /api/billing/portal
 * Body: { business_id?, businessId?, returnUrl? }
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
    const { returnUrl, business_id: businessIdSnake, businessId: businessIdCamel } = body;
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

    if (isManualBillingMode()) {
      return NextResponse.json({
        success: true,
        manual: true,
        code: 'MANUAL_BILLING_NO_PORTAL',
        message:
          'Stripe Customer Portal is disabled while BILLING_MODE=manual. Change plans via checkout (same API), it updates the business record only.',
      });
    }

    const business = await prismaBase.businesses.findUnique({
      where: { id: businessId },
      select: { stripe_customer_id: true, domain: true },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const customerId = business.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        {
          error: 'No billing account found. Please subscribe to a plan first.',
          code: 'NO_STRIPE_CUSTOMER',
        },
        { status: 400 }
      );
    }

    const appBase = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    const domainSlug = String(business.domain || '').trim().toLowerCase();
    const returnUrlFull =
      typeof returnUrl === 'string' && returnUrl.trim().startsWith('http')
        ? returnUrl.trim()
        : domainSlug
          ? businessHubUrl(appBase, domainSlug, { tab: 'settings', billing: 'portal_return' })
          : `${appBase}/pricing?billing=portal_return`;

    const portalResult = await createBillingPortalSession({
      customerId,
      returnUrl: returnUrlFull,
    });

    if (portalResult.skipped) {
      return NextResponse.json(
        { error: 'Payment provider not configured', code: 'STRIPE_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      portalUrl: portalResult.url,
    });
  } catch (error) {
    console.error('[Billing Portal] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
