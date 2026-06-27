'use client';

import { useMemo } from 'react';
import { EnhancedDashboard } from '@/components/EnhancedDashboard';
import { FBRComplianceWidget } from '@/components/dashboard/widgets/FBRComplianceWidget';
import { TaxCalculationsWidget } from '@/components/dashboard/widgets/TaxCalculationsWidget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Building2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';

/**
 * AccountantDashboard Component
 * 
 * Accountant dashboard optimized for financial management and compliance
 * Focused on financial operations:
 * - FinancialSummaryWidget (revenue, expenses, profit)
 * - TaxCalculationsWidget (PST/FST calculations)
 * - ExpenseTrackingWidget (expense breakdown)
 * - BankReconciliationWidget (reconciliation status)
 * - FBRComplianceWidget (tax compliance)
 * 
 * Requirements: 6.7
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} props.userId - User ID
 * @param {string} props.category - Business category slug
 * @param {string} props.currency - Currency code (default: 'PKR')
 * @param {Function} props.onQuickAction - Quick action callback
 */
export function AccountantDashboard({ 
  businessId,
  userId,
  category,
  currency = 'PKR',
  onQuickAction 
}) {
  const { language } = useLanguage();
  const t = translations[language] || translations['en'] || {};

  // Mock financial summary data (in real implementation, fetch from API)
  const financialSummary = useMemo(() => ({
    revenue: 2450000,
    expenses: 1850000,
    profit: 600000,
    profitMargin: 24.5,
    trend: {
      revenue: 12.5,
      expenses: 8.3,
      profit: 22.4
    },
    monthlyBreakdown: [
      { month: 'Jan', revenue: 2200000, expenses: 1700000, profit: 500000 },
      { month: 'Feb', revenue: 2300000, expenses: 1750000, profit: 550000 },
      { month: 'Mar', revenue: 2450000, expenses: 1850000, profit: 600000 }
    ]
  }), []);

  // Mock tax calculations (in real implementation, fetch from API)
  const taxCalculations = useMemo(() => ({
    totalSales: 2450000,
    taxableAmount: 2450000,
    pst: {
      rate: 17,
      amount: 416500
    },
    fst: {
      rate: 1,
      amount: 24500
    },
    totalTax: 441000,
    taxPaid: 400000,
    taxPending: 41000,
    nextFilingDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000)
  }), []);

  // Mock expense tracking (in real implementation, fetch from API)
  const expenseTracking = useMemo(() => ({
    totalExpenses: 1850000,
    byCategory: [
      { category: 'Salaries', amount: 800000, percentage: 43.2, trend: 'up', change: 5.2 },
      { category: 'Rent', amount: 250000, percentage: 13.5, trend: 'stable', change: 0 },
      { category: 'Utilities', amount: 150000, percentage: 8.1, trend: 'up', change: 3.5 },
      { category: 'Inventory', amount: 400000, percentage: 21.6, trend: 'down', change: -2.1 },
      { category: 'Marketing', amount: 100000, percentage: 5.4, trend: 'up', change: 8.7 },
      { category: 'Other', amount: 150000, percentage: 8.1, trend: 'stable', change: 1.2 }
    ],
    topExpenses: [
      { description: 'Staff Salaries - March', amount: 800000, date: new Date(), category: 'Salaries' },
      { description: 'Inventory Purchase - ABC Suppliers', amount: 400000, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), category: 'Inventory' },
      { description: 'Rent - Main Office', amount: 250000, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), category: 'Rent' }
    ]
  }), []);

  // Mock bank reconciliation (in real implementation, fetch from API)
  const bankReconciliation = useMemo(() => ({
    totalAccounts: 3,
    reconciledAccounts: 2,
    pendingAccounts: 1,
    accounts: [
      {
        id: 1,
        name: 'HBL Business Account',
        accountNumber: '****1234',
        bookBalance: 1250000,
        bankBalance: 1250000,
        difference: 0,
        status: 'reconciled',
        lastReconciled: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: 2,
        name: 'MCB Current Account',
        accountNumber: '****5678',
        bookBalance: 850000,
        bankBalance: 850000,
        difference: 0,
        status: 'reconciled',
        lastReconciled: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 3,
        name: 'UBL Savings Account',
        accountNumber: '****9012',
        bookBalance: 500000,
        bankBalance: 485000,
        difference: 15000,
        status: 'pending',
        lastReconciled: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      }
    ],
    unmatchedTransactions: 3,
    totalDifference: 15000
  }), []);

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3" />;
    return null;
  };

  const getTrendColor = (trend, isExpense = false) => {
    if (trend === 'stable') return 'text-gray-600';
    if (isExpense) {
      return trend === 'up' ? 'text-red-600' : 'text-green-600';
    }
    return trend === 'up' ? 'text-green-600' : 'text-red-600';
  };

  const getReconciliationStatusColor = (status) => {
    const colors = {
      reconciled: 'bg-green-100 text-green-700 border-green-200',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      error: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[status] || colors.pending;
  };

  const formatDate = (date) => {
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return t.today || 'Today';
    if (days === 1) return t.yesterday || 'Yesterday';
    return `${days}d ${t.ago || 'ago'}`;
  };

  return (
    <div className="space-y-6">
      {/* Accountant Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {t.accountant_dashboard || 'Accountant Dashboard'}
          </h2>
          <p className="text-sm text-gray-500">
            {t.financial_management_compliance || 'Financial management and compliance'}
          </p>
        </div>
        <Badge className="bg-blue-600 text-white font-bold">
          {t.accountant || 'Accountant'}
        </Badge>
      </div>

      {/* Financial Summary Widget - PROMINENT */}
      <Card className="glass-card border-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-gray-900">
                {t.financial_summary || 'Financial Summary'}
              </CardTitle>
              <CardDescription className="text-xs">
                {t.revenue_expenses_profit || 'Revenue, expenses, and profit overview'}
              </CardDescription>
            </div>
            <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 shadow-inner">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-bold text-green-700 uppercase tracking-wider">
                    {t.revenue || 'Revenue'}
                  </span>
                </div>
                <Badge className="bg-green-600 text-white text-[10px] font-bold">
                  +{financialSummary.trend.revenue}%
                </Badge>
              </div>
              <div className="text-2xl font-semibold text-green-900">
                {formatCurrency(financialSummary.revenue, currency)}
              </div>
              <div className="text-xs text-green-700 mt-1">
                {t.current_month || 'Current month'}
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
                    {t.expenses || 'Expenses'}
                  </span>
                </div>
                <Badge className="bg-red-600 text-white text-[10px] font-bold">
                  +{financialSummary.trend.expenses}%
                </Badge>
              </div>
              <div className="text-2xl font-semibold text-red-900">
                {formatCurrency(financialSummary.expenses, currency)}
              </div>
              <div className="text-xs text-red-700 mt-1">
                {t.current_month || 'Current month'}
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                    {t.profit || 'Profit'}
                  </span>
                </div>
                <Badge className="bg-blue-600 text-white text-[10px] font-bold">
                  +{financialSummary.trend.profit}%
                </Badge>
              </div>
              <div className="text-2xl font-semibold text-blue-900">
                {formatCurrency(financialSummary.profit, currency)}
              </div>
              <div className="text-xs text-blue-700 mt-1">
                {financialSummary.profitMargin}% {t.margin || 'margin'}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onQuickAction?.('view-profit-loss')}
              size="sm"
              variant="outline"
              className="flex-1 font-bold"
            >
              <FileText className="w-4 h-4 mr-1" />
              {t.profit_loss_report || 'P&L Report'}
            </Button>
            <Button
              onClick={() => onQuickAction?.('view-balance-sheet')}
              size="sm"
              variant="outline"
              className="flex-1 font-bold"
            >
              <PieChart className="w-4 h-4 mr-1" />
              {t.balance_sheet || 'Balance Sheet'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tax Calculations Widget */}
        <TaxCalculationsWidget
          businessId={businessId}
          data={taxCalculations}
          currency={currency}
          onViewDetails={(action) => onQuickAction?.(action)}
        />

        {/* Expense Tracking Widget */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-gray-900">
                  {t.expense_tracking || 'Expense Tracking'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.expense_breakdown || 'Expense breakdown by category'}
                </CardDescription>
              </div>
              <div className="p-2.5 rounded-2xl bg-orange-50 border border-orange-200 shadow-inner">
                <Receipt className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Total Expenses */}
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200">
              <div className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1">
                {t.total_expenses || 'Total Expenses'}
              </div>
              <div className="text-2xl font-semibold text-orange-900">
                {formatCurrency(expenseTracking.totalExpenses, currency)}
              </div>
            </div>

            {/* Expense Categories */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {expenseTracking.byCategory.map((category, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50 transition-colors cursor-pointer"
                  onClick={() => onQuickAction?.('view-category-expenses', category.category)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        {category.category}
                      </span>
                      <div className={`flex items-center gap-1 text-xs ${getTrendColor(category.trend, true)}`}>
                        {getTrendIcon(category.trend)}
                        {category.change !== 0 && (
                          <span>{Math.abs(category.change)}%</span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(category.amount, currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={category.percentage} className="h-1.5 flex-1" />
                    <span className="text-xs font-bold text-gray-600">
                      {category.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Action */}
            <button
              onClick={() => onQuickAction?.('view-all-expenses')}
              className="w-full text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors py-2"
            >
              {t.view_all_expenses || 'View All Expenses'} →
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Bank Reconciliation Widget */}
      <Card className="glass-card border-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-gray-900">
                {t.bank_reconciliation || 'Bank Reconciliation'}
              </CardTitle>
              <CardDescription className="text-xs">
                {t.reconciliation_status || 'Account reconciliation status'}
              </CardDescription>
            </div>
            <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-inner">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Reconciliation Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
              <div className="text-2xl font-semibold text-blue-700">
                {bankReconciliation.totalAccounts}
              </div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                {t.total_accounts || 'Total Accounts'}
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200">
              <div className="text-2xl font-semibold text-green-700">
                {bankReconciliation.reconciledAccounts}
              </div>
              <div className="text-xs font-bold text-green-600 uppercase tracking-wider">
                {t.reconciled || 'Reconciled'}
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200">
              <div className="text-2xl font-semibold text-yellow-700">
                {bankReconciliation.pendingAccounts}
              </div>
              <div className="text-xs font-bold text-yellow-600 uppercase tracking-wider">
                {t.pending || 'Pending'}
              </div>
            </div>
          </div>

          {/* Account List */}
          <div className="space-y-2">
            {bankReconciliation.accounts.map((account) => (
              <div
                key={account.id}
                className={`p-3 rounded-lg border ${getReconciliationStatusColor(account.status)} hover:opacity-80 transition-opacity cursor-pointer`}
                onClick={() => onQuickAction?.('reconcile-account', account.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900">
                      {account.name}
                    </div>
                    <div className="text-xs text-gray-600">
                      {account.accountNumber}
                    </div>
                  </div>
                  <Badge className={`${getReconciliationStatusColor(account.status)} text-[10px] font-bold ml-2`}>
                    {account.status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <div className="text-gray-600">{t.book_balance || 'Book Balance'}</div>
                    <div className="font-bold text-gray-900">
                      {formatCurrency(account.bookBalance, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">{t.bank_balance || 'Bank Balance'}</div>
                    <div className="font-bold text-gray-900">
                      {formatCurrency(account.bankBalance, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">{t.difference || 'Difference'}</div>
                    <div className={`font-bold ${account.difference === 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {account.difference === 0 ? '✓' : formatCurrency(account.difference, currency)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {t.last_reconciled || 'Last reconciled'}: {formatDate(account.lastReconciled)}
                  </span>
                  {account.status === 'reconciled' && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                  {account.status === 'pending' && (
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Unmatched Transactions Alert */}
          {bankReconciliation.unmatchedTransactions > 0 && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-bold text-yellow-900">
                  {bankReconciliation.unmatchedTransactions} {t.unmatched_transactions || 'Unmatched Transactions'}
                </span>
              </div>
              <p className="text-xs text-yellow-700">
                {t.total_difference || 'Total difference'}: {formatCurrency(bankReconciliation.totalDifference, currency)}
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onQuickAction?.('view-all-accounts')}
              className="flex-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors py-2"
            >
              {t.view_all_accounts || 'View All Accounts'} →
            </button>
            <Button
              onClick={() => onQuickAction?.('reconcile-now')}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              <CreditCard className="w-4 h-4 mr-1" />
              {t.reconcile_now || 'Reconcile Now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* FBR Compliance Widget */}
      <FBRComplianceWidget
        businessId={businessId}
        currency={currency}
        onViewDetails={(action) => onQuickAction?.(action)}
      />

      {/* Enhanced Dashboard - All Available Widgets */}
      <EnhancedDashboard
        businessId={businessId}
        category={category}
        onQuickAction={onQuickAction}
      />
    </div>
  );
}
