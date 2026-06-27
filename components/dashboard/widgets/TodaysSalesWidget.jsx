'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp,
  ShoppingCart,
  Plus
} from 'lucide-react';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import { formatCurrency } from '@/lib/currency';
import { getTodaysSales } from '@/lib/actions/dashboard/widgets';
import toast from 'react-hot-toast';

/**
 * TodaysSalesWidget
 * 
 * Displays today's sales summary with real-time metrics
 * Shows total sales, order count, average order value, and hourly breakdown
 * Includes quick action to create new invoice
 * 
 * Features:
 * - Display today's sales total with target achievement
 * - Show invoice count and average order value
 * - Add hourly sales chart (last 3 hours)
 * - Add quick action: "Create Invoice"
 * - Progress bar showing target achievement
 * 
 * Requirements: 6.5
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} props.currency - Currency code (default: 'PKR')
 * @param {Object} props.data - Sales data (optional, will fetch if not provided)
 * @param {Function} props.onCreateInvoice - Callback when user clicks create invoice
 * @param {Function} props.onViewReport - Callback when user clicks view detailed report
 */
export function TodaysSalesWidget({ 
  businessId,
  currency = 'PKR',
  data,
  onCreateInvoice,
  onViewReport
}) {
  const { language } = useLanguage();
  const t = translations[language] || translations['en'] || {};
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (data) {
      setSalesData(data);
      setLoading(false);
    } else {
      loadTodaysSales();
      
      // Refresh every 60 seconds
      const interval = setInterval(loadTodaysSales, 60000);
      return () => clearInterval(interval);
    }
  }, [businessId, data]);

  const loadTodaysSales = async () => {
    try {
      setLoading(true);
      
      const result = await getTodaysSales(businessId, currency);
      
      if (result.success) {
        setSalesData(result.data);
      } else {
        console.error('Failed to load today\'s sales:', result.error);
        toast.error(result.error || 'Failed to load sales data');
      }
    } catch (err) {
      console.error('Failed to load today\'s sales:', err);
      toast.error('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate recent hourly breakdown (last 3 hours)
  const recentHours = useMemo(() => {
    if (!salesData?.hourlyBreakdown) return [];
    return salesData.hourlyBreakdown.slice(-3);
  }, [salesData]);

  if (loading) {
    return (
      <Card className="glass-card border-none">
        <CardHeader className="pb-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-24 bg-gray-100 rounded animate-pulse" />
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
            <div className="h-12 bg-gray-100 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!salesData) {
    return (
      <Card className="glass-card border-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-gray-900">
            {t.todays_sales || "Today's Sales"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {t.no_sales_data || 'No sales data available'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-gray-900">
              {t.todays_sales || "Today's Sales"}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.real_time_sales_summary || 'Real-time sales summary'}
            </CardDescription>
          </div>
          <div className="p-2.5 rounded-2xl bg-green-50 border border-green-200 shadow-inner">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Sales Metrics */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">
                {t.total_sales || 'Total Sales'}
              </div>
              <div className="text-3xl font-semibold text-green-900">
                {formatCurrency(salesData.totalSales, currency)}
              </div>
            </div>
            <div className="text-right">
              <Badge className="bg-green-600 text-white font-bold mb-1">
                {salesData.achievement}%
              </Badge>
              <div className="text-xs text-green-700">
                {t.of_target || 'of target'}
              </div>
            </div>
          </div>
          
          <div className="w-full bg-green-200 rounded-full h-2 overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
              style={{ width: `${salesData.achievement}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-green-700">
            <span>
              {t.target || 'Target'}: {formatCurrency(salesData.target, currency)}
            </span>
            <span>
              {formatCurrency(salesData.target - salesData.totalSales, currency)} {t.remaining || 'remaining'}
            </span>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-gray-50/50 border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                {t.orders || 'Orders'}
              </span>
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {salesData.totalOrders}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-gray-50/50 border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                {t.avg_order || 'Avg Order'}
              </span>
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {formatCurrency(salesData.avgOrderValue, currency)}
            </div>
          </div>
        </div>

        {/* Hourly Breakdown */}
        <div>
          <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
            {t.hourly_breakdown || 'Hourly Breakdown'}
          </div>
          <div className="space-y-1.5">
            {recentHours.map((hour, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-600 font-medium">{hour.hour}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{hour.orders} {t.orders || 'orders'}</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(hour.sales, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          {onCreateInvoice && (
            <Button
              onClick={onCreateInvoice}
              className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t.create_invoice || 'Create Invoice'}
            </Button>
          )}
          
          {onViewReport && (
            <button
              onClick={onViewReport}
              className="w-full text-xs font-bold text-green-600 hover:text-green-700 transition-colors py-2"
            >
              {t.view_detailed_report || 'View Detailed Report'} →
            </button>
          )}
        </div>

        {/* Last Updated */}
        <div className="text-center text-[10px] text-gray-400">
          {t.last_updated || 'Last updated'}: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}
