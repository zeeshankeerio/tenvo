'use client';

import React from 'react';
import { ShoppingCart, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { POS_SHELL_FOOTER } from '@/lib/utils/posLayout';

/**
 * Sticky mobile checkout bar — native app feel.
 */
export function PosMobileCheckoutBar({
    itemCount = 0,
    total = 0,
    currency = '₨',
    onOpenCheckout,
    emptyHint = 'Tap products to add to cart',
    className,
}) {
    if (itemCount <= 0) {
        return (
            <footer className={cn('shrink-0 px-4 py-2.5 text-center text-[11px] text-gray-400 border-t bg-white pb-[env(safe-area-inset-bottom)]', className)}>
                {emptyHint}
            </footer>
        );
    }

    return (
        <footer
            className={cn(
                POS_SHELL_FOOTER,
                'shrink-0 border-t border-slate-800 bg-slate-900 pb-[env(safe-area-inset-bottom)]',
                className
            )}
        >
            <button
                type="button"
                onClick={onOpenCheckout}
                className="flex items-center justify-between gap-3 w-full px-4 py-3.5 active:opacity-90 touch-manipulation"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="relative flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                        <ShoppingCart className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-emerald-700 text-[10px] font-bold flex items-center justify-center">
                            {itemCount > 99 ? '99+' : itemCount}
                        </span>
                    </span>
                    <div className="text-left min-w-0">
                        <p className="text-sm font-bold text-white truncate">View cart & pay</p>
                        <p className="text-[10px] text-slate-400">{itemCount} items</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <span className="text-lg font-bold text-emerald-400 tabular-nums">
                        {currency}{Number(total).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
            </button>
        </footer>
    );
}
