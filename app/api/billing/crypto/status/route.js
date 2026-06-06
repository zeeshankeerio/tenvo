import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { assertUserHasBusinessAccess } from '@/lib/tenancy/businessAccess';
import { getPaymentStatus } from '@/lib/payments/nowpayments';

/**
 * GET /api/billing/crypto/status?paymentId=…&business_id=…
 * business_id optional but recommended so access can be checked when provided.
 */
export async function GET(request) {
  try {
    const sessionWrap = await getSessionUser();
    if (!sessionWrap?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    const businessId = searchParams.get('business_id') || searchParams.get('businessId');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'paymentId is required', code: 'MISSING_PAYMENT_ID' },
        { status: 400 }
      );
    }

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

    const data = await getPaymentStatus(paymentId);
    if (!data) {
      return NextResponse.json(
        { error: 'Payment not found or provider unavailable', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: data.paymentStatus,
      paymentId: data.paymentId,
      paymentStatus: data.paymentStatus,
      payAddress: data.payAddress,
      payAmount: data.payAmount,
      actuallyPaid: data.actuallyPaid,
      payCurrency: data.payCurrency,
      priceAmount: data.priceAmount,
      priceCurrency: data.priceCurrency,
      orderId: data.orderId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  } catch (error) {
    console.error('[Crypto status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load payment status' },
      { status: 500 }
    );
  }
}
