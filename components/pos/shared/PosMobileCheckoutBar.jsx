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
    variant = 'retail',
    checkoutLabel = 'View cart & pay',
}) {
    const isRestaurant = variant === 'restaurant';

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
                'shrink-0 border-t pb-[env(safe-area-inset-bottom)]',
                isRestaurant
                    ? 'border-indigo-100 bg-white'
                    : 'border-gray-100 bg-white',
                className
            )}
        >
            <button
                type="button"
                onClick={onOpenCheckout}
                className="flex items-center justify-between gap-3 w-full px-4 py-3 max-lg:py-2.5 active:opacity-90 touch-manipulation"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className={cn(
                        'relative flex items-center justify-center w-10 h-10 max-lg:w-9 max-lg:h-9 rounded-full text-white shadow-md',
                        isRestaurant
                            ? 'bg-indigo-600 shadow-indigo-500/25'
                            : 'bg-emerald-500 shadow-emerald-500/25'
                    )}>
                        <ShoppingCart className="w-5 h-5 max-lg:w-4 max-lg:h-4" />
                        <span className={cn(
                            'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[10px] font-bold flex items-center justify-center shadow-sm',
                            isRestaurant ? 'text-indigo-700' : 'text-emerald-700'
                        )}>
                            {itemCount > 99 ? '99+' : itemCount}
                        </span>
                    </span>
                    <div className="text-left min-w-0">
                        <p className={cn(
                            'text-sm max-lg:text-xs font-semibold truncate text-gray-900'
                        )}>
                            {checkoutLabel}
                        </p>
                        <p className={cn(
                            'text-[10px]',
                            isRestaurant ? 'text-gray-400' : 'text-gray-500'
                        )}>
                            {itemCount} items
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <span className={cn(
                        'text-lg max-lg:text-base font-semibold tabular-nums',
                        isRestaurant ? 'text-indigo-600' : 'text-emerald-600'
                    )}>
                        {currency}{Number(total).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <ChevronRight className={cn('w-5 h-5', isRestaurant ? 'text-indigo-300' : 'text-gray-400')} />
                </div>
            </button>
        </footer>
    );
}
