'use client';

import { BRAND_PRIMARY } from '@/lib/theme/brandTokens';
import { memo } from 'react';
import { Portlet } from '@/components/ui/portlet';
import {
    ResponsiveContainer,
    RadialBarChart,
    RadialBar
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { HUB_MICRO_LABEL, HUB_STAT_VALUE } from '@/lib/utils/typography';
import { cn } from '@/lib/utils';

interface KPIMeterProps {
    title?: string;
    value?: number;
    target?: number;
    prefix?: string;
    suffix?: string;
    color?: string;
    trendValue?: number;
    trendLabel?: string;
}

export const KPIMeter = memo(function KPIMeter({
    title = "Inventory Health",
    value = 85,
    target = 100,
    prefix = "",
    suffix = "%",
    color = BRAND_PRIMARY,
    trendValue = 0,
    trendLabel = "vs previous period"
}: KPIMeterProps) {
    const safeValue = Math.max(0, Math.min(Number(value) || 0, Number(target) || 100));
    const valueColor = safeValue >= 90 ? '#059669' : safeValue >= 70 ? color : '#B45309';

    const data = [
        { name: 'Value', value: safeValue, fill: valueColor },
        { name: 'Gap', value: Math.max(0, target - safeValue), fill: '#F3F4F6' }
    ];

    return (
        <Portlet title={title}>
            <div className="flex flex-col items-center justify-center">
                <div className="h-[180px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="70%"
                            outerRadius="100%"
                            barSize={12}
                            data={data}
                            startAngle={180}
                            endAngle={0}
                        >
                            <RadialBar
                                dataKey="value"
                                cornerRadius={10}
                            />
                        </RadialBarChart>
                    </ResponsiveContainer>

                    {/* Centered Value */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                        <span className="text-3xl font-semibold text-gray-900 leading-none">
                            {prefix}{safeValue}{suffix}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                            <TrendingUp className={`w-3 h-3 ${trendValue >= 0 ? 'text-emerald-500' : 'text-red-500 rotate-180'}`} />
                            <span className={`text-[10px] font-semibold uppercase tracking-wide ${trendValue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {trendValue >= 0 ? '+' : ''}{trendValue}% {trendLabel}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                    <div className="text-center">
                        <p className={cn(HUB_MICRO_LABEL, 'mb-1 text-neutral-400')}>Current</p>
                        <p className={cn(HUB_STAT_VALUE, 'text-sm text-neutral-800')}>{prefix}{safeValue}{suffix}</p>
                    </div>
                    <div className="text-center">
                        <p className={cn(HUB_MICRO_LABEL, 'mb-1 text-neutral-400')}>Target</p>
                        <p className={cn(HUB_STAT_VALUE, 'text-sm text-neutral-800')}>{prefix}{target}{suffix}</p>
                    </div>
                </div>
            </div>
        </Portlet>
    );
});
