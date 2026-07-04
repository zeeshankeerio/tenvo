'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SnapshotMetric {
    label: string;
    value: string | number;
    tone: string;
    icon: React.ElementType;
    actionId?: string;
}

interface PeriodSnapshotCardProps {
    dateFrom: Date;
    dateTo: Date;
    presetLabel: string;
    healthChips: SnapshotMetric[];
    metrics: SnapshotMetric[];
    /** How many detail metrics to show before expand. */
    collapsedCount?: number;
    onMetricClick?: (actionId: string) => void;
}

export function PeriodSnapshotCard({
    dateFrom,
    dateTo,
    presetLabel,
    healthChips,
    metrics,
    collapsedCount = 6,
    onMetricClick,
}: PeriodSnapshotCardProps) {
    const [expanded, setExpanded] = useState(false);
    const visibleMetrics = expanded ? metrics : metrics.slice(0, collapsedCount);
    const hiddenCount = Math.max(0, metrics.length - collapsedCount);

    return (
        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white via-white to-slate-50/80">
            <CardContent className="p-3 md:p-3.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                Period snapshot
                            </p>
                            <span className="inline-flex items-center gap-1 rounded border border-emerald-200/70 bg-emerald-50/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                                <TrendingUp className="h-3 w-3 shrink-0" aria-hidden />
                                Live
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-slate-600">
                            <span className="font-semibold tabular-nums text-slate-800">
                                {dateFrom.toLocaleDateString()} – {dateTo.toLocaleDateString()}
                            </span>
                            <span className="text-slate-300"> · </span>
                            <span className="font-semibold text-slate-700">{presetLabel}</span>
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                            Supporting metrics for the selected date range. Alerts stay in the sidebar.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:max-w-md">
                        {healthChips.map((item) => {
                            const Hi = item.icon;
                            const isClickable = Boolean(item.actionId && onMetricClick);
                            return (
                                <div
                                    key={item.label}
                                    role={isClickable ? 'button' : undefined}
                                    tabIndex={isClickable ? 0 : undefined}
                                    onClick={
                                        isClickable
                                            ? () => onMetricClick!(item.actionId!)
                                            : undefined
                                    }
                                    onKeyDown={
                                        isClickable
                                            ? (e) => {
                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                      e.preventDefault();
                                                      onMetricClick!(item.actionId!);
                                                  }
                                              }
                                            : undefined
                                    }
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-lg border border-slate-100 bg-white/80 px-2 py-1.5',
                                        isClickable &&
                                            'cursor-pointer hover:border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40'
                                    )}
                                >
                                    <Hi className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                                            {item.label}
                                        </p>
                                        <p className={cn('text-xs font-semibold tabular-nums leading-tight', item.tone)}>
                                            {item.value}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div
                    className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5"
                    role="group"
                    aria-label="Period metrics"
                >
                    {visibleMetrics.map((item) => {
                        const Hi = item.icon;
                        const isClickable = Boolean(item.actionId && onMetricClick);
                        return (
                            <div
                                key={item.label}
                                role={isClickable ? 'button' : undefined}
                                tabIndex={isClickable ? 0 : undefined}
                                onClick={
                                    isClickable
                                        ? () => onMetricClick!(item.actionId!)
                                        : undefined
                                }
                                onKeyDown={
                                    isClickable
                                        ? (e) => {
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                  e.preventDefault();
                                                  onMetricClick!(item.actionId!);
                                              }
                                          }
                                        : undefined
                                }
                                className={cn(
                                    'rounded-lg border border-slate-100 bg-slate-50/50 px-2 py-1.5 hover:bg-white transition-colors',
                                    isClickable &&
                                        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40'
                                )}
                                title={item.label}
                            >
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <Hi className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                                        {item.label}
                                    </p>
                                </div>
                                <p className={cn('text-sm font-semibold tabular-nums leading-tight', item.tone)}>
                                    {item.value}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {hiddenCount > 0 ? (
                    <div className="mt-2 flex justify-center">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] font-semibold uppercase tracking-wider text-slate-600"
                            onClick={() => setExpanded((v) => !v)}
                            aria-expanded={expanded}
                        >
                            {expanded ? (
                                <>
                                    <ChevronUp className="h-3.5 w-3.5 mr-1" aria-hidden />
                                    Show fewer metrics
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-3.5 w-3.5 mr-1" aria-hidden />
                                    Show {hiddenCount} more metrics
                                </>
                            )}
                        </Button>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
