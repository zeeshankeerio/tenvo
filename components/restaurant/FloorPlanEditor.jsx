'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Save, Trash2, Maximize2, Minimize2, Move,
    Layers, Grid3X3, Users, Settings2, Info, CheckCircle2,
    UtensilsCrossed, Layout, MapPin, TabletSmartphone,
    MousePointer2, Hand, ZoomIn, ZoomOut, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

// --- Constants & Types -------------------------------------------------------

const TABLE_SHAPES = [
    { key: 'square', label: 'Square', icon: Grid3X3, w: 60, h: 60 },
    { key: 'rectangle', label: 'Rectangle', icon: Layout, w: 100, h: 60 },
    { key: 'circle', label: 'Circle', icon: RefreshCw, w: 60, h: 60, rounded: true },
];

const GRID_SIZE = 20;

// Static class map for Tailwind JIT -- zone colors
const ZONE_COLOR_CLASSES = {
    indigo: 'bg-indigo-600 text-white shadow-lg shadow-indigo-200',
    emerald: 'bg-emerald-600 text-white shadow-lg shadow-emerald-200',
    amber: 'bg-amber-600 text-white shadow-lg shadow-amber-200',
    blue: 'bg-blue-600 text-white shadow-lg shadow-blue-200',
    red: 'bg-red-600 text-white shadow-lg shadow-red-200',
    green: 'bg-green-600 text-white shadow-lg shadow-green-200',
    purple: 'bg-wine-600 text-white shadow-lg shadow-wine-200',
};

// --- FloorPlanEditor Component -----------------------------------------------

