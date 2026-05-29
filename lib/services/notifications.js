/**
 * Notification Service
 * 
 * Handles approval notifications for stock adjustments and other inventory operations.
 * Supports both email and in-app notifications.
 * 
 * Features:
 * - Send approval request notifications
 * - Send approval decision notifications (approved/rejected)
 * - In-app notification management
 * - Email notification integration (ready for future SMTP setup)
 * 
 * Requirements: 5.3, 5.5
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Notification types
 */
export const NOTIFICATION_TYPES = {
  APPROVAL_REQUEST: 'approval_request',
  APPROVAL_APPROVED: 'approval_approved',
  APPROVAL_REJECTED: 'approval_rejected',
  STOCK_ADJUSTMENT: 'stock_adjustment',
  BATCH_EXPIRING: 'batch_expiring',
  LOW_STOCK: 'low_stock',
  TRANSFER_INITIATED: 'transfer_initiated',
  TRANSFER_RECEIVED: 'transfer_received',
};

/**
 * Notification priorities
 */
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

/**
 * Send approval request notification
 * 
 * Notifies designated approvers when a stock adjustment requires approval.
 * 
 * @param {Object} params - Notification parameters
 * @param {string} params.businessId - Business ID
 * @param {string} params.adjustmentId - Stock adjustment ID
 * @param {string} params.productName - Product name
 * @param {number} params.quantityChange - Quantity change
 * @param {number} params.adjustmentValue - Adjustment value in PKR
 * @param {string} params.requesterName - Name of user requesting approval
 * @param {string} params.requesterId - ID of user requesting approval
 * @param {string[]} params.approverIds - Array of approver user IDs
 * @param {string} params.reasonCode - Reason code for adjustment
 * @param {string} params.reasonNotes - Detailed reason notes
 * @returns {Promise<Object>} Result with success status and notification IDs
 */
