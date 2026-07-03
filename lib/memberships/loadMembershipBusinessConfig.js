import { getMembershipConfig } from '@/lib/memberships/membershipVertical';

function parseJsonField(val) {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
}

/**
 * Load tenant membership settings from DB (server-side).
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 */
export async function loadMembershipBusinessConfig(client, businessId) {
  try {
    const res = await client.query(
      `SELECT category, settings FROM businesses WHERE id = $1::uuid LIMIT 1`,
      [businessId]
    );
    if (!res.rows.length) return getMembershipConfig({});
    const row = res.rows[0];
    row.settings = parseJsonField(row.settings);
    return getMembershipConfig(row);
  } catch (err) {
    if (err?.code === '42P01') return getMembershipConfig({});
    throw err;
  }
}
