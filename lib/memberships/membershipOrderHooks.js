import { MembershipService } from '@/lib/services/MembershipService';
import { isMembershipEnabledSafe } from '@/lib/memberships/membershipFeatureGate';

/**
 * Non-fatal storefront order hooks — never throw to callers; log and continue.
 */

/**
 * Activate pending memberships when an order is marked paid.
 * @param {import('pg').PoolClient} client — active transaction
 * @param {string} businessId
 * @param {number} orderId
 * @param {string | null} [userId]
 */
export async function onStorefrontOrderPaid(client, businessId, orderId, userId = null) {
  try {
    const enabled = await isMembershipEnabledSafe(client, businessId);
    if (!enabled) return { activated: 0, skipped: 'feature_disabled' };

    return await MembershipService.activatePendingForStorefrontOrder(
      businessId,
      orderId,
      client,
      userId
    );
  } catch (err) {
    console.warn('[membership] onStorefrontOrderPaid failed (non-fatal):', err?.message || err);
    return { activated: 0, error: err?.message };
  }
}

/**
 * Cancel pending memberships when a storefront order is cancelled (before activation).
 * When `revokeActive` is true, also cancels active enrollments tied to the order (paid then cancelled).
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {number} orderId
 * @param {{ revokeActive?: boolean }} [options]
 */
export async function onStorefrontOrderCancelled(client, businessId, orderId, options = {}) {
  try {
    const enabled = await isMembershipEnabledSafe(client, businessId);
    if (!enabled) return { cancelled: 0, skipped: 'feature_disabled' };

    if (options.revokeActive) {
      return await MembershipService.revokeEnrollmentsForStorefrontOrder(
        businessId,
        orderId,
        client,
        { includeActive: true, reason: 'storefront_order_cancelled_after_payment' }
      );
    }

    return await MembershipService.cancelPendingForStorefrontOrder(businessId, orderId, client);
  } catch (err) {
    console.warn('[membership] onStorefrontOrderCancelled failed (non-fatal):', err?.message || err);
    return { cancelled: 0, error: err?.message };
  }
}

/**
 * Revoke active/pending memberships when a paid storefront order is refunded.
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {number} orderId
 */
export async function onStorefrontOrderRefunded(client, businessId, orderId) {
  try {
    const enabled = await isMembershipEnabledSafe(client, businessId);
    if (!enabled) return { cancelled: 0, skipped: 'feature_disabled' };

    return await MembershipService.revokeEnrollmentsForStorefrontOrder(
      businessId,
      orderId,
      client,
      { includeActive: true, reason: 'storefront_order_refunded' }
    );
  } catch (err) {
    console.warn('[membership] onStorefrontOrderRefunded failed (non-fatal):', err?.message || err);
    return { cancelled: 0, error: err?.message };
  }
}

/**
 * Revoke memberships when a POS sale is fully refunded.
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string} posTransactionId
 */
export async function onPosTransactionFullyRefunded(client, businessId, posTransactionId) {
  try {
    const enabled = await isMembershipEnabledSafe(client, businessId);
    if (!enabled) return { cancelled: 0, skipped: 'feature_disabled' };

    return await MembershipService.revokeEnrollmentsForPosTransaction(
      businessId,
      posTransactionId,
      client
    );
  } catch (err) {
    console.warn('[membership] onPosTransactionFullyRefunded failed (non-fatal):', err?.message || err);
    return { cancelled: 0, error: err?.message };
  }
}

/**
 * Post-commit helper for Stripe webhook (runs outside Prisma tx).
 * @param {string} businessId
 * @param {number} orderId
 */
export async function onStorefrontOrderPaidAsync(businessId, orderId) {
  const pool = (await import('@/lib/db')).default;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await onStorefrontOrderPaid(client, businessId, orderId, null);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    console.warn('[membership] onStorefrontOrderPaidAsync failed:', err?.message || err);
    return { activated: 0, error: err?.message };
  } finally {
    client.release();
  }
}
