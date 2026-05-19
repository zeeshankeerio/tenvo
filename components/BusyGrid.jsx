'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Check, X, Plus, Trash2, Settings, AlertCircle, Copy, Sigma, FunctionSquare, Zap } from 'lucide-react';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import { getDomainColors } from '@/lib/domainColors';
import { useBusyMode } from '@/lib/context/BusyModeContext';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * BusyGrid Component
 * A high-density, keyboard-navigable data grid inspired by Busy.in/Excel.
 */
export function BusyGrid({
    data = [],
    columns = [],
    onRowClick,
    onCellEdit,
    onAddRow,
    onDeleteRow,
    onAdvancedSettings,
    className,
    category = 'retail-shop',
    validationErrors = {} // Added for visual feedback
}) {
    const { language } = useLanguage();
    const t = translations[language];
    const colors = getDomainColors(category);

    const { isBusyMode } = useBusyMode();
    const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [columnWidths, setColumnWidths] = useState({});
    const [contextMenu, setContextMenu] = useState(null);

    const gridRef = useRef(null);
    const inputRef = useRef(null);
    const scrollRef = useRef(null);

    const getValue = useCallback((row, accessor) => {
        if (!accessor) return '';
        if (!row) return '';
        if (accessor.includes('.')) {
            return accessor.split('.').reduce((o, i) => (o ? o[i] : undefined), row) ?? '';
        }
        return row[accessor] ?? '';
    }, []);

    const getColumnLetter = (index) => {
        let letter = '';
        while (index >= 0) {
            letter = String.fromCharCode((index % 26) + 65) + letter;
            index = Math.floor(index / 26) - 1;
        }
        return letter;
    };

    const headerLetters = useMemo(() => columns.map((_, i) => getColumnLetter(i)), [columns]);

    const sortedData = useMemo(() => {
        if (!sortConfig.key) return data;
        const sorted = [...data].sort((a, b) => {
            const aVal = getValue(a, sortConfig.key);
            const bVal = getValue(b, sortConfig.key);
            if (typeof aVal === 'number' && typeof bVal === 'number') return aVal - bVal;
            return String(aVal).localeCompare(String(bVal));
        });
        return sortConfig.direction === 'asc' ? sorted : sorted.reverse();
    }, [data, sortConfig, getValue]);

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const moveSelection = (dRow, dCol) => {
        setSelectedCell(prev => {
            let newRow = prev.row + dRow;
            let newCol = prev.col + dCol;
            if (newCol >= columns.length) {
                if (newRow < sortedData.length - 1) { newRow += 1; newCol = 0; }
                else newCol = columns.length - 1;
            } else if (newCol < 0) {
                if (newRow > 0) { newRow -= 1; newCol = columns.length - 1; }
                else newCol = 0;
            }
            if (newRow < 0) newRow = 0;
            if (newRow >= sortedData.length) newRow = sortedData.length - 1;
            return { row: newRow, col: newCol };
        });
    };

    const startEditing = (initialChar = null) => {
        if (sortedData.length === 0) return;
        const colDef = columns[selectedCell.col];
        if (colDef.readOnly) return;
        const row = sortedData[selectedCell.row];
        let val = getValue(row, colDef.accessorKey);
        setEditingCell(selectedCell);
        setEditValue(initialChar !== null ? initialChar : val);
    };

    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingCell]);

    useEffect(() => {
        if (selectedCell.row >= 0 && scrollRef.current) {
            const rowElement = document.getElementById(`row-${selectedCell.row}`);
            if (rowElement && scrollRef.current) {
                const container = scrollRef.current;
                const rowTop = rowElement.offsetTop;
                const rowHeight = rowElement.offsetHeight;
                const containerScrollTop = container.scrollTop;
                const containerHeight = container.offsetHeight;
                const headerHeight = 40;
                if (rowTop < containerScrollTop + headerHeight) container.scrollTop = rowTop - headerHeight;
                else if (rowTop + rowHeight > containerScrollTop + containerHeight) container.scrollTop = rowTop + rowHeight - containerHeight;
            }
        }
    }, [selectedCell.row]);

    const handleMouseDown = (e, colIndex) => {
        e.preventDefault();
        const startX = e.pageX;
        const startWidth = columnWidths[colIndex] || columns[colIndex].width || 120;
        const handleMouseMove = (moveEvent) => {
            const newWidth = Math.max(50, startWidth + (moveEvent.pageX - startX));
            setColumnWidths(prev => ({ ...prev, [colIndex]: newWidth }));
        };
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const copyToClipboard = useCallback(() => {
        const colDef = columns[selectedCell.col];
        const row = sortedData[selectedCell.row];
        if (!row) return;
        const val = getValue(row, colDef.accessorKey);
        navigator.clipboard.writeText(String(val));
        setContextMenu(null);
    }, [selectedCell, sortedData, columns, getValue, setContextMenu]);

    const pasteFromClipboard = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            const colDef = columns[selectedCell.col];
            const row = sortedData[selectedCell.row];
            if (!row) return;
            if (!colDef.readOnly) onCellEdit?.(row, colDef.accessorKey, text);
        } catch (err) { console.error(err); }
        setContextMenu(null);
    }, [selectedCell, sortedData, columns, onCellEdit, setContextMenu]);

    const handleKeyDown = useCallback((e) => {
        if (editingCell) {
            if (e.key === 'Escape') {
                e.preventDefault();
                setEditingCell(null);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowUp': e.preventDefault(); moveSelection(-1, 0); break;
            case 'ArrowDown': e.preventDefault(); moveSelection(1, 0); break;
            case 'ArrowLeft': e.preventDefault(); moveSelection(0, -1); break;
            case 'ArrowRight': e.preventDefault(); moveSelection(0, 1); break;
            case 'Home': e.preventDefault(); if (e.ctrlKey) setSelectedCell({ row: 0, col: 0 }); else setSelectedCell(prev => ({ ...prev, col: 0 })); break;
            case 'End': e.preventDefault(); if (e.ctrlKey) setSelectedCell({ row: sortedData.length - 1, col: columns.length - 1 }); else setSelectedCell(prev => ({ ...prev, col: columns.length - 1 })); break;
            case 'PageUp': e.preventDefault(); moveSelection(-10, 0); break;
            case 'PageDown': e.preventDefault(); moveSelection(10, 0); break;
            case 'F2': e.preventDefault(); onAddRow?.(); break;
            case 'Enter':
                if (e.shiftKey) { e.preventDefault(); onAddRow?.(); }
                else { e.preventDefault(); startEditing(); }
                break;
            case 'Delete': if (!editingCell) { e.preventDefault(); onDeleteRow?.(sortedData[selectedCell.row]); } break;
            case 'c': if (e.ctrlKey) { e.preventDefault(); copyToClipboard(); } break;
            case 'v': if (e.ctrlKey) { e.preventDefault(); pasteFromClipboard(); } break;
            default:
                if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) startEditing(e.key);
                break;
        }
    }, [selectedCell, editingCell, sortedData, columns, onAddRow, onDeleteRow, onCellEdit, copyToClipboard, pasteFromClipboard, moveSelection, startEditing]);

    const saveEdit = (forcedValue = undefined) => {
        if (!editingCell) return;
        const colDef = columns[editingCell.col];
        const row = sortedData[editingCell.row];
        const finalValue = forcedValue !== undefined ? forcedValue : editValue;
        onCellEdit?.(row, colDef.accessorKey, finalValue);
        setEditingCell(null);
    };

    return (
        <div
            className={cn("border border-gray-300 bg-white shadow-sm overflow-hidden flex flex-col h-full select-none font-mono text-sm", className)}
            tabIndex={0}
            ref={gridRef}
            onKeyDown={handleKeyDown}
            style={{ outline: 'none' }}
        >
            {/* Liquid-Style Formula Bar (Busy Mode Only) */}
            {isBusyMode && (
                <div className="bg-slate-50 border-b border-slate-200 p-1.5 flex items-center gap-2 h-10 shadow-inner">
                    <div className="bg-white border px-3 h-7 flex items-center font-black text-[10px] text-indigo-600 rounded shadow-sm">
                        {headerLetters[selectedCell.col]}{selectedCell.row + 1}
                    </div>
                    <div className="text-slate-400 font-black px-1 italic flex items-center gap-1">
                        <FunctionSquare className="w-3.5 h-3.5" />
                        <span>=</span>
                    </div>
                    <div className="flex-1 bg-white border border-slate-200 h-7 rounded px-3 flex items-center text-xs font-medium text-slate-700 shadow-sm overflow-hidden truncate">
                        {editingCell ? editValue : (getValue(sortedData[selectedCell.row], columns[selectedCell.col]?.accessorKey) || '')}
                    </div>
                    <div className="flex items-center gap-2 px-2">
                        <Zap className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Command Engine Active</span>
                    </div>
                </div>
            )}

            <div ref={scrollRef} className="flex-1 overflow-auto bg-white custom-scrollbar relative">
                <table className="w-full table-fixed border-separate border-spacing-0">
                    <thead className="sticky top-0 z-30">
                        <tr className="bg-gray-100/95 backdrop-blur-sm shadow-sm">
                            <th className="w-10 h-10 border-r border-b border-gray-300 bg-gray-200/50 sticky left-0 z-40 flex-shrink-0 flex items-center justify-center text-[10px] text-gray-500 font-mono">#</th>
                            {columns.map((col, idx) => {
                                const width = columnWidths[idx] || col.width || 120;
                                return (
                                    <th key={col.accessorKey || idx} className="h-10 border-r border-b border-gray-300 p-0 text-left overflow-hidden relative group hover:bg-gray-200/80 transition-colors" style={{ width }}>
                                        <div className="w-full h-full px-3 flex flex-col justify-center gap-0.5 cursor-pointer" onClick={() => col.accessorKey && handleSort(col.accessorKey)}>
                                            <span className="text-[8px] font-bold text-gray-400 group-hover:text-blue-500 transition-colors">{headerLetters[idx]}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="truncate text-[10px] font-black uppercase tracking-widest text-gray-700">{typeof col.header === 'function' ? col.header() : col.header}</span>
                                                {sortConfig.key === col.accessorKey && (
                                                    <span className="flex-shrink-0">
                                                        {sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 z-50 transition-colors" onMouseDown={(e) => handleMouseDown(e, idx)} />
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sortedData.map((row, rowIndex) => {
                            const isSelectedRow = selectedCell.row === rowIndex;
                            return (
                                <tr key={row.id || row._tempId || rowIndex} id={`row-${rowIndex}`} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.pageX, y: e.pageY, rowIndex }); setSelectedCell({ row: rowIndex, col: selectedCell.col }); }} className={cn("transition-colors group", isSelectedRow ? "bg-blue-50/50" : rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/20", "hover:bg-blue-50/30")}>
                                    <td className="w-10 text-center text-[10px] text-gray-400 font-mono bg-gray-50/50 border-r border-gray-100 sticky left-0 z-20 group-hover:text-blue-500 transition-colors">{rowIndex + 1}</td>
                                    {columns.map((col, colIndex) => {
                                        const isSelected = selectedCell.row === rowIndex && selectedCell.col === colIndex;
                                        const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                                        const width = columnWidths[colIndex] || col.width || 120;
                                        const hasError = validationErrors[`${rowIndex}-${col.accessorKey}`];

                                        return (
                                            <td
                                                key={colIndex}
                                                className={cn(
                                                    "p-0 relative h-10 border-r border-gray-100 transition-all duration-200",
                                                    isBusyMode && "h-8", // Reduced height in Busy Mode
                                                    isSelected && !isEditing && "ring-2 ring-inset ring-indigo-500 z-10 bg-indigo-50/20",
                                                    col.readOnly && "bg-gray-50/10",
                                                    hasError && "bg-red-50/50 ring-1 ring-inset ring-red-300"
                                                )}
                                                style={{ width }}
                                                onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                                                onDoubleClick={() => !col.readOnly && startEditing()}
                                            >
                                                {/* Smart Fill Handle (Busy Mode & Selected Only) */}
                                                {isSelected && !isEditing && isBusyMode && (
                                                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-indigo-600 border border-white z-50 cursor-crosshair shadow-sm hover:scale-125 transition-transform" />
                                                )}
                                                {isEditing ? (
                                                    <div className="absolute inset-0 z-40 p-0.5">
                                                        <input ref={inputRef} className="w-full h-full px-2.5 bg-white outline-none ring-2 ring-blue-600 shadow-xl font-medium text-gray-900 z-50 text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={(e) => saveEdit(e.target.value)} onKeyDown={(e) => {
                                                            if (e.key === 'Enter') { e.preventDefault(); saveEdit(e.target.value); moveSelection(0, 1); requestAnimationFrame(() => startEditing()); }
                                                            else if (e.key === 'Tab') { e.preventDefault(); saveEdit(e.target.value); moveSelection(0, e.shiftKey ? -1 : 1); requestAnimationFrame(() => startEditing()); }
                                                            else if (e.key === 'Escape') { e.preventDefault(); setEditingCell(null); }
                                                        }} autoFocus />
                                                    </div>
                                                ) : (
                                                    <div className={cn("px-3 py-1 text-sm truncate w-full h-full flex items-center transition-colors", col.readOnly ? "text-gray-400 font-medium italic" : "text-gray-700 font-medium", isSelected && "font-bold text-blue-700", hasError && "text-red-600")}>
                                                        {col.cell ? col.cell({ row: { original: row }, value: getValue(row, col.accessorKey) }) : getValue(row, col.accessorKey)}
                                                        {hasError && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-bl-sm" title={hasError} />}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {sortedData.length === 0 && (
                    <EmptyState module="products" onAction={() => document.dispatchEvent(new CustomEvent('open-quick-add'))} />
                )}
            </div>

            <div className="bg-white border-t border-gray-200 p-0 shadow-sm h-8 flex items-center z-40 bg-slate-50">
                <div className="flex-1 flex items-center px-4 gap-6 overflow-hidden">
                    <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Items:</span><span className="text-[10px] font-black font-mono text-gray-900">{data.length}</span></div>
                    <div className="h-3 w-[1px] bg-gray-200" />
                    <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cell:</span><span className="text-[10px] font-black font-mono text-blue-600">{headerLetters[selectedCell.col]}{selectedCell.row + 1}</span></div>
                    {Object.keys(validationErrors).length > 0 && (
                        <div className="flex items-center gap-2 text-red-600 animate-pulse"><AlertCircle className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">{Object.keys(validationErrors).length} Errors</span></div>
                    )}
                </div>
                <div className="flex items-center px-2 gap-3 bg-gray-50 border-l h-full ml-auto">
                    {[{ k: 'F2', l: 'Add' }, { k: 'Shift+ENT', l: 'New Row' }, { k: 'ENT', l: 'Edit' }, { k: 'ESC', l: 'Close' }].map(btn => (
                        <div key={btn.k} className="flex items-center gap-1 opacity-60"><kbd className="bg-white border px-1 rounded text-[8px] font-bold">{btn.k}</kbd><span className="text-[8px] font-bold uppercase tracking-tight text-gray-500">{btn.l}</span></div>
                    ))}
                </div>
            </div>

            {contextMenu && (
                <div className="fixed z-[100] bg-white border border-gray-200 shadow-2xl rounded-lg py-1 w-48 font-sans overflow-hidden" style={{ top: contextMenu.y, left: contextMenu.x }} onContextMenu={(e) => e.preventDefault()}>
                    <button className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm text-gray-700" onClick={copyToClipboard}><Copy className="w-4 h-4 text-gray-400" /><div className="flex flex-col"><span className="font-bold">Copy</span><span className="text-[10px] text-gray-400">CTRL+C</span></div></button>
                    <button className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm text-gray-700" onClick={pasteFromClipboard}><Plus className="w-4 h-4 text-blue-500" /><div className="flex flex-col"><span className="font-bold">Paste</span><span className="text-[10px] text-gray-400">CTRL+V</span></div></button>
                    <button className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm text-gray-700" onClick={() => { onAddRow?.(sortedData[contextMenu.rowIndex]); setContextMenu(null); }}><Copy className="w-4 h-4 text-green-500" /><div className="flex flex-col"><span className="font-bold">Duplicate</span></div></button>
                    <div className="border-t my-1" />
                    <button className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-3 text-sm text-red-600" onClick={() => { onDeleteRow?.(sortedData[contextMenu.rowIndex]); setContextMenu(null); }}><Trash2 className="w-4 h-4" /><div className="flex flex-col"><span className="font-bold">Delete</span><span className="text-[10px] text-red-400">DEL</span></div></button>
                </div>
            )}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
}
