'use client';

import { useState, useMemo, useEffect } from 'react';
import { DollarSign, ShoppingCart, Shield, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDomainColors } from '@/lib/domainColors';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { formatCurrency } from '@/lib/currency';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import { RevenueAreaChart } from '@/components/AdvancedCharts';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getDashboardMetricsAction } from '@/lib/actions/premium/ai/analytics';
import { InventoryValuationWidget } from '@/components/dashboard/widgets/InventoryValuationWidget';
import { SerialWarrantyWidget } from '@/components/dashboard/widgets/SerialWarrantyWidget';
import { WarehouseDistributionWidget } from '@/components/dashboard/widgets/WarehouseDistributionWidget';
import { BrandPerformanceWidget } from '@/components/dashboard/widgets/BrandPerformanceWidget';

/**
 * ElectronicsDashboard Component
 * 
 * Specialized dashboard for electronics businesses
 * Features warranty tracking, serial numbers, brand performance
 */
export function ElectronicsDashboard({ businessId, category, onQuickAction }) {
  const { business, currency: currencyFromContext } = useBusiness();
  const currency = currencyFromContext || 'PKR';
  const { language } = useLanguage();
  const t = translations[language] || translations['en'] || {};
  const colors = getDomainColors(category) || {};
  const knowledge = getDomainKnowledge(category) || {};
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    async function loadMetrics() {
      if (!businessId) return;
      setLoading(true);
      try {
        const res = await getDashboardMetricsAction(businessId);
        if (res.success) setMetrics(res.data);
      } catch (error) {
        console.error('Failed to load dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, [businessId]);

  const stats = useMemo(() => {
    if (!metrics) return [];
    return [
      {
        label: t.total_revenue || 'Total Revenue',
        value: formatCurrency(metrics.revenue || 0, currency),
        change: metrics.growth?.value || '+0%',
        trend: metrics.growth?.trend || 'up',
        icon: DollarSign,
        bg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        target: 800000,
        current: metrics.revenue || 0,
      },
      {
        label: t.total_orders || 'Total Orders',
        value: metrics.orders?.total?.toString() || '0',
        change: `${metrics.orders?.paid || 0} paid`,
        trend: 'up',
        icon: ShoppingCart,
        bg: 'bg-green-50',
        iconColor: 'text-green-600',
        target: 300,
        current: metrics.orders?.total || 0,
      },
      {
        label: t.active_warranties || 'Active Warranties',
        value: metrics.warranties?.active?.toString() || '0',
        change: `${metrics.warranties?.expiring || 0} expiring`,
        trend: 'up',
        icon: Shield,
        bg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        target: 500,
        current: metrics.warranties?.active || 0,
      },
      {
        label: t.low_stock_items || 'Low Stock Items',
        value: metrics.alerts?.lowStock?.toString() || '0',
        change: metrics.alerts?.lowStock > 0 ? (t.action_required || 'Action Required') : (t.optimal || 'Optimal'),
        trend: metrics.alerts?.lowStock > 0 ? 'down' : 'up',
        icon: AlertTriangle,
        bg: 'bg-red-50',
        iconColor: 'text-red-600',
        target: 10,
        current: metrics.alerts?.lowStock || 0,
      },
    ];
  }, [metrics, currency, t]);

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass-card border-none">
              <CardHeader className="pb-2"><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></CardHeader>
              <CardContent><div className="h-8 bg-gray-200 rounded animate-pulse w-32 mb-2" /><div className="h-3 bg-gray-100 rounded animate-pulse w-20" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const progress = Math.min((stat.current / stat.target) * 100, 100);
          return (
            <Card key={idx} className="glass-card cursor-pointer border-none hover:shadow-lg transition-shadow" onClick={() => onQuickAction?.(stat.label.toLowerCase().replace(/ /g, '-'))}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">{stat.label}</CardTitle>
                <div className={`p-2.5 rounded-2xl ${stat.bg} border ${stat.bg.replace('bg-', 'border-').replace('-50', '-200')} shadow-inner`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-semibold text-premium-gradient mb-1">{stat.value}</div>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <div className={`flex items-center px-1.5 py-0.5 rounded-full ${stat.trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                      {stat.change}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-100/50 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%`, backgroundColor: colors.primary || '#3B82F6' }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader><CardTitle className="text-lg font-bold text-gray-800">{t.revenue_performance || 'Revenue Performance'}</CardTitle></CardHeader>
        <CardContent className="h-[300px] w-full pl-0"><RevenueAreaChart data={[]} colors={colors} /></CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SerialWarrantyWidget businessId={businessId} onViewDetails={(type) => onQuickAction?.(`view-${type}`)} />
        <BrandPerformanceWidget businessId={businessId} currency={currency} onViewDetails={(type) => onQuickAction?.(`view-${type}`)} />
        <InventoryValuationWidget businessId={businessId} costingMethod={knowledge?.stockValuationMethod || "FIFO"} currency={currency} onViewDetails={(type) => onQuickAction?.(`view-${type}`)} />
        <WarehouseDistributionWidget businessId={businessId} currency={currency} onViewDetails={(type) => onQuickAction?.(`view-${type}`)} />
      </div>
    </div>
  );
}
