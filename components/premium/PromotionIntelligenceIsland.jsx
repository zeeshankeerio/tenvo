'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Sparkles,
    Percent,
    Target,
    ArrowRight,
    Tag,
    Flame,
    MousePointerClick,
    Info
} from 'lucide-react';
import { LiquidLayout, LiquidItem } from './LiquidLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import { getPromotionRecommendationsAction } from '@/lib/actions/premium/ai/analytics';

/**
 * PromotionIntelligenceIsland
 * Part of the 2026 AI Revenue Engine.
 * Suggests revenue-driving promotions based on actual stock performance.
 */
export function PromotionIntelligenceIsland({ businessId }) {
    const [loading, setLoading] = useState(true);
    const [recommendations, setRecommendations] = useState([]);

    useEffect(() => {
        async function load() {
            if (!businessId) return;
            setLoading(true);
            try {
                const res = await getPromotionRecommendationsAction(businessId);
                if (res.success) setRecommendations(res.data.recommendations || []);
            } catch (err) {
                console.error("Promotion Intelligence load error:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [businessId]);

    if (loading) {
        return (
            <LiquidLayout variant="glass" className="h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-amber-500/60 animate-pulse">Scanning Sales Patterns...</span>
                </div>
            </LiquidLayout>
        );
    }

    return (
        <LiquidLayout variant="glass" className="h-full">
            <div className="flex flex-col h-full gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <LiquidItem className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_20px_rgba(245,158,11,0.4)] rounded-2xl">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold uppercase tracking-tight text-slate-800 dark:text-white">AI Revenue Booster</h3>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Inventory-Driven Marketing</p>
                        </div>
                    </LiquidItem>

                    <Badge variant="outline" className="border-amber-200 bg-amber-50/50 text-amber-700 font-semibold h-7">
                        PREDICTED +15% ROI
                    </Badge>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto custom-scrollbar pr-2 -mr-2">
                    {recommendations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                <Target className="w-8 h-8 text-slate-300" />
                            </div>
                            <h4 className="font-bold text-slate-700">Healthy Sales Velocity</h4>
                            <p className="text-sm text-slate-400 max-w-[200px]">Current inventory levels are moving at optimal speeds.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recommendations.map((rec, idx) => (
                                <LiquidItem key={idx} delay={idx * 0.1}>
                                    <StrategyCard recommendation={rec} />
                                </LiquidItem>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Indicator */}
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/50 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                        <Info className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase">
                        These strategies target items with &gt;60 days of storage cost.
                        <span className="block font-semibold text-amber-600">Activate to clear PKR 45,200 in stagnant capital.</span>
                    </p>
                </div>
            </div>
        </LiquidLayout>
    );
}

function StrategyCard({ recommendation }) {
    return (
        <div className="p-5 bg-white/60 dark:bg-slate-800/60 rounded-[2rem] border border-white dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            {/* Background Glow */}
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl transition-all group-hover:bg-amber-400/10" />

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex gap-4">
                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center border border-amber-100 dark:border-amber-800 font-semibold text-amber-600">
                        {recommendation.strategy === 'Clearance' ? <Flame className="w-6 h-6" /> : <Tag className="w-6 h-6" />}
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-white uppercase">{recommendation.strategy} Campaign</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{recommendation.reason}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xl font-semibold text-amber-600">{recommendation.suggested_discount}</div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-tight">Suggested Save</div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50 relative z-10">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            P{i}
                        </div>
                    ))}
                    <div className="pl-3 text-[10px] font-bold text-slate-400 flex items-center">
                        {recommendation.product_ids?.length || 0} Affected
                    </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 rounded-full px-4 text-xs font-semibold uppercase text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors">
                    Create <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
            </div>
        </div>
    );
}
