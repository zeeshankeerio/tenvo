import pool from '@/lib/db';
import { AccountingService } from './AccountingService';
import { ACCOUNT_CODES } from '@/lib/config/accounting';

/**
 * Payment Reconciliation Service
 * Reconciles paid storefront orders with the finance module using `journal_entries` + `gl_entries`
 * (aligned with Prisma / AccountingService), and stores pointers in `storefront_orders.metadata`.
 */

/** Stable idempotency token embedded in journal description (storefront order PK is Int, not UUID). */
function storefrontOrderJournalDescription(order) {
  return `[ref:storefront_order:${order.id}] Storefront Order #${order.order_number}, ${order.customer_name || order.customer_email || 'Guest'}`;
}

async function resolveAccountByCode(client, businessId, code) {
  const r = await client.query(
    `SELECT id FROM gl_accounts WHERE business_id = $1 AND code = $2 AND (is_active IS NULL OR is_active = true) LIMIT 1`,
    [businessId, code]
  );
  if (r.rows.length === 0) {
    throw new Error(
      `Missing GL account with code ${code} for business ${businessId}. Seed chart of accounts first.`
    );
  }
  return r.rows[0].id;
}

/**
 * Create journal entries for a paid order
 * @param {number|string} orderId - storefront_orders.id (Int PK)
 * @param {string} businessId
 */
