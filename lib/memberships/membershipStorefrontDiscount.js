import { isMembershipEnabledSafe } from '@/lib/memberships/membershipFeatureGate';
import { MEMBERSHIP_BENEFIT_TYPE } from '@/lib/memberships/membershipBenefits';
import { MEMBERSHIP_STATUS } from '@/lib/memberships/membershipConstants';

function parseJsonField(val) {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
}

function parsePromoMetadata(row) {
  const raw = row?.metadata ?? row?.domain_data ?? row?.settings;
  return parseJsonField(raw);
}

/**
 * Whether a promo row is restricted to active members.
 * @param {Record<string, unknown> | null | undefined} promoRow
 */
export function isMemberOnlyPromo(promoRow) {
  const meta = parsePromoMetadata(promoRow);
  return Boolean(meta.member_only ?? meta.membersOnly ?? meta.memberOnly);
}

/**
 * Resolve active membership + best shop discount percent for a storefront buyer email.
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string | null | undefined} customerEmail
 * @param {number} subtotal
 */
export async function resolveMemberStorefrontDiscount(client, businessId, customerEmail, subtotal) {
  const email = String(customerEmail || '').trim().toLowerCase();
  if (!email) return null;

  const enabled = await isMembershipEnabledSafe(client, businessId);
  if (!enabled) return null;

  const sub = parseFloat(subtotal) || 0;
  if (sub <= 0) return null;

  let membershipRow = null;
  try {
    const res = await client.query(
      `SELECT cm.id, cm.plan_id, mp.name AS plan_name
       FROM customers c
       JOIN customer_memberships cm
         ON cm.customer_id = c.id AND cm.business_id = c.business_id
       JOIN membership_plans mp
         ON mp.id = cm.plan_id AND mp.business_id = cm.business_id
       WHERE c.business_id = $1::uuid
         AND lower(trim(c.email)) = $2
         AND cm.status = $3
       ORDER BY cm.started_at DESC
       LIMIT 1`,
      [businessId, email, MEMBERSHIP_STATUS.ACTIVE]
    );
    membershipRow = res.rows[0] || null;
  } catch (err) {
    if (err?.code === '42P01') return null;
    throw err;
  }

  if (!membershipRow) return null;

  let benefitRows = [];
  try {
    const benefitsRes = await client.query(
      `SELECT benefit_type, value
       FROM membership_benefits
       WHERE business_id = $1::uuid
         AND plan_id = $2::uuid
         AND is_active = true
         AND benefit_type = $3`,
      [businessId, membershipRow.plan_id, MEMBERSHIP_BENEFIT_TYPE.DISCOUNT_PERCENT]
    );
    benefitRows = benefitsRes.rows;
  } catch (err) {
    if (err?.code === '42P01') benefitRows = [];
    else throw err;
  }

  let maxPct = 0;
  for (const row of benefitRows) {
    const value = parseJsonField(row.value);
    const pct = Number(value.percent || 0);
    if (pct > maxPct) maxPct = pct;
  }

  if (maxPct <= 0) return null;

  const discount = Math.round(((sub * maxPct) / 100) * 100) / 100;
  return {
    discount,
    percent: maxPct,
    planName: membershipRow.plan_name,
    membershipId: membershipRow.id,
  };
}

/**
 * Verify buyer has an active membership (for member-only promo codes).
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string | null | undefined} customerEmail
 */
export async function customerHasActiveMembership(client, businessId, customerEmail) {
  const email = String(customerEmail || '').trim().toLowerCase();
  if (!email) return false;

  const enabled = await isMembershipEnabledSafe(client, businessId);
  if (!enabled) return false;

  try {
    const res = await client.query(
      `SELECT 1
       FROM customers c
       JOIN customer_memberships cm
         ON cm.customer_id = c.id AND cm.business_id = c.business_id
       WHERE c.business_id = $1::uuid
         AND lower(trim(c.email)) = $2
         AND cm.status = $3
       LIMIT 1`,
      [businessId, email, MEMBERSHIP_STATUS.ACTIVE]
    );
    return res.rows.length > 0;
  } catch (err) {
    if (err?.code === '42P01') return false;
    throw err;
  }
}
