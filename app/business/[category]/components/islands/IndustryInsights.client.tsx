'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp, Calendar, Clock } from 'lucide-react';
import { getDomainKnowledgeForBusiness } from '@/lib/utils/businessRegionalContext';
import { useBusiness } from '@/lib/context/BusinessContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { HUB_MICRO_LABEL, MARKETING_STAT_VALUE } from '@/lib/utils/typography';

interface DomainIntelligence {
    seasonality?: string;
    peakMonths?: string[];
    perishability?: string;
    shelfLife?: number;
    demandVolatility?: number;
    minOrderQuantity?: number;
    leadTime?: number;
}

interface DomainKnowledgeShape {
    name?: string;
    icon?: string;
    intelligence?: DomainIntelligence;
}

interface IndustryInsightsProps {
    category: string;
    /** Regional-aware knowledge from `getDomainKnowledgeForBusiness` when available. */
    domainKnowledge?: Record<string, unknown> | null;
    /** Compact layout for Easy mode dashboard Insights tab */
    variant?: 'default' | 'compact';
}

function InsightRow({
    icon: Icon,
    title,
    body,
    iconClassName,
    titleClassName,
    compact,
}: {
    icon: React.ElementType;
    title: string;
    body: string;
    iconClassName?: string;
    titleClassName?: string;
    compact?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex items-start gap-2.5 rounded-lg border border-neutral-100 bg-neutral-50/60',
                compact ? 'p-2.5' : 'gap-3 rounded-xl bg-white/40 border-white/60 p-3'
            )}
        >
            <div
                className={cn(
                    'shrink-0 rounded-lg p-1.5',
                    compact ? 'bg-white border border-neutral-100' : 'p-2 bg-brand-50',
                    iconClassName
                )}
            >
                <Icon className={cn('h-3.5 w-3.5', compact ? 'text-neutral-600' : 'w-4 h-4 text-brand-primary')} />
            </div>
            <div className="min-w-0">
                <p className={cn('font-semibold uppercase tracking-wide', compact ? 'text-[10px] text-neutral-700' : 'text-xs text-brand-primary-dark', titleClassName)}>
                    {title}
                </p>
                <p className={cn('leading-relaxed text-neutral-600', compact ? 'mt-0.5 text-[11px]' : 'mt-0.5 text-[11px] text-muted-foreground')}>
                    {body}
                </p>
            </div>
        </div>
    );
}

export function IndustryInsights({ category, domainKnowledge, variant = 'default' }: IndustryInsightsProps) {
    const { business } = useBusiness();
    const knowledge = (
        domainKnowledge && typeof domainKnowledge === 'object' && Object.keys(domainKnowledge).length > 0
            ? domainKnowledge
            : getDomainKnowledgeForBusiness(category, business)
    ) as DomainKnowledgeShape;
    const intelligence = knowledge?.intelligence || {};

    if (!intelligence || Object.keys(intelligence).length === 0) {
        return null;
    }

    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const isPeakMonth = intelligence.peakMonths?.includes(currentMonth);
    const compact = variant === 'compact';

    const seasonBody = isPeakMonth
        ? `Peak month (${currentMonth}). Add 15–20% safety stock on top movers before demand spikes.`
        : `Next peak: ${intelligence.peakMonths?.[0] || 'plan ahead'}. Align procurement ${intelligence.leadTime || 14} days ahead.`;

    const perishBody = `${String(intelligence.perishability).toUpperCase()} sensitivity.${
        intelligence.shelfLife ? ` Lifecycle ${intelligence.shelfLife} days — use FEFO scheduling.` : ''
    }`;

    const volatilityBody =
        'Elevated demand swings for this vertical. Widen reorder buffers on A-class SKUs using a 2.5× lead-time multiplier.';

    if (compact) {
        return (
            <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Lightbulb className="h-4 w-4 text-brand-primary" />
                            Vertical intelligence
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] font-semibold">
                            {knowledge.icon ? <span className="mr-1">{String(knowledge.icon)}</span> : null}
                            {knowledge.name || category}
                        </Badge>
                    </div>
                    <CardDescription className="text-xs">Domain playbook signals for {knowledge.name || category}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {intelligence.seasonality ? (
                        <InsightRow compact icon={Calendar} title={`Seasonality · ${intelligence.seasonality}`} body={seasonBody} />
                    ) : null}
                    {intelligence.perishability && intelligence.perishability !== 'low' ? (
                        <InsightRow compact icon={Clock} title="Stock sensitivity" body={perishBody} iconClassName="bg-amber-50" titleClassName="text-amber-900" />
                    ) : null}
                    {intelligence.demandVolatility !== undefined && intelligence.demandVolatility > 0.6 ? (
                        <InsightRow compact icon={TrendingUp} title="Demand volatility" body={volatilityBody} />
                    ) : null}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="rounded-lg border border-neutral-100 bg-neutral-50/80 px-2.5 py-2 text-center">
                            <p className={HUB_MICRO_LABEL}>Min order qty</p>
                            <p className={cn(MARKETING_STAT_VALUE, 'mt-0.5 text-sm')}>{intelligence.minOrderQuantity ?? '—'}</p>
                        </div>
                        <div className="rounded-lg border border-neutral-100 bg-neutral-50/80 px-2.5 py-2 text-center">
                            <p className={HUB_MICRO_LABEL}>Lead time</p>
                            <p className={cn(MARKETING_STAT_VALUE, 'mt-0.5 text-sm')}>{intelligence.leadTime ?? '—'}d</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

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
                    <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-widest bg-white/50">
                        {knowledge.icon ? <span className="mr-1">{String(knowledge.icon)}</span> : null}
                        {knowledge.name || 'EXPERT'}
                    </Badge>
                </div>
                <CardDescription className="text-xs pt-1">
                    Contextual insights for {knowledge.name || category}.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
                {intelligence.seasonality && (
                    <InsightRow icon={Calendar} title={`Seasonality: ${intelligence.seasonality}`} body={seasonBody} />
                )}
                {intelligence.perishability && intelligence.perishability !== 'low' && (
                    <InsightRow
                        icon={Clock}
                        title="Stock Sensitivity"
                        body={perishBody}
                        iconClassName="bg-orange-50"
                        titleClassName="text-orange-900"
                    />
                )}
                {intelligence.demandVolatility !== undefined && intelligence.demandVolatility > 0.6 && (
                    <InsightRow icon={TrendingUp} title="Market Volatility" body={volatilityBody} />
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-lg bg-white/20 border border-white/40 text-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Min Order Qty</span>
                        <span className="text-sm font-semibold text-primary">{intelligence.minOrderQuantity || 'N/A'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/20 border border-white/40 text-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Avg Lead Time</span>
                        <span className="text-sm font-semibold text-primary">{intelligence.leadTime || 'N/A'} days</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
