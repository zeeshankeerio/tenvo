'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Brain, TrendingUp, BarChart3, PieChart, Package,
    AlertTriangle, Sparkles, Target, ShoppingCart, RefreshCcw,
    Lightbulb, Activity, ArrowUpRight, ArrowDownRight, AlertCircle, CircleDot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import {
    getAnalyticsBundleAction,
    getDemandForecastAction,
    getPromotionRecommendationsAction
} from '@/lib/actions/premium/ai/analytics';
import { getAiRestockSuggestionsAction } from '@/lib/actions/premium/ai/ai';

function buildDateFilter(dateRange) {
    if (!dateRange?.from || !dateRange?.to) return {};
    const from = dateRange.from instanceof Date ? dateRange.from.toISOString() : String(dateRange.from);
    const to = dateRange.to instanceof Date ? dateRange.to.toISOString() : String(dateRange.to);
    return { from, to };
}

// --- Metric card ---

function MetricCard({ label, value, trend, trendValue, icon: Icon, color, hint }) {
    const colors = {
        indigo: 'from-indigo-500 to-indigo-600',
        emerald: 'from-emerald-500 to-emerald-600',
        amber: 'from-amber-500 to-amber-600',
        purple: 'from-wine-500 to-wine-600',
        rose: 'from-rose-500 to-rose-600',
        blue: 'from-blue-500 to-blue-600',
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
                <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm', colors[color])}>
                    <Icon className="w-4 h-4 text-white" />
                </div>
                {trend && (
                    <div className={cn(
                        'flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    )}>
                        {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {trendValue}
                    </div>
                )}
            </div>
            <p className="text-xl font-semibold text-gray-900 tracking-tight">{value}</p>
            <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">{label}</p>
            {hint ? (
                <p className="text-[10px] text-gray-500 mt-1 leading-tight font-medium normal-case">{hint}</p>
            ) : null}
        </div>
    );
}

function ForecastRow({ item }) {
    const PriorityIcon = item.priority === 'high' ? AlertCircle : CircleDot;
    return (
        <div className={cn(
            'flex items-center gap-3 p-3 rounded-xl border transition-all',
            item.priority === 'high' ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
        )}>
            <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                item.priority === 'high' ? 'bg-red-200 text-red-700' : 'bg-gray-200 text-gray-600'
            )}>
                <PriorityIcon className="w-4 h-4" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                <p className="text-[10px] text-gray-400">
                    Stock: {item.current}
                    {' � '}
                    Forecast: {item.forecast}/mo
                    {' � '}
                    Recommended: {item.recommended}
                </p>
            </div>
            <div className="text-right shrink-0">
                <p className={cn(
                    'text-xs font-semibold flex items-center justify-end gap-0.5',
                    item.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                )}>
                    {item.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {item.variance} units
                </p>
                {item.isAi && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-wine-100 text-wine-600 font-bold">AI</span>
                )}
            </div>
        </div>
    );
}

// --- Promotion card ---

function PromoCard({ promo, currency }) {
    const strategyColors = {
        Clearance: 'bg-red-50 border-red-200 text-red-700',
        'Volume Booster': 'bg-blue-50 border-blue-200 text-blue-700',
        BOGO: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    };

    return (
        <div className={cn('rounded-xl border p-3', strategyColors[promo.strategy] || 'bg-gray-50 border-gray-200')}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">{promo.strategy}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white/50 rounded">{promo.suggested_discount}</span>
            </div>
            <p className="text-[10px] opacity-80">{promo.reason}</p>
            {promo.potential_revenue > 0 && (
                <p className="text-[10px] font-bold mt-1">Potential: {currency} {Number(promo.potential_revenue).toLocaleString()}</p>
            )}
        </div>
    );
}

// --- Mini bar chart (CSS) ---

function MiniBarChart({ data, valueKey = 'revenue', labelKey = 'date' }) {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1);

    return (
        <div className="flex items-end gap-1.5 h-24">
            {data.map((d, i) => {
                const height = Math.max(4, (d[valueKey] / maxVal) * 100);
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: i * 0.05, duration: 0.4 }}
                            className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400 min-h-[4px]"
                        />
                        <span className="text-[10px] font-bold text-gray-400">{d[labelKey]}</span>
                    </div>
                );
            })}
        </div>
    );
}

