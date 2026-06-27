'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckSquare, XCircle, Clock, AlertTriangle, CheckCircle2,
    FileText, DollarSign, RotateCcw, ShoppingCart, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TYPE_CONFIG = {
    expense: { icon: DollarSign, color: 'bg-red-100 text-red-600', label: 'Expense' },
    purchase: { icon: ShoppingCart, color: 'bg-blue-100 text-blue-600', label: 'Purchase' },
    refund: { icon: RotateCcw, color: 'bg-amber-100 text-amber-600', label: 'Refund' },
    credit_note: { icon: FileText, color: 'bg-wine-100 text-wine-600', label: 'Credit Note' },
    journal_entry: { icon: FileText, color: 'bg-emerald-100 text-emerald-600', label: 'Journal Entry' },
};

const STATUS_BADGE = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

export function ApprovalInbox({
    pendingRequests = [],
    historyRequests = [],
    onApprove,
    onReject,
    currency = 'Rs.'
}) {
    return (
        <div className="space-y-6">
            {/* Pending Approvals */}
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <CardTitle className="text-sm font-bold">Pending Approvals</CardTitle>
                        <Badge className="bg-amber-100 text-amber-700 text-[10px]">{pendingRequests.length}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <AnimatePresence>
                        {pendingRequests.map((req) => {
                            const typeConfig = TYPE_CONFIG[req.request_type] || TYPE_CONFIG.expense;
                            const Icon = typeConfig.icon;
                            return (
                                <motion.div
                                    key={req.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                                >
                                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', typeConfig.color)}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900">{typeConfig.label}</p>
                                        <p className="text-[10px] text-gray-400 truncate">
                                            {req.description || 'No description'} by {req.requester_name || 'Unknown'}
                                        </p>
                                    </div>
                                    {req.amount && (
                                        <span className="text-sm font-bold text-gray-900">{currency}{parseFloat(req.amount).toLocaleString()}</span>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            size="sm"
                                            className="h-7 px-3 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                                            onClick={() => onApprove?.(req.id)}
                                        >
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-3 text-[10px] font-bold text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
                                            onClick={() => onReject?.(req.id)}
                                        >
                                            <XCircle className="w-3 h-3 mr-1" /> Reject
                                        </Button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    {pendingRequests.length === 0 && (
                        <div className="py-12 text-center text-gray-400">
                            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">All caught up! ðŸŽ‰</p>
                            <p className="text-xs text-gray-300 mt-1">No pending approvals</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* History */}
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold">Approval History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-gray-50">
                        {historyRequests.slice(0, 20).map((req) => {
                            const typeConfig = TYPE_CONFIG[req.request_type] || TYPE_CONFIG.expense;
                            const Icon = typeConfig.icon;
                            return (
                                <div key={req.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', typeConfig.color)}>
                                        <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-700 truncate">{req.description || typeConfig.label}</p>
                                        <p className="text-[10px] text-gray-400">{req.requester_name} {new Date(req.requested_at).toLocaleDateString()}</p>
                                    </div>
                                    {req.amount && (
                                        <span className="text-xs font-bold text-gray-600">{currency}{parseFloat(req.amount).toLocaleString()}</span>
                                    )}
                                    <Badge className={cn('text-[10px] border', STATUS_BADGE[req.status])}>
                                        {req.status}
                                    </Badge>
                                </div>
                            );
                        })}
                        {historyRequests.length === 0 && (
                            <div className="py-8 text-center text-gray-400">
                                <p className="text-xs">No history</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

