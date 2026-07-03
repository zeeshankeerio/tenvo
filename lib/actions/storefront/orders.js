'use server';

import pool from '@/lib/db';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import { revalidatePath } from 'next/cache';
import { requireStorefrontHubAccess } from '@/lib/tenancy/storefrontHubAuth';
import { resolveStorefrontBusiness } from '@/lib/tenancy/resolveStorefrontBusiness';
import { onStorefrontOrderPaid, onStorefrontOrderCancelled, onStorefrontOrderRefunded } from '@/lib/memberships/membershipOrderHooks';
import { MEMBERSHIP_ITEMS_COUNT_SUBQUERY } from '@/lib/memberships/membershipOrderSql';
import { sendShipmentNotification, sendOrderStatusUpdateEmail } from '@/lib/email/resend';

const CUSTOMER_EMAIL_STATUSES = new Set(['processing', 'shipped', 'delivered', 'cancelled', 'refunded']);

/**
 * Best-effort customer email when an order status changes. Never throws.
 * @param {import('pg').PoolClient} client
 */
async function sendOrderStatusCustomerEmail(client, businessId, orderId, newStatus) {
  if (!CUSTOMER_EMAIL_STATUSES.has(newStatus)) return;
  try {
    const orderRes = await client.query(
      `SELECT o.order_number, o.customer_email, o.customer_name, o.total_amount, o.currency, o.metadata,
              b.business_name, b.email AS business_email
       FROM storefront_orders o
       JOIN businesses b ON b.id = o.business_id
       WHERE o.id = $1::integer AND o.business_id = $2::uuid`,
      [parseInt(orderId, 10), businessId]
    );
    const row = orderRes.rows[0];
    if (!row?.customer_email) return;

    let items = [];
    try {
      const itemsRes = await client.query(
        `SELECT product_name, quantity, variant_name
         FROM storefront_order_items WHERE order_id = $1::integer`,
        [parseInt(orderId, 10)]
      );
      items = itemsRes.rows;
    } catch (itemErr) {
      if (itemErr?.code === '42703') {
        const fallback = await client.query(
          `SELECT product_name, quantity FROM storefront_order_items WHERE order_id = $1::integer`,
          [parseInt(orderId, 10)]
        );
        items = fallback.rows;
      }
    }

    const order = {
      orderNumber: row.order_number,
      total: parseFloat(row.total_amount || 0),
      currency: row.currency || undefined,
      items: items.map((it) => ({
        name: it.product_name,
        quantity: parseFloat(it.quantity || 0),
        variantName: it.variant_name || undefined,
      })),
    };
    const business = { name: row.business_name, email: row.business_email };

    if (newStatus === 'shipped') {
      const tracking = row.metadata?.tracking || null;
      await sendShipmentNotification({ to: row.customer_email, order, tracking, business });
    } else {
      await sendOrderStatusUpdateEmail({ to: row.customer_email, order, business, status: newStatus });
    }
  } catch (emailErr) {
    console.warn('[updateOrderStatus] customer status email skipped:', emailErr?.message || emailErr);
  }
}

/**
 * @deprecated Public checkout must use POST /api/storefront/[businessDomain]/orders.
 */
export async function createStorefrontOrder(businessId, orderData) {
  void businessId;
  void orderData;
  return actionFailure(
    'DEPRECATED',
    'Use POST /api/storefront/[businessDomain]/orders for checkout, server-side pricing and tenant-scoped inventory.'
  );
}

/**
 * Get orders for business dashboard
 */
