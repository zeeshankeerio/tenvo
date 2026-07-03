'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { accountingAPI } from '@/lib/api/accounting';
import { useBusiness } from '@/lib/context/BusinessContext';
import toast from 'react-hot-toast';

/**
 * @param {Object} props
 * @param {string} props.businessId
 */
export default function TrialBalanceView({ businessId, currency: currencyProp }) {
    const { currency: contextCurrency } = useBusiness();
    const currency = currencyProp || contextCurrency || 'PKR';
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ trialBalance: [], totals: { debit: 0, credit: 0, balanced: false } });
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchReport = useCallback(async () => {
        if (!businessId) return;
        try {
            setLoading(true);
            const res = await accountingAPI.getTrialBalance(businessId, date);
            if (res.success) {
                setData(res);
            } else {
                toast.error(res.error || 'Failed to load report');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error loading report');
        } finally {
            setLoading(false);
        }
    }, [businessId, date]);

    useEffect(() => {
        queueMicrotask(() => {
            fetchReport();
        });
    }, [fetchReport]);

    const handlePrint = () => {
        window.print();
    };

    if (loading && !data.trialBalance.length) {
        return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
    }

    return (
        <Card className="border-none shadow-sm bg-white print:shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Trial Balance</CardTitle>
                    <CardDescription>As of {new Date(date).toLocaleDateString()}</CardDescription>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-9 px-3 border rounded-md text-sm"
                    />
                    <Button variant="outline" size="icon" onClick={fetchReport}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" onClick={handlePrint}>
                        <Download className="w-4 h-4 mr-2" />
                        Export / Print
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 font-semibold text-gray-600 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left w-24">Code</th>
                                <th className="px-6 py-3 text-left">Account Name</th>
                                <th className="px-6 py-3 text-left">Type</th>
                                <th className="px-6 py-3 text-right">Debit</th>
                                <th className="px-6 py-3 text-right">Credit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.trialBalance.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-3 font-mono text-gray-500">{row.code}</td>
                                    <td className="px-6 py-3 font-medium text-gray-900">{row.name}</td>
                                    <td className="px-6 py-3 text-xs uppercase tracking-wide text-gray-500">{row.type}</td>
                                    <td className="px-6 py-3 text-right font-mono text-gray-700">
                                        {Number(row.total_debit) > 0 ? formatCurrency(Number(row.total_debit), currency) : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono text-gray-700">
                                        {Number(row.total_credit) > 0 ? formatCurrency(Number(row.total_credit), currency) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-right uppercase text-xs tracking-wider text-gray-500">
                                    Total
                                </td>
                                <td className="px-6 py-4 text-right text-base text-gray-900">
                                    {formatCurrency(Number(data.totals.debit), currency)}
                                </td>
                                <td className="px-6 py-4 text-right text-base text-gray-900">
                                    {formatCurrency(Number(data.totals.credit), currency)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Balance Status */}
                <div className={`mx-6 my-6 p-4 rounded-lg flex items-center justify-between ${data.totals.balanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <div className="flex items-center gap-3">
                        {data.totals.balanced ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                        <div>
                            <h4 className="font-bold">{data.totals.balanced ? 'Trial Balance is Balanced' : 'Trial Balance is Unbalanced'}</h4>
                            {!data.totals.balanced && <p className="text-sm mt-1">Difference: {formatCurrency(Math.abs(data.totals.credit - data.totals.debit), currency)}</p>}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
