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
function rowStableKey(row, rowIndex) {
    if (!row) return `__${rowIndex}`;
    return row.id || row._tempId || `__${rowIndex}`;
}

function columnWidth(col, colIndex, columnWidths) {
    return columnWidths[colIndex] ?? col.width ?? col.size ?? 120;
}

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
    validationErrors = {}, // Added for visual feedback
    /** Dense spreadsheet layout: light gridlines, compact rows, stable row order (no column sort). */
    variant = 'default',
}) {
    const { language } = useLanguage();
    const t = translations[language];
    const colors = getDomainColors(category);

    const { isBusyMode } = useBusyMode();
    const isExcel = variant === 'excel';
    const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [columnWidths, setColumnWidths] = useState({});
    const [contextMenu, setContextMenu] = useState(null);

    const gridRef = useRef(null);
    const inputRef = useRef(null);
    const scrollRef = useRef(null);
    /** Enter/Tab already committed — ignore the blur that follows so we do not double-fire `onCellEdit`. */
    const skipNextBlurSaveRef = useRef(false);

    const getValue = useCallback((row, accessor) => {
        if (!accessor) return '';
        if (!row) return '';
        let raw;
        if (accessor.includes('.')) {
            raw = accessor.split('.').reduce((o, i) => (o ? o[i] : undefined), row);
        } else {
            raw = row[accessor];
        }
        if (raw == null || raw === '') return '';
        if (typeof raw === 'object' && typeof raw.toNumber === 'function') {
            const n = raw.toNumber();
            return Number.isFinite(n) ? n : '';
        }
        return raw;
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
        if (variant === 'excel') return data;
        if (!sortConfig.key) return data;
        const sorted = [...data].sort((a, b) => {
            const aVal = getValue(a, sortConfig.key);
            const bVal = getValue(b, sortConfig.key);
            if (typeof aVal === 'number' && typeof bVal === 'number') return aVal - bVal;
            return String(aVal).localeCompare(String(bVal));
        });
        return sortConfig.direction === 'asc' ? sorted : sorted.reverse();
    }, [data, sortConfig, getValue, variant]);

    const handleSort = (key) => {
        if (variant === 'excel') return;
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
        if (colDef.readOnly || !colDef.accessorKey) return;
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
        const startWidth = columnWidths[colIndex] || columnWidth(columns[colIndex], colIndex, columnWidths);
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

    const commitEditFromInput = (rawValue, { moveAfter } = {}) => {
        skipNextBlurSaveRef.current = true;
        saveEdit(rawValue);
        if (moveAfter === 'tab') {
            moveSelection(0, 1);
            requestAnimationFrame(() => startEditing());
        } else if (moveAfter === 'tab-back') {
            moveSelection(0, -1);
            requestAnimationFrame(() => startEditing());
        } else if (moveAfter === 'enter') {
            moveSelection(0, 1);
            requestAnimationFrame(() => startEditing());
        }
        queueMicrotask(() => {
            skipNextBlurSaveRef.current = false;
        });
    };

    return (
        <div
            className={cn(
                'border bg-white shadow-sm overflow-hidden flex flex-col h-full select-none font-mono',
                isExcel ? 'border-gray-300 text-xs' : 'border-gray-300 text-sm',
                className
            )}
            tabIndex={0}
            ref={gridRef}
            onKeyDown={handleKeyDown}
            style={{ outline: 'none' }}
        >
            {/* Liquid-Style Formula Bar (Busy Mode Only) */}
            {isBusyMode && (
                <div className={cn('bg-slate-50 border-b border-slate-200 p-1.5 flex items-center gap-2 shadow-inner', isExcel ? 'h-8' : 'h-10')}>
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
                <table className="w-full border-separate border-spacing-0 table-fixed">
                    <thead className="sticky top-0 z-30">
                        <tr
                            className={cn(
                                'shadow-sm',
                                isExcel ? 'border-b border-gray-300 bg-[#eceff2]' : 'border-b border-gray-300 bg-gray-100/95 backdrop-blur-sm'
                            )}
                        >
                            <th
                                className={cn(
                                    'sticky left-0 z-40 box-border shrink-0 border-r border-b text-center font-mono font-bold leading-none text-gray-600',
                                    isExcel
                                        ? 'h-7 w-8 min-w-[32px] max-w-[32px] border-gray-300 bg-[#dfe4ea] p-0 text-[9px]'
                                        : 'h-10 w-10 border-gray-300 bg-gray-200/80 text-[10px] text-gray-500'
                                )}
                                style={isExcel ? { width: 32, minWidth: 32, maxWidth: 32 } : undefined}
                            >
                                #
                            </th>
                            {columns.map((col, idx) => {
                                const width = columnWidth(col, idx, columnWidths);
                                const headerLabel = typeof col.header === 'function' ? col.header() : col.header;
                                return (
                                    <th
                                        key={col.accessorKey || idx}
                                        className={cn(
                                            'relative box-border border-r border-b p-0 text-left align-middle',
                                            isExcel
                                                ? 'h-7 border-gray-300 bg-[#eceff2]'
                                                : 'h-10 border-gray-300 bg-gray-100/95'
                                        )}
                                        style={{ width }}
                                    >
                                        {isExcel ? (
                                            <div
                                                className="flex h-full min-h-[28px] w-full min-w-0 items-center gap-1 px-1.5 py-0"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <span
                                                    className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border border-gray-400 bg-white font-mono text-[9px] font-bold leading-none text-gray-700"
                                                    title={`Column ${headerLetters[idx]}`}
                                                >
                                                    {headerLetters[idx]}
                                                </span>
                                                <span className="min-w-0 flex-1 truncate pr-1 text-left text-[10px] font-bold uppercase leading-tight tracking-tight text-gray-800">
                                                    {headerLabel}
                                                </span>
                                            </div>
                                        ) : (
                                            <div
                                                className={cn(
                                                    'flex h-full w-full cursor-pointer flex-col justify-center gap-0.5 px-3 py-0.5',
                                                    'group transition-colors hover:bg-gray-200/80'
                                                )}
                                                onClick={() => col.accessorKey && handleSort(col.accessorKey)}
                                            >
                                                <span className="text-[8px] font-bold text-gray-400 transition-colors group-hover:text-blue-600">
                                                    {headerLetters[idx]}
                                                </span>
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span className="truncate text-[10px] font-black uppercase tracking-widest text-gray-700">
                                                        {headerLabel}
                                                    </span>
                                                    {sortConfig.key === col.accessorKey && (
                                                        <span className="shrink-0">
                                                            {sortConfig.direction === 'asc' ? (
                                                                <ChevronUp className="h-3 w-3 text-blue-600" />
                                                            ) : (
                                                                <ChevronDown className="h-3 w-3 text-blue-600" />
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <div
                                            className="absolute bottom-0 right-0 top-0 z-20 w-1 cursor-col-resize hover:bg-blue-500/40"
                                            onMouseDown={(e) => handleMouseDown(e, idx)}
                                            aria-hidden
                                        />
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, rowIndex) => {
                            const isSelectedRow = selectedCell.row === rowIndex;
                            const rk = rowStableKey(row, rowIndex);
                            return (
                                <tr
                                    key={rk}
                                    id={`row-${rowIndex}`}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setContextMenu({ x: e.pageX, y: e.pageY, rowIndex });
                                        setSelectedCell({ row: rowIndex, col: selectedCell.col });
                                    }}
                                    className={cn(
                                        'group transition-colors',
                                        isExcel && (rowIndex % 2 === 0 ? 'bg-white' : 'bg-[#f6f7f9]'),
                                        !isExcel && isSelectedRow && 'bg-blue-50/50',
                                        !isExcel && !isSelectedRow && (rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'),
                                        !isExcel && 'hover:bg-blue-50/30',
                                        isExcel && 'hover:bg-sky-50/40'
                                    )}
                                >
                                    <td
                                        className={cn(
                                            'sticky left-0 z-20 box-border border-r border-b text-center font-mono font-bold text-gray-600 transition-colors',
                                            isExcel
                                                ? 'h-[26px] min-h-[26px] max-h-[26px] w-8 min-w-[32px] max-w-[32px] border-gray-300 bg-[#dfe4ea] text-[9px] leading-none group-hover:text-blue-700'
                                                : 'w-10 border-gray-100 bg-gray-50/50 text-[10px] text-gray-400 group-hover:text-blue-500'
                                        )}
                                        style={isExcel ? { width: 32, minWidth: 32, maxWidth: 32 } : undefined}
                                    >
                                        {rowIndex + 1}
                                    </td>
                                    {columns.map((col, colIndex) => {
                                        const isSelected = selectedCell.row === rowIndex && selectedCell.col === colIndex;
                                        const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                                        const width = columnWidth(col, colIndex, columnWidths);
                                        const hasError =
                                            (col.accessorKey &&
                                                (validationErrors[`${rk}-${col.accessorKey}`] ||
                                                    validationErrors[`${rowIndex}-${col.accessorKey}`])) ||
                                            false;

                                        return (
                                            <td
                                                key={colIndex}
                                                className={cn(
                                                    'relative box-border border-r border-b p-0 align-middle transition-all duration-150',
                                                    isExcel
                                                        ? 'h-[26px] min-h-[26px] max-h-[26px] border-gray-300'
                                                        : 'h-10 border-gray-100',
                                                    !isExcel && isBusyMode && 'h-8',
                                                    isSelected &&
                                                        !isEditing &&
                                                        cn(
                                                            'z-10 ring-2 ring-inset ring-blue-500',
                                                            isExcel ? 'bg-sky-100/85' : 'bg-indigo-50/30'
                                                        ),
                                                    col.readOnly && (isExcel ? 'bg-gray-50/80' : 'bg-gray-50/10'),
                                                    hasError && 'bg-red-50/60 ring-1 ring-inset ring-red-300'
                                                )}
                                                style={{ width }}
                                                onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                                                onDoubleClick={() => !col.readOnly && col.accessorKey && startEditing()}
                                            >
                                                {/* Smart Fill Handle (Busy Mode & Selected Only) */}
                                                {isSelected && !isEditing && isBusyMode && (
                                                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-indigo-600 border border-white z-50 cursor-crosshair shadow-sm hover:scale-125 transition-transform" />
                                                )}
                                                {isEditing ? (
                                                    <div className="absolute inset-0 z-40 p-0.5">
                                                        <input
                                                            ref={inputRef}
                                                            className={cn(
                                                                'z-50 h-full w-full bg-white font-medium text-gray-900 outline-none ring-2 ring-blue-600',
                                                                isExcel ? 'px-2 text-xs' : 'px-2.5 text-sm shadow-xl'
                                                            )}
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => {
                                                                if (skipNextBlurSaveRef.current) return;
                                                                saveEdit();
                                                            }}
                                                            onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                commitEditFromInput(e.currentTarget.value, { moveAfter: 'enter' });
                                                            } else if (e.key === 'Tab') {
                                                                e.preventDefault();
                                                                commitEditFromInput(e.currentTarget.value, { moveAfter: e.shiftKey ? 'tab-back' : 'tab' });
                                                            } else if (e.key === 'Escape') { e.preventDefault(); setEditingCell(null); }
                                                        }} autoFocus />
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={cn(
                                                            'relative flex w-full min-w-0 items-center truncate transition-colors',
                                                            isExcel
                                                                ? 'h-[26px] max-h-[26px] px-1.5 py-0 text-[11px] leading-tight [&>div]:gap-0 [&>div]:py-0'
                                                                : 'min-h-[inherit] px-3 py-1 text-sm',
                                                            col.readOnly ? 'font-medium italic text-gray-400' : 'font-medium text-gray-800',
                                                            isSelected && 'font-semibold text-blue-800',
                                                            hasError && 'text-red-600'
                                                        )}
                                                    >
                                                        {col.cell
                                                            ? col.cell({ row: { original: row }, value: getValue(row, col.accessorKey) })
                                                            : getValue(row, col.accessorKey)}
                                                        {hasError && (
                                                            <div
                                                                className="absolute right-0 top-0 h-1.5 w-1.5 rounded-bl-sm bg-red-500"
                                                                title={typeof hasError === 'string' ? hasError : 'Invalid'}
                                                            />
                                                        )}
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

            <div
                className={cn(
                    'z-40 flex items-center border-t border-gray-200 bg-slate-50 p-0 shadow-sm',
                    isExcel ? 'h-7 min-h-[28px]' : 'h-8'
                )}
            >
                <div className="flex flex-1 items-center gap-4 overflow-hidden px-3 sm:px-4">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Items</span>
                        <span className="font-mono text-[10px] font-black text-gray-900 tabular-nums">{sortedData.length}</span>
                    </div>
                    <div className="h-3 w-px bg-gray-200" />
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Cell</span>
                        <span className="font-mono text-[10px] font-black text-blue-600 tabular-nums">
                            {headerLetters[selectedCell.col]}
                            {selectedCell.row + 1}
                        </span>
                    </div>
                    {isExcel && (
                        <>
                            <div className="h-3 w-px bg-gray-200 hidden sm:block" />
                            <span className="hidden text-[9px] text-gray-500 sm:inline">Sort disabled · row order = save order</span>
                        </>
                    )}
                    {Object.keys(validationErrors).length > 0 && (
                        <div className="flex animate-pulse items-center gap-1.5 text-red-600">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-[9px] font-bold uppercase">{Object.keys(validationErrors).length} err</span>
                        </div>
                    )}
                </div>
                <div className="ml-auto flex h-full items-center gap-2 border-l border-gray-200 bg-gray-50/80 px-2">
                    {[
                        { k: 'F2', l: 'Add row' },
                        { k: '⇧↵', l: 'New' },
                        { k: '↵', l: 'Edit' },
                        { k: 'Del', l: 'Del row' },
                    ].map((btn) => (
                        <div key={btn.k} className="flex items-center gap-0.5 opacity-70">
                            <kbd className="rounded border border-gray-200 bg-white px-1 font-mono text-[8px] font-bold text-gray-600">
                                {btn.k}
                            </kbd>
                            <span className="text-[8px] font-bold uppercase tracking-tight text-gray-500">{btn.l}</span>
                        </div>
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
