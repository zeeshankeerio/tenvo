'use client';

import { memo } from 'react';
import { Portlet } from '@/components/ui/portlet';
import { Clock, Package, ShoppingCart, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RemindersData {
    lowStock?: number;
    overdueInvoices?: number;
    pendingOrders?: number;
}

interface RemindersPortletProps {
    data?: RemindersData;
    isLoading?: boolean;
    /** Receives reminder id: low-stock | overdue | pending-orders */
    onItemClick?: (reminderId: string) => void;
}

export const RemindersPortlet = memo(function RemindersPortlet({
    data = {},
    isLoading = false,
    onItemClick
}: RemindersPortletProps) {
    const reminders = [
        {
            id: 'low-stock',
            label: 'Items to Reorder',
            count: data.lowStock || 0,
            actionTab: 'inventory',
            icon: Package,
            color: 'text-wine',
            bgColor: 'bg-wine/10',
            priority: 'high'
        },
        {
            id: 'overdue',
            label: 'Overdue Invoices',
            count: data.overdueInvoices || 0,
            actionTab: 'invoices',
            icon: Clock,
            color: 'text-slate-700',
            bgColor: 'bg-slate-100',
            priority: 'medium'
        },
        {
            id: 'pending-orders',
            label: 'Pending Orders',
            count: data.pendingOrders || 0,
            /** Matches invoice `pending` / `processing` counts from the dashboard, not purchase orders. */
            actionTab: 'invoices',
            icon: ShoppingCart,
            color: 'text-emerald-700',
            bgColor: 'bg-emerald-50',
            priority: 'low'
        }
    ];

    return (
        <Portlet
            title="Reminders"
            description="Operational alerts & tasks"
            isLoading={isLoading}
        >
            <div className="space-y-1.5">
                {reminders.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => onItemClick?.(item.id)}
                        className="flex items-center justify-between p-2 rounded-lg border border-transparent hover:border-gray-100 hover:bg-gray-50/50 transition-all cursor-pointer group"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className={cn("p-1.5 rounded-md", item.bgColor)}>
                                <item.icon className={cn("w-3.5 h-3.5", item.color)} />
                            </div>
                            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-tight">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className={cn(
                                "text-sm font-semibold transition-transform group-hover:scale-110",
                                item.count > 0 ? item.color : "text-gray-300"
                            )}>
                                {item.count}
                            </span>
                            <ArrowRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </div>
                    </div>
                ))}
            </div>
        </Portlet>
    );
});