export async function getBusinessOrders(businessId, filters = {}) {
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  if (!businessId) {
    console.log('[getBusinessOrders] No businessId provided, returning empty');
    return actionSuccess({
      orders: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });
  }

  const client = await pool.connect();

  try {
    const { status, startDate, endDate, limit = 50, offset = 0 } = filters;

    let whereClause = 'WHERE o.business_id = $1::uuid';
    const params = [businessId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND o.status = $${paramIndex++}`;
      params.push(status);
    }

    if (startDate) {
      whereClause += ` AND o.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND o.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    let ordersResult;
    let countResult;

    try {
      ordersResult = await client.query(
        `SELECT 
          o.id, o.business_id, o.order_number, o.customer_email, o.customer_phone, o.customer_name,
          o.shipping_address, o.billing_address, o.subtotal, 
          o.tax_amount as tax, 
          o.shipping_amount as shipping_cost, 
          o.discount_amount as discount, 
          o.total_amount as total,
          o.currency, o.status, o.payment_status, o.fulfillment_status, o.notes, o.metadata, o.created_at, o.updated_at,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone,
          (SELECT COUNT(*) FROM storefront_order_items oi WHERE oi.order_id = o.id) as items_count,
          ${MEMBERSHIP_ITEMS_COUNT_SUBQUERY} as membership_items_count
         FROM storefront_orders o
         LEFT JOIN customers c ON o.customer_email = c.email AND o.business_id = c.business_id
         ${whereClause}
         ORDER BY o.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
      );

      const countParams = params.slice();
      countResult = await client.query(
        `SELECT COUNT(*) as total FROM storefront_orders o ${whereClause}`,
        countParams
      );
    } catch (tableError) {
      if (tableError.message?.includes('storefront_orders') || tableError.code === '42P01') {
        console.log('[getBusinessOrders] storefront_orders table missing, returning empty');
        return actionSuccess({
          orders: [],
          total: 0,
          page: 1,
          totalPages: 0,
        });
      }
      throw tableError;
    }

    const formattedOrders = ordersResult.rows.map((row) => ({
      ...row,
      subtotal: parseFloat(row.subtotal || 0),
      tax: parseFloat(row.tax || 0),
      shipping_cost: parseFloat(row.shipping_cost || 0),
      discount: parseFloat(row.discount || 0),
      total: parseFloat(row.total || 0),
      items_count: parseInt(row.items_count || 0, 10),
      membership_items_count: parseInt(row.membership_items_count || 0, 10),
      has_membership_items: parseInt(row.membership_items_count || 0, 10) > 0,
    }));

    return actionSuccess({
      orders: formattedOrders,
      total: parseInt(countResult.rows[0].total, 10),
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(parseInt(countResult.rows[0].total, 10) / limit),
    });
  } catch (error) {
    console.error('[getBusinessOrders] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get single order details with items
 */
export async function getOrderDetails(orderId, businessId) {
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  const client = await pool.connect();

  try {
    let orderResult;
    try {
      orderResult = await client.query(
        `SELECT 
          o.id, o.business_id, o.order_number, o.customer_email, o.customer_phone, o.customer_name,
          o.shipping_address, o.billing_address, o.subtotal, 
          o.tax_amount as tax, 
          o.shipping_amount as shipping_cost, 
          o.discount_amount as discount, 
          o.total_amount as total,
          o.currency, o.status, o.payment_status, o.fulfillment_status, o.notes, o.metadata, o.created_at, o.updated_at,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone,
          c.address as customer_address
         FROM storefront_orders o
         LEFT JOIN customers c ON o.customer_email = c.email AND o.business_id = c.business_id
         WHERE o.id = $1::integer AND o.business_id = $2::uuid`,
        [parseInt(orderId, 10), businessId]
      );
    } catch (tableError) {
      if (tableError.message?.includes('storefront_orders') || tableError.code === '42P01') {
        return actionFailure('ORDER_NOT_FOUND', 'Order not found');
      }
      throw tableError;
    }

    if (orderResult.rows.length === 0) {
      return actionFailure('ORDER_NOT_FOUND', 'Order not found');
    }

    const order = orderResult.rows[0];
    const formattedOrder = {
      ...order,
      subtotal: parseFloat(order.subtotal || 0),
      tax: parseFloat(order.tax || 0),
      shipping_cost: parseFloat(order.shipping_cost || 0),
      discount: parseFloat(order.discount || 0),
      total: parseFloat(order.total || 0),
    };

    let itemsResult = { rows: [] };
    try {
      itemsResult = await client.query(
        `SELECT 
          oi.*,
          p.image_url as product_image,
          p.category as product_category,
          p.domain_data as product_domain_data
         FROM storefront_order_items oi
         LEFT JOIN products p ON oi.product_id = p.id::uuid AND p.business_id = $2::uuid
         WHERE oi.order_id = $1::integer`,
        [parseInt(orderId, 10), businessId]
      );
    } catch (e) {
      console.error('[getOrderDetails] Error fetching order items:', e);
    }

    const formattedItems = itemsResult.rows.map((item) => {
      const cat = String(item.product_category || '').toLowerCase();
      const name = String(item.product_name || '').toLowerCase();
      const dd = item.product_domain_data || {};
      const isMembershipItem =
        cat.includes('membership') ||
        dd.membershiptype ||
        dd.membership_type ||
        /\b(membership|gym pass|gents gym|ladies section)\b/.test(name);

      return {
        ...item,
        unit_price: parseFloat(item.unit_price || 0),
        total_price: parseFloat(item.total_price || 0),
        tax_amount: parseFloat(item.tax_amount || 0),
        is_membership_item: Boolean(isMembershipItem),
      };
    });

    let membershipEnrollments = [];
    try {
      const enrollRes = await client.query(
        `SELECT cm.id, cm.status, cm.started_at, cm.ends_at, cm.source,
                mp.name AS plan_name
         FROM customer_memberships cm
         JOIN membership_plans mp ON mp.id = cm.plan_id AND mp.business_id = cm.business_id
         WHERE cm.business_id = $2::uuid AND cm.initial_storefront_order_id = $1::integer
         ORDER BY cm.created_at DESC`,
        [parseInt(orderId, 10), businessId]
      );
      membershipEnrollments = enrollRes.rows;
    } catch (enrollErr) {
      if (enrollErr?.code !== '42P01') {
        console.warn('[getOrderDetails] membership enrollments skipped:', enrollErr?.message);
      }
    }

    const history = formattedOrder.metadata?.status_history || [];

    return actionSuccess({
      order: {
        ...formattedOrder,
        has_membership_items: formattedItems.some((i) => i.is_membership_item),
      },
      items: formattedItems,
      membershipEnrollments,
      history,
    });
  } catch (error) {
    console.error('[getOrderDetails] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderId, businessId, newStatus, notes = '') {
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE storefront_orders 
       SET status = $1, updated_at = NOW()
       WHERE id = $2::integer AND business_id = $3::uuid`,
      [newStatus, parseInt(orderId, 10), businessId]
    );

    const orderSelect = await client.query(
      `SELECT metadata FROM storefront_orders WHERE id = $1::integer AND business_id = $2::uuid`,
      [parseInt(orderId, 10), businessId]
    );

    if (orderSelect.rows.length > 0) {
      const metadata = orderSelect.rows[0].metadata || {};
      const statusHistory = metadata.status_history || [];
      statusHistory.push({
        status: newStatus,
        notes: notes || `Order status updated to ${newStatus}`,
        created_by: 'user',
        created_at: new Date().toISOString(),
      });
      metadata.status_history = statusHistory;

      await client.query(
        `UPDATE storefront_orders 
         SET metadata = $1 
         WHERE id = $2::integer AND business_id = $3::uuid`,
        [JSON.stringify(metadata), parseInt(orderId, 10), businessId]
      );
    }

    if (newStatus === 'delivered') {
      try {
        const payCheck = await client.query(
          `SELECT payment_status, metadata FROM storefront_orders WHERE id = $1 AND business_id = $2::uuid`,
          [parseInt(orderId, 10), businessId]
        );
        if (payCheck.rows.length > 0) {
          const pmeta = payCheck.rows[0].metadata || {};
          if (
            payCheck.rows[0].payment_status === 'pending' &&
            (pmeta.payment_method === 'cod' || pmeta.payment_method === 'cash_on_delivery')
          ) {
            await client.query(
              `UPDATE storefront_orders SET payment_status = 'paid', updated_at = NOW() WHERE id = $1 AND business_id = $2::uuid`,
              [parseInt(orderId, 10), businessId]
            );
            const orderData = await client.query(
              `SELECT total_amount, order_number FROM storefront_orders WHERE id = $1 AND business_id = $2::uuid`,
              [parseInt(orderId, 10), businessId]
            );
            const oRow = orderData.rows[0];
            try {
              await client.query(
                `INSERT INTO payments (
                   business_id, payment_type, reference_type, amount,
                   payment_mode, payment_date, notes, status, domain_data, created_at, updated_at
                 ) VALUES ($1,'in','storefront_order',$2,'cod',CURRENT_DATE,$3,'active',$4,NOW(),NOW())`,
                [
                  businessId,
                  parseFloat(oRow.total_amount),
                  `COD collected - Order ${oRow.order_number}`,
                  JSON.stringify({
                    storefront_order_id: orderId,
                    storefront_order_number: oRow.order_number,
                  }),
                ]
              );
            } catch (pe) {
              console.warn('[updateOrderStatus] payment ledger insert failed:', pe.message);
            }
            await onStorefrontOrderPaid(client, businessId, parseInt(orderId, 10));
          }
        }
      } catch (payErr) {
        console.warn('[updateOrderStatus] COD auto-pay update failed (non-fatal):', payErr.message);
      }
    }

    if (newStatus === 'cancelled') {
      let revokeActive = false;
      try {
        const payCheck = await client.query(
          `SELECT payment_status FROM storefront_orders WHERE id = $1::integer AND business_id = $2::uuid`,
          [parseInt(orderId, 10), businessId]
        );
        revokeActive = payCheck.rows[0]?.payment_status === 'paid';
      } catch {
        revokeActive = false;
      }
      await onStorefrontOrderCancelled(client, businessId, parseInt(orderId, 10), { revokeActive });

      const itemsResult = await client.query(
        `SELECT soi.product_id, soi.variant_id, soi.quantity
         FROM storefront_order_items soi
         JOIN storefront_orders so ON so.id = soi.order_id
         WHERE soi.order_id = $1::integer AND so.business_id = $2::uuid`,
        [parseInt(orderId, 10), businessId]
      );

      for (const item of itemsResult.rows) {
        const qty = parseFloat(item.quantity);

        // Variant sales only decrement product_variants.stock at checkout (variants are
        // not tracked in product_stock_locations or the inventory ledger). Restore the
        // variant the same way and skip the location/ledger restock to avoid inflating
        // headline/location stock that was never decremented.
        if (item.variant_id) {
          await client.query(
            `UPDATE product_variants
             SET stock = stock + $1,
                 updated_at = NOW()
             WHERE id = $2::uuid AND business_id = $3::uuid`,
            [qty, item.variant_id, businessId]
          );
          continue;
        }

        await client.query(
          `UPDATE products 
           SET stock = stock + $1,
               updated_at = NOW()
           WHERE id = $2::uuid AND business_id = $3::uuid`,
          [qty, item.product_id, businessId]
        );

        const primaryRes = await client.query(
          `SELECT id FROM warehouse_locations 
           WHERE business_id = $1::uuid AND is_primary = TRUE 
           LIMIT 1`,
          [businessId]
        );
        let warehouseId = primaryRes.rows[0]?.id || null;
        if (!warehouseId) {
          const whRes = await client.query(
            `SELECT id FROM warehouse_locations 
             WHERE business_id = $1::uuid 
             LIMIT 1`,
            [businessId]
          );
          warehouseId = whRes.rows[0]?.id || null;
        }

        if (warehouseId) {
          await client.query(
            `UPDATE product_stock_locations psl
             SET quantity = quantity + $1,
                 updated_at = NOW()
             FROM warehouse_locations wl
             WHERE psl.warehouse_id = wl.id
               AND wl.business_id = $4::uuid
               AND psl.warehouse_id = $2::uuid
               AND psl.product_id = $3::uuid`,
            [qty, warehouseId, item.product_id, businessId]
          );
        }

        const prodRes = await client.query(
          `SELECT stock, cost_price FROM products WHERE id = $1::uuid AND business_id = $2::uuid`,
          [item.product_id, businessId]
        );
        const newStock = parseFloat(prodRes.rows[0]?.stock || 0);
        const costPrice = parseFloat(prodRes.rows[0]?.cost_price || 0);

        const domainData = {
          storefront_order_id: parseInt(orderId, 10),
          notes: `Order ${orderId} cancelled - inventory restored`,
        };

        const moveRes = await client.query(
          `INSERT INTO stock_movements (
            business_id, product_id, warehouse_id, movement_type, transaction_type,
            quantity_change, unit_cost, reference_type, reference_id, notes, domain_data, created_at
          ) VALUES ($1, $2, $3, 'in', 'return', $4, $5, 'storefront_order', null, $6, $7, NOW())
          RETURNING id`,
          [
            businessId,
            item.product_id,
            warehouseId,
            qty,
            costPrice,
            `Order ${orderId} cancelled - inventory restored`,
            JSON.stringify(domainData),
          ]
        );

        await client.query(
          `INSERT INTO inventory_ledger (
            business_id, warehouse_id, product_id, transaction_type,
            reference_id, reference_type, quantity_change, running_balance,
            unit_cost, total_value, notes, created_at
          ) VALUES ($1, $2, $3, 'return', $4, 'storefront_order_cancel', $5, $6, $7, $8, $9, NOW())`,
          [
            businessId,
            warehouseId,
            item.product_id,
            'return',
            moveRes.rows[0].id,
            qty,
            newStock,
            costPrice,
            qty * costPrice,
            `Order ${orderId} cancelled - inventory restored`,
          ]
        );
      }
    }

    if (newStatus === 'refunded') {
      await onStorefrontOrderRefunded(client, businessId, parseInt(orderId, 10));
    }

    await client.query('COMMIT');

    await sendOrderStatusCustomerEmail(client, businessId, orderId, newStatus);

    revalidatePath(`/business/[category]`);

    return actionSuccess({ orderId: parseInt(orderId, 10), status: newStatus });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[updateOrderStatus] Error:', error);
    return actionFailure('UPDATE_FAILED', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get customer orders (for customer portal)
 */
export async function getCustomerOrders(customerEmail, businessDomain) {
  const business = await resolveStorefrontBusiness(businessDomain);
  if (!business) {
    return actionFailure('BUSINESS_NOT_FOUND', 'Business not found');
  }

  const businessId = business.id;
  const client = await pool.connect();

  try {
    const ordersResult = await client.query(
      `SELECT 
        o.id, o.business_id, o.order_number, o.customer_email, o.customer_phone, o.customer_name,
        o.shipping_address, o.billing_address, o.subtotal, 
        o.tax_amount as tax, 
        o.shipping_amount as shipping_cost, 
        o.discount_amount as discount, 
        o.total_amount as total,
        o.currency, o.status, o.payment_status, o.fulfillment_status, o.notes, o.metadata, o.created_at, o.updated_at,
        COUNT(oi.id) as items_count
       FROM storefront_orders o
       LEFT JOIN storefront_order_items oi ON o.id = oi.order_id
       WHERE o.customer_email = $1 AND o.business_id = $2::uuid
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [customerEmail, businessId]
    );

    const formattedOrders = ordersResult.rows.map((row) => ({
      ...row,
      subtotal: parseFloat(row.subtotal || 0),
      tax: parseFloat(row.tax || 0),
      shipping_cost: parseFloat(row.shipping_cost || 0),
      discount: parseFloat(row.discount || 0),
      total: parseFloat(row.total || 0),
      items_count: parseInt(row.items_count || 0, 10),
    }));

    return actionSuccess({ orders: formattedOrders });
  } catch (error) {
    console.error('[getCustomerOrders] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}
