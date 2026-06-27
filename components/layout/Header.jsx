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
    , Moon,
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
import { MOBILE_TAB_LABELS, MOBILE_MINIMAL_HEADER_TABS } from '@/lib/utils/mobileLayout';

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
                ? <span key={i} className="text-brand-primary bg-brand-50 font-semibold">{part}</span>
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
        const id = requestAnimationFrame(() => {
            setActiveIndex(-1);
        });
        return () => cancelAnimationFrame(id);
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
    const mobileTitle = MOBILE_TAB_LABELS[currentTab] || activeTitle;
    const minimalMobileHeader = MOBILE_MINIMAL_HEADER_TABS.has(currentTab);
    const businessShortName =
        business?.business_name || business?.name || business?.domain?.replace(/-/g, ' ') || 'Workspace';
    const dispatchHeaderEvent = (eventName, detail) => {
        window.dispatchEvent(new CustomEvent(eventName, detail ? { detail } : undefined));
    };

    return (
        <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-super-white/95 shadow-sm backdrop-blur-md">
            {/* ── Mobile header, single compact row ── */}
            <div className="lg:hidden">
                <div className="flex h-10 items-center gap-1 px-2.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-gray-500"
                        onClick={onMenuClick}
                        aria-label="Open menu"
                    >
                        <Menu className="h-4 w-4" />
                    </Button>

                    <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden leading-none">
                        <span className="truncate text-[13px] font-bold tracking-tight text-gray-900">
                            {mobileTitle}
                        </span>
                        <span className="hidden shrink-0 text-[10px] text-gray-300 min-[340px]:inline">·</span>
                        <span className="hidden truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400 min-[340px]:inline">
                            {businessShortName}
                        </span>
                    </div>

                    {!minimalMobileHeader && !isEasyMode && (
                        <div className="flex shrink-0 items-center gap-0.5">
                            <DateRangePicker
                                minimal
                                date={dateRange}
                                onDateChange={(newRange) => {
                                    if (newRange?.from && newRange?.to) {
                                        setDateRange(newRange);
                                    }
                                }}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0 text-gray-500"
                                onClick={() => dispatchHeaderEvent('refresh-dashboard-data')}
                                title="Refresh data"
                                aria-label="Refresh data"
                            >
                                <RefreshCcw className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}

                    {!minimalMobileHeader && isEasyMode && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0 text-gray-500"
                            onClick={() => dispatchHeaderEvent('refresh-dashboard-data')}
                            title="Refresh data"
                            aria-label="Refresh data"
                        >
                            <RefreshCcw className="h-3.5 w-3.5" />
                        </Button>
                    )}

                    {!minimalMobileHeader && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-gray-500"
                        onClick={() => {
                            const input = searchRef.current?.querySelector('input');
                            if (input) input.focus();
                            else setIsSearchFocused(true);
                        }}
                        aria-label="Search"
                    >
                        <Search className="h-4 w-4" />
                    </Button>
                    )}

                    {!minimalMobileHeader && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7 shrink-0 rounded-lg border-gray-200"
                                aria-label="Quick add"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-2xl p-2 shadow-xl">
                            <DropdownMenuLabel className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                                Quick Actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { modalId: 'invoice' } }))} className="cursor-pointer rounded-xl py-2.5">
                                <Plus className="mr-3 h-4 w-4" />
                                <span className="text-xs font-bold">New Invoice</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { modalId: 'product' } }))} className="cursor-pointer rounded-xl py-2.5">
                                <PackageIcon className="mr-3 h-4 w-4 text-brand-primary" />
                                <span className="text-xs font-bold">New Product</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { modalId: 'customer' } }))} className="cursor-pointer rounded-xl py-2.5">
                                <UsersIcon className="mr-3 h-4 w-4 text-green-500" />
                                <span className="text-xs font-bold">New Customer</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-modal', { detail: { modalId: 'purchase' } }))} className="cursor-pointer rounded-xl py-2.5">
                                <ShoppingCart className="mr-3 h-4 w-4 text-brand-primary" />
                                <span className="text-xs font-bold">New Purchase</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    )}

                    <NotificationBell className="shrink-0" />
                </div>

                {/* Mobile search overlay */}
                <AnimatePresence>
                    {isSearchFocused && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden border-t border-gray-100 px-3 pb-2"
                            ref={searchRef}
                        >
                            <div className="relative pt-2">
                                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder={t.search_placeholder}
                                    className="h-9 rounded-xl border-gray-200 bg-gray-50 pl-9 text-xs"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSearchFocused(false);
                                        setSearchQuery('');
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-gray-100"
                                >
                                    <X className="h-3.5 w-3.5 text-gray-400" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Desktop header ── */}
            <div className="hidden h-14 items-center gap-3 px-4 lg:flex lg:px-5">
            <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3">
                {/* Left: module title */}
                <div className="flex min-w-0 shrink-0 flex-col justify-center">
                    <span className="truncate text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-neutral-400 max-w-[10rem] xl:max-w-[12rem]">
                        {businessShortName}
                    </span>
                    <h1 className="truncate text-sm font-bold tracking-tight text-neutral-900 max-w-[10rem] xl:max-w-[12rem]">
                        {activeTitle}
                    </h1>
                </div>

                {/* Center: search */}
                <div className="flex min-w-0 flex-1 justify-center px-1 lg:px-3" ref={searchRef}>
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
                                            <p className="text-xs font-semibold text-gray-900 uppercase tracking-tight mb-1">No matches found</p>
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
                                                            <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 bg-gray-50/50 rounded-lg mb-1">
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
                                                <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest">
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

                {/* Right: actions */}
                <div className="flex shrink-0 items-center gap-1">
                    {/* Date range: all breakpoints in advanced mode (popover stays usable on small screens). */}
                    {!isEasyMode && (
                        <div className="flex items-center gap-1 sm:gap-1.5 border-r border-gray-100 pr-1.5 sm:pr-2 min-w-0">
                            <DateRangePicker
                                date={dateRange}
                                onDateChange={(newRange) => {
                                    if (newRange?.from && newRange?.to) {
                                        setDateRange(newRange);
                                    }
                                }}
                                className="min-w-0 w-[min(12.5rem,calc(100vw-10rem))] sm:w-[205px] lg:w-[214px]"
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
                                <DropdownMenuLabel className="text-[10px] uppercase font-semibold tracking-[0.2em] text-gray-400 px-3 py-2">Quick Actions</DropdownMenuLabel>
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

                    <div className="mx-0.5 h-5 w-px bg-neutral-200" />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-neutral-400 hover:bg-brand-50 hover:text-brand-primary"
                        onClick={() => document.documentElement.classList.toggle('dark')}
                        title="Toggle dark mode"
                        aria-label="Toggle dark mode"
                    >
                        <Sun className="block h-4 w-4 dark:hidden" />
                        <Moon className="hidden h-4 w-4 dark:block" />
                    </Button>

                    <NotificationBell />
                </div>
            </div>
            </div>
        </header >
    );
}

