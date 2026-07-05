import { NextResponse } from 'next/server';
import { fetchBusinessByDomain } from '@/lib/storefront/fetchBusinessByDomain';
import pool from '@/lib/db';
import { resolveMemberStorefrontDiscount } from '@/lib/memberships/membershipStorefrontDiscount';

/**
 * POST /api/storefront/[businessDomain]/promo/member-discount
 * Applies automatic member shop discount from active membership benefits.
 * Body: { customerEmail, subtotal }
 */
export async function POST(request, { params }) {
  const { businessDomain } = await params;

  try {
    const body = await request.json();
    const customerEmail = String(body.customerEmail || '').trim();
    const subtotal = parseFloat(body.subtotal) || 0;

    if (!customerEmail) {
      return NextResponse.json({ error: 'Email is required for member pricing' }, { status: 400 });
    }
    if (subtotal <= 0) {
      return NextResponse.json({ error: 'Cart subtotal must be greater than zero' }, { status: 400 });
    }

    const bizResult = await fetchBusinessByDomain(businessDomain);
    if (!bizResult.success) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const businessId = bizResult.business.id;
    const client = await pool.connect();

    try {
      const memberDiscount = await resolveMemberStorefrontDiscount(
        client,
        businessId,
        customerEmail,
        subtotal
      );

      if (!memberDiscount) {
        return NextResponse.json(
          { error: 'No active membership found for this email' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        discount: memberDiscount.discount,
        percent: memberDiscount.percent,
        planName: memberDiscount.planName,
        message: `Member pricing applied (${memberDiscount.percent}% off)`,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[promo/member-discount] Error:', error);
    return NextResponse.json({ error: 'Failed to apply member discount' }, { status: 500 });
  }
}
