/**
 * useStockAdjustment, client hook wired to Prisma-backed server actions
 * (adjustStockAction / getRecentStockAdjustmentsAction).
 *
 * Legacy Supabase + `stock_adjustments` path removed: it did not update the
 * same database the hub uses, so the grid never refreshed after “success”.
 *
 * Supports:
 * - useStockAdjustment(businessId)
 * - useStockAdjustment(businessId, { approvalThreshold?: number })
 * - useStockAdjustment(productId, businessId, warehouseId?), product-scoped fetches
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  adjustStockAction,
  getRecentStockAdjustmentsAction,
} from '@/lib/actions/standard/inventory/stock';

function parseHookArgs(arg1, arg2, arg3) {
  let resolvedBusinessId = null;
  let resolvedProductId = null;
  let warehouseId = null;
  let options = {};

  if (arg2 !== undefined && arg2 !== null && typeof arg2 === 'object' && !Array.isArray(arg2)) {
    resolvedBusinessId = arg1;
    options = arg2;
    warehouseId = arg3 ?? null;
  } else if (arg2) {
    resolvedProductId = arg1;
    resolvedBusinessId = arg2;
    warehouseId = arg3 ?? null;
  } else {
    resolvedBusinessId = arg1;
  }

  return { resolvedBusinessId, resolvedProductId, warehouseId, options };
}

function mapServerAdjustment(row) {
  const signed =
    row.adjustmentType === 'increase' ? Number(row.quantity || 0) : -Number(row.quantity || 0);
  return {
    id: row.id,
    quantity_change: signed,
    product_name: row.productName || 'Unknown',
    reason_code: row.reason || 'adjustment',
    warehouse_name: row.warehouseName || '',
    created_at: row.createdAt,
    created_by: row.createdBy || '-',
    status: 'completed',
    approval_status: 'approved',
  };
}

export function useStockAdjustment(arg1, arg2, arg3) {
  const { resolvedBusinessId, resolvedProductId, warehouseId, options } = parseHookArgs(
    arg1,
    arg2,
    arg3
  );

  const approvalThreshold = useMemo(
    () =>
      Number.isFinite(Number(options.approvalThreshold))
        ? Number(options.approvalThreshold)
        : 10000,
    [options.approvalThreshold]
  );

  const [adjustments, setAdjustments] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAdjustments = useCallback(async () => {
    if (!resolvedBusinessId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await getRecentStockAdjustmentsAction(resolvedBusinessId, 100);
      if (!res?.success) {
        throw new Error(res?.error || 'Failed to load adjustments');
      }
      let rows = res.adjustments || [];
      if (resolvedProductId) {
        rows = rows.filter((r) => String(r.productId) === String(resolvedProductId));
      }

      setAdjustments(rows.map(mapServerAdjustment));
    } catch (err) {
      console.error('[useStockAdjustment] fetchAdjustments:', err);
      setError(err.message || 'Failed to fetch adjustments');
    } finally {
      setLoading(false);
    }
  }, [resolvedBusinessId, resolvedProductId]);

  const fetchPendingApprovals = useCallback(async () => {
    setPendingApprovals([]);
  }, []);

  const createAdjustment = useCallback(
    async (adjustmentData) => {
      setLoading(true);
      setError(null);

      try {
        const targetProductId = adjustmentData.product_id || resolvedProductId;
        if (!targetProductId || !resolvedBusinessId) {
          throw new Error('Product and business are required');
        }

        const qty = Number(adjustmentData.quantity_change);
        if (!Number.isFinite(qty) || qty === 0) {
          throw new Error('Quantity change cannot be zero');
        }

        const reasonCode = String(adjustmentData.reason_code || 'adjustment').trim() || 'adjustment';
        const reasonNotes = String(adjustmentData.reason_notes || '').trim();
        const reason = reasonCode.slice(0, 100);
        const notes = [reasonCode, reasonNotes].filter(Boolean).join(', ').slice(0, 500);

        const wh = adjustmentData.warehouse_id || warehouseId || undefined;
        const warehouse_id =
          wh === '' || wh === null ? undefined : wh === undefined ? undefined : wh;

        const res = await adjustStockAction({
          business_id: resolvedBusinessId,
          product_id: targetProductId,
          warehouse_id: warehouse_id,
          quantity_change: qty,
          reason,
          notes: notes || undefined,
        });

        if (!res?.success) {
          throw new Error(res?.error || 'Stock adjustment failed');
        }

        await fetchAdjustments();
        return { ...res, requiresApproval: false };
      } catch (err) {
        console.error('[useStockAdjustment] createAdjustment:', err);
        setError(err.message || 'Failed to create adjustment');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [resolvedBusinessId, resolvedProductId, warehouseId, fetchAdjustments]
  );

  const approveAdjustment = useCallback(async () => {
    throw new Error(
      'Pending approvals are not enabled for inventory adjustments. Changes apply immediately after save.'
    );
  }, []);

  const rejectAdjustment = useCallback(async () => {
    throw new Error('Nothing to reject, adjustments are not held for approval in this workspace.');
  }, []);

  const getStatistics = useCallback(() => {
    const total = adjustments.length;
    const pending = adjustments.filter((a) => a.approval_status === 'pending').length;
    const approved = adjustments.filter((a) => a.approval_status === 'approved').length;
    const rejected = adjustments.filter((a) => a.approval_status === 'rejected').length;

    const totalValueAdjusted = adjustments
      .filter((a) => a.approval_status === 'approved')
      .reduce((sum, a) => sum + Math.abs(Number(a.quantity_change || 0)), 0);

    const byReasonCode = adjustments.reduce((acc, a) => {
      const k = a.reason_code || 'unknown';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      pending,
      approved,
      rejected,
      totalValueAdjusted,
      byReasonCode,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  }, [adjustments]);

  const getAuditTrail = useCallback(async () => {
    const res = await getRecentStockAdjustmentsAction(resolvedBusinessId, 200);
    if (!res?.success) throw new Error(res?.error || 'Failed to load audit trail');
    let rows = res.adjustments || [];
    if (resolvedProductId) {
      rows = rows.filter((r) => String(r.productId) === String(resolvedProductId));
    }
    return rows;
  }, [resolvedBusinessId, resolvedProductId]);

  const getPendingApprovalsCount = useCallback(() => pendingApprovals.length, [pendingApprovals]);

  const getAdjustmentsByStatus = useCallback(
    (status) => adjustments.filter((a) => a.approval_status === status),
    [adjustments]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchAdjustments();
      void fetchPendingApprovals();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchAdjustments, fetchPendingApprovals]);

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
    refetchPending: fetchPendingApprovals,
  };
}

export default useStockAdjustment;
