import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { IntegratedPerformanceChart } from './charts/IntegratedPerformanceChart.client';
import { DemandForecast } from '@/components/DemandForecast';
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
    /** Same range as Business Overview / workspace filter, passed through to demand forecast. */
    dateRange?: { from: Date; to: Date };
    onQuickAction?: (actionId: string) => void;
}

export function AnalyticsDashboard({
    businessId,
    chartData,
    products,
    invoices,
    colors,
    category,
    dateRange,
    onQuickAction,
}: AnalyticsDashboardProps) {
    const latestInvoiceDate = invoices
        .map((inv) => inv?.date ? new Date(inv.date) : null)
        .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())[0];

    if (!chartData || chartData.length === 0) {
        return (
            <Card className="h-[400px] border border-slate-200 shadow-sm bg-white overflow-hidden">
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
                        <p className="text-2xl font-semibold text-slate-700">Insufficient data for financial trends</p>
                        <p className="text-sm text-slate-500 mt-1">
                            {latestInvoiceDate
                                ? `Latest transaction: ${latestInvoiceDate.toLocaleDateString()}. Add more dated entries to unlock trend lines.`
                                : 'Record dated invoices and transactions to render trend analytics.'}
                        </p>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-2">
                        <button
                            onClick={() => onQuickAction?.('new-invoice')}
                            className="px-3 py-1.5 font-semibold uppercase tracking-wider rounded-lg emerald-600 hover:emerald-700 transition-colors bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            Create Invoice
                        </button>
                        <button
                            onClick={() => onQuickAction?.('new-product')}
                            className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Add Product
                        </button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
        >
            <Tabs defaultValue="visual" className="w-full">
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden border">
                    <CardHeader className="flex flex-row items-center justify-between py-3 px-5 border-b bg-gray-50/30 backdrop-blur-md space-y-0">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <CardTitle className="text-[10px] font-semibold text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <BarChart3 className="w-3.5 h-3.5 text-wine" />
                                    Performance Analytics
                                </CardTitle>
                                <span className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">AI-Enhanced Growth Monitoring</span>
                            </div>

                            <TabsList className="bg-slate-200/40 h-8 p-1 rounded-lg">
                                <TabsTrigger value="visual" className="text-[10px] px-4 h-6 uppercase font-semibold data-[state=active]:bg-white data-[state=active]:text-wine">Trends</TabsTrigger>
                                <TabsTrigger value="predictive" className="text-[10px] px-4 h-6 uppercase font-semibold data-[state=active]:bg-white data-[state=active]:text-wine">Projections</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="hidden md:flex items-center gap-4 border-l border-slate-200 pl-4">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">System Status</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-semibold text-emerald-600 uppercase">Live Intelligence Active</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <TabsContent value="visual" className="m-0 p-4 pt-6">
                            <div className="h-[320px] w-full">
                                <IntegratedPerformanceChart revenueData={chartData} invoices={invoices} colors={colors} />
                            </div>
                        </TabsContent>

                        <TabsContent value="predictive" className="m-0 p-4 overflow-y-auto max-h-[450px]">
                            <DemandForecast
                                businessId={businessId}
                                category={category}
                                products={products}
                                dateRange={dateRange}
                            />
                        </TabsContent>
                    </CardContent>
                </Card>
            </Tabs>
        </motion.div>
    );
}
