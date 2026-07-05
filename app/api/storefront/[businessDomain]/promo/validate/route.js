import { NextResponse } from 'next/server';
import { fetchBusinessByDomain } from '@/lib/storefront/fetchBusinessByDomain';
import pool from '@/lib/db';
import {
  customerHasActiveMembership,
  isMemberOnlyPromo,
} from '@/lib/memberships/membershipStorefrontDiscount';

export async function POST(request, { params }) {
  const { businessDomain } = await params;

  try {
    const body = await request.json();
    const { code, subtotal = 0, customerEmail = '' } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
    }

    const bizResult = await fetchBusinessByDomain(businessDomain);
    if (!bizResult.success) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const businessId = bizResult.business.id;
    const client = await pool.connect();

    try {
      // Look up active promo in discount_codes or coupons table (graceful fallback if neither exists)
      let promoRow = null;

      // Try discount_codes table first
      try {
        const res = await client.query(
          `SELECT * FROM discount_codes
            WHERE business_id = $1::uuid
              AND code = $2
              AND is_active = true
              AND (expires_at IS NULL OR expires_at > NOW())
              AND (usage_limit IS NULL OR used_count < usage_limit)
           LIMIT 1`,
          [businessId, code.trim().toUpperCase()]
        );
        if (res.rows.length > 0) promoRow = res.rows[0];
      } catch {
        // Table may not exist
      }

      // Try coupons table as fallback
      if (!promoRow) {
        try {
          const res = await client.query(
            `SELECT * FROM coupons
              WHERE business_id = $1::uuid
                AND code = $2
                AND is_active = true
                AND (expires_at IS NULL OR expires_at > NOW())
                AND (usage_limit IS NULL OR used_count < usage_limit)
             LIMIT 1`,
            [businessId, code.trim().toUpperCase()]
          );
          if (res.rows.length > 0) promoRow = res.rows[0];
        } catch {
          // Table may not exist
        }
      }

      if (!promoRow) {
        return NextResponse.json(
          { error: 'Invalid or expired promo code' },
          { status: 400 }
        );
      }

      if (isMemberOnlyPromo(promoRow)) {
        const email = String(customerEmail || '').trim();
        if (!email) {
          return NextResponse.json(
            { error: 'Enter your email to use this members-only promo code' },
            { status: 400 }
          );
        }
        const isMember = await customerHasActiveMembership(client, businessId, email);
        if (!isMember) {
          return NextResponse.json(
            { error: 'This promo code is for active members only' },
            { status: 403 }
          );
        }
      }

      // Calculate discount
      let discount = 0;
      const sub = parseFloat(subtotal) || 0;

      // Minimum order check
      if (promoRow.min_order_amount && sub < parseFloat(promoRow.min_order_amount)) {
        return NextResponse.json(
          {
            error: `This code requires a minimum order of Rs. ${parseFloat(promoRow.min_order_amount).toLocaleString()}`,
          },
          { status: 400 }
        );
      }

      if (promoRow.discount_type === 'percentage' || promoRow.type === 'percentage') {
        const pct = parseFloat(promoRow.discount_value || promoRow.value || 0);
        discount = (sub * pct) / 100;
        if (promoRow.max_discount_amount) {
          discount = Math.min(discount, parseFloat(promoRow.max_discount_amount));
        }
      } else {
        // Fixed amount
        discount = parseFloat(promoRow.discount_value || promoRow.value || 0);
        discount = Math.min(discount, sub); // can't discount more than subtotal
      }

      discount = Math.round(discount * 100) / 100;

      return NextResponse.json({
        success: true,
        code: promoRow.code,
        discount,
        discountType: promoRow.discount_type || promoRow.type || 'fixed',
        discountValue: parseFloat(promoRow.discount_value || promoRow.value || 0),
        message: `Code applied! You save Rs. ${discount.toLocaleString()}`,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[promo/validate] Error:', error);
    return NextResponse.json({ error: 'Failed to validate promo code' }, { status: 500 });
  }
}
