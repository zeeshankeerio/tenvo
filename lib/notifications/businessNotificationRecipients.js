import 'server-only';
import pool from '@/lib/db';

const OWNER_ROLES = ['owner'];
const MERCHANT_ALERT_ROLES = ['owner', 'admin'];

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) return '';
  return trimmed;
}

/**
 * Active business owners/admins for tenant-scoped merchant alerts (orders, contact).
 * Never uses businesses.email alone — that field can be stale or shared across demos.
 *
 * @param {string} businessId
 * @param {{
 *   client?: import('pg').PoolClient,
 *   roles?: string[],
 *   fallbackBusinessEmail?: string | null,
 * }} [options]
 * @returns {Promise<string[]>}
 */
export async function resolveBusinessMerchantAlertEmails(
  businessId,
  { client: existingClient = null, roles = MERCHANT_ALERT_ROLES, fallbackBusinessEmail = null } = {}
) {
  if (!businessId) return [];

  const shouldRelease = !existingClient;
  const client = existingClient || (await pool.connect());

  try {
    const memberResult = await client.query(
      `SELECT DISTINCT LOWER(TRIM(u.email)) AS email
       FROM business_users bu
       INNER JOIN "user" u ON u.id = bu.user_id
       WHERE bu.business_id = $1::uuid
         AND COALESCE(bu.status, 'active') = 'active'
         AND bu.role = ANY($2::text[])
         AND u.email IS NOT NULL
         AND TRIM(u.email) <> ''`,
      [businessId, roles]
    );

    const emails = memberResult.rows
      .map((row) => normalizeEmail(row.email))
      .filter(Boolean);

    if (emails.length > 0) {
      return [...new Set(emails)];
    }

    const creatorResult = await client.query(
      `SELECT LOWER(TRIM(u.email)) AS email
       FROM businesses b
       INNER JOIN "user" u ON u.id = b.user_id
       WHERE b.id = $1::uuid
         AND u.email IS NOT NULL
         AND TRIM(u.email) <> ''
       LIMIT 1`,
      [businessId]
    );

    const creatorEmail = normalizeEmail(creatorResult.rows[0]?.email);
    if (creatorEmail) {
      return [creatorEmail];
    }

    const fallback = normalizeEmail(fallbackBusinessEmail);
    return fallback ? [fallback] : [];
  } finally {
    if (shouldRelease) client.release();
  }
}

export { OWNER_ROLES, MERCHANT_ALERT_ROLES };
