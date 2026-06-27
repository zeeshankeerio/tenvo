'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users,
  AlertTriangle, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight,
  Pill, FileText, Shield
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getDomainColors } from '@/lib/domainColors';
import { BRAND_PRIMARY } from '@/lib/theme/brandTokens';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import { RevenueAreaChart } from '@/components/AdvancedCharts';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getDashboardMetricsAction } from '@/lib/actions/premium/ai/analytics';

// Import existing widgets
import { InventoryValuationWidget } from '@/components/dashboard/widgets/InventoryValuationWidget';
import { BatchExpiryWidget } from '@/components/dashboard/widgets/BatchExpiryWidget';
import { FBRComplianceWidget } from '@/components/dashboard/widgets/FBRComplianceWidget';

/**
 * PharmacyDashboard Component
 * 
 * Specialized dashboard for pharmaceutical businesses
 * Extends EnhancedDashboard with pharmacy-specific widgets and features
 * 
 * Key Features:
 * - Prominent drug expiry calendar with 90-day alerts
 * - FBR compliance tracking (filing status, tax summary, deadlines)
 * - Controlled substance tracking (Schedule H/X drugs)
 * - Prescription capture rate tracking
 * - Batch tracking with FEFO (First Expiry First Out)
 * - Regulatory compliance monitoring
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} props.category - Business category (should be 'pharmacy')
 * @param {Function} [props.onQuickAction] - Quick action callback
 */
export function PharmacyDashboard({ businessId, category, onQuickAction }) {
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

  // Build pharmacy-specific stats
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
        target: 500000,
        current: metrics.revenue || 0,
      },
      {
        label: t.prescriptions || 'Prescriptions',
        value: metrics.prescriptions?.total?.toString() || '0',
        change: `${metrics.prescriptions?.filled || 0} filled`,
        trend: 'up',
        icon: FileText,
        bg: 'bg-green-50',
        iconColor: 'text-green-600',
        target: 200,
        current: metrics.prescriptions?.total || 0,
      },
      {
        label: t.expiring_drugs || 'Expiring Drugs',
        value: metrics.alerts?.expiringBatches?.toString() || '0',
        change: metrics.alerts?.expiringBatches > 0 ? (t.action_required || 'Action Required') : (t.optimal || 'Optimal'),
        trend: metrics.alerts?.expiringBatches > 0 ? 'down' : 'up',
        icon: AlertTriangle,
        bg: 'bg-orange-50',
        iconColor: 'text-orange-600',
        target: 10,
        current: metrics.alerts?.expiringBatches || 0,
      },
      {
        label: t.controlled_substances || 'Controlled Substances',
        value: metrics.controlledSubstances?.count?.toString() || '0',
        change: t.compliant || 'Compliant',
        trend: 'up',
        icon: Shield,
        bg: 'bg-wine-50',
        iconColor: 'text-wine-600',
        target: 50,
        current: metrics.controlledSubstances?.count || 0,
      },
    ];
  }, [metrics, currency, t]);

  const quickActions = [
    { label: t.new_prescription || 'New Prescription', icon: FileText, id: 'new-prescription' },
    { label: t.new_invoice, icon: DollarSign, id: 'new-invoice' },
    { label: t.add_drug || 'Add Drug', icon: Pill, id: 'add-product' },
    { label: t.new_customer, icon: Users, id: 'new-customer' },
  ];

  const recentActivity = useMemo(() => {
    if (!metrics) {
      return [
        { type: 'system', message: 'Loading activity...', time: 'Just now', status: 'neutral' }
      ];
    }

    const activities = [];

    if (metrics.prescriptions?.pending > 0) {
      activities.push({
        type: 'prescription',
        message: `${metrics.prescriptions.pending} pending prescriptions`,
        time: 'Today',
        status: 'warning'
      });
    }

    if (metrics.alerts?.expiringBatches > 0) {
      activities.push({
        type: 'alert',
        message: `${metrics.alerts.expiringBatches} drugs expiring soon`,
        time: 'Now',
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
    if (metrics.alerts?.expiringBatches > 0) list.push('expiring_drugs');
    if (metrics.alerts?.overdueInvoices > 0) list.push('payment_overdue');
    if (metrics.controlledSubstances?.violations > 0) list.push('controlled_substance_alert');
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
      {/* Pharmacy-Specific Alert Banner */}
      {metrics.alerts?.expiringBatches > 5 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">{t.drug_expiry_alert || 'Drug Expiry Alert'}</AlertTitle>
          <AlertDescription>
            {metrics.alerts.expiringBatches} {t.drugs_expiring_90_days || 'drugs are expiring within 90 days. Review FEFO compliance immediately.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid with Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const progress = Math.min((stat.current / stat.target) * 100, 100);
          return (
            <Card
              key={idx}
              className="glass-card cursor-pointer border-none hover:shadow-lg transition-shadow"
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
                        backgroundColor: colors.primary || BRAND_PRIMARY,
                        boxShadow: `0 0 8px ${colors.primary || BRAND_PRIMARY}40`,
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
            <CardTitle className="text-lg font-semibold text-neutral-900">
              {t.revenue_performance || 'Revenue Performance'}
            </CardTitle>
            <CardDescription>{t.monthly_revenue_expenses || 'Monthly revenue vs expenses overview'}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs">
              {t.last_6_months || 'Last 6 Months'}
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

      {/* Pharmacy-Specific Widgets Grid - 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Drug Expiry Widget - Prominent for pharmacy */}
        <BatchExpiryWidget
          businessId={businessId}
          currency={currency}
          onViewDetails={(type) => onQuickAction?.(`view-${type}`)}
        />

        {/* FBR Compliance Widget - Critical for Pakistani pharmacies */}
        <FBRComplianceWidget
          businessId={businessId}
          currency={currency}
          onViewDetails={(type) => onQuickAction?.(`view-${type}`)}
        />

        {/* Inventory Valuation Widget */}
        <InventoryValuationWidget
          businessId={businessId}
          costingMethod={knowledge?.stockValuationMethod || "FEFO"}
          currency={currency}
          onViewDetails={(type) => onQuickAction?.(`view-${type}`)}
        />

        {/* Controlled Substances Widget - Placeholder for future implementation */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-gray-900">
                  {t.controlled_substances || 'Controlled Substances'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.schedule_h_tracking || 'Schedule H/X tracking'}
                </CardDescription>
              </div>
              <div className="p-2.5 rounded-2xl bg-wine-50 border border-wine-200 shadow-inner">
                <Shield className="w-5 h-5 text-wine-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Shield className="w-12 h-12 text-wine-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-wine-700">
                {t.coming_soon || 'Coming Soon'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t.controlled_substance_tracking || 'Controlled substance tracking'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

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
              {metrics?.alerts?.expiringBatches > 0 && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t.drug_expiry || 'Drug Expiry'}</AlertTitle>
                  <AlertDescription>
                    {`${metrics.alerts.expiringBatches} ${t.drugs_expiring_soon || 'drugs are expiring soon'}`}
                  </AlertDescription>
                </Alert>
              )}
              {metrics?.orders?.pending > 0 && (
                <Alert variant="info">
                  <FileText className="h-4 w-4" />
                  <AlertTitle>{t.pending_prescriptions || 'Pending Prescriptions'}</AlertTitle>
                  <AlertDescription>
                    {`${metrics.orders.pending} prescriptions awaiting fulfillment`}
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


