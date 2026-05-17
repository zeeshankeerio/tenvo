'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RotateCcw, Search, Receipt, AlertTriangle, CheckCircle,
    Package, CreditCard, Banknote, Hash, Clock, ChevronRight,
    Minus, Plus, ArrowLeft, ShieldCheck, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/context/BusinessContext';
import { refundPosTransactionAction, getPosRefundsAction, getPosTransactionLookupAction } from '@/lib/actions/standard/posRefund';
import toast from 'react-hot-toast';

// ===============================================================
// REASON CODES
// ===============================================================

const REFUND_REASONS = [
    { key: 'defective', label: 'Defective / Damaged', icon: '🔧' },
    { key: 'wrong_item', label: 'Wrong Item', icon: '🔄' },
    { key: 'customer_dissatisfied', label: 'Customer Dissatisfied', icon: '😞' },
    { key: 'price_error', label: 'Price Error', icon: '💲' },
    { key: 'duplicate_charge', label: 'Duplicate Charge', icon: '[CLIPBOARD]' },
    { key: 'other', label: 'Other', icon: '📝' },
];

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
                    <p className="text-sm font-black text-red-600">-{currency} {Number(refund.total_amount).toLocaleString()}</p>
                    <span className={cn(
                        'text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase',
                        refund.refund_type === 'full' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    )}>
                        {refund.refund_type}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
                {refund.reason && <span>💬 {refund.reason}</span>}
                <span>* {refund.refund_method}</span>
                <span>* {new Date(refund.created_at).toLocaleDateString()}</span>
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
    const [transactionId, setTransactionId] = useState('');
    const [selectedTx, setSelectedTx] = useState(null);
    const [refundItems, setRefundItems] = useState([]);
    const [reason, setReason] = useState('');
    const [refundMethod, setRefundMethod] = useState('cash');
    const [isProcessing, setIsProcessing] = useState(false);

    // Load refund history
    const loadRefunds = useCallback(async () => {
        if (!effectiveBusinessId) return;
        try {
            const result = await getPosRefundsAction(effectiveBusinessId);
            if (result.success) setRefunds(result.refunds || []);
        } catch (err) {
            console.error('[Refund] Load failed:', err);
        } finally {
            setLoading(false);
        }
    }, [effectiveBusinessId]);

    useEffect(() => { loadRefunds(); }, [loadRefunds]);

    const handleLookup = async () => {
        if (!transactionId.trim()) {
            toast.error('Enter transaction ID or receipt number');
            return;
        }
        if (!effectiveBusinessId) {
            toast.error('Business context is not ready');
            return;
        }

        setIsProcessing(true);
        try {
            const result = await getPosTransactionLookupAction(effectiveBusinessId, transactionId.trim());
            if (!result.success || !result.transaction) {
                toast.error(result.error || 'Transaction not found');
                return;
            }

            setSelectedTx(result.transaction);
            setRefundItems([]);
            setView('process');
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
            return [...prev, { ...item, refundQty: item.quantity, restock: true }];
        });
    };

    // Update refund quantity
    const updateRefundQty = (productId, delta) => {
        setRefundItems(prev => prev.map(ri => {
            if (ri.productId !== productId) return ri;
            const origItem = selectedTx.items.find(i => i.productId === productId);
            const newQty = Math.max(1, Math.min(origItem.quantity, ri.refundQty + delta));
            return { ...ri, refundQty: newQty };
        }));
    };

    // Toggle restock
    const toggleRestock = (productId) => {
        setRefundItems(prev => prev.map(ri =>
            ri.productId === productId ? { ...ri, restock: !ri.restock } : ri
        ));
    };

    // Calculate refund amount
    const refundTotal = useMemo(() =>
        refundItems.reduce((sum, ri) => sum + (ri.refundQty * ri.unitPrice), 0),
        [refundItems]);

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
                    quantity: ri.refundQty,
                    unitPrice: ri.unitPrice,
                    refundAmount: ri.refundQty * ri.unitPrice,
                    restock: ri.restock,
                })),
            });

            if (result.success) {
                toast.success(`Refund ${result.refund.refund_number} processed!`, { icon: '[OK]' });
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
                        onClick={() => setView('lookup')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-red-200"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        New Refund
                    </button>
                )}
                {view !== 'history' && (
                    <button
                        onClick={() => { setView('history'); setSelectedTx(null); }}
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
                    <p className="text-xl font-black text-red-600">{refunds.length}</p>
                    <p className="text-[10px] font-bold text-red-400">Total Refunds</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <Receipt className="w-4 h-4 text-amber-400 mb-1" />
                    <p className="text-xl font-black text-amber-600">
                        {currency} {refunds.reduce((s, r) => s + Number(r.total_amount || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold text-amber-400">Total Refunded</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <Package className="w-4 h-4 text-emerald-400 mb-1" />
                    <p className="text-xl font-black text-emerald-600">
                        {refunds.filter(r => r.refund_type === 'partial').length}
                    </p>
                    <p className="text-[10px] font-bold text-emerald-400">Partial Refunds</p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {/* --- LOOKUP VIEW ----------------------------- */}
                {view === 'lookup' && (
                    <motion.div key="lookup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
                    >
                        <h3 className="text-sm font-black text-gray-900">Find Transaction</h3>
                        <p className="text-xs text-gray-400">Enter the transaction ID or scan the receipt barcode</p>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <input
                                    type="text"
                                    placeholder="Transaction ID or Receipt #..."
                                    value={transactionId}
                                    onChange={e => setTransactionId(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleLookup()}
                                    className="w-full pl-9 pr-3 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={handleLookup}
                                disabled={isProcessing}
                                className="px-5 py-3 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-xl transition-all"
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
                                    <p className="text-[10px] text-gray-400">Original total: {currency} {Number(selectedTx.total_amount).toLocaleString()}</p>
                                </div>
                                <span className="text-[9px] px-2 py-0.5 bg-brand-50 text-brand-primary rounded-full font-bold">ORIGINAL</span>
                            </div>

                            {/* Item Selection */}
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Select Items to Refund</p>
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
                                                <p className="text-[10px] text-gray-400">{item.quantity}x @ {currency} {item.unitPrice.toLocaleString()}</p>
                                            </div>

                                            {isSelected && ri && (
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => updateRefundQty(item.productId, -1)}
                                                            className="w-6 h-6 rounded-md bg-white border flex items-center justify-center">
                                                            <Minus className="w-3 h-3 text-gray-500" />
                                                        </button>
                                                        <span className="w-6 text-center text-xs font-black">{ri.refundQty}</span>
                                                        <button onClick={() => updateRefundQty(item.productId, 1)}
                                                            className="w-6 h-6 rounded-md bg-white border flex items-center justify-center">
                                                            <Plus className="w-3 h-3 text-gray-500" />
                                                        </button>
                                                    </div>
                                                    <button
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

                                            <span className="text-sm font-bold text-gray-600 w-20 text-right">
                                                {currency} {(isSelected ? ri.refundQty * ri.unitPrice : item.quantity * item.unitPrice).toLocaleString()}
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
                                <p className="text-xl font-black text-red-700">{currency} {refundTotal.toLocaleString()}</p>
                            </div>
                            <button
                                onClick={handleProcessRefund}
                                disabled={refundItems.length === 0 || !reason || isProcessing}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-black rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <span className="animate-spin">⏳</span>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-4 h-4" />
                                        Process Refund -- {currency} {refundTotal.toLocaleString()}
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* --- HISTORY VIEW ---------------------------- */}
                {view === 'history' && (
                    <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                        {refunds.length === 0 ? (
                            <div className="text-center py-16 text-gray-400">
                                <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm font-bold">No refunds processed yet</p>
                                <p className="text-xs mt-1">Use "New Refund" to process a return</p>
                            </div>
                        ) : (
                            refunds.map(refund => (
                                <RefundHistoryCard key={refund.id} refund={refund} currency={currency} />
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
