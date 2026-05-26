'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UtensilsCrossed, Clock, Users, ChefHat, Plus, Eye, AlertTriangle,
    CheckCircle2, Timer, Flame, ChevronDown, RotateCcw, Maximize, Minimize
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
    available: { color: 'bg-emerald-500', label: 'Available', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    occupied: { color: 'bg-red-500', label: 'Occupied', text: 'text-red-700', bg: 'bg-red-50 border-red-200' },
    reserved: { color: 'bg-amber-500', label: 'Reserved', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    maintenance: { color: 'bg-gray-400', label: 'Maintenance', text: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
};

function getTimerColor(seconds) {
    if (seconds < 300) return 'text-emerald-500'; // < 5 min
    if (seconds < 600) return 'text-amber-500';   // 5-10 min
    return 'text-red-500';                          // > 10 min
}

function formatElapsed(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
}

// --- Table Card --------------------------------------------------------------

function TableCard({ table, onAction }) {
    const status = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
    return (
        <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={cn(
                'relative p-4 rounded-xl border-2 cursor-pointer transition-all',
                status.bg, 'hover:shadow-lg'
            )}
            onClick={() => onAction?.(table)}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-black text-gray-900">{table.table_number}</span>
                <span className={cn('w-3 h-3 rounded-full', status.color)} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Users className="w-3 h-3" />
                <span>{table.capacity} seats</span>
            </div>
            {table.section && (
                <Badge variant="outline" className="mt-2 text-[10px]">{table.section}</Badge>
            )}
            {table.status === 'occupied' && table.current_order_number && (
                <div className="mt-2 pt-2 border-t border-gray-200/60">
                    <p className="text-[10px] font-semibold text-gray-600">{table.current_order_number}</p>
                    {table.current_order_total && (
                        <p className="text-xs font-black text-indigo-600">Rs.{parseFloat(table.current_order_total).toLocaleString()}</p>
                    )}
                </div>
            )}
        </motion.div>
    );
}

// --- Kitchen Order Ticket ----------------------------------------------------

function KitchenTicket({ order, onStatusUpdate }) {
    const elapsed = order.seconds_elapsed || 0;
    const timerColor = getTimerColor(elapsed);
    const isRush = order.priority > 0;

    return (
        <Card className={cn(
            'border-2 overflow-hidden transition-all',
            isRush ? 'border-orange-400 shadow-orange-100' : 'border-gray-200',
            order.status === 'preparing' && 'border-blue-300 bg-blue-50/30'
        )}>
            <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-900">{order.order_number}</span>
                        {isRush && (
                            <Badge className="bg-orange-500 text-white text-[9px] px-1.5">
                                <Flame className="w-2.5 h-2.5 mr-0.5" /> Rush
                            </Badge>
                        )}
                    </div>
                    <div className={cn('flex items-center gap-1 text-xs font-bold', timerColor)}>
                        <Timer className="w-3 h-3" />
                        {formatElapsed(elapsed)}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    {order.table_number ? (
                        <span>Table {order.table_number}</span>
                    ) : (
                        <span>Takeaway</span>
                    )}
                    <span>*</span>
                    <span>{order.order_type}</span>
                </div>

                {/* Items */}
                <div className="space-y-1">
                    {(() => {
                        let items = [];
                        try {
                            items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
                        } catch (e) {
                            console.error("Failed to parse order items:", e);
                            items = [];
                        }
                        return items.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="font-bold text-gray-700">{item.quantity || item.qty || 1}×</span>
                                <span className="text-gray-800">{item.name || item.item_name || item.product_name || 'Item'}</span>
                                {item.mods?.length > 0 && (
                                    <span className="text-[9px] text-gray-400">+{item.mods.map(m => m.name).join(', ')}</span>
                                )}
                            </div>
                        ));
                    })()}
                    {order.special && (
                        <p className="text-[10px] text-amber-600 italic">⚠ {order.special}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 pt-1">
                    {order.status === 'pending' && (
                        <Button
                            size="sm"
                            className="flex-1 h-7 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => onStatusUpdate(order.id, 'preparing')}
                        >
                            <ChefHat className="w-3 h-3 mr-1" /> Start
                        </Button>
                    )}
                    {order.status === 'preparing' && (
                        <Button
                            size="sm"
                            className="flex-1 h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => onStatusUpdate(order.id, 'ready')}
                        >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
                        </Button>
                    )}
                    {order.status === 'ready' && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-[10px] font-bold"
                            onClick={() => onStatusUpdate(order.id, 'completed')}
                        >
                            Done
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// --- Main Restaurant Manager -------------------------------------------------

export function RestaurantManager({
    businessId,
    tables = [],
    kitchenQueue = [],
    onTableAction,
    onNewOrder,
    onKitchenStatusUpdate,
    onRefresh,
}) {
    const [section, setSection] = useState('all');
    const [kdsStation, setKdsStation] = useState('all');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = React.useRef(null);

    // --- Fullscreen Logic ----------------------------------------------------

    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const filteredTables = section === 'all'
        ? tables
        : tables.filter(t => t.section?.toLowerCase() === section.toLowerCase());

    const filteredQueue = kdsStation === 'all'
        ? kitchenQueue
        : kitchenQueue.filter(k => k.station?.toLowerCase() === kdsStation.toLowerCase());

    const stats = {
        available: tables.filter(t => t.status === 'available').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length,
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "flex gap-4 bg-gray-50 transition-all",
                isFullscreen ? "h-screen w-screen p-4 overflow-hidden" : "h-[calc(100vh-120px)]"
            )}
        >
            {/* Left: Floor Plan */}
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-bold text-gray-900">Floor Plan</h2>
                        <div className="flex items-center gap-2">
                            {Object.entries(STATUS_CONFIG).slice(0, 3).map(([key, cfg]) => (
                                <div key={key} className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <span className={cn('w-2 h-2 rounded-full', cfg.color)} />
                                    {stats[key] || 0}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {['all', 'indoor', 'outdoor', 'vip'].map(s => (
                            <button
                                key={s}
                                onClick={() => setSection(s)}
                                className={cn(
                                    'px-3 py-1 rounded-full text-[10px] font-semibold transition-all',
                                    section === s
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                                )}
                            >
                                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleFullscreen}
                            className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 mr-2"
                        >
                            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                {/* Table Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {filteredTables.map(table => (
                            <TableCard key={table.id} table={table} onAction={onTableAction} />
                        ))}
                        {filteredTables.length === 0 && (
                            <div className="col-span-full py-16 text-center text-gray-400">
                                <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No tables configured</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                    <Button
                        onClick={onNewOrder}
                        className="bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold shadow-lg shadow-indigo-200"
                    >
                        <Plus className="w-4 h-4 mr-1" /> New Order
                    </Button>
                    <Button variant="outline" onClick={onRefresh} className="rounded-xl text-xs">
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Refresh
                    </Button>
                </div>
            </div>

            {/* Right: KDS Queue */}
            <div className="w-[350px] xl:w-[380px] flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <ChefHat className="w-4 h-4 text-orange-500" />
                        <h2 className="text-sm font-bold text-gray-900">Kitchen Queue</h2>
                        <Badge variant="secondary" className="text-[10px]">{filteredQueue.length}</Badge>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-50 overflow-x-auto">
                    {['all', 'grill', 'fryer', 'salad', 'bar'].map(s => (
                        <button
                            key={s}
                            onClick={() => setKdsStation(s)}
                            className={cn(
                                'px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap',
                                kdsStation === s
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            )}
                        >
                            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    <AnimatePresence>
                        {filteredQueue.map(order => (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <KitchenTicket
                                    order={order}
                                    onStatusUpdate={(id, status) => onKitchenStatusUpdate?.({ kitchenOrderId: id, status, businessId })}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {filteredQueue.length === 0 && (
                        <div className="py-16 text-center text-gray-400">
                            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">All caught up! [CELEBRATION]</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
