'use client';

import React, { useEffect, useState } from 'react';
import { Pill, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { posAPI } from '@/lib/api/pos';
import { getExpiryWarning } from '@/lib/utils/posPharmacy';

/**
 * Pharmacy batch picker — FEFO list before adding to cart.
 */
export function PosPharmacyBatchDialog({
    open,
    onOpenChange,
    businessId,
    product,
    onConfirm,
}) {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        if (!open || !businessId || !product?.id) return;
        setLoading(true);
        posAPI.getProductBatches(businessId, product.id)
            .then((res) => {
                if (res?.success) {
                    setBatches(res.batches || []);
                    setSelectedId(res.batches?.[0]?.id || null);
                }
            })
            .finally(() => setLoading(false));
    }, [open, businessId, product?.id]);

    const expiry = product ? getExpiryWarning(product) : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Pill className="w-5 h-5 text-violet-600" />
                        Batch Selection
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 py-1">
                    <p className="text-sm font-semibold text-gray-900">{product?.name}</p>

                    {expiry?.level === 'blocked' && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Product is expired — cannot sell at POS
                        </div>
                    )}

                    {loading ? (
                        <p className="text-xs text-gray-400 py-4 text-center">Loading batches…</p>
                    ) : batches.length === 0 ? (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            No active batches — item will use general stock (FEFO at checkout).
                        </p>
                    ) : (
                        <div className="max-h-56 overflow-y-auto space-y-1.5">
                            {batches.map((b) => (
                                <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => setSelectedId(b.id)}
                                    className={cn(
                                        'w-full text-left rounded-xl border px-3 py-2.5 text-xs transition-all',
                                        selectedId === b.id
                                            ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200'
                                            : 'border-gray-200 hover:bg-gray-50'
                                    )}
                                >
                                    <div className="flex justify-between gap-2">
                                        <span className="font-bold">{b.batch_number || 'Batch'}</span>
                                        <span className="text-gray-500">Qty {Number(b.quantity)}</span>
                                    </div>
                                    {b.expiry_date && (
                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                            Exp: {new Date(b.expiry_date).toLocaleDateString()}
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange?.(false)}>Cancel</Button>
                    <Button
                        disabled={expiry?.level === 'blocked'}
                        onClick={() => {
                            const batch = batches.find((b) => b.id === selectedId);
                            onConfirm?.({
                                batchId: batch?.id || null,
                                batchNumber: batch?.batch_number || null,
                                expiryDate: batch?.expiry_date || product?.expiry_date || null,
                            });
                            onOpenChange?.(false);
                        }}
                    >
                        Add to Cart
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