export async function reconcileOrderPayment(orderId, businessId) {
  const client = await pool.connect();
  const orderIdNum = typeof orderId === 'string' ? parseInt(orderId, 10) : Number(orderId);

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `SELECT 
        o.*,
        b.business_name,
        bs.settings->>'currency' as business_currency
      FROM storefront_orders o
      JOIN businesses b ON o.business_id = b.id
      LEFT JOIN business_settings bs ON b.id = bs.business_id
      WHERE o.id = $1 AND o.business_id = $2`,
      [orderIdNum, businessId]
    );

    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderResult.rows[0];

    if (order.payment_status !== 'paid') {
      await client.query('ROLLBACK');
      return {
        success: false,
        message: 'Order payment status is not paid',
        payment_status: order.payment_status,
      };
    }

    const description = storefrontOrderJournalDescription(order);

    const existingResult = await client.query(
      `SELECT id FROM journal_entries 
       WHERE business_id = $1 AND reference_type = 'storefront_order' AND description = $2`,
      [businessId, description]
    );

    if (existingResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        message: 'Order already reconciled',
        journal_entry_id: existingResult.rows[0].id,
      };
    }

    const subtotal = parseFloat(order.subtotal);
    const taxAmount = parseFloat(order.tax_amount || 0);
    const shippingAmount = parseFloat(order.shipping_amount || 0);
    const discountAmount = parseFloat(order.discount_amount || 0);
    const totalAmount = parseFloat(order.total_amount);

    const gl = await AccountingService.getGLAccountsByTypes(
      businessId,
      ['cash', 'revenue', 'tax_payable'],
      client
    );
    const shippingAccountId = await resolveAccountByCode(client, businessId, ACCOUNT_CODES.SERVICE_REVENUE);
    const discountAccountId = await resolveAccountByCode(client, businessId, ACCOUNT_CODES.SALES_DISCOUNTS);

    const entries = [
      { accountId: gl.cash.id, debit: totalAmount, credit: 0, description: 'Payment received' },
      { accountId: gl.revenue.id, debit: 0, credit: subtotal, description: 'Sales revenue' },
    ];
    if (taxAmount > 0) {
      entries.push({
        accountId: gl.tax_payable.id,
        debit: 0,
        credit: taxAmount,
        description: 'Sales tax payable',
      });
    }
    if (shippingAmount > 0) {
      entries.push({
        accountId: shippingAccountId,
        debit: 0,
        credit: shippingAmount,
        description: 'Shipping revenue',
      });
    }
    if (discountAmount > 0) {
      entries.push({
        accountId: discountAccountId,
        debit: discountAmount,
        credit: 0,
        description: 'Sales discount',
      });
    }

    const { journalId } = await AccountingService.createJournalEntry(
      {
        businessId,
        date: new Date(),
        description,
        referenceType: 'storefront_order',
        referenceId: null,
        userId: 'system',
        entries,
      },
      client
    );

    await client.query(
      `UPDATE storefront_orders 
       SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{reconciliation}',
          jsonb_build_object(
            'journal_entry_id', $1::text,
            'reconciled_at', NOW()::text,
            'total_amount', $2::float,
            'tax_amount', $3::float,
            'shipping_amount', $4::float,
            'discount_amount', $5::float
          ),
          true
        ),
        updated_at = NOW()
       WHERE id = $6`,
      [journalId, totalAmount, taxAmount, shippingAmount, discountAmount, orderIdNum]
    );

    await client.query('COMMIT');

    return {
      success: true,
      journal_entry_id: journalId,
      message: 'Order reconciled successfully',
      total_amount: totalAmount,
      lines: entries.length,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Payment reconciliation error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get reconciliation status for orders
 */
export async function getReconciliationStatus(businessId, options = {}) {
  const client = await pool.connect();

  try {
    const { startDate, endDate, status } = options;

    let query = `
      SELECT 
        o.id,
        o.order_number,
        o.total_amount,
        o.currency,
        o.payment_status,
        (o.metadata->'reconciliation'->>'reconciled_at')::timestamptz as reconciled_at,
        (o.metadata->'reconciliation'->>'journal_entry_id') as journal_entry_id,
        je.transaction_date as reconciled_date,
        CASE 
          WHEN (o.metadata->'reconciliation'->>'journal_entry_id') IS NOT NULL THEN 'reconciled'
          WHEN o.payment_status = 'paid' THEN 'pending'
          ELSE 'not_applicable'
        END as reconciliation_status
      FROM storefront_orders o
      LEFT JOIN journal_entries je ON je.id::text = (o.metadata->'reconciliation'->>'journal_entry_id')
      WHERE o.business_id = $1
    `;

    const params = [businessId];

    if (startDate) {
      params.push(startDate);
      query += ` AND o.created_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND o.created_at <= $${params.length}`;
    }

    if (status) {
      if (status === 'reconciled') {
        query += ` AND (o.metadata->'reconciliation'->>'journal_entry_id') IS NOT NULL`;
      } else if (status === 'pending') {
        query += ` AND (o.metadata->'reconciliation'->>'journal_entry_id') IS NULL AND o.payment_status = 'paid'`;
      }
    }

    query += ` ORDER BY o.created_at DESC LIMIT 100`;

    const result = await client.query(query, params);

    const statsResult = await client.query(
      `SELECT 
        COUNT(*)::int as total_orders,
        COUNT(*) FILTER (WHERE (metadata->'reconciliation'->>'journal_entry_id') IS NOT NULL)::int as reconciled_count,
        COUNT(*) FILTER (WHERE (metadata->'reconciliation'->>'journal_entry_id') IS NULL AND payment_status = 'paid')::int as pending_count,
        COALESCE(SUM(total_amount) FILTER (WHERE (metadata->'reconciliation'->>'journal_entry_id') IS NOT NULL), 0)::numeric as reconciled_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE (metadata->'reconciliation'->>'journal_entry_id') IS NULL AND payment_status = 'paid'), 0)::numeric as pending_amount
      FROM storefront_orders
      WHERE business_id = $1`,
      [businessId]
    );

    return {
      orders: result.rows,
      summary: statsResult.rows[0],
    };
  } finally {
    client.release();
  }
}

/**
 * Auto-reconcile all pending orders for a business
 */
export async function autoReconcilePendingOrders(businessId) {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT id FROM storefront_orders 
       WHERE business_id = $1 
       AND payment_status = 'paid' 
       AND (metadata->'reconciliation'->>'journal_entry_id') IS NULL`,
      [businessId]
    );

    const results = [];

    for (const row of result.rows) {
      try {
        const reconcileResult = await reconcileOrderPayment(row.id, businessId);
        results.push({
          order_id: row.id,
          success: reconcileResult.success,
          journal_entry_id: reconcileResult.journal_entry_id,
        });
      } catch (err) {
        results.push({
          order_id: row.id,
          success: false,
          error: err.message,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      total: results.length,
      successful,
      failed,
      results,
    };
  } finally {
    client.release();
  }
}
