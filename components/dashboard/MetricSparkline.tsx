'use client';

import { cn } from '@/lib/utils';

interface MetricSparklineProps {
    values: number[];
    className?: string;
    strokeClassName?: string;
    /** When true, a rising line reads as positive (emerald). */
    positiveDirection?: 'up' | 'down';
}

/**
 * Lightweight SVG sparkline for KPI cards — no chart library dependency.
 */
export function MetricSparkline({
    values,
    className,
    strokeClassName = 'stroke-emerald-500',
    positiveDirection = 'up',
}: MetricSparklineProps) {
    const series = values.filter((v) => Number.isFinite(v));
    if (series.length < 2) return null;

    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const width = 72;
    const height = 28;
    const padding = 2;

    const points = series.map((value, index) => {
        const x = padding + (index / (series.length - 1)) * (width - padding * 2);
        const y = height - padding - ((value - min) / range) * (height - padding * 2);
        return `${x},${y}`;
    });

    const trendUp = series[series.length - 1] >= series[0];
    const isPositive = positiveDirection === 'up' ? trendUp : !trendUp;
    const tone = isPositive ? 'stroke-emerald-500' : 'stroke-rose-400';

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className={cn('h-7 w-[4.5rem] shrink-0 opacity-80', className)}
            aria-hidden
        >
            <polyline
                fill="none"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points.join(' ')}
                className={strokeClassName || tone}
            />
        </svg>
    );
}