export function FloorPlanEditor({
    businessId,
    initialZones = [],
    initialTables = [],
    onSave,
}) {
    const [zones, setZones] = useState(initialZones.length > 0 ? initialZones : [
        { id: '1', name: 'Main Hall', color: 'indigo' },
        { id: '2', name: 'Outdoor', color: 'emerald' },
        { id: '3', name: 'VIP Area', color: 'amber' },
    ]);
    const [activeZoneId, setActiveZoneId] = useState(zones[0]?.id || '1');
    const [tables, setTables] = useState(initialTables.length > 0 ? initialTables : []);
    const [selectedTableId, setSelectedTableId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

    const activeZone = useMemo(() => zones.find(z => z.id === activeZoneId), [zones, activeZoneId]);
    const zoneTables = useMemo(() => tables.filter(t => t.zone_id === activeZoneId), [tables, activeZoneId]);

    // --- Handlers ------------------------------------------------------------

    const handleAddTable = useCallback((shapeKey) => {
        const shape = TABLE_SHAPES.find(s => s.key === shapeKey);
        const newTable = {
            id: `table-${Date.now()}`,
            name: `T${tables.length + 1}`,
            zone_id: activeZoneId,
            shape: shapeKey,
            x: 100,
            y: 100,
            width: shape.w,
            height: shape.h,
            capacity: 4,
            status: 'available',
        };
        setTables(prev => [...prev, newTable]);
        setSelectedTableId(newTable.id);
    }, [tables.length, activeZoneId]);

    const handleUpdateTable = useCallback((id, updates) => {
        setTables(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }, []);

    const handleDeleteTable = useCallback((id) => {
        setTables(prev => prev.filter(t => t.id !== id));
        setSelectedTableId(null);
    }, []);

    const handleSaveLayout = useCallback(async () => {
        setIsSaving(true);
        try {
            await onSave?.({ zones, tables });
        } catch (err) {
            console.error('Failed to save floor plan:', err);
        } finally {
            setIsSaving(false);
        }
    }, [zones, tables, onSave]);

    // --- Renderers -----------------------------------------------------------

    const selectedTable = useMemo(() => tables.find(t => t.id === selectedTableId), [tables, selectedTableId]);

    return (
        <div className="flex flex-col h-[700px] border border-gray-200 rounded-3xl bg-white overflow-hidden shadow-2xl">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                        {zones.map(zone => (
                            <button
                                key={zone.id}
                                onClick={() => setActiveZoneId(zone.id)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-black transition-all",
                                    activeZoneId === zone.id
                                        ? (ZONE_COLOR_CLASSES[zone.color] || 'bg-gray-600 text-white shadow-lg shadow-gray-200')
                                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                {zone.name}
                            </button>
                        ))}
                        <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="h-8 w-px bg-gray-200 mx-2" />

                    <div className="flex items-center gap-1">
                        {TABLE_SHAPES.map(shape => (
                            <TooltipProvider key={shape.key}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleAddTable(shape.key)}
                                            className="w-9 h-9 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                                        >
                                            <shape.icon className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-[10px] font-bold">Add {shape.label} Table</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-100">
                        <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 rounded-lg">
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                        <span className="text-[10px] font-black w-10 text-center">{Math.round(zoom * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="h-8 w-8 rounded-lg">
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                    </div>
                    <Button
                        onClick={handleSaveLayout}
                        disabled={isSaving}
                        className="h-10 rounded-xl from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-100 font-bold px-6 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Floor Plan</>}
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Canvas Area */}
                <div className="flex-1 relative bg-gray-100/50 overflow-hidden cursor-crosshair">
                    {/* Grid Background */}
                    <div
                        className="absolute inset-0 opacity-[0.03]"
                        style={{
                            backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
                            backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`
                        }}
                    />

                    {/* Table Render Container */}
                    <div
                        className="absolute inset-0 p-10"
                        style={{ transform: `scale(${zoom})`, transformOrigin: '0 0 transition-transform duration-200' }}
                    >
                        {zoneTables.map(table => (
                            <motion.div
                                key={table.id}
                                drag
                                dragMomentum={false}
                                onDragEnd={(_, info) => {
                                    handleUpdateTable(table.id, {
                                        x: Math.round(table.x + info.offset.x),
                                        y: Math.round(table.y + info.offset.y)
                                    });
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTableId(table.id);
                                }}
                                className={cn(
                                    "absolute flex flex-col items-center justify-center cursor-move p-2 transition-shadow",
                                    selectedTableId === table.id && "ring-2 ring-indigo-500 ring-offset-4 shadow-2xl z-50",
                                    table.shape === 'circle' ? "rounded-full" : "rounded-xl",
                                    "bg-white border-2",
                                    selectedTableId === table.id ? "border-indigo-500" : "border-gray-300"
                                )}
                                style={{
                                    left: table.x,
                                    top: table.y,
                                    width: table.width,
                                    height: table.height,
                                }}
                            >
                                <UtensilsCrossed className={cn("w-4 h-4 mb-0.5", selectedTableId === table.id ? "text-indigo-500" : "text-gray-400")} />
                                <span className="text-[10px] font-black text-gray-900">{table.name}</span>
                                <div className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 shadow-sm text-[8px] font-bold text-gray-500">
                                    {table.capacity}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Empty State Overlay */}
                    {zoneTables.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                                <Hand className="w-8 h-8 text-indigo-400 opacity-50" />
                            </div>
                            <p className="text-sm font-black text-gray-900">Start Arranging</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Select a table shape from above to begin</p>
                        </div>
                    )}
                </div>

                {/* Sidebar Controls */}
                <div className="w-80 border-l border-gray-100 bg-white p-6 overflow-y-auto">
                    {selectedTable ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Table Settings</h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteTable(selectedTable.id)}
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Table Name</label>
                                    <Input
                                        value={selectedTable.name}
                                        onChange={(e) => handleUpdateTable(selectedTable.id, { name: e.target.value })}
                                        className="h-10 rounded-xl text-sm font-bold"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Capacity</label>
                                        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                            <button
                                                onClick={() => handleUpdateTable(selectedTable.id, { capacity: Math.max(1, selectedTable.capacity - 1) })}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border border-gray-100 bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                -
                                            </button>
                                            <span className="flex-1 text-center text-xs font-black">{selectedTable.capacity}</span>
                                            <button
                                                onClick={() => handleUpdateTable(selectedTable.id, { capacity: selectedTable.capacity + 1 })}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border border-gray-100 bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Shape</label>
                                        <div className="flex items-center gap-2 h-10 px-3 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold capitalize">
                                            {selectedTable.shape}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Width (px)</label>
                                        <Input
                                            type="number"
                                            value={selectedTable.width}
                                            onChange={(e) => handleUpdateTable(selectedTable.id, { width: parseInt(e.target.value) || 0 })}
                                            className="h-10 rounded-xl text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Height (px)</label>
                                        <Input
                                            type="number"
                                            value={selectedTable.height}
                                            onChange={(e) => handleUpdateTable(selectedTable.id, { height: parseInt(e.target.value) || 0 })}
                                            className="h-10 rounded-xl text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-2">
                                    <div className="flex items-center gap-2 text-indigo-700">
                                        <Move className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Positioning</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] text-indigo-600 font-bold">
                                        <p>X: {Math.round(selectedTable.x)}px</p>
                                        <p>Y: {Math.round(selectedTable.y)}px</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                                <MousePointer2 className="w-6 h-6 text-gray-300" />
                            </div>
                            <h3 className="text-sm font-black text-gray-900">Selection Tool</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 px-4 leading-relaxed">
                                CLICK A TABLE ON THE CANVAS TO MODIFY ITS SETTINGS OR MOVE IT AROUND
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

