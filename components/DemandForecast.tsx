import { useMemo, memo, useState, useEffect } from 'react';
import { getDemandForecastAction } from '@/lib/actions/premium/ai/analytics';
import { Package, Rocket, Info } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BRAND_PRIMARY } from '@/lib/theme/brandTokens';

export type DemandForecastProps = {
    businessId?: string;
    category?: string;
    products?: unknown[];
    invoices?: unknown[];
    domainKnowledge?: { name?: string; intelligence?: Record<string, unknown> } | null;
    dateRange?: { from: Date; to: Date };
};

function buildDateFilter(dateRange: DemandForecastProps['dateRange']) {
    if (!dateRange?.from || !dateRange?.to) return {};
    const from = dateRange.from instanceof Date ? dateRange.from.toISOString() : String(dateRange.from);
    const to = dateRange.to instanceof Date ? dateRange.to.toISOString() : String(dateRange.to);
    return { from, to };
}

type ForecastRow = {
    name?: string;
    current?: number;
    forecast?: number;
    recommended?: number;
    priority?: string;
    insight?: string;
};

/** Narrow `getDomainKnowledge` / prop payloads for forecast + UI without coupling to full domain types */
type DomainKnowledgeSlice = {
    name?: string;
    intelligence?: Record<string, unknown>;
};

export const DemandForecast = memo(function DemandForecast({
    businessId,
    category = 'retail-shop',
    domainKnowledge: propDomainKnowledge,
    dateRange,
    products: _products,
    invoices: _invoices,
}: DemandForecastProps) {
    void _products;
    void _invoices;
    const domainKnowledge = (propDomainKnowledge ?? getDomainKnowledge(category)) as DomainKnowledgeSlice;
    const [forecastData, setForecastData] = useState<ForecastRow[]>([]);
    const [loading, setLoading] = useState(true);

    const rangeFromKey =
        dateRange?.from instanceof Date ? dateRange.from.getTime() : dateRange?.from != null ? String(dateRange.from) : '';
    const rangeToKey =
        dateRange?.to instanceof Date ? dateRange.to.getTime() : dateRange?.to != null ? String(dateRange.to) : '';

    useEffect(() => {
        async function load() {
            if (!businessId) {
                setForecastData([]);
                setLoading(false);
                return;
            }

            try {
                const dk = (propDomainKnowledge ?? getDomainKnowledge(category)) as DomainKnowledgeSlice;
                const intel = dk?.intelligence ?? {};
                const res = await getDemandForecastAction(businessId, intel, true, buildDateFilter(dateRange));
                if (res && res.success) {
                    setForecastData((res.data as ForecastRow[]) || []);
                } else {
                    setForecastData([]);
                }
            } catch (error) {
                console.error('Demand forecast load failed:', error);
                setForecastData([]);
            } finally {
                setLoading(false);
            }
        }
        void load();
    }, [businessId, category, propDomainKnowledge, rangeFromKey, rangeToKey]);

    const chartData = useMemo(
        () =>
            forecastData.slice(0, 5).map((item) => ({
                name: (item.name || 'Product').split(' ')[0],
                current: item.current,
                forecast: item.forecast,
                recommended: item.recommended,
            })),
        [forecastData]
    );

    if (loading) {
        return <div className="p-12 text-center text-gray-400">Loading Forecast Engine...</div>;
    }

    if (!forecastData || forecastData.length === 0) {
        return (
            <Card className="border-dashed border-2 bg-gray-50/50">
                <CardContent className="flex flex-col items-center justify-center p-12 text-gray-400">
                    <Package className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-medium">No sales history available for forecasting logic.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Demand Forecast</h2>
                    <p className="text-gray-500 font-medium">
                        AI-powered predictive modeling for {domainKnowledge?.name || 'Inventory'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1 font-bold text-wine border-wine/20 bg-wine/5">
                        <Rocket className="w-3 h-3 mr-1" />
                        V3 Prediction Engine
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {forecastData.slice(0, 6).map((item, idx) => (
                    <Card
                        key={idx}
                        className={`group hover:shadow-xl transition-all duration-300 border-wine/10 overflow-hidden ${
                            item.priority === 'high' ? 'ring-2 ring-wine/20' : ''
                        }`}
                    >
                        <CardHeader className="pb-2 space-y-0 px-3 pt-3">
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-[11px] font-[900] truncate uppercase tracking-tight text-slate-800">
                                    {item.name}
                                </CardTitle>
                                <Badge
                                    variant={item.priority === 'high' ? 'destructive' : 'secondary'}
                                    className="text-[10px] py-0 px-1 font-semibold uppercase"
                                >
                                    {item.priority === 'high' ? 'Critical' : 'Stable'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                            <div className="space-y-2">
                                <div className="flex justify-between items-end border-b border-slate-50 pb-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Stock</span>
                                    <span className="font-semibold text-xs text-slate-900">
                                        {item.current}{' '}
                                        <span className="text-[10px] font-medium text-slate-400">units</span>
                                    </span>
                                </div>
                                <div className="flex justify-between items-end border-b border-slate-50 pb-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI Forecast (30D)</span>
                                    <span className="font-semibold text-xs text-wine">{item.forecast}</span>
                                </div>
                                {item.insight && (
                                    <div
                                        className={cn(
                                            'p-2 rounded-lg text-[10px] font-bold flex items-start gap-2 leading-tight mt-1',
                                            item.priority === 'high' ? 'bg-red-50 text-red-700' : 'bg-wine/5 text-wine'
                                        )}
                                    >
                                        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                        <span>{item.insight}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-wine/20 shadow-2xl bg-white/50 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-semibold text-wine">Market Trend Projection</CardTitle>
                        <CardDescription className="font-medium text-gray-500">
                            Visualizing stock vs predicted demand variance
                        </CardDescription>
                    </div>
                    <div className="flex gap-4 text-xs font-bold">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-wine" /> Stock
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-wine/30" /> Forecast
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" /> Recommended
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={BRAND_PRIMARY} stopOpacity={0.12} />
                                        <stop offset="95%" stopColor={BRAND_PRIMARY} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 600 }}
                                    dy={10}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 600 }} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                        fontWeight: 700,
                                    }}
                                    cursor={{ stroke: BRAND_PRIMARY, strokeWidth: 2, strokeDasharray: '5 5' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="current"
                                    stroke={BRAND_PRIMARY}
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorCurrent)"
                                    name="Current Stock"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="forecast"
                                    stroke="#c49c3b"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    fill="transparent"
                                    name="Forecast"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="recommended"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fill="transparent"
                                    name="Recommended"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
});