export function AIInsightsPanel({ businessId, category = 'retail-shop', dateRange }) {
    const { business, currencySymbol } = useBusiness();
    const effectiveBusinessId = businessId || business?.id;
    const currency = currencySymbol || 'Rs.';

    const [salesTrend, setSalesTrend] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [kpiData, setKpiData] = useState(null);
    const [forecastData, setForecastData] = useState([]);
    const [expenseBreakdown, setExpenseBreakdown] = useState([]);
    const [promos, setPromos] = useState([]);
    const [restockSuggestions, setRestockSuggestions] = useState([]);
    const [productCount, setProductCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const loadAll = useCallback(async () => {
        if (!effectiveBusinessId) return;
        setLoading(true);
        setSalesTrend([]);
        setTopProducts([]);
        setCategories([]);
        setKpiData(null);
        setForecastData([]);
        setExpenseBreakdown([]);
        setPromos([]);
        setRestockSuggestions([]);
        setProductCount(0);
        try {
            const filter = buildDateFilter(dateRange);
            const domainIntel = getDomainKnowledge(category)?.intelligence ?? {};
            const [bundleRes, forecastRes, promoRes, restockRes] = await Promise.allSettled([
                getAnalyticsBundleAction(effectiveBusinessId, filter),
                getDemandForecastAction(effectiveBusinessId, domainIntel, true, filter),
                getPromotionRecommendationsAction(effectiveBusinessId),
                getAiRestockSuggestionsAction(effectiveBusinessId),
            ]);

            if (bundleRes.status === 'fulfilled' && bundleRes.value?.success && bundleRes.value.data) {
                const d = bundleRes.value.data;
                setSalesTrend(d.salesTrend || []);
                setTopProducts(d.topProducts || []);
                setCategories(d.categoryData || []);
                setKpiData(d.kpi || null);
                setExpenseBreakdown(d.expenseBreakdown || []);
                setProductCount(typeof d.productCount === 'number' ? d.productCount : 0);
            }
            if (forecastRes.status === 'fulfilled' && forecastRes.value?.success) setForecastData(forecastRes.value.data || []);
            if (promoRes.status === 'fulfilled' && promoRes.value?.success) setPromos(promoRes.value.data?.recommendations || []);
            if (restockRes.status === 'fulfilled' && restockRes.value?.success) setRestockSuggestions(restockRes.value.suggestions || []);
        } catch (err) {
            console.error('[AI] Load failed:', err);
        } finally {
            setLoading(false);
        }
    }, [effectiveBusinessId, dateRange, category]);

    useEffect(() => {
        void Promise.resolve().then(() => loadAll());
    }, [loadAll]);

    if (loading) {
        return (
            <div className="text-center py-16 text-gray-400">
                <Brain className="w-10 h-10 mx-auto mb-3 opacity-20 animate-pulse" />
                <p className="text-sm font-bold">Loading AI insights...</p>
                <p className="text-xs mt-1">Analyzing business data</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wine-500 to-indigo-600 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">AI Analytics & Insights</h2>
                        <p className="text-xs text-gray-400">Predictive analytics � Anomaly detection � Smart recommendations</p>
                    </div>
                </div>
                <button onClick={loadAll} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                    <RefreshCcw className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* KPI Row */}
            {kpiData && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <MetricCard label="Inventory Asset" value={`${currency} ${(kpiData.inventoryAsset || 0).toLocaleString()}`} icon={Package} color="indigo" />
                    <MetricCard label="Growth" value={kpiData.growth?.value || '0%'} trend={kpiData.growth?.trend} trendValue={kpiData.growth?.value} icon={TrendingUp} color="emerald" />
                    <MetricCard
                        label="Retention"
                        value={kpiData.retention || '0%'}
                        icon={Target}
                        color="amber"
                        hint={
                            kpiData.retentionDetail
                                ? kpiData.retentionDetail.invoicedCustomers === 0
                                    ? 'Link customers on invoices to measure repeat rate'
                                    : `${kpiData.retentionDetail.repeatCustomers} repeat of ${kpiData.retentionDetail.invoicedCustomers} invoiced customers`
                                : undefined
                        }
                    />
                    <MetricCard
                        label="Products"
                        value={String(productCount)}
                        icon={ShoppingCart}
                        color="purple"
                        hint={topProducts.length ? `${topProducts.length} top movers in selected range` : 'Active SKUs in catalog'}
                    />
                    <MetricCard label="Categories" value={categories.length || '0'} icon={PieChart} color="blue" />
                    <MetricCard
                        label="Restock alerts"
                        value={String(restockSuggestions.length)}
                        trend={restockSuggestions.length > 0 ? 'down' : 'up'}
                        trendValue={String(restockSuggestions.length)}
                        icon={AlertTriangle}
                        color="rose"
                        hint="Based on stock-out movements vs AI forecast (see queue below)"
                    />
                </div>
            )}

            {/* Sales Trend + Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Sales Trend */}
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-sm font-semibold text-gray-800">Revenue Trend (6 Months)</h3>
                    </div>
                    <MiniBarChart data={salesTrend} valueKey="revenue" labelKey="date" />
                    {salesTrend.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">No sales data yet</p>
                    )}
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-semibold text-gray-800">Top Products by Revenue</h3>
                    </div>
                    <div className="space-y-2">
                        {topProducts.map((product, idx) => {
                            const maxVal = topProducts[0]?.value || 1;
                            const barWidth = Math.max(10, (product.value / maxVal) * 100);
                            return (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="w-5 text-[10px] font-semibold text-gray-400 shrink-0">#{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-700 truncate">{product.name}</p>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-0.5">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${barWidth}%` }}
                                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                                            />
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-semibold text-gray-600 shrink-0">{currency} {Number(product.value).toLocaleString()}</span>
                                </div>
                            );
                        })}
                        {topProducts.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No product data yet</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Demand forecast (velocity model) */}
            {forecastData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-wine-500" />
                        <h3 className="text-sm font-semibold text-gray-800">Demand forecast & restock signals</h3>
                        <span className="text-[10px] px-1.5 py-0.5 bg-wine-100 text-wine-600 rounded-full font-bold">AI POWERED</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-3">
                        Top items by demand vs stock using invoice and paid storefront history (up to 12). Different from the movement-based restock queue below.
                    </p>
                    <div className="space-y-2">
                        {forecastData.slice(0, 12).map((item) => (
                            <ForecastRow key={item.id || item.name} item={item} />
                        ))}
                    </div>
                </div>
            )}

            {restockSuggestions.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-rose-500" />
                        <h3 className="text-sm font-semibold text-gray-800">Restock queue</h3>
                        <span className="text-[10px] font-bold text-gray-500">({restockSuggestions.length} items)</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-3">
                        Matches the Restock alerts KPI: outbound stock movements vs AI forecasted monthly demand.
                    </p>
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                        {restockSuggestions.map((s) => {
                            const fc =
                                s.forecast?.forecastedQuantity ??
                                s.forecast?.forecasted_quantity ??
                                null;
                            return (
                                <div
                                    key={s.id}
                                    className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50 text-xs"
                                >
                                    <span className="font-bold text-gray-800 truncate flex-1 min-w-[120px]">{s.name}</span>
                                    <span className="text-gray-600">
                                        Stock: <b>{s.stock}</b>
                                    </span>
                                    <span className="text-gray-600">
                                        Forecast: <b>{fc ?? ', '}</b>/mo
                                    </span>
                                    <span
                                        className={cn(
                                            'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded',
                                            s.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                                        )}
                                    >
                                        {s.priority}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Expense Breakdown + AI Promotions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Expense Breakdown */}
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <PieChart className="w-4 h-4 text-rose-500" />
                        <h3 className="text-sm font-semibold text-gray-800">Expense breakdown (selected range)</h3>
                    </div>
                    <div className="space-y-2">
                        {expenseBreakdown.map((exp, idx) => {
                            const colors = ['bg-rose-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-wine-500'];
                            return (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className={cn('w-2 h-2 rounded-full shrink-0', colors[idx % colors.length])} />
                                    <span className="flex-1 text-xs font-semibold text-gray-700 truncate">{exp.name}</span>
                                    <span className="text-xs font-bold text-gray-800">{currency} {Number(exp.value).toLocaleString()}</span>
                                    <span className="text-[10px] text-gray-400 w-8 text-right">{exp.percentage}%</span>
                                </div>
                            );
                        })}
                        {expenseBreakdown.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No expense data for this month</p>
                        )}
                    </div>
                </div>

                {/* AI Promotion Recommendations */}
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-semibold text-gray-800">Smart Promotions</h3>
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full font-bold">AI</span>
                    </div>
                    <div className="space-y-2">
                        {promos.map((promo, idx) => (
                            <PromoCard key={idx} promo={promo} currency={currency} />
                        ))}
                        {promos.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">Add more sales data to unlock AI promotions</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

