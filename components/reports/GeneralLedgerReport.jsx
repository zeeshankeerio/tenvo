'use client';

import { useState, useEffect, useCallback } from 'react';
// import { supabase } from '@/lib/supabase/client'; // Removed
import { getGLEntriesAction, getGLAccountsAction } from '@/lib/actions/basic/accounting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { BookOpen, Filter, Download } from 'lucide-react';
import { useBusiness } from '@/lib/context/BusinessContext';

import Link from 'next/link';

/**
 * General Ledger Report Component
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business UUID
 */
export function GeneralLedgerReport({ businessId }) {
    const { currency } = useBusiness();
    const [accounts, setAccounts] = useState([]);

    const [selectedAccount, setSelectedAccount] = useState('all');
    const [entries, setEntries] = useState([]);
    const [openingBalance, setOpeningBalance] = useState(0); // [NEW]
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Fetch Chart of Accounts
    useEffect(() => {
        async function fetchAccounts() {
            const result = await getGLAccountsAction(businessId);
            if (result.success) {
                setAccounts(result.accounts);
            } else {
                console.error('Failed to fetch accounts', result.error);
            }
        }
        if (businessId) fetchAccounts();
    }, [businessId]);

    // Fetch Ledger Entries
    const fetchLedger = async () => {
        setLoading(true);
        try {
            const result = await getGLEntriesAction(businessId, {
                startDate,
                endDate,
                accountId: selectedAccount
            });

            if (!result.success) throw new Error(result.error);
            setEntries(result.entries || []);
            setOpeningBalance(result.openingBalance || 0); // [NEW]
        } catch (error) {
            console.error('Error fetching GL:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!businessId) return;
        queueMicrotask(() => {
            fetchLedger();
        });
        // Period range is applied explicitly via "Filter"; avoid refetch on every date keystroke.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId, selectedAccount]);

    // Running balance per row (immutable fold)
    const entriesWithBalance = entries.reduce(
        (acc, entry) => {
            const debit = Math.round(Number(entry.debit || 0) * 100) / 100;
            const credit = Math.round(Number(entry.credit || 0) * 100) / 100;
            const type = entry.account?.type?.toLowerCase() || 'asset';
            let next = acc.balance;
            if (['asset', 'expense'].includes(type)) {
                next += (debit - credit);
            } else {
                next += (credit - debit);
            }
            next = Math.round(next * 100) / 100;
            acc.rows.push({ ...entry, runningBalance: next });
            return { balance: next, rows: acc.rows };
        },
        { balance: Math.round(Number(openingBalance || 0) * 100) / 100, rows: [] }
    ).rows;

    const isSingleAccount = selectedAccount !== 'all';

    const escapeCsvCell = (v) => {
        const s = String(v ?? '');
        if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
    };

    const handleExportCsv = useCallback(() => {
        const headers = isSingleAccount
            ? ['date', 'account_code', 'account_name', 'description', 'reference_type', 'reference_id', 'debit', 'credit', 'running_balance']
            : ['date', 'account_code', 'account_name', 'description', 'reference_type', 'reference_id', 'debit', 'credit'];
        const lines = [headers.join(',')];
        for (const entry of entriesWithBalance) {
            const row = [
                format(new Date(entry.transaction_date), 'yyyy-MM-dd'),
                entry.account?.code || '',
                entry.account?.name || '',
                entry.description || '',
                entry.reference_type || '',
                entry.reference_id || '',
                Number(entry.debit || 0),
                Number(entry.credit || 0),
            ];
            if (isSingleAccount) row.push(entry.runningBalance);
            lines.push(row.map(escapeCsvCell).join(','));
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const accLabel = isSingleAccount ? selectedAccount.slice(0, 8) : 'all-accounts';
        a.download = `general-ledger_${accLabel}_${startDate}_to_${endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [entriesWithBalance, isSingleAccount, startDate, endDate, selectedAccount]);

    const getReferenceLink = (type, id) => {
        if (!type || !id) return null;
        switch (type) {
            case 'invoices': return `/business/${businessId}?tab=sales&invoiceId=${id}`; // Assumes sales tab
            case 'purchase': return `/business/${businessId}?tab=inventory&view=purchases`; // Simplified
            case 'payment': return `/business/${businessId}?tab=finance`;
            default: return null;
        }
    };

    return (
        <Card className="w-full shadow-sm">
            <CardHeader className="bg-gray-50/50 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
                            <BookOpen className="w-6 h-6 text-wine" />
                            General Ledger
                        </CardTitle>
                        <CardDescription>Double-entry accounting records with full audit trail</CardDescription>
                    </div>
                    <Button type="button" variant="outline" className="gap-2" onClick={handleExportCsv} disabled={entries.length === 0}>
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-4">
                    <div className="w-[200px]">
                        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="All Accounts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Accounts</SelectItem>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {acc.code} - {acc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-white w-[140px]"
                        />
                        <span className="text-gray-400">to</span>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-white w-[140px]"
                        />
                    </div>
                    <Button onClick={fetchLedger} className="bg-wine hover:bg-wine/90 text-white">
                        <Filter className="w-4 h-4 mr-2" /> Filter
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 border-b border-gray-100">
                            <TableHead className="w-[120px]">Date</TableHead>
                            <TableHead>Account</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            {isSingleAccount && <TableHead className="text-right bg-blue-50/50">Balance</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={isSingleAccount ? 6 : 5} className="text-center py-12 text-gray-400">Loading records...</TableCell>
                            </TableRow>
                        ) : entries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isSingleAccount ? 6 : 5} className="text-center py-12 text-gray-400">No entries found for this period.</TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {/* Opening Balance Row */}
                                {isSingleAccount && (
                                    <TableRow className="bg-yellow-50/50 font-medium">
                                        <TableCell colSpan={3} className="text-right pr-4 text-yellow-700">Opening Balance:</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell className="text-right text-yellow-800 font-mono">
                                            {formatCurrency(openingBalance, currency)}
                                        </TableCell>
                                    </TableRow>
                                )}

                                {entriesWithBalance.map(entry => {
                                    const link = getReferenceLink(entry.reference_type, entry.reference_id);

                                    return (
                                        <TableRow key={entry.id} className="hover:bg-gray-50/50">
                                            <TableCell className="font-mono text-xs text-gray-600">
                                                {format(new Date(entry.transaction_date), 'dd MMM yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-sm text-gray-700">{entry.account?.name}</span>
                                                    <span className="text-[10px] text-gray-400 font-mono">{entry.account?.code}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {entry.description}
                                                <div className="text-[10px] text-gray-400 mt-0.5 capitalize flex items-center gap-1">
                                                    <span className="opacity-75">Ref: {entry.reference_type}</span>
                                                    {link ? (
                                                        <Link href={link} className="text-blue-600 hover:underline font-medium">
                                                            #{entry.reference_id?.slice(0, 8)}
                                                        </Link>
                                                    ) : (
                                                        <span>#{entry.reference_id?.slice(0, 8)}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-gray-900 border-r border-gray-50 bg-gray-50/30">
                                                {parseFloat(entry.debit) > 0 ? formatCurrency(entry.debit, currency) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-gray-900">
                                                {parseFloat(entry.credit) > 0 ? formatCurrency(entry.credit, currency) : '-'}
                                            </TableCell>
                                            {isSingleAccount && (
                                                <TableCell className="text-right font-mono font-medium text-gray-800 bg-blue-50/10">
                                                    {formatCurrency(entry.runningBalance, currency)}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })}
                            </>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
