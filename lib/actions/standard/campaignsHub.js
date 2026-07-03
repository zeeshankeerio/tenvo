'use server';

import pool from '@/lib/db';
import { prismaBase } from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import { MarketingAgentService } from '@/lib/services/MarketingAgentService';
import { getPromotionsAction } from '@/lib/actions/standard/promotions';
import {
  getCampaignIntegrationsForClient,
  mergeCampaignIntegrationsIntoSettings,
  resolveCampaignEmailConfig,
} from '@/lib/marketing/campaignIntegrations';
import { testResendApiKey } from '@/lib/email/campaignOutreach';
import { planHasFeatureWithPackaging } from '@/lib/subscription/effectivePlanAccess';

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
                  (SELECT COUNT(*)::int FROM campaign_messages m WHERE m.campaign_id = c.id) AS message_count,
                  (SELECT COUNT(*)::int FROM campaign_messages m WHERE m.campaign_id = c.id AND m.status = 'pending') AS pending_count,
                  (SELECT COUNT(*)::int FROM campaign_messages m WHERE m.campaign_id = c.id AND m.status = 'sent') AS sent_count,
                  (SELECT COUNT(*)::int FROM campaign_messages m WHERE m.campaign_id = c.id AND m.status = 'failed') AS failed_count
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

/**
 * Create a custom segment from rule fields (min spend, churn window, city, new leads).
 */
export async function createCustomSegmentAction(businessId, data) {
  try {
    await withGuard(businessId, { permission: 'crm.manage_campaigns', feature: 'campaigns' });

    const name = String(data?.name || '').trim();
    if (!name) return actionFailure('VALIDATION', 'Segment name is required');

    const rules = {};
    const minSpend = Number(data?.min_spend);
    if (Number.isFinite(minSpend) && minSpend > 0) rules.min_spend = minSpend;

    const lastOrderDays = Number(data?.last_order_days);
    if (Number.isFinite(lastOrderDays) && lastOrderDays > 0) rules.last_order_days = lastOrderDays;

    const createdWithinDays = Number(data?.created_within_days);
    if (Number.isFinite(createdWithinDays) && createdWithinDays > 0) {
      rules.created_within_days = createdWithinDays;
    }

    if (data?.new_leads_only) rules.orders_count = 0;

    const city = String(data?.city || '').trim();
    if (city) rules.city = city;

    if (Object.keys(rules).length === 0) {
      return actionFailure('VALIDATION', 'Add at least one rule (min spend, churn days, city, or new leads)');
    }

    const segmentId = await MarketingAgentService.createSegment(businessId, name, rules, true);
    const members = await MarketingAgentService.refreshSegment(businessId, segmentId);

    return actionSuccess({ segmentId, members, name });
  } catch (error) {
    console.error('[createCustomSegmentAction]', error);
    return actionFailure('CREATE_ERROR', error.message || 'Failed to create segment');
  }
}

/**
 * Dispatch pending outreach messages for a campaign (email via Resend).
 */
export async function dispatchOutreachCampaignAction(businessId, campaignId) {
  try {
    await withGuard(businessId, { permission: 'crm.manage_campaigns', feature: 'campaigns' });
    const result = await MarketingAgentService.dispatchCampaignMessages(businessId, campaignId);
    return actionSuccess(result);
  } catch (error) {
    console.error('[dispatchOutreachCampaignAction]', error);
    return actionFailure('DISPATCH_ERROR', error.message || 'Failed to dispatch campaign');
  }
}

async function loadBusinessCampaignContext(businessId) {
  const biz = await prismaBase.businesses.findFirst({
    where: { id: businessId },
    select: { settings: true, plan_tier: true },
  });
  if (!biz) return null;
  return biz;
}

/**
 * Owner-facing integration settings (secrets masked).
 */
export async function getCampaignIntegrationsAction(businessId) {
  try {
    await withGuard(businessId, { permission: 'crm.view_campaigns', feature: 'campaigns' });
    const biz = await loadBusinessCampaignContext(businessId);
    if (!biz) return actionFailure('NOT_FOUND', 'Business not found');

    const emailDelivery = resolveCampaignEmailConfig(biz.settings);
    const smsPlanEnabled = planHasFeatureWithPackaging(biz.plan_tier, 'sms_campaigns', biz.settings);

    return actionSuccess({
      integrations: getCampaignIntegrationsForClient(biz.settings),
      emailDelivery: {
        configured: emailDelivery.configured,
        usesTenantKey: emailDelivery.usesTenantKey,
        usesPlatformKey: emailDelivery.usesPlatformKey,
        from: emailDelivery.from || null,
      },
      smsPlanEnabled,
      genAiEmailPlanEnabled: planHasFeatureWithPackaging(
        biz.plan_tier,
        'genai_email_campaigns',
        biz.settings
      ),
    });
  } catch (error) {
    console.error('[getCampaignIntegrationsAction]', error);
    return actionFailure('FETCH_ERROR', error.message || 'Failed to load integrations');
  }
}

