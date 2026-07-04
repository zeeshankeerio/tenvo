'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductThumbnail } from '@/components/product/ProductThumbnail';
import { getProductAvailableStock } from '@/lib/utils/posHelpers';

/**
 * Touch-friendly product grid for browse-first POS workflows.
 */
export function PosProductBrowseGrid({
    products = [],
    onAddToCart,
    currency = '₨',
    businessCategory,
    emptyMessage = 'No products in this category',
    className,
}) {
    if (!products.length) {
        return (
            <div className={cn('flex flex-col items-center justify-center py-16 text-gray-400', className)}>
                <p className="text-sm font-semibold">{emptyMessage}</p>
                <p className="text-[11px] mt-1 text-gray-300">Add inventory or switch category</p>
            </div>
        );
    }

    return (
        <div className={cn('overflow-y-auto flex-1 min-h-0 p-3 max-lg:p-2 overscroll-contain', className)}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-lg:gap-1.5">
                {products.map((product) => {
                    const stock = getProductAvailableStock(product);
                    const outOfStock = stock <= 0;
                    const price = parseFloat(product.selling_price || product.price || 0);

                    return (
                        <button
                            key={product.id}
                            type="button"
                            disabled={outOfStock}
                            onClick={() => onAddToCart?.(product)}
                            className={cn(
                                'group relative flex flex-col rounded-xl border bg-white text-left transition-all touch-manipulation',
                                'hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/10 active:scale-[0.98]',
                                outOfStock
                                    ? 'opacity-45 cursor-not-allowed border-gray-100'
                                    : 'border-gray-100 cursor-pointer'
                            )}
                        >
                            <div className="aspect-square w-full p-2 flex items-center justify-center bg-gray-50/80 rounded-t-xl overflow-hidden">
                                <ProductThumbnail
                                    product={product}
                                    businessCategory={businessCategory}
                                    size="lg"
                                    className="w-full h-full object-contain border-0 shadow-none"
                                />
                            </div>
                            <div className="p-2.5 flex-1 flex flex-col gap-0.5 min-w-0">
                                <p className="text-[11px] font-bold text-gray-900 line-clamp-2 leading-tight">
                                    {product.name}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono truncate">
                                    {product.sku || product.barcode || '—'}
                                </p>
                                <div className="flex items-center justify-between mt-auto pt-1">
                                    <span className="text-xs font-bold text-emerald-600 tabular-nums">
                                        {currency}{price.toLocaleString()}
                                    </span>
                                    <span className={cn(
                                        'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                                        outOfStock
                                            ? 'bg-red-100 text-red-600'
                                            : stock <= 5
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-gray-100 text-gray-500'
                                    )}>
                                        {outOfStock ? 'Out' : stock}
                                    </span>
                                </div>
                            </div>
                            {!outOfStock && (
                                <span className="absolute top-2 right-2 p-1 rounded-full bg-emerald-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                    <Plus className="w-3 h-3" />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
