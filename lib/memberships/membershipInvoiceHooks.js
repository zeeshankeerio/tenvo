import { MembershipService } from '@/lib/services/MembershipService';
import { isMembershipEnabledSafe } from '@/lib/memberships/membershipFeatureGate';

/**
 * Non-fatal invoice hooks for membership renewals — never throw to callers.
 */

/**
 * When a membership-linked invoice is fully paid, resume paused memberships and record renewal.
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string} invoiceId
 * @param {string | null} [userId]
 */
export async function onMembershipInvoicePaid(client, businessId, invoiceId, userId = null) {
  try {
    const enabled = await isMembershipEnabledSafe(client, businessId);
    if (!enabled) return { handled: false, skipped: 'feature_disabled' };

    return await MembershipService.handleMembershipInvoicePaid(
      businessId,
      invoiceId,
      client,
      userId
    );
  } catch (err) {
    console.warn('[membership] onMembershipInvoicePaid failed (non-fatal):', err?.message || err);
    return { handled: false, error: err?.message };
  }
}
