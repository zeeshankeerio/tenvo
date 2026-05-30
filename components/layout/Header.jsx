'use client';

import React, { useMemo } from 'react';

import {
    ChevronRight as ChevronIcon,
    BarChart3,
    ChevronDown,
    Package as PackageIcon,
    Users as UsersIcon,
    Menu,
    Search,
    Plus,
    Bell,
    X,
    ClipboardList,
    FileText,
    TrendingUp,
    Truck,
    Factory,
    Layers,
    Warehouse,
    ShoppingCart,
    History,
    ListFilter,
    Download,
    LayoutGrid,
    Eye,
    RefreshCcw
    , AlertTriangle,
    Clock3,
    Moon,
    Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DateRangePicker } from '@/components/islands/DateRangePicker.client';
import { useFilters } from '@/lib/context/FilterContext';
import { useBusiness } from '@/lib/context/BusinessContext';
import { useData } from '@/lib/context/DataContext';
import { useLanguage } from '@/lib/context/LanguageContext';
import { useAppMode } from '@/lib/context/BusyModeContext';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { BusinessSwitcherEnhanced } from '@/components/layout/BusinessSwitcherEnhanced';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuShortcut
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export function Header({ onMenuClick }) {
    const { dateRange, setDateRange, searchQuery, setSearchQuery } = useFilters();
    const { business } = useBusiness();
    const { isEasyMode } = useAppMode();
    const {
        products,
        invoices,
        customers,
        vendors,
        bomList,
        productionOrders,
        purchaseOrders,
        pendingApprovals,
        quotations,
        salesOrders,
        challans
    } = useData();
    const { t, language } = useLanguage();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('tab') || 'dashboard';

    const [isSearchFocused, setIsSearchFocused] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(-1);
    const searchRef = React.useRef(null);

    // Highlight helper
    const highlightMatch = (text, term) => {
        if (!term || !text) return text;
        const parts = text.split(new RegExp(`(${term})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === term.toLowerCase()
                ? <span key={i} className="text-brand-primary bg-brand-50 font-black">{part}</span>
                : part
        );
    };

    // Close results on click outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Global hotkey to focus search bar
    React.useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Focus search on '/' if not already focusing an input
            if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                const input = searchRef.current?.querySelector('input');
                if (input) input.focus();
            }
        };
        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // Search Results Logic
    const searchResults = React.useMemo(() => {
        if (!searchQuery || searchQuery.length < 2 || !isSearchFocused) return null;
        const term = searchQuery.toLowerCase();

        const results = {
            inventory: products.filter(p =>
                p.name?.toLowerCase().includes(term) ||
                p.sku?.toLowerCase().includes(term) ||
                p.category?.toLowerCase().includes(term) ||
                p.brand?.toLowerCase().includes(term)
            ).slice(0, 5),
            sales: invoices.filter(i =>
                i.number?.toLowerCase().includes(term) ||
                i.customer_name?.toLowerCase().includes(term)
            ).slice(0, 5),
            crm: [
                ...customers.filter(c => c.name?.toLowerCase().includes(term) || c.phone?.toLowerCase().includes(term)),
                ...vendors.filter(v => v.name?.toLowerCase().includes(term) || v.company_name?.toLowerCase().includes(term))
            ].slice(0, 5),
            manufacturing: [
                ...bomList.filter(b => b.name?.toLowerCase().includes(term) || b.product_name?.toLowerCase().includes(term)),
                ...productionOrders.filter(o => o.status?.toLowerCase().includes(term) || o.product_name?.toLowerCase().includes(term))
            ].slice(0, 5),
            management: [
                ...purchaseOrders.filter(po => po.number?.toLowerCase().includes(term) || po.vendor_name?.toLowerCase().includes(term)),
                ...quotations.filter(q => q.number?.toLowerCase().includes(term) || q.customer_name?.toLowerCase().includes(term)),
                ...salesOrders.filter(so => so.number?.toLowerCase().includes(term) || so.customer_name?.toLowerCase().includes(term)),
                ...challans.filter(c => c.number?.toLowerCase().includes(term) || c.customer_name?.toLowerCase().includes(term))
            ].slice(0, 5)
        };

        const totalResults = Object.values(results).flat().length;
        if (totalResults === 0) return { empty: true };

        // Flatten for keyboard navigation mapping
        const flatItems = [];
        Object.entries(results).forEach(([cat, items]) => {
            items.forEach(item => flatItems.push({ cat, item }));
        });

        return { ...results, flatItems };
    }, [searchQuery, products, invoices, customers, vendors, bomList, productionOrders, purchaseOrders, quotations, salesOrders, challans, isSearchFocused]);

    const handleResultClick = (type, item) => {
        setIsSearchFocused(false);
        setActiveIndex(-1);
        let tab = 'dashboard';
        let detailType = type;

        switch (type) {
            case 'inventory':
                tab = 'inventory';
                detailType = 'product';
                break;
            case 'sales':
                tab = 'invoices';
                detailType = 'invoice';
                break;
            case 'crm':
                tab = item.company_name ? 'vendors' : 'customers';
                detailType = item.company_name ? 'vendor' : 'customer';
                break;
            case 'manufacturing':
                tab = 'manufacturing';
                detailType = item.sku ? 'bom' : 'production_order'; // Basic heuristic
                break;
            case 'management':
                if (item.number?.startsWith('PO')) {
                    tab = 'purchases';
                    detailType = 'purchase_order';
                } else if (item.number?.startsWith('QT')) {
                    tab = 'quotations';
                    detailType = 'quotation';
                } else if (item.number?.startsWith('SO')) {
                    tab = 'quotations';
                    detailType = 'sales_order';
                } else if (item.number?.startsWith('CH')) {
                    tab = 'quotations';
                    detailType = 'challan';
                }
                break;
        }

        window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab } }));
        window.dispatchEvent(new CustomEvent('view-details', {
            detail: { item, type: detailType }
        }));
    };

    const handleKeyDown = (e) => {
        if (!searchResults || searchResults.empty) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < searchResults.flatItems.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            const target = searchResults.flatItems[activeIndex];
            handleResultClick(target.cat, target.item);
        } else if (e.key === 'Escape') {
            setIsSearchFocused(false);
            setActiveIndex(-1);
        }
    };

    React.useEffect(() => {
        setActiveIndex(-1);
    }, [searchQuery]);

    // Extract category from URL
    const labels = {
        dashboard: 'Command Overview',
        inventory: 'Inventory Engine',
        invoices: 'Billing & Invoicing',
        customers: 'CRM & Client Hub',
        sales: 'Sales Performance',
        quotations: 'Estimates & Quotes',
        vendors: 'Supplier Network',
        payments: 'Financial Settlements',
        purchases: 'Procurement Ops',
        manufacturing: 'Production Control',
        warehouses: 'Location Manager',
        batches: 'Batch Tracking',
        serials: 'Serial Management',
        gst: 'Tax & Compliance',
        settings: 'System Configs',
        reports: 'Analytics Hub',
        analytics: 'Intelligence Center'
    };

    const activeTitle = labels[currentTab] || currentTab;
    const dispatchHeaderEvent = (eventName, detail) => {
        window.dispatchEvent(new CustomEvent(eventName, detail ? { detail } : undefined));
    };

    const lowStockProducts = useMemo(
        () => (products || []).filter((p) => (Number(p?.stock || 0) <= Number(p?.min_stock || p?.minStock || p?.min_stock_level || 5))),
        [products]
    );

    const outOfStockProducts = useMemo(
        () => (products || []).filter((p) => Number(p?.stock || 0) <= 0),
        [products]
    );

    const expiringProducts = useMemo(() => {
        const twoWeeks = new Date();
        twoWeeks.setDate(twoWeeks.getDate() + 14);
        return (products || []).filter((p) => {
            if (!p?.expiry_date) return false;
            const exp = new Date(p.expiry_date);
            return !Number.isNaN(exp.getTime()) && exp >= new Date() && exp <= twoWeeks;
        });
    }, [products]);

    const overdueInvoices = useMemo(() => {
        const now = new Date();
        return (invoices || []).filter((inv) => {
            const status = String(inv?.status || '').toLowerCase();
            const isOpen = status === 'unpaid' || status === 'pending' || status === 'overdue';
            const hasDueDate = inv?.due_date && !Number.isNaN(new Date(inv.due_date).getTime());
            return isOpen && hasDueDate && new Date(inv.due_date) < now;
        });
    }, [invoices]);

    const openPurchaseOrders = useMemo(() => {
        return (purchaseOrders || []).filter((po) => {
            const status = String(po?.status || '').toLowerCase();
            return status === 'pending' || status === 'open' || status === 'draft';
        });
    }, [purchaseOrders]);

    const notifications = useMemo(() => {
        const items = [];
        if (lowStockProducts.length > 0) {
            items.push({
                id: 'low-stock',
                severity: 'high',
                icon: AlertTriangle,
                title: 'Low Stock Alert',
                description: `${lowStockProducts.length} products below minimum stock`,
                count: lowStockProducts.length,
            });
        }
        if (outOfStockProducts.length > 0) {
            items.push({
                id: 'out-of-stock',
                severity: 'high',
                icon: PackageIcon,
                title: 'Out of Stock',
                description: `${outOfStockProducts.length} products require immediate replenishment`,
                count: outOfStockProducts.length,
            });
        }
        if (overdueInvoices.length > 0) {
            items.push({
                id: 'overdue-invoices',
                severity: 'medium',
                icon: FileText,
                title: 'Overdue Invoices',
                description: `${overdueInvoices.length} invoices are overdue`,
                count: overdueInvoices.length,
            });
        }
        if (openPurchaseOrders.length > 0) {
            items.push({
                id: 'purchase-orders',
                severity: 'low',
                icon: ShoppingCart,
                title: 'Open Purchase Orders',
                description: `${openPurchaseOrders.length} purchase orders pending closure`,
                count: openPurchaseOrders.length,
            });
        }
        if (expiringProducts.length > 0) {
            items.push({
                id: 'expiring-stock',
                severity: 'medium',
                icon: Clock3,
                title: 'Expiry Risk',
                description: `${expiringProducts.length} products expiring within 14 days`,
                count: expiringProducts.length,
            });
        }
        if ((pendingApprovals || []).length > 0) {
            items.push({
                id: 'pending-approvals',
                severity: 'medium',
                icon: ClipboardList,
                title: 'Pending Approvals',
                description: `${pendingApprovals.length} workflow approvals are waiting`,
                count: pendingApprovals.length,
            });
        }
        return items;
    }, [lowStockProducts.length, outOfStockProducts.length, overdueInvoices.length, openPurchaseOrders.length, expiringProducts.length, pendingApprovals]);

    const notificationCount = useMemo(
        () => notifications.reduce((sum, item) => sum + Number(item.count || 0), 0),
        [notifications]
    );

    const handleNotificationClick = (notificationId) => {
        if (notificationId === 'low-stock' || notificationId === 'out-of-stock' || notificationId === 'expiring-stock') {
            dispatchHeaderEvent('switch-tab', { tab: 'inventory' });
            dispatchHeaderEvent('inventory-focus-low-stock', { mode: notificationId });
            return;
        }
        if (notificationId === 'overdue-invoices') {
            dispatchHeaderEvent('switch-tab', { tab: 'invoices' });
            return;
        }
        if (notificationId === 'purchase-orders') {
            dispatchHeaderEvent('switch-tab', { tab: 'purchases' });
            return;
        }
        if (notificationId === 'pending-approvals') {
            dispatchHeaderEvent('switch-tab', { tab: 'dashboard' });
        }
    };

    return (
        <header className="h-14 bg-white/90 backdrop-blur-xl border-b border-gray-200/50 flex items-center px-4 lg:px-6 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center justify-between w-full max-w-[1600px] mx-auto gap-3">
                {/* Left: Mobile Menu & Module Breadcrumb */}
                <div className="flex items-center gap-3 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden shrink-0 h-8 w-8 text-gray-400"
                        onClick={onMenuClick}
                    >
                        <Menu className="w-4 h-4" />
                    </Button>

                    <div className="flex flex-col -space-y-0.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] leading-none">
                            {business?.business_name || business?.name || business?.domain?.replace(/-/g, ' ') || 'Dashboard'}
                        </span>
                        <h1 className="text-sm font-black text-gray-900 tracking-tight">
                            {activeTitle}
                        </h1>
                    </div>
                    <div className="hidden lg:flex items-center pl-2 border-l border-gray-200/80 ml-1">
                        <BusinessSwitcherEnhanced />
                    </div>
                </div>

                {/* Center: Global Search Bar */}
                <div className="hidden md:flex flex-1 justify-center max-w-md lg:max-w-lg px-2 lg:px-4" ref={searchRef}>
                    <div className="relative w-full group">
                        <Search className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-brand-primary transition-colors ${language === 'ur' ? 'right-3' : 'left-3'}`} />
                        <Input
                            placeholder={t.search_placeholder + '...  (/)'}
                            className={`h-9 text-xs bg-gray-50 border-gray-200/50 focus:bg-white focus:border-brand-100 focus:ring-4 focus:ring-brand-50 transition-all rounded-xl ${language === 'ur' ? 'pr-9' : 'pl-9'}`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onKeyDown={handleKeyDown}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className={`absolute top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors ${language === 'ur' ? 'left-3' : 'right-3'}`}
                            >
                                <X className="w-3 h-3 text-gray-400" />
                            </button>
                        )}

                        {/* Search Results Dropdown */}
                        <AnimatePresence>
                            {searchResults && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[80vh] overflow-y-auto custom-scrollbar"
                                >
                                    {searchResults.empty ? (
                                        <div className="p-8 text-center">
                                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Search className="w-6 h-6 text-gray-300" />
                                            </div>
                                            <p className="text-xs font-black text-gray-900 uppercase tracking-tight mb-1">No matches found</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Try a different search term</p>
                                        </div>
                                    ) : (
                                        <>
                                            {(() => {
                                                let globalIdx = 0;
                                                return Object.entries(searchResults).map(([category, items]) => {
                                                    if (category === 'flatItems' || category === 'empty' || items.length === 0) return null;
                                                    return (
                                                        <div key={category} className="p-2 border-b border-gray-50 last:border-0">
                                                            <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50/50 rounded-lg mb-1">
                                                                {category === 'inventory' && <PackageIcon className="w-3 h-3 text-brand-primary" />}
                                                                {category === 'sales' && <FileText className="w-3 h-3 text-brand-primary" />}
                                                                {category === 'crm' && <UsersIcon className="w-3 h-3 text-green-500" />}
                                                                {category === 'manufacturing' && <Factory className="w-3 h-3 text-orange-500" />}
                                                                {category === 'management' && <ClipboardList className="w-3 h-3 text-brand-primary" />}
                                                                {category}
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                {items.map((item, idx) => {
                                                                    const isSelected = activeIndex === globalIdx;
                                                                    const currentGlobalIdx = globalIdx++;
                                                                    return (
                                                                        <button
                                                                            key={idx}
                                                                            onClick={() => handleResultClick(category, item)}
                                                                            onMouseEnter={() => setActiveIndex(currentGlobalIdx)}
                                                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors group text-left border border-transparent ${isSelected ? 'bg-brand-50 border-brand-100' : 'hover:bg-gray-50'}`}
                                                                        >
                                                                            <div className="flex flex-col">
                                                                                <span className={`text-xs font-bold tracking-tight ${isSelected ? 'text-brand-primary-dark' : 'text-gray-900'}`}>
                                                                                    {highlightMatch(item.name || item.number || item.product_name || 'Unnamed Item', searchQuery)}
                                                                                </span>
                                                                                <span className="text-[10px] text-gray-500 line-clamp-1">
                                                                                    {highlightMatch(item.sku || item.customer_name || item.company_name || item.category || item.status || '', searchQuery)}
                                                                                </span>
                                                                            </div>
                                                                            <ChevronIcon className={`w-3 h-3 transition-all ${isSelected ? 'text-brand-primary translate-x-0.5' : 'text-gray-300'}`} />
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                            <div className="p-2 bg-gray-50/30 text-center">
                                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                                                    Use Arrow Keys to Navigate * Enter to Open
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right: Consolidated Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Date Range -- hidden in Easy mode for cleanliness */}
                    {!isEasyMode && (
                        <div className="hidden md:flex items-center gap-1.5 border-r border-gray-100 pr-2">
                            <DateRangePicker
                                date={dateRange}
                                onDateChange={(newRange) => {
                                    if (newRange?.from && newRange?.to) {
                                        setDateRange(newRange);
                                    }
                                }}
                                className="w-[205px] lg:w-[214px]"
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-lg text-gray-500 hover:text-brand-primary hover:bg-brand-50 transition-colors"
                                onClick={() => dispatchHeaderEvent('refresh-dashboard-data')}
                                title="Refresh data"
                            >
                                <RefreshCcw className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    )}

                    {/* Easy mode: simple refresh */}
                    {isEasyMode && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg text-gray-500 hover:text-brand-primary hover:bg-brand-50 transition-colors"
                            onClick={() => dispatchHeaderEvent('refresh-dashboard-data')}
                            title="Refresh data"
                        >
                            <RefreshCcw className="w-3.5 h-3.5" />
                        </Button>
                    )}

                    <div className="flex items-center gap-1">
                        {/* Quick Add Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="h-8 rounded-lg px-2.5 font-bold text-[10px] uppercase tracking-wider border-gray-200/70 bg-white hover:bg-gray-50 text-gray-600 transition-colors">
                                    <Plus className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                    Add
                                    <ChevronDown className="w-3 h-3 ml-1.5 opacity-30" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-xl p-2 border-gray-100/80 backdrop-blur-xl">
                                <DropdownMenuLabel className="text-[9px] uppercase font-black tracking-[0.2em] text-gray-400 px-3 py-2">Quick Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { modalId: 'invoice' } }))} className="rounded-xl py-2.5 cursor-pointer text-brand-primary bg-brand-50/70">
                                    <Plus className="w-4 h-4 mr-3" />
                                    <span className="font-bold text-xs">New Invoice</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { modalId: 'product' } }))} className="rounded-xl py-2.5 cursor-pointer">
                                    <PackageIcon className="w-4 h-4 mr-3 text-brand-primary" />
                                    <span className="font-bold text-xs">New Product</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { modalId: 'customer' } }))} className="rounded-xl py-2.5 cursor-pointer">
                                    <UsersIcon className="w-4 h-4 mr-3 text-green-500" />
                                    <span className="font-bold text-xs">New Customer</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { modalId: 'vendor' } }))} className="rounded-xl py-2.5 cursor-pointer">
                                    <Truck className="w-4 h-4 mr-3 text-amber-500" />
                                    <span className="font-bold text-xs">New Vendor</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { modalId: 'purchase' } }))} className="rounded-xl py-2.5 cursor-pointer">
                                    <ShoppingCart className="w-4 h-4 mr-3 text-brand-primary" />
                                    <span className="font-bold text-xs">New Purchase Order</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'payments' } }))} className="rounded-xl py-2.5 cursor-pointer">
                                    <History className="w-4 h-4 mr-3 text-emerald-500" />
                                    <span className="font-bold text-xs">Record Payment</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'finance' } }))} className="rounded-xl py-2.5 cursor-pointer">
                                    <ListFilter className="w-4 h-4 mr-3 text-rose-500" />
                                    <span className="font-bold text-xs">Log Expense</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="h-5 w-px bg-gray-100 mx-0.5"></div>

                    {/* Dark Mode Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-brand-primary hover:bg-brand-50 rounded-lg transition-colors h-8 w-8"
                        onClick={() => document.documentElement.classList.toggle('dark')}
                        title="Toggle dark mode"
                    >
                        <Sun className="w-4 h-4 block dark:hidden" />
                        <Moon className="w-4 h-4 hidden dark:block" />
                    </Button>

                    <NotificationBell />
                </div>
            </div>
        </header >
    );
}

