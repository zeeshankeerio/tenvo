'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from '@/components/ui/command';
import {
    Plus, Package, FileText, Settings, ShoppingCart, Users,
    LayoutDashboard, Zap, Truck, Building2, CreditCard, Receipt,
    BarChart3, Landmark, Brain, Factory, UserCog, CheckSquare, ScrollText,
    Heart, Megaphone, UtensilsCrossed, RefreshCcw, ClipboardList, TrendingUp,
    Warehouse, Calendar, ArrowLeftRight, BadgeDollarSign, Hash, BadgeCheck
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { isMembershipRelevant } from '@/lib/config/domains';

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [membershipRelevant, setMembershipRelevant] = useState(false);
    const router = useRouter();

    // Command palette needs the current business domain, not category, to route correctly
    const getCurrentDomain = () => {
        if (typeof window !== 'undefined') {
            const storedBiz = localStorage.getItem('businessData');
            if (storedBiz) {
                try {
                    const parsedBiz = JSON.parse(storedBiz);
                    return parsedBiz.domain;
                } catch {
                    // ignore
                }
            }
        }
        return 'retail-shop'; // Ultimate fallback
    };

    useEffect(() => {
        const down = (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    useEffect(() => {
        if (!open || typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem('businessData');
            if (raw) {
                const biz = JSON.parse(raw);
                setMembershipRelevant(isMembershipRelevant(biz.category));
                return;
            }
        } catch {
            // ignore
        }
        setMembershipRelevant(false);
    }, [open]);

    const runCommand = useCallback((command) => {
        setOpen(false);
        command();
    }, []);

    const goTab = useCallback((tab) => {
        const currentDomain = getCurrentDomain();
        runCommand(() => router.push(`/business/${currentDomain}?tab=${tab}`, { scroll: false }));
    }, [router, runCommand]);

    const fireAction = useCallback((actionId) => {
        runCommand(() => window.dispatchEvent(new CustomEvent('open-quick-action', { detail: { actionId } })));
    }, [runCommand]);

    const fireModal = useCallback((modalId) => {
        runCommand(() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { modalId } })));
    }, [runCommand]);

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Search modules, actions, features..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Quick Actions">
                    <CommandItem onSelect={() => fireModal('invoice')}>
                        <Plus className="mr-2 h-4 w-4" />
                        <span>New Invoice</span>
                        <CommandShortcut>⌘N</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => fireModal('product')}>
                        <Package className="mr-2 h-4 w-4" />
                        <span>New Product</span>
                    </CommandItem>
                    <CommandItem onSelect={() => fireModal('customer')}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>New Customer</span>
                    </CommandItem>
                    <CommandItem onSelect={() => fireModal('vendor')}>
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>New Vendor</span>
                    </CommandItem>
                    <CommandItem onSelect={() => fireModal('purchase')}>
                        <Truck className="mr-2 h-4 w-4" />
                        <span>New Purchase Order</span>
                    </CommandItem>
                    <CommandItem onSelect={() => fireAction('new-quotation')}>
                        <ClipboardList className="mr-2 h-4 w-4" />
                        <span>New Quotation</span>
                    </CommandItem>
                    <CommandItem onSelect={() => fireAction('excel-mode')}>
                        <Hash className="mr-2 h-4 w-4" />
                        <span>Excel Fast Entry</span>
                    </CommandItem>
                    <CommandItem onSelect={() => fireAction('generate-report')}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>Generate Report</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Essentials">
                    <CommandItem onSelect={() => goTab('dashboard')}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('inventory')}>
                        <Package className="mr-2 h-4 w-4" />
                        <span>Inventory & Stock</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('invoices')}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Sales & Invoicing</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('customers')}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Customers</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('vendors')}>
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>Vendors & Procurement</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('purchases')}>
                        <Truck className="mr-2 h-4 w-4" />
                        <span>Purchase Orders</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Storefront">
                    <CommandItem onSelect={() => goTab('pos')}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        <span>Point of Sale</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('restaurant')}>
                        <UtensilsCrossed className="mr-2 h-4 w-4" />
                        <span>Restaurant</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('quotations')}>
                        <ClipboardList className="mr-2 h-4 w-4" />
                        <span>Quotations</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('sales')}>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        <span>Sales Manager</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('loyalty')}>
                        <Heart className="mr-2 h-4 w-4" />
                        <span>Loyalty & CRM</span>
                    </CommandItem>
                    {membershipRelevant ? (
                    <CommandItem onSelect={() => goTab('memberships')}>
                        <BadgeCheck className="mr-2 h-4 w-4" />
                        <span>Memberships</span>
                    </CommandItem>
                    ) : null}
                    <CommandItem onSelect={() => goTab('refunds')}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        <span>Refunds & Returns</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Finance">
                    <CommandItem onSelect={() => goTab('accounting')}>
                        <Landmark className="mr-2 h-4 w-4" />
                        <span>Accounting (GL)</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('payments')}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Payments</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('expenses')}>
                        <Receipt className="mr-2 h-4 w-4" />
                        <span>Expenses</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('credit-notes')}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        <span>Credit Notes</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('finance')}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>Finance Hub</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('gst')}>
                        <BadgeDollarSign className="mr-2 h-4 w-4" />
                        <span>Tax / GST</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('fiscal')}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Fiscal Periods</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('exchange-rates')}>
                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                        <span>Exchange Rates</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Operations">
                    <CommandItem onSelect={() => goTab('warehouses')}>
                        <Warehouse className="mr-2 h-4 w-4" />
                        <span>Warehouses</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('manufacturing')}>
                        <Factory className="mr-2 h-4 w-4" />
                        <span>Manufacturing</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('payroll')}>
                        <UserCog className="mr-2 h-4 w-4" />
                        <span>Payroll & HR</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('approvals')}>
                        <CheckSquare className="mr-2 h-4 w-4" />
                        <span>Approvals</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Intelligence">
                    <CommandItem onSelect={() => goTab('reports')}>
                        <Brain className="mr-2 h-4 w-4" />
                        <span>Analytics & AI</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('campaigns')}>
                        <Megaphone className="mr-2 h-4 w-4" />
                        <span>Campaigns & Marketing</span>
                    </CommandItem>
                    <CommandItem onSelect={() => goTab('audit')}>
                        <ScrollText className="mr-2 h-4 w-4" />
                        <span>Audit Trail</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="System">
                    <CommandItem onSelect={() => goTab('settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                        <CommandShortcut>⌘,</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
