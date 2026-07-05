'use client';

import { useMemo, useCallback } from 'react';
import { useData } from '@/lib/context/DataContext';
import { setPendingInventoryFocus } from '@/lib/utils/hubNavigationIntent';

function dispatchHubEvent(eventName, detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(eventName, detail ? { detail } : undefined));
}

/**
 * Live hub alerts derived from loaded business data (inventory, AR, POs, approvals).
 * Shown in NotificationBell alongside persisted notifications.
 */
export function useHubOperationalAlerts() {
  const {
    products,
    invoices,
    purchaseOrders,
    pendingApprovals,
  } = useData();

  const alerts = useMemo(() => {
    const items = [];

    const lowStock = (products || []).filter(
      (p) => Number(p?.stock || 0) <= Number(p?.min_stock || p?.minStock || p?.min_stock_level || 5)
    );
    const outOfStock = (products || []).filter((p) => Number(p?.stock || 0) <= 0);

    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    const expiring = (products || []).filter((p) => {
      if (!p?.expiry_date) return false;
      const exp = new Date(p.expiry_date);
      return !Number.isNaN(exp.getTime()) && exp >= new Date() && exp <= twoWeeks;
    });

    const now = new Date();
    const overdue = (invoices || []).filter((inv) => {
      const status = String(inv?.status || '').toLowerCase();
      const isOpen = status === 'unpaid' || status === 'pending' || status === 'overdue';
      const hasDueDate = inv?.due_date && !Number.isNaN(new Date(inv.due_date).getTime());
      return isOpen && hasDueDate && new Date(inv.due_date) < now;
    });

    const openPos = (purchaseOrders || []).filter((po) => {
      const status = String(po?.status || '').toLowerCase();
      return status === 'pending' || status === 'open' || status === 'draft' || status === 'ordered';
    });

    if (lowStock.length > 0) {
      items.push({
        id: 'low-stock',
        source: 'hub',
        type: 'inventory',
        title: 'Low stock',
        message: `${lowStock.length} product${lowStock.length === 1 ? '' : 's'} below minimum`,
        count: lowStock.length,
      });
    }
    if (outOfStock.length > 0) {
      items.push({
        id: 'out-of-stock',
        source: 'hub',
        type: 'inventory',
        title: 'Out of stock',
        message: `${outOfStock.length} product${outOfStock.length === 1 ? '' : 's'} need replenishment`,
        count: outOfStock.length,
      });
    }
    if (overdue.length > 0) {
      items.push({
        id: 'overdue-invoices',
        source: 'hub',
        type: 'payment',
        title: 'Overdue invoices',
        message: `${overdue.length} invoice${overdue.length === 1 ? '' : 's'} past due`,
        count: overdue.length,
      });
    }
    if (openPos.length > 0) {
      items.push({
        id: 'purchase-orders',
        source: 'hub',
        type: 'order',
        title: 'Open purchase orders',
        message: `${openPos.length} PO${openPos.length === 1 ? '' : 's'} awaiting closure`,
        count: openPos.length,
      });
    }
    if (expiring.length > 0) {
      items.push({
        id: 'expiring-stock',
        source: 'hub',
        type: 'inventory',
        title: 'Expiry risk',
        message: `${expiring.length} batch${expiring.length === 1 ? '' : 'es'} expiring within 14 days`,
        count: expiring.length,
      });
    }
    if ((pendingApprovals || []).length > 0) {
      items.push({
        id: 'pending-approvals',
        source: 'hub',
        type: 'system',
        title: 'Pending approvals',
        message: `${pendingApprovals.length} workflow item${pendingApprovals.length === 1 ? '' : 's'} waiting`,
        count: pendingApprovals.length,
      });
    }

    return items;
  }, [products, invoices, purchaseOrders, pendingApprovals]);

  const alertCount = useMemo(
    () => alerts.reduce((sum, item) => sum + Number(item.count || 0), 0),
    [alerts]
  );

  const handleAlertClick = useCallback((alertId) => {
    if (alertId === 'low-stock' || alertId === 'out-of-stock' || alertId === 'expiring-stock') {
      setPendingInventoryFocus(alertId);
      dispatchHubEvent('switch-tab', { tab: 'inventory', inventoryFocus: alertId });
      dispatchHubEvent('inventory-focus-low-stock', { mode: alertId });
      return;
    }
    if (alertId === 'overdue-invoices') {
      dispatchHubEvent('switch-tab', { tab: 'invoices' });
      return;
    }
    if (alertId === 'purchase-orders') {
      dispatchHubEvent('switch-tab', { tab: 'purchases' });
      return;
    }
    if (alertId === 'pending-approvals') {
      dispatchHubEvent('switch-tab', { tab: 'approvals' });
    }
  }, []);

  return { alerts, alertCount, handleAlertClick };
}
