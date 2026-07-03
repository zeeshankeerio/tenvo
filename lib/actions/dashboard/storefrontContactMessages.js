'use server';

import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import {
  CONTACT_CLOSED_STATUSES,
  CONTACT_PENDING_STATUSES,
} from '@/lib/dashboard/domainOperationsSubjects';

const ALLOWED_STATUSES = new Set([
  ...CONTACT_PENDING_STATUSES,
  ...CONTACT_CLOSED_STATUSES,
]);

/**
 * Fetch storefront contact messages (customer inquiries inbox) with full body.
 *
 * Returns the complete message so the hub has a dedicated place to read exactly
 * what the customer is asking, unlike the compact operations queue which omits
 * contact details and the message body.
 *
 * @param {string} businessId
 * @param {Object} [options]
 * @param {string} [options.status] - 'all' | 'pending' | 'closed' | specific status
 * @param {string} [options.search] - free-text match on name/email/subject/message
 * @param {number} [options.limit]
 */
export async function getStorefrontContactMessagesAction(businessId, options = {}) {
  const { status = 'all', search = '', limit = 200 } = options;

  const client = await pool.connect();
  try {
    await withGuard(businessId, {
      permission: 'orders.view',
      feature: 'storefront_orders',
      client,
    });

    const params = [businessId];
    const conditions = ['business_id = $1::uuid'];

    const normalizedStatus = String(status || 'all').trim().toLowerCase();
    if (normalizedStatus === 'pending') {
      params.push(CONTACT_PENDING_STATUSES);
      conditions.push(`LOWER(status) = ANY($${params.length}::text[])`);
    } else if (normalizedStatus === 'closed') {
      params.push(CONTACT_CLOSED_STATUSES);
      conditions.push(`LOWER(status) = ANY($${params.length}::text[])`);
    } else if (normalizedStatus !== 'all' && ALLOWED_STATUSES.has(normalizedStatus)) {
      params.push(normalizedStatus);
      conditions.push(`LOWER(status) = $${params.length}`);
    }

    const trimmedSearch = String(search || '').trim();
    if (trimmedSearch) {
      params.push(`%${trimmedSearch.toLowerCase()}%`);
      const idx = params.length;
      conditions.push(
        `(LOWER(customer_name) LIKE $${idx} OR LOWER(customer_email) LIKE $${idx} OR LOWER(subject) LIKE $${idx} OR LOWER(message) LIKE $${idx} OR LOWER(COALESCE(order_number, '')) LIKE $${idx})`
      );
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
    params.push(safeLimit);

    const result = await client.query(
      `SELECT id, customer_name, customer_email, customer_phone, subject,
              message, order_number, status, handled_at, handled_by,
              created_at, updated_at
       FROM storefront_contact_messages
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );

    const countResult = await client.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE LOWER(status) = ANY($2::text[]))::int AS pending
       FROM storefront_contact_messages
       WHERE business_id = $1::uuid`,
      [businessId, CONTACT_PENDING_STATUSES]
    );

    return actionSuccess({
      messages: result.rows.map((row) => ({
        id: row.id,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        customerPhone: row.customer_phone,
        subject: row.subject,
        message: row.message,
        orderNumber: row.order_number,
        status: row.status,
        handledAt: row.handled_at,
        handledBy: row.handled_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      total: countResult.rows[0]?.total || 0,
      pending: countResult.rows[0]?.pending || 0,
    });
  } catch (error) {
    if (error?.code === '42P01') {
      console.warn('[getStorefrontContactMessagesAction] storefront_contact_messages missing — run migrations');
      return actionSuccess({ messages: [], total: 0, pending: 0 });
    }
    console.error('[getStorefrontContactMessagesAction]', error);
    return actionFailure('FETCH_FAILED', error.message || 'Could not load customer inquiries');
  } finally {
    client.release();
  }
}

/**
 * Update storefront contact message status (hub Operations request queue).
 * @param {string} businessId
 * @param {number} messageId
 * @param {string} [status]
 */
export async function updateStorefrontContactStatusAction(businessId, messageId, status = 'handled') {
  const normalizedStatus = String(status || 'handled').trim().toLowerCase();
  if (!ALLOWED_STATUSES.has(normalizedStatus)) {
    return actionFailure('INVALID_STATUS', 'Invalid contact message status');
  }

  const id = Number(messageId);
  if (!Number.isInteger(id) || id <= 0) {
    return actionFailure('INVALID_ID', 'Invalid contact message id');
  }

  const client = await pool.connect();
  try {
    const { session } = await withGuard(businessId, {
      permission: 'orders.edit',
      feature: 'storefront_orders',
      client,
    });

    const isClosed = CONTACT_CLOSED_STATUSES.includes(normalizedStatus);
    const result = await client.query(
      `UPDATE storefront_contact_messages
       SET status = $3,
           handled_at = CASE WHEN $4::boolean THEN COALESCE(handled_at, NOW()) ELSE NULL END,
           handled_by = CASE WHEN $4::boolean THEN COALESCE(handled_by, $5) ELSE NULL END,
           updated_at = NOW()
       WHERE id = $1 AND business_id = $2::uuid
       RETURNING id, status, handled_at`,
      [id, businessId, normalizedStatus, isClosed, session?.user?.id || null]
    );

    if (!result.rowCount) {
      return actionFailure('NOT_FOUND', 'Contact message not found');
    }

    return actionSuccess({
      id: result.rows[0].id,
      status: result.rows[0].status,
      handledAt: result.rows[0].handled_at,
    });
  } catch (error) {
    console.error('[updateStorefrontContactStatusAction]', error);
    return actionFailure('UPDATE_FAILED', error.message || 'Could not update contact message');
  } finally {
    client.release();
  }
}
