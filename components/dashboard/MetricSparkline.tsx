'use client';

import { cn } from '@/lib/utils';

interface MetricSparklineProps {
    values: number[];
    className?: string;
    strokeClassName?: string;
    fillClassName?: string;
    /** When true, a rising line reads as positive (emerald). */
    positiveDirection?: 'up' | 'down';
    /** Render soft gradient fill under the line (AIC-style). */
    filled?: boolean;
}

/**
 * Lightweight SVG sparkline for KPI cards — no chart library dependency.
 */
export function MetricSparkline({
    values,
    className,
    strokeClassName = 'stroke-emerald-500',
    fillClassName = 'fill-emerald-500/20',
    positiveDirection = 'up',
    filled = true,
}: MetricSparklineProps) {
    const series = values.filter((v) => Number.isFinite(v));
    if (series.length < 2) return null;

    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const width = 80;
    const height = 32;
    const padding = 2;

    const coords = series.map((value, index) => {
        const x = padding + (index / (series.length - 1)) * (width - padding * 2);
        const y = height - padding - ((value - min) / range) * (height - padding * 2);
        return { x, y };
    });

    const linePoints = coords.map((p) => `${p.x},${p.y}`).join(' ');
    const baseline = height - padding;
    const areaPath =
        filled && coords.length >= 2
            ? `M ${coords[0].x} ${baseline} ${coords.map((p) => `L ${p.x} ${p.y}`).join(' ')} L ${coords[coords.length - 1].x} ${baseline} Z`
            : '';

    const trendUp = series[series.length - 1] >= series[0];
    const isPositive = positiveDirection === 'up' ? trendUp : !trendUp;
    const defaultStroke = isPositive ? 'stroke-emerald-500' : 'stroke-rose-400';
    const defaultFill = isPositive ? 'fill-emerald-500/20' : 'fill-rose-400/15';

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className={cn('h-8 w-[5rem] shrink-0', className)}
            aria-hidden
        >
            {filled && areaPath ? (
                <path d={areaPath} className={fillClassName || defaultFill} />
            ) : null}
            <polyline
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={linePoints}
                className={strokeClassName || defaultStroke}
            />
        </svg>
    );
}
