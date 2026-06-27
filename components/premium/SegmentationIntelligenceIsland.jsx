'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
    Users,
    UserPlus,
    Crown,
    HeartCrack,
    TrendingUp,
    MessageSquare,
    ChevronRight,
    PieChart as PieIcon
} from 'lucide-react';
import { LiquidLayout, LiquidItem } from './LiquidLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// Mock data pattern matching the MarketingAgentService logic
const SEGMENTS = [
    { id: 'vip', name: 'Elite VIPs', count: 42, color: 'text-amber-500 bg-amber-50', icon: Crown, trend: '+12%', description: 'Top 5% by revenue' },
    { id: 'at-risk', name: 'Churn Risk', count: 18, color: 'text-red-500 bg-red-50', icon: HeartCrack, trend: '-5%', description: 'No orders in 30 days' },
    { id: 'new', name: 'Rising Stars', count: 156, color: 'text-emerald-500 bg-emerald-50', icon: UserPlus, trend: '+30%', description: 'First-time buyers' },
];

/**
 * SegmentationIntelligenceIsland
 * Visualizes AI customer clusters for marketing precision.
 */
export function SegmentationIntelligenceIsland({ businessId }) {
    const [loading, setLoading] = useState(false); // Simulate loading if needed

    return (
        <LiquidLayout variant="glass" className="h-full">
            <div className="flex flex-col h-full gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <LiquidItem className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] rounded-2xl">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold uppercase tracking-tight text-slate-800 dark:text-white">Customer Clusters</h3>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">AI Marketing Intelligence</p>
                        </div>
                    </LiquidItem>

                    <div className="flex items-center gap-2">
                        <div className="text-right">
                            <div className="text-xs font-semibold text-slate-800 dark:text-white">216 Total</div>
                            <div className="text-[10px] font-bold text-emerald-500 uppercase">+12% This Week</div>
                        </div>
                    </div>
                </div>

                {/* Segments List */}
                <div className="flex-1 space-y-3">
                    {SEGMENTS.map((segment, idx) => (
                        <LiquidItem key={segment.id} delay={idx * 0.1}>
                            <div className="p-4 bg-white/40 border border-white/50 rounded-2xl hover:bg-white/80 transition-all cursor-pointer group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-current opacity-80", segment.color)}>
                                            <segment.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-800 dark:text-white text-sm uppercase">{segment.name}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{segment.description}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-semibold text-slate-800 dark:text-white">{segment.count}</div>
                                        <Badge variant="outline" className="h-4 text-[10px] font-semibold border-slate-200">
                                            {segment.trend}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Micro engagement progress */}
                                <div className="mt-3 flex items-center justify-between">
                                    <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden mr-3">
                                        <div
                                            className={cn("h-full rounded-full", segment.color.split(' ')[0])}
                                            style={{ width: `${(segment.count / 216) * 100}%` }}
                                        />
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hover:bg-white">
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                                    </Button>
                                </div>
                            </div>
                        </LiquidItem>
                    ))}
                </div>

                {/* Global Action */}
                <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-2xl font-semibold uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                    Sync Marketing Agent
                    <MessageSquare className="w-4 h-4 fill-white" />
                </Button>
            </div>
        </LiquidLayout>
    );
}
