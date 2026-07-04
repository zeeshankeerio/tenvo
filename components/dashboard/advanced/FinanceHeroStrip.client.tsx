'use client';

import { DomainMetricCard } from '@/app/business/[category]/components/islands/DomainMetricCard.client';
import type { FinanceHeroMetric } from '@/lib/dashboard/buildFinanceHeroMetrics';

interface FinanceHeroStripProps {
    metrics: FinanceHeroMetric[];
    onNavigate?: (actionId: string) => void;
}

export function FinanceHeroStrip({ metrics, onNavigate }: FinanceHeroStripProps) {
    if (!metrics.length) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {metrics.map((item) => (
                <DomainMetricCard
                    key={item.id}
                    label={item.label}
                    value={item.value}
                    subValue={item.subValue}
                    icon={item.icon}
                    theme={item.theme}
                    actionId={item.actionId}
                    onNavigate={onNavigate}
                    className="h-full"
                />
            ))}
        </div>
    );
}
