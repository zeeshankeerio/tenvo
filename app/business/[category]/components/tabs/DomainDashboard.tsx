'use client';

import React, { useMemo, useCallback } from 'react';
import {
    TrendingUp, Users, ShoppingCart,
    CreditCard, Clock,
    Zap, ArrowUpRight, ArrowDownRight,
    Boxes, Warehouse, RotateCcw, BadgeDollarSign,
    Package, FileText, BarChart3, Plus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/context/BusinessContext';
import { useAppMode } from '@/lib/context/BusyModeContext';
import { getDomainColors } from '@/lib/domainColors';
import { isCampaignRelevant } from '@/lib/config/domains';
import { KPIMeter } from '../islands/portlets/KPIMeter.client';
import { QuickActionTiles } from '../islands/portlets/QuickActionTiles.client';
import { RemindersPortlet } from '../islands/portlets/RemindersPortlet.client';
import { RecentActivityFeed } from '../islands/portlets/RecentActivityFeed.client';
import { AnalyticsDashboard } from '../islands/AnalyticsDashboard.client';
import { PredictivePlanningPortlet } from '../islands/portlets/PredictivePlanningPortlet.client';
import { AgenticAuditPortlet } from '../islands/portlets/AgenticAuditPortlet.client';
import { AgenticAnalystChat } from '../islands/portlets/AgenticAnalystChat.client';
import NetsuiteDashboard from '../islands/NetsuiteDashboard.client';

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
    accountingSummary?: AccountingSummaryLike | null;
    expenseBreakdown?: ExpenseBreakdownItem[];
    expenses?: ExpenseLike[];
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
}

interface DomainKnowledgeLike {
    multiLocationEnabled?: boolean;
}

interface MetricCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    trend?: number;
    icon: React.ElementType;
    colorClass: string;
    className?: string;
}

// ===============================================================
// SPECIALIZED KPI CARDS
// ===============================================================

