import pool from '@/lib/db';
import { createModuleLogger } from './logging/logger';
import { recordAuditLog } from './audit/auditService';

const log = createModuleLogger('marketing');

function parseSegmentRules(raw) {
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? raw : {};
}

/**
 * MarketingAgentService
 *
 * Orchestrates target segmentation and automated marketing campaigns.
 * Uses the customer_segments, campaigns, and campaign_messages models.
 */
export const MarketingAgentService = {
  /**
   * Create a customer segment based on rules
   */
  async createSegment(businessId, name, rules, isDynamic = true) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `
        INSERT INTO customer_segments (id, business_id, name, rules, is_dynamic, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3::jsonb, $4, NOW(), NOW())
        RETURNING id
        `,
        [businessId, name, JSON.stringify(rules || {}), isDynamic]
      );

      const segmentId = res.rows[0].id;

      await recordAuditLog({
        businessId,
        action: 'create_segment',
        entityType: 'customer_segment',
        entityId: segmentId,
        description: `Created segment: ${name}`,
      });

      return segmentId;
    } finally {
      client.release();
    }
  },

  /**
   * Refresh a dynamic segment by re-evaluating rules against customers
   */
  async refreshSegment(businessId, segmentId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const segmentRes = await client.query('SELECT * FROM customer_segments WHERE id = $1 AND business_id = $2', [
        segmentId,
        businessId,
      ]);
      if (segmentRes.rows.length === 0) throw new Error('Segment not found');
      const segment = segmentRes.rows[0];

      await client.query('DELETE FROM segment_customers WHERE segment_id = $1', [segmentId]);

      const rules = parseSegmentRules(segment.rules);
      let query = `SELECT id FROM customers WHERE business_id = $1 AND COALESCE(customers.is_deleted, false) = false`;
      const params = [businessId];

      if (rules.city) {
        query += ` AND city = $${params.length + 1}`;
        params.push(rules.city);
      }

      if (rules.min_spend) {
        query += ` AND COALESCE(outstanding_balance, 0) + (
          SELECT COALESCE(SUM(i.total_amount), 0) FROM invoices i
          WHERE i.customer_id = customers.id AND i.business_id = customers.business_id
            AND COALESCE(i.is_deleted, false) = false
        ) >= $${params.length + 1}`;
        params.push(rules.min_spend);
      }

      if (rules.last_order_days) {
        const days = Number(rules.last_order_days);
        if (Number.isFinite(days) && days > 0) {
          query += ` AND NOT EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.customer_id = customers.id AND i.business_id = customers.business_id
              AND COALESCE(i.is_deleted, false) = false
              AND i.created_at >= NOW() - ($${params.length + 1}::int * INTERVAL '1 day')
          )`;
          params.push(days);
        }
      }

      if (rules.created_within_days) {
        const d = Number(rules.created_within_days);
        if (Number.isFinite(d) && d > 0) {
          query += ` AND customers.created_at >= NOW() - ($${params.length + 1}::int * INTERVAL '1 day')`;
          params.push(d);
        }
      }

      if (rules.orders_count === 0) {
        query += ` AND NOT EXISTS (
          SELECT 1 FROM invoices i
          WHERE i.customer_id = customers.id AND i.business_id = customers.business_id
            AND COALESCE(i.is_deleted, false) = false
        )`;
      }

      const customersRes = await client.query(query, params);

      for (const row of customersRes.rows) {
        await client.query(
          `
          INSERT INTO segment_customers (id, business_id, segment_id, customer_id, created_at)
          VALUES (gen_random_uuid(), $1, $2, $3, NOW())
          ON CONFLICT (segment_id, customer_id) DO NOTHING
          `,
          [businessId, segmentId, row.id]
        );
      }

      await client.query('COMMIT');
      log.info('Segment refreshed', { businessId, segmentId, members: customersRes.rows.length });
      return customersRes.rows.length;
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Failed to refresh segment', { error, segmentId });
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Create outreach campaign (Prisma-aligned). Optionally queue messages for segment members.
   */
  async createCampaign(businessId, data) {
    const {
      name,
      description = '',
      type = 'email',
      segment_id = null,
      template_id = null,
      scheduled_at = null,
      is_automated = false,
      queue_now = true,
      metadata = {},
    } = data;

    const scheduledFuture = scheduled_at && new Date(scheduled_at) > new Date();
    const initialStatus = scheduledFuture ? 'scheduled' : 'draft';

    const client = await pool.connect();
    let campaignId;
    try {
      const res = await client.query(
        `
        INSERT INTO campaigns (
          id, business_id, name, description, type, status,
          segment_id, template_id, scheduled_at, sent_at, is_automated, metadata,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5,
          $6, $7, $8, null, $9, $10::jsonb,
          NOW(), NOW()
        ) RETURNING id
        `,
        [
          businessId,
          name,
          description || null,
          type,
          initialStatus,
          segment_id || null,
          template_id || null,
          scheduled_at || null,
          Boolean(is_automated),
          JSON.stringify(metadata || {}),
        ]
      );
      campaignId = res.rows[0].id;
    } finally {
      client.release();
    }

    const shouldQueue = queue_now !== false && segment_id && !scheduledFuture;
    if (shouldQueue) {
      await this.queueCampaignMessages(businessId, campaignId);
    }

    return campaignId;
  },

  /**
   * Queue messages for all customers in a campaign's segment
   */
  async queueCampaignMessages(businessId, campaignId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const campaignRes = await client.query(
        `SELECT business_id, segment_id, scheduled_at FROM campaigns WHERE id = $1`,
        [campaignId]
      );
      if (campaignRes.rows.length === 0) throw new Error('Campaign not found');
      const { segment_id: segmentId, scheduled_at: scheduledAt } = campaignRes.rows[0];
      const bizId = campaignRes.rows[0].business_id || businessId;

      if (!segmentId) {
        await client.query(`UPDATE campaigns SET status = 'draft', updated_at = NOW() WHERE id = $1`, [campaignId]);
        await client.query('COMMIT');
        return 0;
      }

      await client.query(
        `
        INSERT INTO campaign_messages (id, business_id, campaign_id, customer_id, status)
        SELECT gen_random_uuid(), $1, $2, sc.customer_id, 'pending'
        FROM segment_customers sc
        WHERE sc.segment_id = $3
          AND NOT EXISTS (
            SELECT 1 FROM campaign_messages m
            WHERE m.campaign_id = $2 AND m.customer_id = sc.customer_id
          )
        `,
        [bizId, campaignId, segmentId]
      );

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS c FROM campaign_messages WHERE campaign_id = $1`,
        [campaignId]
      );
      const count = countRes.rows[0]?.c ?? 0;

      const nextStatus = scheduledAt && new Date(scheduledAt) > new Date() ? 'scheduled' : 'active';
      await client.query(`UPDATE campaigns SET status = $1, updated_at = NOW() WHERE id = $2`, [nextStatus, campaignId]);

      await client.query('COMMIT');
      log.info('Campaign messages queued', { campaignId, count });
      return count;
    } catch (error) {
      await client.query('ROLLBACK');
      log.error('Failed to queue campaign messages', { error, campaignId });
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Built-in segmentation playbooks (rules evaluated in refreshSegment)
   */
  getSegmentationStrategies() {
    return [
      {
        name: 'Big Spenders (VIP)',
        rules: { min_spend: 50000 },
        strategy: 'Exclusive early access & premium support',
      },
      {
        name: 'At Risk (Churn)',
        rules: { last_order_days: 60 },
        strategy: 'Personalized win-back offer or limited-time discount',
      },
      {
        name: 'New Leads',
        rules: { created_within_days: 7, orders_count: 0 },
        strategy: 'Welcome sequence and first-purchase incentive',
      },
    ];
  },
};
