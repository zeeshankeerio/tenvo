'use client';

import { useMemo } from 'react';
import { EnhancedDashboard } from '@/components/EnhancedDashboard';
import { SystemHealthWidget } from '@/components/dashboard/widgets/SystemHealthWidget';
import { AuditTrailViewer } from '@/components/inventory/AuditTrailViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Target,
  Award,
  Activity
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';

/**
 * OwnerDashboard Component
 * 
 * Complete business overview dashboard for owner/admin role
 * Extends EnhancedDashboard with owner-specific features:
 * - Complete business overview (all widgets available)
 * - SystemHealthWidget (server status, database performance)
 * - TeamPerformanceWidget (sales by team member)
 * - AuditLogsWidget (recent system activities)
 * - Prominent financial summary section
 * 
 * Requirements: 6.3
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} props.category - Business category slug
 * @param {string} props.currency - Currency code (default: 'PKR')
 * @param {Function} props.onQuickAction - Quick action callback
 */
export function OwnerDashboard({ 
  businessId, 
  category,
  currency = 'PKR',
  onQuickAction 
}) {
  const { language } = useLanguage();
  const t = translations[language] || translations['en'] || {};

  // Mock team performance data (in real implementation, fetch from API)
  const teamPerformance = useMemo(() => [
    {
      id: 1,
      name: 'Ahmed Khan',
      role: 'Sales Manager',
      sales: 450000,
      orders: 45,
      target: 500000,
      achievement: 90,
      trend: 'up'
    },
    {
      id: 2,
      name: 'Fatima Ali',
      role: 'Sales Staff',
      sales: 320000,
      orders: 38,
      target: 300000,
      achievement: 107,
      trend: 'up'
    },
    {
      id: 3,
      name: 'Hassan Raza',
      role: 'Sales Staff',
      sales: 280000,
      orders: 32,
      target: 300000,
      achievement: 93,
      trend: 'down'
    }
  ], []);

  // Calculate financial summary
  const financialSummary = useMemo(() => ({
    totalRevenue: 1050000,
    totalExpenses: 420000,
    netProfit: 630000,
    profitMargin: 60,
    growthRate: 15.5
  }), []);

  return (
    <div className="space-y-6">
      {/* Owner Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">
            {t.owner_dashboard || 'Owner Dashboard'}
          </h2>
          <p className="text-sm text-gray-500">
            {t.complete_business_overview || 'Complete business overview with all features'}
          </p>
        </div>
        <Badge className="bg-wine text-white font-bold">
          {t.owner || 'Owner'}
        </Badge>
      </div>

      {/* Financial Summary Section - Prominent */}
      <Card className="glass-card border-none bg-gradient-to-br from-wine/5 to-wine-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                {t.financial_summary || 'Financial Summary'}
              </CardTitle>
              <CardDescription className="text-xs">
                {t.current_month_performance || 'Current month performance'}
              </CardDescription>
            </div>
            <div className="p-3 rounded-2xl bg-wine/10 border border-wine/20 shadow-inner">
              <DollarSign className="w-6 h-6 text-wine" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Revenue */}
            <div className="p-4 rounded-xl bg-white/80 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  {t.total_revenue || 'Total Revenue'}
                </span>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl font-black text-gray-900 mb-1">
                {formatCurrency(financialSummary.totalRevenue, currency)}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Badge className="bg-green-100 text-green-700 text-[10px] font-bold">
                  +{financialSummary.growthRate}%
                </Badge>
                <span className="text-gray-500">{t.vs_last_month || 'vs last month'}</span>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="p-4 rounded-xl bg-white/80 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  {t.total_expenses || 'Total Expenses'}
                </span>
                <Activity className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-2xl font-black text-gray-900 mb-1">
                {formatCurrency(financialSummary.totalExpenses, currency)}
              </div>
              <div className="text-xs text-gray-500">
                {((financialSummary.totalExpenses / financialSummary.totalRevenue) * 100).toFixed(1)}% {t.of_revenue || 'of revenue'}
              </div>
            </div>

            {/* Net Profit */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-green-700 uppercase tracking-wider">
                  {t.net_profit || 'Net Profit'}
                </span>
                <Award className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl font-black text-green-900 mb-1">
                {formatCurrency(financialSummary.netProfit, currency)}
              </div>
              <div className="text-xs text-green-700 font-bold">
                {financialSummary.profitMargin}% {t.profit_margin || 'profit margin'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Dashboard - All Widgets Available */}
      <EnhancedDashboard
        businessId={businessId}
        category={category}
        onQuickAction={onQuickAction}
      />

      {/* Owner-Specific Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Health Widget */}
        <SystemHealthWidget
          businessId={businessId}
          onViewLogs={() => onQuickAction?.('view-system-logs')}
        />

        {/* Team Performance Widget */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-gray-900">
                  {t.team_performance || 'Team Performance'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.sales_by_team_member || 'Sales by team member'}
                </CardDescription>
              </div>
              <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-inner">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {teamPerformance.map((member) => (
              <div 
                key={member.id}
                className="p-3 rounded-lg bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-sm text-gray-900">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.role}</div>
                  </div>
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
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{t.sales || 'Sales'}</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(member.sales, currency)}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        member.achievement >= 100
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                      }`}
                      style={{ width: `${Math.min(member.achievement, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>{member.orders} {t.orders || 'orders'}</span>
                    <span>
                      {t.target || 'Target'}: {formatCurrency(member.target, currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            <button
              onClick={() => onQuickAction?.('view-team-details')}
              className="w-full text-xs font-bold text-wine hover:text-wine/80 transition-colors py-2"
            >
              {t.view_detailed_report || 'View Detailed Report'} →
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Audit Trail Section */}
      <Card className="glass-card border-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                {t.recent_system_activities || 'Recent System Activities'}
              </CardTitle>
              <CardDescription className="text-xs">
                {t.audit_trail_overview || 'Comprehensive audit trail with full details'}
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-bold">
              {t.last_24_hours || 'Last 24 Hours'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <AuditTrailViewer
            businessId={businessId}
            currency={currency}
          />
        </CardContent>
      </Card>
    </div>
  );
}


