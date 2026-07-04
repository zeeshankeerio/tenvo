/**
 * Single navigation map for dashboard metrics → workspace tabs / finance views.
 * Used by hero KPIs, period snapshot, and finance strip (via handleQuickAction).
 */

export type MetricNavId =
    | 'orders'
    | 'revenue'
    | 'inventory_value'
    | 'overdue'
    | 'net_profit'
    | 'receivable'
    | 'payable'
    | 'open_invoices'
    | 'pending_orders'
    | 'units_sold'
    | 'paid_order_ratio'
    | 'coverage_days'
    | 'in_stock_units'
    | 'period_expenses'
    | 'active_customers'
    | 'avg_order_value'
    | 'return_rate'
    | 'outstanding_ar'
    | 'stock_check'
    | 'pending_returns'
    | 'warehouse_util'
    | 'cash_flow'
    | 'efficiency';

/** Routes to `handleQuickAction` action ids (existing switch cases). */
export const METRIC_TO_ACTION: Record<MetricNavId, string> = {
    orders: 'invoices',
    revenue: 'reports',
    inventory_value: 'inventory',
    overdue: 'invoices',
    net_profit: 'view-profit-loss',
    receivable: 'payments',
    payable: 'purchases',
    open_invoices: 'invoices',
    pending_orders: 'invoices',
    units_sold: 'reports',
    paid_order_ratio: 'payments',
    coverage_days: 'inventory',
    in_stock_units: 'inventory',
    period_expenses: 'expenses',
    active_customers: 'customers',
    avg_order_value: 'reports',
    return_rate: 'invoices',
    outstanding_ar: 'payments',
    stock_check: 'inventory',
    pending_returns: 'invoices',
    warehouse_util: 'warehouses',
    cash_flow: 'finance',
    efficiency: 'reports',
};

export function metricActionId(navId: MetricNavId): string {
    return METRIC_TO_ACTION[navId] ?? 'dashboard';
}
