'use server';

import pool from '@/lib/db';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';
import { withGuard } from '@/lib/rbac/serverGuard';
import {
    SALES_TREND_UNIFIED_SQL,
    TOP_MOVING_PRODUCTS_UNIFIED_SQL,
    SALES_KPI_PERIOD_SQL,
    RECENT_SALES_ACTIVITY_SQL,
    mapSalesTrendRow,
    mapTopProductRow,
} from '@/lib/analytics/salesInsights';

/**
 * Dashboard KPI Server Action
 * Provides all key metrics for the main dashboard in a single query batch.
 * Optimized for performance, uses parallel CTEs to minimize round trips.
 * Zoho-competitive: Revenue, Expenses, Receivables, Payables, Inventory, Cash Flow.
 */

async function checkAuth(businessId, permission = 'sales.view') {
    const { session } = await withGuard(businessId, { permission });
    return session;
}

/**
 * Get comprehensive dashboard KPIs for a business
 * @param {string} businessId - Business UUID
 * @param {object} options - { period: 'today'|'week'|'month'|'quarter'|'year', dateFrom, dateTo }
 */
export async function getDashboardKPIs(businessId, options = {}) {
    try {
        await checkAuth(businessId, 'sales.view');

        const client = await pool.connect();
        try {
            const period = options.period || 'month';
            const now = new Date();
            let dateFrom, dateTo;

            // Period resolution
            switch (period) {
                case 'today':
                    dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    dateTo = now;
                    break;
                case 'week':
                    dateFrom = new Date(now);
                    dateFrom.setDate(dateFrom.getDate() - 7);
                    dateTo = now;
                    break;
                case 'month':
                    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
                    dateTo = now;
                    break;
                case 'quarter':
                    dateFrom = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                    dateTo = now;
                    break;
                case 'year':
                    dateFrom = new Date(now.getFullYear(), 0, 1);
                    dateTo = now;
                    break;
                default:
                    dateFrom = options.dateFrom ? new Date(options.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
                    dateTo = options.dateTo ? new Date(options.dateTo) : now;
            }

            // Single optimized query with CTEs for all KPIs
            const result = await client.query(`
                WITH period_invoices AS (
                    SELECT * FROM invoices
                    WHERE business_id = $1
                      AND (is_deleted = false OR is_deleted IS NULL)
                      AND date BETWEEN $2 AND $3
                ),
                all_invoices AS (
                    SELECT * FROM invoices
                    WHERE business_id = $1
                      AND (is_deleted = false OR is_deleted IS NULL)
                ),
                period_purchases AS (
                    SELECT * FROM purchases
                    WHERE business_id = $1
                      AND date BETWEEN $2 AND $3
                ),
                period_expenses AS (
                    SELECT * FROM expenses
                    WHERE business_id = $1
                      AND (is_deleted = false OR is_deleted IS NULL)
                      AND date BETWEEN $2 AND $3
                ),
                period_payments AS (
                    SELECT * FROM payments
                    WHERE business_id = $1
                      AND (is_deleted = false OR is_deleted IS NULL)
                      AND payment_date BETWEEN $2 AND $3
                )
                SELECT
                    -- Revenue KPIs
                    (SELECT COALESCE(SUM(grand_total), 0) FROM period_invoices 
                     WHERE status NOT IN ('draft', 'voided')) as total_revenue,
                    (SELECT COUNT(*) FROM period_invoices 
                     WHERE status NOT IN ('draft', 'voided')) as invoice_count,
                    (SELECT COALESCE(SUM(grand_total), 0) FROM period_invoices 
                     WHERE status = 'draft') as draft_revenue,
                    (SELECT COUNT(*) FROM period_invoices 
                     WHERE status = 'draft') as draft_count,
                     
                    -- Receivables
                    (SELECT COALESCE(SUM(grand_total), 0) FROM all_invoices 
                     WHERE payment_status IN ('unpaid', 'partial')
                       AND status NOT IN ('draft', 'voided')) as total_receivables,
                    (SELECT COUNT(*) FROM all_invoices 
                     WHERE payment_status IN ('unpaid', 'partial')
                       AND status NOT IN ('draft', 'voided')) as receivable_count,
                    (SELECT COALESCE(SUM(grand_total), 0) FROM all_invoices 
                     WHERE status = 'overdue') as overdue_amount,
                    (SELECT COUNT(*) FROM all_invoices 
                     WHERE status = 'overdue') as overdue_count,
                    
                    -- Payments Collected
                    (SELECT COALESCE(SUM(amount), 0) FROM period_payments 
                     WHERE payment_type = 'receipt') as payments_received,
                    (SELECT COALESCE(SUM(amount), 0) FROM period_payments 
                     WHERE payment_type = 'payment') as payments_made,
                     
                    -- Purchases
                    (SELECT COALESCE(SUM(total_amount), 0) FROM period_purchases 
                     WHERE status != 'cancelled') as total_purchases,
                    (SELECT COUNT(*) FROM period_purchases 
                     WHERE status != 'cancelled') as purchase_count,
                     
                    -- Payables
                    (SELECT COALESCE(SUM(total_amount), 0) FROM purchases 
                     WHERE business_id = $1
                       AND payment_status IN ('pending', 'partial')) as total_payables,
                     
                    -- Expenses
                    (SELECT COALESCE(SUM(amount), 0) FROM period_expenses) as total_expenses,
                    (SELECT COUNT(*) FROM period_expenses) as expense_count,
                    
                    -- Inventory
                    (SELECT COUNT(*) FROM products 
                     WHERE business_id = $1 AND is_deleted = false AND is_active = true) as active_products,
                    (SELECT COUNT(*) FROM products 
                     WHERE business_id = $1 AND is_deleted = false AND is_active = true
                       AND stock <= COALESCE(min_stock, reorder_point, 0)
                       AND stock IS NOT NULL) as low_stock_count,
                    (SELECT COALESCE(SUM(stock * cost_price), 0) FROM products 
                     WHERE business_id = $1 AND is_deleted = false AND is_active = true) as inventory_value,

                    -- Customers & Vendors
                    (SELECT COUNT(*) FROM customers 
                     WHERE business_id = $1 AND is_active = true AND is_deleted = false) as active_customers,
                    (SELECT COUNT(*) FROM vendors 
                     WHERE business_id = $1 AND is_active = true AND is_deleted = false) as active_vendors
            `, [businessId, dateFrom, dateTo]);

            const kpi = result.rows[0];

            // Compute derived KPIs
            const totalRevenue = Number(kpi.total_revenue || 0);
            const totalExpenses = Number(kpi.total_expenses || 0);
            const totalPurchases = Number(kpi.total_purchases || 0);
            const grossProfit = totalRevenue - totalPurchases;
            const netProfit = grossProfit - totalExpenses;

            return await actionSuccess({
                period: { from: dateFrom.toISOString(), to: dateTo.toISOString(), label: period },
                revenue: {
                    total: totalRevenue,
                    invoiceCount: Number(kpi.invoice_count || 0),
                    draftTotal: Number(kpi.draft_revenue || 0),
                    draftCount: Number(kpi.draft_count || 0),
                    avgInvoice: Number(kpi.invoice_count) > 0 ? Math.round(totalRevenue / Number(kpi.invoice_count) * 100) / 100 : 0,
                },
                receivables: {
                    total: Number(kpi.total_receivables || 0),
                    count: Number(kpi.receivable_count || 0),
                    overdueTotal: Number(kpi.overdue_amount || 0),
                    overdueCount: Number(kpi.overdue_count || 0),
                },
                payments: {
                    received: Number(kpi.payments_received || 0),
                    made: Number(kpi.payments_made || 0),
                    netCashFlow: Number(kpi.payments_received || 0) - Number(kpi.payments_made || 0),
                },
                purchases: {
                    total: totalPurchases,
                    count: Number(kpi.purchase_count || 0),
                    payablesTotal: Number(kpi.total_payables || 0),
                },
                expenses: {
                    total: totalExpenses,
                    count: Number(kpi.expense_count || 0),
                },
                profitability: {
                    grossProfit,
                    netProfit,
                    grossMargin: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0,
                    netMargin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 10000) / 100 : 0,
                },
                inventory: {
                    activeProducts: Number(kpi.active_products || 0),
                    lowStockCount: Number(kpi.low_stock_count || 0),
                    totalValue: Number(kpi.inventory_value || 0),
                },
                entities: {
                    activeCustomers: Number(kpi.active_customers || 0),
                    activeVendors: Number(kpi.active_vendors || 0),
                },
            });
        } finally {
            client.release();
        }
    } catch (e) {
        console.error('Dashboard KPI Error:', e);
        return await actionFailure('DASHBOARD_KPI_FAILED', await getErrorMessage(e));
    }
}

