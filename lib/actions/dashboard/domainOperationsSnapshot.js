'use server';

import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { resolveAnalyticsRange } from '@/lib/utils/analyticsRange';
import { serializeDecimalsDeep } from '@/lib/utils/serializePrismaDecimals';
import { resolveOperationsProfile } from '@/lib/dashboard/domainOperationsIntelligence';
import { getDomainKnowledgeForBusiness, getBusinessRegionalPack } from '@/lib/utils/businessRegionalContext';
import { isMembershipRelevant } from '@/lib/config/domains';
import {
  BOOKING_LEAD_SUBJECTS,
  PRESCRIPTION_SUBJECTS,
  CONTACT_PENDING_STATUSES,
  sqlStatusInList,
  sqlStringInList,
} from '@/lib/dashboard/domainOperationsSubjects';
import {
  INVOICE_SALE_FILTER,
  POS_SALE_FILTER,
  STOREFRONT_GROSS_SALE_FILTER,
  STOREFRONT_PAID_FILTER,
} from '@/lib/analytics/salesInsights';

const SERVICE_UNITS_SQL = `('procedure', 'visit', 'service', 'case', 'session')`;
const PRESCRIPTION_ONLY_SQL = sqlStringInList(['prescription']);
const REFILL_ONLY_SQL = sqlStringInList(['refill']);
const BOOKING_SQL = sqlStringInList(BOOKING_LEAD_SUBJECTS);
const ALL_LEADS_SQL = sqlStringInList([...PRESCRIPTION_SUBJECTS, ...BOOKING_LEAD_SUBJECTS]);
const PENDING_STATUS_SQL = sqlStatusInList(CONTACT_PENDING_STATUSES);

/**
 * @param {import('pg').PoolClient} client
 * @param {string} sql
 * @param {unknown[]} params
 */
async function safeQuery(client, sql, params = []) {
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } catch (err) {
    if (err?.code === '42P01') return null;
    throw err;
  }
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 */
async function fetchBusinessRow(client, businessId) {
  const result = await client.query(
    `SELECT id, country, category, settings, currency
     FROM businesses
     WHERE id = $1::uuid
     LIMIT 1`,
    [businessId]
  );
  return result.rows[0] || null;
}

/**
 * Domain operations snapshot for the Easy dashboard Operations tab.
 * @param {string} businessId
 * @param {{ from?: unknown; to?: unknown; category?: string }} [filter]
 */