function DomainMetricCard({ label, value, subValue, trend, icon: Icon, colorClass, className }: MetricCardProps) {
    return (
        <Card className={cn("border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white h-full", className)}>
            <CardContent className="p-3.5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                        <h3 className="text-lg xl:text-xl font-black text-gray-900 leading-tight">{value}</h3>
                        <p className="text-[10px] font-bold text-gray-500 mt-1">{subValue}</p>
                    </div>
                    <div className={cn("p-2 rounded-xl shadow-sm", colorClass)}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                </div>
                {trend !== undefined && trend !== 0 && (
                    <div className="mt-3 flex items-center gap-1">
                        {trend > 0 ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                        ) : (
                            <ArrowDownRight className="w-3 h-3 text-rose-500" />
                        )}
                        <span className={cn("text-[10px] font-bold", trend > 0 ? "text-emerald-600" : "text-rose-600")}>
                            {Math.abs(trend)}% from last period
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
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
    accountingSummary,
    expenseBreakdown = [],
    expenses = [],
    domainKnowledge,
    isLoading = false,
    user
}: DomainDashboardProps) {
    const { business } = useBusiness() as { business?: { id?: string } | null };
    const { isEasyMode } = useAppMode();
    const activeBusinessId = businessId || business?.id;
    const colors = getDomainColors(category) as Record<string, unknown>;
    const campaignEnabled = isCampaignRelevant(category, (domainKnowledge ?? null) as any);
    const multiLocationEnabled = Boolean(domainKnowledge?.multiLocationEnabled);

    const formatCurrencyCompact = useCallback(
        (amount: number) => `${currency} ${Math.round(amount || 0).toLocaleString()}`,
        [currency]
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
            pendingReturns
        };
    }, [dateRange, invoices, expenses]);

    // Track expense context
    const totalExpenses = useMemo(() =>
        expenseBreakdown.reduce((sum, exp) => sum + (exp.value || 0), 0)
        , [expenseBreakdown]);

    const revenueTrendSigned = dashboardMetrics?.growth?.trend === 'down'
        ? -(dashboardMetrics?.growth?.percentage || 0)
        : (dashboardMetrics?.growth?.percentage ?? calcGrowth(periodMetrics.currentRevenue, periodMetrics.previousRevenue));

    const ordersTrend = calcGrowth(periodMetrics.currentOrders, periodMetrics.previousOrders);
    const expenseTrend = calcGrowth(periodMetrics.currentExpenses, periodMetrics.previousExpenses);
    const customerTrend = dashboardMetrics?.customers?.growth ?? calcGrowth(periodMetrics.currentCustomers, periodMetrics.previousCustomers);

    // --- Robust KPI Logic -----------------------------------------
    const domainKpis = useMemo(() => {
        const expenseValue = periodMetrics.currentExpenses > 0 ? periodMetrics.currentExpenses : totalExpenses;
        const activeCustomers = dashboardMetrics?.customers?.active ?? periodMetrics.currentCustomers;
        const avgOrderValueKpi = periodMetrics.currentRevenue / Math.max(periodMetrics.currentOrders, 1);
        const returnRateKpi = (periodMetrics.returnInvoices / Math.max(periodMetrics.currentOrders, 1)) * 100;

        return [
            {
                id: 'expenses',
                label: 'Period Expenses',
                value: formatCurrencyCompact(expenseValue),
                subValue: 'Operating costs',
                trend: Number((-expenseTrend).toFixed(1)),
                icon: CreditCard,
                color: 'bg-rose-600'
            },
            {
                id: 'customers',
                label: 'Active Customers',
                value: activeCustomers || 0,
                subValue: 'Retention focus',
                trend: Number(customerTrend.toFixed(1)),
                icon: Users,
                color: 'bg-brand-primary'
            },
            {
                id: 'avg_order',
                label: 'Avg Order Value',
                value: formatCurrencyCompact(avgOrderValueKpi),
                subValue: 'Revenue per order',
                trend: Number(revenueTrendSigned.toFixed(1)),
                icon: TrendingUp,
                color: 'bg-brand-primary-dark'
            },
            {
                id: 'return_rate',
                label: 'Return Rate',
                value: `${returnRateKpi.toFixed(1)}%`,
                subValue: `${periodMetrics.returnInvoices} return docs`,
                trend: Number((-returnRateKpi).toFixed(1)),
                icon: RotateCcw,
                color: 'bg-rose-700'
            }
        ].filter((item, index, arr) => arr.findIndex((candidate) => candidate.label === item.label) === index);
    }, [dashboardMetrics, periodMetrics, totalExpenses, revenueTrendSigned, expenseTrend, customerTrend, formatCurrencyCompact]);

    const lowStockFallback = useMemo(() => {
        return products.filter((product: ProductLike) => {
            const stock = Number(product?.stock) || 0;
            const safetyStock =
                Number(product?.reorder_point) ||
                Number(product?.min_stock) ||
                Number(product?.minStock) ||
                10;
            return stock <= safetyStock;
        }).length;
    }, [products]);

    const overdueInvoicesFallback = useMemo(() => {
        return invoices.filter((invoice: InvoiceLike) => {
            const status = String(invoice?.status || '').toLowerCase();
            return status.includes('overdue') || status.includes('unpaid');
        }).length;
    }, [invoices]);

    const pendingOrdersFallback = useMemo(() => {
        return invoices.filter((invoice: InvoiceLike) => {
            const status = String(invoice?.status || '').toLowerCase();
            return status.includes('pending') || status.includes('processing');
        }).length;
    }, [invoices]);

    const remindersData = useMemo(() => ({
        lowStock: dashboardMetrics?.alerts?.lowStock ?? lowStockFallback,
        overdueInvoices: dashboardMetrics?.alerts?.overdueInvoices ?? overdueInvoicesFallback,
        pendingOrders: dashboardMetrics?.orders?.pending ?? pendingOrdersFallback
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
        if (Number.isFinite(summaryInventory) && summaryInventory !== 0) {
            return summaryInventory;
        }

        return products.reduce((sum: number, product: ProductLike) => {
            const stock = Number(product?.stock) || 0;
            const unitCost = Number(product?.cost_price) || Number(product?.purchase_price) || Number(product?.price) || 0;
            return sum + (Math.max(stock, 0) * unitCost);
        }, 0);
    }, [products, accountingSummary?.inventoryValue]);

    const inStockUnits = useMemo(() => {
        return products.reduce((sum: number, product: ProductLike) => sum + Math.max(0, Number(product?.stock) || 0), 0);
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

    const paidOrderRate = useMemo(() => {
        const totalFromMetrics = Number(dashboardMetrics?.orders?.total) || 0;
        const paidFromMetrics = Number(dashboardMetrics?.orders?.paid) || 0;
        if (totalFromMetrics > 0) {
            return clamp((paidFromMetrics / totalFromMetrics) * 100, 0, 100);
        }

        const eligibleInvoices = invoices.filter((invoice: InvoiceLike) => {
            const status = String(invoice?.status || '').toLowerCase();
            return !['draft', 'cancelled'].includes(status);
        });

        if (eligibleInvoices.length === 0) return null;

        const paidInvoices = eligibleInvoices.filter((invoice: InvoiceLike) => String(invoice?.status || '').toLowerCase() === 'paid').length;
        return clamp((paidInvoices / eligibleInvoices.length) * 100, 0, 100);
    }, [dashboardMetrics?.orders?.total, dashboardMetrics?.orders?.paid, invoices]);

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

    const dashboardHeaderHighlights = useMemo(() => ([
        {
            label: 'At-Risk SKUs',
            value: remindersData.lowStock || 0,
            tone: remindersData.lowStock > 0 ? 'text-rose-600' : 'text-emerald-600'
        },
        {
            label: 'Pending Orders',
            value: remindersData.pendingOrders || 0,
            tone: remindersData.pendingOrders > 0 ? 'text-amber-600' : 'text-emerald-600'
        },
        {
            label: 'Overdue Invoices',
            value: remindersData.overdueInvoices || 0,
            tone: remindersData.overdueInvoices > 0 ? 'text-rose-600' : 'text-emerald-600'
        },
        {
            label: 'Return Rate',
            value: `${returnRate.toFixed(1)}%`,
            tone: returnRate > 5 ? 'text-rose-600' : 'text-emerald-600'
        }
    ]), [remindersData, returnRate]);

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

    const topStripKpis = useMemo(() => ([
        {
            label: 'Orders In Period',
            value: periodMetrics.currentOrders,
            trend: Number(ordersTrend.toFixed(1)),
            icon: ShoppingCart,
            colorClass: 'bg-cyan-500'
        },
        {
            label: 'Revenue In Period',
            value: formatCurrencyCompact(periodMetrics.currentRevenue),
            trend: Number(revenueTrendSigned.toFixed(1)),
            icon: BadgeDollarSign,
            colorClass: 'bg-emerald-500'
        },
        {
            label: 'Inventory Value',
            value: formatCurrencyCompact(inventoryValue),
            trend: undefined,
            icon: Boxes,
            colorClass: 'bg-brand-primary-dark'
        },
        {
            label: 'Overdue',
            value: remindersData.overdueInvoices,
            trend: remindersData.overdueInvoices > 0 ? -Math.min(remindersData.overdueInvoices * 3, 25) : 0,
            icon: Clock,
            colorClass: 'bg-rose-500'
        }
    ].filter((item, index, arr) => arr.findIndex((candidate) => candidate.label === item.label) === index)), [periodMetrics.currentOrders, periodMetrics.currentRevenue, ordersTrend, revenueTrendSigned, inventoryValue, remindersData.overdueInvoices, formatCurrencyCompact]);

    const intelligentInsights = useMemo(() => {
        const insights = [] as Array<{ title: string; text: string; tone: string; actionTab: string }>;

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

        return insights.slice(0, 2);
    }, [remindersData, campaignEnabled, revenueTrendSigned, periodMetrics.currentExpenses, expenseTrend]);

    if (isLoading) {
        return (
            <div className="p-8 space-y-8 animate-pulse">
                <div className="h-32 bg-gray-100 rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-96 bg-gray-100 rounded-2xl" />
                    <div className="h-96 bg-gray-100 rounded-2xl" />
                </div>
            </div>
        );
    }

    // ===============================================================
    // EASY MODE DASHBOARD -- Clean, beginner-friendly view
    // ===============================================================
    if (isEasyMode) {
        const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
        const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
        const easyPresetOptions: Array<{ id: 'today' | '7d' | '30d' | 'mtd'; label: string }> = [
            { id: 'today', label: 'Today' },
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
            { id: 'mtd', label: 'MTD' }
        ];

        const easyKpis = [
            {
                label: 'Revenue',
                value: formatCurrencyCompact(dashboardMetrics?.revenue ?? periodMetrics.currentRevenue),
                subValue: periodLabel,
                icon: TrendingUp,
                color: 'bg-emerald-500',
                trend: Number(revenueTrendSigned.toFixed(1)),
            },
            {
                label: 'Orders',
                value: dashboardMetrics?.orders?.total ?? periodMetrics.currentOrders,
                subValue: `${periodMetrics.soldUnits} units sold`,
                icon: ShoppingCart,
                color: 'bg-brand-primary',
                trend: Number(ordersTrend.toFixed(1)),
            },
            {
                label: 'Inventory Value',
                value: formatCurrencyCompact(inventoryValue),
                subValue: `${inStockUnits.toLocaleString()} units on hand`,
                icon: Boxes,
                color: 'bg-brand-primary-dark',
                trend: undefined,
            },
            {
                label: 'Receivables Due',
                value: formatCurrencyCompact(outstandingAmount),
                subValue: `${remindersData.overdueInvoices} overdue invoices`,
                icon: CreditCard,
                color: outstandingAmount > 0 ? 'bg-rose-500' : 'bg-slate-500',
                trend: undefined,
            },
            {
                label: 'Active Customers',
                value: dashboardMetrics?.customers?.active ?? periodMetrics.currentCustomers,
                subValue: 'Buying in current period',
                icon: Users,
                color: 'bg-cyan-500',
                trend: Number(customerTrend.toFixed(1)),
            },
            {
                label: 'Low Stock',
                value: remindersData.lowStock,
                subValue: coverageDays > 365 ? 'Coverage stable' : `${coverageDays} days coverage`,
                icon: Package,
                color: remindersData.lowStock > 0 ? 'bg-amber-500' : 'bg-emerald-600',
                trend: undefined,
            },
        ];

        const easyActions = [
            { id: 'new-invoice', label: 'New Invoice', desc: 'Create a sale', icon: Plus, color: 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-900' },
            { id: 'add-product', label: 'Add Product', desc: 'Record inventory', icon: Package, color: 'bg-brand-50 hover:bg-brand-100 text-brand-primary-dark border border-brand-100' },
            { id: 'add-customer', label: 'Add Customer', desc: 'Grow customer base', icon: Users, color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200' },
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
                detail: 'Collections quality',
                tone: paidOrderRate !== null && paidOrderRate < 60 ? 'text-rose-600' : 'text-slate-900'
            },
            {
                label: multiLocationEnabled ? 'Warehouse Utilization' : 'Stock Check Recency',
                value: multiLocationEnabled
                    ? warehouseUtilizationDisplay
                    : stockCheckRecencyDisplay,
                detail: multiLocationEnabled ? 'Configured capacity usage' : 'Since last stock touch',
                tone: 'text-slate-900'
            }
        ];

        const quickSetupSteps = [
            { id: 'add-product', label: 'Add your first product' },
            { id: 'add-customer', label: 'Create a customer record' },
            { id: 'new-invoice', label: 'Issue your first invoice' }
        ];

        // Recent invoices for quick view
        const recentInvoices = [...invoices]
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
            .slice(0, 5);

        return (
            <div className="space-y-4 w-full text-slate-700 bg-[#f4f7f9] p-1">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    {/* Header Banner - Zoho Flat White Style */}
                    <Card className="xl:col-span-8 border border-slate-200 bg-white shadow-sm rounded-lg overflow-hidden">
                        <CardContent className="p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Easy Mode Command Board</p>
                                    </div>
                                    <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{greeting}, {userName}.</h1>
                                    <p className="text-xs text-slate-500">Summary of sales, stock, customers, and collections for {periodLabel.toLowerCase()}.</p>
                                </div>
                                <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded border border-slate-200">
                                    {easyPresetOptions.map((preset) => (
                                        <button
                                            key={preset.id}
                                            onClick={() => onDateRangePresetChange?.(preset.id)}
                                            className={cn(
                                                'rounded px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all',
                                                activePreset === preset.id
                                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
                                            )}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                {dashboardHeaderHighlights.map((item) => (
                                    <div key={item.label} className="rounded border border-slate-100 bg-slate-50 px-3.5 py-3 hover:bg-slate-100/50 transition-colors">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                                        <p className={cn('mt-1.5 text-lg font-extrabold', item.tone)}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Operational Pulse Card - Divider List Style */}
                    <Card className="xl:col-span-4 border border-slate-200 bg-white shadow-sm rounded-lg">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Operational Pulse</p>
                                </div>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            </div>
                            <div className="mt-4 divide-y divide-slate-100">
                                {easyHealthPanels.map((panel) => (
                                    <div key={panel.label} className="py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors px-1">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-700">{panel.label}</p>
                                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{panel.detail}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={cn('text-sm font-extrabold tracking-tight', panel.tone)}>
                                                {panel.value}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {!hasCoreData && (
                    <Card className="border border-cyan-100 bg-cyan-50/40 shadow-sm rounded-lg">
                        <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-700">Quick Setup</p>
                                <p className="mt-1 text-sm font-bold text-slate-800">Complete the three core steps below to unlock richer KPI coverage and better easy-mode insights.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {quickSetupSteps.map((step) => (
                                    <Button key={step.id} size="sm" variant="outline" className="h-8 text-[11px] font-bold" onClick={() => onQuickAction?.(step.id)}>
                                        {step.label}
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 6 Key KPIs - Left Accent Border Style */}
                <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
                    {easyKpis.map(kpi => {
                        const borderColors: Record<string, string> = {
                            'bg-emerald-500': 'border-l-4 border-l-emerald-500',
                            'bg-brand-primary': 'border-l-4 border-l-[#e34242]',
                            'bg-brand-primary-dark': 'border-l-4 border-l-[#c49c3b]',
                            'bg-rose-500': 'border-l-4 border-l-rose-500',
                            'bg-slate-500': 'border-l-4 border-l-slate-400',
                            'bg-cyan-500': 'border-l-4 border-l-cyan-500',
                            'bg-amber-500': 'border-l-4 border-l-amber-500',
                            'bg-emerald-600': 'border-l-4 border-l-emerald-600'
                        };
                        const textColors: Record<string, string> = {
                            'bg-emerald-500': 'text-emerald-600',
                            'bg-brand-primary': 'text-[#e34242]',
                            'bg-brand-primary-dark': 'text-[#c49c3b]',
                            'bg-rose-500': 'text-rose-600',
                            'bg-slate-500': 'text-slate-500',
                            'bg-cyan-500': 'text-cyan-600',
                            'bg-amber-500': 'text-amber-600',
                            'bg-emerald-600': 'text-emerald-600'
                        };

                        const borderClass = borderColors[kpi.color] || 'border-l-4 border-l-slate-200';
                        const textClass = textColors[kpi.color] || 'text-slate-500';

                        return (
                            <Card key={kpi.label} className={cn("border border-slate-200 shadow-sm hover:shadow transition-shadow bg-white rounded-lg overflow-hidden", borderClass)}>
                                <CardContent className="p-3.5">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                                        <div className={cn("p-1.5 rounded bg-slate-50 border border-slate-100", textClass)}>
                                            <kpi.icon className="w-3.5 h-3.5 shrink-0" />
                                        </div>
                                    </div>
                                    <div className="flex items-baseline justify-between mt-1">
                                        <p className="text-lg font-extrabold text-slate-900 tracking-tight">{kpi.value}</p>
                                        {kpi.trend !== undefined && kpi.trend !== 0 && (
                                            <span className={cn("text-[10px] font-extrabold flex items-center gap-0.5",
                                                kpi.trend > 0 ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                                {kpi.trend > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                                                {Math.abs(kpi.trend)}%
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-semibold mt-1.5 truncate">{kpi.subValue}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    {/* Quick Actions Card - Flat with Colored Left Borders */}
                    <Card className="xl:col-span-7 border border-slate-200 shadow-sm bg-white rounded-lg">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                                <div>
                                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Actions</h2>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Shortcuts for the tasks operators do most.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                {easyActions.map(action => {
                                    const actionColors: Record<string, { border: string, bg: string, text: string, hoverBg: string }> = {
                                        'new-invoice': { border: 'border-l-[#e34242]', bg: 'bg-[#e34242]/5', text: 'text-[#e34242]', hoverBg: 'hover:bg-[#e34242]/5' },
                                        'add-product': { border: 'border-l-indigo-500', bg: 'bg-indigo-500/5', text: 'text-indigo-600', hoverBg: 'hover:bg-indigo-50' },
                                        'add-customer': { border: 'border-l-emerald-500', bg: 'bg-emerald-500/5', text: 'text-emerald-600', hoverBg: 'hover:bg-emerald-50' },
                                        'inventory': { border: 'border-l-amber-500', bg: 'bg-amber-500/5', text: 'text-amber-600', hoverBg: 'hover:bg-amber-50' },
                                        'reports': { border: 'border-l-orange-500', bg: 'bg-orange-500/5', text: 'text-orange-600', hoverBg: 'hover:bg-orange-50' },
                                    };

                                    const style = actionColors[action.id] || { border: 'border-l-slate-400', bg: 'bg-slate-50', text: 'text-slate-700', hoverBg: 'hover:bg-slate-100' };

                                    return (
                                        <button
                                            key={action.id}
                                            onClick={() => onQuickAction?.(action.id)}
                                            className={cn(
                                                'rounded-md p-3.5 text-left transition-all active:scale-[0.98] border border-slate-200 border-l-4 bg-white hover:shadow-sm',
                                                style.border,
                                                style.hoverBg
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">{action.label}</p>
                                                    <p className="mt-0.5 text-[10px] text-slate-400 font-semibold">{action.desc}</p>
                                                </div>
                                                <div className={cn("p-1.5 rounded bg-slate-50 border border-slate-100", style.text)}>
                                                    <action.icon className="w-3.5 h-3.5 shrink-0" />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="xl:col-span-5 space-y-3">
                        {/* Smart Insights - Flat White List Style */}
                        <Card className="border border-slate-200 shadow-sm bg-white rounded-lg">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                                    <BarChart3 className="w-4 h-4 text-brand-primary shrink-0" />
                                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Smart Insights</h2>
                                </div>
                                <div className="space-y-2">
                                    {intelligentInsights.map((insight, idx) => {
                                        const defaultStyle = { border: 'border-l-slate-400', bg: 'bg-slate-50/40', text: 'text-slate-700' };
                                        const toneColors: Record<string, { border: string, bg: string, text: string }> = {
                                            indigo: { border: 'border-l-indigo-500', bg: 'bg-indigo-50/40', text: 'text-indigo-700' },
                                            emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-50/40', text: 'text-emerald-700' },
                                            amber: { border: 'border-l-amber-500', bg: 'bg-amber-50/40', text: 'text-amber-700' },
                                            rose: { border: 'border-l-rose-500', bg: 'bg-rose-50/40', text: 'text-rose-700' },
                                            slate: defaultStyle,
                                        };
                                        const style = toneColors[insight.tone] || defaultStyle;

                                        return (
                                            <button
                                                key={`${insight.title}-${idx}`}
                                                onClick={() => onQuickAction?.(insight.actionTab)}
                                                className={cn(
                                                    'w-full rounded border border-slate-200 border-l-4 p-3 text-left transition-all hover:shadow-sm bg-slate-50/50',
                                                    style.border,
                                                    insight.tone === 'indigo' && 'hover:bg-indigo-50',
                                                    insight.tone === 'emerald' && 'hover:bg-emerald-50',
                                                    insight.tone === 'amber' && 'hover:bg-amber-50',
                                                    insight.tone === 'rose' && 'hover:bg-rose-50',
                                                    insight.tone === 'slate' && 'hover:bg-slate-100/50'
                                                )}
                                            >
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{insight.title}</p>
                                                <p className="mt-1 text-xs font-semibold text-slate-700 leading-snug">{insight.text}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Critical Alerts - Flat Double Border Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={() => onQuickAction?.('inventory')}
                                className="rounded-md border border-slate-200 border-l-4 border-l-amber-500 bg-white p-4 text-left hover:bg-slate-50 transition-colors shadow-sm hover:shadow"
                            >
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inventory Alert</p>
                                <p className="mt-1.5 text-lg font-extrabold text-amber-600">{remindersData.lowStock} low stock items</p>
                                <p className="mt-1 text-[10px] text-slate-500 font-semibold leading-normal">Review replenishment before stock-outs.</p>
                            </button>
                            <button
                                onClick={() => onQuickAction?.('invoices')}
                                className="rounded-md border border-slate-200 border-l-4 border-l-rose-500 bg-white p-4 text-left hover:bg-slate-50 transition-colors shadow-sm hover:shadow"
                            >
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Collections Alert</p>
                                <p className="mt-1.5 text-lg font-extrabold text-rose-600">{remindersData.overdueInvoices} overdue invoices</p>
                                <p className="mt-1 text-[10px] text-slate-500 font-semibold leading-normal">Follow up to protect cash flow.</p>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    {/* Recent Transactions Table */}
                    <div className="xl:col-span-8">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-brand-primary shrink-0" />
                                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Recent Transactions</h2>
                            </div>
                            <button
                                onClick={() => onQuickAction?.('invoices')}
                                className="text-xs font-bold text-[#e34242] hover:underline"
                            >
                                View All {'→'}
                            </button>
                        </div>
                        {recentInvoices.length === 0 ? (
                            <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 rounded-md">
                                <CardContent className="p-8 text-center">
                                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs font-bold text-slate-600">No transactions yet</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Create your first invoice to get started</p>
                                    <Button
                                        size="sm"
                                        className="mt-3 font-bold h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => onQuickAction?.('new-invoice')}
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1" />
                                        Create Invoice
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden rounded-lg">
                                <div className="divide-y divide-slate-100">
                                    {recentInvoices.map((inv, idx) => {
                                        const status = String(inv.status || 'draft').toLowerCase();
                                        const statusColors: Record<string, string> = {
                                            paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                                            unpaid: 'bg-amber-50 text-amber-700 border-amber-100',
                                            pending: 'bg-amber-50 text-amber-700 border-amber-100',
                                            overdue: 'bg-rose-50 text-rose-700 border-rose-100',
                                            draft: 'bg-slate-50 text-slate-600 border-slate-200',
                                        };
                                        return (
                                            <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 bg-slate-50 border border-slate-100 rounded-md flex items-center justify-center text-slate-500">
                                                        <FileText className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900">{inv.customer_name || 'Walk-in Customer'}</p>
                                                        <p className="text-[10px] text-slate-400 font-semibold">{inv.date ? new Date(inv.date).toLocaleDateString('en-PK') : ''}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-xs font-extrabold text-slate-900">{formatCurrencyCompact(Number(inv.grand_total) || Number(inv.amount) || 0)}</p>
                                                    </div>
                                                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider", statusColors[status] || statusColors.draft)}>
                                                        {status}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Business Snapshot List Card */}
                    <div className="xl:col-span-4 space-y-4">
                        <Card className="border border-slate-200 shadow-sm bg-white rounded-lg">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                                    <BarChart3 className="w-4 h-4 text-brand-primary shrink-0" />
                                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Business Snapshot</h2>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between py-2 border-b border-slate-50 hover:bg-slate-50/50 transition-colors px-1">
                                        <p className="text-[11px] font-bold text-slate-600">Products In Catalog</p>
                                        <p className="text-sm font-extrabold text-slate-900">{products.length}</p>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-slate-50 hover:bg-slate-50/50 transition-colors px-1">
                                        <p className="text-[11px] font-bold text-slate-600">Pending Orders</p>
                                        <p className="text-sm font-extrabold text-slate-900">{remindersData.pendingOrders}</p>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-slate-50 hover:bg-slate-50/50 transition-colors px-1">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-600">Returns</p>
                                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{returnRate.toFixed(1)}% return rate</p>
                                        </div>
                                        <p className="text-sm font-extrabold text-slate-900">{periodMetrics.returnInvoices}</p>
                                    </div>
                                    <div className="flex items-center justify-between py-2 hover:bg-slate-50/50 transition-colors px-1">
                                        <p className="text-[11px] font-bold text-slate-600">Stock Check Recency</p>
                                        <p className="text-sm font-extrabold text-slate-900">{stockCheckRecencyDisplay}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    // ===============================================================
    // ADVANCED MODE DASHBOARD -- Full power view
    // ===============================================================

    return (
        <NetsuiteDashboard>
            {/* Main Area (9/12) */}
            <div className="space-y-4 order-1 lg:order-1 lg:col-span-9">
                {!hasCoreData && (
                    <Card className="border border-brand-100 bg-brand-50/40 shadow-sm">
                        <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Quick Setup</p>
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

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 xl:auto-rows-fr">
                    {topStripKpis.map((item) => (
                        <DomainMetricCard
                            key={item.label}
                            label={item.label}
                            value={item.value}
                            subValue={periodLabel}
                            trend={item.trend}
                            icon={item.icon}
                            colorClass={item.colorClass}
                            className="h-full"
                        />
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 xl:items-stretch">
                    <Card className="xl:col-span-8 border border-slate-200 shadow-sm bg-white">
                        <CardContent className="p-3.5 md:p-4.5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dashboard Overview</p>
                                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">Business Overview</h2>
                                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                                        {new Date(dateRange.from).toLocaleDateString()} - {new Date(dateRange.to).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
                                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Realtime KPI Sync</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-white">
                                        <label htmlFor="domain-date-filter" className="text-[10px] font-black uppercase tracking-wider text-slate-500">Date</label>
                                        <select
                                            id="domain-date-filter"
                                            value={activePreset}
                                            onChange={(e) => {
                                                const preset = e.target.value as 'today' | '7d' | '30d' | '90d' | 'mtd' | 'last_month' | 'ytd' | 'custom';
                                                if (preset !== 'custom') onDateRangePresetChange?.(preset);
                                            }}
                                            className="h-7 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-wine/20"
                                        >
                                            <option value="today">Today</option>
                                            <option value="7d">Last 7 Days</option>
                                            <option value="30d">Last 30 Days</option>
                                            <option value="90d">Last 90 Days</option>
                                            <option value="mtd">This Month</option>
                                            <option value="last_month">Last Month</option>
                                            <option value="ytd">Year to Date</option>
                                            <option value="custom">Custom</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                                {dashboardHeaderHighlights.map((item) => (
                                    <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                                        <p className={cn('text-base font-black mt-1', item.tone)}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="xl:col-span-4 grid grid-cols-2 gap-3 auto-rows-fr">
                        <Card className="border border-slate-200 shadow-sm bg-white">
                            <CardContent className="p-3.5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Coverage Days</p>
                                <p className="text-lg font-black text-slate-900 mt-1">{coverageDays > 365 ? '365+' : coverageDays}</p>
                                <p className="text-[10px] text-slate-500 mt-1">Estimated stock coverage</p>
                            </CardContent>
                        </Card>
                        <Card className="border border-slate-200 shadow-sm bg-white">
                            <CardContent className="p-3.5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">In-Stock Units</p>
                                <p className="text-lg font-black text-slate-900 mt-1">{inStockUnits.toLocaleString()}</p>
                                <p className="text-[10px] text-slate-500 mt-1">Total available quantity</p>
                            </CardContent>
                        </Card>
                        <Card className="border border-slate-200 shadow-sm bg-white">
                            <CardContent className="p-3.5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Warehouse Utilization</p>
                                <p className="text-lg font-black text-slate-900 mt-1">{warehouseUtilizationDisplay}</p>
                                <p className="text-[10px] text-slate-500 mt-1">{warehouseUtilizationDetail}</p>
                            </CardContent>
                        </Card>
                        <Card className="border border-slate-200 shadow-sm bg-white">
                            <CardContent className="p-3.5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Paid Order Ratio</p>
                                <p className="text-lg font-black text-slate-900 mt-1">{paidOrderRateDisplay}</p>
                                <p className="text-[10px] text-slate-500 mt-1">{paidOrderRateDetail}</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <QuickActionTiles
                    onAction={onQuickAction}
                    campaignEnabled={campaignEnabled}
                    multiLocationEnabled={multiLocationEnabled}
                />

                {/* Domain Specialized KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {domainKpis.map(kpi => (
                        <DomainMetricCard
                            key={kpi.id}
                            label={kpi.label}
                            value={kpi.value}
                            subValue={kpi.subValue}
                            trend={kpi.trend}
                            icon={kpi.icon}
                            colorClass={kpi.color}
                            className="h-full"
                        />
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:auto-rows-fr">
                    <DomainMetricCard
                        label="Pending Returns"
                        value={periodMetrics.pendingReturns}
                        subValue="Awaiting processing"
                        trend={periodMetrics.pendingReturns > 0 ? -Math.min(periodMetrics.pendingReturns * 2, 20) : 0}
                        icon={Clock}
                        colorClass="bg-amber-500"
                        className="h-full"
                    />
                    <DomainMetricCard
                        label="Coverage Days"
                        value={coverageDays > 365 ? '365+' : coverageDays}
                        subValue="Estimated stock coverage"
                        trend={Number((coverageDays / 10).toFixed(1))}
                        icon={Boxes}
                        colorClass="bg-brand-primary"
                        className="h-full"
                    />
                    <DomainMetricCard
                        label="Stock Check Recency"
                        value={stockCheckRecencyDisplay}
                        subValue={stockCheckRecencyDetail}
                        trend={stockCheckRecencyValue > 30 ? -Math.min(stockCheckRecencyValue / 2, 25) : 4}
                        icon={Warehouse}
                        colorClass="bg-slate-600"
                        className="h-full"
                    />
                </div>

                {/* Analytics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:items-stretch">
                    <div className="lg:col-span-7">
                        <AnalyticsDashboard
                            businessId={activeBusinessId}
                            category={category}
                            chartData={dashboardMetrics?.timeline || []}
                            invoices={invoices}
                            products={products}
                            colors={colors}
                            onQuickAction={onQuickAction}
                        />
                    </div>
                    <div className="lg:col-span-5 space-y-3">
                        <KPIMeter
                            title="Domain Efficiency"
                            value={domainEfficiency}
                            target={95}
                            suffix="%"
                            trendValue={Number(revenueTrendSigned.toFixed(1))}
                            trendLabel="vs previous period"
                        />

                        <Card className="border border-slate-200 shadow-sm bg-white">
                            <CardContent className="p-3.5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Active Customers</p>
                                        <p className="text-base font-black text-slate-900 mt-1">{dashboardMetrics?.customers?.active ?? 0}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cash Flow</p>
                                        <p className="text-base font-black text-slate-900 mt-1">{formatCurrencyCompact(dashboardMetrics?.cashFlow?.current || 0)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:items-stretch">
                    <div className="lg:col-span-8">
                        <PredictivePlanningPortlet businessId={activeBusinessId} domainKnowledge={domainKnowledge} />
                    </div>
                    <div className="lg:col-span-4">
                        <AgenticAuditPortlet businessId={activeBusinessId!} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:items-stretch">
                    <div className="lg:col-span-12">
                        <AgenticAnalystChat businessId={activeBusinessId!} />
                    </div>
                </div>
            </div>

            {/* Sidebar Column (3/12) */}
            <div className="space-y-4 order-2 lg:order-2 lg:col-span-3">
                <RemindersPortlet data={remindersData} onItemClick={onQuickAction} />

                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <h3 className="text-sm font-black text-gray-900">Intelligent Insights</h3>
                    </div>
                    <div className="space-y-3">
                        {intelligentInsights.map((insight, idx) => (
                            <button
                                key={`${insight.title}-${idx}`}
                                onClick={() => onQuickAction?.(insight.actionTab)}
                                aria-label={`${insight.title}. ${insight.text}`}
                                className={cn(
                                    'w-full text-left p-2.5 rounded-xl border transition-all hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/30',
                                    insight.tone === 'indigo' && 'bg-brand-50 border-brand-100 hover:bg-brand-100/50',
                                    insight.tone === 'emerald' && 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50',
                                    insight.tone === 'amber' && 'bg-amber-50 border-amber-100 hover:bg-amber-100/50',
                                    insight.tone === 'rose' && 'bg-rose-50 border-rose-100 hover:bg-rose-100/50',
                                    insight.tone === 'slate' && 'bg-slate-50 border-slate-100 hover:bg-slate-100/60'
                                )}
                            >
                                <p className="text-[11px] font-bold text-slate-700">{insight.title}</p>
                                <p className="text-[10px] text-slate-600 mt-1">{insight.text}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <RecentActivityFeed businessId={activeBusinessId} onViewAll={() => onQuickAction?.('reports')} />
            </div>
        </NetsuiteDashboard>
    );
}
