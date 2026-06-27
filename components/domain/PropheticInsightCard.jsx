'use client';

import { useState, useEffect } from 'react';
import { BrainCircuit, Sparkles, TrendingUp, AlertCircle, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getDomainIndustryInsightsAction } from '@/lib/actions/premium/ai/analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function PropheticInsightCard({ businessId, category }) {
    const [insight, setInsight] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsight = async () => {
            if (!businessId) {
              setLoading(false);
              return;
            }
            try {
                const result = await getDomainIndustryInsightsAction(businessId);
                if (result.success) {
                    setInsight(result.data);
                }
            } catch (err) {
                console.error('Failed to fetch domain insights:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchInsight();
    }, [businessId]);

    if (loading) {
        return (
            <Card className="border-brand-100/50 bg-brand-50/10 overflow-hidden">
                <CardContent className="p-6 space-y-4">
                    <div className="flex gap-4">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!insight) return null;

    const isHighPriority = insight.priority === 'high';

    return (
        <div className="relative group">
            <div className={cn(
                "absolute -inset-0.5 rounded-3xl blur opacity-20 transition duration-1000 group-hover:duration-200",
                isHighPriority ? "bg-gradient-to-r from-orange-400 to-red-600" : "bg-brand-primary"
            )}></div>
            <Card className="relative border-none bg-white rounded-3xl overflow-hidden shadow-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className={cn(
                            "flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg",
                            isHighPriority ? "bg-orange-500 text-white" : "bg-brand-primary text-white"
                        )}>
                            {isHighPriority ? <Sparkles className="w-8 h-8" /> : <BrainCircuit className="w-8 h-8" />}
                        </div>
                        
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <h4 className="text-lg font-semibold text-gray-900 tracking-tight flex items-center gap-2">
                                        Prophetic AI Insight
                                        {isHighPriority && <Badge className="bg-orange-100 text-orange-600 border-orange-200 text-[10px] uppercase font-semibold">Urgent</Badge>}
                                    </h4>
                                    <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">{insight.current_status}</p>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
                                    <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Demand Scored: {Math.round(insight.sector_metrics.demand_volatility * 100)}%</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 text-sm italic text-gray-700 leading-relaxed relative">
                                <span className="absolute -top-2 -left-1 text-4xl text-gray-200 font-serif opacity-50">"</span>
                                {insight.insight}
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div className="text-[11px] font-bold text-gray-600">
                                        Suggested Action: <span className="text-brand-primary">{insight.suggested_action}</span>
                                    </div>
                                </div>
                                <Button size="sm" className="bg-gray-900 text-white hover:bg-black rounded-xl text-[10px] font-semibold uppercase px-6 h-9 group">
                                    Apply Strategy
                                    <ArrowUpRight className="ml-1 w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
