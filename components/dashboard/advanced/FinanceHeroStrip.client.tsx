'use client';

import { DomainMetricCard } from '@/app/business/[category]/components/islands/DomainMetricCard.client';
import type { FinanceHeroMetric } from '@/lib/dashboard/buildFinanceHeroMetrics';

interface FinanceHeroStripProps {
    metrics: FinanceHeroMetric[];
    onNavigate?: (actionId: string) => void;
    isLoading?: boolean;
}

export function FinanceHeroStrip({ metrics, onNavigate, isLoading = false }: FinanceHeroStripProps) {
    if (!metrics.length && !isLoading) return null;

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[1, 2, 3].map((i) => (
                    <DomainMetricCard
                        key={i}
                        label="Loading..."
                        value=""
                        icon={() => null}
                        isLoading={true}
                        theme={i === 1 ? 'emerald' : i === 2 ? 'cyan' : 'amber'}
                    />
                ))}
            </div>
        );
    }

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
