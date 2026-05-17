'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge as UiBadge } from '@/components/ui/badge';
import { formatCurrency, type CurrencyCode } from '@/lib/currency';
import { History, Eye, Printer, Download, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface RecentInvoicesProps {
    invoices: any[];
    currency: CurrencyCode;
    onViewInvoice?: (invoice: any) => void;
}

export function RecentInvoices({ invoices, currency, onViewInvoice }: RecentInvoicesProps) {
    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid':
                return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'pending':
                return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'overdue':
                return 'bg-rose-50 text-rose-700 border-rose-100';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    return (
        <Card className="backdrop-blur-sm bg-white/60 border-primary/10 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        Live Transactions
                    </CardTitle>
                    <CardDescription>Real-time audit of recent sales activity</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-xs font-bold text-primary hover:bg-primary/5">
                    View All
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-gray-50">
                    {invoices.length === 0 ? (
                        <div className="text-center py-12">
                            <History className="w-12 h-12 text-muted-foreground opacity-10 mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground font-medium">No transactions found for this period</p>
                        </div>
                    ) : (
                        invoices.map((invoice, idx) => (
                            <motion.div
                                key={invoice.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center justify-between p-4 hover:bg-gray-50/80 transition-all group cursor-pointer"
                                onClick={() => onViewInvoice?.(invoice)}
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all ring-1 ring-gray-100">
                                        {invoice.invoice_number?.split('-')?.[1]?.substring(0, 4) || 'REF'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-900 truncate">
                                            {invoice.customer_name || 'Walk-in Customer'}
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium mt-0.5">
                                            <span className="uppercase tracking-wider">{invoice.invoice_number}</span>
                                            <span className="text-gray-300">*</span>
                                            <span>{new Date(invoice.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-black text-gray-900">
                                            {formatCurrency(invoice.grand_total || invoice.amount || 0, currency)}
                                        </p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{invoice.payment_method || 'CASH'}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <UiBadge variant="outline" className={`text-[9px] font-black uppercase tracking-tighter px-2 h-5 border rounded-md shadow-none ${getStatusColor(invoice.status)}`}>
                                            {invoice.status || 'PENDING'}
                                        </UiBadge>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-32 rounded-xl p-1 shadow-xl">
                                                <DropdownMenuItem className="rounded-lg gap-2 text-xs font-bold cursor-pointer">
                                                    <Eye className="w-3.5 h-3.5" /> View
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="rounded-lg gap-2 text-xs font-bold cursor-pointer">
                                                    <Printer className="w-3.5 h-3.5" /> Print
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="rounded-lg gap-2 text-xs font-bold cursor-pointer">
                                                    <Download className="w-3.5 h-3.5" /> PDF
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
