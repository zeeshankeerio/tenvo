import { planHasFeatureWithPackaging } from '@/lib/subscription/effectivePlanAccess';
import { resolveMembershipVerticalKey } from '@/lib/memberships/membershipVertical';

function mergeBusinessSettings(row) {
  const base =
    row?.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
      ? row.settings
      : {};
  const nested =
    row?.business_settings && typeof row.business_settings === 'object'
      ? row.business_settings
      : {};
  return { ...nested, ...base };
}

/**
 * Whether tenant membership management is enabled for this business.
 * Requires membership vertical + plan/packaging feature flag.
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 */
export async function isMembershipEnabledForBusiness(client, businessId) {
  const res = await client.query(
    `SELECT b.plan_tier, b.category, b.settings, bs.settings AS business_settings
     FROM businesses b
     LEFT JOIN business_settings bs ON bs.business_id = b.id
     WHERE b.id = $1::uuid`,
    [businessId]
  );
  if (!res.rows.length) return false;

  const row = res.rows[0];
  if (!resolveMembershipVerticalKey(row.category)) return false;

  const settings = mergeBusinessSettings(row);
  return planHasFeatureWithPackaging(
    row.plan_tier || 'free',
    'membership_management',
    settings
  );
}

/**
 * Safe check — returns false if membership tables are missing (pre-migration).
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 */
export async function isMembershipEnabledSafe(client, businessId) {
  try {
    return await isMembershipEnabledForBusiness(client, businessId);
  } catch (err) {
    if (err?.code === '42P01') return false;
    throw err;
  }
}
