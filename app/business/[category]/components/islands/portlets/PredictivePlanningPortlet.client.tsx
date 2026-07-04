'use client';

import { useState, memo, useEffect } from 'react';
import { Portlet } from '@/components/ui/portlet';
import { Sparkles, TrendingUp, TrendingDown, Info, ShoppingCart } from 'lucide-react';
import { getDemandForecastAction } from '@/lib/actions/premium/ai/analytics';
import { cn } from '@/lib/utils';

interface DemandForecastItem {
    id: string;
    name: string;
    sku: string;
    current: number;
    forecast: number;
    recommended: number;
    confidence: number;
    insight: string;
    isAi: boolean;
    trend: 'up' | 'down';
    priority: 'high' | 'normal';
    variance: number;
}

interface PredictivePlanningPortletProps {
    businessId?: string;
    /** Business / domain context; `intelligence` is passed to the forecast action when set. */
    domainKnowledge?: unknown;
    dateRange?: { from: Date; to: Date };
    layout?: 'cards' | 'compact';
}

function normalizeForecastRow(raw: Record<string, unknown>): DemandForecastItem {
    const trend = raw.trend === 'down' ? 'down' : 'up';
    return {
        id: String(raw.id ?? ''),
        name: String(raw.name ?? ''),
        sku: String(raw.sku ?? ''),
        current: Number(raw.current) || 0,
        forecast: Number(raw.forecast) || 0,
        recommended: Number(raw.recommended) || 0,
        confidence: Number(raw.confidence) || 0,
        insight: String(raw.insight ?? ''),
        isAi: Boolean(raw.isAi),
        trend,
        priority: raw.priority === 'high' ? 'high' : 'normal',
        variance: Number(raw.variance) || 0,
    };
}

function buildDateFilter(dr?: { from: Date; to: Date }) {
    if (!dr?.from || !dr?.to) return {};
    const from = dr.from instanceof Date ? dr.from.toISOString() : String(dr.from);
    const to = dr.to instanceof Date ? dr.to.toISOString() : String(dr.to);
    return { from, to };
}

type ForecastQuality = {
    label: string;
    badgeClass: string;
    forecastDisplay: string;
    forecastTone: string;
    showBuildingHint: boolean;
};

function resolveForecastQuality(item: DemandForecastItem): ForecastQuality {
    const pct = Math.round((item.confidence || 0) * 100);
    const hasHistory = item.forecast > 0 || item.isAi;

    if (pct >= 70 && hasHistory) {
        return {
            label: `${pct}%`,
            badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-100',
            forecastDisplay: String(item.forecast),
            forecastTone: 'text-wine',
            showBuildingHint: false,
        };
    }
    if (pct >= 45) {
        return {
            label: `${pct}%`,
            badgeClass: 'text-amber-700 bg-amber-50 border-amber-100',
            forecastDisplay: item.forecast > 0 ? String(item.forecast) : '—',
            forecastTone: item.forecast > 0 ? 'text-wine' : 'text-slate-400',
            showBuildingHint: item.forecast <= 0,
        };
    }
    return {
        label: 'Building',
        badgeClass: 'text-slate-600 bg-slate-50 border-slate-200',
        forecastDisplay: '—',
        forecastTone: 'text-slate-400',
        showBuildingHint: true,
    };
}

