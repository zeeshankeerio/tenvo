/**
 * Concurrency-safe storefront order numbers.
 *
 * Uses pg_advisory_xact_lock scoped by business + date so concurrent checkouts
 * (Customer A, B, C on the same store) never receive the same sequence.
 * Must be called inside an open transaction (same client as INSERT).
 *
 * Format: ORD-{tenantKey8}-YYYYMMDD-XXXX (daily sequence per business).
 * tenantKey8 is derived from business UUID so order numbers cannot collide
 * across tenants even if a legacy global unique index on order_number exists.
 * Legacy ORD-YYYYMMDD-XXXX rows still count toward the daily sequence.
 */

/**
 * @param {string} businessId
 * @returns {string}
 */
export function storefrontOrderTenantKey(businessId) {
  return String(businessId || '')
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase();
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @returns {Promise<string>}
 */
export async function generateStorefrontOrderNumber(client, businessId) {
  if (!client) throw new Error('Database client is required');
  if (!businessId) throw new Error('businessId is required');

  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const tenantKey = storefrontOrderTenantKey(businessId);
  const prefix = `ORD-${tenantKey}-${datePrefix}-`;
  const lockKey = `${businessId}:storefront_orders:order_number:${datePrefix}`;

  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey]);

  const result = await client.query(
    `SELECT COALESCE(
      MAX(
        CASE
          WHEN order_number ~ ('^ORD-' || $2 || '-' || $3 || '-[0-9]+$')
          THEN CAST(SPLIT_PART(order_number, '-', 4) AS INTEGER)
          WHEN order_number ~ ('^ORD-' || $3 || '-[0-9]+$')
          THEN CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)
          ELSE NULL
        END
      ),
      0
    ) + 1 AS next_seq
    FROM storefront_orders
    WHERE business_id = $1::uuid
      AND (
        order_number LIKE ('ORD-' || $2 || '-' || $3 || '-%')
        OR order_number LIKE ('ORD-' || $3 || '-%')
      )`,
    [businessId, tenantKey, datePrefix]
  );

  const nextSeq = Number(result.rows[0]?.next_seq);
  if (!Number.isFinite(nextSeq) || nextSeq < 1) {
    throw new Error('Failed to allocate storefront order sequence');
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Detect duplicate order_number constraint violations (Postgres 23505).
 * @param {unknown} error
 */
export function isStorefrontOrderNumberConflict(error) {
  if (!error || typeof error !== 'object') return false;
  const pgError = /** @type {{ code?: string; constraint?: string; message?: string; detail?: string }} */ (error);
  if (pgError.code !== '23505') return false;
  const target = `${pgError.constraint || ''} ${pgError.message || ''} ${pgError.detail || ''}`.toLowerCase();
  return target.includes('order_number');
}
