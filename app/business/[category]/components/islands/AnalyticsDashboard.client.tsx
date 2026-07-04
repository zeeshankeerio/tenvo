'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { IntegratedPerformanceChart } from './charts/IntegratedPerformanceChart.client';
import { DemandForecast } from '@/components/DemandForecast';
import { PredictivePlanningPortlet } from './portlets/PredictivePlanningPortlet.client';
import { AgenticAuditPortlet } from './portlets/AgenticAuditPortlet.client';
import { VisualAnalyticsPanel } from './VisualAnalyticsPanel.client';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3 } from 'lucide-react';

interface ProductLike {
    id?: string | number;
}

interface InvoiceLike {
    id?: string | number;
    customer_id?: string | number | null;
    status?: string;
    date?: string | Date;
}

interface ChartPoint {
    [key: string]: unknown;
}

interface AnalyticsDashboardProps {
    businessId?: string;
    chartData: ChartPoint[];
    products: ProductLike[];
    invoices: InvoiceLike[];
    colors?: Record<string, unknown>;
    category?: string;
    currency?: string;
    business?: { name?: string; country?: string; settings?: Record<string, unknown> } | null;
    domainKnowledge?: unknown;
    /** Same range as Business Overview / workspace filter, passed through to demand forecast. */
    dateRange?: { from: Date; to: Date };
    onQuickAction?: (actionId: string) => void;
}

const TAB_HINTS: Record<string, string> = {
    visual: 'Revenue and order trend for the selected period.',
    predictive: 'Forward-looking demand based on recent sales patterns.',
    studio: 'Multi-chart view tailored to your business vertical.',
    planning: 'SKU-level restock guidance with confidence scores.',
    audit: 'Run an integrity scan for stock and financial anomalies.',
};

export function AnalyticsDashboard({
    businessId,
    chartData,
    products,
    invoices,
    colors,
    category,
    currency = 'PKR',
    business,
    domainKnowledge,
    dateRange,
    onQuickAction,
}: AnalyticsDashboardProps) {
    const latestInvoiceDate = invoices
        .map((inv) => inv?.date ? new Date(inv.date) : null)
        .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())[0];

    const emptyState = (
        <Card className="h-[360px] border border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-5 border-b bg-gray-50/40 space-y-0">
                <div>
                    <CardTitle className="text-[10px] font-semibold text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 text-wine" />
                        Performance Analytics
                    </CardTitle>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">Awaiting sufficient period data</p>
                </div>
            </CardHeader>

            <CardContent className="p-4 h-[calc(100%-52px)] flex flex-col justify-between">
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center mt-2">
                    <BarChart3 className="w-9 h-9 mx-auto text-slate-300 mb-3" />
                    <p className="text-lg font-semibold text-slate-700">Insufficient data for financial trends</p>
                    <p className="text-sm text-slate-500 mt-1">
                        {latestInvoiceDate
                            ? `Latest transaction: ${latestInvoiceDate.toLocaleDateString()}. Add more dated entries to unlock trend lines.`
                            : 'Record dated invoices and transactions to render trend analytics.'}
                    </p>
                </div>

                <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => onQuickAction?.('new-invoice')}
                        className="px-3 py-1.5 font-semibold uppercase tracking-wider rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]"
                    >
                        Create Invoice
                    </button>
                    <button
                        type="button"
                        onClick={() => onQuickAction?.('new-product')}
                        className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Add Product
                    </button>
                </div>
            </CardContent>
        </Card>
    );

    const hasTrendData = chartData && chartData.length > 0;
    const [activeTab, setActiveTab] = useState('studio');

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
        >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/20 to-white shadow-md">
                    <CardHeader className="flex flex-col gap-3 py-3.5 px-4 sm:px-5 border-b border-slate-100 bg-gradient-to-r from-violet-50/30 via-white to-cyan-50/30 space-y-0">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-col min-w-0">
                                <CardTitle className="text-[10px] font-semibold text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <BarChart3 className="w-3.5 h-3.5 text-wine" />
                                    Performance Analytics
                                </CardTitle>
                                <span className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                                    Trends · projections · visual studio · AI planning
                                </span>
                            </div>

                            <div className="flex items-center gap-3 border-l-0 lg:border-l lg:border-slate-200 lg:pl-4">
                                <div className="hidden md:flex flex-col items-end">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">System Status</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-semibold text-emerald-600 uppercase">Live Intelligence Active</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <TabsList className="bg-slate-100/90 h-auto p-1 rounded-xl border border-slate-200/70 flex flex-wrap gap-1 w-full sm:w-auto">
                            <TabsTrigger value="visual" className="text-[10px] px-3 h-7 rounded-lg uppercase font-semibold data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">
                                Trends
                            </TabsTrigger>
                            <TabsTrigger value="predictive" className="text-[10px] px-3 h-7 rounded-lg uppercase font-semibold data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">
                                Projections
                            </TabsTrigger>
                            <TabsTrigger value="studio" className="text-[10px] px-3 h-7 rounded-lg uppercase font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-md">
                                Visual Studio
                            </TabsTrigger>
                            <TabsTrigger value="planning" className="text-[10px] px-3 h-7 rounded-lg uppercase font-semibold data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">
                                AI Planning
                            </TabsTrigger>
                            <TabsTrigger value="audit" className="text-[10px] px-3 h-7 rounded-lg uppercase font-semibold data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">
                                Integrity
                            </TabsTrigger>
                        </TabsList>
                        <p className="text-[10px] text-slate-500 leading-snug">
                            {TAB_HINTS[activeTab] ?? 'Analytics for the selected workspace period.'}
                        </p>
                    </CardHeader>

                    <CardContent className="p-0">
                        <TabsContent value="visual" className="m-0 p-4 pt-5">
                            {hasTrendData ? (
                                <div className="h-[320px] w-full">
                                    <IntegratedPerformanceChart revenueData={chartData} invoices={invoices} colors={colors} />
                                </div>
                            ) : (
                                emptyState
                            )}
                        </TabsContent>

                        <TabsContent value="predictive" className="m-0 p-4 overflow-y-auto max-h-[480px]">
                            <DemandForecast
                                businessId={businessId}
                                category={category}
                                products={products}
                                dateRange={dateRange}
                            />
                        </TabsContent>

                        <TabsContent value="studio" className="m-0 p-4 pt-5">
                            <VisualAnalyticsPanel
                                businessId={businessId}
                                category={category}
                                business={business}
                                domainKnowledge={domainKnowledge as Record<string, unknown> | null}
                                dateRange={dateRange}
                                currency={currency}
                            />
                        </TabsContent>

                        <TabsContent value="planning" className="m-0 p-4 pt-2">
                            <PredictivePlanningPortlet
                                businessId={businessId}
                                domainKnowledge={domainKnowledge}
                                dateRange={dateRange}
                                layout="compact"
                            />
                        </TabsContent>

                        <TabsContent value="audit" className="m-0 p-4 pt-2">
                            <AgenticAuditPortlet businessId={businessId} compact />
                        </TabsContent>
                    </CardContent>
                </Card>
            </Tabs>
        </motion.div>
    );
}
