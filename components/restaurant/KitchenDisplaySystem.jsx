'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Flame, Clock, CheckCircle, AlertTriangle, ChefHat,
    Timer, ArrowRight, Volume2, VolumeX, RefreshCcw, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getKitchenQueueAction, updateKitchenOrderAction } from '@/lib/actions/standard/restaurant';
import toast from 'react-hot-toast';

// ===============================================================
// TIMER UTILITY
// ===============================================================

function useElapsedTime(startTime) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!startTime) return;
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return { elapsed, minutes, seconds, formatted: `${minutes}:${seconds.toString().padStart(2, '0')}` };
}

function getTimerColor(minutes) {
    if (minutes < 5) return 'text-emerald-600';
    if (minutes < 10) return 'text-amber-600';
    if (minutes < 15) return 'text-orange-600';
    return 'text-red-600';
}

function getTimerBg(minutes) {
    if (minutes < 5) return 'bg-emerald-50 border-emerald-200';
    if (minutes < 10) return 'bg-amber-50 border-amber-200';
    if (minutes < 15) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200 animate-pulse';
}

// ===============================================================
// STATION FILTER
// ===============================================================

const STATIONS = [
    { key: null, label: 'All Stations', icon: ChefHat },
    { key: 'grill', label: 'Grill', icon: Flame },
    { key: 'fryer', label: 'Fryer', icon: Flame },
    { key: 'salad', label: 'Cold / Salad', icon: ChefHat },
    { key: 'desserts', label: 'Desserts', icon: ChefHat },
    { key: 'beverages', label: 'Beverages', icon: ChefHat },
];

// ===============================================================
// KITCHEN TICKET CARD
// ===============================================================

function KitchenTicket({ order, onStatusUpdate, onBump }) {
    const { minutes, formatted } = useElapsedTime(order.created_at || order.sent_at);
    const timerColor = getTimerColor(minutes);
    const timerBg = getTimerBg(minutes);

    const STATUS_FLOW = {
        pending: { next: 'preparing', label: 'Start', color: 'bg-blue-600' },
        preparing: { next: 'ready', label: 'Ready', color: 'bg-emerald-600' },
        ready: { next: 'served', label: 'Served', color: 'bg-gray-600' },
    };

    const nextAction = STATUS_FLOW[order.status];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className={cn(
                'rounded-xl border-2 overflow-hidden transition-all',
                timerBg
            )}
        >
            {/* Ticket Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/60 border-b border-inherit">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-gray-900">
                        #{order.order_number || order.id?.slice(-4)}
                    </span>
                    <span className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase',
                        order.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'preparing' ? 'bg-amber-100 text-amber-700' :
                                order.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-gray-100 text-gray-600'
                    )}>
                        {order.status}
                    </span>
                </div>
                <div className={cn('flex items-center gap-1 text-sm font-black', timerColor)}>
                    <Timer className="w-3.5 h-3.5" />
                    {formatted}
                </div>
            </div>

            {/* Order Metadata */}
            <div className="px-4 py-1.5 flex items-center gap-3 text-[10px] font-bold text-gray-500 border-b border-inherit">
                {order.table_number && <span>🪑 Table {order.table_number}</span>}
                {order.order_type && <span>* {order.order_type}</span>}
                {order.waiter_name && <span>* 👤 {order.waiter_name}</span>}
                {order.covers && <span>* {order.covers} covers</span>}
            </div>

            {/* Items */}
            <div className="px-4 py-2 space-y-1.5">
                {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-xs font-black text-gray-700">
                            {item.quantity}x
                        </span>
                        <span className="flex-1 font-semibold text-gray-800">{item.name || item.product_name}</span>
                        {item.notes && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">
                                {item.notes}
                            </span>
                        )}
                    </div>
                ))}
                {order.notes && (
                    <div className="text-[10px] text-amber-600 font-bold mt-1 bg-amber-50 rounded-lg px-2 py-1">
                        📝 {order.notes}
                    </div>
                )}
            </div>

            {/* Action */}
            {nextAction && (
                <div className="px-4 py-2 border-t border-inherit">
                    <button
                        onClick={() => onStatusUpdate(order.id, nextAction.next)}
                        className={cn(
                            'w-full py-2.5 rounded-xl text-white text-sm font-black flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]',
                            nextAction.color
                        )}
                    >
                        {nextAction.next === 'ready' ? <CheckCircle className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                        {nextAction.label}
                    </button>
                </div>
            )}
        </motion.div>
    );
}

