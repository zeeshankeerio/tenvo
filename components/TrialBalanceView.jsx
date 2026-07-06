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
        <Card className="min-w-0 overflow-x-hidden border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm print:shadow-none">
            <CardHeader className="flex flex-col gap-3 border-b border-gray-100 dark:border-slate-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Trial Balance</CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">As of {new Date(date).toLocaleDateString()}</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-9 w-full rounded-md border border-gray-250 dark:border-slate-800 bg-transparent px-3 text-sm sm:w-auto text-gray-900 dark:text-gray-100"
                    />
                    <Button variant="outline" size="icon" onClick={fetchReport}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" className="flex-1 sm:flex-none" onClick={handlePrint}>
                        <Download className="mr-2 h-4 w-4" />
                        Export / Print
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* Desktop table */}
                <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-900/50 font-semibold text-gray-650 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left w-24">Code</th>
                                <th className="px-6 py-3 text-left">Account Name</th>
                                <th className="px-6 py-3 text-left">Type</th>
                                <th className="px-6 py-3 text-right">Debit</th>
                                <th className="px-6 py-3 text-right">Credit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                            {data.trialBalance.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/20">
                                    <td className="px-6 py-3 font-mono text-gray-500 dark:text-gray-400">{row.code}</td>
                                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-gray-100">{row.name}</td>
                                    <td className="px-6 py-3 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{row.type}</td>
                                    <td className="px-6 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                                        {Number(row.total_debit) > 0 ? formatCurrency(Number(row.total_debit), currency) : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                                        {Number(row.total_credit) > 0 ? formatCurrency(Number(row.total_credit), currency) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-slate-900/50 font-bold border-t-2 border-gray-200 dark:border-slate-800">
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-right uppercase text-xs tracking-wider text-gray-500 dark:text-gray-400">
                                    Total
                                </td>
                                <td className="px-6 py-4 text-right text-base text-gray-900 dark:text-gray-100">
                                    {formatCurrency(Number(data.totals.debit), currency)}
                                </td>
                                <td className="px-6 py-4 text-right text-base text-gray-900 dark:text-gray-100">
                                    {formatCurrency(Number(data.totals.credit), currency)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Mobile cards */}
                <div className="divide-y divide-gray-100 dark:divide-slate-800/60 lg:hidden">
                    {data.trialBalance.map((row) => (
                        <div key={row.id} className="px-3 py-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100">{row.name}</p>
                                    <p className="mt-0.5 text-[11px] font-mono text-gray-400 dark:text-gray-500">
                                        {row.code} · {row.type}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] tabular-nums">
                                <div className="rounded-lg bg-gray-50 dark:bg-slate-900/50 px-2 py-1.5 border border-gray-100 dark:border-slate-800/40">
                                    <p className="text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500">Debit</p>
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                                        {Number(row.total_debit) > 0 ? formatCurrency(Number(row.total_debit), currency) : '—'}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-gray-50 dark:bg-slate-900/50 px-2 py-1.5 border border-gray-100 dark:border-slate-800/40">
                                    <p className="text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500">Credit</p>
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                                        {Number(row.total_credit) > 0 ? formatCurrency(Number(row.total_credit), currency) : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-slate-900/50 px-3 py-3 text-sm font-bold border-t border-gray-100 dark:border-slate-800/50">
                        <div className="text-right text-gray-600 dark:text-gray-400">Total Dr</div>
                        <div className="text-right text-gray-900 dark:text-gray-100">{formatCurrency(Number(data.totals.debit), currency)}</div>
                        <div className="text-right text-gray-600 dark:text-gray-400">Total Cr</div>
                        <div className="text-right text-gray-900 dark:text-gray-100">{formatCurrency(Number(data.totals.credit), currency)}</div>
                    </div>
                </div>

                {/* Balance Status */}
                <div className={`mx-3 my-4 flex flex-col gap-3 rounded-lg p-4 sm:mx-6 sm:my-6 sm:flex-row sm:items-center sm:justify-between border ${
                    data.totals.balanced 
                        ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-300' 
                        : 'bg-red-50/50 border-red-100 text-red-900 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-300'
                }`}>
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
