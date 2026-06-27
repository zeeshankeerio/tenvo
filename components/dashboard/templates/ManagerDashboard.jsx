'use client';

import { useMemo } from 'react';
import { EnhancedDashboard } from '@/components/EnhancedDashboard';
import { PendingApprovalsWidget } from '@/components/dashboard/widgets/PendingApprovalsWidget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Target,
  TrendingUp,
  AlertTriangle,
  Package,
  DollarSign,
  Award,
  Activity
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';

/**
 * ManagerDashboard Component
 * 
 * Manager-specific dashboard with approval queue and team management
 * Extends EnhancedDashboard with manager-specific features:
 * - Prominent PendingApprovalsWidget (approval queue)
 * - TeamProductivityWidget (team metrics)
 * - InventoryAlertsWidget (low stock, expiry alerts)
 * - SalesTargetsWidget (target vs actual)
 * - Integrates with existing ApprovalQueue from Phase 2
 * 
 * Requirements: 6.4
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} props.userId - User ID
 * @param {string} props.category - Business category slug
 * @param {string} props.currency - Currency code (default: 'PKR')
 * @param {Function} props.onQuickAction - Quick action callback
 */
export function ManagerDashboard({ 
  businessId,
  userId,
  category,
  currency = 'PKR',
  onQuickAction 
}) {
  const { language } = useLanguage();
  const t = translations[language] || translations['en'] || {};

  // Mock team productivity data (in real implementation, fetch from API)
  const teamProductivity = useMemo(() => ({
    totalSales: 850000,
    totalOrders: 95,
    teamMembers: 5,
    avgOrderValue: 8947,
    topPerformer: {
      name: 'Fatima Ali',
      sales: 320000,
      achievement: 107
    },
    members: [
      {
        id: 1,
        name: 'Fatima Ali',
        sales: 320000,
        orders: 38,
        target: 300000,
        achievement: 107
      },
      {
        id: 2,
        name: 'Hassan Raza',
        sales: 280000,
        orders: 32,
        target: 300000,
        achievement: 93
      },
      {
        id: 3,
        name: 'Ayesha Khan',
        sales: 250000,
        orders: 25,
        target: 250000,
        achievement: 100
      }
    ]
  }), []);

  // Mock inventory alerts (in real implementation, fetch from API)
  const inventoryAlerts = useMemo(() => ({
    lowStock: 8,
    expiringBatches: 5,
    expiredBatches: 2,
    warrantyExpiring: 3,
    totalAlerts: 18
  }), []);

  // Mock sales targets (in real implementation, fetch from API)
  const salesTargets = useMemo(() => ({
    monthly: {
      target: 1000000,
      actual: 850000,
      achievement: 85,
      remaining: 150000,
      daysLeft: 8
    },
    quarterly: {
      target: 3000000,
      actual: 2450000,
      achievement: 82
    }
  }), []);

  return (
    <div className="space-y-6">
      {/* Manager Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {t.manager_dashboard || 'Manager Dashboard'}
          </h2>
          <p className="text-sm text-gray-500">
            {t.approval_queue_team_management || 'Approval queue and team management'}
          </p>
        </div>
        <Badge className="bg-indigo-600 text-white font-bold">
          {t.manager || 'Manager'}
        </Badge>
      </div>

      {/* Manager-Specific Widgets Grid - Top Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Approvals Widget - PROMINENT */}
        <PendingApprovalsWidget
          businessId={businessId}
          userId={userId}
          userRole="manager"
          currency={currency}
          onViewQueue={() => onQuickAction?.('view-approval-queue')}
        />

        {/* Team Productivity Widget */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-gray-900">
                  {t.team_productivity || 'Team Productivity'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.current_month_performance || 'Current month performance'}
                </CardDescription>
              </div>
              <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-inner">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                    {t.total_sales || 'Total Sales'}
                  </span>
                </div>
                <div className="text-xl font-semibold text-blue-900">
                  {formatCurrency(teamProductivity.totalSales, currency)}
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-bold text-green-700 uppercase tracking-wider">
                    {t.total_orders || 'Total Orders'}
                  </span>
                </div>
                <div className="text-xl font-semibold text-green-900">
                  {teamProductivity.totalOrders}
                </div>
              </div>
            </div>

            {/* Top Performer */}
            <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  {t.top_performer || 'Top Performer'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-gray-900">
                    {teamProductivity.topPerformer.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {formatCurrency(teamProductivity.topPerformer.sales, currency)}
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 font-bold">
                  {teamProductivity.topPerformer.achievement}%
                </Badge>
              </div>
            </div>

            {/* Team Members */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                {t.team_members || 'Team Members'}
              </div>
              {teamProductivity.members.map((member) => (
                <div 
                  key={member.id}
                  className="p-2.5 rounded-lg bg-gray-50/50 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-900">{member.name}</span>
                    <Badge 
                      className={`text-[10px] font-bold ${
                        member.achievement >= 100 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {member.achievement}%
                    </Badge>
                  </div>
                  <Progress 
                    value={Math.min(member.achievement, 100)} 
                    className="h-1.5"
                  />
                  <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
                    <span>{formatCurrency(member.sales, currency)}</span>
                    <span>{member.orders} {t.orders || 'orders'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Action */}
            <button
              onClick={() => onQuickAction?.('view-team-details')}
              className="w-full text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors py-2"
            >
              {t.view_detailed_report || 'View Detailed Report'} →
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inventory Alerts Widget */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-gray-900">
                  {t.inventory_alerts || 'Inventory Alerts'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.items_requiring_attention || 'Items requiring attention'}
                </CardDescription>
              </div>
              <div className="p-2.5 rounded-2xl bg-red-50 border border-red-200 shadow-inner">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Alert Summary */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200">
              <div className="text-3xl font-semibold text-red-700 mb-1">
                {inventoryAlerts.totalAlerts}
              </div>
              <div className="text-xs font-bold text-red-600 uppercase tracking-wider">
                {t.total_alerts || 'Total Alerts'}
              </div>
            </div>

            {/* Alert Breakdown */}
            <div className="space-y-2">
              <div 
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50 transition-colors cursor-pointer"
                onClick={() => onQuickAction?.('view-low-stock')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 border border-red-200">
                    <Package className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {t.low_stock_items || 'Low Stock Items'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t.below_minimum_level || 'Below minimum level'}
                    </div>
                  </div>
                </div>
                <Badge className="bg-red-100 text-red-700 font-bold">
                  {inventoryAlerts.lowStock}
                </Badge>
              </div>

              <div 
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50 transition-colors cursor-pointer"
                onClick={() => onQuickAction?.('view-expiring-batches')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 border border-orange-200">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {t.expiring_batches || 'Expiring Batches'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t.within_90_days || 'Within 90 days'}
                    </div>
                  </div>
                </div>
                <Badge className="bg-orange-100 text-orange-700 font-bold">
                  {inventoryAlerts.expiringBatches}
                </Badge>
              </div>

              <div 
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50 transition-colors cursor-pointer"
                onClick={() => onQuickAction?.('view-warranty-expiring')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 border border-yellow-200">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {t.warranty_expiring || 'Warranty Expiring'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t.within_30_days || 'Within 30 days'}
                    </div>
                  </div>
                </div>
                <Badge className="bg-yellow-100 text-yellow-700 font-bold">
                  {inventoryAlerts.warrantyExpiring}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Targets Widget */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-gray-900">
                  {t.sales_targets || 'Sales Targets'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.target_vs_actual || 'Target vs actual performance'}
                </CardDescription>
              </div>
              <div className="p-2.5 rounded-2xl bg-green-50 border border-green-200 shadow-inner">
                <Target className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Monthly Target */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">
                    {t.monthly_target || 'Monthly Target'}
                  </div>
                  <div className="text-2xl font-semibold text-green-900">
                    {salesTargets.monthly.achievement}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-green-600 mb-1">
                    {salesTargets.monthly.daysLeft} {t.days_left || 'days left'}
                  </div>
                  <Badge className="bg-green-600 text-white font-bold">
                    {t.on_track || 'On Track'}
                  </Badge>
                </div>
              </div>
              
              <Progress 
                value={salesTargets.monthly.achievement} 
                className="h-2 mb-2"
              />
              
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-600">{t.actual || 'Actual'}: </span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(salesTargets.monthly.actual, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">{t.target || 'Target'}: </span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(salesTargets.monthly.target, currency)}
                  </span>
                </div>
              </div>
              
              <div className="mt-2 pt-2 border-t border-green-200">
                <div className="text-xs text-green-700">
                  <span className="font-bold">
                    {formatCurrency(salesTargets.monthly.remaining, currency)}
                  </span>
                  {' '}{t.remaining_to_target || 'remaining to reach target'}
                </div>
              </div>
            </div>

            {/* Quarterly Target */}
            <div className="p-3 rounded-lg bg-gray-50/50 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.quarterly_target || 'Quarterly Target'}
                </span>
                <Badge className="bg-blue-100 text-blue-700 font-bold text-xs">
                  {salesTargets.quarterly.achievement}%
                </Badge>
              </div>
              
              <Progress 
                value={salesTargets.quarterly.achievement} 
                className="h-1.5 mb-2"
              />
              
              <div className="flex items-center justify-between text-[10px] text-gray-600">
                <span>
                  {formatCurrency(salesTargets.quarterly.actual, currency)}
                </span>
                <span>
                  / {formatCurrency(salesTargets.quarterly.target, currency)}
                </span>
              </div>
            </div>

            {/* Quick Action */}
            <button
              onClick={() => onQuickAction?.('view-sales-reports')}
              className="w-full text-xs font-bold text-green-600 hover:text-green-700 transition-colors py-2"
            >
              {t.view_sales_reports || 'View Sales Reports'} →
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Dashboard - All Available Widgets */}
      <EnhancedDashboard
        businessId={businessId}
        category={category}
        onQuickAction={onQuickAction}
      />
    </div>
  );
}