export async function sendApprovalRequest({
  businessId,
  adjustmentId,
  productName,
  quantityChange,
  adjustmentValue,
  requesterName,
  requesterId,
  approverIds,
  reasonCode,
  reasonNotes,
}) {
  try {
    const supabase = createClient();
    
    // Format adjustment value
    const formattedValue = new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(Math.abs(adjustmentValue));

    // Create notification message
    const message = `${requesterName} requested approval for ${productName} stock adjustment (${quantityChange > 0 ? '+' : ''}${quantityChange} units, ${formattedValue})`;
    
    const actionUrl = `/inventory?adjustment=${adjustmentId}`;
    
    // Create in-app notifications for each approver
    const notifications = approverIds.map(approverId => ({
      business_id: businessId,
      user_id: approverId,
      type: NOTIFICATION_TYPES.APPROVAL_REQUEST,
      title: 'Approval Required',
      message,
      priority: adjustmentValue > 50000 ? NOTIFICATION_PRIORITY.HIGH : NOTIFICATION_PRIORITY.MEDIUM,
      action_url: actionUrl,
      metadata: {
        adjustment_id: adjustmentId,
        requester_id: requesterId,
        requester_name: requesterName,
        product_name: productName,
        quantity_change: quantityChange,
        adjustment_value: adjustmentValue,
        reason_code: reasonCode,
        reason_notes: reasonNotes,
      },
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    // Insert notifications into database
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('Error creating approval request notifications:', error);
      throw error;
    }

    // TODO: Send email notifications (Phase 2 - requires SMTP configuration)
    // await sendEmailNotifications(approverIds, {
    //   subject: 'Approval Required: Stock Adjustment',
    //   body: message,
    //   actionUrl,
    // });

    return {
      success: true,
      notificationIds: data.map(n => n.id),
      message: `Approval request sent to ${approverIds.length} approver(s)`,
    };
  } catch (error) {
    console.error('Error sending approval request:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send approval decision notification
 * 
 * Notifies the requester when their adjustment is approved or rejected.
 * 
 * @param {Object} params - Notification parameters
 * @param {string} params.businessId - Business ID
 * @param {string} params.adjustmentId - Stock adjustment ID
 * @param {string} params.productName - Product name
 * @param {number} params.quantityChange - Quantity change
 * @param {number} params.adjustmentValue - Adjustment value in PKR
 * @param {string} params.requesterId - ID of user who requested approval
 * @param {string} params.approverName - Name of approver
 * @param {string} params.approverId - ID of approver
 * @param {string} params.decision - 'approved' or 'rejected'
 * @param {string} params.notes - Approval/rejection notes
 * @returns {Promise<Object>} Result with success status and notification ID
 */
export async function sendApprovalDecision({
  businessId,
  adjustmentId,
  productName,
  quantityChange,
  adjustmentValue,
  requesterId,
  approverName,
  approverId,
  decision,
  notes,
}) {
  try {
    const supabase = createClient();
    
    // Format adjustment value
    const formattedValue = new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(Math.abs(adjustmentValue));

    // Create notification message based on decision
    const isApproved = decision === 'approved';
    const message = isApproved
      ? `${approverName} approved your stock adjustment for ${productName} (${quantityChange > 0 ? '+' : ''}${quantityChange} units, ${formattedValue})`
      : `${approverName} rejected your stock adjustment for ${productName} (${quantityChange > 0 ? '+' : ''}${quantityChange} units, ${formattedValue})${notes ? `: ${notes}` : ''}`;
    
    const actionUrl = `/inventory?adjustment=${adjustmentId}`;
    
    // Create in-app notification for requester
    const notification = {
      business_id: businessId,
      user_id: requesterId,
      type: isApproved ? NOTIFICATION_TYPES.APPROVAL_APPROVED : NOTIFICATION_TYPES.APPROVAL_REJECTED,
      title: isApproved ? 'Adjustment Approved' : 'Adjustment Rejected',
      message,
      priority: isApproved ? NOTIFICATION_PRIORITY.MEDIUM : NOTIFICATION_PRIORITY.HIGH,
      action_url: actionUrl,
      metadata: {
        adjustment_id: adjustmentId,
        approver_id: approverId,
        approver_name: approverName,
        product_name: productName,
        quantity_change: quantityChange,
        adjustment_value: adjustmentValue,
        decision,
        notes,
      },
      is_read: false,
      created_at: new Date().toISOString(),
    };

    // Insert notification into database
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) {
      console.error('Error creating approval decision notification:', error);
      throw error;
    }

    // TODO: Send email notification (Phase 2 - requires SMTP configuration)
    // await sendEmailNotification(requesterId, {
    //   subject: isApproved ? 'Adjustment Approved' : 'Adjustment Rejected',
    //   body: message,
    //   actionUrl,
    // });

    return {
      success: true,
      notificationId: data.id,
      message: `${isApproved ? 'Approval' : 'Rejection'} notification sent to requester`,
    };
  } catch (error) {
    console.error('Error sending approval decision notification:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get unread notifications for a user
 * 
 * @param {string} userId - User ID
 * @param {string} businessId - Business ID
 * @param {number} limit - Maximum number of notifications to return
 * @returns {Promise<Array>} Array of unread notifications
 */
export async function getUnreadNotifications(userId, businessId, limit = 50) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('business_id', businessId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 * 
 * @param {string} notificationId - Notification ID
 * @returns {Promise<boolean>} Success status
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 * 
 * @param {string} userId - User ID
 * @param {string} businessId - Business ID
 * @returns {Promise<boolean>} Success status
 */
export async function markAllNotificationsAsRead(userId, businessId) {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('business_id', businessId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

/**
 * Delete notification
 * 
 * @param {string} notificationId - Notification ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteNotification(notificationId) {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}

/**
 * Send stock transfer notification
 * 
 * @param {Object} params - Notification parameters
 * @param {string} params.businessId - Business ID
 * @param {string} params.transferId - Transfer ID
 * @param {string} params.productName - Product name
 * @param {number} params.quantity - Transfer quantity
 * @param {string} params.fromWarehouse - Source warehouse name
 * @param {string} params.toWarehouse - Destination warehouse name
 * @param {string} params.initiatorName - Name of user who initiated transfer
 * @param {string[]} params.receiverIds - Array of receiver user IDs at destination
 * @returns {Promise<Object>} Result with success status
 */
export async function sendTransferNotification({
  businessId,
  transferId,
  productName,
  quantity,
  fromWarehouse,
  toWarehouse,
  initiatorName,
  receiverIds,
}) {
  try {
    const supabase = createClient();
    
    const message = `${initiatorName} initiated transfer of ${productName} (${quantity} units) from ${fromWarehouse} to ${toWarehouse}`;
    const actionUrl = `/inventory/transfers?id=${transferId}`;
    
    // Create notifications for receivers
    const notifications = receiverIds.map(receiverId => ({
      business_id: businessId,
      user_id: receiverId,
      type: NOTIFICATION_TYPES.TRANSFER_INITIATED,
      title: 'Stock Transfer Initiated',
      message,
      priority: NOTIFICATION_PRIORITY.MEDIUM,
      action_url: actionUrl,
      metadata: {
        transfer_id: transferId,
        product_name: productName,
        quantity,
        from_warehouse: fromWarehouse,
        to_warehouse: toWarehouse,
        initiator_name: initiatorName,
      },
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('Error creating transfer notifications:', error);
      throw error;
    }

    return {
      success: true,
      notificationIds: data.map(n => n.id),
      message: `Transfer notification sent to ${receiverIds.length} receiver(s)`,
    };
  } catch (error) {
    console.error('Error sending transfer notification:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send batch expiry notification
 * 
 * @param {Object} params - Notification parameters
 * @param {string} params.businessId - Business ID
 * @param {string} params.batchId - Batch ID
 * @param {string} params.productName - Product name
 * @param {string} params.batchNumber - Batch number
 * @param {string} params.expiryDate - Expiry date
 * @param {number} params.daysUntilExpiry - Days until expiry
 * @param {number} params.quantity - Batch quantity
 * @param {string[]} params.managerIds - Array of manager user IDs
 * @returns {Promise<Object>} Result with success status
 */
export async function sendBatchExpiryNotification({
  businessId,
  batchId,
  productName,
  batchNumber,
  expiryDate,
  daysUntilExpiry,
  quantity,
  managerIds,
}) {
  try {
    const supabase = createClient();
    
    const urgency = daysUntilExpiry <= 7 ? 'URGENT' : daysUntilExpiry <= 30 ? 'WARNING' : 'NOTICE';
    const message = `${urgency}: Batch ${batchNumber} of ${productName} expires in ${daysUntilExpiry} days (${quantity} units remaining)`;
    const actionUrl = `/inventory?batch=${batchId}`;
    
    // Create notifications for managers
    const notifications = managerIds.map(managerId => ({
      business_id: businessId,
      user_id: managerId,
      type: NOTIFICATION_TYPES.BATCH_EXPIRING,
      title: `Batch Expiring ${daysUntilExpiry <= 7 ? '(Urgent)' : ''}`,
      message,
      priority: daysUntilExpiry <= 7 ? NOTIFICATION_PRIORITY.URGENT : NOTIFICATION_PRIORITY.HIGH,
      action_url: actionUrl,
      metadata: {
        batch_id: batchId,
        product_name: productName,
        batch_number: batchNumber,
        expiry_date: expiryDate,
        days_until_expiry: daysUntilExpiry,
        quantity,
      },
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('Error creating batch expiry notifications:', error);
      throw error;
    }

    return {
      success: true,
      notificationIds: data.map(n => n.id),
      message: `Expiry notification sent to ${managerIds.length} manager(s)`,
    };
  } catch (error) {
    console.error('Error sending batch expiry notification:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get notification statistics for a user
 * 
 * @param {string} userId - User ID
 * @param {string} businessId - Business ID
 * @returns {Promise<Object>} Notification statistics
 */
export async function getNotificationStats(userId, businessId) {
  try {
    const supabase = createClient();
    
    // Get unread count
    const { count: unreadCount, error: unreadError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('business_id', businessId)
      .eq('is_read', false);

    if (unreadError) throw unreadError;

    // Get count by type
    const { data: typeData, error: typeError } = await supabase
      .from('notifications')
      .select('type')
      .eq('user_id', userId)
      .eq('business_id', businessId)
      .eq('is_read', false);

    if (typeError) throw typeError;

    const countByType = typeData.reduce((acc, { type }) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      unreadCount: unreadCount || 0,
      countByType,
    };
  } catch (error) {
    console.error('Error getting notification stats:', error);
    return {
      unreadCount: 0,
      countByType: {},
    };
  }
}
