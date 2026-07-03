/**
 * Unified Notification Helpers
 * 
 * Tenant-aware notification creation with proper DB adapter (pool/prismaBase).
 * Replaces Supabase-based service with PostgreSQL pool for consistency.
 * 
 * Features:
 * - Business-scoped notifications (tenant isolation via business_id)
 * - Optional user targeting (business-wide if user_id null)
 * - Regional formatting (currency, locale)
 * - Domain-aware notification types
 * - Action URL deep linking to hub
 */

import pool from '@/lib/db';
import { getBusinessRegionalPack } from '@/lib/utils/businessRegionalContext';

/**
 * Notification types (extensible per domain)
 */
export const NOTIFICATION_TYPES = {
  // Commerce
  ORDER: 'order',
  PAYMENT: 'payment',
  REFUND: 'refund',
  
  // Inventory
  INVENTORY: 'inventory',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  STOCK_TRANSFER: 'stock_transfer',
  BATCH_EXPIRING: 'batch_expiring',
  
  // Finance
  INVOICE: 'invoice',
  INVOICE_OVERDUE: 'invoice_overdue',
  INVOICE_PAID: 'invoice_paid',
  
  // Operations
  PURCHASE_ORDER: 'purchase_order',
  APPROVAL_REQUEST: 'approval_request',
  APPROVAL_DECISION: 'approval_decision',
  
  // Storefront
  STOREFRONT_ORDER: 'storefront_order',
  STOREFRONT_CONTACT: 'storefront_contact',
  PRODUCT_REVIEW: 'product_review',
  
  // Domain-specific
  MEMBERSHIP_EXPIRING: 'membership_expiring', // fitness
  BOOKING_REQUEST: 'booking_request', // services
  TEST_DRIVE_REQUEST: 'test_drive_request', // auto
  PRESCRIPTION_READY: 'prescription_ready', // pharmacy
  
  // System
  SYSTEM: 'system',
  WORKFLOW: 'workflow',
};

/**
 * Priority levels
 */
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

/**
 * Format currency amount with regional settings
 * @param {number} amount - Raw numeric amount
 * @param {Object} business - Business object with country/currency
 * @returns {string} Formatted currency string
 */
