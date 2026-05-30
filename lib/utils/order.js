/**
 * Order utility functions
 */

/**
 * Generate unique order number
 * Format: ORD-YYYYMMDD-XXXX (where XXXX is sequential)
 */
export async function generateOrderNumber(client, businessId) {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get the last order number for today
  const result = await client.query(
    `SELECT order_number 
    FROM storefront_orders 
    WHERE business_id = $1 AND order_number LIKE $2
    ORDER BY created_at DESC 
    LIMIT 1`,
    [businessId, `ORD-${datePrefix}-%`]
  );
  
  let sequence = 1;
  
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].order_number;
    const lastSequence = parseInt(lastNumber.split('-')[2], 10);
    sequence = lastSequence + 1;
  }
  
  return `ORD-${datePrefix}-${sequence.toString().padStart(4, '0')}`;
}

/**
 * Generate invoice number
 */
export async function generateInvoiceNumber(client, businessId, prefix = 'INV') {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  const result = await client.query(
    `SELECT invoice_number 
    FROM invoices 
    WHERE business_id = $1 AND invoice_number LIKE $2
    ORDER BY created_at DESC 
    LIMIT 1`,
    [businessId, `${prefix}-${datePrefix}-%`]
  );
  
  let sequence = 1;
  
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].invoice_number;
    const parts = lastNumber.split('-');
    const lastSequence = parseInt(parts[parts.length - 1], 10);
    sequence = lastSequence + 1;
  }
  
  return `${prefix}-${datePrefix}-${sequence.toString().padStart(4, '0')}`;
}

/**
 * Format order status for display
 */
export function formatOrderStatus(status) {
  const statusMap = {
    pending: { label: 'Pending', color: 'yellow' },
    confirmed: { label: 'Confirmed', color: 'blue' },
    processing: { label: 'Processing', color: 'purple' },
    shipped: { label: 'Shipped', color: 'indigo' },
    delivered: { label: 'Delivered', color: 'green' },
    cancelled: { label: 'Cancelled', color: 'red' },
    refunded: { label: 'Refunded', color: 'gray' },
  };
  
  return statusMap[status] || { label: status, color: 'gray' };
}

/**
 * Format payment status
 */
export function formatPaymentStatus(status) {
  const statusMap = {
    pending: { label: 'Pending', color: 'yellow' },
    awaiting_payment: { label: 'Awaiting Payment', color: 'orange' },
    paid: { label: 'Paid', color: 'green' },
    partially_paid: { label: 'Partially Paid', color: 'blue' },
    failed: { label: 'Failed', color: 'red' },
    refunded: { label: 'Refunded', color: 'gray' },
  };
  
  return statusMap[status] || { label: status, color: 'gray' };
}

/**
 * Calculate order totals
 */
export function calculateOrderTotals(items, shipping = 0, taxRate = 0.17, discount = 0) {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = (subtotal - discount) * taxRate;
  const total = subtotal + shipping + tax - discount;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Get order timeline
 */
export function getOrderTimeline(order) {
  const timeline = [];
  
  // Order placed
  timeline.push({
    status: 'placed',
    label: 'Order Placed',
    date: order.created_at,
    completed: true,
  });
  
  // Payment
  if (order.payment_status === 'paid') {
    timeline.push({
      status: 'paid',
      label: 'Payment Confirmed',
      date: order.paid_at || order.updated_at,
      completed: true,
    });
  }
  
  // Processing
  if (['processing', 'shipped', 'delivered'].includes(order.order_status)) {
    timeline.push({
      status: 'processing',
      label: 'Processing',
      date: order.processed_at || order.updated_at,
      completed: true,
    });
  }
  
  // Shipped
  if (['shipped', 'delivered'].includes(order.order_status)) {
    timeline.push({
      status: 'shipped',
      label: 'Shipped',
      date: order.shipped_at || order.updated_at,
      completed: true,
    });
  }
  
  // Delivered
  if (order.order_status === 'delivered') {
    timeline.push({
      status: 'delivered',
      label: 'Delivered',
      date: order.delivered_at || order.updated_at,
      completed: true,
    });
  }
  
  return timeline;
}
