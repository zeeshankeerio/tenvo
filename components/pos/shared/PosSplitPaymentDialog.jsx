'use client';

import React, { useEffect, useState } from 'react';
import { Banknote, CreditCard, SplitSquareHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Split payment dialog — cash + card (or second method) must sum to sale total.
 */
export function PosSplitPaymentDialog({
    open,
    onOpenChange,
    total = 0,
    currency = '₨',
    onConfirm,
}) {
    const [cashAmount, setCashAmount] = useState('');
    const [cardAmount, setCardAmount] = useState('');
    const saleTotal = Math.round(Number(total) * 100) / 100;

    useEffect(() => {
        if (open) {
            const half = Math.round((saleTotal / 2) * 100) / 100;
            setCashAmount(String(half));
            setCardAmount(String(Math.round((saleTotal - half) * 100) / 100));
        }
    }, [open, saleTotal]);

    const cash = parseFloat(cashAmount) || 0;
    const card = parseFloat(cardAmount) || 0;
    const sum = Math.round((cash + card) * 100) / 100;
    const balanced = Math.abs(sum - saleTotal) < 0.02;

    const handleConfirm = () => {
        if (!balanced || saleTotal <= 0) return;
        onConfirm?.([
            { method: 'cash', amount: cash },
            { method: 'card', amount: card },
        ]);
        onOpenChange?.(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <SplitSquareHorizontal className="w-5 h-5 text-amber-500" />
                        Split Payment
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="text-center py-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Due</p>
                        <p className="text-2xl font-bold text-gray-900 tabular-nums">
                            {currency}{saleTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs flex items-center gap-1.5">
                                <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Cash
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={cashAmount}
                                onChange={(e) => {
                                    const v = parseFloat(e.target.value) || 0;
                                    setCashAmount(e.target.value);
                                    setCardAmount(String(Math.max(0, Math.round((saleTotal - v) * 100) / 100)));
                                }}
                                className="h-11 text-lg font-semibold tabular-nums"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-brand-primary" /> Card / Mobile
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={cardAmount}
                                onChange={(e) => {
                                    const v = parseFloat(e.target.value) || 0;
                                    setCardAmount(e.target.value);
                                    setCashAmount(String(Math.max(0, Math.round((saleTotal - v) * 100) / 100)));
                                }}
                                className="h-11 text-lg font-semibold tabular-nums"
                            />
                        </div>
                    </div>

                    <div className={cn(
                        'text-center text-xs font-semibold py-2 rounded-lg',
                        balanced ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
                    )}>
                        {balanced
                            ? `Split total matches: ${currency}${sum.toLocaleString()}`
                            : `Difference: ${currency}${Math.abs(sum - saleTotal).toFixed(2)} — adjust amounts`}
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange?.(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={!balanced || saleTotal <= 0}>
                        Confirm Split
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
