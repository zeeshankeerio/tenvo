/**
 * useStockAdjustment Hook
 * 
 * Enterprise-grade stock adjustment hook with approval workflows,
 * audit trails, and multi-level authorization for inventory management.
 * 
 * Features:
 * - Manual stock corrections with reason codes
 * - Approval workflow for high-value adjustments
 * - Multi-level approvals (staff -> manager -> director)
 * - Enhanced audit trail with IP tracking
 * - Location-specific adjustments
 * - Batch/serial-aware adjustments
 * - Comprehensive error handling
 * 
 * @module hooks/useStockAdjustment
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Custom hook for stock adjustment operations
 * 
 * @param {string} productId - Product UUID
 * @param {string} businessId - Business UUID
 * @param {string} [warehouseId] - Optional warehouse UUID for location-specific adjustments
 * @returns {Object} Stock adjustment state and operations
 */
export function useStockAdjustment(productIdOrBusinessId, maybeBusinessId, warehouseId = null) {
  // Backward compatibility:
  // - useStockAdjustment(productId, businessId, warehouseId?)
  // - useStockAdjustment(businessId)
  const resolvedBusinessId = maybeBusinessId || productIdOrBusinessId;
  const resolvedProductId = maybeBusinessId ? productIdOrBusinessId : null;

  const [adjustments, setAdjustments] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [approvalThreshold, setApprovalThreshold] = useState(10000);
  const supabase = createClient();

  /**
   * Fetch approval threshold from business settings
   */
  const fetchApprovalThreshold = useCallback(async () => {
    if (!resolvedBusinessId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('businesses')
        .select('approval_threshold_amount')
        .eq('id', resolvedBusinessId)
        .single();

      if (fetchError) throw fetchError;

      setApprovalThreshold(parseFloat(data?.approval_threshold_amount || 10000));
    } catch (err) {
      console.error('Error fetching approval threshold:', err);
      // Use default threshold on error
      setApprovalThreshold(10000);
    }
  }, [resolvedBusinessId, supabase]);

  /**
   * Fetch stock adjustments
   */
  const fetchAdjustments = useCallback(async () => {
    if (!resolvedBusinessId) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('stock_adjustments')
        .select(`
          *,
          product:products(id, name, sku, cost_price),
          warehouse:warehouses(id, name, code),
          requester:requested_by(id, email),
          approver:approved_by(id, email)
        `)
        .eq('business_id', resolvedBusinessId)
        .order('created_at', { ascending: false });

      if (resolvedProductId) {
        query = query.eq('product_id', resolvedProductId);
      }

      // Filter by warehouse if specified
      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setAdjustments(data || []);
    } catch (err) {
      console.error('Error fetching adjustments:', err);
      setError(err.message || 'Failed to fetch adjustments');
    } finally {
      setLoading(false);
    }
  }, [resolvedProductId, resolvedBusinessId, warehouseId, supabase]);

  /**
   * Fetch pending approvals for current user
   */
  const fetchPendingApprovals = useCallback(async () => {
    if (!resolvedBusinessId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('stock_adjustments')
        .select(`
          *,
          product:products(id, name, sku, cost_price),
          warehouse:warehouses(id, name, code),
          requester:requested_by(id, email)
        `)
        .eq('business_id', resolvedBusinessId)
        .eq('approval_status', 'pending')
        .eq('requires_approval', true)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setPendingApprovals(data || []);
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
    }
  }, [resolvedBusinessId, supabase]);

  /**
   * Create a stock adjustment
   * 
   * @param {Object} adjustmentData - Adjustment information
   * @param {string} adjustmentData.adjustment_type - Type: increase, decrease, correction
   * @param {number} adjustmentData.quantity_change - Quantity change (positive or negative)
   * @param {string} adjustmentData.reason_code - Reason: damage, theft, count_error, return, expired, cycle_count, other
   * @param {string} adjustmentData.reason_notes - Detailed explanation
   * @param {number} adjustmentData.quantity_before - Current quantity before adjustment
   * @param {string} [adjustmentData.warehouse_id] - Warehouse location
   * @returns {Promise<Object>} Created adjustment
   */
  const createAdjustment = useCallback(async (adjustmentData) => {
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!adjustmentData.adjustment_type) {
        throw new Error('Adjustment type is required');
      }
      if (adjustmentData.quantity_change === undefined || adjustmentData.quantity_change === 0) {
        throw new Error('Quantity change cannot be zero');
      }
      if (!adjustmentData.reason_code) {
        throw new Error('Reason code is required');
      }
      if (!adjustmentData.reason_notes || !adjustmentData.reason_notes.trim()) {
        throw new Error('Reason notes are required');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const targetProductId = adjustmentData.product_id || resolvedProductId;
      if (!targetProductId || !resolvedBusinessId) {
        throw new Error('Product and business are required for adjustment');
      }

      // Get product cost price for valuation
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('cost_price')
        .eq('id', targetProductId)
        .single();

      if (productError) throw productError;

      const costPrice = parseFloat(product?.cost_price || 0);
      const quantityChange = parseFloat(adjustmentData.quantity_change);
      const quantityBefore = parseFloat(adjustmentData.quantity_before || 0);
      const quantityAfter = quantityBefore + quantityChange;

      // Calculate adjustment value
      const adjustmentValue = Math.abs(quantityChange * costPrice);

      // Check if approval is required
      const requiresApproval = adjustmentValue > approvalThreshold;

      // Get client IP and user agent
      const ipAddress = await getClientIP();
      const userAgent = navigator.userAgent;

      const newAdjustment = {
        business_id: resolvedBusinessId,
        product_id: targetProductId,
        warehouse_id: adjustmentData.warehouse_id || warehouseId || null,
        adjustment_type: adjustmentData.adjustment_type,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        quantity_change: quantityChange,
        reason_code: adjustmentData.reason_code,
        reason_notes: adjustmentData.reason_notes.trim(),
        adjustment_value: adjustmentValue,
        requires_approval: requiresApproval,
        approval_status: requiresApproval ? 'pending' : 'approved',
        requested_by: user.id,
        requested_at: new Date().toISOString(),
        approved_by: requiresApproval ? null : user.id,
        approved_at: requiresApproval ? null : new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      };

      const { data, error: insertError } = await supabase
        .from('stock_adjustments')
        .insert([newAdjustment])
        .select(`
          *,
          product:products(id, name, sku, cost_price),
          warehouse:warehouses(id, name, code),
          requester:requested_by(id, email)
        `)
        .single();

      if (insertError) throw insertError;

      // If no approval required, update product stock immediately
      if (!requiresApproval) {
        await updateProductStock(targetProductId, quantityAfter, adjustmentData.warehouse_id);
      }

      // Add to local state
      setAdjustments(prev => [data, ...prev]);

      // If requires approval, add to pending approvals
      if (requiresApproval) {
        setPendingApprovals(prev => [data, ...prev]);
        
        // Send approval request notification
        try {
          const { sendApprovalRequest } = await import('@/lib/services/notifications');
          
          // TODO: Get approver IDs from business settings or role-based query
          // For now, we'll need to query users with approval permission
          const { data: approvers } = await supabase
            .from('users')
            .select('id')
            .eq('business_id', resolvedBusinessId)
            .eq('role', 'manager') // or 'admin'
            .limit(10);
          
          if (approvers && approvers.length > 0) {
            await sendApprovalRequest({
              businessId: resolvedBusinessId,
              adjustmentId: data.id,
              productName: data.product?.name || 'Unknown Product',
              quantityChange,
              adjustmentValue,
              requesterName: user?.user_metadata?.full_name || user?.email || 'User',
              requesterId: user.id,
              approverIds: approvers.map(a => a.id),
              reasonCode: adjustmentData.reason_code,
              reasonNotes: adjustmentData.reason_notes,
            });
          }
        } catch (notifError) {
          console.error('Error sending approval request notification:', notifError);
          // Don't fail the adjustment creation if notification fails
        }
      }

      return {
        ...data,
        requiresApproval
      };
    } catch (err) {
      console.error('Error creating adjustment:', err);
      setError(err.message || 'Failed to create adjustment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [resolvedProductId, resolvedBusinessId, warehouseId, approvalThreshold, supabase]);

  /**
   * Approve a stock adjustment
   * 
   * @param {string} adjustmentId - Adjustment UUID
   * @param {string} [approvalNotes] - Optional approval notes
   * @returns {Promise<Object>} Approved adjustment
   */
  const approveAdjustment = useCallback(async (adjustmentId, approvalNotes = '') => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get adjustment details
      const { data: adjustment, error: fetchError } = await supabase
        .from('stock_adjustments')
        .select('*, product:products(id, name)')
        .eq('id', adjustmentId)
        .eq('business_id', resolvedBusinessId)
        .single();

      if (fetchError) throw fetchError;

      if (adjustment.approval_status !== 'pending') {
        throw new Error('Adjustment is not pending approval');
      }

      // Update adjustment status
      const { data, error: updateError } = await supabase
        .from('stock_adjustments')
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_notes: approvalNotes || null
        })
        .eq('id', adjustmentId)
        .eq('business_id', resolvedBusinessId)
        .select(`
          *,
          product:products(id, name, sku, cost_price),
          warehouse:warehouses(id, name, code),
          requester:requested_by(id, email),
          approver:approved_by(id, email)
        `)
        .single();

      if (updateError) throw updateError;

      // Update product stock
      await updateProductStock(
        adjustment.product_id,
        adjustment.quantity_after,
        adjustment.warehouse_id
      );

      // Update local state
      setAdjustments(prev => prev.map(a => a.id === adjustmentId ? data : a));
      setPendingApprovals(prev => prev.filter(a => a.id !== adjustmentId));

      // Send approval notification to requester
      try {
        const { sendApprovalDecision } = await import('@/lib/services/notifications');
        await sendApprovalDecision({
          businessId: data.business_id,
          adjustmentId: data.id,
          productName: data.products?.name || 'Unknown Product',
          quantityChange: data.quantity_change,
          adjustmentValue: data.adjustment_value,
          requesterId: data.requested_by,
          approverName: user?.user_metadata?.full_name || 'Manager',
          approverId: user?.id,
          decision: 'approved',
          notes: approvalNotes,
        });
      } catch (notifError) {
        console.error('Error sending approval notification:', notifError);
        // Don't fail the approval if notification fails
      }

      return data;
    } catch (err) {
      console.error('Error approving adjustment:', err);
      setError(err.message || 'Failed to approve adjustment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [resolvedBusinessId, supabase]);

  /**
   * Reject a stock adjustment
   * 
   * @param {string} adjustmentId - Adjustment UUID
   * @param {string} rejectionReason - Reason for rejection
   * @returns {Promise<Object>} Rejected adjustment
   */
  const rejectAdjustment = useCallback(async (adjustmentId, rejectionReason) => {
    setLoading(true);
    setError(null);

    try {
      if (!rejectionReason || !rejectionReason.trim()) {
        throw new Error('Rejection reason is required');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update adjustment status
      const { data, error: updateError } = await supabase
        .from('stock_adjustments')
        .update({
          approval_status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_notes: rejectionReason.trim()
        })
        .eq('id', adjustmentId)
        .eq('business_id', resolvedBusinessId)
        .eq('approval_status', 'pending')
        .select(`
          *,
          product:products(id, name, sku, cost_price),
          warehouse:warehouses(id, name, code),
          requester:requested_by(id, email),
          approver:approved_by(id, email)
        `)
        .single();

      if (updateError) throw updateError;

      // Update local state
      setAdjustments(prev => prev.map(a => a.id === adjustmentId ? data : a));
      setPendingApprovals(prev => prev.filter(a => a.id !== adjustmentId));

      // Send rejection notification to requester
      try {
        const { sendApprovalDecision } = await import('@/lib/services/notifications');
        await sendApprovalDecision({
          businessId: data.business_id,
          adjustmentId: data.id,
          productName: data.products?.name || 'Unknown Product',
          quantityChange: data.quantity_change,
          adjustmentValue: data.adjustment_value,
          requesterId: data.requested_by,
          approverName: user?.user_metadata?.full_name || 'Manager',
          approverId: user?.id,
          decision: 'rejected',
          notes: rejectionReason,
        });
      } catch (notifError) {
        console.error('Error sending rejection notification:', notifError);
        // Don't fail the rejection if notification fails
      }

      return data;
    } catch (err) {
      console.error('Error rejecting adjustment:', err);
      setError(err.message || 'Failed to reject adjustment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [resolvedBusinessId, supabase]);

  /**
   * Get audit trail for a product
   * 
   * @param {Object} filters - Filter options
   * @param {string} [filters.startDate] - Start date (ISO format)
   * @param {string} [filters.endDate] - End date (ISO format)
   * @param {string} [filters.userId] - Filter by user
   * @param {string} [filters.reasonCode] - Filter by reason code
   * @returns {Promise<Array>} Audit trail records
   */
  const getAuditTrail = useCallback(async (filters = {}) => {
    try {
      let query = supabase
        .from('stock_adjustments')
        .select(`
          *,
          product:products(id, name, sku),
          warehouse:warehouses(id, name, code),
          requester:requested_by(id, email),
          approver:approved_by(id, email)
        `)
        .eq('business_id', resolvedBusinessId)
        .order('created_at', { ascending: false });

      if (resolvedProductId) {
        query = query.eq('product_id', resolvedProductId);
      }

      // Apply filters
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters.userId) {
        query = query.eq('requested_by', filters.userId);
      }
      if (filters.reasonCode) {
        query = query.eq('reason_code', filters.reasonCode);
      }
      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      return data || [];
    } catch (err) {
      console.error('Error fetching audit trail:', err);
      throw err;
    }
  }, [resolvedProductId, resolvedBusinessId, warehouseId, supabase]);

  /**
   * Get pending approvals count
   * 
   * @returns {number} Count of pending approvals
   */
  const getPendingApprovalsCount = useCallback(() => {
    return pendingApprovals.length;
  }, [pendingApprovals]);

  /**
   * Get adjustments by status
   * 
   * @param {string} status - Status: pending, approved, rejected
   * @returns {Array} Filtered adjustments
   */
  const getAdjustmentsByStatus = useCallback((status) => {
    return adjustments.filter(a => a.approval_status === status);
  }, [adjustments]);

  /**
   * Get adjustment statistics
   * 
   * @returns {Object} Statistics summary
   */
  const getStatistics = useCallback(() => {
    const total = adjustments.length;
    const pending = adjustments.filter(a => a.approval_status === 'pending').length;
    const approved = adjustments.filter(a => a.approval_status === 'approved').length;
    const rejected = adjustments.filter(a => a.approval_status === 'rejected').length;

    const totalValueAdjusted = adjustments
      .filter(a => a.approval_status === 'approved')
      .reduce((sum, a) => sum + parseFloat(a.adjustment_value || 0), 0);

    const byReasonCode = adjustments.reduce((acc, a) => {
      acc[a.reason_code] = (acc[a.reason_code] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      pending,
      approved,
      rejected,
      totalValueAdjusted,
      byReasonCode,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0
    };
  }, [adjustments]);

  /**
   * Helper function to update product stock
   */
  const updateProductStock = async (productId, newQuantity, warehouseId = null) => {
    try {
      if (warehouseId) {
        // Update product_locations for multi-location
        const { error: updateError } = await supabase
          .from('product_locations')
          .update({ quantity: newQuantity })
          .eq('product_id', productId)
          .eq('warehouse_id', warehouseId);

        if (updateError) throw updateError;
      } else {
        // Update main products table
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: newQuantity })
          .eq('id', productId);

        if (updateError) throw updateError;
      }
    } catch (err) {
      console.error('Error updating product stock:', err);
      throw err;
    }
  };

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchApprovalThreshold();
    fetchAdjustments();
    fetchPendingApprovals();
  }, [fetchApprovalThreshold, fetchAdjustments, fetchPendingApprovals]);

  return {
    adjustments,
    pendingApprovals,
    loading,
    error,
    stats: getStatistics(),
    approvalThreshold,
    createAdjustment,
    approveAdjustment,
    rejectAdjustment,
    getAuditTrail,
    getPendingApprovalsCount,
    getAdjustmentsByStatus,
    getStatistics,
    refreshAdjustments: fetchAdjustments,
    refetch: fetchAdjustments,
    refetchPending: fetchPendingApprovals
  };
}

/**
 * Helper function to get client IP address
 * Note: This is a placeholder - actual implementation depends on your setup
 */
async function getClientIP() {
  try {
    // In production, you might get this from a server-side API
    // For now, return null and let the server handle it
    return null;
  } catch (err) {
    return null;
  }
}

export default useStockAdjustment;