export function formatNotificationAmount(amount, business) {
  try {
    const { currency, locale } = getBusinessRegionalPack(business);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (err) {
    // Fallback to basic formatting
    const curr = business?.currency || 'PKR';
    return `${curr} ${Number(amount).toLocaleString()}`;
  }
}

/**
 * Create a notification (tenant-aware, uses pool)
 * 
 * @param {Object} params - Notification parameters
 * @param {string} params.businessId - Business ID (required for tenant isolation)
 * @param {string} [params.userId] - Optional user ID; omit for business-wide
 * @param {string} params.type - Notification type from NOTIFICATION_TYPES
 * @param {string} params.title - Notification title (short, actionable)
 * @param {string} params.message - Notification message body
 * @param {string} [params.actionUrl] - Deep link to hub page
 * @param {Object} [params.metadata] - Additional structured data
 * @param {string} [params.priority] - Priority level (default: medium)
 * @param {Object} [params.client] - Optional pg client for transaction context
 * @returns {Promise<Object>} Created notification row
 */
export async function createNotification({
  businessId,
  userId = null,
  type,
  title,
  message,
  actionUrl = null,
  metadata = {},
  priority = NOTIFICATION_PRIORITY.MEDIUM,
  client = null,
}) {
  if (!businessId) {
    throw new Error('businessId is required for notifications');
  }
  if (!type) {
    throw new Error('type is required for notifications');
  }
  if (!title || !message) {
    throw new Error('title and message are required for notifications');
  }

  const db = client || pool;
  const useClient = Boolean(client);

  try {
    const query = `
      INSERT INTO notifications (
        business_id, user_id, type, title, message,
        action_url, metadata, priority, is_read, is_dismissed,
        created_at, updated_at
      ) VALUES (
        $1::uuid, $2, $3, $4, $5, $6, $7::jsonb, $8, false, false, NOW(), NOW()
      )
      RETURNING id, business_id, user_id, type, title, message, action_url, metadata, priority, created_at
    `;

    const values = [
      businessId,
      userId,
      type,
      title,
      message,
      actionUrl,
      JSON.stringify(metadata),
      priority,
    ];

    const result = useClient
      ? await db.query(query, values)
      : await (async () => {
          const conn = await pool.connect();
          try {
            return await conn.query(query, values);
          } finally {
            conn.release();
          }
        })();

    return result.rows[0];
  } catch (error) {
    console.error('[createNotification] Error:', error);
    throw error;
  }
}

/**
 * Create multiple notifications for different users (bulk insert)
 * 
 * @param {Object} params - Base notification parameters
 * @param {string[]} params.userIds - Array of user IDs to notify
 * @param {Object} [params.client] - Optional pg client for transactions
 * @returns {Promise<Object[]>} Created notification rows
 */
export async function createNotifications({
  businessId,
  userIds,
  type,
  title,
  message,
  actionUrl = null,
  metadata = {},
  priority = NOTIFICATION_PRIORITY.MEDIUM,
  client = null,
}) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('userIds array is required for bulk notifications');
  }

  const db = client || pool;
  const useClient = Boolean(client);

  try {
    const valueRows = userIds.map((userId, idx) => {
      const offset = idx * 8;
      return `($${offset + 1}::uuid, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}::jsonb, $${offset + 8}, false, false, NOW(), NOW())`;
    });

    const query = `
      INSERT INTO notifications (
        business_id, user_id, type, title, message,
        action_url, metadata, priority, is_read, is_dismissed,
        created_at, updated_at
      ) VALUES ${valueRows.join(', ')}
      RETURNING id, business_id, user_id, type, title, message, action_url, metadata, priority, created_at
    `;

    const values = userIds.flatMap((userId) => [
      businessId,
      userId,
      type,
      title,
      message,
      actionUrl,
      JSON.stringify(metadata),
      priority,
    ]);

    const result = useClient
      ? await db.query(query, values)
      : await (async () => {
          const conn = await pool.connect();
          try {
            return await conn.query(query, values);
          } finally {
            conn.release();
          }
        })();

    return result.rows;
  } catch (error) {
    console.error('[createNotifications] Bulk error:', error);
    throw error;
  }
}

/**
 * Helper: Create storefront order notification
 * @param {Object} params - Order details
 * @param {Object} [params.client] - Optional pg client
 */
export async function notifyStorefrontOrder({
  businessId,
  business,
  orderId,
  orderNumber,
  customerName,
  customerEmail,
  totalAmount,
  itemCount,
  client = null,
}) {
  const formattedTotal = formatNotificationAmount(totalAmount, business);
  const businessDomain = business?.domain || 'hub';

  return createNotification({
    businessId,
    userId: null, // Business-wide notification
    type: NOTIFICATION_TYPES.STOREFRONT_ORDER,
    title: 'New Online Order',
    message: `Order #${orderNumber} from ${customerName} • ${itemCount} item${itemCount === 1 ? '' : 's'} • ${formattedTotal}`,
    actionUrl: `/business/${businessDomain}?tab=orders&order=${orderId}`,
    metadata: {
      orderId,
      orderNumber,
      customerEmail,
      totalAmount,
      itemCount,
      source: 'storefront',
    },
    priority: totalAmount > 50000 ? NOTIFICATION_PRIORITY.HIGH : NOTIFICATION_PRIORITY.MEDIUM,
    client,
  });
}

/**
 * Helper: Create POS sale notification
 * @param {Object} params - Transaction details
 * @param {Object} [params.client] - Optional pg client
 */
export async function notifyPOSSale({
  businessId,
  business,
  transactionId,
  transactionNumber,
  totalAmount,
  itemCount,
  terminalName,
  cashierName,
  client = null,
}) {
  const formattedTotal = formatNotificationAmount(totalAmount, business);
  const businessDomain = business?.domain || 'hub';

  return createNotification({
    businessId,
    userId: null,
    type: NOTIFICATION_TYPES.ORDER,
    title: 'POS Sale Completed',
    message: `${terminalName} • ${cashierName} • ${itemCount} item${itemCount === 1 ? '' : 's'} • ${formattedTotal}`,
    actionUrl: `/business/${businessDomain}?tab=pos&transaction=${transactionId}`,
    metadata: {
      transactionId,
      transactionNumber,
      totalAmount,
      itemCount,
      terminalName,
      cashierName,
      source: 'pos',
    },
    priority: NOTIFICATION_PRIORITY.LOW,
    client,
  });
}

