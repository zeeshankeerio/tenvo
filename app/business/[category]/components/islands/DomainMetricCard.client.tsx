'use client';

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MetricSparkline } from '@/components/dashboard/MetricSparkline';
import { KPI_THEMES, type KpiTheme } from '@/lib/dashboard/kpiThemes';
import { cn } from '@/lib/utils';

export interface DomainMetricCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    trend?: number;
    /** Override auto trend text (e.g. alert copy instead of %). */
    trendHint?: string;
    icon: React.ElementType;
    /** @deprecated Prefer `theme` for AIC-style tinted cards. */
    colorClass?: string;
    theme?: KpiTheme;
    className?: string;
    sparkline?: number[];
    /** For metrics where down is good (e.g. overdue). */
    invertTrendColor?: boolean;
    /** Routes via handleQuickAction when card is clicked. */
    actionId?: string;
    onNavigate?: (actionId: string) => void;
    isLoading?: boolean;
}

export function DomainMetricCard({
    label,
    value,
    subValue,
    trend,
    trendHint,
    icon: Icon,
    colorClass,
    theme = 'slate',
    className,
    sparkline,
    invertTrendColor = false,
    actionId,
    onNavigate,
    isLoading = false,
}: DomainMetricCardProps) {
    const palette = KPI_THEMES[theme];
    const showTrend = trendHint || (trend !== undefined && trend !== 0);
    const trendPositive = invertTrendColor ? (trend ?? 0) < 0 : (trend ?? 0) > 0;
    const isClickable = Boolean(actionId && onNavigate);

    const handleActivate = () => {
        if (actionId && onNavigate) onNavigate(actionId);
    };

    if (isLoading) {
        return (
            <Card
                className={cn(
                    'group relative overflow-hidden border shadow-sm h-full animate-pulse',
                    palette.card,
                    className
                )}
            >
                <CardContent className="relative p-3.5">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-3 w-16 bg-slate-200 rounded opacity-60" />
                            <div className="h-6 w-28 bg-slate-300/80 rounded" />
                            <div className="h-3 w-32 bg-slate-200 rounded opacity-60" />
                        </div>
                        <div className="p-5 bg-slate-200/80 rounded-xl shrink-0" />
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-2 min-h-[2rem] border-t border-white/60 pt-2.5">
                        <div className="h-3 w-20 bg-slate-200 rounded opacity-60" />
                        <div className="h-5 w-12 bg-slate-200/50 rounded" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onClick={isClickable ? handleActivate : undefined}
            onKeyDown={
                isClickable
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleActivate();
                          }
                      }
                    : undefined
            }
            className={cn(
                'group relative overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 h-full',
                palette.card,
                isClickable &&
                    'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40',
                className
            )}
        >
            <div
                className={cn(
                    'pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-opacity group-hover:opacity-100 opacity-70',
                    palette.orb
                )}
                aria-hidden
            />
            <CardContent className="relative p-3.5">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1 truncate">
                            {label}
                        </p>
                        <h3 className="text-xl xl:text-2xl font-bold text-slate-900 leading-tight tabular-nums tracking-tight">
                            {value}
                        </h3>
                        {subValue ? (
                            <p className="text-[10px] font-medium text-slate-500 mt-1 line-clamp-2">{subValue}</p>
                        ) : null}
                    </div>
                    <div
                        className={cn(
                            'p-2.5 rounded-xl shadow-md shrink-0 ring-2 ring-white/80',
                            colorClass || palette.icon
                        )}
                    >
                        <Icon className="w-5 h-5 text-white" aria-hidden />
                    </div>
                </div>

                <div className="mt-3 flex items-end justify-between gap-2 min-h-[2rem] border-t border-white/60 pt-2.5">
                    {showTrend ? (
                        <div className="flex items-center gap-1 min-w-0">
                            {!trendHint && trend !== undefined && trend !== 0 ? (
                                trendPositive ? (
                                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden />
                                ) : (
                                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-500 shrink-0" aria-hidden />
                                )
                            ) : null}
                            <span
                                className={cn(
                                    'text-[10px] font-bold truncate',
                                    trendHint
                                        ? 'text-amber-700'
                                        : trendPositive
                                          ? 'text-emerald-700'
                                          : 'text-rose-600'
                                )}
                            >
                                {trendHint ?? `${Math.abs(trend ?? 0)}% vs prior period`}
                            </span>
                        </div>
                    ) : (
                        <span className="text-[10px] font-medium text-slate-400">Stable vs prior period</span>
                    )}
                    {sparkline && sparkline.length >= 2 ? (
                        <MetricSparkline
                            values={sparkline}
                            strokeClassName={palette.sparkStroke}
                            fillClassName={palette.sparkFill}
                            positiveDirection={invertTrendColor ? 'down' : 'up'}
                            filled
                        />
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}
