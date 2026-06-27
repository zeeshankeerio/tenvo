'use client';

import { useState, memo, useEffect, useCallback } from 'react';
import { Portlet } from '@/components/ui/portlet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, History, Play, CheckCircle2, Brain } from 'lucide-react';
import { processAiFuzzyRuleAction } from '@/lib/actions/premium/ai/ai';
import toast from 'react-hot-toast';

interface HistoryItem {
    id: number;
    type: string;
    msg: string;
    status: 'success' | 'failed';
    time: string;
}

interface WorkflowOrchestratorProps {
    businessId?: string;
}

export const WorkflowOrchestrator = memo(function WorkflowOrchestrator({ businessId }: WorkflowOrchestratorProps) {
    const [ruleText, setRuleText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // Mock history for now (will be wired to workflow_history)
    useEffect(() => {
        setHistory([
            { id: 1, type: 'execution', msg: 'Low Stock Alert for iPhone 15', status: 'success', time: '10m ago' },
            { id: 2, type: 'execution', msg: 'Order auto-generated for Vendor X', status: 'success', time: '1h ago' },
        ]);
    }, []);

    const handleAddRule = useCallback(async () => {
        if (!ruleText.trim() || !businessId) return;
        setIsProcessing(true);
        try {
            // Context would normally include current inventory levels for AI to process
            const result = await processAiFuzzyRuleAction(businessId, ruleText, { stock: 10, productName: "Sample" });
            if (result.success) {
                toast.success("AI Logic processed and saved!");
                setRuleText('');
                // Refresh logic here
            } else {
                toast.error(result.error || "Failed to process rule");
            }
        } catch (e) {
            toast.error("Internal Error");
        } finally {
            setIsProcessing(false);
        }
    }, [ruleText, businessId]);

    return (
        <Portlet
            title="Workflow Orchestrator"
            description="Agentic automation via natural language"
            headerActions={
                <Badge variant="outline" className="text-[10px] border-wine/20 text-wine bg-wine/5 animate-pulse uppercase font-semibold">
                    Live Agent
                </Badge>
            }
        >
            <div className="space-y-4">
                {/* Input Area */}
                <div className="relative group">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-wine/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <Input
                        placeholder="e.g., 'Alert me if stock of electronics falls below 10%'"
                        className="bg-gray-50 border-gray-100 text-sm italic pr-24 h-12 rounded-xl focus-visible:ring-wine/20"
                        value={ruleText}
                        onChange={(e) => setRuleText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                    />
                    <Button
                        size="sm"
                        className="absolute right-1 top-1 bottom-1 bg-wine hover:bg-wine/90 text-white rounded-lg px-3"
                        disabled={isProcessing || !ruleText}
                        onClick={handleAddRule}
                    >
                        {isProcessing ? <Sparkles className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </Button>
                </div>

                {/* Audit Trail / History */}
                <div className="space-y-2">
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <History className="w-3 h-3" />
                        Automation History
                    </h4>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1 thin-scrollbar">
                        {history.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 border border-gray-100/50 text-[11px] group">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                    <span className="font-bold text-gray-700 truncate max-w-[180px]">{item.msg}</span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium group-hover:text-gray-500">{item.time}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 p-3 bg-wine/5 rounded-xl border border-wine/10">
                    <div className="p-1.5 bg-wine text-white rounded-lg">
                        <Brain className="w-4 h-4" />
                    </div>
                    <div className="text-[10px] leading-tight">
                        <p className="font-semibold text-wine">Agentic Mindset Active</p>
                        <p className="font-medium text-wine/60">Monitoring triggers across inventory & sales.</p>
                    </div>
                </div>
            </div>
        </Portlet>
    );
});