/**
 * Get recent activity feed for the dashboard
 * Shows latest invoices, payments, purchases in chronological order
 */
export async function getRecentActivity(businessId, limit = 20) {
    try {
        await checkAuth(businessId, 'sales.view');

        const client = await pool.connect();
        try {
            const result = await client.query(`
                (
                    SELECT 
                        'invoice' as type, id, invoice_number as reference,
                        grand_total as amount, status, customer_id as entity_id,
                        c.name as entity_name, date as activity_date, created_at
                    FROM invoices i
                    LEFT JOIN customers c ON i.customer_id = c.id
                    WHERE i.business_id = $1
                      AND (i.is_deleted = false OR i.is_deleted IS NULL)
                    ORDER BY i.created_at DESC LIMIT $2
                )
                UNION ALL
                (
                    SELECT 
                        'payment' as type, p.id, p.payment_mode as reference,
                        p.amount, COALESCE(p.status, 'active') as status,
                        COALESCE(p.customer_id, p.vendor_id) as entity_id,
                        COALESCE(c.name, v.name) as entity_name,
                        p.payment_date as activity_date, p.created_at
                    FROM payments p
                    LEFT JOIN customers c ON p.customer_id = c.id
                    LEFT JOIN vendors v ON p.vendor_id = v.id
                    WHERE p.business_id = $1
                      AND (p.is_deleted = false OR p.is_deleted IS NULL)
                    ORDER BY p.created_at DESC LIMIT $2
                )
                UNION ALL
                (
                    SELECT 
                        'purchase' as type, pu.id, pu.purchase_number as reference,
                        pu.total_amount as amount, pu.status,
                        pu.vendor_id as entity_id, v.name as entity_name,
                        pu.date as activity_date, pu.created_at
                    FROM purchases pu
                    LEFT JOIN vendors v ON pu.vendor_id = v.id
                    WHERE pu.business_id = $1
                    ORDER BY pu.created_at DESC LIMIT $2
                )
                ORDER BY created_at DESC
                LIMIT $2
            `, [businessId, limit]);

            return await actionSuccess({ activities: result.rows });
        } finally {
            client.release();
        }
    } catch (e) {
        console.error('Recent Activity Error:', e);
        return await actionFailure('RECENT_ACTIVITY_FAILED', await getErrorMessage(e));
    }
}

