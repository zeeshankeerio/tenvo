'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users,
  AlertTriangle, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight,
  Calendar, Filter, Download, RefreshCw, Bell, Settings, Search, Receipt, FileText,
  Warehouse
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getDomainColors } from '@/lib/domainColors';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import { RevenueAreaChart } from '@/components/AdvancedCharts';
import {
  ShoppingBag, Shirt, Tv, Thermometer, Notebook, Palette, Recycle, Scissors,
  Printer, Sofa, Grid, Plane, Wrench, Pill, Soup, Dumbbell, Bed, PartyPopper,
  CarFront, GraduationCap, Car, Monitor, Zap as ZapIcon, Sprout, Gem, Home as HomeIcon,
  Bird, Sun, Truck, Boxes, Fuel, Snowflake, BookOpen, BicepsFlexed, BrickWall,
  Utensils, Coffee, Store, Globe, Smartphone
} from 'lucide-react';

const IconRenderer = ({ name, ...props }) => {
  const IconComponent = {
    Store, ShoppingBag, Package, Globe, Shirt, Smartphone, Tv, Thermometer,
    Notebook, Palette, Recycle, Scissors, Printer, Sofa, Grid, Plane, Wrench, Pill,
    Soup, Dumbbell, Bed, PartyPopper, CarFront, GraduationCap, Car, Monitor, Zap: ZapIcon,
    Sprout, Gem, Home: HomeIcon, Bird, Sun, Truck, Boxes, Fuel, Snowflake, BookOpen,
    BicepsFlexed, BrickWall, Utensils, Coffee
  }[name] || Package;
  return <IconComponent {...props} />;
};

import { useBusiness } from '@/lib/context/BusinessContext';
import { getDashboardMetricsAction } from '@/lib/actions/premium/ai/analytics';
import { InventoryValuationWidget } from '@/components/dashboard/widgets/InventoryValuationWidget';
import { BatchExpiryWidget } from '@/components/dashboard/widgets/BatchExpiryWidget';
import { SerialWarrantyWidget } from '@/components/dashboard/widgets/SerialWarrantyWidget';
import { WarehouseDistributionWidget } from '@/components/dashboard/widgets/WarehouseDistributionWidget';

