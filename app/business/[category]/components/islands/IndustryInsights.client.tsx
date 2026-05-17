'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp, Calendar, Clock } from 'lucide-react';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { Badge } from '@/components/ui/badge';

interface IndustryInsightsProps {
    category: string;
}

export function IndustryInsights({ category }: IndustryInsightsProps) {
    const knowledge = getDomainKnowledge(category) as any;
    const intelligence = knowledge?.intelligence || {};

    if (!intelligence || Object.keys(intelligence).length === 0) {
        return null;
    }

    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const isPeakMonth = intelligence.peakMonths?.includes(currentMonth);

    return (
        <Card className="backdrop-blur-sm bg-primary/5 border-primary/10 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-primary/5 border-b border-primary/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-primary/10">
                            <Lightbulb className="w-4 h-4 text-primary" />
                        </div>
                        <CardTitle className="text-base font-bold tracking-tight">Intelligence</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-white/50">
                        {knowledge.icon && <span className="mr-1">{knowledge.icon}</span>}
                        {knowledge.name || 'EXPERT'}
                    </Badge>
                </div>
                <CardDescription className="text-xs pt-1">
                    Contextual insights for {knowledge.name || category}.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
                {/* Seasonality Insight */}
                {intelligence.seasonality && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/40 border border-white/60 hover:bg-white/60 transition-colors group">
                        <div className="p-2 rounded-lg bg-brand-50 group-hover:bg-brand-100 transition-colors">
                            <Calendar className="w-4 h-4 text-brand-primary" />
                        </div>
                        <div>
                            <p className="font-bold text-xs uppercase tracking-wide text-brand-primary-dark">Seasonality: {intelligence.seasonality}</p>
                            <p className="text-[11px] leading-relaxed text-muted-foreground mt-0.5">
                                {isPeakMonth
                                    ? `[WARNING] Peak period (${currentMonth}). Recommended: 20% safety stock buffer.`
                                    : `Next peak: ${intelligence.peakMonths?.[0] || 'N/A'}. Plan procurement cycle 4 weeks out.`}
                            </p>
                        </div>
                    </div>
                )}

                {/* Perishability / Obsolescence Insight */}
                {intelligence.perishability && intelligence.perishability !== 'low' && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/40 border border-white/60 hover:bg-white/60 transition-colors group">
                        <div className="p-2 rounded-lg bg-orange-50 group-hover:bg-orange-100 transition-colors">
                            <Clock className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                            <p className="font-bold text-xs uppercase tracking-wide text-orange-900">Stock Sensitivity</p>
                            <p className="text-[11px] leading-relaxed text-muted-foreground mt-0.5">
                                {intelligence.perishability.toUpperCase()} sensitivity.
                                {intelligence.shelfLife && ` Lifecycle: ${intelligence.shelfLife} days. Use FEFO scheduling.`}
                            </p>
                        </div>
                    </div>
                )}

                {/* Demand Volatility Insight */}
                {intelligence.demandVolatility > 0.6 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/40 border border-white/60 hover:bg-white/60 transition-colors group">
                        <div className="p-2 rounded-lg bg-brand-50 group-hover:bg-brand-100 transition-colors">
                            <TrendingUp className="w-4 h-4 text-brand-primary" />
                        </div>
                        <div>
                            <p className="font-bold text-xs uppercase tracking-wide text-brand-primary-dark">Market Volatility</p>
                            <p className="text-[11px] leading-relaxed text-muted-foreground mt-0.5">
                                Dynamic demand patterns detected. We recommend a 2.5x lead-time safety multiplier.
                            </p>
                        </div>
                    </div>
                )}

                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-lg bg-white/20 border border-white/40 text-center">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Min Order Qty</span>
                        <span className="text-sm font-black text-primary">{intelligence.minOrderQuantity || 'N/A'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/20 border border-white/40 text-center">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Avg Lead Time</span>
                        <span className="text-sm font-black text-primary">{intelligence.leadTime || 'N/A'} days</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
