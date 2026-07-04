import { NextResponse } from 'next/server';
import { resolveStorefrontBusiness } from '@/lib/tenancy/resolveStorefrontBusiness';
import { validateCheckoutCartLines } from '@/lib/storefront/validateCheckoutCart';

/**
 * POST /api/storefront/[businessDomain]/cart/validate
 * Pre-checkout validation — stock, variants, purchasable product refs.
 */
export async function POST(request, { params }) {
  const { businessDomain } = await params;
  const business = await resolveStorefrontBusiness(businessDomain);

  if (!business) {
    return NextResponse.json(
      { success: false, error: 'Business not found' },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { items = [] } = body;

  const result = await validateCheckoutCartLines(business.id, items);

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        issues: result.issues || [],
      },
      { status: result.status || 400 }
    );
  }

  return NextResponse.json({ success: true, digitalOnly: Boolean(result.digitalOnly) });
}
