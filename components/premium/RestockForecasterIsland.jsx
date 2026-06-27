'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    AlertCircle,
    ShoppingCart,
    Zap,
    ArrowRight,
    BrainCircuit,
    PackageCheck,
    Calendar
} from 'lucide-react';
import { LiquidLayout, LiquidItem } from './LiquidLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/currency';
import { getAiRestockSuggestionsAction } from '@/lib/actions/premium/ai/ai';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

/**
 * RestockForecasterIsland
 * Part of the 2026 AI Revenue Engine.
 * Predicts and visualizes restock needs with a premium aesthetic.
 */
export function RestockForecasterIsland({ businessId, currency = 'PKR' }) {
    const [loading, setLoading] = useState(true);
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        async function load() {
            if (!businessId) return;
            setLoading(true);
            try {
                const res = await getAiRestockSuggestionsAction(businessId);
                if (res.success) setSuggestions(res.suggestions);
            } catch (err) {
                console.error("Forecaster load error:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [businessId]);

    if (loading) {
        return (
            <LiquidLayout variant="glass" className="h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500/60 transition-all animate-pulse">Consulting AI Oracle...</span>
                </div>
            </LiquidLayout>
        );
    }

    return (
        <LiquidLayout variant="glass" className="h-full">
            <div className="flex flex-col h-full gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <LiquidItem className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)] rounded-2xl">
                            <BrainCircuit className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold uppercase tracking-tight text-slate-800 dark:text-white">AI Restock Forecaster</h3>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Predictive Supply Chain Integration</p>
                        </div>
                    </LiquidItem>

                    <Badge variant="outline" className="border-indigo-200 bg-indigo-50/50 text-indigo-600 font-semibold h-7">
                        {suggestions.length} OPPORTUNITIES
                    </Badge>
                </div>

                {/* Forecast Content */}
                <div className="flex-1 overflow-auto custom-scrollbar pr-2 -mr-2">
                    {suggestions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                                <PackageCheck className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h4 className="font-bold text-slate-700">Inventory Optimized</h4>
                            <p className="text-sm text-slate-400 max-w-[200px]">AI predicts no critical depletion in the next 30 days.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {suggestions.map((item, idx) => (
                                <LiquidItem key={item.id} delay={idx * 0.1}>
                                    <ForecastCard item={item} currency={currency} />
                                </LiquidItem>
                            ))}
                        </div>
                    )}
                </div>

                {/* Global Action */}
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-2xl font-semibold uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all active:scale-95 group">
                    Process Intelligent Restock
                    <Zap className="w-4 h-4 ml-2 fill-white group-hover:animate-bounce" />
                </Button>
            </div>
        </LiquidLayout>
    );
}

function ForecastCard({ item, currency }) {
    const priorityColors = {
        'High': 'text-red-600 bg-red-50 border-red-100',
        'Medium': 'text-amber-600 bg-amber-50 border-amber-100',
        'Low': 'text-blue-600 bg-blue-50 border-blue-100'
    };

    // Prepare chart data from forecast history/prediction
    const chartData = [
        { name: 'M-2', val: item.forecast.salesHistory?.[0]?.quantity || 10 },
        { name: 'M-1', val: item.forecast.salesHistory?.[1]?.quantity || 15 },
        { name: 'Now', val: item.stock },
        { name: 'P+1', val: item.forecast.forecastedQuantity },
    ];

    return (
        <div className="p-5 bg-white/60 dark:bg-slate-800/60 rounded-[2rem] border border-white dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className="flex gap-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-slate-700 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-slate-600 font-semibold text-indigo-600 dark:text-indigo-400">
                        {item.name.charAt(0)}
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-white uppercase truncate max-w-[150px]">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{item.sku}</span>
                            <Badge className={`h-4 text-[10px] font-semibold uppercase px-1.5 border ${priorityColors[item.priority]}`}>
                                {item.priority} Priority
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xl font-semibold text-slate-900 dark:text-white">{item.stock}</div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-tighter">Current Units</div>
                </div>
            </div>

            {/* Mini Visual Chart */}
            <div className="h-20 w-full mb-4 opacity-70 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id={`grad-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '10px', color: '#fff' }}
                            itemStyle={{ color: '#818cf8' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="val"
                            stroke="#6366f1"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={`url(#grad-${item.id})`}
                            animationDuration={2000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Suggested Reorder</span>
                    <span className="text-sm font-semibold text-indigo-600">+{Math.max(0, Math.ceil(item.forecast.forecastedQuantity - item.stock))} Units</span>
                </div>
                <Button variant="ghost" size="sm" className="h-8 rounded-full px-4 text-xs font-semibold uppercase text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                    Draft PO <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
            </div>
        </div>
    );
}