/**
 * Get sales trend data for charts (daily/weekly/monthly aggregation)
 */
export async function getSalesTrend(businessId, options = {}) {
    try {
        await checkAuth(businessId, 'sales.view');

        const client = await pool.connect();
        try {
            const groupBy = options.groupBy || 'day'; // day, week, month
            const days = options.days || 30;
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - days);

            let dateFormat;
            switch (groupBy) {
                case 'week':  dateFormat = `TO_CHAR(date_trunc('week', date), 'YYYY-MM-DD')`; break;
                case 'month': dateFormat = `TO_CHAR(date_trunc('month', date), 'YYYY-MM')`; break;
                default:      dateFormat = `TO_CHAR(date, 'YYYY-MM-DD')`; break;
            }

            const result = await client.query(`
                SELECT 
                    ${dateFormat} as period,
                    COALESCE(SUM(grand_total), 0) as revenue,
                    COUNT(*) as invoice_count
                FROM invoices
                WHERE business_id = $1
                  AND (is_deleted = false OR is_deleted IS NULL)
                  AND status NOT IN ('draft', 'voided')
                  AND date >= $2
                GROUP BY 1
                ORDER BY 1 ASC
            `, [businessId, dateFrom]);

            return await actionSuccess({ trend: result.rows, groupBy, days });
        } finally {
            client.release();
        }
    } catch (e) {
        console.error('Sales Trend Error:', e);
        return await actionFailure('SALES_TREND_FAILED', await getErrorMessage(e));
    }
}