/**
 * Helper: Create low stock alert notification
 * @param {Object} params - Product details
 * @param {Object} [params.client] - Optional pg client
 */
export async function notifyLowStock({
  businessId,
  business,
  productId,
  productName,
  currentStock,
  minStock,
  client = null,
}) {
  const businessDomain = business?.domain || 'hub';

  return createNotification({
    businessId,
    userId: null,
    type: NOTIFICATION_TYPES.LOW_STOCK,
    title: 'Low Stock Alert',
    message: `${productName} is running low (${currentStock} units remaining, min: ${minStock})`,
    actionUrl: `/business/${businessDomain}?tab=inventory&product=${productId}`,
    metadata: {
      productId,
      productName,
      currentStock,
      minStock,
    },
    priority: currentStock === 0 ? NOTIFICATION_PRIORITY.URGENT : NOTIFICATION_PRIORITY.HIGH,
    client,
  });
}

/**
 * Helper: Create payment received notification
 * @param {Object} params - Payment details
 * @param {Object} [params.client] - Optional pg client
 */
export async function notifyPaymentReceived({
  businessId,
  business,
  invoiceId,
  invoiceNumber,
  customerName,
  amount,
  paymentMethod,
  client = null,
}) {
  const formattedAmount = formatNotificationAmount(amount, business);
  const businessDomain = business?.domain || 'hub';

  return createNotification({
    businessId,
    userId: null,
    type: NOTIFICATION_TYPES.PAYMENT,
    title: 'Payment Received',
    message: `${formattedAmount} from ${customerName} for Invoice #${invoiceNumber} via ${paymentMethod}`,
    actionUrl: `/business/${businessDomain}?tab=invoices&invoice=${invoiceId}`,
    metadata: {
      invoiceId,
      invoiceNumber,
      customerName,
      amount,
      paymentMethod,
    },
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    client,
  });
}

/**
 * Helper: Create storefront contact notification
 * @param {Object} params - Contact message details
 * @param {Object} [params.client] - Optional pg client
 */
export async function notifyStorefrontContact({
  businessId,
  business,
  contactId,
  customerName,
  customerEmail,
  subject,
  client = null,
}) {
  const businessDomain = business?.domain || business?.handle || 'hub';

  return createNotification({
    businessId,
    userId: null,
    type: NOTIFICATION_TYPES.STOREFRONT_CONTACT,
    title: 'New Contact Message',
    message: `${customerName} (${customerEmail}) • ${subject}`,
    actionUrl: `/business/${businessDomain}?tab=inquiries&contact=${contactId}`,
    metadata: {
      contactId,
      customerName,
      customerEmail,
      subject,
      source: 'storefront',
    },
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    client,
  });
}

/**
 * Helper: Create invoice overdue notification
 * @param {Object} params - Invoice details
 * @param {Object} [params.client] - Optional pg client
 */
export async function notifyInvoiceOverdue({
  businessId,
  business,
  invoiceId,
  invoiceNumber,
  customerName,
  amount,
  daysOverdue,
  client = null,
}) {
  const formattedAmount = formatNotificationAmount(amount, business);
  const businessDomain = business?.domain || 'hub';

  return createNotification({
    businessId,
    userId: null,
    type: NOTIFICATION_TYPES.INVOICE_OVERDUE,
    title: 'Invoice Overdue',
    message: `Invoice #${invoiceNumber} from ${customerName} is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue (${formattedAmount})`,
    actionUrl: `/business/${businessDomain}?tab=invoices&invoice=${invoiceId}`,
    metadata: {
      invoiceId,
      invoiceNumber,
      customerName,
      amount,
      daysOverdue,
    },
    priority: daysOverdue > 30 ? NOTIFICATION_PRIORITY.URGENT : NOTIFICATION_PRIORITY.HIGH,
    client,
  });
}
