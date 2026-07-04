'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Calculator, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { posAPI } from '@/lib/api/pos';
import toast from 'react-hot-toast';

/**
 * End-of-shift cash reconciliation dialog.
 */
export function PosCloseShiftDialog({
    open,
    onOpenChange,
    businessId,
    session,
    currency = '₨',
    onClosed,
}) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [closingCash, setClosingCash] = useState('');
    const [summary, setSummary] = useState(null);

    const loadSummary = useCallback(async () => {
        if (!businessId || !session?.id) return;
        setLoading(true);
        try {
            const res = await posAPI.getSessionSummary(businessId, session.id);
            if (res?.success) {
                setSummary(res.summary);
                const expected = Number(res.summary?.expected_cash ?? res.summary?.opening_balance ?? 0);
                setClosingCash(String(Math.round(expected * 100) / 100));
            } else {
                toast.error(res?.error || 'Could not load session summary');
            }
        } catch (err) {
            toast.error(err?.message || 'Failed to load shift summary');
        } finally {
            setLoading(false);
        }
    }, [businessId, session?.id]);

    useEffect(() => {
        if (open) loadSummary();
    }, [open, loadSummary]);

    const expectedCash = Number(summary?.expected_cash ?? 0);
    const counted = parseFloat(closingCash) || 0;
    const difference = Math.round((counted - expectedCash) * 100) / 100;
    const openingCash = Number(summary?.opening_balance || 0);
    const txCount = Number(summary?.tx_count || 0);
    const totalRevenue = Number(summary?.total_revenue || 0);

    const handleClose = async () => {
        if (!businessId || !session?.id) return;
        setSubmitting(true);
        try {
            const res = await posAPI.closeSession({
                businessId,
                sessionId: session.id,
                closingCash: counted,
            });
            if (res?.success) {
                toast.success(
                    difference === 0
                        ? 'Shift closed — cash balanced'
                        : `Shift closed — ${difference > 0 ? 'over' : 'short'} ${currency}${Math.abs(difference).toLocaleString()}`
                );
                onClosed?.(res.session);
                onOpenChange?.(false);
            } else {
                toast.error(res?.error || 'Could not close shift');
            }
        } catch (err) {
            toast.error(err?.message || 'Failed to close shift');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-emerald-600" />
                        Close Shift — Cash Reconciliation
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12 text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        Loading shift summary…
                    </div>
                ) : (
                    <div className="space-y-4 py-1">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Transactions</p>
                                <p className="text-xl font-bold text-gray-900 tabular-nums">{txCount}</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Revenue</p>
                                <p className="text-xl font-bold text-emerald-600 tabular-nums">
                                    {currency}{totalRevenue.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {Array.isArray(summary?.payment_breakdown) && summary.payment_breakdown.length > 0 && (
                            <div className="rounded-xl border border-gray-100 divide-y divide-gray-100">
                                {summary.payment_breakdown.map((row) => (
                                    <div key={row.method} className="flex justify-between px-3 py-2 text-xs">
                                        <span className="text-gray-500 capitalize">{row.method}</span>
                                        <span className="font-semibold tabular-nums">
                                            {currency}{Number(row.total).toLocaleString()} ({row.count})
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="space-y-2 text-xs text-gray-600">
                            <div className="flex justify-between">
                                <span>Opening float</span>
                                <span className="font-semibold tabular-nums">{currency}{openingCash.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Expected cash in drawer</span>
                                <span className="font-semibold tabular-nums text-emerald-700">
                                    {currency}{expectedCash.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs">Counted cash in drawer</Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={closingCash}
                                onChange={(e) => setClosingCash(e.target.value)}
                                className="h-12 text-xl font-bold tabular-nums"
                                autoFocus
                            />
                        </div>

                        <div className={cn(
                            'text-center text-sm font-semibold py-2.5 rounded-xl',
                            Math.abs(difference) < 0.02
                                ? 'bg-emerald-50 text-emerald-700'
                                : difference > 0
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-red-50 text-red-700'
                        )}>
                            {Math.abs(difference) < 0.02
                                ? 'Cash balanced'
                                : `${difference > 0 ? 'Over' : 'Short'} by ${currency}${Math.abs(difference).toLocaleString()}`}
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleClose} disabled={loading || submitting || !closingCash}>
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Closing…
                            </>
                        ) : (
                            'Close Shift'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
