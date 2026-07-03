import pool from '@/lib/db';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';
import {
  MEMBERSHIP_EVENT,
  MEMBERSHIP_SOURCE,
  MEMBERSHIP_STATUS,
  ACTIVE_MEMBERSHIP_STATUSES,
} from '@/lib/memberships/membershipConstants';
import { classifyMembershipProduct } from '@/lib/memberships/membershipProductDetection';
import {
  computeDurationDays,
  computeMembershipEndsAt,
  resolveBillingInterval,
} from '@/lib/memberships/membershipDuration';
import { resolveMembershipVerticalKey } from '@/lib/memberships/membershipVertical';
import { recordMembershipEvent } from '@/lib/memberships/membershipEvents';
import { isMembershipEnabledSafe } from '@/lib/memberships/membershipFeatureGate';
import { extractBenefitsFromDomainRules } from '@/lib/memberships/membershipBenefits';
import { loadMembershipBusinessConfig } from '@/lib/memberships/loadMembershipBusinessConfig';
import { buildMembershipInsights } from '@/lib/memberships/membershipIntelligence';
import { MembershipRenewalService } from '@/lib/services/MembershipRenewalService';

function slugifyPlanName(name) {
  return String(name || 'plan')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function parseJsonField(val) {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
}

export const MembershipService = {
  async getClient(txClient) {
    return txClient || pool.connect();
  },

  async recordEvent(client, params) {
    return recordMembershipEvent(client, params);
  },

  /**
   * Attach recurring invoice when membership becomes active (shared activation path).
   * @param {import('pg').PoolClient} client
   */
  async attachRecurringInvoiceIfNeeded(client, { businessId, customerId, membership, plan, userId }) {
    if (!membership?.auto_renew || membership.status !== MEMBERSHIP_STATUS.ACTIVE || !customerId) {
      return membership?.recurring_invoice_id || null;
    }
    if (membership.recurring_invoice_id) return membership.recurring_invoice_id;

    const recurringInvoiceId = await MembershipRenewalService.ensureRecurringInvoice(
      { businessId, customerId, membership, plan, userId },
      client
    );
    if (recurringInvoiceId) {
      await client.query(
        `UPDATE customer_memberships SET recurring_invoice_id = $3::uuid, updated_at = NOW()
         WHERE id = $1::uuid AND business_id = $2::uuid`,
        [membership.id, businessId, recurringInvoiceId]
      );
    }
    return recurringInvoiceId;
  },

  /**
   * Upsert membership_plans row from a product SKU.
   * @param {object} params
   * @param {import('pg').PoolClient} [txClient]
   */
  async syncPlanFromProduct(params, txClient = null) {
    const client = await this.getClient(txClient);
    const shouldRelease = !txClient;

    try {
      const { businessId, productId, verticalKey, currency = 'PKR' } = params;

      const prodRes = await client.query(
        `SELECT id, name, price, compare_price, category, unit, domain_data
         FROM products
         WHERE id = $1::uuid AND business_id = $2::uuid AND (is_deleted = false)`,
        [productId, businessId]
      );
      if (prodRes.rows.length === 0) throw new Error('Product not found');
      const product = prodRes.rows[0];
      product.domain_data = parseJsonField(product.domain_data);

      const billingInterval = resolveBillingInterval(product, verticalKey);
      const durationDays = computeDurationDays(product, verticalKey);
      const slug = slugifyPlanName(product.name);
      const domainRules = { ...(product.domain_data || {}) };

      const existing = await client.query(
        `SELECT id FROM membership_plans
         WHERE business_id = $1::uuid AND product_id = $2::uuid`,
        [businessId, productId]
      );

      if (existing.rows.length > 0) {
        const upd = await client.query(
          `UPDATE membership_plans SET
             name = $3, slug = $4, vertical_key = $5, billing_interval = $6,
             duration_days = $7, price = $8, compare_price = $9, currency = $10,
             domain_rules = $11::jsonb, is_active = true, updated_at = NOW()
           WHERE id = $1::uuid AND business_id = $2::uuid
           RETURNING *`,
          [
            existing.rows[0].id,
            businessId,
            product.name,
            slug,
            verticalKey,
            billingInterval,
            durationDays,
            product.price,
            product.compare_price,
            currency,
            JSON.stringify(domainRules),
          ]
        );
        const plan = upd.rows[0];
        await this.syncBenefitsForPlan(client, businessId, plan.id, domainRules);
        return plan;
      }

      const ins = await client.query(
        `INSERT INTO membership_plans (
           business_id, product_id, vertical_key, name, slug, billing_interval,
           duration_days, price, compare_price, currency, domain_rules
         ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
         RETURNING *`,
        [
          businessId,
          productId,
          verticalKey,
          product.name,
          slug,
          billingInterval,
          durationDays,
          product.price,
          product.compare_price,
          currency,
          JSON.stringify(domainRules),
        ]
      );
      const plan = ins.rows[0];
      await this.syncBenefitsForPlan(client, businessId, plan.id, domainRules);
      return plan;
    } finally {
      if (shouldRelease) client.release();
    }
  },

  /**
   * Sync membership_benefits rows from plan domain rules (idempotent per benefit_type).
   * @param {import('pg').PoolClient} client
   */
  async syncBenefitsForPlan(client, businessId, planId, domainRules) {
    const desired = extractBenefitsFromDomainRules(domainRules);
    try {
      await client.query(
        `UPDATE membership_benefits SET is_active = false, updated_at = NOW()
         WHERE business_id = $1::uuid AND plan_id = $2::uuid`,
        [businessId, planId]
      );

      for (const benefit of desired) {
        await client.query(
          `DELETE FROM membership_benefits
           WHERE business_id = $1::uuid AND plan_id = $2::uuid AND benefit_type = $3`,
          [businessId, planId, benefit.benefit_type]
        );
        await client.query(
          `INSERT INTO membership_benefits (business_id, plan_id, benefit_type, value, is_active)
           VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, true)`,
          [businessId, planId, benefit.benefit_type, JSON.stringify(benefit.value)]
        );
      }
    } catch (err) {
      if (err?.code === '42P01') return;
      throw err;
    }
  },

  /**
   * List active benefits for a plan.
   * @param {import('pg').PoolClient} client
   */
  async listBenefitsForPlan(client, businessId, planId) {
    try {
      const res = await client.query(
        `SELECT id, benefit_type, value, is_active
         FROM membership_benefits
         WHERE business_id = $1::uuid AND plan_id = $2::uuid AND is_active = true
         ORDER BY benefit_type ASC`,
        [businessId, planId]
      );
      return res.rows.map((row) => ({
        ...row,
        value: parseJsonField(row.value),
      }));
    } catch (err) {
      if (err?.code === '42P01') return [];
      throw err;
    }
  },

  /**
   * Cancel prior active enrollment for same customer + plan before re-enrolling.
   */
  async supersedeActiveEnrollment(client, { businessId, customerId, planId, reason }) {
    const res = await client.query(
      `SELECT id FROM customer_memberships
       WHERE business_id = $1::uuid AND customer_id = $2::uuid AND plan_id = $3::uuid
         AND status = ANY($4::text[])`,
      [businessId, customerId, planId, ACTIVE_MEMBERSHIP_STATUSES]
    );

    for (const row of res.rows) {
      await client.query(
        `UPDATE customer_memberships SET
           status = $3, cancelled_at = NOW(), updated_at = NOW()
         WHERE id = $1::uuid AND business_id = $2::uuid`,
        [row.id, businessId, MEMBERSHIP_STATUS.CANCELLED]
      );
      await this.recordEvent(client, {
        businessId,
        membershipId: row.id,
        eventType: MEMBERSHIP_EVENT.UPGRADED,
        metadata: { reason: reason || 'superseded_by_new_enrollment' },
      });
    }
  },

  /**
   * Enroll a customer in a plan.
   * @param {object} data
   * @param {import('pg').PoolClient} [txClient]
   */
  async enrollCustomer(data, txClient = null) {
    const client = await this.getClient(txClient);
    const shouldManageTransaction = !txClient;
    const shouldRelease = !txClient;

    try {
      if (shouldManageTransaction) await client.query('BEGIN');

      const {
        businessId,
        customerId,
        planId,
        productId,
        source = MEMBERSHIP_SOURCE.HUB,
        status,
        autoRenew,
        amountPaid = 0,
        initialStorefrontOrderId,
        initialPosTransactionId,
        initialInvoiceId,
        domainData = {},
        verticalKey,
        userId,
      } = data;

      await assertEntityBelongsToBusiness(client, 'customer', customerId, businessId);

      const planRes = await client.query(
        `SELECT * FROM membership_plans WHERE id = $1::uuid AND business_id = $2::uuid`,
        [planId, businessId]
      );
      if (planRes.rows.length === 0) throw new Error('Membership plan not found');
      const plan = planRes.rows[0];

      await this.supersedeActiveEnrollment(client, {
        businessId,
        customerId,
        planId,
        reason: 'new_enrollment',
      });

      const startedAt = new Date();
      let endsAt = null;
      let nextBillingAt = null;

      if (productId) {
        const prodRes = await client.query(
          `SELECT unit, domain_data FROM products WHERE id = $1::uuid AND business_id = $2::uuid`,
          [productId, businessId]
        );
        if (prodRes.rows.length > 0) {
          const product = prodRes.rows[0];
          product.domain_data = parseJsonField(product.domain_data);
          endsAt = computeMembershipEndsAt(startedAt, product, verticalKey || plan.vertical_key);
        }
      } else {
        if (plan.duration_days) {
          endsAt = new Date(startedAt);
          endsAt.setDate(endsAt.getDate() + Number(plan.duration_days));
        }
      }

      const membershipConfig = await loadMembershipBusinessConfig(client, businessId);
      const billingAllowsRenew =
        plan.billing_interval !== 'session_pack' && plan.billing_interval !== 'none';
      const resolvedAutoRenew =
        autoRenew ??
        (membershipConfig.defaultAutoRenew !== false ? billingAllowsRenew : false);
      const resolvedStatus =
        status ||
        (source === MEMBERSHIP_SOURCE.POS
          ? MEMBERSHIP_STATUS.ACTIVE
          : MEMBERSHIP_STATUS.PENDING);

      if (resolvedAutoRenew && endsAt) {
        nextBillingAt = new Date(endsAt);
      }

      const ins = await client.query(
        `INSERT INTO customer_memberships (
           business_id, customer_id, plan_id, product_id, status, started_at, ends_at,
           next_billing_at, auto_renew, source, initial_storefront_order_id,
           initial_pos_transaction_id, initial_invoice_id, amount_paid, domain_data
         ) VALUES (
           $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8, $9, $10, $11, $12::uuid, $13::uuid, $14, $15::jsonb
         ) RETURNING *`,
        [
          businessId,
          customerId,
          planId,
          productId || plan.product_id || null,
          resolvedStatus,
          startedAt,
          endsAt,
          nextBillingAt,
          resolvedAutoRenew,
          source,
          initialStorefrontOrderId || null,
          initialPosTransactionId || null,
          initialInvoiceId || null,
          amountPaid,
          JSON.stringify(domainData),
        ]
      );
      const membership = ins.rows[0];

      await this.recordEvent(client, {
        businessId,
        membershipId: membership.id,
        eventType: MEMBERSHIP_EVENT.ENROLLED,
        metadata: { source, planId, productId },
      });

      if (membership.status === MEMBERSHIP_STATUS.ACTIVE) {
        await this.recordEvent(client, {
          businessId,
          membershipId: membership.id,
          eventType: MEMBERSHIP_EVENT.ACTIVATED,
          metadata: {},
        });
      }

      if (resolvedAutoRenew && membership.status === MEMBERSHIP_STATUS.ACTIVE && customerId) {
        await this.attachRecurringInvoiceIfNeeded(client, {
          businessId,
          customerId,
          membership,
          plan,
          userId,
        });
      }

      if (shouldManageTransaction) await client.query('COMMIT');
      return membership;
    } catch (error) {
      if (shouldManageTransaction) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (shouldRelease) client.release();
    }
  },

  /**
   * Process order/POS line items and enroll for membership SKUs.
   * @param {object} params
   * @param {import('pg').PoolClient} txClient — required (same tx as checkout)
   */
  async enrollFromLineItems(params, txClient) {
    if (!txClient) throw new Error('enrollFromLineItems requires an active transaction client');

    const {
      businessId,
      category: categoryParam,
      customerId,
      source,
      paymentConfirmed = false,
      initialStorefrontOrderId,
      initialPosTransactionId,
      currency = 'PKR',
      lines = [],
      userId,
    } = params;

    if (!customerId || !lines.length) return [];

    const enabled = await isMembershipEnabledSafe(txClient, businessId);
    if (!enabled) return [];

    let category = categoryParam;
    if (!category) {
      const bizRes = await txClient.query(
        `SELECT category FROM businesses WHERE id = $1::uuid`,
        [businessId]
      );
      category = bizRes.rows[0]?.category;
    }

    const verticalKey = resolveMembershipVerticalKey(category);
    if (!verticalKey) return [];

    const enrollments = [];

    for (const line of lines) {
      if (!line?.productId) continue;

      const prodRes = await txClient.query(
        `SELECT id, name, price, compare_price, category, unit, domain_data
         FROM products WHERE id = $1::uuid AND business_id = $2::uuid AND (is_deleted = false)`,
        [line.productId, businessId]
      );
      if (prodRes.rows.length === 0) continue;

      const product = prodRes.rows[0];
      product.domain_data = parseJsonField(product.domain_data);
      const classification = classifyMembershipProduct(product, category);
      if (!classification.isMembership) continue;

      const plan = await this.syncPlanFromProduct(
        { businessId, productId: product.id, verticalKey, currency },
        txClient
      );

      const qty = Math.max(1, Number(line.quantity) || 1);
      for (let i = 0; i < qty; i++) {
        const status =
          source === MEMBERSHIP_SOURCE.POS || paymentConfirmed
            ? MEMBERSHIP_STATUS.ACTIVE
            : MEMBERSHIP_STATUS.PENDING;

        const membership = await this.enrollCustomer(
          {
            businessId,
            customerId,
            planId: plan.id,
            productId: product.id,
            source,
            status,
            autoRenew: classification.autoRenewEligible,
            amountPaid: Number(line.unitPrice || product.price || 0),
            initialStorefrontOrderId,
            initialPosTransactionId,
            verticalKey,
            domainData: product.domain_data || {},
            userId,
          },
          txClient
        );
        enrollments.push(membership);
      }
    }

    return enrollments;
  },

  async listMemberships(businessId, filters = {}, txClient = null) {
    const client = await this.getClient(txClient);
    const shouldRelease = !txClient;

    try {
      const conditions = ['cm.business_id = $1::uuid'];
      const values = [businessId];
      let idx = 2;

      if (filters.status) {
        conditions.push(`cm.status = $${idx}`);
        values.push(filters.status);
        idx++;
      }
      if (filters.customerId) {
        conditions.push(`cm.customer_id = $${idx}::uuid`);
        values.push(filters.customerId);
        idx++;
      }
      if (filters.planId) {
        conditions.push(`cm.plan_id = $${idx}::uuid`);
        values.push(filters.planId);
        idx++;
      }

      const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
      const offset = Math.max(0, Number(filters.offset) || 0);

      const res = await client.query(
        `SELECT cm.*,
                c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
                mp.name AS plan_name, mp.billing_interval, mp.vertical_key
         FROM customer_memberships cm
         JOIN customers c ON c.id = cm.customer_id AND c.business_id = cm.business_id
         JOIN membership_plans mp ON mp.id = cm.plan_id AND mp.business_id = cm.business_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY cm.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      );

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM customer_memberships cm WHERE ${conditions.join(' AND ')}`,
        values
      );

      return { memberships: res.rows, total: countRes.rows[0]?.total || 0 };
    } finally {
      if (shouldRelease) client.release();
    }
  },

  async listPlans(businessId, txClient = null) {
    const client = await this.getClient(txClient);
    const shouldRelease = !txClient;
    try {
      const res = await client.query(
        `SELECT mp.*, p.sku AS product_sku, p.category AS product_category,
                (SELECT COUNT(*)::int FROM customer_memberships cm
                 WHERE cm.plan_id = mp.id AND cm.business_id = mp.business_id
                   AND cm.status = ANY($2::text[])) AS active_enrollments,
                (SELECT COUNT(*)::int FROM membership_benefits mb
                 WHERE mb.plan_id = mp.id AND mb.business_id = mp.business_id
                   AND mb.is_active = true) AS benefits_count
         FROM membership_plans mp
         LEFT JOIN products p ON p.id = mp.product_id AND p.business_id = mp.business_id
         WHERE mp.business_id = $1::uuid
         ORDER BY mp.name ASC`,
        [businessId, ACTIVE_MEMBERSHIP_STATUSES]
      );
      return res.rows;
    } finally {
      if (shouldRelease) client.release();
    }
  },

  async updateMembershipStatus(businessId, membershipId, status, metadata = {}, txClient = null) {
    const client = await this.getClient(txClient);
    const shouldManageTransaction = !txClient;
    const shouldRelease = !txClient;

    try {
      if (shouldManageTransaction) await client.query('BEGIN');

      const existingRes = await client.query(
        `SELECT * FROM customer_memberships WHERE id = $1::uuid AND business_id = $2::uuid`,
        [membershipId, businessId]
      );
      if (existingRes.rows.length === 0) throw new Error('Membership not found');

      const row = existingRes.rows[0];
      const priorStatus = row.status;

      if (
        status === MEMBERSHIP_STATUS.ACTIVE &&
        priorStatus === MEMBERSHIP_STATUS.PAUSED &&
        row.paused_at
      ) {
        const config = await loadMembershipBusinessConfig(client, businessId);
        const freezeMaxDays = Number(config.freezeMaxDays || 0);
        if (freezeMaxDays > 0) {
          const pausedMs = Date.now() - new Date(row.paused_at).getTime();
          const maxMs = freezeMaxDays * 86400000;
          if (pausedMs > maxMs) {
            throw new Error(
              `Pause exceeded the ${freezeMaxDays}-day freeze limit. Cancel and re-enroll instead.`
            );
          }
        }
      }

      if (status === MEMBERSHIP_STATUS.CANCELLED) {
        await client.query(
          `UPDATE customer_memberships SET status = $3, cancelled_at = NOW(), updated_at = NOW()
           WHERE id = $1::uuid AND business_id = $2::uuid`,
          [membershipId, businessId, status]
        );
      } else if (status === MEMBERSHIP_STATUS.PAUSED) {
        await client.query(
          `UPDATE customer_memberships SET status = $3, paused_at = NOW(), updated_at = NOW()
           WHERE id = $1::uuid AND business_id = $2::uuid`,
          [membershipId, businessId, status]
        );
      } else {
        await client.query(
          `UPDATE customer_memberships SET status = $3, updated_at = NOW()
           WHERE id = $1::uuid AND business_id = $2::uuid`,
          [membershipId, businessId, status]
        );
      }

      let eventType = MEMBERSHIP_EVENT.ACTIVATED;
      if (status === MEMBERSHIP_STATUS.PAUSED) {
        eventType = MEMBERSHIP_EVENT.PAUSED;
      } else if (status === MEMBERSHIP_STATUS.CANCELLED) {
        eventType = MEMBERSHIP_EVENT.CANCELLED;
      } else if (status === MEMBERSHIP_STATUS.EXPIRED) {
        eventType = MEMBERSHIP_EVENT.EXPIRED;
      } else if (
        status === MEMBERSHIP_STATUS.ACTIVE &&
        priorStatus === MEMBERSHIP_STATUS.PAUSED
      ) {
        eventType = MEMBERSHIP_EVENT.RESUMED;
      }

      await this.recordEvent(client, {
        businessId,
        membershipId,
        eventType,
        metadata,
      });

      if (status === MEMBERSHIP_STATUS.ACTIVE) {
        const planRes = await client.query(
          `SELECT * FROM membership_plans WHERE id = $1::uuid AND business_id = $2::uuid`,
          [row.plan_id, businessId]
        );
        const plan = planRes.rows[0];
        if (plan) {
          await this.attachRecurringInvoiceIfNeeded(client, {
            businessId,
            customerId: row.customer_id,
            membership: { ...row, status: MEMBERSHIP_STATUS.ACTIVE },
            plan,
            userId: metadata.userId || null,
          });
        }
      }

      if (shouldManageTransaction) await client.query('COMMIT');

      return { ...row, status };
    } catch (error) {
      if (shouldManageTransaction) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (shouldRelease) client.release();
    }
  },

  async syncPlansFromInventory(businessId, category, txClient = null) {
    const client = await this.getClient(txClient);
    const shouldRelease = !txClient;
    const verticalKey = resolveMembershipVerticalKey(category);
    if (!verticalKey) return [];

    try {
      const prods = await client.query(
        `SELECT id FROM products
         WHERE business_id = $1::uuid AND (is_deleted = false)
           AND (
             lower(coalesce(category, '')) LIKE '%membership%'
             OR domain_data ? 'membershiptype'
             OR domain_data ? 'membership_type'
           )`,
        [businessId]
      );

      const plans = [];
      for (const row of prods.rows) {
        const plan = await this.syncPlanFromProduct(
          { businessId, productId: row.id, verticalKey },
          client
        );
        plans.push(plan);
      }
      return plans;
    } finally {
      if (shouldRelease) client.release();
    }
  },

  async getMembershipStats(businessId, txClient = null) {
    const client = await this.getClient(txClient);
    const shouldRelease = !txClient;
    try {
      const res = await client.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
           COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
           COUNT(*) FILTER (WHERE status = 'paused')::int AS paused_count,
           COUNT(*) FILTER (WHERE ends_at IS NOT NULL AND ends_at <= NOW() + INTERVAL '14 days' AND status = 'active')::int AS expiring_soon
         FROM customer_memberships
         WHERE business_id = $1::uuid`,
        [businessId]
      );
      return res.rows[0] || { active_count: 0, pending_count: 0, paused_count: 0, expiring_soon: 0 };
    } finally {
      if (shouldRelease) client.release();
    }
  },

  /**
   * Activate pending enrollments tied to a paid storefront order.
   * @param {string} businessId
   * @param {number} orderId
   * @param {import('pg').PoolClient} client
   * @param {string | null} [userId]
   */
  async activatePendingForStorefrontOrder(businessId, orderId, client, userId = null) {
    const pending = await client.query(
      `SELECT cm.*, mp.name AS plan_name, mp.billing_interval, mp.price, mp.product_id AS plan_product_id
       FROM customer_memberships cm
       JOIN membership_plans mp ON mp.id = cm.plan_id AND mp.business_id = cm.business_id
       WHERE cm.business_id = $1::uuid
         AND cm.initial_storefront_order_id = $2::integer
         AND cm.status = $3`,
      [businessId, orderId, MEMBERSHIP_STATUS.PENDING]
    );

    let activated = 0;
    for (const row of pending.rows) {
      await client.query(
        `UPDATE customer_memberships SET status = $3, updated_at = NOW()
         WHERE id = $1::uuid AND business_id = $2::uuid`,
        [row.id, businessId, MEMBERSHIP_STATUS.ACTIVE]
      );

      await this.recordEvent(client, {
        businessId,
        membershipId: row.id,
        eventType: MEMBERSHIP_EVENT.ACTIVATED,
        metadata: { storefront_order_id: orderId },
      });

      const plan = {
        id: row.plan_id,
        name: row.plan_name,
        billing_interval: row.billing_interval,
        price: row.price,
        product_id: row.plan_product_id,
      };

      await this.attachRecurringInvoiceIfNeeded(client, {
        businessId,
        customerId: row.customer_id,
        membership: { ...row, status: MEMBERSHIP_STATUS.ACTIVE },
        plan,
        userId,
      });

      activated++;
    }

    return { activated };
  },

  /**
   * Cancel pending enrollments when a storefront order is cancelled (before activation).
   * @param {string} businessId
   * @param {number} orderId
   * @param {import('pg').PoolClient} client
   */
  async cancelPendingForStorefrontOrder(businessId, orderId, client) {
    return this.revokeEnrollmentsForStorefrontOrder(businessId, orderId, client, {
      includeActive: false,
      reason: 'storefront_order_cancelled',
    });
  },

  /**
   * Revoke memberships tied to a storefront order (refund or paid-order cancellation).
   * @param {string} businessId
   * @param {number} orderId
   * @param {import('pg').PoolClient} client
   * @param {{ includeActive?: boolean; reason?: string }} [options]
   */
  async revokeEnrollmentsForStorefrontOrder(businessId, orderId, client, options = {}) {
    const { includeActive = false, reason = 'storefront_order_revoked' } = options;
    const statuses = includeActive
      ? [
          MEMBERSHIP_STATUS.PENDING,
          MEMBERSHIP_STATUS.ACTIVE,
          MEMBERSHIP_STATUS.TRIAL,
          MEMBERSHIP_STATUS.PAUSED,
        ]
      : [MEMBERSHIP_STATUS.PENDING];

    const res = await client.query(
      `UPDATE customer_memberships
       SET status = $3, cancelled_at = NOW(), updated_at = NOW(), auto_renew = false
       WHERE business_id = $1::uuid
         AND initial_storefront_order_id = $2::integer
         AND status = ANY($4::text[])
       RETURNING id`,
      [businessId, orderId, MEMBERSHIP_STATUS.CANCELLED, statuses]
    );

    for (const row of res.rows) {
      await this.recordEvent(client, {
        businessId,
        membershipId: row.id,
        eventType: MEMBERSHIP_EVENT.CANCELLED,
        metadata: { reason, storefront_order_id: orderId },
      });
    }

    return { cancelled: res.rows.length };
  },

  /**
   * Revoke memberships sold via POS when the transaction is fully refunded.
   * @param {string} businessId
   * @param {string} posTransactionId
   * @param {import('pg').PoolClient} client
   */
  async revokeEnrollmentsForPosTransaction(businessId, posTransactionId, client) {
    const res = await client.query(
      `UPDATE customer_memberships
       SET status = $3, cancelled_at = NOW(), updated_at = NOW(), auto_renew = false
       WHERE business_id = $1::uuid
         AND initial_pos_transaction_id = $2::uuid
         AND status = ANY($4::text[])
       RETURNING id`,
      [
        businessId,
        posTransactionId,
        MEMBERSHIP_STATUS.CANCELLED,
        [
          MEMBERSHIP_STATUS.PENDING,
          MEMBERSHIP_STATUS.ACTIVE,
          MEMBERSHIP_STATUS.TRIAL,
          MEMBERSHIP_STATUS.PAUSED,
        ],
      ]
    );

    for (const row of res.rows) {
      await this.recordEvent(client, {
        businessId,
        membershipId: row.id,
        eventType: MEMBERSHIP_EVENT.CANCELLED,
        metadata: { reason: 'pos_refund', pos_transaction_id: posTransactionId },
      });
    }

    return { cancelled: res.rows.length };
  },

  /**
   * Hub-editable benefits (does not overwrite product domain_data).
   * @param {import('pg').PoolClient} client
   */
  async upsertPlanBenefits(client, businessId, planId, benefits = []) {
    await client.query(
      `UPDATE membership_benefits SET is_active = false, updated_at = NOW()
       WHERE business_id = $1::uuid AND plan_id = $2::uuid`,
      [businessId, planId]
    );

    for (const benefit of benefits) {
      if (!benefit?.benefit_type) continue;
      await client.query(
        `DELETE FROM membership_benefits
         WHERE business_id = $1::uuid AND plan_id = $2::uuid AND benefit_type = $3`,
        [businessId, planId, benefit.benefit_type]
      );
      await client.query(
        `INSERT INTO membership_benefits (business_id, plan_id, benefit_type, value, is_active)
         VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, true)`,
        [businessId, planId, benefit.benefit_type, JSON.stringify(benefit.value || {})]
      );
    }
  },

  /**
   * Domain-aware membership intelligence for hub dashboard.
   * @param {string} businessId
   * @param {string | null | undefined} category
   * @param {import('pg').PoolClient} [txClient]
   */
  async getMembershipInsights(businessId, category, txClient = null) {
    const client = await this.getClient(txClient);
    const shouldRelease = !txClient;
    try {
      const stats = await this.getMembershipStats(businessId, client);
      const verticalKey = resolveMembershipVerticalKey(category);

      let overdueRenewals = 0;
      let paymentFailedPaused = 0;

      try {
        const overdueRes = await client.query(
          `SELECT COUNT(DISTINCT cm.id)::int AS cnt
           FROM customer_memberships cm
           JOIN invoices parent
             ON parent.id = cm.recurring_invoice_id AND parent.business_id = cm.business_id
           JOIN invoices child
             ON child.recurring_parent_id = parent.id AND child.business_id = cm.business_id
           JOIN businesses b ON b.id = cm.business_id
           WHERE cm.business_id = $1::uuid
             AND cm.auto_renew = true
             AND cm.status = ANY($2::text[])
             AND COALESCE(child.payment_status, 'unpaid') NOT IN ('paid')
             AND child.due_date + (
               COALESCE(NULLIF(b.settings->'memberships'->>'renewalGraceDays', '')::int, 7)
               * INTERVAL '1 day'
             ) < NOW()`,
          [
            businessId,
            [MEMBERSHIP_STATUS.ACTIVE, MEMBERSHIP_STATUS.PAUSED],
          ]
        );
        overdueRenewals = parseInt(overdueRes.rows[0]?.cnt || 0, 10);

        const pausedRes = await client.query(
          `SELECT COUNT(*)::int AS cnt
           FROM customer_memberships cm
           JOIN membership_events me
             ON me.membership_id = cm.id AND me.business_id = cm.business_id
           WHERE cm.business_id = $1::uuid
             AND cm.status = $2
             AND me.event_type = $3
             AND me.created_at > NOW() - INTERVAL '90 days'`,
          [businessId, MEMBERSHIP_STATUS.PAUSED, MEMBERSHIP_EVENT.PAYMENT_FAILED]
        );
        paymentFailedPaused = parseInt(pausedRes.rows[0]?.cnt || 0, 10);
      } catch (err) {
        if (err?.code !== '42P01') throw err;
      }

      const bizRes = await client.query(
        `SELECT currency FROM businesses WHERE id = $1::uuid LIMIT 1`,
        [businessId]
      );
      const currency = bizRes.rows[0]?.currency || 'PKR';

      return buildMembershipInsights({
        stats,
        overdueRenewals,
        paymentFailedPaused,
        verticalKey,
        currency,
      });
    } finally {
      if (shouldRelease) client.release();
    }
  },

  /**
   * Pause active memberships with overdue unpaid renewal invoices (cron).
   * @param {import('pg').PoolClient} [client]
   */
  async processOverdueRenewalFailures(client) {
    const ownsClient = !client;
    const db = client || (await pool.connect());
    let paused = 0;

    try {
      const due = await db.query(
        `SELECT DISTINCT cm.id, cm.business_id, cm.customer_id, child.id AS invoice_id
         FROM customer_memberships cm
         JOIN invoices parent
           ON parent.id = cm.recurring_invoice_id AND parent.business_id = cm.business_id
         JOIN invoices child
           ON child.recurring_parent_id = parent.id AND child.business_id = cm.business_id
         JOIN businesses b ON b.id = cm.business_id
         WHERE cm.status = $1
           AND cm.auto_renew = true
           AND COALESCE(child.payment_status, 'unpaid') NOT IN ('paid')
           AND child.due_date + (
             COALESCE(NULLIF(b.settings->'memberships'->>'renewalGraceDays', '')::int, 7)
             * INTERVAL '1 day'
           ) < NOW()`,
        [MEMBERSHIP_STATUS.ACTIVE]
      );

      for (const row of due.rows) {
        const config = await loadMembershipBusinessConfig(db, row.business_id);
        if (config.autoPauseOnFailedPayment === false) continue;

        await db.query(
          `UPDATE customer_memberships SET status = $3, paused_at = NOW(), updated_at = NOW()
           WHERE id = $1::uuid AND business_id = $2::uuid`,
          [row.id, row.business_id, MEMBERSHIP_STATUS.PAUSED]
        );

        await this.recordEvent(db, {
          businessId: row.business_id,
          membershipId: row.id,
          eventType: MEMBERSHIP_EVENT.PAYMENT_FAILED,
          metadata: { invoice_id: row.invoice_id, reason: 'overdue_renewal_invoice' },
        });

        paused++;
      }

      return { paused };
    } catch (err) {
      if (err?.code === '42P01') return { paused: 0, skipped: true };
      throw err;
    } finally {
      if (ownsClient) db.release();
    }
  },

  /**
   * Resume membership when a linked renewal invoice is fully paid.
   * @param {string} businessId
   * @param {string} invoiceId
   * @param {import('pg').PoolClient} client
   * @param {string | null} [userId]
   */
  async handleMembershipInvoicePaid(businessId, invoiceId, client, userId = null) {
    const invRes = await client.query(
      `SELECT id, recurring_parent_id, payment_status, notes
       FROM invoices WHERE id = $1::uuid AND business_id = $2::uuid`,
      [invoiceId, businessId]
    );
    if (invRes.rows.length === 0) return { handled: false };
    const invoice = invRes.rows[0];
    if (invoice.payment_status !== 'paid') return { handled: false, skipped: 'not_fully_paid' };

    const parentId = invoice.recurring_parent_id || invoice.id;
    const memRes = await client.query(
      `SELECT cm.*, mp.billing_interval, mp.name AS plan_name
       FROM customer_memberships cm
       JOIN membership_plans mp ON mp.id = cm.plan_id AND mp.business_id = cm.business_id
       WHERE cm.business_id = $1::uuid AND cm.recurring_invoice_id = $2::uuid
       LIMIT 1`,
      [businessId, parentId]
    );
    if (memRes.rows.length === 0) return { handled: false };

    const membership = memRes.rows[0];
    let resumed = false;

    if (membership.status === MEMBERSHIP_STATUS.PAUSED) {
      await client.query(
        `UPDATE customer_memberships SET status = $3, updated_at = NOW(), paused_at = NULL
         WHERE id = $1::uuid AND business_id = $2::uuid`,
        [membership.id, businessId, MEMBERSHIP_STATUS.ACTIVE]
      );
      await this.recordEvent(client, {
        businessId,
        membershipId: membership.id,
        eventType: MEMBERSHIP_EVENT.RESUMED,
        metadata: { invoice_id: invoiceId, reason: 'renewal_paid' },
      });
      resumed = true;
    }

    await this.recordEvent(client, {
      businessId,
      membershipId: membership.id,
      eventType: MEMBERSHIP_EVENT.RENEWED,
      metadata: { invoice_id: invoiceId, resumed },
    });

    return { handled: true, membershipId: membership.id, resumed };
  },

  /**
   * Mark active/trial/paused memberships expired when ends_at (+ grace) has passed.
   * @param {import('pg').PoolClient} [client]
   */
  async expireLapsedMemberships(client) {
    const ownsClient = !client;
    const db = client || (await pool.connect());
    try {
      const res = await db.query(
        `UPDATE customer_memberships cm
         SET status = $1, updated_at = NOW()
         FROM businesses b
         WHERE cm.business_id = b.id
           AND cm.status = ANY($2::text[])
           AND cm.ends_at IS NOT NULL
           AND cm.ends_at + (
             COALESCE(NULLIF(b.settings->'memberships'->>'renewalGraceDays', '')::int, 7)
             * INTERVAL '1 day'
           ) < NOW()
         RETURNING cm.id, cm.business_id`,
        [
          MEMBERSHIP_STATUS.EXPIRED,
          [MEMBERSHIP_STATUS.ACTIVE, MEMBERSHIP_STATUS.TRIAL, MEMBERSHIP_STATUS.PAUSED],
        ]
      );

      for (const row of res.rows) {
        await this.recordEvent(db, {
          businessId: row.business_id,
          membershipId: row.id,
          eventType: MEMBERSHIP_EVENT.EXPIRED,
          metadata: { reason: 'ends_at_passed' },
        });
      }

      return { expired: res.rows.length };
    } catch (err) {
      if (err?.code === '42P01') return { expired: 0, skipped: true };
      throw err;
    } finally {
      if (ownsClient) db.release();
    }
  },
};
