import { NextResponse } from 'next/server';
import { prismaBase } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { assertUserHasBusinessAccess } from '@/lib/tenancy/businessAccess';
import { createPayment } from '@/lib/payments/nowpayments';

function appBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return '';
}

/**
 * POST /api/billing/crypto/create
 * Body: { business_id?, businessId?, amount, currency?, cryptoCurrency? }
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
      amount,
      currency = 'usd',
      cryptoCurrency = 'btc',
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

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number', code: 'INVALID_AMOUNT' },
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

    const baseUrl = appBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        {
          error:
            'Set NEXT_PUBLIC_APP_URL (or deploy on Vercel with VERCEL_URL) so success/cancel/IPN URLs are absolute.',
          code: 'MISSING_APP_BASE_URL',
        },
        { status: 500 }
      );
    }

    const orderId = `tenvo-${businessId}-${Date.now()}`;
    const ipnCallbackUrl =
      process.env.NOWPAYMENTS_IPN_CALLBACK_URL?.trim() || `${baseUrl}/api/webhooks/nowpayments`;

    const created = await createPayment({
      priceAmount: numAmount,
      priceCurrency: String(currency).toLowerCase(),
      payCurrency: String(cryptoCurrency).toLowerCase(),
      orderId,
      orderDescription: `Tenvo — ${business.business_name || 'Business'} (${businessId.slice(0, 8)}…)`,
      customerEmail: business.email || undefined,
      customerName: business.business_name || undefined,
      callbackUrl: ipnCallbackUrl,
      successUrl: `${baseUrl}/business/settings?crypto=success&order_id=${encodeURIComponent(orderId)}`,
      cancelUrl: `${baseUrl}/business/settings?crypto=cancelled`,
    });

    if (created?.skipped) {
      return NextResponse.json(
        { error: 'Crypto payments not configured', code: 'NOWPAYMENTS_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentId: created.paymentId,
      paymentStatus: created.paymentStatus,
      payAddress: created.payAddress,
      payAmount: created.payAmount,
      payCurrency: created.payCurrency,
      priceAmount: created.priceAmount,
      priceCurrency: created.priceCurrency,
      expirationEstimateDate: created.expirationEstimateDate,
      orderId: created.orderId,
    });
  } catch (error) {
    console.error('[Crypto create] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create crypto payment' },
      { status: 500 }
    );
  }
}
