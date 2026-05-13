'use client';

import { useState, useCallback } from 'react';
import { Calendar, CheckCircle2, XCircle, Lock, Unlock, Plus, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import {
    createFiscalPeriodAction,
    closeFiscalPeriodAction,
    reopenFiscalPeriodAction,
} from '@/lib/actions/basic/fiscal';
import toast from 'react-hot-toast';

/**
 * FiscalPeriodManager
 * Full CRUD + close/reopen workflow with pre-close checklist.
 *
 * @param {Object}   props
 * @param {string}   props.businessId
 * @param {string}   props.currency
 * @param {Array}    props.periods         - fiscal periods list (managed by parent)
 * @param {Function} props.onRefresh       - callback to reload periods from parent
 */
export function FiscalPeriodManager({ businessId, currency, periods = [], onRefresh }) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [confirmingCloseId, setConfirmingCloseId] = useState(null);
    const [working, setWorking] = useState(false);

    // Create-form state
    const [newPeriod, setNewPeriod] = useState({
        name: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
    });

    const STATUS_STYLES = {
        open: { bg: 'bg-emerald-100 text-emerald-700', label: 'OPEN', icon: CheckCircle2 },
        closed: { bg: 'bg-gray-100 text-gray-500', label: 'CLOSED', icon: Lock },
        locked: { bg: 'bg-red-100 text-red-600', label: 'LOCKED', icon: Lock },
    };

    // ── Create Period ──────────────────────────────────────────────────────────

    const handleCreate = async () => {
        if (!newPeriod.name.trim()) { toast.error('Period name is required'); return; }
        if (!newPeriod.startDate || !newPeriod.endDate) { toast.error('Start and end dates are required'); return; }
        if (newPeriod.endDate <= newPeriod.startDate) { toast.error('End date must be after start date'); return; }

        setWorking(true);
        try {
            const res = await createFiscalPeriodAction(businessId, {
                name: newPeriod.name.trim(),
                startDate: newPeriod.startDate,
                endDate: newPeriod.endDate,
            });
            if (!res.success) throw new Error(res.error);
            toast.success(`Period "${newPeriod.name}" created`);
            setNewPeriod({ name: '', startDate: new Date().toISOString().split('T')[0], endDate: '' });
            setShowCreateForm(false);
            onRefresh?.();
        } catch (err) {
            toast.error(err.message || 'Failed to create period');
        } finally {
            setWorking(false);
        }
    };

    // ── Close Period ───────────────────────────────────────────────────────────

    const handleClose = async (periodId) => {
        setWorking(true);
        try {
            const res = await closeFiscalPeriodAction(businessId, periodId);
            if (!res.success) throw new Error(res.error);
            toast.success('Period closed successfully');
            setConfirmingCloseId(null);
            onRefresh?.();
        } catch (err) {
            toast.error(err.message || 'Failed to close period');
        } finally {
            setWorking(false);
        }
    };

    // ── Reopen Period ──────────────────────────────────────────────────────────

    const handleReopen = async (periodId) => {
        setWorking(true);
        try {
            const res = await reopenFiscalPeriodAction(businessId, periodId);
            if (!res.success) throw new Error(res.error);
            toast.success('Period reopened');
            onRefresh?.();
        } catch (err) {
            toast.error(err.message || 'Failed to reopen period');
        } finally {
            setWorking(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black text-gray-900">Fiscal Periods</h3>
                    <p className="text-xs text-gray-400">
                        {periods.length} period{periods.length !== 1 ? 's' : ''} · controls GL posting windows
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreateForm(prev => !prev)}
                    className="bg-brand-primary hover:bg-brand-primary-dark text-white rounded-xl font-bold text-xs px-5 shadow-lg shadow-brand-primary/20"
                >
                    <Plus className="w-4 h-4 mr-1.5" /> New Period
                </Button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
                <div className="bg-white rounded-2xl border border-brand-100 p-5 space-y-4 shadow-sm">
                    <h4 className="text-sm font-black text-gray-900">Create Fiscal Period</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">Period Name</label>
                            <Input
                                value={newPeriod.name}
                                onChange={e => setNewPeriod(p => ({ ...p, name: e.target.value }))}
                                placeholder="e.g., FY 2026-Q1"
                                className="h-9 text-xs rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">Start Date</label>
                            <input
                                type="date"
                                value={newPeriod.startDate}
                                onChange={e => setNewPeriod(p => ({ ...p, startDate: e.target.value }))}
                                className="w-full h-9 px-3 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">End Date</label>
                            <input
                                type="date"
                                value={newPeriod.endDate}
                                onChange={e => setNewPeriod(p => ({ ...p, endDate: e.target.value }))}
                                min={newPeriod.startDate}
                                className="w-full h-9 px-3 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCreateForm(false)}
                            className="rounded-xl text-xs h-9"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleCreate}
                            disabled={working}
                            className="bg-brand-primary hover:bg-brand-primary-dark text-white rounded-xl text-xs h-9 px-6"
                        >
                            {working ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Calendar className="w-4 h-4 mr-1.5" />}
                            Create Period
                        </Button>
                    </div>
                </div>
            )}

            {/* Periods List */}
            {periods.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-bold">No fiscal periods defined</p>
                    <p className="text-xs mt-1">Create a fiscal period to control which dates accept GL postings.</p>
                    <Button
                        onClick={() => setShowCreateForm(true)}
                        className="mt-4 bg-brand-primary text-white rounded-xl text-xs px-6 h-9"
                    >
                        <Plus className="w-4 h-4 mr-1.5" /> Create First Period
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    {periods.map(period => {
                        const statusStyle = STATUS_STYLES[period.status] || STATUS_STYLES.open;
                        const StatusIcon = statusStyle.icon;
                        const isConfirmingClose = confirmingCloseId === period.id;

                        return (
                            <div
                                key={period.id}
                                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                            >
                                {/* Period Row */}
                                <div className="flex items-center gap-4 px-4 py-3.5">
                                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                        <StatusIcon className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-900">{period.name}</span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${statusStyle.bg}`}>
                                                {statusStyle.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {format(new Date(period.start_date), 'dd MMM yyyy')} — {format(new Date(period.end_date), 'dd MMM yyyy')}
                                            {period.entry_count != null && (
                                                <span className="ml-2">· {period.entry_count} entries</span>
                                            )}
                                            {period.closed_by && (
                                                <span className="ml-2">· Closed by {period.closed_by}</span>
                                            )}
                                        </p>
                                    </div>

                                    {/* Period Totals */}
                                    {(period.total_debit != null || period.total_credit != null) && (
                                        <div className="hidden md:flex gap-4 shrink-0 text-right">
                                            <div>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">Total DR</p>
                                                <p className="text-xs font-mono font-bold text-gray-700">
                                                    {formatCurrency(Number(period.total_debit || 0), currency)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">Total CR</p>
                                                <p className="text-xs font-mono font-bold text-gray-700">
                                                    {formatCurrency(Number(period.total_credit || 0), currency)}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 shrink-0">
                                        {period.status === 'open' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setConfirmingCloseId(isConfirmingClose ? null : period.id)}
                                                className="rounded-xl text-xs h-8 px-3 border-amber-200 text-amber-700 hover:bg-amber-50"
                                            >
                                                <Lock className="w-3 h-3 mr-1.5" /> Close Period
                                            </Button>
                                        )}
                                        {period.status === 'closed' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={working}
                                                onClick={() => handleReopen(period.id)}
                                                className="rounded-xl text-xs h-8 px-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                            >
                                                {working ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Unlock className="w-3 h-3 mr-1.5" />}
                                                Reopen
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Pre-Close Checklist */}
                                {isConfirmingClose && (
                                    <div className="border-t border-amber-100 bg-amber-50/60 px-5 py-4 space-y-3">
                                        <h5 className="text-xs font-black text-amber-800 flex items-center gap-1.5">
                                            <AlertTriangle className="w-4 h-4" />
                                            Pre-Close Checklist — {period.name}
                                        </h5>
                                        <div className="space-y-2">
                                            {[
                                                {
                                                    label: 'Trial balance will be verified (debits = credits)',
                                                    detail: 'The system automatically checks this on close.',
                                                    ok: true,
                                                },
                                                {
                                                    label: 'All sales invoices for the period are posted',
                                                    detail: 'Ensure no draft invoices remain for this date range.',
                                                    ok: null,
                                                },
                                                {
                                                    label: 'All vendor bills and purchase invoices are recorded',
                                                    detail: 'Check the Purchases tab for pending bills.',
                                                    ok: null,
                                                },
                                                {
                                                    label: 'Bank reconciliation completed for the period',
                                                    detail: 'Visit the Reconciliation tab to verify.',
                                                    ok: null,
                                                },
                                                {
                                                    label: 'Depreciation and accruals journal entries are posted',
                                                    detail: 'Use the Journal Entry tab to post any remaining adjustments.',
                                                    ok: null,
                                                },
                                            ].map((item, i) => (
                                                <div key={i} className="flex items-start gap-2">
                                                    {item.ok === true
                                                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                        : <div className="w-4 h-4 rounded-full border-2 border-amber-400 shrink-0 mt-0.5" />
                                                    }
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                                                        <p className="text-[10px] text-gray-500">{item.detail}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-2 border-t border-amber-200/60">
                                            <p className="text-[10px] text-amber-700 mb-3">
                                                <strong>Warning:</strong> Closing this period will prevent new GL entries from being posted
                                                to these dates. You can reopen the period later if needed.
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setConfirmingCloseId(null)}
                                                    className="rounded-xl text-xs h-9"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    disabled={working}
                                                    onClick={() => handleClose(period.id)}
                                                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs h-9 px-6 shadow-lg shadow-amber-500/20"
                                                >
                                                    {working
                                                        ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                                        : <Lock className="w-4 h-4 mr-1.5" />}
                                                    Confirm Close
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
