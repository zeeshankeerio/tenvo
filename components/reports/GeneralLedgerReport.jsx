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
    const { currency: businessCurrency } = useBusiness();
    const displayCurrency = businessCurrency || 'PKR';
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
        <Card className="w-full min-w-0 overflow-x-hidden border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
            <CardHeader className="bg-gray-50/50 dark:bg-slate-900/20 border-b border-gray-100 dark:border-slate-850 pb-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100">
                            <BookOpen className="h-6 w-6 text-wine" />
                            General Ledger
                        </CardTitle>
                        <CardDescription className="text-gray-500 dark:text-gray-400">Double-entry accounting records with full audit trail</CardDescription>
                    </div>
                    <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto" onClick={handleExportCsv} disabled={entries.length === 0}>
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="w-full sm:w-[200px]">
                        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-gray-250 dark:border-slate-800 text-gray-900 dark:text-gray-100">
                                <SelectValue placeholder="All Accounts" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                                <SelectItem value="all">All Accounts</SelectItem>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {acc.code} - {acc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                        <Input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="min-w-0 flex-1 bg-white dark:bg-slate-900 border-gray-250 dark:border-slate-800 text-gray-900 dark:text-gray-100 sm:w-[140px] sm:flex-none"
                        />
                        <span className="text-gray-400 dark:text-gray-500">to</span>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="min-w-0 flex-1 bg-white dark:bg-slate-900 border-gray-250 dark:border-slate-800 text-gray-900 dark:text-gray-100 sm:w-[140px] sm:flex-none"
                        />
                    </div>
                    <Button onClick={fetchLedger} className="w-full bg-wine text-white hover:bg-wine/90 sm:w-auto">
                        <Filter className="mr-2 h-4 w-4" /> Filter
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {/* Desktop table */}
                <div className="hidden lg:block">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-slate-900/30 border-b border-gray-100 dark:border-slate-850 hover:bg-transparent">
                            <TableHead className="w-[120px] text-gray-700 dark:text-gray-300">Date</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300">Account</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300">Description</TableHead>
                            <TableHead className="text-right text-gray-700 dark:text-gray-300">Debit</TableHead>
                            <TableHead className="text-right text-gray-700 dark:text-gray-300">Credit</TableHead>
                            {isSingleAccount && <TableHead className="text-right bg-blue-50/50 dark:bg-blue-950/20 text-gray-700 dark:text-gray-300">Balance</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={isSingleAccount ? 6 : 5} className="text-center py-12 text-gray-400 dark:text-gray-500">Loading records...</TableCell>
                            </TableRow>
                        ) : entries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isSingleAccount ? 6 : 5} className="text-center py-12 text-gray-400 dark:text-gray-500">No entries found for this period.</TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {/* Opening Balance Row */}
                                {isSingleAccount && (
                                    <TableRow className="bg-yellow-50/50 dark:bg-amber-950/20 font-medium border-b border-gray-100 dark:border-slate-800">
                                        <TableCell colSpan={3} className="text-right pr-4 text-yellow-700 dark:text-amber-400">Opening Balance:</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell className="text-right text-yellow-800 dark:text-amber-300 font-mono">
                                            {formatCurrency(openingBalance, displayCurrency)}
                                        </TableCell>
                                    </TableRow>
                                )}

                                {entriesWithBalance.map(entry => {
                                    const link = getReferenceLink(entry.reference_type, entry.reference_id);

                                    return (
                                        <TableRow key={entry.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/20 border-b border-gray-100 dark:border-slate-800/60">
                                            <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                                {format(new Date(entry.transaction_date), 'dd MMM yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">{entry.account?.name}</span>
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{entry.account?.code}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                                                {entry.description}
                                                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 capitalize flex items-center gap-1">
                                                    <span className="opacity-75">Ref: {entry.reference_type}</span>
                                                    {link ? (
                                                        <Link href={link} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                                            #{entry.reference_id?.slice(0, 8)}
                                                        </Link>
                                                    ) : (
                                                        <span>#{entry.reference_id?.slice(0, 8)}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-gray-900 dark:text-gray-100 border-r border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/10">
                                                {parseFloat(entry.debit) > 0 ? formatCurrency(entry.debit, displayCurrency) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-gray-900 dark:text-gray-100">
                                                {parseFloat(entry.credit) > 0 ? formatCurrency(entry.credit, displayCurrency) : '-'}
                                            </TableCell>
                                            {isSingleAccount && (
                                                <TableCell className="text-right font-mono font-medium text-gray-800 dark:text-gray-200 bg-blue-50/10 dark:bg-blue-950/10">
                                                    {formatCurrency(entry.runningBalance, displayCurrency)}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })}
                            </>
                        )}
                    </TableBody>
                </Table>
                </div>

                {/* Mobile cards */}
                <div className="divide-y divide-gray-100 dark:divide-slate-800 lg:hidden">
                    {loading ? (
                        <div className="py-12 text-center text-gray-400 dark:text-gray-500">Loading records...</div>
                    ) : entries.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 dark:text-gray-500">No entries found for this period.</div>
                    ) : (
                        <>
                            {isSingleAccount && (
                                <div className="bg-yellow-50/50 dark:bg-amber-950/10 px-3 py-2 text-xs font-medium text-yellow-700 dark:text-amber-400 border-b border-gray-100 dark:border-slate-850">
                                    Opening balance: {formatCurrency(openingBalance, displayCurrency)}
                                </div>
                            )}
                            {entriesWithBalance.map((entry) => {
                                const link = getReferenceLink(entry.reference_type, entry.reference_id);
                                return (
                                    <div key={entry.id} className="px-3 py-3 hover:bg-gray-50/30 dark:hover:bg-slate-900/10">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                                    {format(new Date(entry.transaction_date), 'dd MMM yyyy')}
                                                </p>
                                                <p className="mt-0.5 text-[13px] font-semibold text-gray-800 dark:text-gray-200">{entry.account?.name}</p>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">{entry.description}</p>
                                            </div>
                                            {isSingleAccount && (
                                                <p className="shrink-0 text-[12px] font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                    {formatCurrency(entry.runningBalance, displayCurrency)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] tabular-nums">
                                            <div className="rounded-lg bg-gray-50 dark:bg-slate-900/50 px-2 py-1.5 border border-gray-100/60 dark:border-slate-800/40">
                                                <p className="text-[10px] uppercase text-gray-450 dark:text-gray-500">Debit</p>
                                                <p className="text-gray-800 dark:text-gray-200">{parseFloat(entry.debit) > 0 ? formatCurrency(entry.debit, displayCurrency) : '—'}</p>
                                            </div>
                                            <div className="rounded-lg bg-gray-50 dark:bg-slate-900/50 px-2 py-1.5 border border-gray-100/60 dark:border-slate-800/40">
                                                <p className="text-[10px] uppercase text-gray-450 dark:text-gray-500">Credit</p>
                                                <p className="text-gray-800 dark:text-gray-200">{parseFloat(entry.credit) > 0 ? formatCurrency(entry.credit, displayCurrency) : '—'}</p>
                                            </div>
                                        </div>
                                        {(entry.reference_type || entry.reference_id) && (
                                            <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                                                Ref: {entry.reference_type}
                                                {link ? (
                                                    <Link href={link} className="ml-1 font-medium text-blue-600 dark:text-blue-400">
                                                        #{entry.reference_id?.slice(0, 8)}
                                                    </Link>
                                                ) : (
                                                    <span className="ml-1">#{entry.reference_id?.slice(0, 8)}</span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
