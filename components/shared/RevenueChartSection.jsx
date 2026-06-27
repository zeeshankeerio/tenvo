/**
 * RevenueChartSection Component
 * 
 * Shared component for displaying revenue charts with time range selection
 * and data export functionality.
 * 
 * Features:
 * - Time range selection (7d, 30d, 90d, 1y)
 * - Data export to CSV/Excel
 * - Integration with useDashboardMetrics hook
 * - Real-time data updates
 * - Loading and error states
 * - Responsive design
 * 
 * Usage:
 *   <RevenueChartSection
 *     title="Revenue Performance"
 *     defaultTimeRange="30d"
 *     showExport={true}
 *   />
 */

'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Download, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useDashboardMetrics } from '@/lib/hooks/useDashboardMetrics';
import { formatCurrency } from '@/lib/utils/currency';
import { DashboardLoadingSkeleton } from './DashboardLoadingSkeleton';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import { BRAND_PRIMARY } from '@/lib/theme/brandTokens';

const TIME_RANGES = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '1y', label: 'Last Year' }
];

export function RevenueChartSection({
  title = 'Revenue Performance',
  defaultTimeRange = '30d',
  showExport = true,
  chartType = 'area', // 'area' or 'line'
  colors = {
    primary: BRAND_PRIMARY,
    secondary: '#c49c3b',
  },
  className = ''
}) {
  const [timeRange, setTimeRange] = useState(defaultTimeRange);

  const { chartData, loading, error, refetch } = useDashboardMetrics({
    timeRange,
    includeChartData: true
  });

  // Export data to CSV
  const handleExport = () => {
    if (!chartData || chartData.length === 0) return;

    const headers = ['Date', 'Revenue', 'Expenses'];
    const rows = chartData.map(item => [
      item.date,
      item.revenue || 0,
      item.expenses || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `revenue-chart-${timeRange}-${Date.now()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    const totalRevenue = chartData.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const totalExpenses = chartData.reduce((sum, item) => sum + (item.expenses || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const avgRevenue = totalRevenue / chartData.length;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      avgRevenue,
      profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0
    };
  }, [chartData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={`glass-card border-none ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-200">
              <TrendingUp className="w-5 h-5 text-gray-600" />
            </div>
            <CardTitle className="text-sm font-bold">{title}</CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {/* Time range selector */}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export button */}
            {showExport && (
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                disabled={!chartData || chartData.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Summary stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-sm font-bold text-gray-900">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Total Expenses</p>
              <p className="text-sm font-bold text-gray-900">
                {formatCurrency(stats.totalExpenses)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Net Profit</p>
              <p className={`text-sm font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.netProfit)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Profit Margin</p>
              <p className={`text-sm font-bold ${stats.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.profitMargin}%
              </p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <DashboardLoadingSkeleton variant="chart" />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !chartData || chartData.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            message="No revenue data available"
            description="Revenue data will appear here once transactions are recorded"
          />
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                    tickFormatter={(value) => formatCurrency(value, { compact: true })}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    iconType="circle"
                  />
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.secondary} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={colors.secondary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={colors.primary}
                    strokeWidth={3}
                    fill="url(#colorRevenue)"
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke={colors.secondary}
                    strokeWidth={3}
                    fill="url(#colorExpenses)"
                    name="Expenses"
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                    tickFormatter={(value) => formatCurrency(value, { compact: true })}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    iconType="circle"
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={colors.primary}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke={colors.secondary}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    name="Expenses"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
