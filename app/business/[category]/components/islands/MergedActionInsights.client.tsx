'use client';

import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IndustryInsights } from './IndustryInsights.client';

interface ActionInsight {
    title: string;
    text: string;
    tone: string;
    actionTab: string;
}

interface MergedActionInsightsProps {
    category: string;
    domainKnowledge?: Record<string, unknown> | null;
    operationalInsights: ActionInsight[];
    reminders: { lowStock?: number; overdueInvoices?: number; pendingOrders?: number };
    onQuickAction?: (actionId: string) => void;
}

/** Domain playbook + deduped operational alerts in one sidebar column. */
export function MergedActionInsights({
    category,
    domainKnowledge,
    operationalInsights,
    reminders,
    onQuickAction,
}: MergedActionInsightsProps) {
    const intel = (domainKnowledge?.intelligence ?? {}) as Record<string, unknown>;

    const filteredOperational = operationalInsights.filter((insight) => {
        if (reminders.lowStock && reminders.lowStock > 0 && insight.title === 'Predictive Restock') {
            return false;
        }
        if (reminders.overdueInvoices && reminders.overdueInvoices > 0 && insight.title === 'Collections Alert') {
            return false;
        }
        if (intel.seasonality && (insight.title === 'Seasonal Peak' || insight.title === 'Seasonal Planning')) {
            return false;
        }
        if (Number(intel.demandVolatility) > 0.6 && insight.title === 'Demand Volatility') {
            return false;
        }
        if (intel.perishability && String(intel.perishability).toLowerCase() !== 'low' && insight.title === 'Shelf-Life Risk') {
            return false;
        }
        return true;
    });

    const alerts = filteredOperational.slice(0, 4);

    return (
        <div className="space-y-2.5">
            <IndustryInsights category={category} domainKnowledge={domainKnowledge} variant="compact" />

            {alerts.length > 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="mb-1 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <h3 className="text-sm font-semibold text-gray-900">Action alerts</h3>
                    </div>
                    <p className="mb-2 text-[10px] text-slate-500 leading-snug">
                        Tap an alert to jump to the right workspace tab. Counts like overdue and low stock stay in Reminders above.
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto overscroll-y-contain pr-0.5">
                        {alerts.map((insight, idx) => (
                            <button
                                key={`${insight.title}-${idx}`}
                                type="button"
                                onClick={() => onQuickAction?.(insight.actionTab)}
                                className={cn(
                                    'w-full text-left p-2.5 rounded-xl border transition-all hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30',
                                    insight.tone === 'indigo' && 'bg-brand-50 border-brand-100 hover:bg-brand-100/50',
                                    insight.tone === 'emerald' && 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50',
                                    insight.tone === 'amber' && 'bg-amber-50 border-amber-100 hover:bg-amber-100/50',
                                    insight.tone === 'rose' && 'bg-rose-50 border-rose-100 hover:bg-rose-100/50',
                                    insight.tone === 'slate' && 'bg-slate-50 border-slate-100 hover:bg-slate-100/60'
                                )}
                            >
                                <p className="text-[11px] font-bold text-slate-700">{insight.title}</p>
                                <p className="text-[10px] text-slate-600 mt-1 leading-snug">{insight.text}</p>
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
