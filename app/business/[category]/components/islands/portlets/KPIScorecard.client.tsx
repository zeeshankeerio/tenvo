'use client';

import { memo } from 'react';
import { Portlet } from '@/components/ui/portlet';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPIItem {
    id: string;
    label: string;
    period: string;
    current: string | number;
    previous: string | number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
    isCurrency?: boolean;
}

interface KPIScorecardProps {
    data?: KPIItem[];
    isLoading?: boolean;
}

export const KPIScorecard = memo(function KPIScorecard({
    data = [],
    isLoading = false
}: KPIScorecardProps) {
    return (
        <Portlet
            title="Key Performance Indicators"
            description="Period-over-period performance metrics"
            isLoading={isLoading}
            className="h-full"
        >
            <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                    <thead>
                        <tr className="border-b border-gray-100 text-left">
                            <th className="pb-2 font-semibold text-gray-400 uppercase tracking-wider pl-2">Indicator</th>
                            <th className="pb-2 font-semibold text-gray-400 uppercase tracking-wider">Period</th>
                            <th className="pb-2 font-semibold text-gray-400 uppercase tracking-wider text-right">Current</th>
                            <th className="pb-2 font-semibold text-gray-400 uppercase tracking-wider text-right">Previous</th>
                            <th className="pb-2 font-semibold text-gray-400 uppercase tracking-wider text-right pr-2">Change</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((item) => (
                            <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="py-2.5 pl-2 font-bold text-gray-700">{item.label}</td>
                                <td className="py-2.5 text-gray-500">{item.period}</td>
                                <td className="py-2.5 text-right font-semibold text-gray-900">
                                    {item.current}
                                </td>
                                <td className="py-2.5 text-right text-gray-500 font-medium">
                                    {item.previous}
                                </td>
                                <td className="py-2.5 text-right pr-2">
                                    <div className={cn(
                                        "flex items-center justify-end gap-1 font-bold",
                                        item.trend === 'up' ? "text-emerald-600" :
                                            item.trend === 'down' ? "text-red-500" : "text-gray-400"
                                    )}>
                                        {item.trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                                        {item.trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                                        {item.trend === 'neutral' && <Minus className="w-3 h-3" />}
                                        {item.change > 0 ? '+' : ''}{item.change}%
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                                    No KPI data available for this period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Portlet>
    );
});