export async function getDomainOperationsSnapshotAction(businessId, filter = {}) {
  const client = await pool.connect();
  try {
    await withGuard(businessId, { permission: 'analytics.basic', feature: 'ai_analytics', client });

    const businessRow = await fetchBusinessRow(client, businessId);
    const category = String(filter.category || businessRow?.category || '');
    const domainKnowledge = getDomainKnowledgeForBusiness(category, businessRow || businessId);
    const profile = resolveOperationsProfile(category, domainKnowledge, businessRow);
    const regionalPack = getBusinessRegionalPack(businessRow);

    const { from, to } = resolveAnalyticsRange(filter);

    const storefrontRows = await client.query(
      `SELECT
        COUNT(*) FILTER (WHERE ${STOREFRONT_GROSS_SALE_FILTER}) AS orders_total,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(o.status, '')) IN ('pending', 'processing')) AS orders_pending,
        COALESCE(SUM(o.total_amount) FILTER (WHERE ${STOREFRONT_GROSS_SALE_FILTER}), 0) AS revenue,
        COALESCE(SUM(o.total_amount) FILTER (WHERE ${STOREFRONT_PAID_FILTER}), 0) AS paid_revenue
      FROM storefront_orders o
      WHERE o.business_id = $1::uuid
        AND o.created_at::date BETWEEN $2::date AND $3::date`,
      [businessId, from, to]
    );
    const sf = storefrontRows.rows[0] || {};

    const orderDailyRows = await client.query(
      `SELECT
        o.created_at::date AS day,
        COUNT(*) FILTER (WHERE ${STOREFRONT_GROSS_SALE_FILTER}) AS orders,
        COALESCE(SUM(o.total_amount) FILTER (WHERE ${STOREFRONT_GROSS_SALE_FILTER}), 0) AS revenue
      FROM storefront_orders o
      WHERE o.business_id = $1::uuid
        AND o.created_at::date BETWEEN $2::date AND $3::date
      GROUP BY 1
      ORDER BY 1`,
      [businessId, from, to]
    );

    let visitors = 0;
    let visitorsTracked = false;
    let analyticsDaily = [];
    const analyticsRows = await safeQuery(
      client,
      `SELECT
        date::date AS day,
        COALESCE(visitors, 0) AS visitors,
        COALESCE(orders_count, 0) AS orders_count,
        COALESCE(revenue, 0) AS revenue
      FROM storefront_analytics
      WHERE business_id = $1::uuid
        AND date BETWEEN $2::date AND $3::date
      ORDER BY date`,
      [businessId, from, to]
    );
    if (analyticsRows) {
      analyticsDaily = analyticsRows;
      visitors = analyticsRows.reduce((sum, row) => sum + parseInt(row.visitors || 0, 10), 0);
      visitorsTracked = visitors > 0;
    }

    const dailyTrendMap = new Map();
    for (const row of orderDailyRows.rows) {
      const key = String(row.day).slice(0, 10);
      dailyTrendMap.set(key, {
        date: row.day,
        orders: parseInt(row.orders || 0, 10),
        revenue: parseFloat(row.revenue || 0),
        visitors: 0,
      });
    }
    for (const row of analyticsDaily) {
      const key = String(row.day).slice(0, 10);
      const existing = dailyTrendMap.get(key) || {
        date: row.day,
        orders: 0,
        revenue: parseFloat(row.revenue || 0),
        visitors: 0,
      };
      existing.visitors = parseInt(row.visitors || 0, 10);
      dailyTrendMap.set(key, existing);
    }
    const dailyTrend = [...dailyTrendMap.values()].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const contactAgg = await safeQuery(
      client,
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status, 'new')) IN (${PENDING_STATUS_SQL})) AS pending_count,
        COUNT(*) FILTER (WHERE LOWER(subject) IN (${PRESCRIPTION_ONLY_SQL}) AND LOWER(COALESCE(status, 'new')) IN (${PENDING_STATUS_SQL})) AS prescription_pending,
        COUNT(*) FILTER (WHERE LOWER(subject) IN (${REFILL_ONLY_SQL}) AND LOWER(COALESCE(status, 'new')) IN (${PENDING_STATUS_SQL})) AS refill_pending,
        COUNT(*) FILTER (WHERE LOWER(subject) IN (${BOOKING_SQL}) AND LOWER(COALESCE(status, 'new')) IN (${PENDING_STATUS_SQL})) AS lead_pending,
        COUNT(*) FILTER (WHERE LOWER(subject) NOT IN (${ALL_LEADS_SQL}) AND LOWER(COALESCE(status, 'new')) IN (${PENDING_STATUS_SQL})) AS general_pending
      FROM storefront_contact_messages
      WHERE business_id = $1::uuid
        AND created_at::date BETWEEN $2::date AND $3::date`,
      [businessId, from, to]
    );
    const contactsBase = contactAgg?.[0] || {};

    const contactRecent = await safeQuery(
      client,
      `SELECT id, customer_name, subject, status, created_at
      FROM storefront_contact_messages
      WHERE business_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 8`,
      [businessId]
    );

    let pharmacy = { nearExpiryBatches: 0, criticalExpiryBatches: 0 };
    if (profile.showExpiry) {
      const expiryRows = await client.query(
        `SELECT
          COUNT(*) FILTER (WHERE pb.expiry_date IS NOT NULL AND pb.expiry_date::date <= (CURRENT_DATE + INTERVAL '90 days')) AS near_expiry,
          COUNT(*) FILTER (WHERE pb.expiry_date IS NOT NULL AND pb.expiry_date::date <= (CURRENT_DATE + INTERVAL '30 days')) AS critical_expiry
        FROM product_batches pb
        WHERE pb.business_id = $1::uuid
          AND pb.is_deleted = false
          AND COALESCE(pb.is_active, true) = true
          AND pb.expiry_date IS NOT NULL`,
        [businessId]
      );
      pharmacy = {
        nearExpiryBatches: parseInt(expiryRows.rows[0]?.near_expiry || 0, 10),
        criticalExpiryBatches: parseInt(expiryRows.rows[0]?.critical_expiry || 0, 10),
      };
    }

    const channelRows = await client.query(
      `SELECT
        (SELECT COALESCE(SUM(i.grand_total), 0) FROM invoices i
         WHERE i.business_id = $1 AND ${INVOICE_SALE_FILTER}
           AND i.date::date BETWEEN $2::date AND $3::date) AS invoice_revenue,
        (SELECT COALESCE(SUM(pt.total_amount), 0) FROM pos_transactions pt
         WHERE pt.business_id = $1 AND ${POS_SALE_FILTER}
           AND pt.created_at::date BETWEEN $2::date AND $3::date) AS pos_revenue,
        (SELECT COALESCE(SUM(o.total_amount), 0) FROM storefront_orders o
         WHERE o.business_id = $1 AND ${STOREFRONT_GROSS_SALE_FILTER}
           AND o.created_at::date BETWEEN $2::date AND $3::date) AS storefront_revenue`,
      [businessId, from, to]
    );
    const channels = channelRows.rows[0] || {};

    let serviceMix = {
      serviceRevenue: 0,
      retailRevenue: 0,
      topCategories: [],
    };
    if (profile.showServiceMix) {
      const mixRows = await client.query(
        `SELECT
          COALESCE(SUM(
            CASE WHEN LOWER(COALESCE(p.unit, '')) IN ${SERVICE_UNITS_SQL}
              THEN COALESCE(ii.total_amount, ii.quantity * ii.unit_price, 0) ELSE 0 END
          ), 0) AS service_revenue,
          COALESCE(SUM(
            CASE WHEN LOWER(COALESCE(p.unit, '')) NOT IN ${SERVICE_UNITS_SQL}
              THEN COALESCE(ii.total_amount, ii.quantity * ii.unit_price, 0) ELSE 0 END
          ), 0) AS retail_revenue
        FROM invoice_items ii
        JOIN invoices i ON i.id = ii.invoice_id AND i.business_id = ii.business_id
        LEFT JOIN products p ON p.id = ii.product_id AND p.business_id = ii.business_id
        WHERE ii.business_id = $1::uuid
          AND ${INVOICE_SALE_FILTER}
          AND i.date::date BETWEEN $2::date AND $3::date`,
        [businessId, from, to]
      );
      const topCatRows = await client.query(
        `SELECT
          COALESCE(NULLIF(TRIM(p.category), ''), 'Other') AS name,
          COUNT(*)::int AS line_count,
          COALESCE(SUM(COALESCE(ii.total_amount, ii.quantity * ii.unit_price, 0)), 0) AS revenue
        FROM invoice_items ii
        JOIN invoices i ON i.id = ii.invoice_id AND i.business_id = ii.business_id
        LEFT JOIN products p ON p.id = ii.product_id AND p.business_id = ii.business_id
        WHERE ii.business_id = $1::uuid
          AND ${INVOICE_SALE_FILTER}
          AND i.date::date BETWEEN $2::date AND $3::date
        GROUP BY 1
        ORDER BY revenue DESC
        LIMIT 5`,
        [businessId, from, to]
      );
      serviceMix = {
        serviceRevenue: parseFloat(mixRows.rows[0]?.service_revenue || 0),
        retailRevenue: parseFloat(mixRows.rows[0]?.retail_revenue || 0),
        topCategories: topCatRows.rows.map((row) => ({
          name: row.name,
          count: parseInt(row.line_count || 0, 10),
          revenue: parseFloat(row.revenue || 0),
        })),
      };
    }

    let hospitality = { openOrders: 0, completedOrders: 0, revenue: 0 };
    if (profile.showHospitality) {
      const hospRows = await safeQuery(
        client,
        `SELECT
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) NOT IN ('completed', 'cancelled', 'voided')) AS open_orders,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'completed') AS completed_orders,
          COALESCE(SUM(total_amount) FILTER (WHERE LOWER(COALESCE(status, '')) NOT IN ('cancelled', 'voided')), 0) AS revenue
        FROM restaurant_orders
        WHERE business_id = $1::uuid
          AND created_at::date BETWEEN $2::date AND $3::date`,
        [businessId, from, to]
      );
      if (hospRows?.[0]) {
        hospitality = {
          openOrders: parseInt(hospRows[0].open_orders || 0, 10),
          completedOrders: parseInt(hospRows[0].completed_orders || 0, 10),
          revenue: parseFloat(hospRows[0].revenue || 0),
        };
      }
    }

    let manufacturing = { openWip: 0, completed: 0 };
    if (profile.showManufacturing) {
      const mfgRows = await safeQuery(
        client,
        `SELECT
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('draft', 'scheduled', 'in_progress', 'processing', 'pending')) AS open_wip,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('completed', 'done', 'closed')) AS completed
        FROM production_orders
        WHERE business_id = $1::uuid
          AND created_at::date BETWEEN $2::date AND $3::date`,
        [businessId, from, to]
      );
      if (mfgRows?.[0]) {
        manufacturing = {
          openWip: parseInt(mfgRows[0].open_wip || 0, 10),
          completed: parseInt(mfgRows[0].completed || 0, 10),
        };
      }
    }

    const buyersRows = await client.query(
      `SELECT COUNT(DISTINCT x.customer_key) AS active_buyers FROM (
        SELECT COALESCE(i.customer_id::text, 'anon:' || i.id::text) AS customer_key
        FROM invoices i
        WHERE i.business_id = $1 AND ${INVOICE_SALE_FILTER}
          AND i.date::date BETWEEN $2::date AND $3::date
        UNION
        SELECT COALESCE(pt.customer_id::text, 'walkin:' || pt.id::text)
        FROM pos_transactions pt
        WHERE pt.business_id = $1 AND ${POS_SALE_FILTER}
          AND pt.created_at::date BETWEEN $2::date AND $3::date
        UNION
        SELECT COALESCE(NULLIF(TRIM(o.customer_email), ''), 'guest:' || o.id::text)
        FROM storefront_orders o
        WHERE o.business_id = $1 AND ${STOREFRONT_GROSS_SALE_FILTER}
          AND o.created_at::date BETWEEN $2::date AND $3::date
      ) x`,
      [businessId, from, to]
    );

    const collectionsRows = await client.query(
      `SELECT
        (
          SELECT COALESCE(SUM(i.grand_total), 0) FROM invoices i
          WHERE i.business_id = $1 AND ${INVOICE_SALE_FILTER}
            AND LOWER(COALESCE(i.payment_status, i.status, '')) IN ('paid', 'partial')
            AND i.date::date BETWEEN $2::date AND $3::date
        ) + (
          SELECT COALESCE(SUM(o.total_amount), 0) FROM storefront_orders o
          WHERE o.business_id = $1 AND ${STOREFRONT_PAID_FILTER}
            AND o.created_at::date BETWEEN $2::date AND $3::date
        ) + (
          SELECT COALESCE(SUM(pt.total_amount), 0) FROM pos_transactions pt
          WHERE pt.business_id = $1 AND ${POS_SALE_FILTER}
            AND pt.created_at::date BETWEEN $2::date AND $3::date
        ) AS total`,
      [businessId, from, to]
    );

    const recentPayments = await client.query(
      `SELECT name, source, amount, occurred_at FROM (
        SELECT COALESCE(c.name, 'Customer') AS name, 'Invoice' AS source,
          COALESCE(i.grand_total, 0) AS amount, i.date::timestamptz AS occurred_at
        FROM invoices i
        LEFT JOIN customers c ON c.id = i.customer_id AND c.business_id = i.business_id
        WHERE i.business_id = $1 AND ${INVOICE_SALE_FILTER}
          AND LOWER(COALESCE(i.payment_status, i.status, '')) IN ('paid', 'partial')
          AND i.date::date BETWEEN $2::date AND $3::date
        UNION ALL
        SELECT COALESCE(o.customer_name, o.customer_email, 'Guest') AS name, 'Storefront' AS source,
          COALESCE(o.total_amount, 0) AS amount, o.created_at AS occurred_at
        FROM storefront_orders o
        WHERE o.business_id = $1 AND ${STOREFRONT_PAID_FILTER}
          AND o.created_at::date BETWEEN $2::date AND $3::date
        UNION ALL
        SELECT COALESCE(c.name, 'Walk-in') AS name, 'POS' AS source,
          COALESCE(pt.total_amount, 0) AS amount, pt.created_at AS occurred_at
        FROM pos_transactions pt
        LEFT JOIN customers c ON c.id = pt.customer_id AND c.business_id = pt.business_id
        WHERE pt.business_id = $1 AND ${POS_SALE_FILTER}
          AND pt.created_at::date BETWEEN $2::date AND $3::date
      ) combined
      ORDER BY occurred_at DESC
      LIMIT 8`,
      [businessId, from, to]
    );

    const recentStoreOrders = await client.query(
      `SELECT
        COALESCE(o.customer_name, o.customer_email, 'Guest') AS customer_name,
        o.order_number,
        o.status,
        o.total_amount,
        o.created_at
      FROM storefront_orders o
      WHERE o.business_id = $1::uuid
        AND ${STOREFRONT_GROSS_SALE_FILTER}
      ORDER BY o.created_at DESC
      LIMIT 8`,
      [businessId]
    );

    const schedule = [
      ...(contactRecent || []).map((row) => ({
        kind: 'request',
        title: row.customer_name || 'Contact',
        meta: formatSubjectLabel(row.subject),
        status: row.status || 'new',
        occurredAt: row.created_at,
      })),
      ...recentStoreOrders.rows.map((row) => ({
        kind: 'order',
        title: row.customer_name || 'Guest',
        meta: row.order_number ? `Order ${row.order_number}` : 'Store order',
        status: row.status || 'pending',
        occurredAt: row.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 8);

    const payload = {
      period: { from, to },
      profile: {
        mode: profile.mode,
        tabLabel: profile.tabLabel,
        countryIso: profile.countryIso,
        countryName: profile.countryName,
        currency: profile.currency || regionalPack.currency,
        taxLabel: profile.taxLabel,
        regionalHint: profile.regionalHint,
      },
      storefront: {
        ordersTotal: parseInt(sf.orders_total || 0, 10),
        ordersPending: parseInt(sf.orders_pending || 0, 10),
        revenue: parseFloat(sf.revenue || 0),
        paidRevenue: parseFloat(sf.paid_revenue || 0),
        visitors,
        visitorsTracked,
        conversionRate:
          visitors > 0 ? parseFloat(((parseInt(sf.orders_total || 0, 10) / visitors) * 100).toFixed(2)) : null,
        dailyTrend,
      },
      contacts: {
        total: parseInt(contactsBase.total || 0, 10),
        pendingCount: parseInt(contactsBase.pending_count || 0, 10),
        prescriptionPending: parseInt(contactsBase.prescription_pending || 0, 10),
        refillPending: parseInt(contactsBase.refill_pending || 0, 10),
        leadPending: parseInt(contactsBase.lead_pending || 0, 10),
        appointmentPending: parseInt(contactsBase.lead_pending || 0, 10),
        bookingPending: parseInt(contactsBase.lead_pending || 0, 10),
        generalPending: parseInt(contactsBase.general_pending || 0, 10),
        recent: (contactRecent || []).map((row) => ({
          id: row.id,
          name: row.customer_name,
          subject: row.subject,
          status: row.status,
          createdAt: row.created_at,
        })),
      },
      pharmacy,
      channels: {
        invoice: parseFloat(channels.invoice_revenue || 0),
        pos: parseFloat(channels.pos_revenue || 0),
        storefront: parseFloat(channels.storefront_revenue || 0),
      },
      serviceMix,
      hospitality,
      manufacturing,
      activeBuyers: parseInt(buyersRows.rows[0]?.active_buyers || 0, 10),
      collections: {
        total: parseFloat(collectionsRows.rows[0]?.total || 0),
        recent: recentPayments.rows.map((row) => ({
          name: row.name,
          source: row.source,
          amount: parseFloat(row.amount || 0),
          occurredAt: row.occurred_at,
        })),
      },
      schedule,
    };

    if (isMembershipRelevant(category)) {
      const membershipRows = await safeQuery(
        client,
        `SELECT
           COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
           COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
           COUNT(*) FILTER (
             WHERE status = 'active'
               AND ends_at IS NOT NULL
               AND ends_at <= NOW() + INTERVAL '14 days'
           )::int AS expiring_soon
         FROM customer_memberships
         WHERE business_id = $1::uuid`,
        [businessId]
      );
      const m = membershipRows?.[0] || {};
      let overdueRenewals = 0;
      try {
        const overdueRes = await safeQuery(
          client,
          `SELECT COUNT(DISTINCT cm.id)::int AS cnt
           FROM customer_memberships cm
           JOIN invoices parent
             ON parent.id = cm.recurring_invoice_id AND parent.business_id = cm.business_id
           JOIN invoices child
             ON child.recurring_parent_id = parent.id AND child.business_id = cm.business_id
           JOIN businesses b ON b.id = cm.business_id
           WHERE cm.business_id = $1::uuid
             AND cm.auto_renew = true
             AND cm.status IN ('active', 'paused')
             AND COALESCE(child.payment_status, 'unpaid') NOT IN ('paid')
             AND child.due_date + (
               COALESCE(NULLIF(b.settings->'memberships'->>'renewalGraceDays', '')::int, 7)
               * INTERVAL '1 day'
             ) < NOW()`,
          [businessId]
        );
        overdueRenewals = parseInt(overdueRes?.[0]?.cnt || 0, 10);
      } catch {
        overdueRenewals = 0;
      }
      payload.memberships = {
        activeCount: parseInt(m.active_count || 0, 10),
        pendingCount: parseInt(m.pending_count || 0, 10),
        expiringSoon: parseInt(m.expiring_soon || 0, 10),
        overdueRenewals,
      };
    }

    return { success: true, data: serializeDecimalsDeep(payload) };
  } catch (error) {
    console.error('[getDomainOperationsSnapshotAction]', error);
    return { success: false, error: error.message || 'Failed to load operations snapshot' };
  } finally {
    client.release();
  }
}

/** @param {string|null|undefined} subject */
function formatSubjectLabel(subject) {
  const key = String(subject || 'general').replace(/_/g, ' ');
  return key.charAt(0).toUpperCase() + key.slice(1);
}
