/**
 * Billing role guard — ensures only business owners and admins can perform
 * subscription mutations (checkout, update, cancel, billing portal).
 *
 * This wraps the lower-level `assertUserHasBusinessAccess` check and adds
 * a role tier: only `owner` and `admin` roles (plus platform-level users)
 * are allowed to mutate billing.
 */
import 'server-only';
import pool from '@/lib/db';
import { isPlatformLevel } from '@/lib/config/platform';

/** Roles that may perform billing mutations. */
const BILLING_ALLOWED_ROLES = new Set(['owner', 'admin']);

/**
 * Assert the calling user has owner or admin role within the business,
 * or is a platform-level user. Returns an `{ allowed, error }` object
 * so callers can return the right HTTP response.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.businessId
 * @param {object} [params.sessionUser] - Better Auth user object
 * @returns {Promise<{ allowed: boolean; error?: string }>}
 */
export async function assertBillingRole({ userId, businessId, sessionUser }) {
  if (!userId || !businessId) {
    return { allowed: false, error: 'Missing user or business identifier.' };
  }

  // Platform-level users (owner email or BetterAuth admin role) bypass all checks.
  if (sessionUser && isPlatformLevel(sessionUser)) {
    return { allowed: true };
  }

  const client = await pool.connect();
  try {
    // Check business_users first (all team members)
    const memberRes = await client.query(
      `SELECT role FROM business_users
       WHERE user_id = $1 AND business_id = $2 AND status = 'active'
       LIMIT 1`,
      [userId, businessId]
    );

    if (memberRes.rows.length > 0) {
      const role = memberRes.rows[0].role;
      if (BILLING_ALLOWED_ROLES.has(role)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        error: `Billing management requires the owner or admin role. Your current role is "${role}".`,
      };
    }

    // Fallback: primary owner without a business_users row
    const ownerRes = await client.query(
      `SELECT id FROM businesses WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [businessId, userId]
    );

    if (ownerRes.rows.length > 0) {
      return { allowed: true };
    }

    return { allowed: false, error: 'You do not have access to this business.' };
  } finally {
    client.release();
  }
}