export const PredictivePlanningPortlet = memo(function PredictivePlanningPortlet({
    businessId,
    domainKnowledge,
    dateRange,
    layout = 'cards',
}: PredictivePlanningPortletProps) {
    const [data, setData] = useState<DemandForecastItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            if (!businessId) return;
            const dk =
                domainKnowledge && typeof domainKnowledge === 'object'
                    ? (domainKnowledge as Record<string, unknown>)
                    : null;
            const res = await getDemandForecastAction(
                businessId,
                (dk?.intelligence as Record<string, unknown> | undefined) ?? {},
                true,
                buildDateFilter(dateRange)
            );
            if (res.success && Array.isArray(res.data)) {
                setData(res.data.map((row) => normalizeForecastRow(row as Record<string, unknown>)));
            } else {
                setData([]);
            }
            setLoading(false);
        }
        void load();
    }, [businessId, domainKnowledge, dateRange]);

    const lowConfidenceCount = data.filter((row) => (row.confidence || 0) < 0.45).length;

    return (
        <Portlet
            title="Predictive Planning"
            description="AI-driven inventory foresight"
            isLoading={loading}
            headerActions={
                <div className="flex items-center gap-1 mr-2">
                    <Sparkles className="w-3 h-3 text-wine" />
                    <span className="text-[10px] font-semibold text-wine uppercase">AI Active</span>
                </div>
            }
        >
            {!loading && data.length > 0 && lowConfidenceCount === data.length ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    Forecasts need more dated sales history. Record invoices for these SKUs to improve accuracy.
                </div>
            ) : null}
            {layout === 'compact' ? (
                <div className="overflow-x-auto -mx-1">
                    <table className="w-full min-w-[520px] text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="pb-2 pr-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Product</th>
                                <th className="pb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Stock</th>
                                <th className="pb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">30d Forecast</th>
                                <th className="pb-2 pl-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Conf.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.slice(0, 6).map((item) => {
                                const quality = resolveForecastQuality(item);
                                return (
                                <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                                    <td className="py-2.5 pr-3">
                                        <p className="text-xs font-semibold text-gray-900 truncate max-w-[12rem]">{item.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{item.sku || 'N/A'}</p>
                                    </td>
                                    <td className="py-2.5 px-2 text-sm font-semibold tabular-nums text-gray-900">{item.current}</td>
                                    <td className="py-2.5 px-2">
                                        <span className={cn('text-sm font-semibold tabular-nums', quality.forecastTone)}>
                                            {quality.forecastDisplay}
                                        </span>
                                        {quality.showBuildingHint ? (
                                            <p className="text-[9px] text-slate-400 mt-0.5">Needs sales data</p>
                                        ) : null}
                                    </td>
                                    <td className="py-2.5 pl-2">
                                        <span className={cn(
                                            'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                                            quality.badgeClass
                                        )}>
                                            {quality.label}
                                        </span>
                                    </td>
                                </tr>
                            );})}
                        </tbody>
                    </table>
                    {data.length === 0 && !loading ? (
                        <p className="py-6 text-center text-xs text-gray-400">No forecasting data available.</p>
                    ) : null}
                </div>
            ) : (
            <div className="space-y-3">
                {data.slice(0, 4).map((item) => {
                    const quality = resolveForecastQuality(item);
                    return (
                    <div key={item.id} className="p-3 rounded-xl border border-gray-100 hover:border-wine/20 transition-all bg-white shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <p className="text-xs font-semibold text-gray-900 leading-none">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">SKU: {item.sku || 'N/A'}</p>
                            </div>
                            <div className={cn(
                                'flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                                quality.badgeClass
                            )}>
                                {quality.label === 'Building' ? null : item.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {quality.label}{quality.label === 'Building' ? '' : ' Conf.'}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Stock Position</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-semibold text-gray-900">{item.current}</span>
                                    <span className="text-[10px] font-bold text-gray-400">Units</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">AI Forecast (30d)</p>
                                <div className="flex items-baseline gap-1">
                                    <span className={cn('text-lg font-semibold', quality.forecastTone)}>{quality.forecastDisplay}</span>
                                    {quality.forecastDisplay !== '—' ? (
                                        <span className="text-[10px] font-bold text-wine/50">Units</span>
                                    ) : (
                                        <span className="text-[10px] font-medium text-slate-400">More sales needed</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {item.insight && (
                            <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 flex items-start gap-2">
                                <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] font-medium text-gray-600 leading-tight">
                                    <span className="font-bold text-gray-900 uppercase text-[10px] mr-1">AI Insight:</span>
                                    {item.insight}
                                </p>
                            </div>
                        )}

                        {item.priority === 'high' && (
                            <button 
                                onClick={async () => {
                                    if (confirm(`Do you want the AI Agent to prepare a procurement proposal for ${item.name}?`)) {
                                        const { runAgenticProcurementAction } = await import('@/lib/actions/premium/ai/agentic');
                                        const res = await runAgenticProcurementAction(businessId!, item.id);
                                        if (res.success) {
                                            alert('AI Agent has prepared a procurement proposal. You can review it in the Approvals section.');
                                        } else {
                                            const errMsg =
                                                !res.success && 'error' in res
                                                    ? String((res as { error?: unknown }).error ?? '')
                                                    : 'Unknown error';
                                            alert(`Agent failed: ${errMsg}`);
                                        }
                                    }
                                }}
                                className="w-full mt-3 py-1.5 rounded-lg font-semibold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-sm shadow-wine/10 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                Draft Restock Order
                            </button>
                        )}
                    </div>
                );})}

                {data.length === 0 && !loading && (
                    <div className="text-center py-6">
                        <p className="text-xs text-gray-400">No forecasting data available.</p>
                    </div>
                )}
            </div>
            )}
        </Portlet>
    );
});
