'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RotateCcw, Search, Receipt, CheckCircle,
    Package, CreditCard, Banknote, Hash,
    Minus, Plus, ArrowLeft, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/context/BusinessContext';
import {
    refundPosTransactionAction,
    getPosRefundsAction,
    getPosTransactionLookupAction,
    getRecentPosTransactionsForRefundAction,
} from '@/lib/actions/standard/posRefund';
import toast from 'react-hot-toast';

// ===============================================================
// REASON CODES
// ===============================================================

const REFUND_REASONS = [
    { key: 'defective', label: 'Defective / Damaged', icon: '🔧' },
    { key: 'wrong_item', label: 'Wrong Item', icon: '🔄' },
    { key: 'customer_dissatisfied', label: 'Customer Dissatisfied', icon: '😞' },
    { key: 'price_error', label: 'Price Error', icon: '💲' },
    { key: 'duplicate_charge', label: 'Duplicate Charge', icon: '📋' },
    { key: 'other', label: 'Other', icon: '📝' },
];

function money(n) {
    const x = Number(n);
    return Number.isFinite(x) ? x : 0;
}

// ===============================================================
// REFUND HISTORY CARD
// ===============================================================

function RefundHistoryCard({ refund, currency }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-3 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                        <RotateCcw className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-gray-900">{refund.refund_number}</p>
                        <p className="text-[9px] text-gray-400">from {refund.transaction_number}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-black text-red-600 tabular-nums">
                        -{currency} {money(refund.total_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <span className={cn(
                        'text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase',
                        String(refund.refund_type || '').toLowerCase() === 'full'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                    )}>
                        {refund.refund_type}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
                {refund.reason && <span>💬 {refund.reason}</span>}
                <span>· {refund.refund_method}</span>
                <span>· {refund.created_at ? new Date(refund.created_at).toLocaleDateString() : '—'}</span>
            </div>
        </div>
    );
}

// ===============================================================
// MAIN REFUND PANEL
// ===============================================================

export function PosRefundPanel({ businessId }) {
    const { business, currencySymbol } = useBusiness();
    const effectiveBusinessId = businessId || business?.id;
    const currency = currencySymbol || 'Rs.';

    // State
    const [view, setView] = useState('history'); // history | lookup | process
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [recentSales, setRecentSales] = useState([]);
    const [transactionId, setTransactionId] = useState('');
    const [lookupAttempted, setLookupAttempted] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);
    const [refundItems, setRefundItems] = useState([]);
    const [reason, setReason] = useState('');
    const [refundMethod, setRefundMethod] = useState('cash');
    const [isProcessing, setIsProcessing] = useState(false);

    const kpi = useMemo(() => {
        const totalRefunded = refunds.reduce((s, r) => s + money(r.total_amount), 0);
        const partialCount = refunds.filter(
            (r) => String(r.refund_type || '').toLowerCase() === 'partial'
        ).length;
        return { count: refunds.length, totalRefunded, partialCount };
    }, [refunds]);

    // Load refund history
    const loadRefunds = useCallback(async () => {
        if (!effectiveBusinessId) return;
        setLoading(true);
        setLoadError(null);
        try {
            const result = await getPosRefundsAction(effectiveBusinessId);
            if (result.success) {
                setRefunds(result.refunds || []);
            } else {
                setRefunds([]);
                setLoadError(result.error || 'Could not load refund history');
                toast.error(result.error || 'Could not load refund history');
            }
        } catch (err) {
            console.error('[Refund] Load failed:', err);
            setLoadError(err.message || 'Load failed');
            toast.error('Could not load refunds');
        } finally {
            setLoading(false);
        }
    }, [effectiveBusinessId]);

    useEffect(() => { loadRefunds(); }, [loadRefunds]);

    const loadRecentSales = useCallback(async () => {
        if (!effectiveBusinessId) return;
        try {
            const res = await getRecentPosTransactionsForRefundAction(effectiveBusinessId, 15);
            if (res.success) setRecentSales(res.transactions || []);
            else setRecentSales([]);
        } catch {
            setRecentSales([]);
        }
    }, [effectiveBusinessId]);

    useEffect(() => {
        if (view === 'lookup') loadRecentSales();
    }, [view, loadRecentSales]);

    const handleLookup = async (overrideRef) => {
        const ref = String(overrideRef ?? transactionId).trim();
        if (!ref) {
            toast.error('Enter transaction ID or receipt number');
            return;
        }
        if (!effectiveBusinessId) {
            toast.error('Business context is not ready');
            return;
        }

        setIsProcessing(true);
        setLookupAttempted(true);
        try {
            const result = await getPosTransactionLookupAction(effectiveBusinessId, ref);
            if (!result.success || !result.transaction) {
                toast.error(result.error || 'Transaction not found');
                return;
            }

            if (!result.transaction.items?.length) {
                toast.error('This sale has no line items to refund');
                return;
            }

            setSelectedTx(result.transaction);
            setRefundItems([]);
            setView('process');
            setLookupAttempted(false);
        } catch (error) {
            toast.error('Failed to lookup transaction');
        } finally {
            setIsProcessing(false);
        }
    };

    // Toggle item for refund
    const toggleRefundItem = (item) => {
        setRefundItems(prev => {
            const existing = prev.find(ri => ri.productId === item.productId);
            if (existing) return prev.filter(ri => ri.productId !== item.productId);
            const qty = Math.max(1, money(item.quantity));
            const unitPrice = money(item.unitPrice);
            return [...prev, { ...item, quantity: qty, unitPrice, refundQty: qty, restock: true }];
        });
    };

    const selectAllLineItems = () => {
        if (!selectedTx?.items?.length) return;
        setRefundItems(
            selectedTx.items.map((item) => ({
                ...item,
                quantity: Math.max(1, money(item.quantity)),
                unitPrice: money(item.unitPrice),
                refundQty: Math.max(1, money(item.quantity)),
                restock: true,
            }))
        );
    };

    // Update refund quantity
    const updateRefundQty = (productId, delta) => {
        setRefundItems(prev => prev.map(ri => {
            if (ri.productId !== productId) return ri;
            const origItem = selectedTx.items.find(i => i.productId === productId);
            if (!origItem) return ri;
            const maxQ = Math.max(1, money(origItem.quantity));
            const next = Math.max(1, Math.min(maxQ, money(ri.refundQty) + delta));
            return { ...ri, refundQty: next };
        }));
    };

    // Toggle restock
    const toggleRestock = (productId) => {
        setRefundItems(prev => prev.map(ri =>
            ri.productId === productId ? { ...ri, restock: !ri.restock } : ri
        ));
    };

    // Calculate refund amount
    const refundTotal = useMemo(
        () =>
            refundItems.reduce(
                (sum, ri) => sum + money(ri.refundQty) * money(ri.unitPrice),
                0
            ),
        [refundItems]
    );

    // Process refund
    const handleProcessRefund = async () => {
        if (refundItems.length === 0) { toast.error('Select items to refund'); return; }
        if (!reason) { toast.error('Select a reason'); return; }
        setIsProcessing(true);
        try {
            const result = await refundPosTransactionAction({
                businessId: effectiveBusinessId,
                transactionId: selectedTx.id,
                reason,
                refundMethod,
                items: refundItems.map(ri => ({
                    productId: ri.productId,
                    productName: ri.productName,
                    quantity: money(ri.refundQty),
                    unitPrice: money(ri.unitPrice),
                    refundAmount: money(ri.refundQty) * money(ri.unitPrice),
                    restock: ri.restock,
                })),
            });

            if (result.success) {
                toast.success(`Refund ${result.refund.refund_number} processed`);
                setView('history');
                setSelectedTx(null);
                setRefundItems([]);
                setReason('');
                loadRefunds();
            } else {
                toast.error(result.error || 'Refund failed');
            }
        } catch (err) {
            toast.error('Refund processing failed');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                        <RotateCcw className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900">POS Refunds</h2>
                        <p className="text-xs text-gray-400">Process returns · Restock · GL reversal</p>
                    </div>
                </div>
                {view === 'history' && (
                    <button
                        type="button"
                        onClick={() => {
                            setTransactionId('');
                            setLookupAttempted(false);
                            setView('lookup');
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-red-200"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        New Refund
                    </button>
                )}
                {view !== 'history' && (
                    <button
                        type="button"
                        onClick={() => {
                            setView('history');
                            setSelectedTx(null);
                            setLookupAttempted(false);
                            setTransactionId('');
                        }}
                        className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to History
                    </button>
                )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <RotateCcw className="w-4 h-4 text-red-400 mb-1" />
                    <p className="text-xl font-black text-red-600">{loading ? '…' : kpi.count}</p>
                    <p className="text-[10px] font-bold text-red-400">Total Refunds</p>
                    {!loading && kpi.count === 0 && (
                        <p className="text-[9px] text-red-300 mt-1 leading-tight">No refunds in this workspace yet</p>
                    )}
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <Receipt className="w-4 h-4 text-amber-400 mb-1" />
                    <p className="text-xl font-black text-amber-600">
                        {loading ? '…' : `${currency} ${kpi.totalRefunded.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    </p>
                    <p className="text-[10px] font-bold text-amber-400">Total Refunded</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <Package className="w-4 h-4 text-emerald-400 mb-1" />
                    <p className="text-xl font-black text-emerald-600">
                        {loading ? '…' : kpi.partialCount}
                    </p>
                    <p className="text-[10px] font-bold text-emerald-400">Partial Refunds</p>
                </div>
            </div>

            {loadError && view === 'history' && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                    <span className="font-medium">{loadError}</span>
                    <button
                        type="button"
                        onClick={() => loadRefunds()}
                        className="shrink-0 font-bold text-amber-800 underline-offset-2 hover:underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            <AnimatePresence mode="wait">
                {/* --- LOOKUP VIEW ----------------------------- */}
                {view === 'lookup' && (
                    <motion.div key="lookup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
                    >
                        <div>
                            <h3 className="text-sm font-black text-gray-900">Find transaction</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Search by receipt number (e.g. <span className="font-mono text-gray-700">POS-000123</span>) or paste the transaction UUID from POS history.
                            </p>
                        </div>

                        {recentSales.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Recent sales</p>
                                <div className="flex flex-wrap gap-2">
                                    {recentSales.map((tx) => (
                                        <button
                                            key={tx.id}
                                            type="button"
                                            disabled={isProcessing}
                                            onClick={() => {
                                                setTransactionId(tx.transactionNumber || tx.id);
                                                handleLookup(tx.transactionNumber || tx.id);
                                            }}
                                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-bold text-gray-800 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                                        >
                                            <Receipt className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                            <span className="font-mono">{tx.transactionNumber}</span>
                                            <span className="text-[10px] font-semibold text-gray-500">
                                                {currency}
                                                {tx.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <input
                                    type="search"
                                    enterKeyHint="search"
                                    placeholder="Receipt # or transaction ID…"
                                    value={transactionId}
                                    onChange={(e) => {
                                        setTransactionId(e.target.value);
                                        setLookupAttempted(false);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleLookup();
                                        }
                                    }}
                                    className={cn(
                                        'w-full pl-9 pr-3 py-3 text-sm rounded-xl border outline-none transition-shadow',
                                        'border-gray-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200',
                                        lookupAttempted && !transactionId.trim() && 'border-amber-300 bg-amber-50/30'
                                    )}
                                    autoComplete="off"
                                    autoFocus
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => handleLookup()}
                                disabled={isProcessing}
                                className="shrink-0 px-5 py-3 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-xl transition-all disabled:opacity-60"
                            >
                                {isProcessing ? (
                                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* --- PROCESS VIEW ---------------------------- */}
                {view === 'process' && selectedTx && (
                    <motion.div key="process" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {/* Transaction Info */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-sm font-black text-gray-900">Transaction {selectedTx.transaction_number}</p>
                                    <p className="text-[10px] text-gray-400">
                                        Original total: {currency}{' '}
                                        {money(selectedTx.total_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <span className="text-[9px] px-2 py-0.5 bg-brand-50 text-brand-primary rounded-full font-bold">ORIGINAL</span>
                            </div>

                            {/* Item Selection */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select items to refund</p>
                                <button
                                    type="button"
                                    onClick={selectAllLineItems}
                                    className="text-[10px] font-bold text-red-600 hover:text-red-700 underline-offset-2 hover:underline"
                                >
                                    Select all lines
                                </button>
                            </div>
                            <div className="space-y-2">
                                {selectedTx.items.map(item => {
                                    const isSelected = refundItems.some(ri => ri.productId === item.productId);
                                    const ri = refundItems.find(r => r.productId === item.productId);

                                    return (
                                        <div key={item.productId}
                                            className={cn(
                                                'flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer',
                                                isSelected ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                                            )}
                                            onClick={() => toggleRefundItem(item)}
                                        >
                                            <div className={cn(
                                                'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
                                                isSelected ? 'border-red-500 bg-red-500' : 'border-gray-300'
                                            )}>
                                                {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-gray-800">{item.productName}</p>
                                                <p className="text-[10px] text-gray-400">
                                                    {money(item.quantity)}× @ {currency}{' '}
                                                    {money(item.unitPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </p>
                                            </div>

                                            {isSelected && ri && (
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateRefundQty(item.productId, -1)}
                                                            className="w-6 h-6 rounded-md border border-emerald-700 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        >
                                                            <Minus className="w-3 h-3 text-white" />
                                                        </button>
                                                        <span className="w-6 text-center text-xs font-black">{ri.refundQty}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateRefundQty(item.productId, 1)}
                                                            className="w-6 h-6 rounded-md border border-emerald-700 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        >
                                                            <Plus className="w-3 h-3 text-white" />
                                                        </button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleRestock(item.productId)}
                                                        className={cn(
                                                            'text-[9px] px-2 py-1 rounded-lg font-bold transition-colors',
                                                            ri.restock ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                                                        )}
                                                    >
                                                        {ri.restock ? '↩ Restock' : 'No Restock'}
                                                    </button>
                                                </div>
                                            )}

                                            <span className="text-sm font-bold text-gray-600 w-24 text-right tabular-nums">
                                                {currency}{' '}
                                                {(
                                                    isSelected
                                                        ? money(ri.refundQty) * money(ri.unitPrice)
                                                        : money(item.quantity) * money(item.unitPrice)
                                                ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Reason + Method */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reason</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {REFUND_REASONS.map(r => (
                                        <button
                                            type="button"
                                            key={r.key}
                                            onClick={() => setReason(r.key)}
                                            className={cn(
                                                'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-bold border transition-all text-left',
                                                reason === r.key
                                                    ? 'border-red-400 bg-red-50 text-red-700'
                                                    : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                            )}
                                        >
                                            <span>{r.icon}</span>
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Refund Method</p>
                                <div className="space-y-1.5">
                                    {[
                                        { key: 'cash', label: 'Cash Refund', icon: Banknote },
                                        { key: 'card', label: 'Card Reversal', icon: CreditCard },
                                        { key: 'store_credit', label: 'Store Credit', icon: Receipt },
                                    ].map(m => (
                                        <button
                                            type="button"
                                            key={m.key}
                                            onClick={() => setRefundMethod(m.key)}
                                            className={cn(
                                                'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold border transition-all',
                                                refundMethod === m.key
                                                    ? 'border-red-400 bg-red-50 text-red-700'
                                                    : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                            )}
                                        >
                                            <m.icon className="w-4 h-4" />
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Refund Summary + Action */}
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-xs font-bold text-red-600 uppercase">Refund Summary</p>
                                    <p className="text-[10px] text-red-400">{refundItems.length} item(s) selected * {refundItems.filter(ri => ri.restock).length} to restock</p>
                                </div>
                                <p className="text-xl font-black text-red-700 tabular-nums">
                                    {currency} {refundTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleProcessRefund}
                                disabled={refundItems.length === 0 || !reason || isProcessing}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-black rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <span className="animate-spin">⏳</span>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-4 h-4" />
                                        Process refund · {currency}{' '}
                                        {refundTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* --- HISTORY VIEW ---------------------------- */}
                {view === 'history' && (
                    <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <span className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-red-500" />
                                <p className="text-sm font-bold">Loading refund history…</p>
                            </div>
                        ) : refunds.length === 0 ? (
                            <div className="text-center py-16 text-gray-400">
                                <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm font-bold">No refunds processed yet</p>
                                <p className="text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                                    KPIs show totals for this business. Start a return with <span className="font-semibold text-gray-600">New refund</span>, then pick a recent sale or enter the receipt number from the printed ticket.
                                </p>
                            </div>
                        ) : (
                            refunds.map((refund) => (
                                <RefundHistoryCard key={refund.id} refund={refund} currency={currency} />
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
