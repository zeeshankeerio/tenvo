'use server';

import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { getDomainConfig } from '@/lib/config/domains';
import {
    getDomainKnowledgeForBusiness,
    resolveBusinessCountryIso,
} from '@/lib/utils/businessRegionalContext';
import { AIOrderForecaster } from '@/lib/services/ai/forecasting';
import { resolveAnalyticsRange } from '@/lib/utils/analyticsRange';
import {
    SALES_TREND_UNIFIED_SQL,
    TOP_MOVING_PRODUCTS_UNIFIED_SQL,
    REVENUE_GROWTH_UNIFIED_SQL,
    mapSalesTrendRow,
    mapTopProductRow,
} from '@/lib/analytics/salesInsights';
import {
    applyFashionSeasonalityToRestock,
    getFashionSafetyStockMultiplier,
    getFashionSeasonalInsights,
} from '@/lib/utils/fashionSeasonalityHelper';

async function checkAuth(businessId, permission = 'analytics.basic', client = null, featureKey = 'ai_analytics') {
    const { session } = await withGuard(businessId, {
        permission,
        feature: featureKey,
        client,
    });
    return session;
}

function parseBusinessSettings(raw) {
    if (raw == null) return {};
    if (typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) || {};
        } catch {
            return {};
        }
    }
    return {};
}

/** Resolve tenant category + regional domain knowledge for AI analytics. */
async function loadBusinessMarketContext(client, businessId) {
    const bizResult = await client.query(
        `SELECT b.category, b.country, bs.settings
         FROM businesses b
         LEFT JOIN business_settings bs ON bs.business_id = b.id
         WHERE b.id = $1`,
        [businessId]
    );
    if (bizResult.rows.length === 0) return null;

    const row = bizResult.rows[0];
    const settings = parseBusinessSettings(row.settings);
    const business = { category: row.category, country: row.country, settings };
    const category = row.category || 'retail-shop';
    const countryIso = resolveBusinessCountryIso(business);

    return {
        category,
        countryIso,
        business,
        domainKnowledge: getDomainKnowledgeForBusiness(category, business),
    };
}


/** @deprecated Use SALES_TREND_UNIFIED_SQL from lib/analytics/salesInsights.js */
const SALES_TREND_WITH_STOREFRONT_SQL = SALES_TREND_UNIFIED_SQL;

/** @deprecated Use REVENUE_GROWTH_UNIFIED_SQL */
const REVENUE_GROWTH_VS_PRIOR_SQL = REVENUE_GROWTH_UNIFIED_SQL;

/** @deprecated Use TOP_MOVING_PRODUCTS_UNIFIED_SQL */
const TOP_MOVING_PRODUCTS_SQL = TOP_MOVING_PRODUCTS_UNIFIED_SQL;

/**
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string} trendAnchor YYYY-MM-DD
 */
async function fetchSalesTrendRows(client, businessId, trendAnchor) {
    const result = await client.query(SALES_TREND_UNIFIED_SQL, [businessId, trendAnchor]);
    return result.rows.map(mapSalesTrendRow);
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string} from
 * @param {string} to
 */
async function fetchRevenueGrowthTotals(client, businessId, from, to) {
    const growthRes = await client.query(REVENUE_GROWTH_VS_PRIOR_SQL, [businessId, from, to]);
    const current = parseFloat(growthRes.rows[0]?.cur_total || 0);
    const last = parseFloat(growthRes.rows[0]?.prev_total || 0);
    let growthPercent = 0;
    if (last > 0) growthPercent = ((current - last) / last) * 100;
    else if (current > 0) growthPercent = 100;
    return { current, last, growthPercent };
}

/**
 * Get Monthly Sales Trend (Last 6 Months)
 * Optimized SQL Aggregation
 * @param {string} businessId
 * @param {{ from?: unknown; to?: unknown }} [filter] Uses `to` as end anchor for the 6-month series (capped to business logic in SQL).
 */
