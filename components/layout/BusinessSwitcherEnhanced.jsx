'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import notify, { TOAST_IDS } from '@/lib/utils/appToast';
import {
    Building2, ChevronDown, Check, Plus, Loader2, Search, Star, Clock,
    Store, UtensilsCrossed, Factory, Truck, ShoppingCart, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getJoinedBusinessesAction } from '@/lib/actions/basic/business';
import { Input } from '@/components/ui/input';

const DOMAIN_ICONS = {
    'retail-shop': Store,
    'restaurant-cafe': UtensilsCrossed,
    'supermarket': ShoppingCart,
    'grocery': ShoppingCart,
    'wholesale': Truck,
    'manufacturing': Factory,
    'default': Building2,
};

const DOMAIN_COLORS = {
    'retail-shop': 'bg-brand-primary',
    'restaurant-cafe': 'bg-orange-500',
    'supermarket': 'bg-emerald-500',
    'grocery': 'bg-green-500',
    'wholesale': 'bg-wine-500',
    'manufacturing': 'bg-slate-600',
    'default': 'bg-brand-primary-dark',
};

export function BusinessSwitcherEnhanced({ isCollapsed = false }) {
    const router = useRouter();
    const { business, switchBusinessByDomain } = useBusiness();
    const [isOpen, setIsOpen] = useState(false);
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [switching, setSwitching] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [favorites, setFavorites] = useState([]);

    // Load businesses and favorites from localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const cached = localStorage.getItem('joinedBusinesses');
        const cachedFavorites = localStorage.getItem('favoriteBusinesses');
        
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) setBusinesses(parsed);
            } catch {
                localStorage.removeItem('joinedBusinesses');
            }
        }
        
        if (cachedFavorites) {
            try {
                const parsed = JSON.parse(cachedFavorites);
                if (Array.isArray(parsed)) setFavorites(parsed);
            } catch {
                localStorage.removeItem('favoriteBusinesses');
            }
        }
    }, []);

    const fetchBusinesses = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getJoinedBusinessesAction();
            if (result.success) {
                const nextBusinesses = result.businesses || [];
                setBusinesses(nextBusinesses);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('joinedBusinesses', JSON.stringify(nextBusinesses));
                }
            }
        } catch (err) {
            console.error('Failed to fetch businesses:', err);
                notify.error('Could not refresh business list');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen && businesses.length === 0) {
            fetchBusinesses();
        }
    }, [isOpen, fetchBusinesses, businesses.length]);

    const handleSwitch = async (biz) => {
        if (biz.id === business?.id) {
            setIsOpen(false);
            return;
        }
        setSwitching(biz.id);
        try {
            const result = await switchBusinessByDomain(biz.domain);
            if (result.success) {
                notify.success(`Switched to ${biz.name}`, {
                    id: `${TOAST_IDS.BUSINESS_SWITCH}:${biz.domain}`,
                });
                router.push(`/business/${biz.domain}?tab=dashboard`);
            } else {
                notify.error(result.error || 'Unable to switch business');
            }
        } finally {
            setSwitching(null);
            setIsOpen(false);
        }
    };

    const toggleFavorite = (bizId) => {
        const newFavorites = favorites.includes(bizId)
            ? favorites.filter(id => id !== bizId)
            : [...favorites, bizId];
        setFavorites(newFavorites);
        if (typeof window !== 'undefined') {
            localStorage.setItem('favoriteBusinesses', JSON.stringify(newFavorites));
        }
    };

    // Filter and sort businesses
    const filteredBusinesses = useMemo(() => {
        let filtered = [...businesses];
        
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(biz =>
                biz.name.toLowerCase().includes(query) ||
                biz.domain?.toLowerCase().includes(query)
            );
        }
        
        // Sort: favorites first, then alphabetically
        return filtered.slice().sort((a, b) => {
            const aFav = favorites.includes(a.id);
            const bFav = favorites.includes(b.id);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [businesses, searchQuery, favorites]);

    const getDomainIcon = (domain) => DOMAIN_ICONS[domain] || DOMAIN_ICONS.default;
    const getDomainColor = (domain) => DOMAIN_COLORS[domain] || DOMAIN_COLORS.default;
    const ActiveIcon = getDomainIcon(business?.domain);

    // Collapsed state - Compact button
    if (isCollapsed) {
        return (
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative w-9 h-9 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors mx-auto group"
                    title={business?.name || 'Switch Business'}
                >
                    <ActiveIcon className="w-4.5 h-4.5 text-white" />
                    {businesses.length > 1 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-wine-500 text-[10px] font-bold rounded-full flex items-center justify-center text-white shadow-sm">
                            {businesses.length}
                        </span>
                    )}
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                            <motion.div
                                initial={{ opacity: 0, x: -8, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -8, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute left-full ml-2 top-0 z-50 w-80 bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden"
                            >
                                {renderBusinessList()}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // Expanded state - Full button
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-left group"
            >
                <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm',
                    getDomainColor(business?.domain)
                )}>
                    <ActiveIcon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-tight">{business?.name || 'No Business'}</p>
                    <p className="text-[10px] text-white/50 truncate capitalize leading-tight">{business?.domain?.replace(/-/g, ' ') || 'Select'}</p>
                </div>
                <ChevronDown className={cn(
                    'w-3.5 h-3.5 text-white/40 transition-transform flex-shrink-0',
                    isOpen && 'rotate-180'
                )} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden"
                        >
                            {renderBusinessList()}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );

    function renderBusinessList() {
        return (
            <div className="flex flex-col max-h-[480px]">
                {/* Header with search */}
                <div className="p-3 border-b border-neutral-100 bg-neutral-50/50">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                            Your Businesses
                        </p>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-neutral-100 rounded-md transition-colors"
                        >
                            <X className="w-3.5 h-3.5 text-neutral-400" />
                        </button>
                    </div>
                    
                    {businesses.length > 3 && (
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                            <Input
                                type="text"
                                placeholder="Search businesses..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 pl-8 pr-3 text-xs border-neutral-200 rounded-lg"
                            />
                        </div>
                    )}
                </div>

                {/* Business list */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                        </div>
                    ) : filteredBusinesses.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-neutral-500">
                                {searchQuery ? 'No businesses found' : 'No businesses yet'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredBusinesses.map((biz) => {
                                const Icon = getDomainIcon(biz.domain);
                                const isActive = biz.id === business?.id;
                                const isSwitching = switching === biz.id;
                                const isFavorite = favorites.includes(biz.id);

                                return (
                                    <div
                                        key={biz.id}
                                        className={cn(
                                            'group flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all',
                                            isActive
                                                ? 'bg-wine-50 border border-wine-200'
                                                : 'hover:bg-neutral-50'
                                        )}
                                    >
                                        <button
                                            onClick={() => handleSwitch(biz)}
                                            disabled={isSwitching}
                                            className="flex-1 flex items-center gap-2.5 min-w-0"
                                        >
                                            <div className={cn(
                                                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                                                getDomainColor(biz.domain)
                                            )}>
                                                <Icon className="w-3.5 h-3.5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className={cn(
                                                    'text-xs font-semibold truncate leading-tight',
                                                    isActive ? 'text-wine-700' : 'text-neutral-800'
                                                )}>
                                                    {biz.name}
                                                </p>
                                                <p className="text-[10px] text-neutral-500 truncate capitalize leading-tight">
                                                    {biz.domain?.replace(/-/g, ' ')} &middot; {biz.user_role}
                                                </p>
                                            </div>
                                        </button>

                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(biz.id);
                                                }}
                                                className={cn(
                                                    'p-1 rounded-md transition-colors',
                                                    isFavorite
                                                        ? 'text-wine-600 hover:bg-wine-50'
                                                        : 'text-neutral-300 hover:text-wine-600 hover:bg-neutral-100'
                                                )}
                                                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                            >
                                                <Star className={cn('w-3.5 h-3.5', isFavorite && 'fill-current')} />
                                            </button>

                                            {isSwitching ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-wine-500" />
                                            ) : isActive ? (
                                                <Check className="w-3.5 h-3.5 text-wine-500" />
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer with add new button */}
                <div className="border-t border-neutral-100 p-2 bg-neutral-50/50">
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            router.push('/register');
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white transition-colors text-left group"
                    >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-neutral-100 group-hover:bg-wine-50 transition-colors">
                            <Plus className="w-3.5 h-3.5 text-neutral-500 group-hover:text-wine-600 transition-colors" />
                        </div>
                        <span className="text-xs font-semibold text-neutral-600 group-hover:text-wine-600 transition-colors">
                            Add New Business
                        </span>
                    </button>
                </div>
            </div>
        );
    }
}


