/**
 * Daily storefront analytics rollups (`storefront_analytics`).
 * Powers hub Operations tab visitors, conversion, and channel trends.
 */

let visitorsColumnEnsured = false;

/**
 * @param {import('pg').PoolClient} client
 */
async function ensureVisitorsColumn(client) {
  if (visitorsColumnEnsured) return;
  try {
    await client.query(
      `ALTER TABLE storefront_analytics ADD COLUMN IF NOT EXISTS visitors INTEGER DEFAULT 0`
    );
    visitorsColumnEnsured = true;
  } catch (err) {
    if (err?.code !== '42501') throw err;
  }
}

/**
 * Upsert daily storefront stats (visitors, orders, revenue).
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {{ visitorsDelta?: number; ordersDelta?: number; revenueDelta?: number }} deltas
 */
export async function upsertStorefrontDailyStats(client, businessId, deltas = {}) {
  const visitorsDelta = Math.max(0, Number(deltas.visitorsDelta) || 0);
  const ordersDelta = Math.max(0, Number(deltas.ordersDelta) || 0);
  const revenueDelta = Math.max(0, Number(deltas.revenueDelta) || 0);

  if (visitorsDelta === 0 && ordersDelta === 0 && revenueDelta === 0) return;

  await ensureVisitorsColumn(client);

  try {
    await client.query(
      `INSERT INTO storefront_analytics (id, business_id, date, visitors, orders_count, revenue, created_at, updated_at)
       VALUES (uuid_generate_v4(), $1::uuid, CURRENT_DATE, $2::int, $3::int, $4::numeric, NOW(), NOW())
       ON CONFLICT (business_id, date)
       DO UPDATE SET
         visitors = COALESCE(storefront_analytics.visitors, 0) + EXCLUDED.visitors,
         orders_count = COALESCE(storefront_analytics.orders_count, 0) + EXCLUDED.orders_count,
         revenue = COALESCE(storefront_analytics.revenue, 0) + EXCLUDED.revenue,
         updated_at = NOW()`,
      [businessId, visitorsDelta, ordersDelta, revenueDelta]
    );
  } catch (err) {
    if (err?.code === '42P01') return;
    if (err?.code === '42703') {
      await client.query(
        `INSERT INTO storefront_analytics (business_id, date, orders_count, revenue, created_at, updated_at)
         VALUES ($1::uuid, CURRENT_DATE, $2::int, $3::numeric, NOW(), NOW())
         ON CONFLICT (business_id, date)
         DO UPDATE SET
           orders_count = COALESCE(storefront_analytics.orders_count, 0) + EXCLUDED.orders_count,
           revenue = COALESCE(storefront_analytics.revenue, 0) + EXCLUDED.revenue,
           updated_at = NOW()`,
        [businessId, ordersDelta, revenueDelta]
      );
      return;
    }
    throw err;
  }
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 */
export async function recordStorefrontVisit(client, businessId) {
  await upsertStorefrontDailyStats(client, businessId, { visitorsDelta: 1 });
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {number} orderTotal
 */
export async function recordStorefrontOrderAnalytics(client, businessId, orderTotal) {
  await upsertStorefrontDailyStats(client, businessId, {
    ordersDelta: 1,
    revenueDelta: Number(orderTotal) || 0,
  });
}
