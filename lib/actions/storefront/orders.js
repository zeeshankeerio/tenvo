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
        // Create new customer
        const newCustomer = await client.query(
          `INSERT INTO customers (business_id, name, email, phone, address, city, postal_code, country, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           RETURNING id`,
          [
            businessId,
            `${orderData.customer.firstName} ${orderData.customer.lastName}`.trim(),
            orderData.customer.email,
            orderData.customer.phone,
            orderData.customer.address,
            orderData.customer.city,
            orderData.customer.postalCode,
            orderData.customer.country || 'PK'
          ]
        );
        customerId = newCustomer.rows[0].id;
      }
    }
    
    // Create the order
    const orderResult = await client.query(
      `INSERT INTO orders (
        business_id, customer_id, order_number, status, payment_status,
        subtotal, shipping_cost, tax, discount, total,
        shipping_address, billing_address, notes, payment_method,
        shipping_method, source, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      RETURNING *`,
      [
        businessId,
        customerId,
        orderNumber,
        'pending', // Initial status
        orderData.payment?.status || 'pending',
        subtotal,
        shippingCost,
        tax,
        discount,
        total,
        JSON.stringify(orderData.customer), // shipping_address
        JSON.stringify(orderData.customer), // billing_address (same for now)
        orderData.notes || null,
        orderData.payment?.method || 'cash_on_delivery',
        orderData.shipping?.method || 'standard',
        'storefront' // source
      ]
    );
    
    const order = orderResult.rows[0];
    
    // Create order items and deduct inventory
    for (const item of orderData.items) {
      // Add order item
      await client.query(
        `INSERT INTO order_items (
          order_id, product_id, product_name, variant_id, quantity,
          unit_price, total_price, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          order.id,
          item.id,
          item.name,
          item.variantId || null,
          item.quantity,
          item.price,
          item.price * item.quantity
        ]
      );
      
      // Deduct inventory
      const inventoryResult = await client.query(
        `UPDATE products 
         SET stock = stock - $1,
             updated_at = NOW()
         WHERE id = $2 AND stock >= $1
         RETURNING stock`,
        [item.quantity, item.id]
      );
      
      if (inventoryResult.rows.length === 0) {
        // Insufficient stock - this shouldn't happen if cart validation is working
        console.warn(`[createStorefrontOrder] Insufficient stock for product ${item.id}`);
      } else {
        // Create inventory movement record
        await client.query(
          `INSERT INTO inventory_movements (
            product_id, business_id, type, quantity, reference_type, reference_id, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            item.id,
            businessId,
            'sale',
            -item.quantity, // negative for deduction
            'order',
            order.id,
            `Order ${orderNumber} - Storefront`
          ]
        );
      }
    }
    
    // Create payment record if paid
    if (orderData.payment?.status === 'paid' && orderData.payment?.transactionId) {
      await client.query(
        `INSERT INTO payments (
          business_id, order_id, amount, method, status,
          transaction_id, reference, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          businessId,
          order.id,
          total,
          orderData.payment.method,
          'completed',
          orderData.payment.transactionId,
          `Storefront order ${orderNumber}`
        ]
      );
    }
    
    // Create order status history
    await client.query(
      `INSERT INTO order_status_history (order_id, status, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [order.id, 'pending', 'Order created from storefront', 'system']
    );
    
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
  const client = await pool.connect();
  
  try {
    const { status, startDate, endDate, limit = 50, offset = 0 } = filters;
    
    let whereClause = 'WHERE o.business_id = $1';
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
    
    // Get orders with customer info
    const ordersResult = await client.query(
      `SELECT 
        o.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        COUNT(oi.id) as items_count
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       ${whereClause}
       GROUP BY o.id, c.name, c.email, c.phone
       ORDER BY o.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );
    
    // Get total count for pagination
    const countResult = await client.query(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
      params.slice(0, -2) // exclude limit and offset
    );
    
    return actionSuccess({
      orders: ordersResult.rows,
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
    const orderResult = await client.query(
      `SELECT 
        o.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.id = $1 AND o.business_id = $2`,
      [orderId, businessId]
    );
    
    if (orderResult.rows.length === 0) {
      return actionFailure('ORDER_NOT_FOUND', 'Order not found');
    }
    
    const order = orderResult.rows[0];
    
    // Get order items
    const itemsResult = await client.query(
      `SELECT 
        oi.*,
        p.image_url as product_image
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    );
    
    // Get status history
    const historyResult = await client.query(
      `SELECT * FROM order_status_history 
       WHERE order_id = $1 
       ORDER BY created_at DESC`,
      [orderId]
    );
    
    // Get payments
    const paymentsResult = await client.query(
      `SELECT * FROM payments WHERE order_id = $1`,
      [orderId]
    );
    
    return actionSuccess({
      order: order,
      items: itemsResult.rows,
      history: historyResult.rows,
      payments: paymentsResult.rows
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
      `UPDATE orders 
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND business_id = $3`,
      [newStatus, orderId, businessId]
    );
    
    // Add status history
    await client.query(
      `INSERT INTO order_status_history (order_id, status, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [orderId, newStatus, notes, 'user'] // TODO: Get actual user
    );
    
    // If cancelled, restore inventory
    if (newStatus === 'cancelled') {
      const itemsResult = await client.query(
        `SELECT product_id, quantity FROM order_items WHERE order_id = $1`,
        [orderId]
      );
      
      for (const item of itemsResult.rows) {
        await client.query(
          `UPDATE products 
           SET stock = stock + $1,
               updated_at = NOW()
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );
        
        // Record inventory movement
        await client.query(
          `INSERT INTO inventory_movements (
            product_id, business_id, type, quantity, reference_type, reference_id, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            item.product_id,
            businessId,
            'return',
            item.quantity,
            'order_cancel',
            orderId,
            `Order ${orderId} cancelled - inventory restored`
          ]
        );
      }
    }
    
    await client.query('COMMIT');
    
    revalidatePath(`/business/[category]`);
    
    return actionSuccess({ orderId, status: newStatus });
    
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
    
    // Get customer
    const customerResult = await client.query(
      `SELECT id FROM customers WHERE email = $1 AND business_id = $2`,
      [customerEmail, businessId]
    );
    
    if (customerResult.rows.length === 0) {
      return actionSuccess({ orders: [] }); // No orders yet
    }
    
    const customerId = customerResult.rows[0].id;
    
    // Get orders
    const ordersResult = await client.query(
      `SELECT 
        o.*,
        COUNT(oi.id) as items_count
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.customer_id = $1 AND o.business_id = $2
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [customerId, businessId]
    );
    
    return actionSuccess({ orders: ordersResult.rows });
    
  } catch (error) {
    console.error('[getCustomerOrders] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}