// ===============================================================
// MAIN KDS COMPONENT
// ===============================================================

export function KitchenDisplaySystem({ businessId }) {
    const [queue, setQueue] = useState([]);
    const [station, setStation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const loadQueue = useCallback(async () => {
        if (!businessId) return;
        try {
            const result = await getKitchenQueueAction(businessId, station);
            if (result.success) setQueue(result.orders || result.queue || []);
        } catch (err) {
            console.error('[KDS] Failed to load queue:', err);
        } finally {
            setLoading(false);
        }
    }, [businessId, station]);

    useEffect(() => { loadQueue(); }, [loadQueue]);

    // Auto-refresh every 10 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(loadQueue, 10000);
        return () => clearInterval(interval);
    }, [loadQueue, autoRefresh]);

    const handleStatusUpdate = async (orderId, newStatus) => {
        try {
            const result = await updateKitchenOrderAction({
                businessId,
                kitchenOrderId: orderId,
                status: newStatus,
            });

            if (result.success) {
                toast.success(`Order moved to ${newStatus}`, { icon: newStatus === 'ready' ? '[OK]' : '🏁' });
                loadQueue();
            } else {
                toast.error(result.error || 'Failed to update');
            }
        } catch (err) {
            toast.error('Update failed');
        }
    };

    // Separate by status
    const pending = queue.filter(o => o.status === 'pending');
    const preparing = queue.filter(o => o.status === 'preparing');
    const ready = queue.filter(o => o.status === 'ready');

    return (
        <div className="space-y-4">
            {/* KDS Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                        <ChefHat className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900">Kitchen Display</h2>
                        <p className="text-xs text-gray-400">{queue.length} active orders * Auto-refresh {autoRefresh ? 'ON' : 'OFF'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSoundEnabled(p => !p)}
                        className={cn('p-2 rounded-lg transition-colors', soundEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400')}
                    >
                        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    <button onClick={loadQueue} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                        <RefreshCcw className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Station Filter */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {STATIONS.map(s => {
                    const Icon = s.icon;
                    return (
                        <button
                            key={s.key || 'all'}
                            onClick={() => setStation(s.key)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all',
                                station === s.key
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {s.label}
                        </button>
                    );
                })}
            </div>

            {/* Three-Column Board */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pending */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-xs font-black text-gray-600 uppercase tracking-wider">Queued ({pending.length})</span>
                    </div>
                    <div className="space-y-3">
                        <AnimatePresence>
                            {pending.map(order => (
                                <KitchenTicket key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />
                            ))}
                        </AnimatePresence>
                        {pending.length === 0 && (
                            <div className="text-center py-8 text-gray-300">
                                <Clock className="w-8 h-8 mx-auto mb-1 opacity-30" />
                                <p className="text-xs font-semibold">No pending orders</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preparing */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                        <span className="text-xs font-black text-gray-600 uppercase tracking-wider">Preparing ({preparing.length})</span>
                    </div>
                    <div className="space-y-3">
                        <AnimatePresence>
                            {preparing.map(order => (
                                <KitchenTicket key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />
                            ))}
                        </AnimatePresence>
                        {preparing.length === 0 && (
                            <div className="text-center py-8 text-gray-300">
                                <Flame className="w-8 h-8 mx-auto mb-1 opacity-30" />
                                <p className="text-xs font-semibold">Nothing cooking</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Ready */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-black text-gray-600 uppercase tracking-wider">Ready ({ready.length})</span>
                    </div>
                    <div className="space-y-3">
                        <AnimatePresence>
                            {ready.map(order => (
                                <KitchenTicket key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />
                            ))}
                        </AnimatePresence>
                        {ready.length === 0 && (
                            <div className="text-center py-8 text-gray-300">
                                <CheckCircle className="w-8 h-8 mx-auto mb-1 opacity-30" />
                                <p className="text-xs font-semibold">No orders ready</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
