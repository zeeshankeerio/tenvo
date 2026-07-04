'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, PieChart, TrendingUp, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SalesChart, RevenueBarChart, CategoryPieChart, TopProductsChart } from '@/components/AdvancedCharts';
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

function ChartShell({
    title,
    description,
    icon: Icon,
    iconTone,
    children,
    className,
}: {
    title: string;
    description: string;
    icon: React.ElementType;
    iconTone: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <Card className={cn('border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/60 shadow-sm overflow-hidden', className)}>
            <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100/80 bg-white/60">
                <div className="flex items-start gap-2.5">
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm', iconTone)}>
                        <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <CardTitle className="text-xs font-semibold text-slate-900">{title}</CardTitle>
                        <CardDescription className="text-[10px] mt-0.5">{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-3 h-[220px]">{children}</CardContent>
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
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-[280px] rounded-xl bg-slate-100" />
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
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
                <BarChart3 className="mx-auto h-9 w-9 text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-700">Visual studio needs more transaction history</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{copy.emptyHint}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-0.5">
                {copy.studioSubtitle}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ChartShell
                    title={copy.revenueTitle}
                    description={copy.revenueDesc}
                    icon={TrendingUp}
                    iconTone="bg-emerald-500"
                    className="md:col-span-2"
                >
                    <SalesChart data={salesData} colors={colors} currency={currency} />
                </ChartShell>

                <ChartShell
                    title={copy.categoryTitle}
                    description={copy.categoryDesc}
                    icon={PieChart}
                    iconTone="bg-violet-500"
                >
                    <CategoryPieChart data={categoryData} colors={colors} />
                </ChartShell>

                <ChartShell
                    title={copy.topTitle}
                    description={copy.topDesc}
                    icon={Package}
                    iconTone="bg-amber-500"
                >
                    <TopProductsChart data={topProducts} colors={colors} currency={currency} />
                </ChartShell>

                <ChartShell
                    title={copy.barTitle}
                    description={copy.barDesc}
                    icon={BarChart3}
                    iconTone="bg-cyan-600"
                    className="md:col-span-2"
                >
                    <RevenueBarChart data={salesData} colors={colors} currency={currency} />
                </ChartShell>
            </div>
        </div>
    );
}
