'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { generateReportPDF, exportToCSV } from '@/lib/pdf';
import {
    getAccountsReceivableAgingAction,
    getAccountsPayableAgingAction,
} from '@/lib/actions/standard/agingReports';
import toast from 'react-hot-toast';

const BUCKET_COLUMNS = [
    { key: 'current_amount', label: 'Current' },
    { key: 'days_1_30', label: '1-30 Days' },
    { key: 'days_31_60', label: '31-60 Days' },
    { key: 'days_61_90', label: '61-90 Days' },
    { key: 'days_over_90', label: '90+ Days' },
];

function AgingSummaryCards({ summary, currency }) {
    const cards = [
        { label: 'Total Outstanding', value: summary?.total_balance, accent: 'text-gray-900' },
        { label: 'Current', value: summary?.total_current, accent: 'text-emerald-600' },
        { label: '1-30 Days', value: summary?.total_1_30, accent: 'text-amber-600' },
        { label: '31-60 Days', value: summary?.total_31_60, accent: 'text-orange-600' },
        { label: '61-90 Days', value: summary?.total_61_90, accent: 'text-red-500' },
        { label: '90+ Days', value: summary?.total_over_90, accent: 'text-red-700' },
    ];
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {cards.map(({ label, value, accent }) => (
                <div key={label} className="rounded-lg border bg-white p-3 shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{label}</p>
                    <p className={`text-base font-semibold mt-1 ${accent}`}>{formatCurrency(value || 0, currency)}</p>
                </div>
            ))}
        </div>
    );
}

function AgingTable({ rows, currency, type }) {
    if (!rows?.length) {
        return <p className="text-sm text-gray-500 py-8 text-center">No outstanding balances in this category.</p>;
    }

    return (
        <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[10px] font-semibold uppercase text-gray-500 tracking-wider">
                    <tr>
                        <th className="px-4 py-3 text-left">{type === 'ar' ? 'Customer' : 'Vendor'}</th>
                        <th className="px-4 py-3 text-left">Document</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-right">Days</th>
                        {BUCKET_COLUMNS.map((c) => (
                            <th key={c.key} className="px-3 py-3 text-right">{c.label}</th>
                        ))}
                        <th className="px-4 py-3 text-right">Balance</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50/80">
                            <td className="px-4 py-2.5 font-semibold text-gray-800">
                                {type === 'ar' ? row.customer_name : row.vendor_name}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs">
                                {type === 'ar' ? row.invoice_number : row.purchase_number}
                            </td>
                            <td className="px-4 py-2.5 text-gray-600">
                                {row.date ? new Date(row.date).toLocaleDateString() : ', '}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium">{row.days_overdue ?? 0}</td>
                            {BUCKET_COLUMNS.map((c) => (
                                <td key={c.key} className="px-3 py-2.5 text-right font-mono text-xs">
                                    {Number(row[c.key] || 0) > 0 ? formatCurrency(row[c.key], currency) : ', '}
                                </td>
                            ))}
                            <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(row.balance, currency)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** AR/AP aging reports for Finance Hub → Statements. */
export function AgingReportsPanel({ businessId, currency = 'PKR' }) {
    const [activeTab, setActiveTab] = useState('ar');
    const [loading, setLoading] = useState(false);
    const [arData, setArData] = useState(null);
    const [apData, setApData] = useState(null);

    const fetchAr = useCallback(async () => {
        if (!businessId) return;
        setLoading(true);
        try {
            const res = await getAccountsReceivableAgingAction(businessId);
            if (res.success) setArData(res);
            else toast.error(res.error || 'Failed to load A/R aging');
        } catch {
            toast.error('Failed to load A/R aging');
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    const fetchAp = useCallback(async () => {
        if (!businessId) return;
        setLoading(true);
        try {
            const res = await getAccountsPayableAgingAction(businessId);
            if (res.success) setApData(res);
            else toast.error(res.error || 'Failed to load A/P aging');
        } catch {
            toast.error('Failed to load A/P aging');
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        if (!businessId) return;
        if (activeTab === 'ar') fetchAr();
        else fetchAp();
    }, [businessId, activeTab, fetchAr, fetchAp]);

    const handleExport = (type) => {
        const isAr = type === 'ar';
        const rows = isAr ? arData?.invoices : apData?.purchases;
        if (!rows?.length) {
            toast.error('No data to export');
            return;
        }
        const exportRows = rows.map((r) => ({
            party: isAr ? r.customer_name : r.vendor_name,
            document: isAr ? r.invoice_number : r.purchase_number,
            date: r.date ? new Date(r.date).toLocaleDateString() : '',
            days_overdue: r.days_overdue ?? 0,
            balance: r.balance ?? 0,
        }));
        const title = isAr ? 'Accounts_Receivable_Aging' : 'Accounts_Payable_Aging';
        const doc = generateReportPDF(title.replace(/_/g, ' '), exportRows, [
            { label: 'Party', key: 'party' },
            { label: 'Document', key: 'document' },
            { label: 'Date', key: 'date' },
            { label: 'Days', key: 'days_overdue' },
            { label: 'Balance', key: 'balance' },
        ]);
        doc.save(`${title}.pdf`);
        exportToCSV(exportRows, title);
        toast.success('Aging report exported');
    };

    return (
        <Card className="border shadow-sm bg-white">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-lg">A/R & A/P Aging</CardTitle>
                        <CardDescription>Outstanding customer invoices and vendor bills by age bucket</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => (activeTab === 'ar' ? fetchAr() : fetchAp())} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleExport(activeTab)}>
                            <Download className="w-4 h-4 mr-1" />
                            Export
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="ar">Receivables (A/R)</TabsTrigger>
                        <TabsTrigger value="ap">Payables (A/P)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="ar">
                        {loading && !arData ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
                        ) : (
                            <>
                                <AgingSummaryCards summary={arData?.summary} currency={currency} />
                                <AgingTable rows={arData?.invoices} currency={currency} type="ar" />
                            </>
                        )}
                    </TabsContent>
                    <TabsContent value="ap">
                        {loading && !apData ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
                        ) : (
                            <>
                                <AgingSummaryCards summary={apData?.summary} currency={currency} />
                                <AgingTable rows={apData?.purchases} currency={currency} type="ap" />
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
