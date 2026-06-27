'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Package, FileText, Users, Truck, ShoppingCart, CreditCard,
    Building2, Receipt, BarChart3, Factory, UserCog, CheckSquare,
    Plus, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Icon + illustration map for different module types.
 * Each entry provides a primary icon, accent color, and helpful description.
 */
const MODULE_CONFIG = {
    products: {
        icon: Package, color: 'blue',
        title: 'No products yet',
        description: 'Add your first product to start managing inventory, tracking stock, and generating invoices.',
        actionLabel: 'Add Product',
    },
    invoices: {
        icon: FileText, color: 'emerald',
        title: 'No invoices yet',
        description: 'Create your first invoice to start billing customers and tracking revenue.',
        actionLabel: 'Create Invoice',
    },
    customers: {
        icon: Users, color: 'violet',
        title: 'No customers yet',
        description: 'Add customers to streamline invoicing, track balances, and build loyalty.',
        actionLabel: 'Add Customer',
    },
    vendors: {
        icon: Building2, color: 'amber',
        title: 'No vendors yet',
        description: 'Add vendors to manage procurement, track payables, and create purchase orders.',
        actionLabel: 'Add Vendor',
    },
    purchases: {
        icon: Truck, color: 'orange',
        title: 'No purchase orders',
        description: 'Create purchase orders to track procurement, manage stock, and maintain vendor relationships.',
        actionLabel: 'Create Purchase Order',
    },
    payments: {
        icon: CreditCard, color: 'teal',
        title: 'No payments recorded',
        description: 'Payments will appear here as you receive or make payments against invoices and bills.',
        actionLabel: null,
    },
    expenses: {
        icon: Receipt, color: 'rose',
        title: 'No expenses logged',
        description: 'Start tracking business expenses to maintain accurate financial records and GL entries.',
        actionLabel: 'Log Expense',
    },
    quotations: {
        icon: FileText, color: 'sky',
        title: 'No quotations yet',
        description: 'Create quotations for prospects and convert them to sales orders when approved.',
        actionLabel: 'Create Quotation',
    },
    orders: {
        icon: ShoppingCart, color: 'indigo',
        title: 'No orders yet',
        description: 'Orders will appear here as you convert quotations or create sales orders.',
        actionLabel: null,
    },
    reports: {
        icon: BarChart3, color: 'blue',
        title: 'No data to analyze',
        description: 'Start creating invoices and tracking inventory to unlock powerful analytics and AI insights.',
        actionLabel: null,
    },
    manufacturing: {
        icon: Factory, color: 'gray',
        title: 'No production orders',
        description: 'Set up Bills of Materials (BOM) and create production orders to track manufacturing.',
        actionLabel: 'Create BOM',
    },
    payroll: {
        icon: UserCog, color: 'pink',
        title: 'No employees added',
        description: 'Add employees to run payroll, track attendance, and manage shifts.',
        actionLabel: 'Add Employee',
    },
    approvals: {
        icon: CheckSquare, color: 'cyan',
        title: 'No pending approvals',
        description: 'Approval requests will appear here when team members submit items for review.',
        actionLabel: null,
    },
    generic: {
        icon: Package, color: 'gray',
        title: 'Nothing here yet',
        description: 'Get started by adding data to this module.',
        actionLabel: null,
    },
};

const COLOR_CLASSES = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-500', ring: 'ring-blue-100' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', ring: 'ring-emerald-100' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-500', ring: 'ring-violet-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-500', ring: 'ring-amber-100' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-500', ring: 'ring-orange-100' },
    teal: { bg: 'bg-teal-50', icon: 'text-teal-500', ring: 'ring-teal-100' },
    rose: { bg: 'bg-rose-50', icon: 'text-rose-500', ring: 'ring-rose-100' },
    sky: { bg: 'bg-sky-50', icon: 'text-sky-500', ring: 'ring-sky-100' },
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-500', ring: 'ring-indigo-100' },
    purple: { bg: 'bg-wine-50', icon: 'text-wine-500', ring: 'ring-wine-100' },
    gray: { bg: 'bg-gray-50', icon: 'text-gray-400', ring: 'ring-gray-100' },
    pink: { bg: 'bg-pink-50', icon: 'text-pink-500', ring: 'ring-pink-100' },
    cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-500', ring: 'ring-cyan-100' },
};

/**
 * EmptyState -- Polished empty state illustration for any module.
 *
 * Props:
 *   module       - key from MODULE_CONFIG (e.g., 'products', 'invoices')
 *   title        - override title
 *   description  - override description
 *   actionLabel  - override CTA label (null = no button)
 *   onAction     - callback for CTA button
 *   icon         - override icon component
 *   compact      - smaller variant for inline use
 *   className    - additional classes
 */
export function EmptyState({
    module = 'generic',
    title,
    description,
    actionLabel,
    onAction,
    icon: IconOverride,
    compact = false,
    className,
}) {
    const config = MODULE_CONFIG[module] || MODULE_CONFIG.generic;
    const colors = COLOR_CLASSES[config.color] || COLOR_CLASSES.gray;
    const Icon = IconOverride || config.icon;
    const displayTitle = title || config.title;
    const displayDesc = description || config.description;
    const displayAction = actionLabel !== undefined ? actionLabel : config.actionLabel;

    if (compact) {
        return (
            <div className={cn('flex flex-col items-center py-8 text-center', className)}>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center ring-2', colors.bg, colors.ring)}>
                    <Icon className={cn('w-5 h-5', colors.icon)} />
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-600">{displayTitle}</p>
                <p className="mt-1 text-xs text-gray-400 max-w-[240px]">{displayDesc}</p>
                {displayAction && onAction && (
                    <Button size="sm" variant="outline" className="mt-3 h-8 text-xs" onClick={onAction}>
                        <Plus className="w-3 h-3 mr-1" />
                        {displayAction}
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col items-center py-16 px-6 text-center', className)}>
            {/* Decorative rings */}
            <div className="relative">
                <div className={cn(
                    'absolute inset-0 rounded-full scale-150 opacity-30 blur-xl',
                    colors.bg
                )} />
                <div className={cn(
                    'relative w-20 h-20 rounded-2xl flex items-center justify-center ring-4 shadow-sm',
                    colors.bg, colors.ring
                )}>
                    <Icon className={cn('w-9 h-9', colors.icon)} />
                </div>
            </div>

            <h3 className="mt-6 text-xl font-semibold text-gray-900">{displayTitle}</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md leading-relaxed">{displayDesc}</p>

            {displayAction && onAction && (
                <Button className="mt-6 gap-2 font-bold" onClick={onAction}>
                    <Plus className="w-4 h-4" />
                    {displayAction}
                    <ArrowRight className="w-4 h-4" />
                </Button>
            )}

            {/* Subtle pattern dots */}
            <div className="mt-8 flex gap-1.5">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            i === 2 ? colors.icon : 'bg-gray-200'
                        )}
                        style={i === 2 ? { opacity: 0.5 } : {}}
                    />
                ))}
            </div>
        </div>
    );
}