/**
 * Get top customers by revenue
 */
export async function getTopCustomers(businessId, limit = 10) {
    try {
        await checkAuth(businessId, 'sales.view');

        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    c.id, c.name, c.email, c.phone,
                    c.outstanding_balance,
                    COUNT(i.id) as total_invoices,
                    COALESCE(SUM(i.grand_total), 0) as total_revenue,
                    MAX(i.date) as last_invoice_date
                FROM customers c
                LEFT JOIN invoices i ON c.id = i.customer_id 
                    AND (i.is_deleted = false OR i.is_deleted IS NULL)
                    AND i.status NOT IN ('draft', 'voided')
                WHERE c.business_id = $1 AND c.is_active = true AND c.is_deleted = false
                GROUP BY c.id, c.name, c.email, c.phone, c.outstanding_balance
                ORDER BY total_revenue DESC
                LIMIT $2
            `, [businessId, limit]);

            return await actionSuccess({ customers: result.rows });
        } finally {
            client.release();
        }
    } catch (e) {
        console.error('Top Customers Error:', e);
        return await actionFailure('TOP_CUSTOMERS_FAILED', await getErrorMessage(e));
    }
}

/**
 * Get top selling products
 */
export async function getTopProducts(businessId, limit = 10) {
    try {
        await checkAuth(businessId, 'sales.view');

        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    p.id, p.name, p.sku, p.stock, p.price as selling_price, p.cost_price,
                    COUNT(ii.id) as times_sold,
                    COALESCE(SUM(ii.quantity), 0) as total_qty_sold,
                    COALESCE(SUM(ii.total_amount), 0) as total_revenue
                FROM products p
                LEFT JOIN invoice_items ii ON p.id = ii.product_id
                LEFT JOIN invoices i ON ii.invoice_id = i.id 
                    AND (i.is_deleted = false OR i.is_deleted IS NULL)
                    AND i.status NOT IN ('draft', 'voided')
                WHERE p.business_id = $1 AND p.is_active = true AND p.is_deleted = false
                GROUP BY p.id, p.name, p.sku, p.stock, p.price, p.cost_price
                ORDER BY total_revenue DESC
                LIMIT $2
            `, [businessId, limit]);

            return await actionSuccess({ products: result.rows });
        } finally {
            client.release();
        }
    } catch (e) {
        console.error('Top Products Error:', e);
        return await actionFailure('TOP_PRODUCTS_FAILED', await getErrorMessage(e));
    }
}

function toDateOnly(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toISOString().slice(0, 10);
}

function pctGrowth(cur, prev) {
    if (prev > 0) return ((cur - prev) / prev) * 100;
    return cur > 0 ? 100 : 0;
}

/**
 * Unified sales performance for the hub Sales tab, invoices, POS, and storefront.
 * @param {string} businessId
 * @param {{ months?: number; topLimit?: number }} [options]
 */
