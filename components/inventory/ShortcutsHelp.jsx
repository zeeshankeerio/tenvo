'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard, Command, MousePointer2, Zap, LayoutGrid, Table } from 'lucide-react';

export function ShortcutsHelp({ isOpen, onClose }) {
    const shortcutGroups = [
        {
            title: "Global Navigation",
            icon: <LayoutGrid className="w-4 h-4" />,
            shortcuts: [
                { keys: ["Alt", "1-5"], action: "Switch Main Tabs" },
                { keys: ["Alt", "V"], action: "Visual table view" },
                { keys: ["Alt", "B"], action: "Busy grid view (inventory tab)" },
                { keys: ["Alt", "C"], action: "Cards view (mobile-friendly)" },
            ]
        },
        {
            title: "Excel Mode (full-screen)",
            icon: <Table className="w-4 h-4" />,
            shortcuts: [
                { keys: ["Ctrl", "S"], action: "Save all changes" },
                { keys: ["Ctrl", "Z"], action: "Undo" },
                { keys: ["Ctrl", "Y"], action: "Redo" },
                { keys: ["Ctrl", "D"], action: "Duplicate last row (Excel modal)" },
                { keys: ["Typeahead"], action: "Name, SKU, brand, category, domain fields suggest as you type" },
            ]
        },
        {
            title: "Data Entry (Busy / Excel grid)",
            icon: <Table className="w-4 h-4" />,
            shortcuts: [
                { keys: ["Click"], action: "Edit cell" },
                { keys: ["Arrows"], action: "Navigate cells" },
                { keys: ["Enter"], action: "Edit cell / move down" },
                { keys: ["Esc"], action: "Cancel editing" },
                { keys: ["Tab"], action: "Save and next cell" },
                { keys: ["F2"], action: "Edit selected cell" },
                { keys: ["Ctrl", "Shift", "N"], action: "Add new inline row" },
                { keys: ["Shift", "Enter"], action: "Add new row" },
                { keys: ["Ctrl", "D"], action: "Fill value into cell below" },
                { keys: ["Backspace"], action: "Clear cell" },
                { keys: ["Ctrl", "Delete"], action: "Delete row" },
                { keys: ["Ctrl", "C"], action: "Copy cell value" },
                { keys: ["Ctrl", "V"], action: "Paste cell value" },
            ]
        },
        {
            title: "Command Center toggle",
            icon: <Zap className="w-4 h-4" />,
            shortcuts: [
                { keys: ["Global Busy"], action: "Formula bar density (not the same as Busy grid view)" },
            ]
        },
        {
            title: "Product Form",
            icon: <Zap className="w-4 h-4" />,
            shortcuts: [
                { keys: ["Alt", "1-4"], action: "Switch Form Tabs" },
                { keys: ["Esc"], action: "Close Form" },
            ]
        }
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="bg-wine p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Keyboard className="w-24 h-24" />
                    </div>
                    <DialogTitle className="text-3xl font-semibold tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Command className="w-6 h-6" />
                        </div>
                        Shortcuts
                    </DialogTitle>
                    <DialogDescription className="text-wine-100 font-medium mt-2">
                        Master the keyboard for high-speed data entry and navigation.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8 space-y-8 max-h-[60vh] overflow-auto custom-scrollbar">
                    {shortcutGroups.map((group, idx) => (
                        <div key={idx} className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
                                {group.icon}
                                {group.title}
                            </div>
                            <div className="grid gap-3">
                                {group.shortcuts.map((s, sIdx) => (
                                    <div key={sIdx} className="flex items-center justify-between group">
                                        <span className="text-sm font-bold text-gray-700 group-hover:text-wine transition-colors">
                                            {s.action}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {s.keys.map((key, kIdx) => (
                                                <React.Fragment key={kIdx}>
                                                    <kbd className="min-w-[24px] h-7 px-2 flex items-center justify-center bg-gray-100 border-b-2 border-gray-300 rounded-md font-mono text-[10px] font-semibold text-gray-600 shadow-sm leading-none">
                                                        {key}
                                                    </kbd>
                                                    {kIdx < s.keys.length - 1 && <span className="text-xs text-gray-300 font-bold">+</span>}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-gray-50 p-6 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <MousePointer2 className="w-3 h-3" />
                        Most shortcuts work in all views
                    </div>
                    <Badge className="bg-wine/10 text-wine border-wine/20 font-semibold text-[10px] uppercase">
                        Alpha v1.2
                    </Badge>
                </div>
            </DialogContent>
        </Dialog>
    );
}
