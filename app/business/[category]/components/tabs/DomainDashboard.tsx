'use client';

import React, { useMemo, useCallback } from 'react';
import {
    TrendingUp, Users, ShoppingCart,
    CreditCard, Clock,
    Zap,
    Boxes, Warehouse, RotateCcw, BadgeDollarSign,
    Package, FileText, BarChart3, Plus, Banknote
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBusiness } from '@/lib/context/BusinessContext';
import { useAppMode } from '@/lib/context/BusyModeContext';
import { getDomainColors } from '@/lib/domainColors';
import { isCampaignRelevant } from '@/lib/config/domains';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { KPIMeter } from '../islands/portlets/KPIMeter.client';
import { DomainMetricCard } from '../islands/DomainMetricCard.client';
import { PeriodSnapshotCard } from '../islands/PeriodSnapshotCard.client';
import { QuickActionTiles } from '../islands/portlets/QuickActionTiles.client';
import { RemindersPortlet } from '../islands/portlets/RemindersPortlet.client';
import { RecentActivityFeed } from '../islands/portlets/RecentActivityFeed.client';
import { AnalyticsDashboard } from '../islands/AnalyticsDashboard.client';
import { MergedActionInsights } from '../islands/MergedActionInsights.client';
import NetsuiteDashboard from '../islands/NetsuiteDashboard.client';
import { DashboardMobileHub } from '@/components/dashboard/mobile/DashboardMobileHub';
import { EasyBusinessDashboard } from '@/components/dashboard/easy/EasyBusinessDashboard';
import { DomainOperationsPanel } from '@/components/dashboard/easy/DomainOperationsPanel';
import { useDomainOperationsSnapshot } from '@/lib/hooks/useDomainOperationsSnapshot';
import { FinanceHeroStrip } from '@/components/dashboard/advanced/FinanceHeroStrip.client';
import { resolveProductStock } from '@/lib/dashboard/easyDashboardHelpers';
import { buildFinanceHeroMetrics } from '@/lib/dashboard/buildFinanceHeroMetrics';
import { metricActionId } from '@/lib/dashboard/metricNavigation';
import { resolveSparklineSeries } from '@/lib/dashboard/sparklineSeries';
import { isPendingInvoice } from '@/lib/utils/analytics';
import type { KpiTheme } from '@/lib/dashboard/kpiThemes';

// ===============================================================
// TYPES & INTERFACES
// ===============================================================

interface DomainDashboardProps {
    businessId?: string;
    category: string;
    invoices: InvoiceLike[];
    products: ProductLike[];
    customers: CustomerLike[];
    dateRange: { from: Date; to: Date };
    currency?: string;
    onQuickAction?: (actionId: string) => void;
    onDateRangePresetChange?: (preset: 'today' | '7d' | '30d' | '90d' | 'mtd' | 'last_month' | 'ytd') => void;
    dashboardMetrics?: DashboardMetrics | null;
    chartData?: Array<Record<string, unknown>>;
    accountingSummary?: AccountingSummaryLike | null;
    expenseBreakdown?: ExpenseBreakdownItem[];
    expenses?: ExpenseLike[];
    advancedDashboardSnapshot?: AdvancedDashboardSnapshotLike | null;
    domainKnowledge?: DomainKnowledgeLike;
    isLoading?: boolean;
    user?: { email?: string; user_metadata?: { full_name?: string } } | null;
}

interface InvoiceItemLike {
    quantity?: number | string;
}

interface InvoiceLike {
    status?: string;
    date?: string | Date;
    due_date?: string | Date;
    customer_id?: string | number | null;
    customer_name?: string;
    grand_total?: number | string;
    amount?: number | string;
    items?: InvoiceItemLike[];
}

interface ProductLike {
    id?: string | number;
    stock?: number | string;
    min_stock?: number | string;
    minStock?: number | string;
    reorder_point?: number | string;
    cost_price?: number | string;
    purchase_price?: number | string;
    price?: number | string;
    max_stock?: number | string;
    max_stock_level?: number | string;
    stock_checked_at?: string | Date;
    updated_at?: string | Date;
    created_at?: string | Date;
}

interface CustomerLike {
    id?: string | number;
}

interface ExpenseLike {
    date?: string | Date;
    expense_date?: string | Date;
    created_at?: string | Date;
    amount?: number | string;
    total?: number | string;
    grand_total?: number | string;
}

interface ExpenseBreakdownItem {
    value?: number;
}

interface DashboardMetrics {
    revenue?: number;
    orders?: { total?: number; pending?: number; paid?: number };
    products?: number;
    customers?: { active?: number; growth?: number };
    cashFlow?: { current?: number; growth?: number };
    growth?: { trend?: 'up' | 'down'; percentage?: number; value?: string };
    alerts?: { lowStock?: number; overdueInvoices?: number };
    timeline?: Array<Record<string, unknown>>;
}

interface AccountingSummaryLike {
    inventoryValue?: number;
    accountsReceivable?: number;
    accountsPayable?: number;
    grossProfit?: number;
    margin?: number;
}

interface AdvancedDashboardSnapshotLike {
    finance?: {
        netProfit?: number;
        grossProfit?: number;
        netMargin?: number;
        receivables?: number;
        receivableCount?: number;
        payables?: number;
        netCashFlow?: number;
        periodRevenue?: number;
    };
}

interface DomainKnowledgeLike {
    multiLocationEnabled?: boolean;
    /** Used by `isCampaignRelevant` for non-catalog categories */
    retailMode?: boolean;
    serviceMode?: boolean;
    /** Optional AI / analytics intelligence blob for forecasting */
    intelligence?: Record<string, unknown>;
}

interface MetricCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    trend?: number;
    trendHint?: string;
    icon: React.ElementType;
    colorClass?: string;
    theme?: KpiTheme;
    className?: string;
    sparkline?: number[];
    invertTrendColor?: boolean;
    actionId?: string;
}

// ===============================================================
// MAIN COMPONENT
// ===============================================================

