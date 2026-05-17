'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    ScrollText, FileText, CreditCard, UserPlus, AlertTriangle,
    Clock, Filter, RefreshCcw, ChevronDown, Search, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getUnifiedActivityFeedAction } from '@/lib/actions/basic/audit';

// TYPE CONFIG

const ACTIVITY_TYPES = {
    invoice: { icon: FileText, color: 'bg-blue-50 text-blue-600 border-blue-100', label: 'Invoice' },
    payment: { icon: CreditCard, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Payment' },
    customer: { icon: UserPlus, color: 'bg-wine-50 text-wine-600 border-wine-100', label: 'Customer' },
    alert: { icon: AlertTriangle, color: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Alert' },
};

// ACTIVITY ITEM

function ActivityItem({ activity, currency }) {
    const config = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES.invoice;
    const Icon = config.icon;
    const timeAgo = getTimeAgo(activity.date);

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 group"
        >
            {/* Timeline dot */}
            <div className="flex flex-col items-center pt-0.5">
                <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center', config.color)}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="w-px h-full bg-gray-100 mt-1 group-last:hidden" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 leading-snug">{activity.description}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase',
                        config.color
                    )}>
                        {config.label}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {timeAgo}
                    </span>
                    {activity.status && (
                        <span className={cn(
                            'text-[9px] px-1.5 py-0.5 rounded-full font-bold',
                            activity.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                activity.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                    activity.status === 'warning' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-500'
                        )}>
                            {activity.status}
                        </span>
                    )}
                </div>
            </div>

            {/* Amount */}
            {activity.amount > 0 && (
                <span className="text-sm font-bold text-gray-700 shrink-0">
                    {currency} {Number(activity.amount).toLocaleString()}
                </span>
            )}
        </motion.div>
    );
}

function getTimeAgo(date) {
    if (!date) return '';
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
}

// ===============================================================
// MAIN AUDIT TRAIL VIEWER
// ===============================================================

export function AuditTrailViewer({ businessId }) {
    const { business, currencySymbol } = useBusiness();
    const effectiveBusinessId = businessId || business?.id;
    const currency = currencySymbol || 'Rs.';

    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(25);

    const loadActivities = useCallback(async () => {
        if (!effectiveBusinessId) return;
        setLoading(true);
        try {
            const result = await getUnifiedActivityFeedAction(effectiveBusinessId, limit);
            if (result.success) setActivities(result.data || []);
        } catch (err) {
            console.error('[Audit] Load failed:', err);
        } finally {
            setLoading(false);
        }
    }, [effectiveBusinessId, limit]);

    useEffect(() => { loadActivities(); }, [loadActivities]);

    // Filtered activities
    const filtered = useMemo(() => {
        let list = activities;
        if (filter !== 'all') list = list.filter(a => a.type === filter);
        if (search) {
            const term = search.toLowerCase();
            list = list.filter(a => a.description?.toLowerCase().includes(term));
        }
        return list;
    }, [activities, filter, search]);

    // Type counts
    const typeCounts = useMemo(() => {
        const counts = { all: activities.length };
        activities.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
        return counts;
    }, [activities]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-gray-800 flex items-center justify-center">
                        <ScrollText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900">Audit Trail</h2>
                        <p className="text-xs text-gray-400">{activities.length} activities * Unified timeline</p>
                    </div>
                </div>
                <button onClick={loadActivities} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                    <RefreshCcw className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* KPI Summary */}
            <div className="grid grid-cols-4 gap-2">
                {Object.entries(ACTIVITY_TYPES).map(([key, config]) => {
                    const Icon = config.icon;
                    const count = typeCounts[key] || 0;
                    return (
                        <button
                            key={key}
                            onClick={() => setFilter(filter === key ? 'all' : key)}
                            className={cn(
                                'rounded-xl border p-3 text-left transition-all',
                                filter === key ? config.color + ' ring-2 ring-offset-1' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                            )}
                        >
                            <Icon className="w-4 h-4 mb-1 opacity-60" />
                            <p className="text-lg font-black">{count}</p>
                            <p className="text-[9px] font-bold opacity-60 uppercase">{config.label}s</p>
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                    type="text"
                    placeholder="Search activity descriptions..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-200 outline-none"
                />
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">
                        <RefreshCcw className="w-6 h-6 mx-auto mb-2 animate-spin opacity-30" />
                        <p className="text-xs font-semibold">Loading activity...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <ScrollText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-bold">No activities found</p>
                        <p className="text-xs mt-1">{filter !== 'all' ? 'Try removing the filter' : 'Activities will appear here as you use the system'}</p>
                    </div>
                ) : (
                    <>
                        {filtered.map((activity, idx) => (
                            <ActivityItem key={activity.id || idx} activity={activity} currency={currency} />
                        ))}
                        {filtered.length >= limit && (
                            <button
                                onClick={() => setLimit(l => l + 25)}
                                className="w-full py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 mt-2"
                            >
                                Load more...
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