/**
 * Save per-tenant campaign channel integrations (`businesses.settings.campaigns.integrations`).
 */
export async function updateCampaignIntegrationsAction(businessId, payload) {
  try {
    await withGuard(businessId, { permission: 'crm.manage_campaigns', feature: 'campaigns' });

    const biz = await loadBusinessCampaignContext(businessId);
    if (!biz) return actionFailure('NOT_FOUND', 'Business not found');

    const smsPlanEnabled = planHasFeatureWithPackaging(biz.plan_tier, 'sms_campaigns', biz.settings);
    if (payload?.sms?.provider === 'twilio' && !smsPlanEnabled) {
      return actionFailure('FORBIDDEN', 'SMS campaigns require a plan that includes sms_campaigns.');
    }

    const { nextSettings } = mergeCampaignIntegrationsIntoSettings(biz.settings, payload);

    await prismaBase.businesses.update({
      where: { id: businessId },
      data: { settings: nextSettings, updated_at: new Date() },
    });

    const emailDelivery = resolveCampaignEmailConfig(nextSettings);
    return actionSuccess({
      integrations: getCampaignIntegrationsForClient(nextSettings),
      emailDelivery: {
        configured: emailDelivery.configured,
        usesTenantKey: emailDelivery.usesTenantKey,
        usesPlatformKey: emailDelivery.usesPlatformKey,
        from: emailDelivery.from || null,
      },
    });
  } catch (error) {
    console.error('[updateCampaignIntegrationsAction]', error);
    return actionFailure('UPDATE_ERROR', error.message || 'Failed to save integrations');
  }
}

/**
 * Test Resend API key (tenant override or platform default).
 */
export async function testCampaignEmailConnectionAction(businessId, { apiKeyOverride } = {}) {
  try {
    await withGuard(businessId, { permission: 'crm.manage_campaigns', feature: 'campaigns' });

    let key = String(apiKeyOverride || '').trim();
    if (!key) {
      const biz = await loadBusinessCampaignContext(businessId);
      if (!biz) return actionFailure('NOT_FOUND', 'Business not found');
      const resolved = resolveCampaignEmailConfig(biz.settings);
      key = resolved.apiKey;
    }

    const result = await testResendApiKey({ apiKey: key });
    if (!result.ok) {
      return actionFailure('TEST_FAILED', result.error || 'Connection test failed');
    }
    return actionSuccess({ domainCount: result.domainCount ?? 0 });
  } catch (error) {
    console.error('[testCampaignEmailConnectionAction]', error);
    return actionFailure('TEST_ERROR', error.message || 'Connection test failed');
  }
}

/**
 * Delete a customer segment (tenant-scoped).
 */
export async function deleteSegmentAction(businessId, segmentId) {
  try {
    await withGuard(businessId, { permission: 'crm.manage_campaigns', feature: 'campaigns' });
    await MarketingAgentService.deleteSegment(businessId, segmentId);
    return actionSuccess({ deleted: true });
  } catch (error) {
    console.error('[deleteSegmentAction]', error);
    return actionFailure('DELETE_ERROR', error.message || 'Failed to delete segment');
  }
}

/**
 * Archive or hard-delete an outreach campaign.
 */
export async function deleteCampaignAction(businessId, campaignId, { hard = false } = {}) {
  try {
    await withGuard(businessId, { permission: 'crm.manage_campaigns', feature: 'campaigns' });
    await MarketingAgentService.deleteCampaign(businessId, campaignId, { hard: Boolean(hard) });
    return actionSuccess({ deleted: true, hard: Boolean(hard) });
  } catch (error) {
    console.error('[deleteCampaignAction]', error);
    return actionFailure('DELETE_ERROR', error.message || 'Failed to delete campaign');
  }
}

/**
 * Segment summary for SegmentationIntelligenceIsland and dashboards.
 */
export async function getSegmentIntelligenceAction(businessId) {
  const client = await pool.connect();
  try {
    await withGuard(businessId, { permission: 'crm.view_campaigns', feature: 'campaigns' });

    const segmentsRes = await client.query(
      `SELECT cs.id, cs.name, cs.rules, cs.is_dynamic, cs.updated_at,
              (SELECT COUNT(*)::int FROM segment_customers sc WHERE sc.segment_id = cs.id) AS member_count
       FROM customer_segments cs
       WHERE cs.business_id = $1
       ORDER BY member_count DESC, cs.updated_at DESC
       LIMIT 8`,
      [businessId]
    );

    const totalRes = await client.query(
      `SELECT COUNT(*)::int AS c FROM customers
       WHERE business_id = $1 AND COALESCE(is_deleted, false) = false`,
      [businessId]
    );

    return actionSuccess({
      segments: segmentsRes.rows || [],
      totalCustomers: totalRes.rows[0]?.c ?? 0,
      playbooks: MarketingAgentService.getSegmentationStrategies(),
    });
  } catch (error) {
    console.error('[getSegmentIntelligenceAction]', error);
    return actionFailure('FETCH_ERROR', error.message || 'Failed to load segment intelligence');
  } finally {
    client.release();
  }
}
