import { DocumentSequenceService } from '@/lib/services/DocumentSequenceService';
import { billingIntervalToRecurringFrequency } from '@/lib/memberships/membershipDuration';
import { MEMBERSHIP_EVENT } from '@/lib/memberships/membershipConstants';
import { recordMembershipEvent } from '@/lib/memberships/membershipEvents';

export const MembershipRenewalService = {
  /**
   * Create a recurring parent invoice for auto-renew membership billing.
   * @param {object} params
   * @param {import('pg').PoolClient} client
   * @returns {Promise<string|null>} invoice id
   */
  async ensureRecurringInvoice(params, client) {
    const { businessId, customerId, membership, plan, userId } = params;
    if (!membership?.auto_renew) return null;
    if (membership.recurring_invoice_id) return membership.recurring_invoice_id;

    const frequency = billingIntervalToRecurringFrequency(plan.billing_interval);
    if (!frequency) return null;

    const invNumber = await DocumentSequenceService.generateNumber(
      { businessId, documentType: 'invoice', prefix: 'INV-', padLength: 6 },
      client
    );

    const amount = Number(plan.price || membership.amount_paid || 0);
    const nextDate = membership.ends_at ? new Date(membership.ends_at) : new Date();

    const res = await client.query(
      `INSERT INTO invoices (
         business_id, customer_id, invoice_number, date, due_date, status, created_by,
         subtotal, tax_total, discount_total, grand_total, payment_status, notes,
         is_recurring, recurring_frequency, next_invoice_date
       ) VALUES (
         $1::uuid, $2::uuid, $3, CURRENT_DATE, $4, 'sent', $5,
         $6, 0, 0, $6, 'unpaid', $7,
         true, $8, $9
       ) RETURNING id`,
      [
        businessId,
        customerId,
        invNumber,
        nextDate,
        userId || null,
        amount,
        `Recurring membership: ${plan.name}`,
        frequency,
        nextDate,
      ]
    );

    const invoiceId = res.rows[0].id;

    await client.query(
      `INSERT INTO invoice_items (
         business_id, invoice_id, product_id, description, quantity, unit_price, tax_amount, total_amount
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, 1, $5, 0, $5)`,
      [
        businessId,
        invoiceId,
        plan.product_id || membership.product_id || null,
        plan.name,
        amount,
      ]
    );

    await recordMembershipEvent(client, {
      businessId,
      membershipId: membership.id,
      eventType: MEMBERSHIP_EVENT.RECURRING_INVOICE_CREATED,
      metadata: { invoiceId, frequency },
    });

    return invoiceId;
  },

  /**
   * Generate child renewal invoices for memberships due for billing.
   * Intended for cron: POST /api/internal/memberships/process-renewals
   */
  async processDueRenewals(businessId = null, txClient = null) {
    const pool = (await import('@/lib/db')).default;
    const client = txClient || (await pool.connect());
    const shouldRelease = !txClient;
    let processed = 0;

    try {
      if (!txClient) await client.query('BEGIN');

      const params = [];
      let bizFilter = '';
      if (businessId) {
        bizFilter = 'AND cm.business_id = $1::uuid';
        params.push(businessId);
      }

      const due = await client.query(
        `SELECT cm.*, mp.name AS plan_name, mp.price AS plan_price, mp.billing_interval, mp.product_id AS plan_product_id
         FROM customer_memberships cm
         JOIN membership_plans mp ON mp.id = cm.plan_id AND mp.business_id = cm.business_id
         WHERE cm.status = 'active'
           AND cm.auto_renew = true
           AND cm.next_billing_at IS NOT NULL
           AND cm.next_billing_at <= NOW()
           ${bizFilter}`,
        params
      );

      for (const row of due.rows) {
        const parentId = row.recurring_invoice_id;
        if (!parentId) continue;

        const parentRes = await client.query(
          `SELECT * FROM invoices WHERE id = $1::uuid AND business_id = $2::uuid`,
          [parentId, row.business_id]
        );
        if (parentRes.rows.length === 0) continue;
        const parent = parentRes.rows[0];

        const invNumber = await DocumentSequenceService.generateNumber(
          { businessId: row.business_id, documentType: 'invoice', prefix: 'INV-', padLength: 6 },
          client
        );

        const amount = Number(row.plan_price || row.amount_paid || 0);
        const childRes = await client.query(
          `INSERT INTO invoices (
             business_id, customer_id, invoice_number, date, due_date, status,
             subtotal, tax_total, discount_total, grand_total, payment_status, notes,
             is_recurring, recurring_parent_id, recurring_frequency
           ) VALUES (
             $1::uuid, $2::uuid, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'sent',
             $4, 0, 0, $4, 'unpaid', $5,
             true, $6::uuid, $7
           ) RETURNING id`,
          [
            row.business_id,
            row.customer_id,
            invNumber,
            amount,
            `Membership renewal: ${row.plan_name}`,
            parentId,
            parent.recurring_frequency,
          ]
        );

        await client.query(
          `INSERT INTO invoice_items (
             business_id, invoice_id, product_id, description, quantity, unit_price, tax_amount, total_amount
           ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, 1, $5, 0, $5)`,
          [
            row.business_id,
            childRes.rows[0].id,
            row.plan_product_id || row.product_id,
            row.plan_name,
            amount,
          ]
        );

        const newEnds = row.ends_at ? new Date(row.ends_at) : new Date();
        if (parent.recurring_frequency === 'monthly') newEnds.setMonth(newEnds.getMonth() + 1);
        else if (parent.recurring_frequency === 'quarterly') newEnds.setMonth(newEnds.getMonth() + 3);
        else if (parent.recurring_frequency === 'yearly') newEnds.setFullYear(newEnds.getFullYear() + 1);
        else newEnds.setMonth(newEnds.getMonth() + 1);

        await client.query(
          `UPDATE customer_memberships SET
             ends_at = $3, next_billing_at = $3, updated_at = NOW()
           WHERE id = $1::uuid AND business_id = $2::uuid`,
          [row.id, row.business_id, newEnds]
        );

        await recordMembershipEvent(client, {
          businessId: row.business_id,
          membershipId: row.id,
          eventType: MEMBERSHIP_EVENT.RENEWED,
          metadata: { invoiceId: childRes.rows[0].id },
        });

        processed++;
      }

      if (!txClient) await client.query('COMMIT');
      return { processed };
    } catch (error) {
      if (!txClient) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (shouldRelease) client.release();
    }
  },
};
