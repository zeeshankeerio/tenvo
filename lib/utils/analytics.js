/**
 * Centralized Analytics Utility
 * Handles transactional aggregation and intelligence metrics
 */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const EXCLUDED_INVOICE_STATUSES = new Set(['draft', 'voided', 'cancelled']);

/** @param {Record<string, unknown>} inv */
export function isCountableInvoice(inv) {
    if (inv?.is_deleted === true) return false;
    const status = String(inv?.status || '').toLowerCase();
    return !EXCLUDED_INVOICE_STATUSES.has(status);
}

/**
 * Normalize line revenue from invoice / POS / storefront item shapes.
 * @param {Record<string, unknown>} item
 */
export function normalizeLineItemRevenue(item) {
    if (!item || typeof item !== 'object') return 0;

    const direct = Number(item.total_amount ?? item.total_price ?? item.total ?? item.amount ?? item.line_total);
    if (Number.isFinite(direct) && direct > 0) return direct;

    const qty = Number(item.quantity) || 0;
    const unit = Number(item.unit_price ?? item.rate ?? item.price) || 0;
    const tax = Number(item.tax_amount ?? item.tax) || 0;
    const discount = Number(item.discount_amount ?? item.discount) || 0;
    const computed = qty * unit + tax - discount;
    return Number.isFinite(computed) && computed > 0 ? computed : 0;
}

/**
 * Aggregates monthly sales and revenue for a given timeframe
 * @param {Array} invoices - List of invoices with items
 * @param {number} monthsToShow - Number of months to return (ending at current)
 * @returns {Array} - Array of { date, sales, revenue, expenses }
 */
export function aggregateMonthlyData(invoices = [], monthsToShow = 6) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const result = [];

    // Create a map for fast lookup
    const monthlyData = {};

    invoices.forEach(inv => {
        if (!isCountableInvoice(inv)) return;
        const date = new Date(inv.date);
        const invMonth = date.getMonth();
        const invYear = date.getFullYear();

        // We only care about data within a reasonable range for monthly charts
        const key = `${invYear}-${invMonth}`;
        if (!monthlyData[key]) monthlyData[key] = { sales: 0, revenue: 0, expenses: 0 };

        monthlyData[key].sales += 1;
        monthlyData[key].revenue += Number(inv.grand_total) || 0;

        // Expense heuristic: 60% of revenue if costs aren't explicitly tracked
        // but we should try to sum item costs if available
        if (inv.items && Array.isArray(inv.items)) {
            inv.items.forEach(item => {
                monthlyData[key].expenses += (Number(item.quantity) || 0) * (Number(item.cost_price || item.purchase_price) || 0);
            });
        } else {
            monthlyData[key].expenses += (Number(inv.grand_total) || 0) * 0.6;
        }
    });

    // Generate the sliding window of months
    for (let i = monthsToShow - 1; i >= 0; i--) {
        const targetDate = new Date(currentYear, currentMonth - i, 1);
        const mIdx = targetDate.getMonth();
        const yIdx = targetDate.getFullYear();
        const key = `${yIdx}-${mIdx}`;
        const label = MONTHS[mIdx];

        const invCount = monthlyData[key]?.sales || 0;
        result.push({
            date: label,
            /** Invoice count for the month (same as orderCount) */
            sales: invCount,
            orderCount: invCount,
            revenue: monthlyData[key]?.revenue || 0,
            expenses: monthlyData[key]?.expenses || 0,
            profit: (monthlyData[key]?.revenue || 0) - (monthlyData[key]?.expenses || 0)
        });
    }

    return result;
}

/**
 * Calculates top selling products by revenue or volume
 * @param {Array} invoices - All invoices with nested items
 * @param {Array} allProducts - Reference products list
 * @param {number} limit - Max items to return
 * @returns {Array} - Sorted array of products with metrics
 */
export function getTopCatalysts(invoices = [], allProducts = [], limit = 5) {
    const productStats = {};

    invoices.forEach(inv => {
        if (!isCountableInvoice(inv)) return;
        if (inv.items && Array.isArray(inv.items)) {
            inv.items.forEach(item => {
                const pid = item.product_id || item.id;
                if (!pid) return;

                if (!productStats[pid]) {
                    productStats[pid] = {
                        id: pid,
                        name: item.name || item.description || 'Unknown Product',
                        revenue: 0,
                        sales: 0,
                        category: item.category || ''
                    };
                }

                productStats[pid].revenue += normalizeLineItemRevenue(item);
                productStats[pid].sales += (Number(item.quantity) || 1);
            });
        }
    });

    // Merge with master product categories if missing
    Object.values(productStats).forEach(stat => {
        if (!stat.category) {
            const master = allProducts.find(p => p.id === stat.id);
            if (master) stat.category = master.category;
        }
    });

    return Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
}

/**
 * Calculates performance growth vs previous month
 * @param {Array} invoices 
 * @returns {Object} { value: string, trend: 'up' | 'down', percentage: number }
 */
export function calculateGrowth(invoices = []) {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentRevenue = invoices
        .filter(inv => new Date(inv.date) >= currentMonthStart)
        .reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);

    const lastMonthRevenue = invoices
        .filter(inv => {
            const date = new Date(inv.date);
            return date >= lastMonthStart && date <= lastMonthEnd;
        })
        .reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);

    if (lastMonthRevenue === 0) {
        return {
            value: currentRevenue > 0 ? '+100%' : '0%',
            trend: currentRevenue > 0 ? 'up' : 'neutral',
            percentage: currentRevenue > 0 ? 100 : 0
        };
    }

    const growth = ((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    return {
        value: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`,
        trend: growth >= 0 ? 'up' : 'down',
        percentage: Math.abs(growth)
    };
}
