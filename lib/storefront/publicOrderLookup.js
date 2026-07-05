import pool from '@/lib/db';

const PUBLIC_ORDER_LIMIT = 50;

async function fetchOrderItems(client, orderId, businessId) {
  const itemsSqlFull = `
    SELECT 
      oi.id, oi.product_id, oi.product_name,
      COALESCE(NULLIF(TRIM(oi.product_sku), ''), oi.metadata->>'product_sku', oi.metadata->>'sku') AS product_sku,
      oi.quantity, oi.unit_price, oi.total_price, oi.tax_amount, oi.metadata,
      p.image_url
    FROM storefront_order_items oi
    LEFT JOIN products p ON p.id = oi.product_id AND p.business_id = $2::uuid
    WHERE oi.order_id = $1::integer`;

  const itemsSqlMetadataSku = `
    SELECT 
      oi.id, oi.product_id, oi.product_name,
      COALESCE(oi.metadata->>'product_sku', oi.metadata->>'sku') AS product_sku,
      oi.quantity, oi.unit_price, oi.total_price, oi.tax_amount, oi.metadata,
      p.image_url
    FROM storefront_order_items oi
    LEFT JOIN products p ON p.id = oi.product_id AND p.business_id = $2::uuid
    WHERE oi.order_id = $1::integer`;

  try {
    return (await client.query(itemsSqlFull, [orderId, businessId])).rows;
  } catch (itemErr) {
    if (itemErr.code === '42703' && String(itemErr.message).includes('product_sku')) {
      return (await client.query(itemsSqlMetadataSku, [orderId, businessId])).rows;
    }
    throw itemErr;
  }
}

/**
 * Public buyer order lookup, requires customer email; optional order number filter.
 *
 * @param {string} businessId
 * @param {{ customerEmail: string, orderNumber?: string, limit?: number }} options
 */
export async function lookupPublicStorefrontOrders(businessId, options = {}) {
  const customerEmail = String(options.customerEmail || '').trim().toLowerCase();
  const orderNumber = String(options.orderNumber || '').trim();
  const limit = Math.min(Number(options.limit) || PUBLIC_ORDER_LIMIT, PUBLIC_ORDER_LIMIT);

  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { success: false, error: 'Valid email is required', status: 400 };
  }

  const client = await pool.connect();

  try {
    let query = `
      SELECT 
        o.id, o.order_number, o.customer_email, o.customer_phone, o.customer_name,
        o.shipping_address, o.billing_address, o.subtotal, o.tax_amount,
        o.shipping_amount, o.discount_amount, o.total_amount, o.currency,
        o.status, o.payment_status, o.fulfillment_status, o.notes, o.metadata,
        o.created_at, o.updated_at
      FROM storefront_orders o
      WHERE o.business_id = $1::uuid
        AND lower(o.customer_email) = $2
    `;

    const params = [businessId, customerEmail];

    if (orderNumber) {
      params.push(`%${orderNumber}%`);
      query += ` AND o.order_number ILIKE $3`;
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await client.query(query, params);

    const orders = await Promise.all(
      result.rows.map(async (order) => {
        const orderId = parseInt(order.id, 10);
        const items = await fetchOrderItems(client, orderId, businessId);
        return { ...order, items };
      })
    );

    return { success: true, orders };
  } catch (error) {
    console.error('[lookupPublicStorefrontOrders] Error:', error);
    return { success: false, error: 'Unable to load orders', status: 500 };
  } finally {
    client.release();
  }
}
