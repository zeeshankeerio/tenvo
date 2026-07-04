'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Lightweight loading shell for the main hub content area.
 * Uses a simple opacity transition instead of AnimatePresence mode="wait"
 * to avoid blank frames during tab or data transitions.
 *
 * @param {'full' | 'minimal'} variant - minimal when tenant context exists (no full-page swap)
 */
export function BusinessLoadingBoundary({ isLoading, children, variant = 'full' }) {
    if (isLoading) {
        if (variant === 'minimal') {
            return (
                <div className="flex items-center justify-center py-16 animate-in fade-in duration-200">
                    <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
                    <span className="ml-2 text-xs font-medium text-gray-400">Loading workspace...</span>
                </div>
            );
        }

        return (
            <div className="space-y-6 py-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="h-9 w-24 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                            <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
                            <div className="h-3 w-16 bg-gray-50 rounded animate-pulse" />
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                        <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
                        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                    <div className="divide-y divide-gray-50">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4">
                                <div className="h-4 w-4 bg-gray-100 rounded animate-pulse" />
                                <div className="h-4 flex-1 bg-gray-100 rounded animate-pulse" />
                                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                                <div className="h-4 w-20 bg-gray-50 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-center pt-2">
                    <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
                    <span className="ml-2 text-xs font-medium text-gray-400">Loading workspace...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('animate-in fade-in slide-in-from-bottom-1 duration-300')}>
            {children}
        </div>
    );
}

