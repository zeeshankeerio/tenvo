import {
  customerHasActiveMembership,
  isMemberOnlyPromo,
  resolveMemberStorefrontDiscount,
} from '@/lib/memberships/membershipStorefrontDiscount';

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * Look up an active promo row by code (discount_codes, then coupons).
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string} code
 */
export async function lookupStorefrontPromoRow(client, businessId, code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return null;

  try {
    const res = await client.query(
      `SELECT * FROM discount_codes
        WHERE business_id = $1::uuid
          AND code = $2
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > NOW())
          AND (usage_limit IS NULL OR used_count < usage_limit)
       LIMIT 1`,
      [businessId, normalized]
    );
    if (res.rows.length > 0) {
      return { row: res.rows[0], source: 'discount_codes' };
    }
  } catch {
    // table may not exist
  }

  try {
    const res = await client.query(
      `SELECT * FROM coupons
        WHERE business_id = $1::uuid
          AND code = $2
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > NOW())
          AND (usage_limit IS NULL OR used_count < usage_limit)
       LIMIT 1`,
      [businessId, normalized]
    );
    if (res.rows.length > 0) {
      return { row: res.rows[0], source: 'coupons' };
    }
  } catch {
    // table may not exist
  }

  return null;
}

/**
 * @param {Record<string, unknown>} promoRow
 * @param {number} subtotal
 */
export function calculateStorefrontPromoDiscount(promoRow, subtotal) {
  const sub = parseFloat(subtotal) || 0;
  if (!promoRow || sub <= 0) return 0;

  if (promoRow.min_order_amount && sub < parseFloat(String(promoRow.min_order_amount))) {
    return 0;
  }

  let discount = 0;
  if (promoRow.discount_type === 'percentage' || promoRow.type === 'percentage') {
    const pct = parseFloat(String(promoRow.discount_value || promoRow.value || 0));
    discount = (sub * pct) / 100;
    if (promoRow.max_discount_amount) {
      discount = Math.min(discount, parseFloat(String(promoRow.max_discount_amount)));
    }
  } else {
    discount = parseFloat(String(promoRow.discount_value || promoRow.value || 0));
    discount = Math.min(discount, sub);
  }

  return roundMoney(discount);
}

/**
 * Server-authoritative member + promo discount for storefront checkout.
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {{ customerEmail?: string, subtotal?: number, promoCode?: string, memberPricingRequested?: boolean }} opts
 */
export async function resolveStorefrontOrderDiscount(client, businessId, opts = {}) {
  const subtotal = parseFloat(opts.subtotal) || 0;
  const customerEmail = String(opts.customerEmail || '').trim();
  const promoCode = String(opts.promoCode || '').trim();
  const memberPricingRequested = Boolean(opts.memberPricingRequested);

  const empty = {
    discountAmount: 0,
    memberDiscount: 0,
    promoDiscount: 0,
    promoCode: null,
    promoSource: null,
    memberPlanName: null,
    memberPercent: null,
  };

  if (subtotal <= 0) return empty;

  let memberDiscount = 0;
  let memberPlanName = null;
  let memberPercent = null;

  if (memberPricingRequested && customerEmail) {
    const memberResult = await resolveMemberStorefrontDiscount(
      client,
      businessId,
      customerEmail,
      subtotal
    );
    if (memberResult) {
      memberDiscount = memberResult.discount;
      memberPlanName = memberResult.planName;
      memberPercent = memberResult.percent;
    }
  }

  let promoDiscount = 0;
  let resolvedPromoCode = null;
  let promoSource = null;
  let promoRowRef = null;

  if (promoCode) {
    const lookup = await lookupStorefrontPromoRow(client, businessId, promoCode);
    if (!lookup?.row) {
      const err = new Error('Invalid or expired promo code');
      err.code = 'INVALID_PROMO';
      throw err;
    }

    const promoRow = lookup.row;
    if (isMemberOnlyPromo(promoRow)) {
      if (!customerEmail) {
        const err = new Error('Enter your email to use this members-only promo code');
        err.code = 'MEMBER_PROMO_EMAIL';
        throw err;
      }
      const isMember = await customerHasActiveMembership(client, businessId, customerEmail);
      if (!isMember) {
        const err = new Error('This promo code is for active members only');
        err.code = 'MEMBER_PROMO_FORBIDDEN';
        throw err;
      }
    }

    if (promoRow.min_order_amount && subtotal < parseFloat(String(promoRow.min_order_amount))) {
      const err = new Error(
        `This code requires a minimum order of ${parseFloat(String(promoRow.min_order_amount)).toLocaleString()}`
      );
      err.code = 'PROMO_MIN_ORDER';
      throw err;
    }

    promoDiscount = calculateStorefrontPromoDiscount(promoRow, subtotal);
    resolvedPromoCode = promoRow.code;
    promoSource = lookup.source;
    promoRowRef = promoRow;
  }

  const discountAmount = roundMoney(Math.min(subtotal, memberDiscount + promoDiscount));

  return {
    discountAmount,
    memberDiscount: roundMoney(memberDiscount),
    promoDiscount: roundMoney(promoDiscount),
    promoCode: resolvedPromoCode,
    promoSource,
    promoRow: promoRowRef,
    memberPlanName,
    memberPercent,
  };
}

/**
 * Increment promo usage after a successful order (best-effort).
 * @param {import('pg').PoolClient} client
 * @param {string} source
 * @param {string} promoId
 */
export async function incrementStorefrontPromoUsage(client, source, promoId) {
  if (!source || !promoId) return;
  const table = source === 'coupons' ? 'coupons' : 'discount_codes';
  try {
    await client.query(
      `UPDATE ${table}
       SET used_count = COALESCE(used_count, 0) + 1, updated_at = NOW()
       WHERE id = $1`,
      [promoId]
    );
  } catch {
    // non-fatal when table/column missing
  }
}
