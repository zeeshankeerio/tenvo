'use client';

import { useMemo } from 'react';
import { EnhancedDashboard } from '@/components/EnhancedDashboard';
import { TodaysSalesWidget } from '@/components/dashboard/widgets/TodaysSalesWidget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Users, 
  FileText,
  Award,
  Clock,
  ShoppingCart,
  Plus,
  ArrowRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';

/**
 * SalesDashboard Component
 * 
 * Sales staff dashboard optimized for quick access to daily sales operations
 * Simplified layout for speed with essential sales tools:
 * - TodaysSalesWidget (today's sales summary)
 * - QuickInvoiceWidget (quick invoice creation)
 * - CustomerListWidget (recent customers)
 * - CommissionTrackingWidget (commission earned)
 * 
 * Requirements: 6.5
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} props.userId - User ID
 * @param {string} props.category - Business category slug
 * @param {string} props.currency - Currency code (default: 'PKR')
 * @param {Function} props.onQuickAction - Quick action callback
 */
export function SalesDashboard({ 
  businessId,
  userId,
  category,
  currency = 'PKR',
  onQuickAction 
}) {
  const { language } = useLanguage();
  const t = translations[language] || translations['en'] || {};

  // Mock today's sales data (in real implementation, fetch from API)
  const todaysSales = useMemo(() => ({
    totalSales: 45000,
    totalOrders: 12,
    avgOrderValue: 3750,
    target: 50000,
    achievement: 90,
    trend: 'up',
    hourlyBreakdown: [
      { hour: '9-10', sales: 5000, orders: 2 },
      { hour: '10-11', sales: 8000, orders: 3 },
      { hour: '11-12', sales: 12000, orders: 3 },
      { hour: '12-1', sales: 6000, orders: 1 },
      { hour: '1-2', sales: 9000, orders: 2 },
      { hour: '2-3', sales: 5000, orders: 1 }
    ]
  }), []);

  // Mock recent customers (in real implementation, fetch from API)
  const recentCustomers = useMemo(() => [
    {
      id: 1,
      name: 'Ahmed Khan',
      phone: '0300-1234567',
      lastPurchase: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      totalSpent: 15000,
      orderCount: 3,
      status: 'regular'
    },
    {
      id: 2,
      name: 'Fatima Ali',
      phone: '0321-9876543',
      lastPurchase: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      totalSpent: 8500,
      orderCount: 2,
      status: 'new'
    },
    {
      id: 3,
      name: 'Hassan Raza',
      phone: '0333-5555555',
      lastPurchase: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      totalSpent: 45000,
      orderCount: 8,
      status: 'vip'
    },
    {
      id: 4,
      name: 'Ayesha Malik',
      phone: '0345-7777777',
      lastPurchase: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
      totalSpent: 22000,
      orderCount: 5,
      status: 'regular'
    }
  ], []);

  // Mock commission data (in real implementation, fetch from API)
  const commission = useMemo(() => ({
    todayEarned: 2250,
    monthlyEarned: 42000,
    monthlyTarget: 50000,
    achievement: 84,
    rate: 5, // percentage
    pendingAmount: 8000,
    lastPayout: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    nextPayout: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000) // 23 days from now
  }), []);

  const getCustomerStatusColor = (status) => {
    const colors = {
      vip: 'bg-wine-100 text-wine-700 border-wine-200',
      regular: 'bg-blue-100 text-blue-700 border-blue-200',
      new: 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[status] || colors.regular;
  };

  const getCustomerStatusLabel = (status) => {
    const labels = {
      vip: t.vip || 'VIP',
      regular: t.regular || 'Regular',
      new: t.new || 'New'
    };
    return labels[status] || status;
  };

  const formatTimeAgo = (date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return t.just_now || 'Just now';
    if (hours < 24) return `${hours}h ${t.ago || 'ago'}`;
    const days = Math.floor(hours / 24);
    return `${days}d ${t.ago || 'ago'}`;
  };

  return (
    <div className="space-y-6">
      {/* Sales Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">
            {t.sales_dashboard || 'Sales Dashboard'}
          </h2>
          <p className="text-sm text-gray-500">
            {t.quick_sales_customer_management || 'Quick sales and customer management'}
          </p>
        </div>
        <Badge className="bg-green-600 text-white font-bold">
          {t.sales_staff || 'Sales Staff'}
        </Badge>
      </div>

      {/* Primary Action - Quick Invoice Creation */}
      <Card className="glass-card border-none bg-gradient-to-br from-wine/5 to-wine-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-wine/10 border border-wine/20 shadow-inner">
                <Plus className="w-8 h-8 text-wine" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {t.create_new_invoice || 'Create New Invoice'}
                </h3>
                <p className="text-sm text-gray-600">
                  {t.quick_invoice_creation || 'Quick invoice creation for walk-in customers'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => onQuickAction?.('create-invoice')}
              size="lg"
              className="font-bold px-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t.new_invoice || 'New Invoice'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales-Specific Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Sales Widget - Now using standalone component */}
        <TodaysSalesWidget
          businessId={businessId}
          currency={currency}
          data={todaysSales}
          onCreateInvoice={() => onQuickAction?.('create-invoice')}
          onViewReport={() => onQuickAction?.('view-sales-report')}
        />

        {/* Commission Tracking Widget */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-gray-900">
                  {t.commission_tracking || 'Commission Tracking'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.your_earnings_progress || 'Your earnings and progress'}
                </CardDescription>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 shadow-inner">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Today's Commission */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  {t.today_earned || 'Today Earned'}
                </span>
              </div>
              <div className="text-3xl font-black text-amber-900">
                {formatCurrency(commission.todayEarned, currency)}
              </div>
              <div className="text-xs text-amber-700 mt-1">
                {commission.rate}% {t.commission_rate || 'commission rate'}
              </div>
            </div>

            {/* Monthly Progress */}
            <div className="p-4 rounded-lg bg-gray-50/50 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.monthly_progress || 'Monthly Progress'}
                </span>
                <Badge className="bg-blue-100 text-blue-700 font-bold text-xs">
                  {commission.achievement}%
                </Badge>
              </div>
              
              <div className="mb-2">
                <div className="text-2xl font-black text-gray-900">
                  {formatCurrency(commission.monthlyEarned, currency)}
                </div>
                <div className="text-xs text-gray-600">
                  {t.of || 'of'} {formatCurrency(commission.monthlyTarget, currency)} {t.target || 'target'}
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                  style={{ width: `${commission.achievement}%` }}
                />
              </div>
            </div>

            {/* Payout Information */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 border border-gray-100">
                <div>
                  <div className="text-xs font-bold text-gray-900">
                    {t.pending_amount || 'Pending Amount'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t.awaiting_payout || 'Awaiting payout'}
                  </div>
                </div>
                <div className="text-lg font-black text-gray-900">
                  {formatCurrency(commission.pendingAmount, currency)}
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 border border-gray-100">
                <div>
                  <div className="text-xs font-bold text-gray-900">
                    {t.next_payout || 'Next Payout'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {commission.nextPayout.toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="outline" className="font-bold text-xs">
                  {Math.ceil((commission.nextPayout - Date.now()) / (1000 * 60 * 60 * 24))} {t.days || 'days'}
                </Badge>
              </div>
            </div>

            {/* Quick Action */}
            <button
              onClick={() => onQuickAction?.('view-commission-history')}
              className="w-full text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors py-2"
            >
              {t.view_commission_history || 'View Commission History'} →
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Customer List Widget */}
      <Card className="glass-card border-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-gray-900">
                {t.recent_customers || 'Recent Customers'}
              </CardTitle>
              <CardDescription className="text-xs">
                {t.quick_access_customer_info || 'Quick access to customer information'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onQuickAction?.('add-customer')}
                size="sm"
                variant="outline"
                className="font-bold"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t.add_customer || 'Add Customer'}
              </Button>
              <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-inner">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2">
            {recentCustomers.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50 transition-colors cursor-pointer"
                onClick={() => onQuickAction?.('view-customer', customer.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2.5 rounded-lg bg-white border border-gray-200">
                    <Users className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900 truncate">
                        {customer.name}
                      </span>
                      <Badge className={`${getCustomerStatusColor(customer.status)} text-[10px] font-bold`}>
                        {getCustomerStatusLabel(customer.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{customer.phone}</span>
                      <span>*</span>
                      <span>{customer.orderCount} {t.orders || 'orders'}</span>
                      <span>*</span>
                      <span>{formatTimeAgo(customer.lastPurchase)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="text-sm font-bold text-gray-900">
                    {formatCurrency(customer.totalSpent, currency)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t.total_spent || 'total spent'}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-2" />
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => onQuickAction?.('view-all-customers')}
              className="flex-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors py-2"
            >
              {t.view_all_customers || 'View All Customers'} →
            </button>
            <button
              onClick={() => onQuickAction?.('search-customer')}
              className="flex-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors py-2"
            >
              {t.search_customers || 'Search Customers'} →
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Dashboard - Limited Widget Access */}
      <EnhancedDashboard
        businessId={businessId}
        category={category}
        onQuickAction={onQuickAction}
      />
    </div>
  );
}


