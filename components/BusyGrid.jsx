'use client';

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Check, X, Plus, Trash2, Settings, AlertCircle, Copy, FunctionSquare, Zap } from 'lucide-react';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import { getDomainColors } from '@/lib/domainColors';
import { useBusyMode } from '@/lib/context/BusyModeContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { readGridCellValue } from '@/lib/utils/inventoryGridColumns';
import { isSuggestibleInventoryColumn } from '@/lib/utils/inventoryFieldSuggestions';
import { inventoryGridRowKey, inventoryValidationErrorKey } from '@/lib/utils/inventoryRowKey';
import { isNumericInventoryCell } from '@/lib/utils/inventoryGridCellTypes';
import { resolveExcelMobileColumnWidth } from '@/lib/utils/inventoryExcelMobile';
import { MOBILE_NO_ZOOM_TEXT } from '@/lib/utils/formMobileStyles';

/**
 * BusyGrid Component
 * A high-density, keyboard-navigable data grid inspired by Busy.in/Excel.
 */
function rowStableKey(row, rowIndex) {
    return inventoryGridRowKey(row, rowIndex);
}

function columnWidth(col, colIndex, columnWidths, touchOptimized = false) {
    const mobileWidth = resolveExcelMobileColumnWidth(col, touchOptimized);
    if (mobileWidth != null) return mobileWidth;
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
    /** Optional: (accessorKey, row) => string[] for datalist autocomplete */
    getFieldSuggestions,
    /** Dense spreadsheet layout: light gridlines, compact rows, stable row order (no column sort). */
    variant = 'default',
    /** Dense spreadsheet on desktop; larger touch targets below lg. */
    touchOptimized = false,
}) {
    const { language } = useLanguage();
    const t = translations[language];
    const colors = getDomainColors(category);

    const { isBusyMode } = useBusyMode();
    const isExcel = variant === 'excel';
    const isBusyVariant = variant === 'busy';
    const excelRowHeight = touchOptimized && isExcel
        ? 'h-11 min-h-11 max-h-11'
        : isExcel
          ? 'h-[26px] min-h-[26px] max-h-[26px]'
          : '';
    const excelHeaderHeight = touchOptimized && isExcel ? 'h-10 min-h-10' : isExcel ? 'h-7' : '';
    /** Rapid entry: Excel modal, inventory Busy view, or global Busy mode */
    const isDataEntryMode = isExcel || isBusyVariant || isBusyMode;
    const didAutoFocusRef = useRef(false);
    const prevDataLenRef = useRef(0);
    const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [columnWidths, setColumnWidths] = useState({});
    const [contextMenu, setContextMenu] = useState(null);
    // { rowKey, colIndex } → flash green after successful save
    const [flashCell, setFlashCell] = useState(null);
    const flashTimerRef = useRef(null);

    const gridRef = useRef(null);
    const inputRef = useRef(null);
    const scrollRef = useRef(null);
    /** Enter/Tab already committed, ignore the blur that follows so we do not double-fire `onCellEdit`. */
    const skipNextBlurSaveRef = useRef(false);
    /** Latest grid dimensions for Tab/Enter navigation without stale closures. */
    const navContextRef = useRef({ columns, sortedData: [], getValue: () => '', onCellEdit: null, isExcel: false });

    const getValue = useCallback((row, accessor) => {
        if (!accessor || !row) return '';
        return readGridCellValue(row, accessor, category);
    }, [category]);

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

    navContextRef.current = { columns, sortedData, getValue, onCellEdit, isExcel };

    const columnSuggestionLists = useMemo(() => {
        if (!getFieldSuggestions) return {};
        const map = {};
        columns.forEach((col) => {
            const key = col.accessorKey;
            if (!key || col.readOnly || !isSuggestibleInventoryColumn(key)) return;
            const merged = new Set();
            sortedData.forEach((row) => {
                getFieldSuggestions(key, row).forEach((s) => merged.add(s));
            });
            if (merged.size === 0) {
                getFieldSuggestions(key, {}).forEach((s) => merged.add(s));
            }
            map[key] = [...merged];
        });
        return map;
    }, [columns, sortedData, getFieldSuggestions]);

    const isEditableColumn = useCallback((colIndex) => {
        const col = columns[colIndex];
        if (!col?.accessorKey || col.readOnly) return false;
        if (col.id === 'status_dot' || col.accessorKey === '__actions') return false;
        return true;
    }, [columns]);

    const findNextEditableCell = useCallback((startRow, startCol, direction = 1) => {
        const maxSteps = Math.max(1, sortedData.length * columns.length);
        let row = startRow;
        let col = startCol;
        for (let step = 0; step < maxSteps; step += 1) {
            col += direction;
            if (col >= columns.length) {
                row += 1;
                col = 0;
            } else if (col < 0) {
                row -= 1;
                col = columns.length - 1;
            }
            if (row < 0 || row >= sortedData.length) {
                return { row: startRow, col: startCol };
            }
            if (isEditableColumn(col)) {
                return { row, col };
            }
        }
        return { row: startRow, col: startCol };
    }, [columns.length, sortedData.length, isEditableColumn]);

    /** Busy inventory: flash only after parent confirms persist (InventoryManager dispatches). */
    useEffect(() => {
        if (isExcel) return undefined;
        const BUSY_CELL_SAVED = 'tenvo:inventory-busy-cell-saved';
        const onSaved = (e) => {
            const { rowKey, field } = e.detail || {};
            if (rowKey == null || rowKey === '' || !field) return;
            const colIndex = columns.findIndex((c) => c.accessorKey === field);
            if (colIndex < 0) return;
            const rowIndex = sortedData.findIndex(
                (row) =>
                    (row.id != null && String(row.id) === String(rowKey)) ||
                    (row._tempId != null && String(row._tempId) === String(rowKey))
            );
            if (rowIndex < 0) return;
            const rk = rowStableKey(sortedData[rowIndex], rowIndex);
            const flashKey = `${rk}_${colIndex}`;
            clearTimeout(flashTimerRef.current);
            setFlashCell(flashKey);
            flashTimerRef.current = setTimeout(() => setFlashCell(null), 600);
        };
        window.addEventListener(BUSY_CELL_SAVED, onSaved);
        return () => window.removeEventListener(BUSY_CELL_SAVED, onSaved);
    }, [isExcel, columns, sortedData]);

    const handleSort = (key) => {
        if (variant === 'excel') return;
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const moveSelection = useCallback((dRow, dCol) => {
        setSelectedCell((prev) => {
            if (dRow === 0 && dCol !== 0) {
                return findNextEditableCell(prev.row, prev.col, dCol > 0 ? 1 : -1);
            }
            let newRow = prev.row + dRow;
            let newCol = prev.col + dCol;
            if (newCol >= columns.length) {
                if (newRow < sortedData.length - 1) {
                    newRow += 1;
                    newCol = 0;
                } else {
                    newCol = columns.length - 1;
                }
            } else if (newCol < 0) {
                if (newRow > 0) {
                    newRow -= 1;
                    newCol = columns.length - 1;
                } else {
                    newCol = 0;
                }
            }
            if (newRow < 0) newRow = 0;
            if (newRow >= sortedData.length) newRow = Math.max(0, sortedData.length - 1);
            if (!isEditableColumn(newCol)) {
                const dir = dRow > 0 ? 1 : dRow < 0 ? -1 : dCol >= 0 ? 1 : -1;
                return findNextEditableCell(prev.row, prev.col, dir);
            }
            return { row: newRow, col: newCol };
        });
    }, [columns.length, sortedData.length, findNextEditableCell, isEditableColumn]);

    const beginEditingAt = useCallback((cell, initialChar = null) => {
        if (!cell || sortedData.length === 0) return;
        if (!isEditableColumn(cell.col)) return;
        const colDef = columns[cell.col];
        const row = sortedData[cell.row];
        if (!colDef?.accessorKey || !row) return;
        const val = getValue(row, colDef.accessorKey);
        setSelectedCell(cell);
        setEditingCell(cell);
        setEditValue(initialChar !== null ? initialChar : val);
    }, [sortedData, columns, getValue, isEditableColumn]);

    const advanceSelection = useCallback((direction, autoEdit = false) => {
        setSelectedCell((prev) => {
            const next = findNextEditableCell(prev.row, prev.col, direction);
            if (autoEdit) {
                queueMicrotask(() => {
                    beginEditingAt(next);
                    gridRef.current?.focus({ preventScroll: true });
                });
            }
            return next;
        });
    }, [findNextEditableCell, beginEditingAt]);

    const handleCellClick = useCallback((rowIndex, colIndex, col) => {
        const cell = { row: rowIndex, col: colIndex };
        if (col.readOnly || !col.accessorKey) {
            setSelectedCell(cell);
            gridRef.current?.focus({ preventScroll: true });
            return;
        }
        if (isDataEntryMode) {
            beginEditingAt(cell);
            return;
        }
        if (
            selectedCell.row === rowIndex &&
            selectedCell.col === colIndex &&
            !editingCell
        ) {
            beginEditingAt(cell);
        } else {
            setSelectedCell(cell);
            gridRef.current?.focus({ preventScroll: true });
        }
    }, [isDataEntryMode, selectedCell, editingCell, beginEditingAt]);

    const clearSelectedCell = useCallback(() => {
        if (!isEditableColumn(selectedCell.col)) return;
        const colDef = columns[selectedCell.col];
        const row = sortedData[selectedCell.row];
        if (!colDef?.accessorKey || !row) return;
        const empty = isNumericInventoryCell(colDef.accessorKey) ? 0 : '';
        onCellEdit?.(row, colDef.accessorKey, empty);
    }, [selectedCell, columns, sortedData, isEditableColumn, onCellEdit]);

    const fillDownFromSelected = useCallback(() => {
        if (!isEditableColumn(selectedCell.col)) return;
        const colDef = columns[selectedCell.col];
        const row = sortedData[selectedCell.row];
        const below = sortedData[selectedCell.row + 1];
        if (!colDef?.accessorKey || !row || !below) return;
        const val = getValue(row, colDef.accessorKey);
        onCellEdit?.(below, colDef.accessorKey, val ?? '');
    }, [selectedCell, columns, sortedData, isEditableColumn, onCellEdit, getValue]);

    const startEditing = useCallback((initialChar = null) => {
        beginEditingAt(selectedCell, initialChar);
    }, [selectedCell, beginEditingAt]);

    const saveEdit = useCallback((forcedValue = undefined) => {
        if (!editingCell) return;
        const colDef = columns[editingCell.col];
        const row = sortedData[editingCell.row];
        if (!colDef?.accessorKey || !row) return;
        const finalValue = forcedValue !== undefined ? forcedValue : editValue;
        const flashKey = `${rowStableKey(row, editingCell.row)}_${editingCell.col}`;
        onCellEdit?.(row, colDef.accessorKey, finalValue);
        setEditingCell(null);
        if (isExcel) {
            clearTimeout(flashTimerRef.current);
            setFlashCell(flashKey);
            flashTimerRef.current = setTimeout(() => setFlashCell(null), 600);
        }
    }, [editingCell, columns, sortedData, editValue, onCellEdit, isExcel]);

    const commitAndAdvance = useCallback((rawValue, moveAfter) => {
        const cell = editingCell;
        if (!cell) return;

        skipNextBlurSaveRef.current = true;

        const { columns: cols, sortedData: rows, getValue: readVal, onCellEdit: onEdit, isExcel: excel } =
            navContextRef.current;
        const colDef = cols[cell.col];
        const row = rows[cell.row];
        if (colDef?.accessorKey && row) {
            const flashKey = `${rowStableKey(row, cell.row)}_${cell.col}`;
            onEdit?.(row, colDef.accessorKey, rawValue);
            if (excel) {
                clearTimeout(flashTimerRef.current);
                setFlashCell(flashKey);
                flashTimerRef.current = setTimeout(() => setFlashCell(null), 600);
            }
        }

        setEditingCell(null);

        let nextCell = { row: cell.row, col: cell.col };
        if (moveAfter === 'tab') {
            nextCell = findNextEditableCell(cell.row, cell.col, 1);
        } else if (moveAfter === 'tab-back') {
            nextCell = findNextEditableCell(cell.row, cell.col, -1);
        } else if (moveAfter === 'enter') {
            const belowRow = cell.row + 1;
            if (belowRow < rows.length && isEditableColumn(cell.col)) {
                nextCell = { row: belowRow, col: cell.col };
            }
        }

        setSelectedCell(nextCell);

        queueMicrotask(() => {
            skipNextBlurSaveRef.current = false;
            if (!moveAfter) return;
            const ncol = cols[nextCell.col];
            if (!ncol?.accessorKey || ncol.readOnly) return;
            const nrow = rows[nextCell.row];
            if (!nrow) return;
            setEditingCell(nextCell);
            setEditValue(readVal(nrow, ncol.accessorKey) ?? '');
            gridRef.current?.focus({ preventScroll: true });
        });
    }, [editingCell, findNextEditableCell, isEditableColumn]);

    const handleTouchNextField = useCallback(() => {
        if (editingCell) {
            commitAndAdvance(editValue, 'tab');
            return;
        }
        advanceSelection(1, true);
    }, [editingCell, editValue, commitAndAdvance, advanceSelection]);

    useLayoutEffect(() => {
        if (!editingCell) return;
        const input = inputRef.current;
        if (!input) return;
        input.focus();
        input.select();
    }, [editingCell]);

    useEffect(() => {
        if (!touchOptimized || !isExcel) return;
        const target = editingCell || selectedCell;
        const el = scrollRef.current?.querySelector(
            `[data-busy-cell="${target.row}-${target.col}"]`
        );
        el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }, [selectedCell, editingCell, touchOptimized, isExcel]);

    useEffect(() => {
        if (didAutoFocusRef.current || sortedData.length === 0) return;
        didAutoFocusRef.current = true;
        const id = requestAnimationFrame(() => {
            gridRef.current?.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(id);
    }, [sortedData.length]);

    useEffect(() => {
        if (variant !== 'busy' || sortedData.length === 0) return;
        const prevLen = prevDataLenRef.current;
        if (sortedData.length === prevLen + 1) {
            const lastRow = sortedData[sortedData.length - 1];
            if (lastRow?._tempId && !lastRow.id) {
                const firstEditable = columns.findIndex(
                    (c) => c.accessorKey && !c.readOnly && c.id !== 'status_dot' && c.accessorKey !== '__actions'
                );
                const targetCol = firstEditable >= 0 ? firstEditable : 0;
                const newRowIndex = sortedData.length - 1;
                setSelectedCell({ row: newRowIndex, col: targetCol });
                queueMicrotask(() => {
                    setEditingCell({ row: newRowIndex, col: targetCol });
                    setEditValue(getValue(lastRow, columns[targetCol]?.accessorKey) ?? '');
                    gridRef.current?.focus({ preventScroll: true });
                });
            }
        }
        prevDataLenRef.current = sortedData.length;
    }, [sortedData, variant, columns, getValue]);

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
            const cellEl = scrollRef.current.querySelector(
                `[data-busy-cell="${selectedCell.row}-${selectedCell.col}"]`
            );
            cellEl?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }, [selectedCell.row, selectedCell.col]);

    const handleMouseDown = (e, colIndex) => {
        e.preventDefault();
        const startX = e.pageX;
        const startWidth = columnWidths[colIndex] || columnWidth(columns[colIndex], colIndex, columnWidths, touchOptimized);
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
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                if (document.activeElement !== inputRef.current) {
                    e.preventDefault();
                    if (e.key === 'Tab') {
                        commitAndAdvance(editValue, e.shiftKey ? 'tab-back' : 'tab');
                    } else {
                        commitAndAdvance(editValue, 'enter');
                    }
                }
                return;
            }
            return;
        }

        switch (e.key) {
            case 'Tab':
                e.preventDefault();
                advanceSelection(e.shiftKey ? -1 : 1, isDataEntryMode);
                break;
            case 'ArrowUp': e.preventDefault(); moveSelection(-1, 0); break;
            case 'ArrowDown': e.preventDefault(); moveSelection(1, 0); break;
            case 'ArrowLeft': e.preventDefault(); moveSelection(0, -1); break;
            case 'ArrowRight': e.preventDefault(); moveSelection(0, 1); break;
            case 'Home': e.preventDefault(); if (e.ctrlKey) setSelectedCell({ row: 0, col: 0 }); else setSelectedCell(prev => ({ ...prev, col: 0 })); break;
            case 'End': e.preventDefault(); if (e.ctrlKey) setSelectedCell({ row: sortedData.length - 1, col: columns.length - 1 }); else setSelectedCell(prev => ({ ...prev, col: columns.length - 1 })); break;
            case 'PageUp': e.preventDefault(); moveSelection(-10, 0); break;
            case 'PageDown': e.preventDefault(); moveSelection(10, 0); break;
            case 'F2':
                e.preventDefault();
                startEditing();
                break;
            case 'Enter':
                if (e.altKey) {
                    e.preventDefault();
                    onRowClick?.(sortedData[selectedCell.row]);
                    break;
                }
                if (e.shiftKey) { e.preventDefault(); onAddRow?.(); }
                else { e.preventDefault(); startEditing(); }
                break;
            case 'Backspace':
                if (!editingCell && isEditableColumn(selectedCell.col)) {
                    e.preventDefault();
                    clearSelectedCell();
                }
                break;
            case 'Delete':
                if (e.ctrlKey) {
                    e.preventDefault();
                    onDeleteRow?.(sortedData[selectedCell.row]);
                } else if (!editingCell && isEditableColumn(selectedCell.col)) {
                    e.preventDefault();
                    clearSelectedCell();
                }
                break;
            case 'Insert':
                e.preventDefault();
                onAddRow?.();
                break;
            case 'n':
            case 'N':
                // Ctrl+Shift+N (Ctrl+N is reserved by the browser) or Alt+N adds a new row
                if ((e.ctrlKey && e.shiftKey) || e.altKey) {
                    e.preventDefault();
                    onAddRow?.();
                }
                break;
            case 'c': if (e.ctrlKey) { e.preventDefault(); copyToClipboard(); } break;
            case 'v': if (e.ctrlKey) { e.preventDefault(); pasteFromClipboard(); } break;
            case 'd':
            case 'D':
                if (e.ctrlKey && !e.shiftKey && isEditableColumn(selectedCell.col)) {
                    e.preventDefault();
                    const colDef = columns[selectedCell.col];
                    const row = sortedData[selectedCell.row];
                    const below = sortedData[selectedCell.row + 1];
                    if (colDef?.accessorKey && row && below) {
                        const val = getValue(row, colDef.accessorKey);
                        onCellEdit?.(below, colDef.accessorKey, val ?? '');
                    }
                }
                break;
            default:
                if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) startEditing(e.key);
                break;
        }
    }, [selectedCell, editingCell, editValue, sortedData, columns, onAddRow, onDeleteRow, onRowClick, copyToClipboard, pasteFromClipboard, moveSelection, startEditing, commitAndAdvance, advanceSelection, isDataEntryMode, isEditableColumn, clearSelectedCell]);

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
                    <div className="bg-white border px-3 h-7 flex items-center font-semibold text-[10px] text-indigo-600 rounded shadow-sm">
                        {headerLetters[selectedCell.col]}{selectedCell.row + 1}
                    </div>
                    <div className="text-slate-400 font-semibold px-1 italic flex items-center gap-1">
                        <FunctionSquare className="w-3.5 h-3.5" />
                        <span>=</span>
                    </div>
                    <div
                        className="flex-1 bg-white border border-slate-200 h-7 rounded px-3 flex items-center text-xs font-medium text-slate-700 shadow-sm overflow-hidden truncate cursor-text hover:border-indigo-300 transition-colors"
                        role="button"
                        tabIndex={-1}
                        title="Click to edit selected cell"
                        onClick={() => {
                            if (!editingCell && isEditableColumn(selectedCell.col)) {
                                beginEditingAt(selectedCell);
                            }
                        }}
                    >
                        {editingCell ? editValue : (getValue(sortedData[selectedCell.row], columns[selectedCell.col]?.accessorKey) || '')}
                    </div>
                    <div className="flex items-center gap-2 px-2">
                        <Zap className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-tighter">Command Engine Active</span>
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
                                        ? cn('w-8 min-w-[32px] max-w-[32px] border-gray-300 bg-[#dfe4ea] p-0 text-[10px]', touchOptimized && 'w-10 min-w-[40px] max-w-[40px] text-xs')
                                        : 'h-10 w-10 border-gray-300 bg-gray-200/80 text-[10px] text-gray-500'
                                )}
                                style={isExcel ? { width: 32, minWidth: 32, maxWidth: 32 } : undefined}
                            >
                                #
                            </th>
                            {columns.map((col, idx) => {
                                const width = columnWidth(col, idx, columnWidths, touchOptimized);
                                const headerLabel = typeof col.header === 'function' ? col.header() : col.header;
                                return (
                                    <th
                                        key={col.accessorKey || idx}
                                        className={cn(
                                            'relative box-border border-r border-b p-0 text-left align-middle',
                                            isExcel
                                                ? cn('border-gray-300 bg-[#eceff2]', excelHeaderHeight)
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
                                                    className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border border-gray-400 bg-white font-mono text-[10px] font-bold leading-none text-gray-700"
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
                                                <span className="text-[10px] font-bold text-gray-400 transition-colors group-hover:text-blue-600">
                                                    {headerLetters[idx]}
                                                </span>
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-gray-700">
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
                                                ? cn('border-gray-300 bg-[#dfe4ea] text-[10px] leading-none group-hover:text-blue-700', excelRowHeight, touchOptimized && 'w-10 min-w-[40px] max-w-[40px] text-xs')
                                                : 'w-10 border-gray-100 bg-gray-50/50 text-[10px] text-gray-400 group-hover:text-blue-500',
                                            onRowClick && !isExcel && 'cursor-pointer hover:bg-blue-50'
                                        )}
                                        style={isExcel ? { width: 32, minWidth: 32, maxWidth: 32 } : undefined}
                                        title={onRowClick && !isExcel ? 'Double-click to open full product form' : undefined}
                                        onDoubleClick={(e) => {
                                            if (!onRowClick || isExcel) return;
                                            e.stopPropagation();
                                            onRowClick(row);
                                        }}
                                    >
                                        {rowIndex + 1}
                                    </td>
                                    {columns.map((col, colIndex) => {
                                        const isSelected = selectedCell.row === rowIndex && selectedCell.col === colIndex;
                                        const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                                        const width = columnWidth(col, colIndex, columnWidths, touchOptimized);
                                        const fieldKey = col.accessorKey;
                                        const validationMessage =
                                            (fieldKey &&
                                                (validationErrors[inventoryValidationErrorKey(row, rowIndex, fieldKey)] ||
                                                    validationErrors[`${rk}-${fieldKey}`] ||
                                                    validationErrors[`idx-${rowIndex}-${fieldKey}`] ||
                                                    validationErrors[`${rowIndex}-${fieldKey}`])) ||
                                            false;
                                        const hasError = Boolean(validationMessage);

                                        const cellFlashKey = `${rk}_${colIndex}`;
                                        const isFlashing = flashCell === cellFlashKey;
                                        const suggestListId =
                                            getFieldSuggestions &&
                                            col.accessorKey &&
                                            (columnSuggestionLists[col.accessorKey]?.length ?? 0) > 0
                                                ? `busy-suggest-${col.accessorKey.replace(/\./g, '-')}`
                                                : undefined;
                                        return (
                                            <td
                                                key={colIndex}
                                                data-busy-cell={`${rowIndex}-${colIndex}`}
                                                className={cn(
                                                    'relative box-border border-r border-b p-0 align-middle transition-all duration-150',
                                                    isExcel
                                                        ? cn('border-gray-300', excelRowHeight)
                                                        : 'h-10 border-gray-100',
                                                    !isExcel && isBusyMode && 'h-8',
                                                    isSelected &&
                                                        !isEditing &&
                                                        cn(
                                                            'z-10 ring-2 ring-inset ring-blue-500',
                                                            isExcel ? 'bg-sky-100/85' : 'bg-indigo-50/30'
                                                        ),
                                                    col.readOnly && (isExcel ? 'bg-gray-50/80' : 'bg-gray-50/10'),
                                                    hasError && 'bg-red-50/60 ring-1 ring-inset ring-red-300',
                                                    isFlashing && '!bg-green-100 !ring-2 !ring-inset !ring-green-400'
                                                )}
                                                style={{ width }}
                                                onClick={() => handleCellClick(rowIndex, colIndex, col)}
                                                onDoubleClick={() => {
                                                    if (!isDataEntryMode && !col.readOnly && col.accessorKey) {
                                                        beginEditingAt({ row: rowIndex, col: colIndex });
                                                    }
                                                }}
                                            >
                                                {isEditing ? (
                                                    <div className="absolute inset-0 z-40 p-0.5">
                                                        <input
                                                            ref={inputRef}
                                                            type="text"
                                                            inputMode={
                                                                isNumericInventoryCell(col.accessorKey) ? 'decimal' : 'text'
                                                            }
                                                            autoComplete="off"
                                                            list={suggestListId}
                                                            spellCheck={false}
                                                            aria-label={`Edit ${col.accessorKey}`}
                                                            className={cn(
                                                                'z-50 h-full w-full bg-white font-medium text-gray-900 outline-none ring-2 ring-blue-600',
                                                                isExcel ? cn('px-2', touchOptimized ? MOBILE_NO_ZOOM_TEXT : 'text-xs') : 'px-2.5 text-sm shadow-xl'
                                                            )}
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => {
                                                                if (skipNextBlurSaveRef.current) return;
                                                                saveEdit();
                                                                queueMicrotask(() => {
                                                                    gridRef.current?.focus({ preventScroll: true });
                                                                });
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    commitAndAdvance(e.currentTarget.value, 'enter');
                                                                } else if (e.key === 'Tab') {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    commitAndAdvance(
                                                                        e.currentTarget.value,
                                                                        e.shiftKey ? 'tab-back' : 'tab'
                                                                    );
                                                                } else if (e.key === 'Escape') {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setEditingCell(null);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={cn(
                                                            'relative flex w-full min-w-0 items-center truncate transition-colors',
                                                            isExcel
                                                                ? cn('max-h-[44px] px-2 py-0 leading-tight [&>div]:gap-0 [&>div]:py-0', touchOptimized ? 'h-11 text-sm' : 'h-[26px] text-[11px]')
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
                                                                title={typeof validationMessage === 'string' ? validationMessage : 'Invalid'}
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
                    isExcel ? (touchOptimized ? 'min-h-12' : 'h-7 min-h-[28px]') : 'h-8'
                )}
            >
                <div className="flex flex-1 items-center gap-3 overflow-hidden px-3 sm:gap-4 sm:px-4">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Items</span>
                        <span className="font-mono text-[10px] font-semibold text-gray-900 tabular-nums">{sortedData.length}</span>
                    </div>
                    <div className="h-3 w-px bg-gray-200" />
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cell</span>
                        <span className="font-mono text-[10px] font-semibold text-blue-600 tabular-nums">
                            {headerLetters[selectedCell.col]}
                            {selectedCell.row + 1}
                        </span>
                    </div>
                    {isExcel && !touchOptimized && (
                        <>
                            <div className="h-3 w-px bg-gray-200 hidden sm:block" />
                            <span className="hidden text-[10px] text-gray-500 sm:inline">Sort disabled · row order = save order</span>
                        </>
                    )}
                    {Object.keys(validationErrors).length > 0 && (
                        <div className="flex animate-pulse items-center gap-1.5 text-red-600">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-[10px] font-bold uppercase">{Object.keys(validationErrors).length} err</span>
                        </div>
                    )}
                </div>
                {touchOptimized && isExcel ? (
                    <div className="flex h-full items-stretch gap-1 border-l border-gray-200 bg-white/90 px-2 py-1">
                        {[
                            { label: 'Next', action: handleTouchNextField },
                            { label: 'New row', action: () => onAddRow?.() },
                            { label: 'Fill down', action: fillDownFromSelected },
                            { label: 'Clear', action: clearSelectedCell },
                        ].map((btn) => (
                            <button
                                key={btn.label}
                                type="button"
                                onClick={btn.action}
                                className="min-h-10 min-w-[4.5rem] rounded-lg border border-gray-200 bg-white px-2 text-[11px] font-semibold text-gray-700 active:bg-blue-50"
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="ml-auto hidden h-full items-center gap-2 border-l border-gray-200 bg-gray-50/80 px-2 sm:flex">
                        {[
                            { k: 'Tab', l: 'Save+next' },
                            { k: 'F2', l: 'Edit' },
                            { k: 'Insert', l: 'New row' },
                            { k: 'Ctrl+D', l: 'Fill down' },
                            { k: '↵', l: 'Down' },
                            { k: 'Bksp', l: 'Clear' },
                        ].map((btn) => (
                            <div key={btn.k} className="flex items-center gap-0.5 opacity-70">
                                <kbd className="rounded border border-gray-200 bg-white px-1 font-mono text-[10px] font-bold text-gray-600">
                                    {btn.k}
                                </kbd>
                                <span className="text-[10px] font-bold uppercase tracking-tight text-gray-500">{btn.l}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {contextMenu && (
                <div className="fixed z-[100] bg-white border border-gray-200 shadow-2xl rounded-lg py-1 w-48 font-sans overflow-hidden" style={{ top: contextMenu.y, left: contextMenu.x }} onContextMenu={(e) => e.preventDefault()}>
                    {onRowClick && (
                        <button type="button" className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm text-gray-700" onClick={() => { onRowClick(sortedData[contextMenu.rowIndex]); setContextMenu(null); }}>
                            <Settings className="w-4 h-4 text-blue-500" />
                            <div className="flex flex-col"><span className="font-bold">Edit full form</span><span className="text-[10px] text-gray-400">Alt+Enter</span></div>
                        </button>
                    )}
                    {onAdvancedSettings && (
                        <button type="button" className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm text-gray-700" onClick={() => { onAdvancedSettings(sortedData[contextMenu.rowIndex]); setContextMenu(null); }}>
                            <Zap className="w-4 h-4 text-indigo-500" />
                            <div className="flex flex-col"><span className="font-bold">Advanced settings</span></div>
                        </button>
                    )}
                    {(onRowClick || onAdvancedSettings) && <div className="border-t my-1" />}
                    <button type="button" className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm text-gray-700" onClick={copyToClipboard}><Copy className="w-4 h-4 text-gray-400" /><div className="flex flex-col"><span className="font-bold">Copy</span><span className="text-[10px] text-gray-400">CTRL+C</span></div></button>
                    <button className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm text-gray-700" onClick={pasteFromClipboard}><Plus className="w-4 h-4 text-blue-500" /><div className="flex flex-col"><span className="font-bold">Paste</span><span className="text-[10px] text-gray-400">CTRL+V</span></div></button>
                    <button className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm text-gray-700" onClick={() => { onAddRow?.(sortedData[contextMenu.rowIndex]); setContextMenu(null); }}><Copy className="w-4 h-4 text-green-500" /><div className="flex flex-col"><span className="font-bold">Duplicate</span></div></button>
                    <div className="border-t my-1" />
                    <button className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-3 text-sm text-red-600" onClick={() => { onDeleteRow?.(sortedData[contextMenu.rowIndex]); setContextMenu(null); }}><Trash2 className="w-4 h-4" /><div className="flex flex-col"><span className="font-bold">Delete</span><span className="text-[10px] text-red-400">DEL</span></div></button>
                </div>
            )}
            {Object.entries(columnSuggestionLists).map(([accessorKey, options]) => (
                <datalist key={accessorKey} id={`busy-suggest-${accessorKey.replace(/\./g, '-')}`}>
                    {options.map((opt) => (
                        <option key={opt} value={opt} />
                    ))}
                </datalist>
            ))}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
}
