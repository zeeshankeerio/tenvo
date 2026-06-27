'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Rocket,
    Command,
    Layers,
    Sparkles,
    Zap,
    LayoutGrid
} from 'lucide-react';
import { useBusyMode } from '@/lib/context/BusyModeContext';
import { GlobalBusyToggle } from '@/components/premium/GlobalBusyToggle';
import { LiquidLayout, LiquidItem } from '@/components/premium/LiquidLayout';
import { RestockForecasterIsland } from '@/components/premium/RestockForecasterIsland';
import { PromotionIntelligenceIsland } from '@/components/premium/PromotionIntelligenceIsland';
import { SegmentationIntelligenceIsland } from '@/components/premium/SegmentationIntelligenceIsland';
import { BusyGrid } from '@/components/BusyGrid';
import { Badge } from '@/components/ui/badge';
import { useBusiness } from '@/lib/context/BusinessContext';

export function InnovationShowcaseClient() {
    const { isBusyMode } = useBusyMode();
    const { business } = useBusiness();
    const businessId = business?.id || 'demo-business';

    const demoColumns = [
        { header: 'Product Name', accessorKey: 'name', width: 250 },
        { header: 'SKU', accessorKey: 'sku', width: 120 },
        { header: 'Stock', accessorKey: 'stock', width: 100 },
        { header: 'Price', accessorKey: 'price', width: 120 },
        { header: 'Status', accessorKey: 'status', width: 150 },
    ];

    const demoData = [
        { id: 1, name: 'Premium Leather Sofa', sku: 'LS-900', stock: 12, price: 45000, status: 'Active' },
        { id: 2, name: 'Ergonomic Desk Chair', sku: 'EC-400', stock: 5, price: 12000, status: 'Low Stock' },
        { id: 3, name: 'Smart Office Desk', sku: 'SD-100', stock: 0, price: 25000, status: 'Out of Stock' },
        { id: 4, name: 'LED Monitor Arm', sku: 'MA-002', stock: 85, price: 3500, status: 'Active' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12 space-y-12">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-200 pb-8">
                <LiquidItem className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg">
                            <Rocket className="w-8 h-8" />
                        </div>
                        <h1 className="text-4xl font-semibold tracking-tighter text-slate-900 dark:text-white uppercase">
                            Tenvo <span className="text-indigo-600">2026</span> Innovation
                        </h1>
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        Excellence in Commerce Intelligence Architecture
                    </p>
                </LiquidItem>

                <div className="flex items-center gap-6 bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-xl border border-white dark:border-slate-800">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Global Density Mode</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Currently: {isBusyMode ? 'High Density (Busy)' : 'Standard View'}
                        </span>
                    </div>
                    <GlobalBusyToggle />
                </div>
            </header>

            {/* Grid Layout of Islands */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 h-[600px]">
                    <RestockForecasterIsland businessId={businessId} />
                </div>
                <div className="lg:col-span-1 h-[600px]">
                    <PromotionIntelligenceIsland businessId={businessId} />
                </div>
                <div className="lg:col-span-1 h-[600px]">
                    <SegmentationIntelligenceIsland businessId={businessId} />
                </div>
            </div>

            {/* High-Density Grid Showcase */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white uppercase flex items-center gap-3">
                            <LayoutGrid className="w-6 h-6 text-indigo-500" />
                            Command Center Data Engine
                        </h2>
                        <p className="text-sm text-slate-400 font-medium">Industry-leading performance with infinite-scroll & formula-bar support.</p>
                    </div>
                    <Badge variant="outline" className="border-indigo-500 text-indigo-500 font-semibold px-4 py-1.5 rounded-full">
                        ENTERPRISE GRADE
                    </Badge>
                </div>

                <div className="h-[500px] border-[10px] border-slate-900/5 dark:border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                    <BusyGrid
                        data={demoData}
                        columns={demoColumns}
                        className="border-none"
                    />
                </div>
            </section>

            <footer className="pt-20 pb-10 text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-slate-300 dark:text-slate-700">
                    <div className="h-[1px] w-24 bg-current" />
                    <Command className="w-6 h-6" />
                    <div className="h-[1px] w-24 bg-current" />
                </div>
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                    Designed & Engineered for World-Class Business Operations
                </p>
            </footer>
        </div>
    );
}
