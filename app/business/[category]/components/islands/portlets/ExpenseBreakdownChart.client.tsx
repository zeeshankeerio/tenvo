'use client';

import { memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface ExpenseBreakdownChartProps {
    data?: any[];
}

export const ExpenseBreakdownChart = memo(function ExpenseBreakdownChart({ data = [] }: ExpenseBreakdownChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-[10px] text-slate-400 italic border border-dashed border-slate-200 rounded-xl bg-slate-50">
                No expense data available for this month
            </div>
        );
    }

    // Sort by value desc
    const sortedData = [...data].sort((a, b) => b.value - a.value);

    return (
        <Card className="h-full border-none shadow-none bg-transparent">
            <CardHeader className="px-0 py-2 border-b border-slate-100 mb-2">
                <CardTitle className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <PieChartIcon className="w-3.5 h-3.5" />
                    Expense Breakdown
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[220px] p-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={sortedData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {sortedData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }}
                            formatter={(value) => `PKR ${value.toLocaleString()}`}
                        />
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Label */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pr-14">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Total</div>
                    <div className="text-[12px] font-semibold text-slate-800">
                        {((sortedData.reduce((sum, item) => sum + item.value, 0) / 1000).toFixed(1))}k
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});
