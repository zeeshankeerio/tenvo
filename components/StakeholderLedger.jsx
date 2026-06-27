'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, RefreshCcw, Calendar, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { paymentAPI } from '@/lib/api/payments';
import { useBusiness } from '@/lib/context/BusinessContext';
import { Loader2 } from 'lucide-react';

export default function StakeholderLedger({ entityId, entityType, businessId, currency = 'PKR', colors }) {
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ totalDebit: 0, totalCredit: 0, balance: 0 });

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const result = entityType === 'customer'
                ? await paymentAPI.getCustomerLedger(entityId, businessId)
                : await paymentAPI.getVendorLedger(entityId, businessId);

            if (result.success) {
                setLedger(result.ledger || []);

                const totals = (result.ledger || []).reduce((acc, curr) => ({
                    totalDebit: acc.totalDebit + (Number(curr.debit) || 0),
                    totalCredit: acc.totalCredit + (Number(curr.credit) || 0)
                }), { totalDebit: 0, totalCredit: 0 });

                setSummary({
                    ...totals,
                    balance: result.currentBalance || 0
                });
            }
        } catch (error) {
            console.error('Error fetching ledger:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (entityId && businessId) {
            fetchLedger();
        }
    }, [entityId, businessId]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-none">Account Statement</h3>
                    <p className="text-xs text-gray-500 mt-1">Detailed transaction history and running balance</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchLedger}>
                        <RefreshCcw className="w-3.5 h-3.5 mr-2" />
                        Sync
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="w-3.5 h-3.5 mr-2" />
                        PDF
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="bg-blue-50/50 border-blue-100 shadow-none">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">Purchased</span>
                        </div>
                        <p className="text-lg font-semibold text-blue-700">{formatCurrency(summary.totalDebit, currency)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-50/50 border-emerald-100 shadow-none">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                            <TrendingDown className="w-3 h-3" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">Paid</span>
                        </div>
                        <p className="text-lg font-semibold text-emerald-700">{formatCurrency(summary.totalCredit, currency)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-wine/5 border-wine/10 shadow-none" style={{ backgroundColor: `${colors?.primary}08`, borderColor: `${colors?.primary}20` }}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-1.5 mb-1" style={{ color: colors?.primary }}>
                            <Wallet className="w-3 h-3" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">Balance</span>
                        </div>
                        <p className="text-lg font-semibold" style={{ color: colors?.primary }}>{formatCurrency(summary.balance, currency)}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-w-full">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                                <TableHead className="w-[110px] text-[10px] font-semibold uppercase tracking-wider py-4 px-4 text-gray-400">Date</TableHead>
                                <TableHead className="text-[10px] font-semibold uppercase tracking-wider py-4 px-4 text-gray-400">Transaction</TableHead>
                                <TableHead className="text-[10px] font-semibold uppercase tracking-wider py-4 px-4 text-gray-400">Ref</TableHead>
                                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider py-4 px-4 text-gray-400">Debit (+)</TableHead>
                                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider py-4 px-4 text-gray-400">Credit (-)</TableHead>
                                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider py-4 px-4 text-gray-400">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-8 h-8 animate-spin text-wine/30" />
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Generating Ledger...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : ledger.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                                        Empty Ledger
                                    </TableCell>
                                </TableRow>
                            ) : (
                                ledger.map((txn, idx) => (
                                    <TableRow key={txn.id || idx} className="group hover:bg-gray-50/30 transition-colors">
                                        <TableCell className="font-mono text-[10px] text-gray-500 font-bold px-4">
                                            {format(new Date(txn.date), 'dd-MM-yyyy')}
                                        </TableCell>
                                        <TableCell className="px-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-gray-700 capitalize tracking-tight">
                                                    {txn.transaction_type === 'invoice' ? 'Sales Invoice' :
                                                        txn.transaction_type === 'purchase' ? 'Purchase Bill' :
                                                            txn.transaction_type === 'payment' ? (entityType === 'customer' ? 'Receipt' : 'Payment') :
                                                                txn.transaction_type}
                                                </span>
                                                {txn.payment_mode && (
                                                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-tighter">{txn.payment_mode}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4">
                                            <Badge variant="outline" className="font-mono text-[10px] bg-white border-gray-100 text-gray-500 font-bold px-1.5 py-0">
                                                {txn.invoice_number || txn.purchase_number || txn.reference_id?.slice(0, 8) || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs font-bold text-gray-800 px-4">
                                            {txn.debit > 0 ? formatCurrency(txn.debit, currency) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs font-bold text-gray-800 px-4">
                                            {txn.credit > 0 ? formatCurrency(txn.credit, currency) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs font-semibold px-4" style={{ color: txn.balance >= 0 ? colors?.primary : '#059669' }}>
                                            {formatCurrency(txn.balance, currency)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
