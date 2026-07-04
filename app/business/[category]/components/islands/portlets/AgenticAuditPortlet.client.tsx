'use client';

import { useState, memo } from 'react';
import { Portlet } from '@/components/ui/portlet';
import { ShieldAlert, AlertTriangle, CheckCircle2, ShieldCheck, RefreshCw, Eye } from 'lucide-react';
import { runSystemAuditAction } from '@/lib/actions/premium/ai/agentic';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AuditResult {
    stock: {
        success: boolean;
        anomalies: any[];
        summary: string;
    };
    financial: {
        success: boolean;
        anomalies: any[];
    };
    timestamp: string;
}

export const AgenticAuditPortlet = memo(function AgenticAuditPortlet({
    businessId,
    compact = false,
}: {
    businessId?: string;
    compact?: boolean;
}) {
    const [result, setResult] = useState<AuditResult | null>(null);
    const [scanning, setScanning] = useState(false);

    const runAudit = async () => {
        if (!businessId) return;
        setScanning(true);
        const res = await runSystemAuditAction(businessId);
        if (res.success) {
            setResult(res as unknown as AuditResult);
        }
        setScanning(false);
    };

    const totalAnomalies = (result?.stock?.anomalies?.length || 0) + (result?.financial?.anomalies?.length || 0);

    return (
        <Portlet
            title="Agentic Integrity Audit"
            description="AI-powered anomaly detection"
            isLoading={scanning}
            headerActions={
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={runAudit}
                    disabled={scanning || !businessId}
                >
                    <RefreshCw className={cn("w-3.5 h-3.5 text-gray-400", scanning && "animate-spin")} />
                </Button>
            }
        >
            {!result && !scanning && (
                <div className={cn(
                    'flex flex-col items-center justify-center text-center',
                    compact ? 'py-4 px-2' : 'py-8 px-4'
                )}>
                    <ShieldCheck className={cn('text-gray-100 mb-3', compact ? 'w-8 h-8' : 'w-10 h-10')} />
                    <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-tighter">
                        {businessId ? 'System Integrity Scan Ready' : 'Select a workspace to run audit'}
                    </p>
                    <Button 
                        size="sm" 
                        onClick={runAudit}
                        disabled={!businessId}
                        className="bg-gray-900 text-white hover:bg-black font-semibold text-[10px] uppercase tracking-widest h-8 px-5 rounded-full disabled:opacity-50"
                    >
                        Run Deep Audit
                    </Button>
                </div>
            )}

            {result && (
                <div className="space-y-4">
                    <div className={cn(
                        "p-3 rounded-xl border flex items-center justify-between",
                        totalAnomalies > 0 ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100"
                    )}>
                        <div className="flex items-center gap-3">
                            {totalAnomalies > 0 ? (
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            )}
                            <div>
                                <p className="text-[10px] font-semibold uppercase text-gray-900 leading-none">
                                    {totalAnomalies > 0 ? `${totalAnomalies} Potential Issues` : 'System Secured'}
                                </p>
                                <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">
                                    Last scan: {new Date(result.timestamp).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {/* Stock Anomalies */}
                        {result.stock?.anomalies?.map((a: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-lg border border-red-50 bg-white flex items-start gap-3">
                                <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-semibold text-gray-900 uppercase truncate">Inventory Anomaly</p>
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-red-100 text-red-600 rounded uppercase">High Risk</span>
                                    </div>
                                    <p className="text-[10px] text-gray-600 mt-1 leading-tight">{a.reason}</p>
                                    <p className="text-[10px] font-bold text-wine mt-2 uppercase tracking-tight flex items-center gap-1">
                                        <Eye className="w-3 h-3" />
                                        Recommended: {a.recommendation}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Financial Anomalies */}
                        {result.financial?.anomalies?.map((a: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-lg border border-amber-50 bg-white flex items-start gap-3">
                                <BadgeDollarSign className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-semibold text-gray-900 uppercase">Financial Divergence</p>
                                    <p className="text-[10px] text-gray-600 mt-1 leading-tight">{a.description}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-500" style={{ width: `${a.riskScore * 100}%` }} />
                                        </div>
                                        <span className="text-[10px] font-semibold text-gray-400">Risk: {(a.riskScore * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {totalAnomalies === 0 && (
                            <div className="text-center py-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No critical anomalies detected in current batch.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Portlet>
    );
});

function BadgeDollarSign(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m3 11 18-5v12L3 14v-3z" />
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
    );
}
