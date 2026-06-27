'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, Truck, FileText, BarChart3, TrendingUp, Layers } from 'lucide-react';
import { RevenueAreaChart } from '@/components/AdvancedCharts';
import { formatCurrency } from '@/lib/currency';
import { useRouter } from 'next/navigation';

export function FinancialOverview({
    businessId,
    category,
    accountingSummary,
    chartData,
    currency,
    role = 'owner',
    onTabChange,
    onFinanceSubTab,
}) {
    const router = useRouter();

    const quickActions = [
        { label: 'View Invoices', icon: Receipt, tab: 'invoices' },
        { label: 'Purchase Orders', icon: Truck, tab: 'purchases' },
        { label: 'General Ledger', icon: FileText, tab: 'finance', financeSubTab: 'general-ledger' },
        { label: 'Financial Reports', icon: BarChart3, tab: 'finance', financeSubTab: 'statements', role: ['owner', 'admin', 'accountant'] }
    ];

    const filteredActions = quickActions.filter(item => !item.role || item.role.includes(role));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            {/* Quick Actions Card */}
            <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardHeader className="pb-4 border-b border-gray-50">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-800">
                        <Layers className="w-5 h-5 text-wine" />
                        Quick Accounting Actions
                    </CardTitle>
                    <CardDescription>Direct shortcuts to common financial tasks</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {filteredActions.map((item, idx) => (
                            <Button
                                key={idx}
                                variant="outline"
                                className="h-20 flex flex-col items-center justify-center gap-2 rounded-xl hover:bg-wine/5 hover:border-wine/20 border-gray-200 group transition-all"
                                onClick={() => {
                                    if (item.tab) {
                                        onTabChange(item.tab);
                                        if (item.financeSubTab && onFinanceSubTab) {
                                            onFinanceSubTab(item.financeSubTab);
                                        }
                                    } else if (item.route) {
                                        router.push(item.route);
                                    }
                                }}
                            >
                                <item.icon className="w-5 h-5 text-gray-500 group-hover:text-wine group-hover:scale-110 transition-all duration-300" />
                                <span className="font-semibold text-xs text-gray-700 group-hover:text-wine">{item.label}</span>
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Revenue vs Costs Chart */}
                <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="border-b border-gray-50 flex flex-row items-center justify-between pb-4">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-800">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                                Revenue vs Operating Costs
                            </CardTitle>
                            <CardDescription>Overview of financial performance over 6 months</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 uppercase tracking-wider font-bold text-[10px]">
                            6-Month Trend
                        </Badge>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[300px] w-full">
                            <RevenueAreaChart data={chartData} colors={{ primary: '#8b5cf6', secondary: '#f43f5e' }} />
                        </div>
                    </CardContent>
                </Card>

                {/* Profit Analysis */}
                <Card className="lg:col-span-1 border-none shadow-sm bg-white overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="border-b border-gray-50 pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-800">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                            Profit Analysis
                        </CardTitle>
                        <CardDescription>Estimated profit based on COGS</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-8">

                        {/* Revenue Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 font-medium">Total Revenue</span>
                                <span className="font-bold text-gray-900">{formatCurrency(accountingSummary?.totalRevenue || 0, currency)}</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full rounded-full animate-pulse" style={{ width: '100%' }} />
                            </div>
                        </div>

                        {/* COGS Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 font-medium">Direct Costs (COGS)</span>
                                <span className="font-bold text-gray-900">{formatCurrency(accountingSummary?.totalCOGS || 0, currency)}</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-orange-500 h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (Number(accountingSummary?.totalCOGS || 0) / (Number(accountingSummary?.totalRevenue || 1))) * 100)}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 text-right pt-1">
                                {((Number(accountingSummary?.totalCOGS || 0) / (Number(accountingSummary?.totalRevenue || 1))) * 100).toFixed(1)}% of Revenue
                            </p>
                        </div>

                        {/* Gross Profit Summary */}
                        <div className="pt-6 border-t border-gray-50 mt-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Gross Profit</p>
                                    <p className="text-3xl font-semibold text-gray-900 tracking-tight">
                                        {formatCurrency(accountingSummary?.grossProfit || 0, currency)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Margin</p>
                                    <div className={`text-xl font-semibold flex items-center justify-end gap-1 ${accountingSummary?.margin >= 20 ? 'text-green-600' : 'text-orange-600'}`}>
                                        {Math.round(accountingSummary?.margin || 0)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