export async function getSalesPerformanceAction(businessId, options = {}) {
    try {
        await checkAuth(businessId, 'sales.view');

        const client = await pool.connect();
        try {
            const now = new Date();
            const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const curEnd = now;
            const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);

            const trendAnchor = toDateOnly(curEnd);
            const topLimit = Math.min(Math.max(Number(options.topLimit) || 8, 1), 25);

            const [trendRes, topRes, curKpiRes, prevKpiRes, recentRes, retentionRes] = await Promise.all([
                client.query(SALES_TREND_UNIFIED_SQL, [businessId, trendAnchor]),
                client.query(TOP_MOVING_PRODUCTS_UNIFIED_SQL, [
                    businessId,
                    topLimit,
                    toDateOnly(new Date(now.getFullYear(), now.getMonth() - 5, 1)),
                    trendAnchor,
                ]),
                client.query(SALES_KPI_PERIOD_SQL, [
                    businessId,
                    toDateOnly(curStart),
                    toDateOnly(curEnd),
                ]),
                client.query(SALES_KPI_PERIOD_SQL, [
                    businessId,
                    toDateOnly(prevStart),
                    toDateOnly(prevEnd),
                ]),
                client.query(RECENT_SALES_ACTIVITY_SQL, [businessId, 8]),
                client.query(
                    `
                    WITH customer_counts AS (
                        SELECT customer_key, SUM(cnt) AS order_count FROM (
                            SELECT COALESCE(i.customer_id::text, 'anon:' || i.id::text) AS customer_key, 1 AS cnt
                            FROM invoices i
                            WHERE i.business_id = $1
                              AND (i.is_deleted = false OR i.is_deleted IS NULL)
                              AND LOWER(COALESCE(i.status, '')) NOT IN ('draft', 'voided', 'cancelled')
                            UNION ALL
                            SELECT COALESCE(pt.customer_id::text, 'walkin:' || pt.id::text), 1
                            FROM pos_transactions pt
                            WHERE pt.business_id = $1 AND pt.is_voided = false
                              AND LOWER(COALESCE(pt.payment_status, '')) = 'completed'
                            UNION ALL
                            SELECT COALESCE(NULLIF(TRIM(o.customer_email), ''), 'guest:' || o.id::text), 1
                            FROM storefront_orders o
                            WHERE o.business_id = $1
                              AND LOWER(COALESCE(o.status, '')) NOT IN ('cancelled', 'refunded', 'voided')
                        ) x
                        GROUP BY customer_key
                    )
                    SELECT
                        COUNT(*) FILTER (WHERE order_count > 1) AS repeat_customers,
                        COUNT(*) AS total_customers
                    FROM customer_counts
                    `,
                    [businessId]
                ),
            ]);

            const cur = curKpiRes.rows[0] || {};
            const prev = prevKpiRes.rows[0] || {};
            const grossTotal = parseFloat(cur.gross_total) || 0;
            const prevGross = parseFloat(prev.gross_total) || 0;
            const orderCount = parseInt(cur.order_count, 10) || 0;
            const prevOrderCount = parseInt(prev.order_count, 10) || 0;
            const collected = parseFloat(cur.collected_total) || 0;
            const outstanding = Math.max(0, grossTotal - collected);
            const avgOrder = orderCount > 0 ? grossTotal / orderCount : 0;
            const prevAvg = prevOrderCount > 0 ? prevGross / prevOrderCount : 0;
            const profitEst = grossTotal * 0.4;
            const prevProfitEst = prevGross * 0.4;
            const activeCustomers = parseInt(cur.active_customers, 10) || 0;
            const prevActiveCustomers = parseInt(prev.active_customers, 10) || 0;

            const repeat = parseInt(retentionRes.rows[0]?.repeat_customers || 0, 10);
            const totalCust = parseInt(retentionRes.rows[0]?.total_customers || 0, 10);
            const retentionRate = totalCust > 0 ? Math.round((repeat / totalCust) * 100) : 0;

            return await actionSuccess({
                salesTrend: trendRes.rows.map(mapSalesTrendRow),
                topProducts: topRes.rows.map(mapTopProductRow),
                recentActivity: recentRes.rows.map((row) => ({
                    source: row.source,
                    id: row.id,
                    ref: row.ref,
                    party: row.party,
                    amount: parseFloat(row.amount) || 0,
                    paymentStatus: row.payment_status,
                    status: row.status,
                    date: row.occurred_at,
                })),
                kpi: {
                    grossTotal,
                    orderCount,
                    avgOrder,
                    collected,
                    outstanding,
                    profitEst,
                    activeCustomers,
                    retentionRate,
                    growth: {
                        revenue: pctGrowth(grossTotal, prevGross),
                        count: pctGrowth(orderCount, prevOrderCount),
                        avg: pctGrowth(avgOrder, prevAvg),
                        customers: pctGrowth(activeCustomers, prevActiveCustomers),
                        profit: pctGrowth(profitEst, prevProfitEst),
                        retention: 0,
                    },
                },
            });
        } finally {
            client.release();
        }
    } catch (e) {
        console.error('Sales Performance Error:', e);
        return await actionFailure('SALES_PERFORMANCE_FAILED', await getErrorMessage(e));
    }
}
