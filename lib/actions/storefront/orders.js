'use server';

import pool from '@/lib/db';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import { revalidatePath } from 'next/cache';
import { requireStorefrontHubAccess } from '@/lib/tenancy/storefrontHubAuth';
import { resolveStorefrontBusiness } from '@/lib/tenancy/resolveStorefrontBusiness';
import { onStorefrontOrderPaid, onStorefrontOrderCancelled, onStorefrontOrderRefunded } from '@/lib/memberships/membershipOrderHooks';
import { MEMBERSHIP_ITEMS_COUNT_SUBQUERY } from '@/lib/memberships/membershipOrderSql';
import { sendShipmentNotification, sendOrderStatusUpdateEmail } from '@/lib/email/resend';
import { InventoryService } from '@/lib/services/InventoryService';
import { VariantService } from '@/lib/services/VariantService';
import { invalidateStorefrontCatalog } from '@/lib/storefront/invalidateStorefrontCatalog';

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

    if (newStatus === 'cancelled' || newStatus === 'refunded') {
      // GAP-11: Refund now restocks inventory (same as cancel)
      const shouldRestock = true;

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
      }

      if (newStatus === 'refunded') {
        await onStorefrontOrderRefunded(client, businessId, parseInt(orderId, 10));
      }

      if (shouldRestock) {
        const itemsResult = await client.query(
          `SELECT soi.product_id, soi.variant_id, soi.quantity
           FROM storefront_order_items soi
           JOIN storefront_orders so ON so.id = soi.order_id
           WHERE soi.order_id = $1::integer AND so.business_id = $2::uuid`,
          [parseInt(orderId, 10), businessId]
        );

        const restockLabel = newStatus === 'cancelled' ? 'cancelled' : 'refunded';

        for (const item of itemsResult.rows) {
          const qty = parseFloat(item.quantity);
          if (!Number.isFinite(qty) || qty <= 0) continue;

          // GAP-1 & GAP-2: Route restock through InventoryService for proper batch
          // restoration, COGS reversal, ledger consistency, and parent stock sync.
          if (item.variant_id) {
            // Variant sales only decrement product_variants.stock at checkout.
            // Restore the variant stock and sync parent headline.
            await client.query(
              `UPDATE product_variants
               SET stock = stock + $1,
                   updated_at = NOW()
               WHERE id = $2::uuid AND business_id = $3::uuid`,
              [qty, item.variant_id, businessId]
            );
            // GAP-2: Sync parent products.stock from variant sum
            await VariantService.syncParentStockFromVariants(item.product_id, businessId, client);

            // Record variant restock movement for audit trail
            await client.query('SAVEPOINT variant_restock_move');
            try {
              const whRes = await client.query(
                `SELECT id FROM warehouse_locations
                 WHERE business_id = $1::uuid
                 ORDER BY is_primary DESC NULLS LAST, created_at ASC NULLS LAST
                 LIMIT 1`,
                [businessId]
              );
              const warehouseId = whRes.rows[0]?.id || null;
              await client.query(
                `INSERT INTO stock_movements (
                  business_id, product_id, variant_id, warehouse_id,
                  movement_type, transaction_type, quantity_change,
                  reference_type, notes, domain_data, created_at
                ) VALUES ($1, $2, $3, $4, 'in', 'return', $5,
                  'storefront_order', $6, $7, NOW())`,
                [
                  businessId,
                  item.product_id,
                  item.variant_id,
                  warehouseId,
                  qty,
                  `Order ${orderId} ${restockLabel} - variant stock restored`,
                  JSON.stringify({ storefront_order_id: parseInt(orderId, 10) }),
                ]
              );
              await client.query('RELEASE SAVEPOINT variant_restock_move');
            } catch (varMoveErr) {
              await client.query('ROLLBACK TO SAVEPOINT variant_restock_move');
              console.warn('[updateOrderStatus] variant restock movement skipped:', varMoveErr?.message);
            }
            continue;
          }

          // GAP-1: Headline products route through InventoryService.addStock()
          // for proper warehouse location restoration, batch handling, COGS
          // reversal via accounting, and ledger entry with correct reference_id.
          try {
            await InventoryService.addStock(
              {
                business_id: businessId,
                product_id: item.product_id,
                quantity: qty,
                reference_type: 'return',
                notes: `Order ${orderId} ${restockLabel} - inventory restored`,
                domain_data: {
                  storefront_order_id: parseInt(orderId, 10),
                  restock_reason: restockLabel,
                },
              },
              null, // userId — system action
              client
            );
          } catch (restockErr) {
            // Fallback: direct SQL restock if InventoryService fails (e.g. missing tables)
            console.warn(`[updateOrderStatus] InventoryService restock failed, using direct SQL:`, restockErr?.message);
            await client.query(
              `UPDATE products
               SET stock = COALESCE(stock, 0) + $1, updated_at = NOW()
               WHERE id = $2::uuid AND business_id = $3::uuid`,
              [qty, item.product_id, businessId]
            );
          }
        }

      }
    }

    await client.query('COMMIT');

    // Invalidate storefront cache after stock is committed
    invalidateStorefrontCatalog(businessId);

    // GAP-3: Send email using a separate pool connection (current client is
    // still valid here but will be released in `finally`; use fire-and-forget
    // with its own connection to avoid timing issues).
    void (async () => {
      try {
        const emailClient = await pool.connect();
        try {
          await sendOrderStatusCustomerEmail(emailClient, businessId, orderId, newStatus);
        } finally {
          emailClient.release();
        }
      } catch (emailErr) {
        console.warn('[updateOrderStatus] email send failed:', emailErr?.message || emailErr);
      }
    })();

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
