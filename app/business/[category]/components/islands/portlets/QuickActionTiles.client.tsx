'use client';

import { memo } from 'react';
import { Portlet } from '@/components/ui/portlet';
import {
    PlusCircle,
    FilePlus,
    ArrowLeftRight,
    Truck,
    Users,
    Settings2,
    Megaphone
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionTilesProps {
    onAction?: (actionId: string) => void;
    campaignEnabled?: boolean;
    multiLocationEnabled?: boolean;
}

export const QuickActionTiles = memo(function QuickActionTiles({
    onAction,
    campaignEnabled = false,
    multiLocationEnabled = false
}: QuickActionTilesProps) {
    const transferAction = multiLocationEnabled ? 'warehouses' : 'add-purchase';

    const actions = [
        { id: 'new-invoice', label: 'New Invoice', icon: FilePlus, color: 'bg-[#334155]', hover: 'hover:bg-[#1e293b]', desc: 'Direct Sale' },
        { id: transferAction, label: 'Stock Transfer', icon: ArrowLeftRight, color: 'bg-[#d97706] text-white', hover: 'hover:bg-[#b45309]', desc: multiLocationEnabled ? 'Inter-branch' : 'Procurement' },
        { id: 'inventory', label: 'Inventory Adj', icon: Truck, color: 'bg-[#15803d]', hover: 'hover:bg-[#166534]', desc: 'Stock Corrections' },
        { id: 'new-customer', label: 'Customers', icon: Users, color: 'bg-[#0369a1]', hover: 'hover:bg-[#075985]', desc: 'CRM Manage' },
        { id: 'new-product', label: 'New Product', icon: PlusCircle, color: 'bg-[#e34242] text-white', hover: 'hover:bg-[#b91c1c]', desc: 'Entry & Catalog' },
        campaignEnabled
            ? { id: 'campaigns', label: 'Campaigns', icon: Megaphone, color: 'bg-[#475569]', hover: 'hover:bg-[#334155]', desc: 'Marketing Ops' }
            : { id: 'reports', label: 'Analytics', icon: Settings2, color: 'bg-[#475569]', hover: 'hover:bg-[#334155]', desc: 'System Insights' },
    ].filter((action, index, arr) => arr.findIndex((candidate) => candidate.id === action.id) === index);

    return (
        <Portlet title="Quick Shortcuts" compact>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        onClick={() => onAction?.(action.id)}
                        className={cn(
                            "group relative flex flex-col items-center justify-center p-4 rounded-xl text-white transition-all duration-300 shadow-sm border border-white/10",
                            action.color,
                            action.hover
                        )}
                    >
                        <div className="p-2 rounded-full bg-white/10 mb-2 group-hover:scale-110 transition-transform">
                            <action.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider">{action.label}</span>
                        <span className="text-[8px] opacity-60 font-medium uppercase mt-0.5">{action.desc}</span>

                        {/* Glass overlay effect on hover */}
                        <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/5 transition-colors pointer-events-none" />
                    </button>
                ))}
            </div>
        </Portlet>
    );
});
