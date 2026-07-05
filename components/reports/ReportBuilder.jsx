'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3, PieChart, LineChart, Table2, FileText, Download,
    Plus, Trash2, GripVertical, Save, Layers, TrendingUp,
    DollarSign, Package, Users, ShoppingCart, Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getAnalyticsBundleAction } from '@/lib/actions/premium/ai/analytics';
import { formatCurrency } from '@/lib/currency';

const REPORT_BUILDER_STORAGE_PREFIX = 'tenvo_report_builder_v1_';

function buildDateFilter(dr) {
    if (!dr?.from || !dr?.to) return {};
    const from = dr.from instanceof Date ? dr.from.toISOString() : String(dr.from);
    const to = dr.to instanceof Date ? dr.to.toISOString() : String(dr.to);
    return { from, to };
}

/** @param {unknown} v @returns {string|null} */
function isoDateOnly(v) {
    if (v == null || v === '') return null;
    const s = v instanceof Date ? v.toISOString() : String(v);
    return s.slice(0, 10);
}

/** @param {string} isoYYYY-MM-DD @param {number} deltaDays */
function addDaysUtc(isoYYYYMMdd, deltaDays) {
    const d = new Date(`${isoYYYYMMdd}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + deltaDays);
    return d.toISOString().slice(0, 10);
}

/**
 * Map report toolbar preset ? { from, to } ISO strings for getAnalyticsBundleAction.
 * Presets anchor on the dashboard header `to` date (or today).
 * @param {{ from?: unknown; to?: unknown } | null | undefined} dashboardDateRange
 * @param {string} reportWindow
 */
function mergeReportWindowFilter(dashboardDateRange, reportWindow) {
    if (reportWindow === 'header' || reportWindow === 'custom') {
        return buildDateFilter(dashboardDateRange);
    }
    const endStr = isoDateOnly(dashboardDateRange?.to) || isoDateOnly(new Date());
    let fromStr;
    let toStr = endStr;

    switch (reportWindow) {
        case 'today':
            fromStr = endStr;
            toStr = endStr;
            break;
        case 'yesterday': {
            toStr = addDaysUtc(endStr, -1);
            fromStr = toStr;
            break;
        }
        case '7d':
            fromStr = addDaysUtc(endStr, -6);
            toStr = endStr;
            break;
        case '30d':
            fromStr = addDaysUtc(endStr, -29);
            toStr = endStr;
            break;
        case '90d':
            fromStr = addDaysUtc(endStr, -89);
            toStr = endStr;
            break;
        case 'mtd': {
            const end = new Date(`${endStr}T12:00:00.000Z`);
            fromStr = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1, 12)).toISOString().slice(0, 10);
            toStr = endStr;
            break;
        }
        case 'ytd': {
            const end = new Date(`${endStr}T12:00:00.000Z`);
            fromStr = new Date(Date.UTC(end.getUTCFullYear(), 0, 1, 12)).toISOString().slice(0, 10);
            toStr = endStr;
            break;
        }
        case 'last_month': {
            const end = new Date(`${endStr}T12:00:00.000Z`);
            const firstThis = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1, 12));
            const lastPrev = new Date(firstThis);
            lastPrev.setUTCDate(0);
            const fy = lastPrev.getUTCFullYear();
            const fm = lastPrev.getUTCMonth();
            fromStr = new Date(Date.UTC(fy, fm, 1, 12)).toISOString().slice(0, 10);
            toStr = lastPrev.toISOString().slice(0, 10);
            break;
        }
        case 'this_quarter': {
            const end = new Date(`${endStr}T12:00:00.000Z`);
            const m = end.getUTCMonth();
            const qStartMonth = Math.floor(m / 3) * 3;
            fromStr = new Date(Date.UTC(end.getUTCFullYear(), qStartMonth, 1, 12)).toISOString().slice(0, 10);
            toStr = endStr;
            break;
        }
        default:
            return buildDateFilter(dashboardDateRange);
    }

    if (fromStr > toStr) {
        const t = fromStr;
        fromStr = toStr;
        toStr = t;
    }

    return {
        from: `${fromStr}T00:00:00.000Z`,
        to: `${toStr}T23:59:59.999Z`,
    };
}

function reportStorageKey(businessId) {
    return `${REPORT_BUILDER_STORAGE_PREFIX}${businessId || 'anon'}`;
}

function loadSavedReports(businessId) {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(reportStorageKey(businessId));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function persistSavedReports(businessId, reports) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(reportStorageKey(businessId), JSON.stringify(reports.slice(0, 20)));
    } catch {
        /* quota */
    }
}

const DATA_SOURCES = [
    { id: 'sales', label: 'Sales & Revenue', icon: DollarSign, color: 'bg-emerald-500' },
    { id: 'inventory', label: 'Inventory & Stock', icon: Package, color: 'bg-blue-500' },
    { id: 'customers', label: 'Customers', icon: Users, color: 'bg-wine-500' },
    { id: 'expenses', label: 'Expenses', icon: TrendingUp, color: 'bg-orange-500' },
    { id: 'purchases', label: 'Purchases', icon: ShoppingCart, color: 'bg-indigo-500' },
];

const WIDGET_TYPES = [
    { id: 'kpi', label: 'KPI Card', icon: Layers, description: 'Single metric with trend' },
    { id: 'bar', label: 'Bar Chart', icon: BarChart3, description: 'Category comparison' },
    { id: 'line', label: 'Line Chart', icon: LineChart, description: 'Trend over time' },
    { id: 'pie', label: 'Pie Chart', icon: PieChart, description: 'Distribution breakdown' },
    { id: 'table', label: 'Data Table', icon: Table2, description: 'Detailed rows & columns' },
    { id: 'summary', label: 'Summary Row', icon: FileText, description: 'Aggregate totals' },
];

const PRESET_TEMPLATES = [
    {
        id: 'daily_sales', name: 'Daily Sales Summary', source: 'sales', widgets: ['kpi', 'bar', 'table'],
        description: 'Revenue, transaction count, and top products for the day'
    },
    {
        id: 'inventory_val', name: 'Inventory Valuation', source: 'inventory', widgets: ['kpi', 'pie', 'table'],
        description: 'Total value, category breakdown, and low-stock items'
    },
    {
        id: 'customer_ltv', name: 'Customer Lifetime Value', source: 'customers', widgets: ['kpi', 'line', 'table'],
        description: 'Top customers by value, repeat purchase rate, and segments'
    },
    {
        id: 'pnl', name: 'Profit & Loss Statement', source: 'sales', widgets: ['kpi', 'bar', 'summary'],
        description: 'Revenue, COGS, gross profit, expenses, and net income'
    },
    {
        id: 'expense_report', name: 'Expense Report', source: 'expenses', widgets: ['kpi', 'pie', 'table'],
        description: 'Category breakdown, vendor spend, and trends'
    },
];

function WidgetPreview({ widget, onRemove, liveSnapshot, currency }) {
    const typeConfig = WIDGET_TYPES.find(w => w.id === widget.type);
    const Icon = typeConfig?.icon || Layers;
    const lineGradId = `lineGrad-${widget.id}`;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
                'group relative rounded-2xl border-2 border-gray-100 bg-white p-4 transition-all hover:border-indigo-200',
                'max-lg:col-span-full'
            )}
            style={{ gridColumn: `span ${widget.col || 6}` }}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                    <Icon className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-bold text-gray-800">{widget.title}</span>
                </div>
                <button
                    onClick={() => onRemove(widget.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50"
                >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
            </div>

            {widget.type === 'kpi' && (
                <div className="text-center py-4">
                    <p className="text-3xl font-semibold text-gray-900">{widget.value || '--'}</p>
                    {widget.trend && (
                        <span className={cn(
                            'text-sm font-bold mt-1 inline-block',
                            widget.positive ? 'text-emerald-600' : 'text-red-500'
                        )}>
                            {widget.trend}
                        </span>
                    )}
                    {liveSnapshot?.kpi ? (
                        <p className="text-[10px] text-gray-500 mt-2 font-medium">
                            Live: growth {liveSnapshot.kpi.growth?.value ?? ', '} � 6-mo revenue {formatCurrency(liveSnapshot.trailingRevenue || 0, currency)}
                        </p>
                    ) : null}
                </div>
            )}
            {widget.type === 'bar' && (
                <div>
                    <p className="text-[10px] text-gray-400 mb-2">Chart layout preview, open Analytics for full revenue charts.</p>
                    <div className="flex items-end gap-2 h-24 px-4 pt-2">
                        {[65, 45, 80, 55, 90, 70, 50, 85].map((h, i) => (
                            <div key={i} className="flex-1 bg-indigo-100 rounded-t-md hover:bg-indigo-300 transition-colors"
                                style={{ height: `${h}%` }} />
                        ))}
                    </div>
                </div>
            )}
            {widget.type === 'line' && (
                <div>
                    <p className="text-[10px] text-gray-400 mb-1 px-2">Trend preview, live monthly series is in Analytics.</p>
                    <div className="h-24 flex items-end px-2">
                        <svg viewBox="0 0 200 80" className="w-full h-full" preserveAspectRatio="none">
                            <path d="M0,60 Q30,40 50,50 Q80,20 100,35 Q130,10 160,25 Q180,15 200,20"
                                fill="none" stroke="#6366F1" strokeWidth="2.5" />
                            <path d="M0,60 Q30,40 50,50 Q80,20 100,35 Q130,10 160,25 Q180,15 200,20 L200,80 L0,80 Z"
                                fill={`url(#${lineGradId})`} opacity="0.15" />
                            <defs>
                                <linearGradient id={lineGradId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366F1" />
                                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>
            )}
            {widget.type === 'pie' && (
                <div>
                    <p className="text-[10px] text-gray-400 mb-2 text-center">Composition preview, category pie uses the same bundle in Analytics.</p>
                    <div className="flex items-center justify-center h-24">
                        <svg viewBox="0 0 100 100" className="w-20 h-20">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#E0E7FF" strokeWidth="20" />
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#6366F1" strokeWidth="20"
                                strokeDasharray="100 251" strokeDashoffset="0" transform="rotate(-90 50 50)" />
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#818CF8" strokeWidth="20"
                                strokeDasharray="70 251" strokeDashoffset="-100" transform="rotate(-90 50 50)" />
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#C7D2FE" strokeWidth="20"
                                strokeDasharray="81 251" strokeDashoffset="-170" transform="rotate(-90 50 50)" />
                        </svg>
                    </div>
                </div>
            )}
            {widget.type === 'table' && (
                liveSnapshot?.topProducts?.length ? (
                    <div className="space-y-1 max-h-36 overflow-y-auto text-left">
                        {liveSnapshot.topProducts.slice(0, 12).map((p, i) => (
                            <div key={`${p.name}-${i}`} className="flex justify-between gap-2 p-2 bg-gray-50 rounded-lg text-[10px]">
                                <span className="font-semibold text-gray-800 truncate">{p.name}</span>
                                <span className="shrink-0 font-bold text-gray-700">{formatCurrency(Number(p.value) || 0, currency)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[10px] text-gray-400 text-center py-3">No table rows for this window, add sales or widen the report range.</p>
                )
            )}
            {widget.type === 'summary' && (
                <div className="space-y-2 py-2">
                    {liveSnapshot?.kpi ? (
                        <>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Range revenue</span>
                                <span className="font-bold text-gray-800">
                                    {formatCurrency(Number(liveSnapshot.kpi.growthDetail?.periodRevenue) || 0, currency)}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">6-mo revenue (chart series)</span>
                                <span className="font-bold text-gray-800">
                                    {formatCurrency(Number(liveSnapshot.trailingRevenue) || 0, currency)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                                <span className="font-semibold text-gray-900">6-mo GL profit (net)</span>
                                <span className="font-semibold text-emerald-600">
                                    {formatCurrency(Number(liveSnapshot.trailingProfit) || 0, currency)}
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            {['Revenue', 'Expenses', 'Net profit'].map((lbl, i) => (
                                <div key={lbl} className="flex justify-between text-sm">
                                    <span className={i === 2 ? 'font-semibold text-gray-900' : 'text-gray-500'}>{lbl}</span>
                                    <span className={i === 2 ? 'font-semibold text-emerald-600' : 'text-gray-700'}>, </span>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </motion.div>
    );
}

export function ReportBuilder({ businessId, currency = 'PKR', dateRange: dashboardDateRange }) {
    const [widgets, setWidgets] = useState([]);
    const [showAddWidget, setShowAddWidget] = useState(false);
    const idCounterRef = useRef(1);
    const [reportName, setReportName] = useState('My Custom Report');
    const [reportWindow, setReportWindow] = useState('header');
    const [selectedSource, setSelectedSource] = useState('sales');
    const [liveSnapshot, setLiveSnapshot] = useState(null);
    const [savedLayouts, setSavedLayouts] = useState([]);

    useEffect(() => {
        void Promise.resolve().then(() => {
            if (businessId && typeof window !== 'undefined') {
                setSavedLayouts(loadSavedReports(businessId));
            }
        });
    }, [businessId]);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            if (!businessId) {
                if (!cancelled) setLiveSnapshot(null);
                return;
            }
            try {
                const filter = mergeReportWindowFilter(dashboardDateRange, reportWindow);
                const bundle = await getAnalyticsBundleAction(businessId, filter);
                if (cancelled) return;
                if (bundle.success && bundle.data) {
                    const months = bundle.data.salesTrend || [];
                    const trailingRevenue = months.reduce((s, m) => s + (Number(m.revenue) || 0), 0);
                    const trailingProfit = months.reduce((s, m) => s + (Number(m.profit) || 0), 0);
                    setLiveSnapshot({
                        kpi: bundle.data.kpi,
                        trailingRevenue,
                        trailingProfit,
                        topProducts: bundle.data.topProducts || [],
                        appliedRange: bundle.data.range,
                    });
                } else if (!cancelled) {
                    setLiveSnapshot(null);
                }
            } catch {
                if (!cancelled) setLiveSnapshot(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [businessId, dashboardDateRange, reportWindow]);

    const handleAddWidget = (type) => {
        const newWidget = {
            id: `w-${idCounterRef.current++}`,
            type: type.id,
            source: selectedSource,
            title: `${type.label} -- ${DATA_SOURCES.find(s => s.id === selectedSource)?.label || 'Data'}`,
            col: type.id === 'kpi' ? 4 : type.id === 'table' || type.id === 'summary' ? 12 : 6,
            value: type.id === 'kpi' ? '--' : undefined,
        };
        setWidgets(prev => [...prev, newWidget]);
        setShowAddWidget(false);
    };

    const handleRemoveWidget = (id) => {
        setWidgets(prev => prev.filter(w => w.id !== id));
    };

    const handleLoadTemplate = (template) => {
        const generated = template.widgets.map((wType, idx) => ({
            id: `tpl-${template.id}-${idx}-${idCounterRef.current++}`,
            type: wType,
            source: template.source,
            title: `${WIDGET_TYPES.find(t => t.id === wType)?.label || wType} -- ${template.name}`,
            col: wType === 'kpi' ? 4 : wType === 'table' || wType === 'summary' ? 12 : 6,
            value: wType === 'kpi' ? '--' : undefined,
        }));
        setWidgets(generated);
        setReportName(template.name);
    };

    const handleSaveLayout = () => {
        if (!businessId || typeof window === 'undefined') return;
        const trimmed = reportName.trim() || 'Untitled report';
        const entry = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `r-${Date.now()}`,
            name: trimmed,
            widgets,
            reportWindow,
            updatedAt: new Date().toISOString(),
        };
        const list = loadSavedReports(businessId);
        const next = [entry, ...list.filter((x) => x.name !== trimmed)].slice(0, 20);
        persistSavedReports(businessId, next);
        setSavedLayouts(next);
    };

    const handleLoadSaved = (e) => {
        const id = e.target.value;
        if (!id) return;
        const entry = savedLayouts.find((x) => x.id === id);
        if (!entry) return;
        setWidgets(entry.widgets || []);
        setReportName(entry.name || 'My Custom Report');
        if (entry.reportWindow) setReportWindow(entry.reportWindow);
        e.target.value = '';
    };

    const handleExportJson = () => {
        if (typeof window === 'undefined') return;
        const payload = {
            reportName,
            reportWindow,
            widgets,
            businessId,
            exportedAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(reportName || 'report').replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportTopProductsCsv = () => {
        if (typeof window === 'undefined' || !liveSnapshot?.topProducts?.length) return;
        const rows = [['Product', 'Revenue', 'Units'], ...liveSnapshot.topProducts.map((p) => [p.name || '', p.value ?? '', p.volume ?? ''])];
        const esc = (c) => `"${String(c).replace(/"/g, '""')}"`;
        const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(reportName || 'top-products').replace(/\s+/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-w-0 space-y-6 overflow-x-hidden">
            {businessId && liveSnapshot?.kpi && (
                <Card className="border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-white shadow-sm">
                    <CardHeader className="py-3 px-4">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                            Live business snapshot (same data as Analytics tab)
                        </CardTitle>
                        {liveSnapshot.appliedRange?.from && liveSnapshot.appliedRange?.to && (
                            <p className="text-[10px] text-emerald-700/80 mt-1 font-medium">
                                Range: {liveSnapshot.appliedRange.from} ? {liveSnapshot.appliedRange.to}
                                {reportWindow !== 'header' && reportWindow !== 'custom' ? ' (report preset)' : ''}
                            </p>
                        )}
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pb-4">
                        <div className="rounded-xl bg-white/80 border border-emerald-100 p-3">
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Inventory asset</p>
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(liveSnapshot.kpi.inventoryAsset || 0, currency)}</p>
                        </div>
                        <div className="rounded-xl bg-white/80 border border-emerald-100 p-3">
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Growth (range vs prior)</p>
                            <p className="text-sm font-semibold text-gray-900">{liveSnapshot.kpi.growth?.value ?? ', '}</p>
                        </div>
                        <div className="rounded-xl bg-white/80 border border-emerald-100 p-3">
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Repeat customers</p>
                            <p className="text-sm font-semibold text-gray-900">{liveSnapshot.kpi.retention ?? ', '}</p>
                            {liveSnapshot.kpi.retentionDetail && (
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                    {liveSnapshot.kpi.retentionDetail.repeatCustomers} / {liveSnapshot.kpi.retentionDetail.invoicedCustomers} invoiced
                                </p>
                            )}
                        </div>
                        <div className="rounded-xl bg-white/80 border border-emerald-100 p-3">
                            <p className="text-[10px] font-bold text-gray-500 uppercase">6-mo revenue (invoices + storefront)</p>
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(liveSnapshot.trailingRevenue || 0, currency)}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">GL profit (6 mo): {formatCurrency(liveSnapshot.trailingProfit || 0, currency)}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {businessId && (
                <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-muted/30 p-3">
                    <Button type="button" variant="outline" size="sm" className="h-9 flex-1 text-xs font-bold sm:flex-none" onClick={handleSaveLayout}>
                        Save layout
                    </Button>
                    <select
                        className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-xs font-semibold sm:min-w-[140px] sm:flex-none"
                        defaultValue=""
                        onChange={handleLoadSaved}
                        aria-label="Load saved report layout"
                    >
                        <option value="">Load saved…</option>
                        {savedLayouts.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <Button type="button" variant="outline" size="sm" className="h-9 flex-1 text-xs font-bold sm:flex-none" onClick={handleExportJson}>
                        Export JSON
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-full text-xs font-bold sm:w-auto"
                        disabled={!liveSnapshot?.topProducts?.length}
                        onClick={handleExportTopProductsCsv}
                    >
                        Top products CSV
                    </Button>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
                <Input
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    className="h-10 w-full rounded-xl border-2 text-sm font-bold lg:w-64"
                />

                <select
                    value={reportWindow}
                    onChange={(e) => setReportWindow(e.target.value)}
                    className="h-10 w-full rounded-xl border-2 border-gray-200 px-3 text-sm font-medium lg:w-auto"
                >
                    <option value="header">Match header</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="mtd">This Month</option>
                    <option value="this_quarter">This Quarter</option>
                    <option value="last_month">Last Month</option>
                    <option value="ytd">Year to Date</option>
                    <option value="custom">Custom Range</option>
                </select>

                <div className="flex flex-wrap gap-2 lg:ml-auto">
                <Button variant="outline" className="h-10 flex-1 rounded-xl border-2 text-xs font-bold sm:flex-none" onClick={() => setShowAddWidget(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Widget
                </Button>
                <Button variant="outline" className="h-10 flex-1 rounded-xl border-2 text-xs font-bold sm:flex-none" type="button" title="PDF export coming soon" disabled>
                    <Download className="w-4 h-4 mr-2" /> Export PDF
                </Button>
                <Button className="h-10 flex-1 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 sm:flex-none" type="button" onClick={handleSaveLayout}>
                    <Save className="w-4 h-4 mr-2" /> Save report
                </Button>
                </div>
            </div>

            {/* Pre-built Templates */}
            <div className="flex min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2 snap-x snap-mandatory scrollbar-none">
                {PRESET_TEMPLATES.map(tpl => (
                    <button
                        key={tpl.id}
                        onClick={() => handleLoadTemplate(tpl)}
                        className="flex w-[min(100%,18rem)] shrink-0 snap-start items-center gap-2 rounded-xl border-2 border-gray-100 bg-white px-4 py-2 text-left transition-all hover:border-indigo-200 hover:bg-indigo-50"
                    >
                        <Database className="w-4 h-4 text-indigo-500" />
                        <div>
                            <p className="text-xs font-bold text-gray-800">{tpl.name}</p>
                            <p className="text-[10px] text-gray-400">{tpl.description}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Report Canvas */}
            <div className="grid min-h-[400px] grid-cols-1 gap-4 lg:grid-cols-12">
                <AnimatePresence>
                    {widgets.map((widget) => (
                        <WidgetPreview
                            key={widget.id}
                            widget={widget}
                            onRemove={handleRemoveWidget}
                            liveSnapshot={liveSnapshot}
                            currency={currency}
                        />
                    ))}
                </AnimatePresence>

                {widgets.length === 0 && (
                    <div className="col-span-12 flex flex-col items-center justify-center py-20 text-center">
                        <BarChart3 className="w-12 h-12 text-gray-200 mb-4" />
                        <h3 className="text-lg font-bold text-gray-400">No Widgets Added</h3>
                        <p className="text-sm text-gray-300 mt-1">Click &quot;Add Widget&quot; or select a template to get started</p>
                    </div>
                )}
            </div>

            {/* Add Widget Dialog */}
            <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
                <DialogContent className="sm:max-w-lg rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Add Widget</DialogTitle>
                        <DialogDescription>Choose a data source and widget type to add to your report.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                        <div>
                            <Label className="text-xs font-bold text-gray-600 mb-2 block">Data Source</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {DATA_SOURCES.map(src => (
                                    <button
                                        key={src.id}
                                        onClick={() => setSelectedSource(src.id)}
                                        className={cn(
                                            'flex items-center gap-2 p-2.5 rounded-xl text-left transition-all border-2',
                                            selectedSource === src.id
                                                ? 'border-indigo-300 bg-indigo-50'
                                                : 'border-gray-100 hover:border-gray-200'
                                        )}
                                    >
                                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white', src.color)}>
                                            <src.icon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-700">{src.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-bold text-gray-600 mb-2 block">Widget Type</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {WIDGET_TYPES.map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => handleAddWidget(type)}
                                        className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left"
                                    >
                                        <type.icon className="w-5 h-5 text-indigo-500" />
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">{type.label}</p>
                                            <p className="text-[10px] text-gray-400">{type.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

