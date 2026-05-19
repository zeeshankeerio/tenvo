'use client';

import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3, PieChart, LineChart, Table2, FileText, Download,
    Plus, Trash2, GripVertical, Settings, Filter, Calendar,
    Save, Printer, Mail, ChevronDown, Layers, TrendingUp,
    DollarSign, Package, Users, ShoppingCart, Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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

const DEMO_WIDGETS = [
    { id: 'w1', type: 'kpi', source: 'sales', title: 'Total Revenue', value: '1,245,000', trend: '+12.3%', positive: true, col: 4 },
    { id: 'w2', type: 'kpi', source: 'sales', title: 'Orders', value: '342', trend: '+8.1%', positive: true, col: 4 },
    { id: 'w3', type: 'kpi', source: 'sales', title: 'Avg. Order Value', value: '3,640', trend: '-2.4%', positive: false, col: 4 },
    { id: 'w4', type: 'bar', source: 'sales', title: 'Revenue by Category', col: 6 },
    { id: 'w5', type: 'pie', source: 'inventory', title: 'Stock Distribution', col: 6 },
    { id: 'w6', type: 'table', source: 'sales', title: 'Top 10 Products', col: 12 },
];

function WidgetPreview({ widget, onRemove }) {
    const typeConfig = WIDGET_TYPES.find(w => w.id === widget.type);
    const Icon = typeConfig?.icon || Layers;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
                'group relative bg-white rounded-2xl border-2 border-gray-100 hover:border-indigo-200 transition-all p-4',
                `col-span-${widget.col || 6}`
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
                    <p className="text-3xl font-black text-gray-900">{widget.value || '--'}</p>
                    {widget.trend && (
                        <span className={cn(
                            'text-sm font-bold mt-1 inline-block',
                            widget.positive ? 'text-emerald-600' : 'text-red-500'
                        )}>
                            {widget.trend}
                        </span>
                    )}
                </div>
            )}
            {widget.type === 'bar' && (
                <div className="flex items-end gap-2 h-24 px-4 pt-2">
                    {[65, 45, 80, 55, 90, 70, 50, 85].map((h, i) => (
                        <div key={i} className="flex-1 bg-indigo-100 rounded-t-md hover:bg-indigo-300 transition-colors"
                            style={{ height: `${h}%` }} />
                    ))}
                </div>
            )}
            {widget.type === 'line' && (
                <div className="h-24 flex items-end px-2">
                    <svg viewBox="0 0 200 80" className="w-full h-full" preserveAspectRatio="none">
                        <path d="M0,60 Q30,40 50,50 Q80,20 100,35 Q130,10 160,25 Q180,15 200,20"
                            fill="none" stroke="#6366F1" strokeWidth="2.5" />
                        <path d="M0,60 Q30,40 50,50 Q80,20 100,35 Q130,10 160,25 Q180,15 200,20 L200,80 L0,80 Z"
                            fill="url(#lineGrad)" opacity="0.15" />
                        <defs>
                            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366F1" />
                                <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            )}
            {widget.type === 'pie' && (
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
            )}
            {widget.type === 'table' && (
                <div className="space-y-1">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <div className="h-2 bg-gray-200 rounded flex-1" style={{ width: `${80 - i * 15}%` }} />
                            <div className="h-2 bg-gray-200 rounded w-16" />
                            <div className="h-2 bg-gray-200 rounded w-12" />
                        </div>
                    ))}
                </div>
            )}
            {widget.type === 'summary' && (
                <div className="space-y-2 py-2">
                    {['Revenue', 'Expenses', 'Net Profit'].map((lbl, i) => (
                        <div key={lbl} className="flex justify-between text-sm">
                            <span className={i === 2 ? 'font-black text-gray-900' : 'text-gray-500'}>{lbl}</span>
                            <span className={i === 2 ? 'font-black text-emerald-600' : 'text-gray-700'}>
                                {i === 0 ? '1,245,000' : i === 1 ? '820,000' : '425,000'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

export function ReportBuilder({ businessId, currency = 'Rs.' }) {
    const [widgets, setWidgets] = useState(DEMO_WIDGETS);
    const [showAddWidget, setShowAddWidget] = useState(false);
    const idCounterRef = useRef(1);
    const [reportName, setReportName] = useState('My Custom Report');
    const [dateRange, setDateRange] = useState('30d');
    const [savedReports, setSavedReports] = useState(PRESET_TEMPLATES);
    const [selectedSource, setSelectedSource] = useState('sales');

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

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <Input
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    className="h-10 w-64 text-sm font-bold rounded-xl border-2"
                />

                <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="h-10 text-sm rounded-xl border-2 border-gray-200 px-3 font-medium"
                >
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

                <div className="flex-1" />

                <Button variant="outline" className="h-10 text-xs font-bold rounded-xl border-2" onClick={() => setShowAddWidget(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Widget
                </Button>
                <Button variant="outline" className="h-10 text-xs font-bold rounded-xl border-2">
                    <Download className="w-4 h-4 mr-2" /> Export PDF
                </Button>
                <Button className="h-10 font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Save className="w-4 h-4 mr-2" /> Save Report
                </Button>
            </div>

            {/* Pre-built Templates */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {PRESET_TEMPLATES.map(tpl => (
                    <button
                        key={tpl.id}
                        onClick={() => handleLoadTemplate(tpl)}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left"
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
            <div className="grid grid-cols-12 gap-4 min-h-[400px]">
                <AnimatePresence>
                    {widgets.map(widget => (
                        <WidgetPreview key={widget.id} widget={widget} onRemove={handleRemoveWidget} />
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
                        <DialogTitle className="text-lg font-black">Add Widget</DialogTitle>
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