export function EnhancedDashboard({ businessId, category, onQuickAction }) {
  const { business, currency: currencyFromContext } = useBusiness();
  const currency = currencyFromContext || 'PKR';
  const { language } = useLanguage();
  const t = translations[language] || translations['en'] || {};
  const colors = getDomainColors(category) || {};
  const knowledge = getDomainKnowledge(category) || {};
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);

  // Fetch dashboard metrics from server
  useEffect(() => {
    async function loadMetrics() {
      if (!businessId) return;
      setLoading(true);
      try {
        const res = await getDashboardMetricsAction(businessId);
        if (res.success) {
          setMetrics(res.data);
        }
      } catch (error) {
        console.error('Failed to load dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, [businessId]);

  const isManufacturing = knowledge?.manufacturingEnabled || knowledge?.inventoryFeatures?.includes('Manufacturing/BOM');
  const isService = !knowledge?.batchTrackingEnabled && !knowledge?.manufacturingEnabled && !knowledge?.inventoryFeatures?.includes('Stock Valuation');
  const hasQuotations = knowledge?.inventoryFeatures?.includes('Quotation Management');

  // Intelligent widget visibility based on domain knowledge
  const showBatchTracking = knowledge?.batchTrackingEnabled || knowledge?.expiryTrackingEnabled;
  const showSerialTracking = knowledge?.serialTrackingEnabled;
  const showMultiLocation = knowledge?.multiLocationEnabled;
  const showInventoryWidgets = !isService && (showBatchTracking || showSerialTracking || showMultiLocation);

  // Build stats from server data
  const stats = useMemo(() => {
    if (!metrics) return [];

    const baseStats = [
      {
        label: t.total_revenue || 'Total Revenue',
        value: formatCurrency(metrics.revenue || 0, currency),
        change: metrics.growth?.value || '+0%',
        trend: metrics.growth?.trend || 'up',
        icon: DollarSign,
        ...(colors?.stats?.revenue || { bg: 'bg-blue-50', iconColor: 'text-blue-600' }),
        target: 300000,
        current: metrics.revenue || 0,
      },
      {
        label: t.total_orders || 'Total Orders',
        value: metrics.orders?.total?.toString() || '0',
        change: `${metrics.orders?.paid || 0} paid`,
        trend: 'up',
        icon: ShoppingCart,
        ...(colors?.stats?.orders || { bg: 'bg-green-50', iconColor: 'text-green-600' }),
        target: 1500,
        current: metrics.orders?.total || 0,
      },
    ];

    // Dynamic Stats Injection
    if (isManufacturing) {
      baseStats.push({
        label: t.active_productions || 'Active Productions',
        value: '0',
        change: t.on_track || 'On Track',
        trend: 'up',
        icon: Wrench,
        ...(colors?.stats?.products || { bg: 'bg-wine-50', iconColor: 'text-wine-600' }),
        target: 10,
        current: 0,
      });
    } else {
      baseStats.push({
        label: t.products_stat || 'Products',
        value: metrics.products?.count?.toString() || metrics.products?.toString() || '0',
        change: metrics.products?.growth 
          ? `${metrics.products.growth >= 0 ? '+' : ''}${metrics.products.growth.toFixed(1)}%`
          : '+0%',
        trend: (metrics.products?.growth || 0) >= 0 ? 'up' : 'down',
        icon: Package,
        ...(colors?.stats?.products || { bg: 'bg-wine-50', iconColor: 'text-wine-600' }),
        target: 500,
        current: metrics.products?.count || metrics.products || 0,
      });
    }

    // Hide Low Stock for pure service businesses if they don't track stock
    if (!isService) {
      baseStats.push({
        label: t.low_stock_items || 'Low Stock Items',
        value: metrics.alerts?.lowStock?.toString() || '0',
        change: metrics.alerts?.lowStock > 0 ? (t.action_required || 'Action Required') : (t.optimal || 'Optimal'),
        trend: metrics.alerts?.lowStock > 0 ? 'down' : 'up',
        icon: AlertTriangle,
        bg: 'bg-red-50',
        iconColor: 'text-red-600',
        target: 10,
        current: metrics.alerts?.lowStock || 0,
      });
    } else {
      // Show something else for services
      baseStats.push({
        label: t.tax_liability || 'Tax Liability',
        value: formatCurrency(0, currency),
        change: t.next_filing || 'Next Filing',
        trend: 'none',
        icon: Receipt,
        bg: 'bg-orange-50',
        iconColor: 'text-orange-600',
        target: 50000,
        current: 0,
      });
    }

    // If we didn't add tax liability above, add it now or another stat
    if (baseStats.length < 4 && !baseStats.find(s => s.label === (t.tax_liability || 'Tax Liability'))) {
      baseStats.push({
        label: t.tax_liability || 'Tax Liability',
        value: formatCurrency(0, currency),
        change: t.next_filing || 'Next Filing',
        trend: 'none',
        icon: Receipt,
        bg: 'bg-orange-50',
        iconColor: 'text-orange-600',
        target: 50000,
        current: 0,
      });
    }

    return baseStats;
  }, [metrics, currency, t, colors, isManufacturing, isService]);



  // Simplified recent activity (no invoices array needed)
  const recentActivity = useMemo(() => {
    if (!metrics) {
      return [
        { type: 'system', message: 'Loading activity...', time: 'Just now', status: 'neutral' }
      ];
    }

    const activities = [];

    if (metrics.orders?.pending > 0) {
      activities.push({
        type: 'invoice',
        message: `${metrics.orders.pending} pending invoices`,
        time: 'Today',
        status: 'warning'
      });
    }

    if (metrics.orders?.paid > 0) {
      activities.push({
        type: 'invoice',
        message: `${metrics.orders.paid} invoices paid`,
        time: 'This month',
        status: 'success'
      });
    }

    if (metrics.alerts?.lowStock > 0) {
      activities.push({
        type: 'alert',
        message: `${metrics.alerts.lowStock} items low on stock`,
        time: 'Now',
        status: 'warning'
      });
    }

    if (activities.length === 0) {
      activities.push({
        type: 'system',
        message: 'No recent activity',
        time: 'Just now',
        status: 'neutral'
      });
    }

    return activities.slice(0, 4);
  }, [metrics]);

  const revenueChartData = useMemo(() => {
    // Chart data will be fetched separately if needed
    return [
      { date: 'Jan', revenue: 0, expenses: 0 },
      { date: 'Feb', revenue: 0, expenses: 0 },
      { date: 'Mar', revenue: 0, expenses: 0 },
      { date: 'Apr', revenue: 0, expenses: 0 },
      { date: 'May', revenue: 0, expenses: 0 },
      { date: 'Jun', revenue: 0, expenses: 0 },
    ];
  }, []);

  const alerts = useMemo(() => {
    if (!metrics) return [];
    const list = [];
    if (metrics.alerts?.lowStock > 0) list.push('low_stock');
    if (metrics.alerts?.overdueInvoices > 0) list.push('payment_overdue');
    return list;
  }, [metrics]);

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass-card border-none">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-32 mb-2" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid with Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const progress = Math.min((stat.current / stat.target) * 100, 100);
          return (
            <Card
              key={idx}
              className="glass-card cursor-pointer border-none"
              onClick={() => onQuickAction?.(stat.label.toLowerCase().replace(/ /g, '-'))}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{stat.label}</CardTitle>
                <div className={`p-2.5 rounded-xl ${stat.bg} border ${stat.bg.replace('bg-', 'border-').replace('-50', '-200')} shadow-sm`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-neutral-900 mb-1">{stat.value}</div>
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <div className={`flex items-center px-2 py-1 rounded-full ${stat.trend === 'up' ? 'bg-success-light text-success-dark' : 'bg-error-light text-error-dark'}`}>
                      {stat.trend === 'up' ? (
                        <ArrowUpRight className="w-3 h-3 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 mr-0.5" />
                      )}
                      {stat.change}
                    </div>
                    <span className="text-neutral-500">{t.vs_last_month}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] uppercase font-semibold tracking-wider text-neutral-400">
                    <span>{t.performance}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: colors.primary,
                        boxShadow: `0 0 8px ${colors.primary}40`
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Chart Section */}
      <Card className="border-neutral-200 shadow-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-semibold text-neutral-900">Revenue Performance</CardTitle>
            <CardDescription>Monthly revenue vs expenses overview</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs"
              onClick={() => setTimeRange(timeRange === '6_months' ? 'month' : '6_months')}
            >
              {timeRange === '6_months' ? 'This Month' : 'Last 6 Months'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="h-[300px] w-full pl-0">
          <RevenueAreaChart
            data={revenueChartData}
            colors={colors}
          />
        </CardContent>
      </Card>

      {/* Inventory Widgets Grid - 2x2 (Intelligent Conditional Rendering) */}
      {showInventoryWidgets && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Always show inventory valuation for non-service businesses */}
          <InventoryValuationWidget
            businessId={businessId}
            costingMethod={knowledge?.stockValuationMethod || "FIFO"}
            currency={currency}
            onViewDetails={(type) => onQuickAction?.(`view-${type}`)}
          />
          
          {/* Show batch expiry only for batch-tracked categories */}
          {showBatchTracking ? (
            <BatchExpiryWidget
              businessId={businessId}
              currency={currency}
              onViewDetails={(type) => onQuickAction?.(`view-${type}`)}
            />
          ) : (
            <Card className="glass-card border-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-gray-500">
                  {t.batch_tracking || 'Batch Tracking'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.not_enabled || 'Not enabled for this category'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">
                    {t.enable_in_settings || 'Enable in settings if needed'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Show serial warranty only for serial-tracked categories */}
          {showSerialTracking ? (
            <SerialWarrantyWidget
              businessId={businessId}
              onViewDetails={(type) => onQuickAction?.(`view-${type}`)}
            />
          ) : (
            <Card className="glass-card border-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-gray-500">
                  {t.serial_tracking || 'Serial Tracking'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.not_enabled || 'Not enabled for this category'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">
                    {t.enable_in_settings || 'Enable in settings if needed'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Show warehouse distribution only for multi-location businesses */}
          {showMultiLocation ? (
            <WarehouseDistributionWidget
              businessId={businessId}
              currency={currency}
              onViewDetails={(type) => onQuickAction?.(`view-${type}`)}
            />
          ) : (
            <Card className="glass-card border-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-gray-500">
                  {t.multi_location || 'Multi-Location'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.single_location || 'Single location business'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Warehouse className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">
                    {t.upgrade_for_multi_location || 'Upgrade to enable multi-location'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Alerts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white border-neutral-200 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">{t.recent_activity}</CardTitle>
                <CardDescription>{t.latest_activities}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors">
                  <div className={`p-1.5 rounded-full ${activity.status === 'success' ? 'bg-success-light' : 'bg-warning-light'
                    }`}>
                    {activity.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-warning" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900">{activity.message}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-neutral-200 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">{t.system_alerts || 'System Alerts'}</CardTitle>
                <CardDescription>{t.important_notifications || 'Important Notifications'}</CardDescription>
              </div>
              <Badge variant="secondary">{`${alerts.length} ${t.new_alerts || 'New Alerts'}`}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics?.alerts?.lowStock > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t.low_stock || 'Low Stock'}</AlertTitle>
                  <AlertDescription>
                    {`${metrics.alerts.lowStock} ${t.low_stock_desc || 'items are below minimum stock level'}`}
                  </AlertDescription>
                </Alert>
              )}
              {metrics?.orders?.pending > 0 && (
                <Alert variant="info">
                  <Bell className="h-4 w-4" />
                  <AlertTitle>{t.payment_pending || 'Payment Pending'}</AlertTitle>
                  <AlertDescription>
                    {`${metrics.orders.pending} pending invoices`}
                  </AlertDescription>
                </Alert>
              )}
              {metrics?.alerts?.overdueInvoices > 0 && (
                <Alert variant="warning">
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Overdue Invoices</AlertTitle>
                  <AlertDescription>
                    {`${metrics.alerts.overdueInvoices} invoices are overdue`}
                  </AlertDescription>
                </Alert>
              )}
              {alerts.length === 0 && (
                <Alert variant="success">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>{t.system_update || 'System Update'}</AlertTitle>
                  <AlertDescription>
                    {t.smooth_running || 'All systems running smoothly.'} {format(new Date(), 'MMM dd, yyyy')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


