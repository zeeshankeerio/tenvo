'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, FileSpreadsheet, PieChart, Landmark, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickReportsProps {
    onNavigate: (tab: string) => void;
}

export function QuickReports({ onNavigate }: QuickReportsProps) {
    const reports = [
        { id: 'balance', label: 'Trial Balance', icon: Landmark, color: 'text-brand-primary', bg: 'bg-brand-50' },
        { id: 'pl', label: 'P&L Statement', icon: PieChart, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { id: 'ledger', label: 'General Ledger', icon: FileSpreadsheet, color: 'text-brand-primary-dark', bg: 'bg-brand-50' },
    ];

    return (
        <Card className="backdrop-blur-sm bg-white/60 border-primary/10 shadow-sm overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Quick Reports
                </CardTitle>
                <CardDescription className="text-xs">One-click financial auditing</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
                {reports.map((report) => (
                    <button
                        key={report.id}
                        onClick={() => onNavigate('reports')}
                        className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 hover:border-primary/20 hover:shadow-md transition-all group group"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${report.bg} ${report.color} group-hover:scale-110 transition-transform`}>
                                <report.icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-gray-700">{report.label}</span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-primary transition-colors" />
                    </button>
                ))}
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 hover:text-primary transition-colors"
                    onClick={() => onNavigate('reports')}
                >
                    Explore All Reports
                </Button>
            </CardContent>
        </Card>
    );
}
