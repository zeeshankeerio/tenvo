'use client';

import { useState, useEffect, useCallback } from 'react';
import { SalesChart, RevenueBarChart, CategoryPieChart, TopProductsChart } from './AdvancedCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Package, Users, BarChart3, RefreshCcw } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { getDomainColors } from '@/lib/domainColors';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getAnalyticsBundleAction } from '@/lib/actions/premium/ai/analytics';

function buildDateFilter(dateRange) {
  if (!dateRange?.from || !dateRange?.to) return {};
  const from = dateRange.from instanceof Date ? dateRange.from.toISOString() : String(dateRange.from);
  const to = dateRange.to instanceof Date ? dateRange.to.toISOString() : String(dateRange.to);
  return { from, to };
}

function formatRangeLabel(dateRange) {
  if (!dateRange?.from || !dateRange?.to) return null;
  try {
    const a = dateRange.from instanceof Date ? dateRange.from : new Date(dateRange.from);
    const b = dateRange.to instanceof Date ? dateRange.to : new Date(dateRange.to);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    return `${a.toLocaleDateString(undefined, { dateStyle: 'medium' })} - ${b.toLocaleDateString(undefined, { dateStyle: 'medium' })}`;
  } catch {
    return null;
  }
}

/**
 * Advanced Analytics Component
 * Powered by Server-Side SQL Aggregation
 * 
 * @param {Object} props
 * @param {string} [props.businessId]
 * @param {string} [props.category]
 * @param {{ from: Date; to: Date }} [props.dateRange] Dashboard header filter
 */
export function AdvancedAnalytics({ businessId, category = 'retail-shop', currency = 'PKR', dateRange }) {
  const colors = getDomainColors(category);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [kpi, setKpi] = useState({
    inventoryAsset: 0,
    growth: { value: '0%', trend: 'neutral' },
    retention: '0%',
    retentionDetail: null,
    growthDetail: null,
  });

  const loadData = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const filter = buildDateFilter(dateRange);
      const bundle = await getAnalyticsBundleAction(businessId, filter);
      if (bundle.success && bundle.data) {
        setSalesData(bundle.data.salesTrend || []);
        setTopProducts(bundle.data.topProducts || []);
        setCategoryData(bundle.data.categoryData || []);
        if (bundle.data.kpi) setKpi(bundle.data.kpi);
      }
    } catch (err) {
      console.error("Failed to load analytics", err);
    } finally {
      setLoading(false);
    }
  }, [businessId, dateRange]);

  useEffect(() => {
    void Promise.resolve().then(() => loadData());
  }, [loadData]);

  const metrics = [
    {
      label: 'Performance',
      value: kpi.growth.value,
      icon: TrendingUp,
      color: kpi.growth.trend === 'up' ? 'text-green-600' : kpi.growth.trend === 'down' ? 'text-red-600' : 'text-gray-600'
    },
    {
      label: 'Inventory Asset',
      value: formatCurrency(kpi.inventoryAsset || 0, currency),
      icon: Package,
      style: { color: colors.primary }
    },
    {
      label: 'Active Retention',
      value: kpi.retention,
      icon: Users,
      color: 'text-blue-600'
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCcw className="w-8 h-8 text-wine animate-spin" />
      </div>
    );
  }

  const hasData = salesData.some((d) => (d.revenue > 0) || (d.profit > 0) || (d.orderCount > 0)) || kpi.inventoryAsset > 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Intelligence Analytics</h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">Real-time performance metrics derived from cloud data</p>
          {(formatRangeLabel(dateRange) || kpi.growthDetail) && (
            <p className="text-[10px] text-muted-foreground mt-1 max-w-2xl leading-snug">
              {formatRangeLabel(dateRange) && (
                <span className="font-semibold text-gray-600">Range: {formatRangeLabel(dateRange)}. </span>
              )}
              Performance compares combined revenue (invoices plus paid storefront orders) in this range to the immediately preceding period of the same length.
              {kpi.growthDetail?.periodRevenue != null && (
                <span className="block mt-0.5">
                  This window: {formatCurrency(kpi.growthDetail.periodRevenue, currency)} · Prior window: {formatCurrency(kpi.growthDetail.priorPeriodRevenue || 0, currency)}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
          <Button variant="ghost" size="sm" onClick={loadData} className="h-7 text-xs">
            <RefreshCcw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {metrics.map((m, i) => (
          <Card key={i} className="border-border shadow-sm bg-card transition-shadow hover:shadow-md">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{m.label}</span>
                <m.icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", m.color)} style={m.style || {}} />
              </div>
              <div className="text-lg sm:text-xl font-bold text-foreground">{m.value}</div>
              {m.label === 'Active Retention' && kpi.retentionDetail != null && (
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                  {kpi.retentionDetail.invoicedCustomers === 0
                    ? 'No invoices linked to customers yet, link customers to measure repeat rate.'
                    : `${kpi.retentionDetail.repeatCustomers} repeat of ${kpi.retentionDetail.invoicedCustomers} invoiced customers`}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      {hasData ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="border-border shadow-sm bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                  Revenue &amp; profit (6 months)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] sm:h-[300px]">
                <SalesChart data={salesData} colors={colors} currency={currency} />
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  Monthly revenue vs GL profit
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] sm:h-[300px]">
                <RevenueBarChart data={salesData} colors={colors} currency={currency} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="border-border shadow-sm bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                  Stock Composition
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] sm:h-[300px]">
                {categoryData.length > 0 ? (
                  <CategoryPieChart data={categoryData} />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    No category data
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                  Top Moving Items
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] sm:h-[300px]">
                {topProducts.length > 0 ? (
                  <TopProductsChart data={topProducts} colors={colors} currency={currency} />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    No top products yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-border shadow-sm bg-card">
          <CardContent className="py-12 sm:py-16 text-center text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No analytics data available. Start recording transactions to see insights.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
