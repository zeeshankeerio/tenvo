'use server';

import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { MembershipService } from '@/lib/services/MembershipService';
import { serializeDecimalsDeep } from '@/lib/utils/serializePrismaDecimals';

async function checkAuth(businessId, client = null, permission = 'crm.manage_memberships', feature = 'membership_management') {
  const { session } = await withGuard(businessId, { permission, feature, client });
  return session;
}

export async function getMembershipPlansAction(businessId) {
  const client = await pool.connect();
  try {
    await checkAuth(businessId, client);
    const plans = await MembershipService.listPlans(businessId, client);
    return { success: true, plans: serializeDecimalsDeep(plans) };
  } catch (error) {
    console.error('[memberships] getMembershipPlansAction:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

export async function getCustomerMembershipsAction(businessId, filters = {}) {
  const client = await pool.connect();
  try {
    await checkAuth(businessId, client);
    const result = await MembershipService.listMemberships(businessId, filters, client);
    return {
      success: true,
      memberships: serializeDecimalsDeep(result.memberships),
      total: result.total,
    };
  } catch (error) {
    console.error('[memberships] getCustomerMembershipsAction:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

export async function getMembershipStatsAction(businessId) {
  const client = await pool.connect();
  try {
    await checkAuth(businessId, client);
    const stats = await MembershipService.getMembershipStats(businessId, client);
    return { success: true, stats };
  } catch (error) {
    console.error('[memberships] getMembershipStatsAction:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

export async function syncMembershipPlansFromInventoryAction(businessId, category) {
  try {
    await checkAuth(businessId);
    const plans = await MembershipService.syncPlansFromInventory(businessId, category);
    return { success: true, plans: serializeDecimalsDeep(plans) };
  } catch (error) {
    console.error('[memberships] syncMembershipPlansFromInventoryAction:', error);
    return { success: false, error: error.message };
  }
}

export async function updateMembershipStatusAction({ businessId, membershipId, status, notes }) {
  try {
    const session = await checkAuth(businessId);
    const updated = await MembershipService.updateMembershipStatus(
      businessId,
      membershipId,
      status,
      {
        ...(notes ? { notes } : {}),
        userId: session?.user?.id || null,
      }
    );
    return { success: true, membership: serializeDecimalsDeep(updated) };
  } catch (error) {
    console.error('[memberships] updateMembershipStatusAction:', error);
    return { success: false, error: error.message };
  }
}

export async function enrollCustomerMembershipAction(data) {
  try {
    const session = await checkAuth(data.businessId);
    const membership = await MembershipService.enrollCustomer({
      businessId: data.businessId,
      customerId: data.customerId,
      planId: data.planId,
      productId: data.productId,
      source: data.source || 'hub',
      status: data.status,
      autoRenew: data.autoRenew,
      amountPaid: data.amountPaid,
      verticalKey: data.verticalKey,
      domainData: data.domainData || {},
      userId: session?.user?.id || null,
    });
    return { success: true, membership: serializeDecimalsDeep(membership) };
  } catch (error) {
    console.error('[memberships] enrollCustomerMembershipAction:', error);
    return { success: false, error: error.message };
  }
}

export async function getCustomerMembershipsForCustomerAction(businessId, customerId) {
  return getCustomerMembershipsAction(businessId, { customerId, limit: 20 });
}

export async function getMembershipInsightsAction(businessId, category) {
  const client = await pool.connect();
  try {
    await checkAuth(businessId, client);
    const insights = await MembershipService.getMembershipInsights(businessId, category, client);
    return { success: true, insights };
  } catch (error) {
    console.error('[memberships] getMembershipInsightsAction:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

export async function getPlanBenefitsAction(businessId, planId) {
  const client = await pool.connect();
  try {
    await checkAuth(businessId, client);
    const benefits = await MembershipService.listBenefitsForPlan(client, businessId, planId);
    return { success: true, benefits: serializeDecimalsDeep(benefits) };
  } catch (error) {
    console.error('[memberships] getPlanBenefitsAction:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

export async function updatePlanBenefitsAction({ businessId, planId, shopDiscountPercent, classCredits }) {
  const client = await pool.connect();
  try {
    await checkAuth(businessId, client);
    await client.query('BEGIN');

    const planRes = await client.query(
      `SELECT id FROM membership_plans WHERE id = $1::uuid AND business_id = $2::uuid`,
      [planId, businessId]
    );
    if (planRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Plan not found' };
    }

    /** @type {Array<{ benefit_type: string; value: Record<string, unknown> }>} */
    const benefits = [];
    const pct = Number(shopDiscountPercent);
    if (Number.isFinite(pct) && pct > 0) {
      benefits.push({
        benefit_type: 'discount_percent',
        value: {
          percent: Math.min(pct, 100),
          scope: 'shop',
          label: 'Member shop discount',
        },
      });
    }
    const credits = Number(classCredits);
    if (Number.isFinite(credits) && credits > 0) {
      benefits.push({
        benefit_type: 'class_credits',
        value: { credits: Math.floor(credits), label: 'Class / session credits' },
      });
    }

    await MembershipService.upsertPlanBenefits(client, businessId, planId, benefits);
    await client.query('COMMIT');
    const updated = await MembershipService.listBenefitsForPlan(client, businessId, planId);
    return { success: true, benefits: serializeDecimalsDeep(updated) };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[memberships] updatePlanBenefitsAction:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

export async function resyncPlanBenefitsFromProductAction(businessId, planId) {
  const client = await pool.connect();
  try {
    await checkAuth(businessId, client);
    const planRes = await client.query(
      `SELECT mp.id, mp.domain_rules, p.domain_data
       FROM membership_plans mp
       LEFT JOIN products p ON p.id = mp.product_id AND p.business_id = mp.business_id
       WHERE mp.id = $1::uuid AND mp.business_id = $2::uuid`,
      [planId, businessId]
    );
    if (planRes.rows.length === 0) {
      return { success: false, error: 'Plan not found' };
    }
    const row = planRes.rows[0];
    const parseJson = (val) => {
      if (!val) return {};
      if (typeof val === 'object') return val;
      try {
        return JSON.parse(val);
      } catch {
        return {};
      }
    };
    const fromProduct = parseJson(row.domain_data);
    const fromPlan = parseJson(row.domain_rules);
    const domainRules = Object.keys(fromProduct).length > 0 ? fromProduct : fromPlan;
    await MembershipService.syncBenefitsForPlan(client, businessId, planId, domainRules);
    const benefits = await MembershipService.listBenefitsForPlan(client, businessId, planId);
    return { success: true, benefits: serializeDecimalsDeep(benefits) };
  } catch (error) {
    console.error('[memberships] resyncPlanBenefitsFromProductAction:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
