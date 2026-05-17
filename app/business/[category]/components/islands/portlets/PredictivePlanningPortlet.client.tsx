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
    domainKnowledge?: any;
}

export const PredictivePlanningPortlet = memo(function PredictivePlanningPortlet({
    businessId,
    domainKnowledge
}: PredictivePlanningPortletProps) {
    const [data, setData] = useState<DemandForecastItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            if (!businessId) return;
            const res = await getDemandForecastAction(businessId, domainKnowledge?.intelligence, true);
            if (res.success && res.data) {
                setData(res.data.map((item: any) => ({
                    ...item,
                    trend: item.trend as 'up' | 'down'
                })));
            }
            setLoading(false);
        }
        load();
    }, [businessId, domainKnowledge]);

    return (
        <Portlet
            title="Predictive Planning"
            description="AI-driven inventory foresight"
            isLoading={loading}
            headerActions={
                <div className="flex items-center gap-1 mr-2">
                    <Sparkles className="w-3 h-3 text-wine" />
                    <span className="text-[9px] font-black text-wine uppercase">AI Active</span>
                </div>
            }
        >
            <div className="space-y-3">
                {data.slice(0, 4).map((item) => (
                    <div key={item.id} className="p-3 rounded-xl border border-gray-100 hover:border-wine/20 transition-all bg-white shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <p className="text-xs font-black text-gray-900 leading-none">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">SKU: {item.sku || 'N/A'}</p>
                            </div>
                            <div className={cn(
                                "flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border",
                                item.trend === 'up' ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-red-600 bg-red-50 border-red-100"
                            )}>
                                {item.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {(item.confidence * 100).toFixed(0)}% Conf.
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Stock Position</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-black text-gray-900">{item.current}</span>
                                    <span className="text-[10px] font-bold text-gray-400">Units</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] text-gray-400 font-black uppercase mb-1">AI Forecast (30d)</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-black text-wine">{item.forecast}</span>
                                    <span className="text-[10px] font-bold text-wine/50">Units</span>
                                </div>
                            </div>
                        </div>

                        {item.insight && (
                            <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 flex items-start gap-2">
                                <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] font-medium text-gray-600 leading-tight">
                                    <span className="font-bold text-gray-900 uppercase text-[9px] mr-1">AI Insight:</span>
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
                                            alert('Agent failed: ' + res.error);
                                        }
                                    }
                                }}
                                className="w-full mt-3 py-1.5 bg-wine text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-wine/90 transition-colors shadow-sm shadow-wine/10"
                            >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                Draft Restock Order
                            </button>
                        )}
                    </div>
                ))}

                {data.length === 0 && !loading && (
                    <div className="text-center py-6">
                        <p className="text-xs text-gray-400">No forecasting data available.</p>
                    </div>
                )}
            </div>
        </Portlet>
    );
});
