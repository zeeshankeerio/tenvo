'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Smile, Command } from 'lucide-react';
import { useBusyMode } from '@/lib/context/BusyModeContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * GlobalBusyToggle
 * A premium switcher that activates High-Density / Busy Mode.
 * Designed for the Tenvo 2026 'Command Center' aesthetic.
 */
export function GlobalBusyToggle() {
    const { isBusyMode, toggleBusyMode } = useBusyMode();

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        onClick={toggleBusyMode}
                        className={cn(
                            "relative h-10 w-24 rounded-full p-1 cursor-pointer transition-all duration-500 overflow-hidden",
                            isBusyMode
                                ? "bg-indigo-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_0_15px_rgba(79,70,229,0.4)]"
                                : "bg-slate-200 dark:bg-slate-800 shadow-inner"
                        )}
                    >
                        {/* Animated Background Pulse for Busy Mode */}
                        {isBusyMode && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-wine-500 to-indigo-500 opacity-20"
                                style={{ backgroundSize: '200% 100%' }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                        )}

                        {/* Slider Knob */}
                        <motion.div
                            animate={{ x: isBusyMode ? 56 : 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className={cn(
                                "relative z-10 h-8 w-8 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300",
                                isBusyMode ? "bg-white text-indigo-600" : "bg-white text-slate-400"
                            )}
                        >
                            {isBusyMode ? (
                                <Zap className="w-4 h-4 fill-indigo-600" />
                            ) : (
                                <Smile className="w-4 h-4" />
                            )}
                        </motion.div>

                        {/* Icons Labels */}
                        <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
                            <Smile className={cn("w-3.5 h-3.5 transition-opacity", isBusyMode ? "opacity-30 text-white" : "opacity-0")} />
                            <div className="flex flex-col items-center">
                                <span className={cn("text-[10px] font-semibold uppercase tracking-tighter transition-colors", isBusyMode ? "text-white/50" : "text-slate-400")}>
                                    {isBusyMode ? "BUSY" : "EASY"}
                                </span>
                            </div>
                            <Zap className={cn("w-3.5 h-3.5 transition-opacity", isBusyMode ? "opacity-0" : "opacity-30")} />
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 text-white border-slate-800">
                    <div className="flex flex-col gap-1">
                        <span className="font-semibold text-[10px] uppercase tracking-widest">
                            {isBusyMode ? "Disable Command Center" : "Enable Command Center"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                            (Shift + B) to toggle density
                        </span>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

