'use client';

import { useState, useEffect, useMemo } from 'react';
import { FileText, AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/currency';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import { format, differenceInDays, addMonths } from 'date-fns';

/**
 * FBRComplianceWidget Component
 * 
 * Dashboard widget showing FBR (Federal Board of Revenue) tax compliance status
 * Critical for Pakistani businesses to track filing deadlines and tax liabilities
 * 
 * Features:
 * - Filing status indicator (current, due, overdue)
 * - Sales tax summary (PST/FST totals)
 * - Next filing deadline with countdown
 * - Recent filings with status
 * - Quick action to view tax reports
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} [props.currency] - Currency code
 * @param {Function} [props.onViewDetails] - Callback when user clicks to view details
 */
export function FBRComplianceWidget({ businessId, currency = 'PKR', onViewDetails }) {
    const [complianceData, setComplianceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { language } = useLanguage();
    const t = translations[language] || translations['en'] || {};

    // Fetch FBR compliance data
    useEffect(() => {
        async function loadComplianceData() {
            if (!businessId) return;
            
            setLoading(true);
            try {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                
                // Get current month's sales data for tax calculation
                const currentMonth = new Date();
                const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

                const { data: invoices, error } = await supabase
                    .from('invoices')
                    .select('total_amount, tax_amount, created_at, status')
                    .eq('business_id', businessId)
                    .gte('created_at', firstDay.toISOString())
                    .lte('created_at', lastDay.toISOString());

                if (error) throw error;

                // Calculate tax totals
                const paidInvoices = (invoices || []).filter(inv => inv.status === 'paid');
                const totalSales = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
                const totalTax = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.tax_amount || 0), 0);

                // Calculate PST (Provincial Sales Tax) and FST (Federal Sales Tax)
                // Assuming 17% PST and 1% FST for simplification
                const pst = totalTax * 0.94; // 94% of tax is PST (17/18)
                const fst = totalTax * 0.06; // 6% of tax is FST (1/18)

                // Next filing deadline (15th of next month)
                const nextDeadline = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 15);
                const daysUntilDeadline = differenceInDays(nextDeadline, new Date());

                // Mock recent filings (in production, fetch from database)
                const recentFilings = [
                    {
                        month: format(addMonths(currentMonth, -1), 'MMMM yyyy'),
                        status: 'filed',
                        filedDate: format(addMonths(currentMonth, -1).setDate(14), 'MMM dd, yyyy'),
                        amount: totalTax * 0.9
                    },
                    {
                        month: format(addMonths(currentMonth, -2), 'MMMM yyyy'),
                        status: 'filed',
                        filedDate: format(addMonths(currentMonth, -2).setDate(13), 'MMM dd, yyyy'),
                        amount: totalTax * 0.85
                    }
                ];

                setComplianceData({
                    totalSales,
                    totalTax,
                    pst,
                    fst,
                    nextDeadline,
                    daysUntilDeadline,
                    recentFilings,
                    filingStatus: daysUntilDeadline > 7 ? 'current' : daysUntilDeadline > 0 ? 'due' : 'overdue'
                });
            } catch (error) {
                console.error('Failed to load FBR compliance data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadComplianceData();
    }, [businessId]);

    // Calculate compliance score
    const complianceScore = useMemo(() => {
        if (!complianceData) return 0;
        
        let score = 100;
        if (complianceData.filingStatus === 'due') score -= 20;
        if (complianceData.filingStatus === 'overdue') score -= 50;
        
        return Math.max(score, 0);
    }, [complianceData]);

    if (loading) {
        return (
            <Card className="glass-card border-none">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                        <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="h-8 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!complianceData) {
        return (
            <Card className="glass-card border-none">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-gray-500">
                        {t.fbr_compliance || 'FBR Compliance'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-gray-500">
                        {t.no_data_available || 'No data available'}
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card 
            className="glass-card border-none hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onViewDetails?.('tax-reports')}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-gray-900">
                            {t.fbr_compliance || 'FBR Compliance'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {t.tax_filing_status || 'Tax filing & compliance status'}
                        </CardDescription>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-green-50 border border-green-200 shadow-inner">
                        <FileText className="w-5 h-5 text-green-600" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filing Status */}
                <div className={`p-3 rounded-lg border ${
                    complianceData.filingStatus === 'current' 
                        ? 'bg-green-50 border-green-200' 
                        : complianceData.filingStatus === 'due'
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-red-50 border-red-200'
                }`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            {complianceData.filingStatus === 'current' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : complianceData.filingStatus === 'due' ? (
                                <Clock className="w-4 h-4 text-orange-600" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-xs font-bold ${
                                complianceData.filingStatus === 'current' 
                                    ? 'text-green-900' 
                                    : complianceData.filingStatus === 'due'
                                    ? 'text-orange-900'
                                    : 'text-red-900'
                            }`}>
                                {complianceData.filingStatus === 'current' 
                                    ? (t.up_to_date || 'Up to Date')
                                    : complianceData.filingStatus === 'due'
                                    ? (t.filing_due || 'Filing Due')
                                    : (t.overdue || 'Overdue')}
                            </span>
                        </div>
                        <Badge className={`text-xs ${
                            complianceData.filingStatus === 'current' 
                                ? 'bg-green-600 text-white' 
                                : complianceData.filingStatus === 'due'
                                ? 'bg-orange-600 text-white'
                                : 'bg-red-600 text-white'
                        }`}>
                            {complianceData.daysUntilDeadline > 0 
                                ? `${complianceData.daysUntilDeadline} ${t.days || 'days'}`
                                : t.overdue || 'Overdue'}
                        </Badge>
                    </div>
                    <p className={`text-xs font-medium ${
                        complianceData.filingStatus === 'current' 
                            ? 'text-green-700' 
                            : complianceData.filingStatus === 'due'
                            ? 'text-orange-700'
                            : 'text-red-700'
                    }`}>
                        {t.next_deadline || 'Next Deadline'}: {format(complianceData.nextDeadline, 'MMM dd, yyyy')}
                    </p>
                </div>

                {/* Tax Summary */}
                <div className="space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        {t.current_month_tax || 'Current Month Tax'}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-lg bg-blue-50">
                            <div className="text-xs text-blue-700 font-medium mb-1">
                                {t.pst || 'PST'} (17%)
                            </div>
                            <div className="text-lg font-semibold text-blue-900">
                                {formatCurrency(complianceData.pst, currency)}
                            </div>
                        </div>
                        <div className="p-2 rounded-lg bg-wine-50">
                            <div className="text-xs text-wine-700 font-medium mb-1">
                                {t.fst || 'FST'} (1%)
                            </div>
                            <div className="text-lg font-semibold text-wine-900">
                                {formatCurrency(complianceData.fst, currency)}
                            </div>
                        </div>
                    </div>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-green-50 to-blue-50 border border-green-200">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-green-900">
                                {t.total_tax_liability || 'Total Tax Liability'}
                            </span>
                            <span className="text-xl font-semibold text-green-900">
                                {formatCurrency(complianceData.totalTax, currency)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Compliance Score */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] uppercase font-semibold tracking-widest text-gray-400">
                        <span>{t.compliance_score || 'Compliance Score'}</span>
                        <span>{complianceScore}%</span>
                    </div>
                    <Progress 
                        value={complianceScore} 
                        className={`h-1.5 ${
                            complianceScore >= 80 ? 'bg-green-100' : 
                            complianceScore >= 50 ? 'bg-orange-100' : 
                            'bg-red-100'
                        }`}
                    />
                </div>

                {/* Recent Filings */}
                {complianceData.recentFilings.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            {t.recent_filings || 'Recent Filings'}
                        </div>
                        {complianceData.recentFilings.slice(0, 2).map((filing, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-gray-900">
                                        {filing.month}
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        {t.filed_on || 'Filed on'} {filing.filedDate}
                                    </div>
                                </div>
                                <div className="text-xs font-bold text-green-600 ml-2">
                                    {formatCurrency(filing.amount, currency)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Quick Action */}
                <div className="pt-2 border-t border-gray-100">
                    <button className="text-xs font-bold text-green-600 hover:text-green-700 transition-colors w-full text-center">
                        {t.view_tax_reports || 'View Tax Reports'} →
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}


