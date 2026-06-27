'use client';

import { useMemo, useState } from 'react';
import { TrendingDown, AlertCircle, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';

/**
 * PaymentAgingWidget Component
 * Shows accounts receivable aging (money owed by customers)
 * Helps identify overdue payments and cash flow risks
 * 
 * Aging Categories:
 * - Current: Due within 7 days
 * - Overdue 7-30: 8-30 days past due
 * - Overdue 30-60: 31-60 days past due
 * - Overdue 60+: 60+ days past due
 */
export function PaymentAgingWidget({
    invoices = [],
    currency = 'PKR',
    onViewOverdue,
}) {
    const [viewType, setViewType] = useState('receivable'); // receivable or payable

    const agingAnalysis = useMemo(() => {
        const now = new Date();
        
        // Filter for invoice types (positive journal show customer owes)
        const invoicesForAnalysis = invoices.filter(inv => {
            const isPaid = inv.status === 'paid' || inv.payment_status === 'paid';
            return !isPaid && inv.status !== 'cancelled';
        });

        const aging = {
            current: { amount: 0, count: 0, days: '0-7', color: 'green' },
            overdue7: { amount: 0, count: 0, days: '8-30', color: 'yellow' },
            overdue30: { amount: 0, count: 0, days: '31-60', color: 'orange' },
            overdue60: { amount: 0, count: 0, days: '60+', color: 'red' },
            total: { amount: 0, count: 0 },
        };

        invoicesForAnalysis.forEach(inv => {
            const dueDate = inv.due_date || inv.date;
            const daysOverdue = Math.floor((now - new Date(dueDate)) / (1000 * 60 * 60 * 24));
            const amount = Number(inv.grand_total || inv.amount || 0);

            aging.total.amount += amount;
            aging.total.count += 1;

            if (daysOverdue <= 7) {
                aging.current.amount += amount;
                aging.current.count += 1;
            } else if (daysOverdue <= 30) {
                aging.overdue7.amount += amount;
                aging.overdue7.count += 1;
            } else if (daysOverdue <= 60) {
                aging.overdue30.amount += amount;
                aging.overdue30.count += 1;
            } else {
                aging.overdue60.amount += amount;
                aging.overdue60.count += 1;
            }
        });

        return aging;
    }, [invoices]);

    const overduePercentage = agingAnalysis.total.amount > 0
        ? Math.round(
            ((agingAnalysis.overdue7.amount + agingAnalysis.overdue30.amount + agingAnalysis.overdue60.amount) /
                agingAnalysis.total.amount) * 100
        )
        : 0;

    const categories = [
        { key: 'current', label: 'Current', data: agingAnalysis.current },
        { key: 'overdue7', label: '8-30 Days', data: agingAnalysis.overdue7 },
        { key: 'overdue30', label: '31-60 Days', data: agingAnalysis.overdue30 },
        { key: 'overdue60', label: '60+ Days', data: agingAnalysis.overdue60 },
    ];

    return (
        <Card className="border-slate-200">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <TrendingDown className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold">Payment Aging</CardTitle>
                            <CardDescription className="text-xs">Accounts Receivable Status</CardDescription>
                        </div>
                    </div>
                    {overduePercentage > 20 && (
                        <Badge variant="destructive" className="text-xs font-bold">
                            {overduePercentage}% Overdue
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Alert if significant overdue */}
                {agingAnalysis.overdue60.amount > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-red-700">
                            <div className="font-semibold">
                                {formatCurrency(agingAnalysis.overdue60.amount, currency)} overdue 60+ days
                            </div>
                            <p className="mt-1">
                                {agingAnalysis.overdue60.count} invoice(s) need immediate follow-up
                            </p>
                        </div>
                    </div>
                )}

                {/* Aging Breakdown */}
                <div className="space-y-2">
                    {categories.map(({ key, label, data }) => (
                        <div key={key}>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-block w-2 h-2 rounded-full bg-${data.color}-500`} />
                                    <span className="text-xs font-semibold text-gray-700">{label}</span>
                                    <Badge variant="outline" className="text-xs font-mono">
                                        {data.count}
                                    </Badge>
                                </div>
                                <span className="text-sm font-bold text-gray-900">
                                    {formatCurrency(data.amount, currency)}
                                </span>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-${data.color}-500 transition-all`}
                                    style={{
                                        width: agingAnalysis.total.amount > 0
                                            ? `${(data.amount / agingAnalysis.total.amount) * 100}%`
                                            : '0%',
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total Summary */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-600">Total Outstanding</span>
                        <span className="text-lg font-semibold text-gray-900">
                            {formatCurrency(agingAnalysis.total.amount, currency)}
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                        {agingAnalysis.total.count} pending invoice(s)
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewOverdue?.('all')}
                        className="text-xs"
                    >
                        View All
                    </Button>
                    {agingAnalysis.overdue60.count > 0 && (
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onViewOverdue?.('overdue')}
                            className="text-xs"
                        >
                            {agingAnalysis.overdue60.count} Overdue
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
