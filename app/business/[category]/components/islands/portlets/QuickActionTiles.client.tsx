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
    /**
     * `toolbar` — single compact row, no heading (advanced dashboard strip under header).
     * `portlet` — legacy card with “Quick Shortcuts” title.
     */
    layout?: 'toolbar' | 'portlet';
}

const accentBorder: Record<string, string> = {
    'new-invoice': 'border-l-slate-700',
    'warehouses': 'border-l-amber-600',
    'add-purchase': 'border-l-amber-600',
    inventory: 'border-l-emerald-600',
    'new-customer': 'border-l-sky-600',
    'new-product': 'border-l-[#e34242]',
    campaigns: 'border-l-slate-600',
    reports: 'border-l-slate-600',
};

const iconTint: Record<string, string> = {
    'new-invoice': 'text-slate-700 bg-slate-100',
    'warehouses': 'text-amber-700 bg-amber-50',
    'add-purchase': 'text-amber-700 bg-amber-50',
    inventory: 'text-emerald-700 bg-emerald-50',
    'new-customer': 'text-sky-700 bg-sky-50',
    'new-product': 'text-[#b91c1c] bg-red-50',
    campaigns: 'text-slate-700 bg-slate-100',
    reports: 'text-slate-700 bg-slate-100',
};

export const QuickActionTiles = memo(function QuickActionTiles({
    onAction,
    campaignEnabled = false,
    multiLocationEnabled = false,
    layout = 'portlet'
}: QuickActionTilesProps) {
    const transferAction = multiLocationEnabled ? 'warehouses' : 'add-purchase';

    const actions = [
        { id: 'new-invoice', label: 'New Invoice', icon: FilePlus, desc: 'Direct Sale' },
        { id: transferAction, label: 'Stock Transfer', icon: ArrowLeftRight, desc: multiLocationEnabled ? 'Inter-branch' : 'Procurement' },
        { id: 'inventory', label: 'Inventory Adj', icon: Truck, desc: 'Stock Corrections' },
        { id: 'new-customer', label: 'Customers', icon: Users, desc: 'CRM Manage' },
        { id: 'new-product', label: 'New Product', icon: PlusCircle, desc: 'Entry & Catalog' },
        campaignEnabled
            ? { id: 'campaigns', label: 'Campaigns', icon: Megaphone, desc: 'Marketing Ops' }
            : { id: 'reports', label: 'Analytics', icon: Settings2, desc: 'System Insights' },
    ].filter((action, index, arr) => arr.findIndex((candidate) => candidate.id === action.id) === index);

    if (layout === 'toolbar') {
        return (
            <nav
                className="rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 shadow-sm"
                aria-label="Workspace shortcuts"
            >
                <ul className="mb-0 flex list-none gap-1.5 overflow-x-auto pb-0.5 pl-0 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-6 sm:gap-1.5 sm:overflow-visible sm:pb-0 md:gap-2 [&::-webkit-scrollbar]:hidden">
                    {actions.map((action) => (
                        <li key={action.id} className="min-w-[5.75rem] shrink-0 sm:min-w-0">
                            <button
                                type="button"
                                onClick={() => onAction?.(action.id)}
                                className={cn(
                                    'flex h-full w-full min-w-0 flex-col gap-0.5 rounded-md border border-slate-200 bg-white p-1.5 text-left shadow-sm transition-all sm:flex-row sm:items-center sm:gap-1.5 sm:p-2',
                                    'border-l-[3px] hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25',
                                    accentBorder[action.id] || 'border-l-slate-400'
                                )}
                            >
                                <div
                                    className={cn(
                                        'flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-100 sm:h-8 sm:w-8',
                                        iconTint[action.id] || 'text-slate-600 bg-slate-50'
                                    )}
                                >
                                    <action.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="block text-[8px] font-black uppercase leading-tight tracking-wide text-slate-800 sm:text-[9px]">
                                        {action.label}
                                    </span>
                                    <span className="mt-0.5 block text-[8px] font-semibold leading-snug text-slate-500 line-clamp-2 sm:text-[9px]">
                                        {action.desc}
                                    </span>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        );
    }

    return (
        <Portlet title="Quick Shortcuts" compact>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        type="button"
                        onClick={() => onAction?.(action.id)}
                        className={cn(
                            'group relative flex flex-row items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition-all',
                            'hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25',
                            'border-l-[3px]',
                            accentBorder[action.id] || 'border-l-slate-400'
                        )}
                    >
                        <div
                            className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-100',
                                iconTint[action.id] || 'text-slate-600 bg-slate-50'
                            )}
                        >
                            <action.icon className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <span className="block text-[11px] font-black uppercase tracking-wide text-slate-800">{action.label}</span>
                            <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">{action.desc}</span>
                        </div>
                    </button>
                ))}
            </div>
        </Portlet>
    );
});
