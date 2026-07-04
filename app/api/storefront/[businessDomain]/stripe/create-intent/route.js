import { NextResponse } from 'next/server';
import { resolveStorefrontBusiness } from '@/lib/tenancy/resolveStorefrontBusiness';
import { createStorefrontStripePaymentIntent } from '@/lib/storefront/createStorefrontStripePaymentIntent';

export const dynamic = 'force-dynamic';

/**
 * POST /api/storefront/[businessDomain]/stripe/create-intent
 * Body: { orderNumber, customerEmail? }
 */
export async function POST(request, { params }) {
  try {
    const { businessDomain } = await params;
    const business = await resolveStorefrontBusiness(businessDomain);
    if (!business) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { orderNumber, customerEmail } = body;
    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: 'orderNumber is required' },
        { status: 400 }
      );
    }

    const result = await createStorefrontStripePaymentIntent({
      business,
      orderNumber,
      customerEmail,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error, code: result.code },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      reused: result.reused || false,
    });
  } catch (error) {
    console.error('[Storefront stripe create-intent]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create payment session' },
      { status: 500 }
    );
  }
}
