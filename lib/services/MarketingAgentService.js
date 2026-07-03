import pool from '@/lib/db';
import { createModuleLogger } from './logging/logger';
import { recordAuditLog } from './audit/auditService';
import { sendCampaignOutreachEmail } from '@/lib/email/campaignOutreach';
import { CampaignOutreachEmail } from '@/lib/email/templates/CampaignOutreachEmail';
import {
  isCampaignEmailConfigured,
  resolveCampaignEmailConfig,
} from '@/lib/marketing/campaignIntegrations';

const log = createModuleLogger('marketing');

async function loadBusinessSettings(businessId, client) {
  const res = await client.query(`SELECT settings FROM businesses WHERE id = $1`, [businessId]);
  if (res.rows.length === 0) return {};
  const raw = res.rows[0].settings;
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

/** Storefront orders matched to CRM customers by email or normalized phone. */
function storefrontMatchSql(alias = 'customers') {
  return `(
    (${alias}.email IS NOT NULL AND so.customer_email IS NOT NULL
      AND lower(trim(so.customer_email)) = lower(trim(${alias}.email)))
    OR (${alias}.phone IS NOT NULL AND so.customer_phone IS NOT NULL
      AND regexp_replace(so.customer_phone, '[^0-9]', '', 'g')
        = regexp_replace(${alias}.phone, '[^0-9]', '', 'g'))
  )`;
}

function customerLifetimeSpendSql(alias = 'customers') {
  return `(
    COALESCE((
      SELECT SUM(COALESCE(i.grand_total, i.total_amount, 0))
      FROM invoices i
      WHERE i.customer_id = ${alias}.id
        AND i.business_id = ${alias}.business_id
        AND COALESCE(i.is_deleted, false) = false
    ), 0)
    + COALESCE((
      SELECT SUM(COALESCE(so.total_amount, 0))
      FROM storefront_orders so
      WHERE so.business_id = ${alias}.business_id
        AND ${storefrontMatchSql(alias)}
    ), 0)
  )`;
}

function customerHasRecentOrderSql(alias, daysParamIndex) {
  return `(
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.customer_id = ${alias}.id
        AND i.business_id = ${alias}.business_id
        AND COALESCE(i.is_deleted, false) = false
        AND i.created_at >= NOW() - ($${daysParamIndex}::int * INTERVAL '1 day')
    )
    OR EXISTS (
      SELECT 1 FROM storefront_orders so
      WHERE so.business_id = ${alias}.business_id
        AND ${storefrontMatchSql(alias)}
        AND so.created_at >= NOW() - ($${daysParamIndex}::int * INTERVAL '1 day')
    )
  )`;
}

function customerHasAnyOrderSql(alias) {
  return `(
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.customer_id = ${alias}.id
        AND i.business_id = ${alias}.business_id
        AND COALESCE(i.is_deleted, false) = false
    )
    OR EXISTS (
      SELECT 1 FROM storefront_orders so
      WHERE so.business_id = ${alias}.business_id
        AND ${storefrontMatchSql(alias)}
    )
  )`;
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
        query += ` AND ${customerLifetimeSpendSql('customers')} >= $${params.length + 1}`;
        params.push(rules.min_spend);
      }

      if (rules.last_order_days) {
        const days = Number(rules.last_order_days);
        if (Number.isFinite(days) && days > 0) {
          const idx = params.length + 1;
          query += ` AND NOT ${customerHasRecentOrderSql('customers', idx)}`;
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
        query += ` AND NOT ${customerHasAnyOrderSql('customers')}`;
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
   * Validate segment exists, belongs to tenant, and has members before outreach.
   */
  async validateSegmentForOutreach(businessId, segmentId, { refreshDynamic = true } = {}) {
    if (!segmentId) {
      return { ok: false, error: 'A segment is required for outreach' };
    }

    const client = await pool.connect();
    try {
      const segmentRes = await client.query(
        `SELECT id, is_dynamic FROM customer_segments WHERE id = $1 AND business_id = $2`,
        [segmentId, businessId]
      );
      if (segmentRes.rows.length === 0) {
        return { ok: false, error: 'Segment not found' };
      }

      if (refreshDynamic && segmentRes.rows[0].is_dynamic) {
        await this.refreshSegment(businessId, segmentId);
      }

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS c FROM segment_customers WHERE segment_id = $1 AND business_id = $2`,
        [segmentId, businessId]
      );
      const members = countRes.rows[0]?.c ?? 0;
      if (members === 0) {
        return { ok: false, error: 'Segment has no matching customers. Adjust rules or refresh the segment.' };
      }

      return { ok: true, members };
    } finally {
      client.release();
    }
  },

  /**
   * Delete a customer segment (tenant-scoped). Detaches campaigns referencing it.
   */
  async deleteSegment(businessId, segmentId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const segmentRes = await client.query(
        `SELECT id, name FROM customer_segments WHERE id = $1 AND business_id = $2`,
        [segmentId, businessId]
      );
      if (segmentRes.rows.length === 0) throw new Error('Segment not found');

      await client.query(
        `UPDATE campaigns SET segment_id = NULL, status = 'draft', updated_at = NOW()
         WHERE business_id = $1 AND segment_id = $2 AND status IN ('draft', 'scheduled')`,
        [businessId, segmentId]
      );

      const activeRes = await client.query(
        `SELECT COUNT(*)::int AS c FROM campaigns
         WHERE business_id = $1 AND segment_id = $2 AND status IN ('active', 'scheduled')`,
        [businessId, segmentId]
      );
      if ((activeRes.rows[0]?.c ?? 0) > 0) {
        throw new Error('Cancel or complete active campaigns using this segment before deleting it.');
      }

      await client.query(`DELETE FROM segment_customers WHERE segment_id = $1 AND business_id = $2`, [
        segmentId,
        businessId,
      ]);
      await client.query(`DELETE FROM customer_segments WHERE id = $1 AND business_id = $2`, [
        segmentId,
        businessId,
      ]);

      await recordAuditLog({
        businessId,
        action: 'delete_segment',
        entityType: 'customer_segment',
        entityId: segmentId,
        description: `Deleted segment: ${segmentRes.rows[0].name}`,
      });

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Archive (cancel) or hard-delete an outreach campaign.
   */
  async deleteCampaign(businessId, campaignId, { hard = false } = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const campaignRes = await client.query(
        `SELECT id, name, status FROM campaigns WHERE id = $1 AND business_id = $2`,
        [campaignId, businessId]
      );
      if (campaignRes.rows.length === 0) throw new Error('Campaign not found');
      const campaign = campaignRes.rows[0];

      if (hard) {
        await client.query(`DELETE FROM campaign_messages WHERE campaign_id = $1 AND business_id = $2`, [
          campaignId,
          businessId,
        ]);
        await client.query(`DELETE FROM campaigns WHERE id = $1 AND business_id = $2`, [campaignId, businessId]);
      } else {
        await client.query(
          `UPDATE campaigns SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND business_id = $2`,
          [campaignId, businessId]
        );
      }

      await recordAuditLog({
        businessId,
        action: hard ? 'delete_campaign' : 'archive_campaign',
        entityType: 'campaign',
        entityId: campaignId,
        description: `${hard ? 'Deleted' : 'Archived'} campaign: ${campaign.name}`,
      });

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Process campaigns whose scheduled_at is due: queue then dispatch email when configured.
   */
  async processDueScheduledCampaigns(options = {}) {
    const limit = Math.min(Math.max(Number(options.limit) || 25, 1), 100);
    const client = await pool.connect();
    try {
      const dueRes = await client.query(
        `
        SELECT c.id, c.business_id, c.type, c.status
        FROM campaigns c
        WHERE c.status IN ('scheduled', 'draft')
          AND c.scheduled_at IS NOT NULL
          AND c.scheduled_at <= NOW()
          AND c.segment_id IS NOT NULL
        ORDER BY c.scheduled_at ASC
        LIMIT $1
        `,
        [limit]
      );

      const results = [];
      for (const row of dueRes.rows) {
        try {
          const msgCountRes = await client.query(
            `SELECT COUNT(*)::int AS c FROM campaign_messages WHERE campaign_id = $1`,
            [row.id]
          );
          if ((msgCountRes.rows[0]?.c ?? 0) === 0) {
            await this.queueCampaignMessages(row.business_id, row.id);
          }

          let dispatch = null;
          if (row.type === 'email') {
            const settings = await loadBusinessSettings(row.business_id, client);
            if (isCampaignEmailConfigured(settings)) {
              dispatch = await this.dispatchCampaignMessages(row.business_id, row.id, { limit: 50 });
            }
          }

          results.push({ campaignId: row.id, businessId: row.business_id, dispatch });
        } catch (err) {
          log.warn('Scheduled campaign processing failed', { campaignId: row.id, error: err.message });
          results.push({ campaignId: row.id, businessId: row.business_id, error: err.message });
        }
      }

      return { processed: results.length, results };
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
      const validation = await this.validateSegmentForOutreach(businessId, segment_id, { refreshDynamic: true });
      if (!validation.ok) {
        throw new Error(validation.error);
      }

      await this.queueCampaignMessages(businessId, campaignId);

      if (type === 'email') {
        const settingsClient = await pool.connect();
        try {
          const settings = await loadBusinessSettings(businessId, settingsClient);
          if (isCampaignEmailConfigured(settings)) {
            try {
              await this.dispatchCampaignMessages(businessId, campaignId, { limit: 50 });
            } catch (dispatchErr) {
              log.warn('Auto-dispatch after queue failed', { campaignId, error: dispatchErr.message });
            }
          }
        } finally {
          settingsClient.release();
        }
      }
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
        `SELECT business_id, segment_id, scheduled_at FROM campaigns WHERE id = $1 AND business_id = $2`,
        [campaignId, businessId]
      );
      if (campaignRes.rows.length === 0) throw new Error('Campaign not found');
      const { segment_id: segmentId, scheduled_at: scheduledAt } = campaignRes.rows[0];
      const bizId = campaignRes.rows[0].business_id;

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
   * Dispatch pending campaign_messages (email via Resend; WhatsApp API is roadmap).
   */
  async dispatchCampaignMessages(businessId, campaignId, options = {}) {
    const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
    const client = await pool.connect();
    try {
      const campaignRes = await client.query(
        `SELECT c.*, b.business_name, b.email AS business_email, b.settings AS business_settings
         FROM campaigns c
         JOIN businesses b ON b.id = c.business_id
         WHERE c.id = $1 AND c.business_id = $2`,
        [campaignId, businessId]
      );
      if (campaignRes.rows.length === 0) throw new Error('Campaign not found');
      const campaign = campaignRes.rows[0];

      let businessSettings = campaign.business_settings;
      if (typeof businessSettings === 'string') {
        try {
          businessSettings = JSON.parse(businessSettings);
        } catch {
          businessSettings = {};
        }
      }
      const emailConfig = resolveCampaignEmailConfig(businessSettings);
      let meta = campaign.metadata;
      if (typeof meta === 'string') {
        try {
          meta = JSON.parse(meta);
        } catch {
          meta = {};
        }
      }
      if (!meta || typeof meta !== 'object') meta = {};

      if (campaign.type === 'whatsapp') {
        throw new Error(
          'WhatsApp Business API delivery is on the roadmap. Use email outreach or export segment contacts for wa.me links.'
        );
      }

      if (campaign.type === 'email' && !emailConfig.configured) {
        throw new Error(
          'Email is not configured. Add your Resend API key under Campaigns → Integrations or set platform RESEND_API_KEY.'
        );
      }

      if (campaign.segment_id) {
        const validation = await this.validateSegmentForOutreach(businessId, campaign.segment_id, {
          refreshDynamic: options.refreshSegment !== false,
        });
        if (!validation.ok) {
          throw new Error(validation.error);
        }
      }

      const pendingRes = await client.query(
        `SELECT m.id, m.customer_id, c.name AS customer_name, c.email AS customer_email
         FROM campaign_messages m
         JOIN customers c ON c.id = m.customer_id
         WHERE m.campaign_id = $1
           AND m.business_id = $2
           AND m.status = 'pending'
         ORDER BY m.id
         LIMIT $3`,
        [campaignId, businessId, limit]
      );

      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (const row of pendingRes.rows) {
        if (campaign.type === 'email') {
          if (!row.customer_email) {
            await client.query(
              `UPDATE campaign_messages SET status = 'failed', error = $1 WHERE id = $2`,
              ['Customer has no email address', row.id]
            );
            failed += 1;
            continue;
          }

          const subject = meta.subject || `${campaign.name} from ${campaign.business_name || 'your store'}`;
          const body =
            campaign.description ||
            meta.body ||
            `We wanted to share an update with you from ${campaign.business_name || 'your store'}.`;

          const result = await sendCampaignOutreachEmail({
            apiKey: emailConfig.apiKey,
            from: emailConfig.from,
            to: row.customer_email,
            subject,
            react: CampaignOutreachEmail({
              businessName: campaign.business_name,
              campaignName: campaign.name,
              body,
              customerName: row.customer_name,
            }),
            replyTo: emailConfig.replyTo || campaign.business_email || undefined,
          });

          if (result.success && !result.skipped) {
            await client.query(
              `UPDATE campaign_messages
               SET status = 'sent', sent_at = NOW(), external_id = $1, error = NULL
               WHERE id = $2`,
              [result.id || null, row.id]
            );
            sent += 1;
          } else if (result.skipped) {
            await client.query(
              `UPDATE campaign_messages SET status = 'pending', error = $1 WHERE id = $2`,
              ['Email provider not configured; message remains queued', row.id]
            );
            skipped += 1;
          } else {
            await client.query(
              `UPDATE campaign_messages SET status = 'failed', error = $1 WHERE id = $2`,
              [result.error || 'Send failed', row.id]
            );
            failed += 1;
          }
        } else if (campaign.type === 'notification') {
          await client.query(
            `UPDATE campaign_messages SET status = 'failed', error = $1 WHERE id = $2`,
            ['Customer in-app notifications require linked customer accounts (roadmap)', row.id]
          );
          failed += 1;
        }
      }

      const statsRes = await client.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
           COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
         FROM campaign_messages WHERE campaign_id = $1 AND business_id = $2`,
        [campaignId, businessId]
      );
      const stats = statsRes.rows[0] || { pending: 0, sent: 0, failed: 0 };

      let nextStatus = campaign.status;
      if (stats.pending === 0 && stats.sent > 0) {
        nextStatus = 'completed';
        await client.query(
          `UPDATE campaigns SET status = 'completed', sent_at = COALESCE(sent_at, NOW()), updated_at = NOW() WHERE id = $1`,
          [campaignId]
        );
      } else if (stats.sent > 0) {
        nextStatus = 'active';
        await client.query(`UPDATE campaigns SET status = 'active', updated_at = NOW() WHERE id = $1`, [campaignId]);
      }

      log.info('Campaign dispatch finished', { businessId, campaignId, sent, failed, skipped });
      return { sent, failed, skipped, pending: stats.pending, status: nextStatus };
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
