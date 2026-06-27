'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateBusinessHealth, getHealthStatus } from '@/lib/analytics/health';

interface HealthScoreProps {
    stats: any;
}

export function HealthScore({ stats }: HealthScoreProps) {
    const score = calculateBusinessHealth(stats);
    const status = getHealthStatus(score);

    return (
        <Card className="backdrop-blur-sm bg-white/60 border-primary/10 shadow-sm overflow-hidden h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${status.color}`} />
                    Business Health
                </CardTitle>
                <CardDescription className="text-xs">Proprietary performance index</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-4">
                <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-gray-100"
                        />
                        <motion.circle
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray="364.4"
                            initial={{ strokeDashoffset: 364.4 }}
                            animate={{ strokeDashoffset: 364.4 - (364.4 * score) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={status.color.replace('text-', 'stroke-')}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-semibold text-gray-900">{score}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Index</span>
                    </div>
                </div>

                <div className={`mt-6 w-full text-center p-3 rounded-2xl ${status.bg} border border-transparent`}>
                    <p className={`font-semibold text-sm uppercase tracking-wider ${status.color}`}>{status.label}</p>
                    <p className="text-[10px] text-gray-600 mt-1 leading-relaxed font-medium">
                        {status.description}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
