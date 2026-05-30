'use server';

import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import { MarketingAgentService } from '@/lib/services/MarketingAgentService';
import { getPromotionsAction } from '@/lib/actions/standard/promotions';

/**
 * Overview for the campaigns hub: outreach rows, segments, promotion count, playbooks.
 */
export async function getCampaignsOverviewAction(businessId) {
  const client = await pool.connect();
  try {
    await withGuard(businessId, { permission: 'crm.view_campaigns', feature: 'campaigns' });

    let campaigns = { rows: [] };
    let segments = { rows: [] };
    let promotionCount = { rows: [{ c: 0 }] };

    try {
      [campaigns, segments, promotionCount] = await Promise.all([
        client.query(
          `SELECT c.*,
                  s.name AS segment_name,
                  (SELECT COUNT(*)::int FROM campaign_messages m WHERE m.campaign_id = c.id) AS message_count
           FROM campaigns c
           LEFT JOIN customer_segments s ON s.id = c.segment_id
           WHERE c.business_id = $1
           ORDER BY c.updated_at DESC
           LIMIT 80`,
          [businessId]
        ),
        client.query(
          `SELECT cs.*,
                  (SELECT COUNT(*)::int FROM segment_customers sc WHERE sc.segment_id = cs.id) AS member_count
           FROM customer_segments cs
           WHERE cs.business_id = $1
           ORDER BY cs.updated_at DESC`,
          [businessId]
        ),
        client.query(`SELECT COUNT(*)::int AS c FROM promotions WHERE business_id = $1`, [businessId]),
      ]);
    } catch (e) {
      if (e.code !== '42P01') throw e;
    }

    let promotionsList = [];
    try {
      const promoRes = await getPromotionsAction(businessId);
      if (promoRes.success) promotionsList = promoRes.promotions || [];
    } catch (e) {
      console.warn('[getCampaignsOverviewAction] promotions list skipped', e?.message);
    }

    return actionSuccess({
      campaigns: campaigns.rows || [],
      segments: segments.rows || [],
      promotionCount: promotionCount.rows?.[0]?.c ?? 0,
      promotions: promotionsList,
      playbooks: MarketingAgentService.getSegmentationStrategies(),
    });
  } catch (error) {
    console.error('[getCampaignsOverviewAction]', error);
    return actionFailure('FETCH_ERROR', error.message || 'Failed to load campaigns hub');
  } finally {
    client.release();
  }
}

/**
 * Create outreach campaign (email / whatsapp / notification) with optional scheduling.
 */
export async function createOutreachCampaignAction(businessId, data) {
  try {
    await withGuard(businessId, { permission: 'crm.manage_campaigns', feature: 'campaigns' });

    const {
      name,
      description = '',
      type = 'email',
      segment_id = null,
      template_id = null,
      scheduled_at = null,
      is_automated = false,
      queue_now = true,
    } = data || {};

    if (!name || String(name).trim().length === 0) {
      return actionFailure('VALIDATION', 'Campaign name is required');
    }

    const id = await MarketingAgentService.createCampaign(businessId, {
      name: String(name).trim(),
      description,
      type,
      segment_id: segment_id || null,
      template_id: template_id || null,
      scheduled_at: scheduled_at || null,
      is_automated: Boolean(is_automated),
      queue_now: queue_now !== false,
    });

    return actionSuccess({ campaignId: id });
  } catch (error) {
    console.error('[createOutreachCampaignAction]', error);
    return actionFailure('CREATE_ERROR', error.message || 'Failed to create campaign');
  }
}

/**
 * Create a customer segment from a built-in playbook and refresh membership.
 */
export async function createSegmentFromPlaybookAction(businessId, playbookIndex) {
  try {
    await withGuard(businessId, { permission: 'crm.manage_campaigns', feature: 'campaigns' });

    const playbooks = MarketingAgentService.getSegmentationStrategies();
    const idx = Number(playbookIndex);
    const playbook = playbooks[Number.isFinite(idx) ? idx : 0];
    if (!playbook) {
      return actionFailure('VALIDATION', 'Unknown playbook');
    }

    const segmentName = `${playbook.name} (${new Date().toLocaleDateString()})`;
    const segmentId = await MarketingAgentService.createSegment(
      businessId,
      segmentName,
      playbook.rules,
      true
    );

    const members = await MarketingAgentService.refreshSegment(businessId, segmentId);

    return actionSuccess({ segmentId, members, name: segmentName });
  } catch (error) {
    console.error('[createSegmentFromPlaybookAction]', error);
    return actionFailure('CREATE_ERROR', error.message || 'Failed to create segment');
  }
}

/**
 * Recompute memberships for a segment (dynamic rules).
 */
export async function refreshSegmentAction(businessId, segmentId) {
  try {
    await withGuard(businessId, { permission: 'crm.manage_campaigns', feature: 'campaigns' });
    const members = await MarketingAgentService.refreshSegment(businessId, segmentId);
    return actionSuccess({ members });
  } catch (error) {
    console.error('[refreshSegmentAction]', error);
    return actionFailure('REFRESH_ERROR', error.message || 'Failed to refresh segment');
  }
}
