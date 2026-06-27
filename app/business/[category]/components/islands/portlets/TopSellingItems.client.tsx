'use client';

import { memo, useMemo } from 'react';
import { CHART_PALETTE } from '@/lib/theme/brandTokens';
import { Portlet } from '@/components/ui/portlet';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp } from 'lucide-react';

interface ProductSalesItem {
    name: string;
    value: number;
    sku?: string;
}

interface TopSellingItemsProps {
    data?: ProductSalesItem[];
    isLoading?: boolean;
}

const COLORS = CHART_PALETTE;

export const TopSellingItems = memo(function TopSellingItems({
    data = [],
    isLoading = false
}: TopSellingItemsProps) {

    // Sort and take top 5 for the chart to keep it clean, others grouped?
    // For now just taking top 5
    const chartData = useMemo(() => {
        return [...data].sort((a, b) => b.value - a.value).slice(0, 5);
    }, [data]);

    const totalUnits = useMemo(() => {
        return chartData.reduce((sum, item) => sum + item.value, 0);
    }, [chartData]);

    return (
        <Portlet
            title="Top Items By Qty Sold"
            headerActions={
                <Select defaultValue="this-month">
                    <SelectTrigger className="h-6 w-[100px] text-[10px] bg-gray-50 border-gray-200">
                        <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="this-month">This Month</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="this-quarter">This Quarter</SelectItem>
                    </SelectContent>
                </Select>
            }
            isLoading={isLoading}
            className="h-full"
        >
            <div className="h-[280px] w-full mt-6 relative">
                {/* Center KPI */}
                <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none pb-6">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em]">Total Units</span>
                    <span className="text-2xl font-semibold text-slate-900 leading-none mt-1">
                        {totalUnits.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-500 uppercase">
                        <TrendingUp className="w-2.5 h-2.5" />
                        <span>Top 5 Items</span>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="45%"
                            innerRadius={75}
                            outerRadius={100}
                            paddingAngle={4}
                            dataKey="value"
                            isAnimationActive={true}
                        >
                            {chartData.map((_entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    stroke="rgba(255,255,255,0.2)"
                                    strokeWidth={1}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                borderRadius: '12px',
                                border: '1px solid #f1f5f9',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                padding: '8px 12px'
                            }}
                            itemStyle={{ color: '#1e293b' }}
                            formatter={(value: number) => [`${value.toLocaleString()} Units`, 'Volume']}
                        />
                        <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            iconSize={6}
                            formatter={(value: string) => (
                                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">
                                    {value.length > 12 ? `${value.substring(0, 12)}...` : value}
                                </span>
                            )}
                            wrapperStyle={{
                                paddingTop: '20px',
                                paddingBottom: '10px'
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            {data.length === 0 && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                    <p className="text-xs text-gray-400 italic">No sales data available.</p>
                </div>
            )}
        </Portlet>
    );
});
