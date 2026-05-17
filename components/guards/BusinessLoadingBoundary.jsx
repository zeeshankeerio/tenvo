'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * BusinessLoadingBoundary -- Shows a polished skeleton/spinner overlay
 * while business data is being loaded (initial mount or business switch).
 *
 * Wraps the main content area and renders children only when isLoading=false.
 * On subsequent renders, old content fades out smoothly.
 */
export function BusinessLoadingBoundary({ isLoading, children }) {
    return (
        <AnimatePresence mode="wait">
            {isLoading ? (
                <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6 py-4"
                >
                    {/* Skeleton header */}
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

                    {/* Skeleton metric cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                                <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
                                <div className="h-3 w-16 bg-gray-50 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>

                    {/* Skeleton table/content area */}
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

                    {/* Loading spinner */}
                    <div className="flex items-center justify-center pt-2">
                        <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
                        <span className="ml-2 text-xs font-medium text-gray-400">Loading business data...</span>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    key="content"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
