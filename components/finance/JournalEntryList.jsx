'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Search, Filter, ChevronDown, ChevronRight, Plus, Loader2, RefreshCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

/**
 * JournalEntryList
 * Displays paginated journal entries with expandable GL line detail.
 *
 * @param {Object}   props
 * @param {string}   props.businessId
 * @param {string}   props.currency
 * @param {Array}    props.accounts         - GL accounts list for filter dropdown
 * @param {Function} props.onNewEntry       - callback to open JournalEntryForm
 */
export function JournalEntryList({ businessId, currency, accounts = [], onNewEntry }) {
    const [journals, setJournals] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    // Filters
    const [search, setSearch] = useState('');
    const [accountId, setAccountId] = useState('all');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [offset, setOffset] = useState(0);
    const LIMIT = 30;

    const load = useCallback(async (newOffset = 0) => {
        if (!businessId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                business_id: businessId,
                start_date: startDate,
                end_date: endDate,
                limit: LIMIT,
                offset: newOffset,
            });
            if (search) params.set('search', search);
            if (accountId && accountId !== 'all') params.set('account_id', accountId);

            const res = await fetch(`/api/v1/finance/journal-entries?${params}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to load journal entries');

            setJournals(data.journals || []);
            setTotal(data.total || 0);
            setOffset(newOffset);
        } catch (err) {
            toast.error(err.message || 'Error loading journal entries');
        } finally {
            setLoading(false);
        }
    }, [businessId, startDate, endDate, search, accountId]);

    useEffect(() => { load(0); }, [businessId]);

    const handleSearch = () => load(0);

    const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

    const REFERENCE_BADGE = {
        manual: 'bg-purple-100 text-purple-700',
        invoice: 'bg-blue-100 text-blue-700',
        invoices: 'bg-blue-100 text-blue-700',
        purchase: 'bg-amber-100 text-amber-700',
        payment: 'bg-emerald-100 text-emerald-700',
        expense: 'bg-red-100 text-red-700',
        journal_entry: 'bg-purple-100 text-purple-700',
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black text-gray-900">Journal Entries</h3>
                    <p className="text-xs text-gray-400">
                        {total} entr{total === 1 ? 'y' : 'ies'} · double-entry GL posting
                    </p>
                </div>
                <Button
                    onClick={onNewEntry}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs px-5 shadow-lg shadow-emerald-500/20"
                >
                    <Plus className="w-4 h-4 mr-1.5" /> New Entry
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-end">
                <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Search journal number or description…"
                        className="pl-8 h-9 text-xs rounded-xl border-gray-200"
                    />
                </div>
                <div className="flex items-center gap-1">
                    <input
                        type="date" value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="h-9 px-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
                    />
                    <span className="text-gray-300 text-xs">–</span>
                    <input
                        type="date" value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="h-9 px-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
                    />
                </div>
                <select
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                    className="h-9 px-2 text-xs border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-500/20"
                >
                    <option value="all">All Accounts</option>
                    {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                    ))}
                </select>
                <Button
                    onClick={handleSearch}
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 rounded-xl text-xs font-bold border-gray-200"
                >
                    <Filter className="w-3.5 h-3.5 mr-1.5" /> Apply
                </Button>
                <Button
                    onClick={() => load(0)}
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl text-gray-400"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Column Headers */}
                <div className="grid grid-cols-[32px_140px_1fr_120px_96px_96px_80px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <span />
                    <span>Journal #</span>
                    <span>Description</span>
                    <span>Date</span>
                    <span className="text-right">Debit</span>
                    <span className="text-right">Credit</span>
                    <span>Type</span>
                </div>

                {loading && journals.length === 0 && (
                    <div className="flex items-center justify-center py-16 text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
                    </div>
                )}

                {!loading && journals.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                        <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-semibold">No journal entries found</p>
                        <p className="text-xs">Adjust filters or create your first entry</p>
                    </div>
                )}

                {journals.map(je => {
                    const isExpanded = expandedId === je.id;
                    const refType = je.reference_type || 'manual';
                    const badgeCls = REFERENCE_BADGE[refType] || 'bg-gray-100 text-gray-600';

                    return (
                        <div key={je.id} className="border-b border-gray-50 last:border-0">
                            {/* Summary Row */}
                            <button
                                onClick={() => toggleExpand(je.id)}
                                className="w-full grid grid-cols-[32px_140px_1fr_120px_96px_96px_80px] gap-2 px-4 py-3 hover:bg-gray-50/80 text-left transition-colors items-center"
                            >
                                <span className="text-gray-300">
                                    {isExpanded
                                        ? <ChevronDown className="w-3.5 h-3.5" />
                                        : <ChevronRight className="w-3.5 h-3.5" />}
                                </span>
                                <span className="text-xs font-mono font-bold text-gray-800 truncate">
                                    {je.journal_number || '—'}
                                </span>
                                <span className="text-xs text-gray-600 truncate">
                                    {je.description}
                                    <span className="text-gray-400 ml-1.5">({je.line_count} lines)</span>
                                </span>
                                <span className="text-xs text-gray-500">
                                    {je.transaction_date
                                        ? format(new Date(je.transaction_date), 'dd MMM yyyy')
                                        : '—'}
                                </span>
                                <span className="text-xs font-mono font-bold text-gray-800 text-right">
                                    {formatCurrency(Number(je.total_debit), currency)}
                                </span>
                                <span className="text-xs font-mono font-bold text-gray-800 text-right">
                                    {formatCurrency(Number(je.total_credit), currency)}
                                </span>
                                <span>
                                    <Badge className={`text-[8px] px-1.5 py-0.5 font-black rounded-full border-0 ${badgeCls}`}>
                                        {refType.toUpperCase()}
                                    </Badge>
                                </span>
                            </button>

                            {/* Expanded GL Lines */}
                            {isExpanded && (
                                <div className="bg-gray-50/60 border-t border-gray-100 px-6 py-3">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-gray-400 font-bold uppercase text-[10px]">
                                                <th className="text-left pb-1.5 w-24">Code</th>
                                                <th className="text-left pb-1.5">Account</th>
                                                <th className="text-right pb-1.5 w-28">Debit</th>
                                                <th className="text-right pb-1.5 w-28">Credit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {je.lines.map(line => (
                                                <tr key={line.id}>
                                                    <td className="py-1.5 font-mono text-gray-400">{line.account_code}</td>
                                                    <td className="py-1.5 text-gray-700 font-medium">{line.account_name}</td>
                                                    <td className="py-1.5 text-right font-mono text-gray-800">
                                                        {Number(line.debit) > 0
                                                            ? formatCurrency(Number(line.debit), currency)
                                                            : <span className="text-gray-300">—</span>}
                                                    </td>
                                                    <td className="py-1.5 text-right font-mono text-gray-800">
                                                        {Number(line.credit) > 0
                                                            ? formatCurrency(Number(line.credit), currency)
                                                            : <span className="text-gray-300">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {je.created_by && (
                                        <p className="text-[10px] text-gray-400 mt-2 text-right">
                                            Posted by {je.created_by} ·{' '}
                                            {je.created_at ? format(new Date(je.created_at), 'dd MMM yyyy HH:mm') : ''}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {total > LIMIT && (
                <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                    <span>Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={offset === 0}
                            onClick={() => load(Math.max(0, offset - LIMIT))}
                            className="h-7 px-3 rounded-lg text-xs"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={offset + LIMIT >= total}
                            onClick={() => load(offset + LIMIT)}
                            className="h-7 px-3 rounded-lg text-xs"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
