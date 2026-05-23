'use server';

import pool from '@/lib/db';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import { revalidatePath } from 'next/cache';

/**
 * Generate unique order number
 */
function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

/**
 * Create order from storefront checkout
 * This is the critical function connecting public store to business dashboard
 */
export async function createStorefrontOrder(businessId, orderData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Validate business exists and is active
    const businessResult = await client.query(
      `SELECT id, business_name, email, domain FROM businesses WHERE id = $1 AND is_active = true`,
      [businessId]
    );
    
    if (businessResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return actionFailure('BUSINESS_NOT_FOUND', 'Business not found or inactive');
    }
    
    const business = businessResult.rows[0];
    
    // Generate order number
    const orderNumber = generateOrderNumber();
    
    // Calculate totals
    const subtotal = orderData.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    const shippingCost = orderData.shipping?.cost || 0;
    const tax = orderData.tax || 0;
    const discount = orderData.discount || 0;
    const total = subtotal + shippingCost + tax - discount;
    
    // Create customer or get existing
    let customerId = null;
    if (orderData.customer?.email) {
      const customerResult = await client.query(
        `SELECT id FROM customers WHERE email = $1 AND business_id = $2`,
        [orderData.customer.email, businessId]
      );
      
      if (customerResult.rows.length > 0) {
        customerId = customerResult.rows[0].id;
        
        // Update customer info if needed
        await client.query(
          `UPDATE customers 
           SET phone = COALESCE($1, phone),
               address = COALESCE($2, address),
               city = COALESCE($3, city),
               updated_at = NOW()
           WHERE id = $4`,
          [
            orderData.customer.phone,
            orderData.customer.address,
            orderData.customer.city,
            customerId
          ]
        );
      } else {
        // Create new customer - using pincode matching the schema
        const newCustomer = await client.query(
          `INSERT INTO customers (business_id, name, email, phone, address, city, pincode, country, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           RETURNING id`,
          [
            businessId,
            `${orderData.customer.firstName || ''} ${orderData.customer.lastName || ''}`.trim(),
            orderData.customer.email,
            orderData.customer.phone,
            orderData.customer.address,
            orderData.customer.city,
            orderData.customer.postalCode || orderData.customer.pincode || null,
            orderData.customer.country || 'Pakistan'
          ]
        );
        customerId = newCustomer.rows[0].id;
      }
    }
    
    // Create the order metadata with initial status history
    const initialStatusHistory = [
      {
        status: 'pending',
        notes: 'Order created from storefront',
        created_by: 'system',
        created_at: new Date().toISOString()
      }
    ];

    const metadata = {
      customer_id: customerId,
      payment_method: orderData.payment?.method || 'cash_on_delivery',
      shipping_method: orderData.shipping?.method || 'standard',
      source: 'storefront',
      status_history: initialStatusHistory
    };
    
    // Create the order
    const orderResult = await client.query(
      `INSERT INTO storefront_orders (
        business_id, order_number, customer_email, customer_phone, customer_name,
        shipping_address, billing_address, subtotal, tax_amount, shipping_amount,
        discount_amount, total_amount, currency, status, payment_status,
        fulfillment_status, notes, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
      RETURNING *`,
      [
        businessId,
        orderNumber,
        orderData.customer?.email || null,
        orderData.customer?.phone || null,
        `${orderData.customer?.firstName || ''} ${orderData.customer?.lastName || ''}`.trim() || null,
        JSON.stringify(orderData.customer), // shipping_address
        JSON.stringify(orderData.customer), // billing_address (same for now)
        subtotal,
        tax,
        shippingCost,
        discount,
        total,
        orderData.currency || 'PKR',
        'pending', // Initial status
        orderData.payment?.status || 'pending',
        'unfulfilled',
        orderData.notes || null,
        JSON.stringify(metadata)
      ]
    );
    
    const order = orderResult.rows[0];
    
    // Auto-resolve Primary Warehouse if none provided
    const primaryRes = await client.query(`
        SELECT id FROM warehouse_locations 
        WHERE business_id = $1 AND is_primary = TRUE 
        LIMIT 1
    `, [businessId]);
    let warehouseId = primaryRes.rows[0]?.id || null;
    if (!warehouseId) {
        // Fallback to any warehouse
        const whRes = await client.query(`
            SELECT id FROM warehouse_locations 
            WHERE business_id = $1 
            LIMIT 1
        `, [businessId]);
        warehouseId = whRes.rows[0]?.id || null;
    }

    // Create order items and deduct inventory
    for (const item of orderData.items) {
      // Add order item
      await client.query(
        `INSERT INTO storefront_order_items (
          order_id, product_id, product_name, product_sku, quantity,
          unit_price, total_price, tax_amount, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          order.id,
          item.id,
          item.name,
          item.sku || null,
          item.quantity,
          item.price,
          item.price * item.quantity,
          item.tax || 0,
          JSON.stringify(item.metadata || {})
        ]
      );
      
      // Deduct inventory
      const inventoryResult = await client.query(
        `UPDATE products 
         SET stock = stock - $1,
             updated_at = NOW()
         WHERE id = $2 AND stock >= $1
         RETURNING stock, cost_price`,
        [item.quantity, item.id]
      );
      
      if (inventoryResult.rows.length === 0) {
        console.warn(`[createStorefrontOrder] Insufficient stock for product ${item.id}`);
      } else {
        const currentStock = parseFloat(inventoryResult.rows[0].stock);
        const costPrice = parseFloat(inventoryResult.rows[0].cost_price || 0);

        // Update product stock locations
        if (warehouseId) {
          await client.query(
            `UPDATE product_stock_locations 
             SET quantity = quantity - $1,
                 updated_at = NOW()
             WHERE warehouse_id = $2 AND product_id = $3`,
            [item.quantity, warehouseId, item.id]
          );
        }

        // Create stock movement record
        const movementDomainData = {
          storefront_order_id: order.id,
          storefront_order_number: orderNumber
        };

        const moveRes = await client.query(
          `INSERT INTO stock_movements (
            business_id, product_id, warehouse_id, movement_type, transaction_type,
            quantity_change, unit_cost, reference_type, reference_id, notes, domain_data, created_at
          ) VALUES ($1, $2, $3, 'out', 'sale', $4, $5, 'storefront_order', null, $6, $7, NOW())
          RETURNING id`,
          [
            businessId,
            item.id,
            warehouseId,
            -item.quantity,
            costPrice,
            `Order ${orderNumber} - Storefront`,
            JSON.stringify(movementDomainData)
          ]
        );

        const movementId = moveRes.rows[0].id;

        // Create inventory ledger record
        await client.query(
          `INSERT INTO inventory_ledger (
            business_id, warehouse_id, product_id, transaction_type, 
            reference_id, reference_type, quantity_change, running_balance,
            unit_cost, total_value, notes, created_at
          ) VALUES ($1, $2, $3, 'sale', $4, 'storefront_order', $5, $6, $7, $8, $9, NOW())`,
          [
            businessId,
            warehouseId,
            item.id,
            'sale',
            movementId,
            'storefront_order',
            -item.quantity,
            currentStock,
            item.price,
            item.price * item.quantity,
            `Storefront order ${orderNumber}`
          ]
        );
      }
    }
    
    // Create payment record if paid
    if (orderData.payment?.status === 'paid' && orderData.payment?.transactionId) {
      await client.query(
        `INSERT INTO payments (
          business_id, payment_type, reference_type, reference_id, customer_id,
          amount, payment_mode, payment_date, transaction_id, notes, status,
          domain_data, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, $9, $10, $11, NOW(), NOW())`,
        [
          businessId,
          'in',
          'storefront_order',
          null,
          customerId,
          total,
          orderData.payment.method || 'cash_on_delivery',
          orderData.payment.transactionId,
          `Storefront order ${orderNumber}`,
          'active',
          JSON.stringify({ storefront_order_id: order.id, storefront_order_number: orderNumber })
        ]
      );
    }
    
    // Update analytics
    await client.query(
      `INSERT INTO storefront_analytics (business_id, date, orders_count, revenue, created_at, updated_at)
       VALUES ($1, CURRENT_DATE, 1, $2, NOW(), NOW())
       ON CONFLICT (business_id, date) 
       DO UPDATE SET 
         orders_count = storefront_analytics.orders_count + 1,
         revenue = storefront_analytics.revenue + $2,
         updated_at = NOW()`,
      [businessId, total]
    );
    
    await client.query('COMMIT');
    
    // Revalidate storefront and business dashboard
    revalidatePath(`/store/${business.domain}`);
    revalidatePath(`/business/${business.category}`);
    
    console.log(`[createStorefrontOrder] Order ${orderNumber} created for business ${businessId}`);
    
    return actionSuccess({
      orderId: order.id,
      orderNumber: orderNumber,
      total: total,
      status: 'pending'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[createStorefrontOrder] Error:', error);
    return actionFailure('ORDER_CREATION_FAILED', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get orders for business dashboard
 */
export async function getBusinessOrders(businessId, filters = {}) {
  // Validate businessId
  if (!businessId) {
    console.log('[getBusinessOrders] No businessId provided, returning empty');
    return actionSuccess({
      orders: [],
      total: 0,
      page: 1,
      totalPages: 0
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
    
    // Get orders with customer info - use storefront_orders table
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
          (SELECT COUNT(*) FROM storefront_order_items oi WHERE oi.order_id = o.id) as items_count
         FROM storefront_orders o
         LEFT JOIN customers c ON o.customer_email = c.email AND o.business_id = c.business_id
         ${whereClause}
         ORDER BY o.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
      );
      
      // For count query, we only need the filter params (not limit/offset)
      const countParams = params.slice();
      countResult = await client.query(
        `SELECT COUNT(*) as total FROM storefront_orders o ${whereClause}`,
        countParams
      );
    } catch (tableError) {
      // If storefront_orders table doesn't exist, return empty result
      if (tableError.message?.includes('storefront_orders') || tableError.code === '42P01') {
        console.log('[getBusinessOrders] storefront_orders table missing, returning empty');
        return actionSuccess({
          orders: [],
          total: 0,
          page: 1,
          totalPages: 0
        });
      }
      throw tableError;
    }
    
    const formattedOrders = ordersResult.rows.map(row => ({
      ...row,
      subtotal: parseFloat(row.subtotal || 0),
      tax: parseFloat(row.tax || 0),
      shipping_cost: parseFloat(row.shipping_cost || 0),
      discount: parseFloat(row.discount || 0),
      total: parseFloat(row.total || 0),
      items_count: parseInt(row.items_count || 0)
    }));

    return actionSuccess({
      orders: formattedOrders,
      total: parseInt(countResult.rows[0].total),
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
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
  const client = await pool.connect();
  
  try {
    // Get order with customer info
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
        [parseInt(orderId), businessId]
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
      total: parseFloat(order.total || 0)
    };
    
    // Get order items
    let itemsResult = { rows: [] };
    try {
      itemsResult = await client.query(
        `SELECT 
          oi.*,
          p.image_url as product_image
         FROM storefront_order_items oi
         LEFT JOIN products p ON oi.product_id = p.id::uuid
         WHERE oi.order_id = $1::integer`,
        [parseInt(orderId)]
      );
    } catch (e) {
      console.error('[getOrderDetails] Error fetching order items:', e);
    }
    
    const formattedItems = itemsResult.rows.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price || 0),
      total_price: parseFloat(item.total_price || 0),
      tax_amount: parseFloat(item.tax_amount || 0)
    }));

    const history = formattedOrder.metadata?.status_history || [];

    return actionSuccess({
      order: formattedOrder,
      items: formattedItems,
      history: history
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
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update order status
    await client.query(
      `UPDATE storefront_orders 
       SET status = $1, updated_at = NOW()
       WHERE id = $2::integer AND business_id = $3::uuid`,
      [newStatus, parseInt(orderId), businessId]
    );
    
    // Update status history in metadata
    const orderSelect = await client.query(
      `SELECT metadata FROM storefront_orders WHERE id = $1::integer AND business_id = $2::uuid`,
      [parseInt(orderId), businessId]
    );

    if (orderSelect.rows.length > 0) {
      const metadata = orderSelect.rows[0].metadata || {};
      const statusHistory = metadata.status_history || [];
      statusHistory.push({
        status: newStatus,
        notes: notes || `Order status updated to ${newStatus}`,
        created_by: 'user',
        created_at: new Date().toISOString()
      });
      metadata.status_history = statusHistory;

      await client.query(
        `UPDATE storefront_orders 
         SET metadata = $1 
         WHERE id = $2::integer AND business_id = $3::uuid`,
        [JSON.stringify(metadata), parseInt(orderId), businessId]
      );
    }
    
    // If cancelled, restore inventory
    if (newStatus === 'cancelled') {
      const itemsResult = await client.query(
        `SELECT product_id, quantity FROM storefront_order_items WHERE order_id = $1::integer`,
        [parseInt(orderId)]
      );
      
      for (const item of itemsResult.rows) {
        // Restore product stock
        await client.query(
          `UPDATE products 
           SET stock = stock + $1,
               updated_at = NOW()
           WHERE id = $2::uuid`,
          [item.quantity, item.product_id]
        );
        
        // Find warehouse for inventory movement
        const primaryRes = await client.query(`
            SELECT id FROM warehouse_locations 
            WHERE business_id = $1::uuid AND is_primary = TRUE 
            LIMIT 1
        `, [businessId]);
        let warehouseId = primaryRes.rows[0]?.id || null;
        if (!warehouseId) {
            const whRes = await client.query(`
                SELECT id FROM warehouse_locations 
                WHERE business_id = $1::uuid 
                LIMIT 1
            `, [businessId]);
            warehouseId = whRes.rows[0]?.id || null;
        }

        // Update product stock locations
        if (warehouseId) {
          await client.query(
            `UPDATE product_stock_locations 
             SET quantity = quantity + $1,
                 updated_at = NOW()
             WHERE warehouse_id = $2::uuid AND product_id = $3::uuid`,
            [item.quantity, warehouseId, item.product_id]
          );
        }

        // Get updated running balance
        const prodRes = await client.query(`SELECT stock, cost_price FROM products WHERE id = $1::uuid`, [item.product_id]);
        const newStock = parseFloat(prodRes.rows[0]?.stock || 0);
        const costPrice = parseFloat(prodRes.rows[0]?.cost_price || 0);

        // Record stock movement (inward for return)
        const domainData = {
          storefront_order_id: parseInt(orderId),
          notes: `Order ${orderId} cancelled - inventory restored`
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
            item.quantity,
            costPrice,
            `Order ${orderId} cancelled - inventory restored`,
            JSON.stringify(domainData)
          ]
        );

        // Record inventory ledger entry
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
            item.quantity,
            newStock,
            costPrice,
            item.quantity * costPrice,
            `Order ${orderId} cancelled - inventory restored`
          ]
        );
      }
    }
    
    await client.query('COMMIT');
    
    revalidatePath(`/business/[category]`);
    
    return actionSuccess({ orderId: parseInt(orderId), status: newStatus });
    
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
  const client = await pool.connect();
  
  try {
    // First get business
    const businessResult = await client.query(
      `SELECT id FROM businesses WHERE domain = $1 AND is_active = true`,
      [businessDomain]
    );
    
    if (businessResult.rows.length === 0) {
      return actionFailure('BUSINESS_NOT_FOUND', 'Business not found');
    }
    
    const businessId = businessResult.rows[0].id;
    
    // Get orders
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
    
    const formattedOrders = ordersResult.rows.map(row => ({
      ...row,
      subtotal: parseFloat(row.subtotal || 0),
      tax: parseFloat(row.tax || 0),
      shipping_cost: parseFloat(row.shipping_cost || 0),
      discount: parseFloat(row.discount || 0),
      total: parseFloat(row.total || 0),
      items_count: parseInt(row.items_count || 0)
    }));

    return actionSuccess({ orders: formattedOrders });
    
  } catch (error) {
    console.error('[getCustomerOrders] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}