export async function getSalesTrendAction(businessId, filter = {}) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'analytics.basic', client, 'ai_analytics');
        try {
            const { trendAnchor } = resolveAnalyticsRange(filter);
            const data = await fetchSalesTrendRows(client, businessId, trendAnchor);

            return {
                success: true,
                data,
            };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Sales Trend Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Top Moving Products (Revenue & Volume)
 * @param {string} businessId
 * @param {number} [limit]
 * @param {{ from?: unknown; to?: unknown }} [filter]
 */
export async function getTopProductsAction(businessId, limit = 5, filter = {}) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'analytics.basic', client, 'ai_analytics');
        try {
            const { from, to } = resolveAnalyticsRange(filter);
            const result = await client.query(TOP_MOVING_PRODUCTS_SQL, [businessId, limit, from, to]);

            return {
                success: true,
                data: result.rows.map(mapTopProductRow),
            };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Top Products Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Category Distribution (Asset Value)
 */
export async function getCategoryDistributionAction(businessId) {
    try {
        await checkAuth(businessId, 'analytics.basic', null, 'ai_analytics');
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    COALESCE(category, 'Uncategorized') as name,
                    COUNT(*) as count,
                    COALESCE(SUM(stock * price), 0) as value
                FROM products
                WHERE business_id = $1
                GROUP BY category
                ORDER BY value DESC
                LIMIT 6
            `, [businessId]);

            return {
                success: true,
                data: result.rows.map(row => ({
                    name: row.name,
                    value: parseInt(row.count), // Count for Pie Chart
                    assetValue: parseFloat(row.value)
                }))
            };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Category Dist Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get KPI Metrics (Growth, Retention, Asset)
 * @param {string} businessId
 * @param {{ from?: unknown; to?: unknown }} [filter] Growth compares selected range vs the immediately preceding period of equal length.
 */
export async function getKPIMetricsAction(businessId, filter = {}) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'analytics.basic', client, 'ai_analytics');
        try {
            const { from, to } = resolveAnalyticsRange(filter);

            // 1. Inventory Asset Value
            const inventoryRes = await client.query(`
                SELECT COALESCE(SUM(stock * price), 0) as total_value 
                FROM products WHERE business_id = $1
            `, [businessId]);

            // 2. Growth: invoice + paid storefront revenue in [from,to] vs prior window of same inclusive length
            const { current, last, growthPercent } = await fetchRevenueGrowthTotals(client, businessId, from, to);

            // 3. Customer Retention (Repeat Customers)
            // Customers with more than 1 invoice
            const retentionRes = await client.query(`
                WITH customer_counts AS (
                    SELECT customer_id, COUNT(*) as inv_count
                    FROM invoices
                    WHERE business_id = $1 AND customer_id IS NOT NULL
                    GROUP BY customer_id
                )
                SELECT 
                    COUNT(*) FILTER (WHERE inv_count > 1) as repeat_customers,
                    COUNT(*) as total_active_customers
                FROM customer_counts
            `, [businessId]);

            const repeat = parseInt(retentionRes.rows[0]?.repeat_customers || 0);
            const total = parseInt(retentionRes.rows[0]?.total_active_customers || 0);
            const retentionRate = total > 0 ? (repeat / total) * 100 : 0;

            return {
                success: true,
                data: {
                    inventoryAsset: parseFloat(inventoryRes.rows[0].total_value),
                    growth: {
                        value: `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%`,
                        trend: growthPercent >= 0 ? 'up' : 'down'
                    },
                    growthDetail: {
                        periodRevenue: current,
                        priorPeriodRevenue: last,
                        rangeFrom: from,
                        rangeTo: to,
                    },
                    retention: `${retentionRate.toFixed(0)}%`,
                    retentionDetail: {
                        repeatCustomers: repeat,
                        invoicedCustomers: total,
                        /** Share of customers (with ≥1 invoice) who have >1 invoice */
                        rate: retentionRate,
                    },
                }
            };

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('KPI Metrics Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Demand Forecast Data
 * Calculates sales velocity and integrates AI forecasting logic
 * @param {string} businessId
 * @param {Record<string, unknown>} [intelligence]
 * @param {boolean} [useAI]
 * @param {{ from?: unknown; to?: unknown }} [filter] History window ends at `to` (default: today).
 */
export async function getDemandForecastAction(businessId, intelligence = {}, useAI = true, filter = {}) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'analytics.basic', client, 'ai_analytics');
        try {
            const marketCtx = await loadBusinessMarketContext(client, businessId);
            const domainIntel =
                intelligence && Object.keys(intelligence).length > 0
                    ? intelligence
                    : marketCtx?.domainKnowledge?.intelligence || {};
            const { trendAnchor } = resolveAnalyticsRange(filter);
            // 1. Per-product monthly quantity: invoices + paid storefront (same paid / non-cancelled rules as sales trend)
            const result = await client.query(
                `
                WITH inv_month AS (
                    SELECT
                        ii.product_id,
                        to_char(date_trunc('month', i.date), 'YYYY-MM') AS month_key,
                        SUM(ii.quantity) AS qty
                    FROM invoice_items ii
                    JOIN invoices i ON ii.invoice_id = i.id
                    WHERE i.business_id = $1
                      AND i.status != 'cancelled'
                      AND i.date >= ($2::date - INTERVAL '6 months')
                      AND i.date::date <= $2::date
                    GROUP BY ii.product_id, to_char(date_trunc('month', i.date), 'YYYY-MM')
                ),
                sf_month AS (
                    SELECT
                        soi.product_id,
                        to_char(date_trunc('month', o.created_at), 'YYYY-MM') AS month_key,
                        SUM(soi.quantity) AS qty
                    FROM storefront_order_items soi
                    JOIN storefront_orders o ON o.id = soi.order_id
                    WHERE o.business_id = $1
                      AND LOWER(COALESCE(o.status, '')) != 'cancelled'
                      AND LOWER(COALESCE(o.payment_status, '')) = 'paid'
                      AND o.created_at >= ($2::date - INTERVAL '6 months')
                      AND o.created_at::date <= $2::date
                      AND soi.product_id IS NOT NULL
                    GROUP BY soi.product_id, to_char(date_trunc('month', o.created_at), 'YYYY-MM')
                ),
                combined AS (
                    SELECT product_id, month_key, SUM(qty) AS total_sold
                    FROM (
                        SELECT product_id, month_key, qty FROM inv_month
                        UNION ALL
                        SELECT product_id, month_key, qty FROM sf_month
                    ) u
                    GROUP BY product_id, month_key
                )
                SELECT
                    p.id,
                    p.name,
                    p.sku,
                    p.stock,
                    p.category,
                    p.reorder_point,
                    COALESCE(c.total_sold, 0) AS total_sold,
                    c.month_key
                FROM products p
                LEFT JOIN combined c ON c.product_id = p.id
                WHERE p.business_id = $1 AND p.is_active = true
                ORDER BY p.id, c.month_key DESC NULLS LAST
            `,
                [businessId, trendAnchor]
            );

            const productMap = {};
            const anchorDate = new Date(`${trendAnchor}T12:00:00Z`);
            const currentYear = anchorDate.getUTCFullYear();
            const currentMonth = anchorDate.getUTCMonth();

            result.rows.forEach(row => {
                if (!productMap[row.id]) {
                    productMap[row.id] = {
                        id: row.id,
                        name: row.name,
                        sku: row.sku,
                        stock: parseFloat(row.stock),
                        reorder_point: parseFloat(row.reorder_point || 0),
                        history: [0, 0, 0, 0, 0, 0],
                        rawHistory: [] // For AI
                    };
                }

                if (row.month_key) {
                    const [y, m] = row.month_key.split('-').map(Number);
                    const monthDiff = (currentYear - y) * 12 + (currentMonth - (m - 1));
                    if (monthDiff >= 0 && monthDiff < 6) {
                        productMap[row.id].history[5 - monthDiff] = parseFloat(row.total_sold);
                        productMap[row.id].rawHistory.push({ date: row.month_key, quantity: parseFloat(row.total_sold) });
                    }
                }
            });

            const products = Object.values(productMap);
            const forecastData = [];

            // 2. Process forecasts (Mix of AI and WMA)
            for (const p of products) {
                let forecast;

                if (useAI && p.rawHistory.length > 0) {
                    const aiResult = await AIOrderForecaster.forecastDemand(
                        marketCtx?.category || 'retail-shop',
                        p,
                        p.rawHistory,
                        { countryIso: marketCtx?.countryIso, intelligence: domainIntel }
                    );
                    forecast = {
                        qty: aiResult.forecastedQuantity,
                        confidence: aiResult.confidenceScore,
                        insight: aiResult.reasoning,
                        isAi: aiResult.confidenceScore > 0.5
                    };
                } else {
                    // Fallback to WMA
                    const weights = [0.05, 0.1, 0.15, 0.2, 0.25, 0.25];
                    const wma = p.history.reduce((acc, val, i) => acc + (val * weights[i]), 0);
                    forecast = {
                        qty: Math.ceil(wma),
                        confidence: 0.5,
                        insight: 'Calculated using historical moving average.',
                        isAi: false
                    };
                }

                const dailyDemand = forecast.qty / 30;
                const leadTime = intelligence.leadTime || 7;
                
                // Apply fashion-specific seasonality if applicable
                const domainKey = intelligence.key || 'retail-shop';
                const fashionAdjustment = applyFashionSeasonalityToRestock(
                    domainKey,
                    p.category || null,
                    forecast.qty,
                    anchorDate
                );
                
                // Use fashion-aware safety stock multiplier
                const safetyFactor = getFashionSafetyStockMultiplier(domainKey, p.category);
                const safetyStock = Math.ceil(dailyDemand * leadTime * safetyFactor);
                
                // Adjust forecast with seasonality
                const adjustedForecast = fashionAdjustment.adjustedQuantity || forecast.qty;
                const recommendedStock = Math.ceil(adjustedForecast + safetyStock);
                
                // Enhance insight with seasonal context
                let finalInsight = forecast.insight;
                if (fashionAdjustment.insight) {
                    finalInsight = `${fashionAdjustment.insight} ${forecast.insight}`;
                }

                const trend = p.history[5] > p.history[4] ? 'up' : 'down';
                const priority = p.stock < recommendedStock * 0.4 ? 'high' : 'normal';

                forecastData.push({
                    id: p.id,
                    name: p.name,
                    sku: p.sku,
                    category: p.category,
                    current: p.stock,
                    forecast: adjustedForecast,
                    recommended: recommendedStock,
                    confidence: forecast.confidence,
                    insight: finalInsight,
                    isAi: forecast.isAi,
                    seasonalMultiplier: fashionAdjustment.multiplier,
                    trend,
                    priority,
                    variance: Math.abs(p.stock - recommendedStock)
                });
            }

            // 3. Sort and filter for dashboard relevance
            forecastData.sort((a, b) => {
                if (a.priority === 'high' && b.priority !== 'high') return -1;
                if (b.priority === 'high' && a.priority !== 'high') return 1;
                return b.variance - a.variance;
            });

            return { success: true, data: forecastData.slice(0, 24) };

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Forecast Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Dashboard Metrics (Consolidated)
 * Single source of truth for main dashboard KPIs
 */
export async function getDashboardMetricsAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'analytics.basic', client, 'ai_analytics');
        try {
            // 1. Revenue (from GL - Revenue accounts + storefront orders)
            const revenueRes = await client.query(`
                WITH gl_revenue AS (
                    SELECT COALESCE(SUM(e.credit - e.debit), 0) as total_revenue
                    FROM gl_entries e
                    JOIN gl_accounts a ON e.account_id = a.id
                    WHERE a.business_id = $1 
                      AND LOWER(a.type) IN ('revenue', 'income')
                      AND e.transaction_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                ),
                storefront_revenue AS (
                    SELECT COALESCE(SUM(total_amount), 0) as total_revenue
                    FROM storefront_orders
                    WHERE business_id = $1
                      AND payment_status = 'paid'
                      AND status NOT IN ('cancelled', 'refunded')
                      AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                )
                SELECT 
                    COALESCE((SELECT total_revenue FROM gl_revenue), 0) + COALESCE((SELECT total_revenue FROM storefront_revenue), 0) as total_revenue
            `, [businessId]).catch(err => {
                // Fallback if storefront_orders table doesn't exist
                if (err.code === '42P01') {
                    return client.query(`
                        SELECT COALESCE(SUM(e.credit - e.debit), 0) as total_revenue
                        FROM gl_entries e
                        JOIN gl_accounts a ON e.account_id = a.id
                        WHERE a.business_id = $1 
                          AND LOWER(a.type) IN ('revenue', 'income')
                          AND e.transaction_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                    `, [businessId]);
                }
                throw err;
            });

            // 2. Orders Count (Active invoices + storefront orders)
            const ordersRes = await client.query(`
                WITH invoice_orders AS (
                    SELECT 
                        COUNT(*) FILTER (WHERE status NOT IN ('cancelled', 'draft')) as active_orders,
                        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
                        COUNT(*) FILTER (WHERE status = 'paid') as paid_orders
                    FROM invoices
                    WHERE business_id = $1
                      AND date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                ),
                storefront AS (
                    SELECT 
                        COUNT(*) FILTER (WHERE status NOT IN ('cancelled')) as active_orders,
                        COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) as pending_orders,
                        COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_orders
                    FROM storefront_orders
                    WHERE business_id = $1
                      AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                )
                SELECT 
                    COALESCE((SELECT active_orders FROM invoice_orders), 0) + COALESCE((SELECT active_orders FROM storefront), 0) as active_orders,
                    COALESCE((SELECT pending_orders FROM invoice_orders), 0) + COALESCE((SELECT pending_orders FROM storefront), 0) as pending_orders,
                    COALESCE((SELECT paid_orders FROM invoice_orders), 0) + COALESCE((SELECT paid_orders FROM storefront), 0) as paid_orders
            `, [businessId]).catch(err => {
                // Fallback if storefront_orders table doesn't exist
                if (err.code === '42P01') {
                    return client.query(`
                        SELECT 
                            COUNT(*) FILTER (WHERE status NOT IN ('cancelled', 'draft')) as active_orders,
                            COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
                            COUNT(*) FILTER (WHERE status = 'paid') as paid_orders
                        FROM invoices
                        WHERE business_id = $1
                          AND date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                    `, [businessId]);
                }
                throw err;
            });

            // 3. Products Count (Active only) - Current vs Last Month
            const productsRes = await client.query(`
                WITH product_snapshots AS (
                    SELECT 
                        date_trunc('month', created_at) as month,
                        COUNT(*) as product_count
                    FROM products
                    WHERE business_id = $1 AND is_active = true
                    GROUP BY month
                ),
                current_products AS (
                    SELECT COUNT(*) as count
                    FROM products
                    WHERE business_id = $1 AND is_active = true
                ),
                last_month_products AS (
                    SELECT COUNT(*) as count
                    FROM products
                    WHERE business_id = $1 
                      AND is_active = true
                      AND created_at < date_trunc('month', CURRENT_DATE)
                )
                SELECT 
                    (SELECT count FROM current_products) as current_count,
                    (SELECT count FROM last_month_products) as last_month_count
            `, [businessId]);

            // 4. Growth (Current vs Last Month Revenue - GL + Storefront)
            const growthRes = await client.query(`
                WITH monthly_revenue AS (
                    SELECT 
                        date_trunc('month', e.transaction_date) as month,
                        SUM(e.credit - e.debit) as revenue
                    FROM gl_entries e
                    JOIN gl_accounts a ON e.account_id = a.id
                    WHERE a.business_id = $1 
                      AND LOWER(a.type) IN ('revenue', 'income')
                      AND e.transaction_date >= date_trunc('month', CURRENT_DATE - INTERVAL '2 months')
                    GROUP BY month
                ),
                storefront_revenue AS (
                    SELECT 
                        date_trunc('month', created_at) as month,
                        SUM(total_amount) as revenue
                    FROM storefront_orders
                    WHERE business_id = $1
                      AND payment_status = 'paid'
                      AND status NOT IN ('cancelled', 'refunded')
                      AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '2 months')
                    GROUP BY month
                ),
                combined_revenue AS (
                    SELECT 
                        COALESCE(mr.month, sr.month) as month,
                        COALESCE(mr.revenue, 0) + COALESCE(sr.revenue, 0) as revenue
                    FROM monthly_revenue mr
                    FULL OUTER JOIN storefront_revenue sr ON mr.month = sr.month
                )
                SELECT 
                    (SELECT revenue FROM combined_revenue WHERE month = date_trunc('month', CURRENT_DATE)) as current_month,
                    (SELECT revenue FROM combined_revenue WHERE month = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')) as last_month
            `, [businessId]).catch(err => {
                // Fallback if storefront_orders table doesn't exist
                if (err.code === '42P01') {
                    return client.query(`
                        WITH monthly_revenue AS (
                            SELECT 
                                date_trunc('month', e.transaction_date) as month,
                                SUM(e.credit - e.debit) as revenue
                            FROM gl_entries e
                            JOIN gl_accounts a ON e.account_id = a.id
                            WHERE a.business_id = $1 
                              AND LOWER(a.type) IN ('revenue', 'income')
                              AND e.transaction_date >= date_trunc('month', CURRENT_DATE - INTERVAL '2 months')
                            GROUP BY month
                        )
                        SELECT 
                            (SELECT revenue FROM monthly_revenue WHERE month = date_trunc('month', CURRENT_DATE)) as current_month,
                            (SELECT revenue FROM monthly_revenue WHERE month = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')) as last_month
                    `, [businessId]);
                }
                throw err;
            });

            const currentRevenue = parseFloat(growthRes.rows[0]?.current_month || 0);
            const lastRevenue = parseFloat(growthRes.rows[0]?.last_month || 0);

            let growthPercent = 0;
            if (lastRevenue > 0) {
                growthPercent = ((currentRevenue - lastRevenue) / lastRevenue) * 100;
            } else if (currentRevenue > 0) {
                growthPercent = 100;
            }

            // Helper function for growth calculation
            const calcGrowthPercent = (currentValue, lastValue) => {
                if (lastValue > 0) return ((currentValue - lastValue) / lastValue) * 100;
                if (currentValue > 0) return 100;
                return 0;
            };

            // Calculate products growth
            const currentProducts = parseInt(productsRes.rows[0]?.current_count || 0);
            const lastMonthProducts = parseInt(productsRes.rows[0]?.last_month_count || 0);
            const productsGrowth = calcGrowthPercent(currentProducts, lastMonthProducts);

            // 5. Active Customers (invoices + storefront) & Cash Flow
            const extraMetricsRes = await client.query(`
                WITH customer_activity AS (
                    SELECT
                        date_trunc('month', i.date) AS month,
                        COUNT(DISTINCT i.customer_id) AS customers
                    FROM invoices i
                    WHERE i.business_id = $1
                      AND i.status != 'cancelled'
                      AND i.customer_id IS NOT NULL
                      AND i.date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                    GROUP BY 1
                ),
                storefront_customers AS (
                    SELECT
                        date_trunc('month', so.created_at) AS month,
                        COUNT(DISTINCT LOWER(so.customer_email)) AS customers
                    FROM storefront_orders so
                    WHERE so.business_id = $1
                      AND so.status != 'cancelled'
                      AND so.customer_email IS NOT NULL
                      AND so.created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                    GROUP BY 1
                ),
                combined_customers AS (
                    SELECT 
                        COALESCE(ca.month, sc.month) as month,
                        COALESCE(ca.customers, 0) + COALESCE(sc.customers, 0) as customers
                    FROM customer_activity ca
                    FULL OUTER JOIN storefront_customers sc ON ca.month = sc.month
                ),
                cash_flow AS (
                    SELECT
                        date_trunc('month', e.transaction_date) AS month,
                        COALESCE(SUM(CASE WHEN LOWER(a.type) IN ('revenue', 'income') THEN (e.credit - e.debit) ELSE 0 END), 0) -
                        COALESCE(SUM(CASE WHEN LOWER(a.type) = 'expense' THEN (e.debit - e.credit) ELSE 0 END), 0) AS net_cash
                    FROM gl_entries e
                    JOIN gl_accounts a ON e.account_id = a.id
                    WHERE a.business_id = $1
                      AND e.transaction_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                    GROUP BY 1
                )
                SELECT 
                    COALESCE((SELECT customers FROM combined_customers WHERE month = date_trunc('month', CURRENT_DATE)), 0) AS active_customers_current,
                    COALESCE((SELECT customers FROM combined_customers WHERE month = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')), 0) AS active_customers_last,
                    COALESCE((SELECT net_cash FROM cash_flow WHERE month = date_trunc('month', CURRENT_DATE)), 0) AS cash_flow_current,
                    COALESCE((SELECT net_cash FROM cash_flow WHERE month = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')), 0) AS cash_flow_last
            `, [businessId]).catch(err => {
                // Fallback if storefront_orders table doesn't exist
                if (err.code === '42P01') {
                    return client.query(`
                        WITH customer_activity AS (
                            SELECT
                                date_trunc('month', i.date) AS month,
                                COUNT(DISTINCT i.customer_id) AS customers
                            FROM invoices i
                            WHERE i.business_id = $1
                              AND i.status != 'cancelled'
                              AND i.customer_id IS NOT NULL
                              AND i.date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                            GROUP BY 1
                        ),
                        cash_flow AS (
                            SELECT
                                date_trunc('month', e.transaction_date) AS month,
                                COALESCE(SUM(CASE WHEN LOWER(a.type) IN ('revenue', 'income') THEN (e.credit - e.debit) ELSE 0 END), 0) -
                                COALESCE(SUM(CASE WHEN LOWER(a.type) = 'expense' THEN (e.debit - e.credit) ELSE 0 END), 0) AS net_cash
                            FROM gl_entries e
                            JOIN gl_accounts a ON e.account_id = a.id
                            WHERE a.business_id = $1
                              AND e.transaction_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                            GROUP BY 1
                        )
                        SELECT 
                            COALESCE((SELECT customers FROM customer_activity WHERE month = date_trunc('month', CURRENT_DATE)), 0) AS active_customers_current,
                            COALESCE((SELECT customers FROM customer_activity WHERE month = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')), 0) AS active_customers_last,
                            COALESCE((SELECT net_cash FROM cash_flow WHERE month = date_trunc('month', CURRENT_DATE)), 0) AS cash_flow_current,
                            COALESCE((SELECT net_cash FROM cash_flow WHERE month = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')), 0) AS cash_flow_last
                    `, [businessId]);
                }
                throw err;
            });

            const currentCustomers = parseFloat(extraMetricsRes.rows[0]?.active_customers_current || 0);
            const lastCustomers = parseFloat(extraMetricsRes.rows[0]?.active_customers_last || 0);
            const currentCashFlow = parseFloat(extraMetricsRes.rows[0]?.cash_flow_current || 0);
            const lastCashFlow = parseFloat(extraMetricsRes.rows[0]?.cash_flow_last || 0);

            const customerGrowth = calcGrowthPercent(currentCustomers, lastCustomers);
            const cashFlowGrowth = calcGrowthPercent(currentCashFlow, lastCashFlow);

            // 6. Alerts
            const alertsRes = await client.query(`
                SELECT 
                    (SELECT COUNT(*) FROM products WHERE business_id = $1 AND stock <= COALESCE(reorder_point, min_stock_level, min_stock, 5) AND is_active = true) as low_stock_count,
                    (SELECT COUNT(*) FROM invoices WHERE business_id = $1 AND status NOT IN ('paid', 'cancelled', 'draft', 'voided') AND (
                        LOWER(status) LIKE '%overdue%'
                        OR LOWER(status) LIKE '%unpaid%'
                        OR (due_date IS NOT NULL AND due_date < CURRENT_DATE)
                    )) as overdue_invoices
            `, [businessId]);

            return {
                success: true,
                data: {
                    revenue: parseFloat(revenueRes.rows[0].total_revenue),
                    orders: {
                        total: parseInt(ordersRes.rows[0].active_orders),
                        pending: parseInt(ordersRes.rows[0].pending_orders),
                        paid: parseInt(ordersRes.rows[0].paid_orders)
                    },
                    products: {
                        count: currentProducts,
                        growth: parseFloat(productsGrowth.toFixed(1))
                    },
                    customers: {
                        active: parseInt(currentCustomers),
                        growth: parseFloat(customerGrowth.toFixed(1))
                    },
                    cashFlow: {
                        current: currentCashFlow,
                        growth: parseFloat(cashFlowGrowth.toFixed(1))
                    },
                    growth: {
                        value: `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%`,
                        trend: growthPercent >= 0 ? 'up' : 'down',
                        percentage: Math.abs(growthPercent)
                    },
                    alerts: {
                        lowStock: parseInt(alertsRes.rows[0].low_stock_count),
                        overdueInvoices: parseInt(alertsRes.rows[0].overdue_invoices)
                    }
                }
            };

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Dashboard Metrics Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Expense Breakdown
 * Returns expenses grouped by account for the selected date range (inclusive).
 * @param {string} businessId
 * @param {{ from?: unknown; to?: unknown }} [filter]
 */
export async function getExpenseBreakdownAction(businessId, filter = {}) {
    try {
        await checkAuth(businessId, 'analytics.basic', null, 'ai_analytics');
        const client = await pool.connect();
        try {
            const { from, to } = resolveAnalyticsRange(filter);
            const result = await client.query(`
                SELECT 
                    a.name as category,
                    COALESCE(SUM(e.debit - e.credit), 0) as amount
                FROM gl_entries e
                JOIN gl_accounts a ON e.account_id = a.id
                WHERE a.business_id = $1 
                  AND LOWER(a.type) = 'expense'
                  AND e.transaction_date::date >= $2::date
                  AND e.transaction_date::date <= $3::date
                GROUP BY a.name
                ORDER BY amount DESC
                LIMIT 5
            `, [businessId, from, to]);

            // Calculate total for percentage
            const total = result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

            return {
                success: true,
                data: result.rows.map(row => ({
                    name: row.category,
                    value: parseFloat(row.amount),
                    percentage: total > 0 ? Math.round((parseFloat(row.amount) / total) * 100) : 0,
                    // Assign generic colors based on index or name helper on frontend
                    fill: '',
                }))
            };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Expense Breakdown Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Single server round-trip: sales trend, top products, category mix, KPIs, expense breakdown.
 * Honors the same `from` / `to` filter as the dashboard header.
 *
 * @param {string} businessId
 * @param {{ from?: unknown; to?: unknown }} [filter]
 */
export async function getAnalyticsBundleAction(businessId, filter = {}) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'analytics.basic', client, 'ai_analytics');
        try {
            const range = resolveAnalyticsRange(filter);

            const salesTrend = await fetchSalesTrendRows(client, businessId, range.trendAnchor);

            const topRes = await client.query(TOP_MOVING_PRODUCTS_SQL, [businessId, 5, range.from, range.to]);

            const topProducts = topRes.rows.map(mapTopProductRow);

            const catRes = await client.query(
                `
                SELECT 
                    COALESCE(category, 'Uncategorized') as name,
                    COUNT(*) as count,
                    COALESCE(SUM(stock * price), 0) as value
                FROM products
                WHERE business_id = $1
                GROUP BY category
                ORDER BY value DESC
                LIMIT 6
            `,
                [businessId]
            );

            const categoryData = catRes.rows.map((row) => ({
                name: row.name,
                value: parseInt(row.count, 10),
                assetValue: parseFloat(row.value),
            }));

            const inventoryRes = await client.query(
                `SELECT COALESCE(SUM(stock * price), 0) as total_value FROM products WHERE business_id = $1`,
                [businessId]
            );

            const productCountRes = await client.query(
                `SELECT COUNT(*)::int AS c FROM products WHERE business_id = $1 AND is_active = true`,
                [businessId]
            );
            const productCount = parseInt(productCountRes.rows[0]?.c ?? 0, 10) || 0;

            const { current, last, growthPercent } = await fetchRevenueGrowthTotals(
                client,
                businessId,
                range.from,
                range.to
            );

            const retentionRes = await client.query(
                `
                WITH customer_counts AS (
                    SELECT customer_id, COUNT(*) as inv_count
                    FROM invoices
                    WHERE business_id = $1 AND customer_id IS NOT NULL
                    GROUP BY customer_id
                )
                SELECT 
                    COUNT(*) FILTER (WHERE inv_count > 1) as repeat_customers,
                    COUNT(*) as total_active_customers
                FROM customer_counts
            `,
                [businessId]
            );

            const repeat = parseInt(retentionRes.rows[0]?.repeat_customers || 0, 10);
            const total = parseInt(retentionRes.rows[0]?.total_active_customers || 0, 10);
            const retentionRate = total > 0 ? (repeat / total) * 100 : 0;

            const expRes = await client.query(
                `
                SELECT 
                    a.name as category,
                    COALESCE(SUM(e.debit - e.credit), 0) as amount
                FROM gl_entries e
                JOIN gl_accounts a ON e.account_id = a.id
                WHERE a.business_id = $1 
                  AND LOWER(a.type) = 'expense'
                  AND e.transaction_date::date >= $2::date
                  AND e.transaction_date::date <= $3::date
                GROUP BY a.name
                ORDER BY amount DESC
                LIMIT 5
            `,
                [businessId, range.from, range.to]
            );

            const expTotal = expRes.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
            const expenseBreakdown = expRes.rows.map((row) => ({
                name: row.category,
                value: parseFloat(row.amount),
                percentage: expTotal > 0 ? Math.round((parseFloat(row.amount) / expTotal) * 100) : 0,
                fill: '',
            }));

            return {
                success: true,
                data: {
                    range,
                    salesTrend,
                    topProducts,
                    categoryData,
                    productCount,
                    expenseBreakdown,
                    kpi: {
                        inventoryAsset: parseFloat(inventoryRes.rows[0].total_value),
                        growth: {
                            value: `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%`,
                            trend: growthPercent >= 0 ? 'up' : 'down',
                        },
                        growthDetail: {
                            periodRevenue: current,
                            priorPeriodRevenue: last,
                            rangeFrom: range.from,
                            rangeTo: range.to,
                        },
                        retention: `${retentionRate.toFixed(0)}%`,
                        retentionDetail: {
                            repeatCustomers: repeat,
                            invoicedCustomers: total,
                            rate: retentionRate,
                        },
                    },
                },
            };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Analytics bundle Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get AI-driven Promotion Recommendations
 * Analyzes inventory vs sales velocity to suggest clearance or upsell strategies.
 */
export async function getPromotionRecommendationsAction(businessId) {
    try {
        await checkAuth(businessId, 'analytics.basic', null, 'ai_analytics');
        const client = await pool.connect();
        try {
            // Find slow moving high-stock items
            const result = await client.query(`
                SELECT 
                    p.id, p.name, p.stock, p.price,
                    COALESCE(SUM(ii.quantity), 0) as last_month_sales
                FROM products p
                LEFT JOIN invoice_items ii ON p.id = ii.product_id
                LEFT JOIN invoices i ON ii.invoice_id = i.id 
                    AND i.date >= (CURRENT_DATE - INTERVAL '30 days')
                    AND i.status != 'cancelled'
                WHERE p.business_id = $1 AND p.is_active = true
                GROUP BY p.id, p.name, p.stock, p.price
                HAVING p.stock > COALESCE(SUM(ii.quantity), 0) * 3  -- More than 3 months of stock
                   OR (p.stock > 0 AND COALESCE(SUM(ii.quantity), 0) = 0) -- Stagnant
                ORDER BY p.stock * p.price DESC
                LIMIT 3
            `, [businessId]);

            const recommendations = result.rows.map(row => ({
                strategy: row.last_month_sales === 0 ? 'Clearance' : 'Volume Booster',
                reason: row.last_month_sales === 0 ? 'Stagnant Stock (>60 days)' : 'High Capital Lock-up',
                suggested_discount: row.last_month_sales === 0 ? '25%' : '15%',
                product_ids: [row.id],
                potential_revenue: parseFloat(row.stock * row.price * 0.75)
            }));

            // Add a mock BOGO suggestion if data is thin
            if (recommendations.length < 2) {
                recommendations.push({
                    strategy: 'BOGO',
                    reason: 'New Customer Acquisition',
                    suggested_discount: 'Buy 1 Get 1',
                    product_ids: [],
                    potential_revenue: 0
                });
            }

            return { success: true, data: { recommendations } };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Promotion Recs Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Domain-Specific Industry Intelligence
 * Combines business data with vertical-specific domain knowledge to provide actionable insights.
 */
export async function getDomainIndustryInsightsAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'analytics.basic', client, 'ai_analytics');

        const marketCtx = await loadBusinessMarketContext(client, businessId);
        if (!marketCtx) throw new Error('Business not found');
        const { category, domainKnowledge } = marketCtx;
        const domainConfig = getDomainConfig(category);
        const intelligence = domainKnowledge?.intelligence || {};
        const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
        const isPeakSeason = intelligence.peakMonths?.includes(currentMonth);
        
        // 4. Generate recommendation based on expertise profile
        let insight = `Your business operates in the ${domainConfig?.name || category} sector. `;
        let priority = 'low';
        let suggestedAction = 'Monitor sales trends.';

        if (isPeakSeason) {
            priority = 'high';
            insight += `We have entered a PEAK SEASON for your industry (${currentMonth}). `;
            suggestedAction = 'Increase stock levels of high-moving categories and consider surge-pricing or volume incentives.';
        } else if (category === 'pharmacy') {
            insight += "Maintain 'FEFO' (First-Expiry-First-Out) strictly as pharmaceutical margins are highly sensitive to expiry losses.";
            suggestedAction = "Check 'Near Expiry' report and start 15% clearance on items expiring within 60 days.";
        } else if (category === 'dental-clinic') {
            insight += 'Sterile consumables and implant components are margin-sensitive; track batch/expiry on clinical stock separately from retail.';
            suggestedAction = "Run expiry alerts on bonding agents and anesthetics; reconcile chair-time revenue vs consumable cost weekly.";
        } else if (category === 'veterinary-clinic') {
            insight += 'Vaccination drives repeat visits; cold-chain medicines need FEFO and minimum shelf-life rules on receipt.';
            suggestedAction = 'Bundle deworming + vaccination reminders in CRM; flag vaccines within 90 days of expiry for promo or returns.';
        } else if (category === 'salon-spa') {
            insight += 'Retail (color, care) plus service bundles drive margin; peak around weddings, Eid, and year-end parties.';
            suggestedAction = 'Track retail sell-through per stylist; run package promotions on slow-moving professional lines before season peaks.';
        } else if (category === 'school-education') {
            insight += "Focus on fee recovery cycles. Defaulter rates typically rise mid-session.";
            suggestedAction = "Automate SMS reminders for outstanding fee challans before the 10th of the month.";
        } else if (category === 'textile-mill' || category === 'garments' || category === 'boutique-fashion' || category === 'textile-wholesale') {
            // Enhanced fashion seasonality insights
            const fashionInsights = getFashionSeasonalInsights(category);
            
            if (fashionInsights.currentPeriod) {
                priority = 'high';
                insight += `🔥 Currently in ${fashionInsights.currentPeriod.name}. `;
                insight += fashionInsights.currentPeriod.insight + ' ';
                suggestedAction = fashionInsights.recommendations[0] || suggestedAction;
            } else if (fashionInsights.nextPeriod && fashionInsights.weeksUntilNext <= 8) {
                priority = 'medium';
                insight += `📅 ${fashionInsights.nextPeriod.name} approaching in ${fashionInsights.weeksUntilNext} weeks. `;
                insight += fashionInsights.nextPeriod.insight + ' ';
                suggestedAction = category === 'textile-mill'
                    ? "Evaluate Raw Material (Yarn/Fabric) lock-in prices before the demand surge. Increase Lawn/Chiffon production 8 weeks before Eid."
                    : "Stock up on seasonal fabrics (Lawn for Summer Eid, Khaddar for Winter) 6-8 weeks early. Launch pre-orders for bridal collections by October.";
            } else {
                insight += "Fashion seasonality is shifting. In Pakistan, the Winter/Wedding season prep should begin 2 months in advance. Eid collections (April-May, June-July) drive 40-50% of annual revenue for clothing retailers.";
                suggestedAction = category === 'textile-mill' 
                    ? "Evaluate Raw Material (Yarn/Fabric) lock-in prices before the demand surge. Plan production capacity for upcoming peaks."
                    : "Review historical sales patterns for seasonal peaks. Maintain relationships with multiple fabric suppliers for flexibility.";
            }
        } else if (category === 'tyre-shop') {
            insight += 'Tyre demand spikes before monsoon and winter travel; oldest DOT batches should clear first to avoid warranty disputes.';
            suggestedAction = 'Run a DOT-age report and promote slow-moving sizes with fitment + alignment bundles.';
        } else if (category === 'industrial-parts') {
            insight += 'A-class critical spares drive uptime; long supplier lead times mean safety stock on motors, seals, and belts pays off.';
            suggestedAction = 'Segment SKUs by criticality and tie reorder points to longest vendor lead time + 2 weeks buffer.';
        } else if (category === 'steel-industry' || category === 'steel-iron') {
            insight += 'Steel is weight- and grade-sensitive; construction cycles and LC/cash terms swing working capital.';
            suggestedAction = 'Reconcile weighbridge slips to sales MT weekly; watch spread vs import parity on coils and pipes.';
        } else if (intelligence.seasonality === 'high') {
            insight += "High seasonality detected. Plan your cash flow for upcoming procurement cycles.";
            suggestedAction = "Review last 3 years of data for this month to optimize working capital.";
        } else {
            insight += "Market demand is stable. Focus on customer loyalty and operational efficiency.";
            suggestedAction = "Review 'Loyalty Point' redemption rates to increase repeat footfall.";
        }

        return {
            success: true,
            data: {
                current_status: isPeakSeason ? 'Peak Expansion' : 'Stable Ops',
                priority,
                insight,
                suggested_action: suggestedAction,
                sector_metrics: {
                    demand_volatility: intelligence.demandVolatility || 0.5,
                    perishability: intelligence.perishability || 'low',
                    lead_time_days: intelligence.leadTime || 7
                }
            }
        };
    } catch (error) {
        console.error('Domain Insights Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

