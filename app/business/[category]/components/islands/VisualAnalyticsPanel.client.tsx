'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, PieChart, TrendingUp, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    SalesTrendAreaChart,
    RevenueBarChart,
    CategoryPieChart,
    TopProductsChart,
} from '@/components/AdvancedCharts';
import { getAnalyticsBundleAction } from '@/lib/actions/premium/ai/analytics';
import { getDomainColors } from '@/lib/domainColors';
import { resolveOperationsProfile } from '@/lib/dashboard/domainOperationsIntelligence';
import { getVisualAnalyticsCopy } from '@/lib/dashboard/visualAnalyticsLabels';
import { cn } from '@/lib/utils';

interface VisualAnalyticsPanelProps {
    businessId?: string;
    category?: string;
    business?: { name?: string; country?: string; settings?: Record<string, unknown> } | null;
    domainKnowledge?: Record<string, unknown> | null;
    dateRange?: { from: Date; to: Date };
    currency?: string;
}

function buildDateFilter(dateRange?: { from: Date; to: Date }) {
    if (!dateRange?.from || !dateRange?.to) return {};
    const from = dateRange.from instanceof Date ? dateRange.from.toISOString() : String(dateRange.from);
    const to = dateRange.to instanceof Date ? dateRange.to.toISOString() : String(dateRange.to);
    return { from, to };
}

const CHART_ACCENTS = {
    emerald: {
        shell: 'border-emerald-200/60 bg-gradient-to-br from-emerald-50/40 via-white to-white',
        icon: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30',
    },
    violet: {
        shell: 'border-violet-200/60 bg-gradient-to-br from-violet-50/40 via-white to-white',
        icon: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/30',
    },
    amber: {
        shell: 'border-amber-200/60 bg-gradient-to-br from-amber-50/40 via-white to-white',
        icon: 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30',
    },
    cyan: {
        shell: 'border-cyan-200/60 bg-gradient-to-br from-cyan-50/40 via-white to-white',
        icon: 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/30',
    },
} as const;

function ChartShell({
    title,
    description,
    icon: Icon,
    accent = 'emerald',
    children,
    className,
    chartHeight = 'h-[220px]',
}: {
    title: string;
    description: string;
    icon: React.ElementType;
    accent?: keyof typeof CHART_ACCENTS;
    children: React.ReactNode;
    className?: string;
    chartHeight?: string;
}) {
    const tone = CHART_ACCENTS[accent];
    return (
        <Card
            className={cn(
                'overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 backdrop-blur-sm',
                tone.shell,
                className
            )}
        >
            <CardHeader className="pb-2 pt-3.5 px-4 border-b border-white/80 bg-white/50">
                <div className="flex items-start gap-2.5">
                    <div
                        className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md ring-2 ring-white/80',
                            tone.icon
                        )}
                    >
                        <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <CardTitle className="text-sm font-bold text-slate-900 tracking-tight">{title}</CardTitle>
                        <CardDescription className="text-[11px] mt-0.5 text-slate-500">{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className={cn('p-3 pt-4', chartHeight)}>{children}</CardContent>
        </Card>
    );
}

export function VisualAnalyticsPanel({
    businessId,
    category = 'retail-shop',
    business,
    domainKnowledge,
    dateRange,
    currency = 'PKR',
}: VisualAnalyticsPanelProps) {
    const colors = getDomainColors(category);
    const copy = useMemo(
        () => getVisualAnalyticsCopy(resolveOperationsProfile(category, domainKnowledge || undefined, business)),
        [category, domainKnowledge, business]
    );
    const [loading, setLoading] = useState(true);
    const [salesData, setSalesData] = useState<Array<Record<string, unknown>>>([]);
    const [topProducts, setTopProducts] = useState<Array<Record<string, unknown>>>([]);
    const [categoryData, setCategoryData] = useState<Array<Record<string, unknown>>>([]);

    const loadData = useCallback(async () => {
        if (!businessId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const bundle = await getAnalyticsBundleAction(businessId, buildDateFilter(dateRange));
            if (bundle.success && bundle.data) {
                setSalesData((bundle.data.salesTrend || []) as Array<Record<string, unknown>>);
                setTopProducts((bundle.data.topProducts || []) as Array<Record<string, unknown>>);
                setCategoryData((bundle.data.categoryData || []) as Array<Record<string, unknown>>);
            }
        } catch {
            setSalesData([]);
            setTopProducts([]);
            setCategoryData([]);
        } finally {
            setLoading(false);
        }
    }, [businessId, dateRange]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-pulse">
                <div className="md:col-span-2 h-[300px] rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-[280px] rounded-2xl bg-slate-100" />
                ))}
            </div>
        );
    }

    const hasData =
        salesData.some((d) => Number(d.revenue) > 0 || Number(d.profit) > 0) ||
        topProducts.length > 0 ||
        categoryData.length > 0;

    if (!hasData) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white px-6 py-12 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-cyan-100">
                    <BarChart3 className="h-7 w-7 text-violet-500" />
                </div>
                <p className="text-sm font-bold text-slate-800">Visual studio needs more transaction history</p>
                <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">{copy.emptyHint}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-0.5 px-0.5">
                <p className="text-xs font-bold text-slate-800">{copy.studioSubtitle}</p>
                <p className="text-[10px] text-slate-500">Modern chart grid — revenue, mix, and top performers for this period.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <ChartShell
                    title={copy.revenueTitle}
                    description={copy.revenueDesc}
                    icon={TrendingUp}
                    accent="emerald"
                    className="lg:col-span-8"
                    chartHeight="h-[260px]"
                >
                    <SalesTrendAreaChart data={salesData} colors={colors} currency={currency} />
                </ChartShell>

                <ChartShell
                    title={copy.categoryTitle}
                    description={copy.categoryDesc}
                    icon={PieChart}
                    accent="violet"
                    className="lg:col-span-4"
                    chartHeight="h-[260px]"
                >
                    <CategoryPieChart data={categoryData} colors={colors} />
                </ChartShell>

                <ChartShell
                    title={copy.topTitle}
                    description={copy.topDesc}
                    icon={Package}
                    accent="amber"
                    className="lg:col-span-5"
                >
                    <TopProductsChart data={topProducts} colors={colors} currency={currency} />
                </ChartShell>

                <ChartShell
                    title={copy.barTitle}
                    description={copy.barDesc}
                    icon={BarChart3}
                    accent="cyan"
                    className="lg:col-span-7"
                >
                    <RevenueBarChart data={salesData} colors={colors} currency={currency} />
                </ChartShell>
            </div>
        </div>
    );
}
