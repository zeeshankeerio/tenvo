/**
 * Plan Limits Service
 *
 * Runtime limit checks backed by the canonical PLAN_TIERS from lib/config/plans.js.
 * Resolves DB-column overrides (plan_seats, max_products, max_warehouses) and
 * settings.limit_overrides for other keys, matching the logic in withGuard.
 *
 * Use these helpers in API routes that need live limit enforcement before mutating data.
 */

import pool from '@/lib/db';
import { PLAN_TIERS, resolvePlanTier } from '@/lib/config/plans';

/**
 * Resolve the effective limit for a single key for a business.
 * Mirrors the limit resolution in lib/rbac/serverGuard.js so behavior is consistent.
 *
 * @param {string} businessId
 * @returns {Promise<{
 *   planTier: string;
 *   limits: Record<string, number>;
 *   planExpiresAt: Date | null;
 * }>}
 */
async function resolveBusinessLimits(businessId) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT plan_tier, plan_expires_at, plan_seats, max_products, max_warehouses, settings
       FROM businesses WHERE id = $1`,
      [businessId]
    );

    if (res.rows.length === 0) {
      return { planTier: 'free', limits: PLAN_TIERS.free.limits, planExpiresAt: null };
    }

    const row = res.rows[0];
    // Auto-downgrade expired plans
    const planExpiresAt = row.plan_expires_at ? new Date(row.plan_expires_at) : null;
    const isExpired = planExpiresAt && planExpiresAt < new Date();
    const tier = resolvePlanTier(isExpired ? 'free' : (row.plan_tier || 'free'));
    const tierDefaults = { ...(PLAN_TIERS[tier]?.limits || PLAN_TIERS.free.limits) };

    // Merge settings.limit_overrides (JSON)
    const settingsObj = row.settings && typeof row.settings === 'object' ? row.settings : {};
    const settingsOverrides = settingsObj.limit_overrides && typeof settingsObj.limit_overrides === 'object'
      ? settingsObj.limit_overrides : {};
    const parsedOverrides = Object.fromEntries(
      Object.entries(settingsOverrides)
        .map(([k, v]) => [k, Number(v)])
        .filter(([, v]) => Number.isFinite(v) && v >= -1)
    );

    // DB columns win over settings JSON for the three primary limits
    const limits = {
      ...tierDefaults,
      ...parsedOverrides,
      max_users: row.plan_seats != null && Number.isFinite(Number(row.plan_seats))
        ? Number(row.plan_seats) : tierDefaults.max_users,
      max_products: row.max_products != null && Number.isFinite(Number(row.max_products))
        ? Number(row.max_products) : tierDefaults.max_products,
      max_warehouses: row.max_warehouses != null && Number.isFinite(Number(row.max_warehouses))
        ? Number(row.max_warehouses) : tierDefaults.max_warehouses,
    };

    return { planTier: tier, limits, planExpiresAt };
  } finally {
    client.release();
  }
}

/**
 * @param {string} businessId
 * @returns {Promise<{ allowed: boolean; reason?: string; current: number; limit: number; upgradePlan?: string }>}
 */
export async function canAddProduct(businessId) {
  const client = await pool.connect();
  try {
    const [{ limits }, countRes] = await Promise.all([
      resolveBusinessLimits(businessId),
      client.query(
        `SELECT COUNT(*) FROM products WHERE business_id = $1 AND (deleted_at IS NULL OR deleted_at > NOW())`,
        [businessId]
      ),
    ]);

    const current = parseInt(countRes.rows[0].count, 10);
    const limit = limits.max_products;

    if (limit === -1) return { allowed: true, current, limit };
    if (current >= limit) {
      return {
        allowed: false,
        reason: `You have reached the product limit (${limit}) on your current plan.`,
        current,
        limit,
        upgradePlan: 'professional',
      };
    }
    return { allowed: true, current, limit };
  } finally {
    client.release();
  }
}

/**
 * @param {string} businessId
 * @returns {Promise<{ allowed: boolean; reason?: string; current: number; limit: number; upgradePlan?: string }>}
 */
export async function canAddUser(businessId) {
  const client = await pool.connect();
  try {
    const [{ limits }, countRes] = await Promise.all([
      resolveBusinessLimits(businessId),
      client.query(
        `SELECT COUNT(*) FROM business_users WHERE business_id = $1 AND status = 'active'`,
        [businessId]
      ),
    ]);

    const current = parseInt(countRes.rows[0].count, 10);
    const limit = limits.max_users;

    if (limit === -1) return { allowed: true, current, limit };
    if (current >= limit) {
      return {
        allowed: false,
        reason: `You have reached the team member limit (${limit}) on your current plan.`,
        current,
        limit,
        upgradePlan: 'professional',
      };
    }
    return { allowed: true, current, limit };
  } finally {
    client.release();
  }
}

/**
 * @param {string} businessId
 * @returns {Promise<{ allowed: boolean; reason?: string; current: number; limit: number; upgradePlan?: string }>}
 */
export async function canCreateOrder(businessId) {
  const client = await pool.connect();
  try {
    const [{ limits }, countRes] = await Promise.all([
      resolveBusinessLimits(businessId),
      client.query(
        `SELECT COUNT(*) FROM invoices
         WHERE business_id = $1
           AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`,
        [businessId]
      ),
    ]);

    const current = parseInt(countRes.rows[0].count, 10);
    const limit = limits.max_invoices_per_month;

    if (limit === -1) return { allowed: true, current, limit };
    if (current >= limit) {
      return {
        allowed: false,
        reason: `You have reached the monthly invoice limit (${limit}) on your current plan.`,
        current,
        limit,
        upgradePlan: 'professional',
      };
    }
    return { allowed: true, current, limit };
  } finally {
    client.release();
  }
}

/**
 * @param {string} businessId
 * @returns {Promise<{ allowed: boolean; reason?: string; retryAfter?: number }>}
 */
export async function canMakeApiCall(businessId) {
  // API rate limiting placeholder — not tied to a DB table today.
  // Returns allowed for all calls; wire to a redis/DB counter when needed.
  return { allowed: true };
}

/**
 * Log API usage (placeholder — wire to analytics or DB when needed).
 * @param {string} businessId
 * @param {string} url
 * @param {string} method
 */
export async function logApiUsage(businessId, url, method) {
  // No-op until an api_usage_log table is added.
}