export function DomainDashboard({
    businessId,
    category,
    invoices,
    products,
    customers,
    dateRange,
    currency = 'PKR',
    onQuickAction,
    onDateRangePresetChange,
    dashboardMetrics,
    chartData = [],
    accountingSummary,
    expenseBreakdown = [],
    expenses = [],
    advancedDashboardSnapshot = null,
    domainKnowledge,
    isLoading = false,
    user
}: DomainDashboardProps) {
    const { business } = useBusiness() as {
        business?: { id?: string; name?: string; country?: string; city?: string } | null;
    };
    const { isEasyMode } = useAppMode();
    const activeBusinessId = businessId || business?.id;
    const advancedOpsSnapshot = useDomainOperationsSnapshot({
        businessId: activeBusinessId,
        category,
        dateRange,
        enabled: !isEasyMode && Boolean(activeBusinessId),
    });
    const colors = getDomainColors(category) as Record<string, unknown>;
    const campaignEnabled = isCampaignRelevant(category, domainKnowledge ?? null);
    const multiLocationEnabled = Boolean(domainKnowledge?.multiLocationEnabled);

    const formatCurrencyCompact = useCallback(
        (amount: number) => `${currency} ${Math.round(amount || 0).toLocaleString()}`,
        [currency]
    );
    const handleMetricNavigate = useCallback(
        (actionId: string) => {
            onQuickAction?.(actionId);
        },
        [onQuickAction]
    );
    const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

    const calcGrowth = (current: number, previous: number) => {
        if (previous > 0) return ((current - previous) / previous) * 100;
        if (current > 0) return 100;
        return 0;
    };

    const periodMetrics = useMemo(() => {
        const currentFrom = new Date(dateRange.from);
        const currentTo = new Date(dateRange.to);
        const duration = Math.max(1, currentTo.getTime() - currentFrom.getTime());
        const prevFrom = new Date(currentFrom.getTime() - duration);
        const prevTo = new Date(currentTo.getTime() - duration);

        const inRange = (rawDate: string | Date | undefined, from: Date, to: Date) => {
            const parsed = rawDate ? new Date(rawDate) : null;
            if (!parsed || Number.isNaN(parsed.getTime())) return false;
            return parsed >= from && parsed <= to;
        };

        const validInvoices = invoices.filter(inv => !['cancelled', 'draft'].includes(String(inv?.status || '').toLowerCase()));
        const paidInvoices = validInvoices.filter(inv => String(inv?.status || '').toLowerCase() === 'paid');

        const currentOrders = validInvoices.filter(inv => inRange(inv?.date, currentFrom, currentTo)).length;
        const previousOrders = validInvoices.filter(inv => inRange(inv?.date, prevFrom, prevTo)).length;

        const currentRevenue = paidInvoices
            .filter(inv => inRange(inv?.date, currentFrom, currentTo))
            .reduce((sum, inv) => sum + (Number(inv?.grand_total) || Number(inv?.amount) || 0), 0);
        const previousRevenue = paidInvoices
            .filter(inv => inRange(inv?.date, prevFrom, prevTo))
            .reduce((sum, inv) => sum + (Number(inv?.grand_total) || Number(inv?.amount) || 0), 0);

        const getExpenseDate = (exp: ExpenseLike) => exp?.date || exp?.expense_date || exp?.created_at;
        const getExpenseAmount = (exp: ExpenseLike) => Number(exp?.amount) || Number(exp?.total) || Number(exp?.grand_total) || 0;

        const currentExpenses = expenses
            .filter(exp => inRange(getExpenseDate(exp), currentFrom, currentTo))
            .reduce((sum, exp) => sum + getExpenseAmount(exp), 0);
        const previousExpenses = expenses
            .filter(exp => inRange(getExpenseDate(exp), prevFrom, prevTo))
            .reduce((sum, exp) => sum + getExpenseAmount(exp), 0);

        const currentCustomers = new Set(
            validInvoices
                .filter(inv => inRange(inv?.date, currentFrom, currentTo))
                .map(inv => inv?.customer_id || inv?.customer_name)
                .filter(Boolean)
        ).size;
        const previousCustomers = new Set(
            validInvoices
                .filter(inv => inRange(inv?.date, prevFrom, prevTo))
                .map(inv => inv?.customer_id || inv?.customer_name)
                .filter(Boolean)
        ).size;

        const soldUnits = validInvoices
            .filter(inv => inRange(inv?.date, currentFrom, currentTo))
            .reduce((sum, inv) => sum + (inv?.items || []).reduce((itemSum: number, item: InvoiceItemLike) => itemSum + (Number(item?.quantity) || 0), 0), 0);

        const returnInvoices = validInvoices
            .filter(inv => inRange(inv?.date, currentFrom, currentTo))
            .filter(inv => {
                const status = String(inv?.status || '').toLowerCase();
                return status.includes('return') || status.includes('refund') || status.includes('credit');
            }).length;

        const previousReturnInvoices = validInvoices
            .filter(inv => inRange(inv?.date, prevFrom, prevTo))
            .filter(inv => {
                const status = String(inv?.status || '').toLowerCase();
                return status.includes('return') || status.includes('refund') || status.includes('credit');
            }).length;

        const pendingReturns = validInvoices
            .filter(inv => inRange(inv?.date, currentFrom, currentTo))
            .filter(inv => String(inv?.status || '').toLowerCase().includes('return-pending')).length;

        return {
            currentOrders,
            previousOrders,
            currentRevenue,
            previousRevenue,
            currentExpenses,
            previousExpenses,
            currentCustomers,
            previousCustomers,
            soldUnits,
            returnInvoices,
            previousReturnInvoices,
            pendingReturns
        };
    }, [dateRange, invoices, expenses]);

    // Track expense context
    const totalExpenses = useMemo(() =>
        expenseBreakdown.reduce((sum, exp) => sum + (exp.value || 0), 0)
        , [expenseBreakdown]);

    const revenueTrendSigned = calcGrowth(periodMetrics.currentRevenue, periodMetrics.previousRevenue);

    const ordersTrend = calcGrowth(periodMetrics.currentOrders, periodMetrics.previousOrders);
    const expenseTrend = calcGrowth(periodMetrics.currentExpenses, periodMetrics.previousExpenses);
    const customerTrend = calcGrowth(periodMetrics.currentCustomers, periodMetrics.previousCustomers);

    /** Date-range-aligned cash flow (shared by Easy + Advanced). Prefer GL snapshot, else operational period net. */
    const periodCashFlow = useMemo(() => {
        const snapshotFlow = Number(advancedDashboardSnapshot?.finance?.netCashFlow);
        if (Number.isFinite(snapshotFlow) && advancedDashboardSnapshot?.finance) {
            return snapshotFlow;
        }
        return periodMetrics.currentRevenue - periodMetrics.currentExpenses;
    }, [advancedDashboardSnapshot, periodMetrics.currentRevenue, periodMetrics.currentExpenses]);

    const periodCashFlowGrowth = useMemo(
        () =>
            calcGrowth(
                periodCashFlow,
                periodMetrics.previousRevenue - periodMetrics.previousExpenses
            ),
        [periodCashFlow, periodMetrics.previousRevenue, periodMetrics.previousExpenses]
    );

    const lowStockFallback = useMemo(() => {
        return products.filter((product: ProductLike) => {
            const stock = resolveProductStock(product);
            const safetyStock =
                Number(product?.reorder_point) ||
                Number(product?.min_stock) ||
                Number(product?.minStock) ||
                10;
            return stock <= safetyStock;
        }).length;
    }, [products]);

    const overdueInvoicesFallback = useMemo(() => {
        const now = new Date();
        return invoices.filter((invoice: InvoiceLike) => {
            const status = String(invoice?.status || '').toLowerCase();
            if (status.includes('overdue')) return true;
            if (['paid', 'cancelled', 'draft', 'voided'].includes(status)) return false;
            const dueRaw = invoice?.due_date;
            if (dueRaw) {
                const due = new Date(dueRaw);
                if (!Number.isNaN(due.getTime()) && due < now) return true;
            }
            return status.includes('unpaid');
        }).length;
    }, [invoices]);

    const pendingOrdersFallback = useMemo(() => {
        return invoices.filter((invoice: InvoiceLike) => isPendingInvoice(invoice as Record<string, unknown>)).length;
    }, [invoices]);

    const remindersData = useMemo(() => ({
        lowStock: Math.max(lowStockFallback, dashboardMetrics?.alerts?.lowStock ?? 0),
        overdueInvoices: Math.max(overdueInvoicesFallback, dashboardMetrics?.alerts?.overdueInvoices ?? 0),
        pendingOrders: pendingOrdersFallback,
    }), [dashboardMetrics, lowStockFallback, overdueInvoicesFallback, pendingOrdersFallback]);

    const domainEfficiency = useMemo(() => {
        const productBase = Math.max(products.length, 1);
        const orderBase = Math.max(dashboardMetrics?.orders?.total || periodMetrics.currentOrders || 1, 1);

        const inventoryScore = Math.max(0, 100 - ((remindersData.lowStock || 0) / productBase) * 100);
        const pendingScore = Math.max(0, 100 - ((remindersData.pendingOrders || 0) / orderBase) * 100);
        const overdueScore = Math.max(0, 100 - ((remindersData.overdueInvoices || 0) / orderBase) * 120);
        const growthBoost = Math.max(-10, Math.min(10, revenueTrendSigned / 2));

        const score = Math.round((inventoryScore * 0.45) + (pendingScore * 0.3) + (overdueScore * 0.25) + growthBoost);
        return Math.max(0, Math.min(100, score));
    }, [products.length, dashboardMetrics, periodMetrics.currentOrders, remindersData, revenueTrendSigned]);

    const inventoryValue = useMemo(() => {
        const summaryInventory = Number(accountingSummary?.inventoryValue);
        const catalogValue = products.reduce((sum: number, product: ProductLike) => {
            const stock = resolveProductStock(product);
            const unitCost = Number(product?.cost_price) || Number(product?.purchase_price) || Number(product?.price) || 0;
            return sum + Math.max(0, stock) * Math.max(0, unitCost);
        }, 0);
        // Prefer positive GL/summary figures only; negative or zero summary falls back to catalog at cost (never show negative asset for this tile).
        if (Number.isFinite(summaryInventory) && summaryInventory > 0) {
            return summaryInventory;
        }
        return Math.max(0, catalogValue);
    }, [products, accountingSummary?.inventoryValue]);

    const inStockUnits = useMemo(() => {
        return products.reduce((sum: number, product: ProductLike) => sum + resolveProductStock(product), 0);
    }, [products]);

    const avgOrderValue = useMemo(() => {
        const orders = Math.max(periodMetrics.currentOrders, 1);
        return periodMetrics.currentRevenue / orders;
    }, [periodMetrics.currentOrders, periodMetrics.currentRevenue]);

    const returnRate = useMemo(() => {
        const orders = Math.max(periodMetrics.currentOrders, 1);
        return (periodMetrics.returnInvoices / orders) * 100;
    }, [periodMetrics.currentOrders, periodMetrics.returnInvoices]);

    const coverageDays = useMemo(() => {
        const msInDay = 1000 * 60 * 60 * 24;
        const daysInRange = Math.max(1, Math.round((new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / msInDay));
        const dailyVelocity = periodMetrics.soldUnits / daysInRange;
        if (dailyVelocity <= 0) return 365;
        return Math.round(inStockUnits / dailyVelocity);
    }, [dateRange.from, dateRange.to, periodMetrics.soldUnits, inStockUnits]);

    const stockCheckRecency = useMemo(() => {
        const referenceTime = new Date(dateRange.to).getTime();
        const latestStockTouch = products.reduce((latest: number, product: ProductLike) => {
            const stockDate = product?.stock_checked_at || product?.updated_at || product?.created_at;
            if (!stockDate) return latest;
            const parsed = new Date(stockDate).getTime();
            if (Number.isNaN(parsed)) return latest;
            return Math.max(latest, parsed);
        }, 0);

        if (!latestStockTouch) return null;
        const validReference = Number.isNaN(referenceTime) ? latestStockTouch : referenceTime;
        const days = Math.floor((validReference - latestStockTouch) / (1000 * 60 * 60 * 24));
        return Math.max(0, days);
    }, [products, dateRange.to]);

    const outstandingAmount = useMemo(() => {
        return invoices.reduce((sum: number, invoice: InvoiceLike) => {
            const status = String(invoice?.status || '').toLowerCase();
            if (['paid', 'cancelled', 'draft'].includes(status)) return sum;
            return sum + (Number(invoice?.grand_total) || Number(invoice?.amount) || 0);
        }, 0);
    }, [invoices]);

    /** Open / unpaid sales documents, Easy Mode header uses this instead of duplicating low-stock count. */
    const openInvoicesCount = useMemo(
        () =>
            invoices.filter((inv: InvoiceLike) => {
                const status = String(inv?.status || '').toLowerCase();
                return !['paid', 'cancelled', 'draft', 'voided'].includes(status);
            }).length,
        [invoices]
    );

    const paidOrderRate = useMemo(() => {
        const currentFrom = new Date(dateRange.from);
        const currentTo = new Date(dateRange.to);

        const eligibleInvoices = invoices.filter((invoice: InvoiceLike) => {
            const status = String(invoice?.status || '').toLowerCase();
            if (['draft', 'cancelled'].includes(status)) return false;
            const parsed = invoice?.date ? new Date(invoice.date) : null;
            if (!parsed || Number.isNaN(parsed.getTime())) return false;
            return parsed >= currentFrom && parsed <= currentTo;
        });

        if (eligibleInvoices.length === 0) return null;

        const paidInvoices = eligibleInvoices.filter(
            (invoice: InvoiceLike) => String(invoice?.status || '').toLowerCase() === 'paid'
        ).length;
        return clamp((paidInvoices / eligibleInvoices.length) * 100, 0, 100);
    }, [invoices, dateRange.from, dateRange.to]);

    const warehouseUtilization = useMemo(() => {
        const capacityFromConfiguredProducts = products.reduce((sum: number, product: ProductLike) => {
            const maxStock = Number(product?.max_stock) || Number(product?.max_stock_level) || 0;
            return sum + Math.max(maxStock, 10);
        }, 0);

        if (capacityFromConfiguredProducts <= 0) return null;
        return clamp((inStockUnits / capacityFromConfiguredProducts) * 100, 0, 100);
    }, [products, inStockUnits]);

    const paidOrderRateValue = paidOrderRate ?? 0;
    const paidOrderRateDisplay = `${paidOrderRateValue.toFixed(1)}%`;
    const paidOrderRateDetail = paidOrderRate === null ? 'Awaiting paid order history' : 'From paid vs total orders';

    const warehouseUtilizationValue = warehouseUtilization ?? 0;
    const warehouseUtilizationDisplay = `${warehouseUtilizationValue.toFixed(1)}%`;
    const warehouseUtilizationDetail = warehouseUtilization === null
        ? 'Using baseline capacity model'
        : 'Configured capacity usage';

    const stockCheckRecencyValue = stockCheckRecency ?? 0;
    const stockCheckRecencyDisplay = `${stockCheckRecencyValue}d`;
    const stockCheckRecencyDetail = stockCheckRecency === null ? 'No stock touch timestamps yet' : 'Since last stock touch';

    /** Period snapshot: operational + financial metrics (excludes hero KPI duplicates). */
    const periodSnapshotMetrics = useMemo(
        () => [
            {
                label: 'Open Invoices',
                value: openInvoicesCount,
                tone: openInvoicesCount > 0 ? 'text-amber-600' : 'text-slate-800',
                icon: FileText,
                actionId: metricActionId('open_invoices'),
            },
            {
                label: 'Pending Orders',
                value: remindersData.pendingOrders || 0,
                tone: remindersData.pendingOrders > 0 ? 'text-amber-600' : 'text-slate-800',
                icon: ShoppingCart,
                actionId: metricActionId('pending_orders'),
            },
            {
                label: 'Units Sold',
                value: periodMetrics.soldUnits.toLocaleString(),
                tone: periodMetrics.soldUnits > 0 ? 'text-slate-900' : 'text-slate-400',
                icon: BarChart3,
                actionId: metricActionId('units_sold'),
            },
            {
                label: 'Paid Order Ratio',
                value: paidOrderRateDisplay,
                tone: paidOrderRate !== null && paidOrderRate < 60 ? 'text-rose-600' : 'text-slate-800',
                icon: CreditCard,
                actionId: metricActionId('paid_order_ratio'),
            },
            {
                label: 'Coverage Days',
                value: coverageDays > 365 ? '365+' : coverageDays,
                tone: 'text-slate-900',
                icon: Warehouse,
                actionId: metricActionId('coverage_days'),
            },
            {
                label: 'In-Stock Units',
                value: inStockUnits.toLocaleString(),
                tone: 'text-slate-900',
                icon: Boxes,
                actionId: metricActionId('in_stock_units'),
            },
            {
                label: 'Period Expenses',
                value: formatCurrencyCompact(
                    periodMetrics.currentExpenses > 0 ? periodMetrics.currentExpenses : totalExpenses
                ),
                tone: 'text-slate-900',
                icon: CreditCard,
                actionId: metricActionId('period_expenses'),
            },
            {
                label: 'Active Customers',
                value: periodMetrics.currentCustomers.toLocaleString(),
                tone: 'text-slate-900',
                icon: Users,
                actionId: metricActionId('active_customers'),
            },
            {
                label: 'Avg Order Value',
                value: formatCurrencyCompact(avgOrderValue),
                tone: 'text-slate-900',
                icon: TrendingUp,
                actionId: metricActionId('avg_order_value'),
            },
            {
                label: 'Return Rate',
                value: `${returnRate.toFixed(1)}%`,
                tone: returnRate > 5 ? 'text-rose-600' : 'text-slate-800',
                icon: RotateCcw,
                actionId: metricActionId('return_rate'),
            },
            {
                label: 'Outstanding A/R',
                value: formatCurrencyCompact(outstandingAmount),
                tone: outstandingAmount > 0 ? 'text-amber-700' : 'text-slate-800',
                icon: BadgeDollarSign,
                actionId: metricActionId('outstanding_ar'),
            },
            {
                label: 'Stock Check',
                value: stockCheckRecencyDisplay,
                tone: stockCheckRecencyValue > 30 ? 'text-amber-600' : 'text-slate-800',
                icon: Clock,
                actionId: metricActionId('stock_check'),
            },
        ],
        [
            openInvoicesCount,
            remindersData.pendingOrders,
            periodMetrics.soldUnits,
            periodMetrics.currentExpenses,
            periodMetrics.currentCustomers,
            paidOrderRateDisplay,
            paidOrderRate,
            coverageDays,
            inStockUnits,
            totalExpenses,
            formatCurrencyCompact,
            avgOrderValue,
            returnRate,
            outstandingAmount,
            stockCheckRecencyDisplay,
            stockCheckRecencyValue,
        ]
    );

    /** Compact header strip: cash + throughput (low stock stays in reminders only). */
    const dashboardHeaderHighlights = useMemo(
        () => [
            {
                label: 'Pending Returns',
                value: periodMetrics.pendingReturns,
                tone: periodMetrics.pendingReturns > 0 ? 'text-amber-600' : 'text-slate-800',
                icon: RotateCcw,
                actionId: metricActionId('pending_returns'),
            },
            {
                label: 'Warehouse Util.',
                value: warehouseUtilizationDisplay,
                tone: warehouseUtilizationValue >= 90 ? 'text-amber-600' : 'text-slate-800',
                icon: Warehouse,
                actionId: metricActionId('warehouse_util'),
            },
            {
                label: 'Cash Flow',
                value: formatCurrencyCompact(periodCashFlow),
                tone: periodCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700',
                icon: BadgeDollarSign,
                actionId: metricActionId('cash_flow'),
            },
            {
                label: 'Efficiency',
                value: `${domainEfficiency}%`,
                tone: domainEfficiency >= 85 ? 'text-emerald-600' : 'text-amber-600',
                icon: TrendingUp,
                actionId: metricActionId('efficiency'),
            },
        ],
        [
            periodMetrics.pendingReturns,
            warehouseUtilizationDisplay,
            warehouseUtilizationValue,
            formatCurrencyCompact,
            periodCashFlow,
            domainEfficiency,
        ]
    );

    const hasCoreData = (products.length + invoices.length + customers.length) > 0;

    const periodLabel = useMemo(() => {
        const msInDay = 1000 * 60 * 60 * 24;
        const days = Math.max(1, Math.round((new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / msInDay));
        if (days <= 7) return 'Last 7 Days';
        if (days <= 31) return 'This Month';
        if (days <= 92) return 'Last Quarter';
        return 'Custom Period';
    }, [dateRange.from, dateRange.to]);

    const activePreset = useMemo<'today' | '7d' | '30d' | '90d' | 'mtd' | 'last_month' | 'ytd' | 'custom'>(() => {
        const from = new Date(dateRange.from);
        const to = new Date(dateRange.to);
        const diffMs = Math.max(1, to.getTime() - from.getTime());
        const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

        const sameDay =
            from.getFullYear() === to.getFullYear() &&
            from.getMonth() === to.getMonth() &&
            from.getDate() === to.getDate();
        if (sameDay) return 'today';

        const isMtd =
            from.getFullYear() === to.getFullYear() &&
            from.getMonth() === to.getMonth() &&
            from.getDate() === 1;
        if (isMtd) return 'mtd';

        const prevMonthDate = new Date(to);
        prevMonthDate.setMonth(to.getMonth() - 1, 1);
        const prevMonthEnd = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0);
        const isLastMonth =
            from.getFullYear() === prevMonthDate.getFullYear() &&
            from.getMonth() === prevMonthDate.getMonth() &&
            from.getDate() === 1 &&
            to.getFullYear() === prevMonthEnd.getFullYear() &&
            to.getMonth() === prevMonthEnd.getMonth() &&
            to.getDate() === prevMonthEnd.getDate();
        if (isLastMonth) return 'last_month';

        const isYtd = from.getFullYear() === to.getFullYear()
            && from.getMonth() === 0
            && from.getDate() === 1;
        if (isYtd) return 'ytd';
        if (days >= 6 && days <= 8) return '7d';
        if (days >= 29 && days <= 31) return '30d';
        if (days >= 89 && days <= 92) return '90d';
        return 'custom';
    }, [dateRange.from, dateRange.to]);

    const activePresetDisplayLabel = useMemo(() => {
        const labels: Record<
            'today' | '7d' | '30d' | '90d' | 'mtd' | 'last_month' | 'ytd' | 'custom',
            string
        > = {
            today: 'Today',
            '7d': 'Last 7 days',
            '30d': 'Last 30 days',
            '90d': 'Last 90 days',
            mtd: 'Month to date',
            last_month: 'Last month',
            ytd: 'Year to date',
            custom: 'Custom range',
        };
        return labels[activePreset];
    }, [activePreset]);

    const topStripKpis = useMemo((): MetricCardProps[] => {
        const orderSeries = resolveSparklineSeries(chartData, invoices, dateRange, 'orders');
        const revenueSeries = resolveSparklineSeries(chartData, invoices, dateRange, 'revenue');

        return [
            {
                label: 'Orders In Period',
                value: periodMetrics.currentOrders,
                subValue: periodLabel,
                trend: Number(ordersTrend.toFixed(1)),
                icon: ShoppingCart,
                theme: 'cyan' as const,
                sparkline: orderSeries,
                actionId: metricActionId('orders'),
            },
            {
                label: 'Revenue In Period',
                value: formatCurrencyCompact(periodMetrics.currentRevenue),
                subValue: periodLabel,
                trend: Number(revenueTrendSigned.toFixed(1)),
                icon: BadgeDollarSign,
                theme: 'emerald' as const,
                sparkline: revenueSeries,
                actionId: metricActionId('revenue'),
            },
            {
                label: 'Inventory Value',
                value: formatCurrencyCompact(inventoryValue),
                subValue: 'Stock at cost / GL',
                trend: undefined,
                icon: Boxes,
                theme: 'violet' as const,
                actionId: metricActionId('inventory_value'),
            },
            {
                label: 'Overdue',
                value: remindersData.overdueInvoices,
                subValue: remindersData.overdueInvoices > 0 ? 'Needs collections follow-up' : 'All clear',
                trend: undefined,
                trendHint: remindersData.overdueInvoices > 0
                    ? `${remindersData.overdueInvoices} invoice${remindersData.overdueInvoices > 1 ? 's' : ''} past due`
                    : undefined,
                icon: Clock,
                theme: 'rose' as const,
                invertTrendColor: true,
                actionId: metricActionId('overdue'),
            },
        ];
    }, [
        chartData,
        invoices,
        dateRange,
        periodMetrics.currentOrders,
        periodMetrics.currentRevenue,
        ordersTrend,
        revenueTrendSigned,
        inventoryValue,
        remindersData.overdueInvoices,
        formatCurrencyCompact,
        periodLabel,
    ]);

    const financeHeroMetrics = useMemo(
        () =>
            buildFinanceHeroMetrics(
                advancedDashboardSnapshot,
                accountingSummary,
                formatCurrencyCompact
            ),
        [advancedDashboardSnapshot, accountingSummary, formatCurrencyCompact]
    );

    const intelligentInsights = useMemo(() => {
        const insights = [] as Array<{ title: string; text: string; tone: string; actionTab: string }>;
        const intel = (domainKnowledge?.intelligence ?? {}) as Record<string, unknown>;

        if (intel.seasonality) {
            const currentMonth = new Date().toLocaleString('default', { month: 'long' });
            const peakMonths = Array.isArray(intel.peakMonths) ? intel.peakMonths as string[] : [];
            const isPeak = peakMonths.includes(currentMonth);
            if (isPeak) {
                insights.push({
                    title: 'Seasonal Peak',
                    text: `${String(intel.seasonality)} peak (${currentMonth}). Buffer safety stock on fast movers before demand spikes.`,
                    tone: 'indigo',
                    actionTab: 'inventory',
                });
            } else if (peakMonths.length > 0) {
                insights.push({
                    title: 'Seasonal Planning',
                    text: `Next peak window: ${peakMonths[0]}. Align procurement ${Number(intel.leadTime) || 14} days ahead of demand.`,
                    tone: 'slate',
                    actionTab: 'purchases',
                });
            }
        }

        if (intel.perishability && String(intel.perishability).toLowerCase() !== 'low') {
            insights.push({
                title: 'Shelf-Life Risk',
                text: `${String(intel.perishability).toUpperCase()} perishability vertical. Prioritize FEFO picks and expiry checks on inbound stock.`,
                tone: 'amber',
                actionTab: 'inventory',
            });
        }

        if (Number(intel.demandVolatility) > 0.6) {
            insights.push({
                title: 'Demand Volatility',
                text: 'Elevated demand swings detected for this vertical. Widen reorder buffers on A-class SKUs.',
                tone: 'rose',
                actionTab: 'reports',
            });
        }

        if (remindersData.lowStock > 0) {
            insights.push({
                title: 'Predictive Restock',
                text: `${remindersData.lowStock} item${remindersData.lowStock > 1 ? 's are' : ' is'} below safety stock. Generate replenishment early to avoid stock-outs.`,
                tone: 'indigo',
                actionTab: 'inventory'
            });
        }

        if (remindersData.overdueInvoices > 0) {
            insights.push({
                title: 'Collections Alert',
                text: `${remindersData.overdueInvoices} overdue invoice${remindersData.overdueInvoices > 1 ? 's' : ''} need follow-up to protect cash flow health.`,
                tone: 'amber',
                actionTab: 'invoices'
            });
        }

        if (campaignEnabled && revenueTrendSigned <= 0) {
            insights.push({
                title: 'Campaign Opportunity',
                text: 'Revenue momentum softened. Launch a targeted win-back or bundle campaign to recover demand quickly.',
                tone: 'emerald',
                actionTab: 'campaigns'
            });
        }

        if (periodMetrics.currentExpenses > 0 && expenseTrend > 10) {
            insights.push({
                title: 'Expense Pressure',
                text: `Period expenses rose ${expenseTrend.toFixed(1)}%. Review high-cost categories and tighten discretionary spend.`,
                tone: 'rose',
                actionTab: 'expenses'
            });
        }

        if (insights.length === 0) {
            insights.push({
                title: 'Operational Stability',
                text: 'Core KPIs are stable. Use analytics projections to identify the next growth lever.',
                tone: 'slate',
                actionTab: 'reports'
            });
        }

        if (insights.length < 2) {
            insights.push({
                title: 'Tracking Coverage',
                text: 'Open analytics and verify trends by segment, product, and period to improve decision confidence.',
                tone: 'slate',
                actionTab: 'reports'
            });
        }

        return insights;
    }, [remindersData, campaignEnabled, revenueTrendSigned, periodMetrics.currentExpenses, expenseTrend, domainKnowledge?.intelligence]);

    const metricsPending = isLoading;

    // ===============================================================
    // EASY MODE DASHBOARD -- Clean, beginner-friendly view
    // ===============================================================
    if (isEasyMode) {
        const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
        const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

        const easyCommandStrip = [
            {
                label: 'Open invoices',
                value: openInvoicesCount,
                tone: openInvoicesCount > 0 ? 'text-amber-600' : 'text-emerald-600',
                icon: FileText,
            },
            {
                label: 'Pending Orders',
                value: remindersData.pendingOrders || 0,
                tone: remindersData.pendingOrders > 0 ? 'text-amber-600' : 'text-emerald-600',
                icon: ShoppingCart,
            },
            {
                label: 'Overdue Invoices',
                value: remindersData.overdueInvoices || 0,
                tone: remindersData.overdueInvoices > 0 ? 'text-rose-600' : 'text-emerald-600',
                icon: Clock,
            },
            {
                label: 'Units Sold',
                value: periodMetrics.soldUnits.toLocaleString(),
                tone: periodMetrics.soldUnits > 0 ? 'text-slate-900' : 'text-slate-400',
                icon: BarChart3,
            },
        ];

        /** Avoid repeating low-stock counts: header + health strip + KPI already cover inventory. */
        const easySmartInsights = intelligentInsights.filter(
            (insight) => !(remindersData.lowStock > 0 && insight.title === 'Predictive Restock')
        );
        const easyOperationalInsights =
            easySmartInsights.length > 0 ? easySmartInsights : intelligentInsights;

        const easyActions = [
            { id: 'new-invoice', label: 'New Invoice', desc: 'Create a sale', icon: Plus, color: 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-900' },
            { id: 'add-product', label: 'Add Product', desc: 'Record inventory', icon: Package, color: 'bg-brand-50 hover:bg-brand-100 text-brand-primary-dark border border-brand-100' },
            { id: 'add-customer', label: 'Add Customer', desc: 'Grow customer base', icon: Users, color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200' },
            { id: 'record-payment', label: 'Record Payment', desc: 'Collect receivables', icon: Banknote, color: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200' },
            { id: 'inventory', label: 'Review Inventory', desc: 'Fix stock issues', icon: Warehouse, color: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200' },
            { id: 'reports', label: 'View Reports', desc: 'Open analytics', icon: BarChart3, color: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200' },
        ];

        const easyHealthPanels = [
            {
                label: 'Efficiency Score',
                value: `${domainEfficiency}%`,
                detail: domainEfficiency >= 85 ? 'Operations in control' : 'Needs attention',
                tone: domainEfficiency >= 85 ? 'text-emerald-600' : 'text-amber-600'
            },
            {
                label: 'Avg Order Value',
                value: formatCurrencyCompact(avgOrderValue),
                detail: 'Revenue per closed order',
                tone: 'text-slate-900'
            },
            {
                label: 'Paid Order Ratio',
                value: paidOrderRateDisplay,
                detail: paidOrderRateDetail,
                tone: paidOrderRate !== null && paidOrderRate < 60 ? 'text-rose-600' : 'text-slate-900'
            },
            {
                label: multiLocationEnabled ? 'Warehouse Utilization' : 'Stock Check Recency',
                value: multiLocationEnabled
                    ? warehouseUtilizationDisplay
                    : stockCheckRecencyDisplay,
                detail: multiLocationEnabled ? warehouseUtilizationDetail : stockCheckRecencyDetail,
                tone: 'text-slate-900'
            }
        ];

        const quickSetupSteps = [
            { id: 'add-product', label: 'Add your first product' },
            { id: 'add-customer', label: 'Create a customer record' },
            { id: 'new-invoice', label: 'Issue your first invoice' }
        ];

        const domainVerticalLabel =
            (domainKnowledge as { name?: string } | undefined)?.name || getDomainKnowledge(category).name;

        return (
            <>
                {metricsPending ? (
                    <p className="mb-3 hidden items-center gap-2 text-xs font-medium text-gray-400 lg:flex" aria-live="polite">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-primary" aria-hidden />
                        Loading live metrics…
                    </p>
                ) : null}
            <EasyBusinessDashboard
                businessId={activeBusinessId}
                business={business}
                category={category}
                currency={currency}
                metricsPending={metricsPending}
                domainKnowledge={domainKnowledge as Record<string, unknown> | undefined}
                domainVerticalLabel={domainVerticalLabel}
                periodLabel={periodLabel}
                activePreset={activePreset}
                onQuickAction={onQuickAction}
                onDateRangePresetChange={onDateRangePresetChange}
                dateRange={dateRange}
                invoices={invoices as unknown as Array<Record<string, unknown>>}
                products={products as unknown as Array<Record<string, unknown>>}
                customers={customers as unknown as Array<Record<string, unknown>>}
                expenseBreakdown={expenseBreakdown as unknown as Array<Record<string, unknown>>}
                chartData={chartData}
                dashboardMetrics={dashboardMetrics as unknown as Record<string, unknown> | null}
                formatCurrencyCompact={formatCurrencyCompact}
                greeting={greeting}
                userName={userName}
                commandStrip={easyCommandStrip}
                healthPanels={easyHealthPanels}
                insights={easyOperationalInsights}
                reminders={remindersData}
                hasCoreData={hasCoreData}
                quickSetupSteps={quickSetupSteps}
                quickActions={easyActions}
                domainEfficiency={domainEfficiency}
                periodMetrics={periodMetrics}
                revenueTrend={Number(revenueTrendSigned)}
                ordersTrend={Number(ordersTrend)}
                customerTrend={Number(customerTrend)}
                expenseTrend={Number(expenseTrend)}
                outstandingAmount={outstandingAmount}
                openInvoicesCount={openInvoicesCount}
                inventoryValue={inventoryValue}
                inStockUnits={inStockUnits}
                coverageDays={coverageDays}
                avgOrderValue={avgOrderValue}
                returnRate={returnRate}
                paidOrderRateDisplay={paidOrderRateDisplay}
                paidOrderRate={paidOrderRate}
                cashFlowCurrent={periodCashFlow}
                cashFlowGrowth={periodCashFlowGrowth}
                campaignEnabled={campaignEnabled}
                multiLocationEnabled={multiLocationEnabled}
                warehouseUtilizationDisplay={warehouseUtilizationDisplay}
                stockCheckRecencyDisplay={stockCheckRecencyDisplay}
            />
            </>
        );
    }

    // ===============================================================
    // ADVANCED MODE DASHBOARD -- Full power view
    // ===============================================================

    const advancedUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
    const advancedGreeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
    const advancedPresetOptions: Array<{ id: 'today' | '7d' | '30d' | 'mtd'; label: string }> = [
        { id: 'today', label: 'Today' },
        { id: '7d', label: '7 Days' },
        { id: '30d', label: '30 Days' },
        { id: 'mtd', label: 'MTD' },
    ];
    const advancedQuickActions = [
        { id: 'new-invoice', label: 'New Invoice', sublabel: 'Direct sale', icon: FileText },
        {
            id: multiLocationEnabled ? 'warehouses' : 'purchases',
            label: multiLocationEnabled ? 'Transfer' : 'Purchase',
            sublabel: multiLocationEnabled ? 'Inter-branch' : 'Procurement',
            icon: Warehouse,
        },
        { id: 'inventory', label: 'Adjust', sublabel: 'Stock fix', icon: Package },
        { id: 'new-customer', label: 'Customer', sublabel: 'CRM', icon: Users },
        { id: 'new-product', label: 'Product', sublabel: 'Catalog', icon: Plus },
        campaignEnabled
            ? { id: 'campaigns', label: 'Campaigns', sublabel: 'Marketing', icon: Zap }
            : { id: 'reports', label: 'Analytics', sublabel: 'Insights', icon: BarChart3 },
    ];

    return (
        <>
            {metricsPending ? (
                <p className="mb-3 hidden items-center gap-2 text-xs font-medium text-gray-400 lg:flex" aria-live="polite">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-primary" aria-hidden />
                    Loading live metrics…
                </p>
            ) : null}
            <DashboardMobileHub
                mode="advanced"
                metricsPending={metricsPending}
                greeting={advancedGreeting}
                userName={advancedUserName}
                businessName={business?.name}
                periodLabel={periodLabel}
                presetOptions={advancedPresetOptions}
                activePreset={
                    activePreset === 'custom' || activePreset === '90d' || activePreset === 'last_month' || activePreset === 'ytd'
                        ? '30d'
                        : activePreset
                }
                onDateRangePresetChange={(preset) =>
                    onDateRangePresetChange?.(preset as 'today' | '7d' | '30d' | '90d' | 'mtd' | 'last_month' | 'ytd')
                }
                kpiStrip={dashboardHeaderHighlights.map((item) => ({
                    label: item.label.replace(' Invoices', '').replace(' Orders', ''),
                    value: item.value,
                    alert: item.tone.includes('rose') || item.tone.includes('amber'),
                    tone: item.tone,
                }))}
                quickActions={advancedQuickActions}
                onQuickAction={onQuickAction}
                healthPanels={[
                    {
                        label: 'Revenue',
                        value: formatCurrencyCompact(periodMetrics.currentRevenue),
                        tone: 'text-emerald-600',
                    },
                    {
                        label: 'Orders',
                        value: periodMetrics.currentOrders,
                        tone: 'text-slate-900',
                    },
                    {
                        label: 'Efficiency',
                        value: `${domainEfficiency}%`,
                        tone: domainEfficiency >= 85 ? 'text-emerald-600' : 'text-amber-600',
                    },
                    {
                        label: 'Low stock',
                        value: remindersData.lowStock,
                        tone: remindersData.lowStock > 0 ? 'text-amber-600' : 'text-emerald-600',
                    },
                ]}
                reminders={remindersData}
                hasCoreData={hasCoreData}
                quickSetupSteps={[
                    { id: 'add-product', label: 'Add product' },
                    { id: 'add-customer', label: 'Add customer' },
                    { id: 'new-invoice', label: 'New invoice' },
                ]}
            />

        <NetsuiteDashboard>
            {/* Desktop header band — full width KPIs & period context */}
            <div className="hidden lg:block lg:col-span-12 space-y-3">
                <QuickActionTiles
                    layout="toolbar"
                    onAction={onQuickAction}
                    campaignEnabled={campaignEnabled}
                    multiLocationEnabled={multiLocationEnabled}
                />

                {!hasCoreData && (
                    <Card className="border border-brand-100 bg-brand-50/40 shadow-sm">
                        <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-primary">Quick Setup</p>
                                <p className="text-sm font-bold text-slate-800 mt-1">Start by adding products, customers, or your first invoice to unlock richer KPI insights.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" className="h-8 text-[11px] font-bold" onClick={() => onQuickAction?.('add-product')}>Add Product</Button>
                                <Button size="sm" variant="outline" className="h-8 text-[11px] font-bold" onClick={() => onQuickAction?.('add-customer')}>Add Customer</Button>
                                <Button size="sm" variant="outline" className="h-8 text-[11px] font-bold" onClick={() => onQuickAction?.('new-invoice')}>New Invoice</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 xl:auto-rows-fr">
                    {topStripKpis.map((item) => (
                        <DomainMetricCard
                            key={item.label}
                            label={item.label}
                            value={item.value}
                            subValue={item.subValue}
                            trend={item.trend}
                            trendHint={item.trendHint}
                            icon={item.icon}
                            theme={item.theme}
                            colorClass={item.colorClass}
                            sparkline={item.sparkline}
                            invertTrendColor={item.invertTrendColor}
                            actionId={item.actionId}
                            onNavigate={handleMetricNavigate}
                            className="h-full"
                        />
                    ))}
                </div>

                <FinanceHeroStrip metrics={financeHeroMetrics} onNavigate={handleMetricNavigate} />

                <PeriodSnapshotCard
                    dateFrom={new Date(dateRange.from)}
                    dateTo={new Date(dateRange.to)}
                    presetLabel={activePresetDisplayLabel}
                    healthChips={dashboardHeaderHighlights}
                    metrics={periodSnapshotMetrics}
                    collapsedCount={6}
                    onMetricClick={handleMetricNavigate}
                />
            </div>

            {/* Analytics + contextual right rail */}
            <div className="hidden lg:block lg:col-span-8 min-h-0 space-y-3">
                <AnalyticsDashboard
                    businessId={activeBusinessId}
                    category={category}
                    currency={currency}
                    business={business}
                    chartData={chartData}
                    invoices={invoices}
                    products={products}
                    colors={colors}
                    domainKnowledge={domainKnowledge}
                    dateRange={dateRange}
                    onQuickAction={onQuickAction}
                />
            </div>

            <div className="hidden lg:flex lg:col-span-4 flex-col gap-2.5 min-h-0">
                <RemindersPortlet data={remindersData} onItemClick={onQuickAction} />

                <MergedActionInsights
                    category={category}
                    domainKnowledge={domainKnowledge as Record<string, unknown> | undefined}
                    operationalInsights={intelligentInsights}
                    reminders={remindersData}
                    onQuickAction={onQuickAction}
                />

                <DomainOperationsPanel
                    businessId={activeBusinessId}
                    business={business}
                    category={category}
                    domainKnowledge={domainKnowledge as Record<string, unknown> | undefined}
                    dateRange={dateRange}
                    periodLabel={periodLabel}
                    formatCurrencyCompact={formatCurrencyCompact}
                    onQuickAction={onQuickAction}
                    isActive
                    variant="compact"
                    sections={['inquiries']}
                    hideKpiStrip
                    hideMiddleCharts
                    hideOrderTimeline
                    snapshot={advancedOpsSnapshot.snapshot}
                    snapshotLoading={advancedOpsSnapshot.loading}
                    snapshotError={advancedOpsSnapshot.error}
                    onSnapshotRetry={advancedOpsSnapshot.reload}
                />
            </div>

            {/* Bottom band — fills space below analytics with balanced columns */}
            <div className="hidden lg:grid lg:col-span-12 lg:grid-cols-12 gap-2.5 items-stretch">
                <div className="lg:col-span-4 min-h-0">
                    <DomainOperationsPanel
                        businessId={activeBusinessId}
                        business={business}
                        category={category}
                        domainKnowledge={domainKnowledge as Record<string, unknown> | undefined}
                        dateRange={dateRange}
                        periodLabel={periodLabel}
                        formatCurrencyCompact={formatCurrencyCompact}
                        onQuickAction={onQuickAction}
                        isActive
                        variant="compact"
                        sections={['collections']}
                        hideKpiStrip
                        hideMiddleCharts
                        hideOrderTimeline
                        showLoadingShell={false}
                        snapshot={advancedOpsSnapshot.snapshot}
                        onSnapshotRetry={advancedOpsSnapshot.reload}
                    />
                </div>
                <div className="lg:col-span-5 min-h-0 flex">
                    <RecentActivityFeed
                        businessId={activeBusinessId}
                        onViewAll={() => onQuickAction?.('reports')}
                        feedLimit={25}
                        className="flex-1"
                    />
                </div>
                <div className="lg:col-span-3 min-h-0 flex">
                    <div className="flex h-full min-h-[16rem] w-full">
                    <KPIMeter
                        title="Domain Efficiency"
                        value={domainEfficiency}
                        target={95}
                        suffix="%"
                        trendValue={Number(revenueTrendSigned.toFixed(1))}
                        trendLabel="vs previous period"
                    />
                    </div>
                </div>
            </div>

            {/* Mobile — hub covers KPIs/actions; show insights & activity only */}
            <div className="min-w-0 space-y-3 overflow-x-hidden pb-2 lg:hidden lg:col-span-12">
                <AnalyticsDashboard
                    businessId={activeBusinessId}
                    category={category}
                    currency={currency}
                    business={business}
                    chartData={chartData}
                    invoices={invoices}
                    products={products}
                    colors={colors}
                    domainKnowledge={domainKnowledge}
                    dateRange={dateRange}
                    onQuickAction={onQuickAction}
                />

                <RemindersPortlet data={remindersData} onItemClick={onQuickAction} />

                <MergedActionInsights
                    category={category}
                    domainKnowledge={domainKnowledge as Record<string, unknown> | undefined}
                    operationalInsights={intelligentInsights}
                    reminders={remindersData}
                    onQuickAction={onQuickAction}
                />

                <DomainOperationsPanel
                    businessId={activeBusinessId}
                    business={business}
                    category={category}
                    domainKnowledge={domainKnowledge as Record<string, unknown> | undefined}
                    dateRange={dateRange}
                    periodLabel={periodLabel}
                    formatCurrencyCompact={formatCurrencyCompact}
                    onQuickAction={onQuickAction}
                    isActive
                    variant="compact"
                    sections={['inquiries', 'collections']}
                    hideKpiStrip
                    hideMiddleCharts
                    hideOrderTimeline
                    snapshot={advancedOpsSnapshot.snapshot}
                    snapshotLoading={advancedOpsSnapshot.loading}
                    snapshotError={advancedOpsSnapshot.error}
                    onSnapshotRetry={advancedOpsSnapshot.reload}
                />

                <RecentActivityFeed
                    businessId={activeBusinessId}
                    onViewAll={() => onQuickAction?.('reports')}
                    feedLimit={10}
                />
            </div>
        </NetsuiteDashboard>
        </>
    );
}
