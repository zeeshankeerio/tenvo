'use client';

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MetricSparkline } from '@/components/dashboard/MetricSparkline';
import { cn } from '@/lib/utils';

export interface DomainMetricCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    trend?: number;
    /** Override auto trend text (e.g. alert copy instead of %). */
    trendHint?: string;
    icon: React.ElementType;
    colorClass: string;
    className?: string;
    sparkline?: number[];
    /** For metrics where down is good (e.g. overdue). */
    invertTrendColor?: boolean;
}

export function DomainMetricCard({
    label,
    value,
    subValue,
    trend,
    trendHint,
    icon: Icon,
    colorClass,
    className,
    sparkline,
    invertTrendColor = false,
}: DomainMetricCardProps) {
    const showTrend = trendHint || (trend !== undefined && trend !== 0);
    const trendPositive = invertTrendColor ? (trend ?? 0) < 0 : (trend ?? 0) > 0;

    return (
        <Card
            className={cn(
                'group border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden h-full',
                'bg-gradient-to-br from-white via-white to-slate-50/70',
                className
            )}
        >
            <CardContent className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 truncate">
                            {label}
                        </p>
                        <h3 className="text-lg xl:text-xl font-semibold text-slate-900 leading-tight tabular-nums">
                            {value}
                        </h3>
                        {subValue ? (
                            <p className="text-[10px] font-medium text-slate-500 mt-1 line-clamp-2">{subValue}</p>
                        ) : null}
                    </div>
                    <div className={cn('p-2 rounded-xl shadow-sm shrink-0 ring-1 ring-white/60', colorClass)}>
                        <Icon className="w-5 h-5 text-white" aria-hidden />
                    </div>
                </div>

                <div className="mt-2.5 flex items-end justify-between gap-2 min-h-[1.75rem]">
                    {showTrend ? (
                        <div className="flex items-center gap-1 min-w-0">
                            {!trendHint && trend !== undefined && trend !== 0 ? (
                                trendPositive ? (
                                    <ArrowUpRight className="w-3 h-3 text-emerald-500 shrink-0" aria-hidden />
                                ) : (
                                    <ArrowDownRight className="w-3 h-3 text-rose-500 shrink-0" aria-hidden />
                                )
                            ) : null}
                            <span
                                className={cn(
                                    'text-[10px] font-semibold truncate',
                                    trendHint
                                        ? 'text-amber-700'
                                        : trendPositive
                                          ? 'text-emerald-600'
                                          : 'text-rose-600'
                                )}
                            >
                                {trendHint ?? `${Math.abs(trend ?? 0)}% vs prior period`}
                            </span>
                        </div>
                    ) : (
                        <span className="text-[10px] text-slate-400">Stable vs prior period</span>
                    )}
                    {sparkline && sparkline.length >= 2 ? (
                        <MetricSparkline
                            values={sparkline}
                            positiveDirection={invertTrendColor ? 'down' : 'up'}
                        />
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}
