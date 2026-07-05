'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Maximize2, Minimize2, Download, Save, Table2, AlertCircle, CheckCircle2, Loader2, Copy, Trash2, Eraser, Undo, Redo, Search, Sparkles, Columns, ChevronDown, Plus, LayoutGrid } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BusyGrid } from './BusyGrid';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getDomainColors } from '@/lib/domainColors';
import { resolveDomainFieldKey, normalizeKey } from '@/lib/utils/domainHelpers';
import { resolveInventoryDomainFeatures } from '@/lib/utils/inventoryDomainFeatures';
import { buildInventoryGridColumns, readGridCellValue } from '@/lib/utils/inventoryGridColumns';
import { buildNewInventoryRow, getLastRowForDefaults } from '@/lib/utils/inventoryRowDefaults';
import { mapProductField } from '@/lib/utils/productFieldMapper';
import { detectColumnMapping, applyColumnMapping } from '@/lib/utils/inventoryColumnMapping';
import { inventoryGridRowKey, inventoryValidationErrorKey } from '@/lib/utils/inventoryRowKey';
import { buildSparseHiddenColumnKeys } from '@/lib/utils/inventoryVisualColumnVisibility';
import { productSchema } from '@/lib/validation/schemas';
import toast from 'react-hot-toast';
import { useCompactViewport } from '@/lib/hooks/useCompactViewport';
import { buildExcelMobileHiddenColumnKeys } from '@/lib/utils/inventoryExcelMobile';
import { MOBILE_FORM_FOOTER } from '@/lib/utils/formMobileStyles';
import { ExcelModeMobileCardView } from '@/components/inventory/mobile/ExcelModeMobileCardView';

/** Max rows loaded into Excel modal working set (Busy/Zoho-style performance). */
const EXCEL_WORKSET_SIZE = 500;

/**
 * Enhanced ExcelModeModal - Full-screen Excel-like data entry interface
 * Includes intelligence: Smart Mapping, Undo/Redo, Inline Search, Performance Polished
 */
export function ExcelModeModal({
    isOpen,
    onClose,
    data = [],
    columns = [],
    onCellEdit,
    onAddRow,
    onDeleteRow,
    onSave,
    getFieldSuggestions,
    category = 'retail-shop',
    entityType = 'products', // Added missing prop
    title = 'Excel Data Entry',
    businessId,
    business = null,
    currencySymbol,
    domainKnowledge = null,
    countryIso = '',
}) {
    const [isFullscreen, setIsFullscreen] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [localData, setLocalData] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [hiddenCols, setHiddenCols] = useState(new Set());
    const [showColPicker, setShowColPicker] = useState(false);
    const colPickerRef = useRef(null);

    const wasOpenRef = useRef(false);
    const mobileColsAppliedRef = useRef(false);
    const [sourceTotal, setSourceTotal] = useState(0);
    const isMobileExcel = useCompactViewport();
    const [mobileViewMode, setMobileViewMode] = useState('cards');

    // History Tracking (Undo/Redo)
    const [history, setHistory] = useState([]);
    const [future, setFuture] = useState([]);

    const colors = getDomainColors(category);

    const gridColumnOptions = useMemo(
        () => ({
            currencySymbol,
            business,
            domainKnowledge,
            countryIso,
        }),
        [currencySymbol, business, domainKnowledge, countryIso]
    );

    const inventoryFeatures = useMemo(
        () => resolveInventoryDomainFeatures(category, gridColumnOptions),
        [category, gridColumnOptions]
    );

    // Sync local data when modal opens (run only on initial open transition)
    useEffect(() => {
        if (isOpen && !wasOpenRef.current) {
            const sanitizedAll = data.map(item => {
                const newItem = { ...item };
                Object.keys(newItem).forEach(key => {
                    if (newItem[key] instanceof Date) newItem[key] = newItem[key].toISOString().split('T')[0];
                    if (newItem[key] && typeof newItem[key] === 'object' && newItem[key].toDate) newItem[key] = newItem[key].toDate().toISOString().split('T')[0];
                });
                return newItem;
            });
            setSourceTotal(sanitizedAll.length);
            const initialChunk = sanitizedAll.length > EXCEL_WORKSET_SIZE
                ? sanitizedAll.slice(0, EXCEL_WORKSET_SIZE)
                : sanitizedAll;
            setLocalData(initialChunk);
            setHistory([JSON.stringify(initialChunk)]);
            setFuture([]);
            setHasUnsavedChanges(false);
            setValidationErrors({});
            const sparseKeys = buildSparseHiddenColumnKeys(
                buildInventoryGridColumns(category, { mode: 'excel', ...gridColumnOptions }),
                initialChunk,
                category
            );
            setHiddenCols(sparseKeys);
            mobileColsAppliedRef.current = false;
        }
        if (!isOpen) {
            mobileColsAppliedRef.current = false;
        }
        wasOpenRef.current = isOpen;
    }, [isOpen, data, category, gridColumnOptions]);

    // History Logic
    const pushState = useCallback((newData) => {
        const stateStr = JSON.stringify(newData);
        setHistory(prev => {
            if (prev[prev.length - 1] === stateStr) return prev;
            return [...prev.slice(-29), stateStr]; // Keep 30 steps
        });
        setFuture([]);
    }, []);

    const handleLoadMoreRows = useCallback(() => {
        const sanitizedAll = data.map(item => {
            const newItem = { ...item };
            Object.keys(newItem).forEach(key => {
                if (newItem[key] instanceof Date) newItem[key] = newItem[key].toISOString().split('T')[0];
                if (newItem[key] && typeof newItem[key] === 'object' && newItem[key].toDate) newItem[key] = newItem[key].toDate().toISOString().split('T')[0];
            });
            return newItem;
        });
        setLocalData((prev) => {
            const nextChunk = sanitizedAll.slice(prev.length, prev.length + EXCEL_WORKSET_SIZE);
            if (nextChunk.length === 0) return prev;
            const merged = [...prev, ...nextChunk];
            pushState(merged);
            return merged;
        });
    }, [data, pushState]);

    const handleUndo = useCallback(() => {
        if (history.length <= 1) return;
        const current = history[history.length - 1];
        const previous = history[history.length - 2];
        setFuture(prev => [current, ...prev]);
        setHistory(prev => prev.slice(0, -1));
        setLocalData(JSON.parse(previous));
        setHasUnsavedChanges(true);
        toast.success('Undo successful', { duration: 1000, icon: '↩️' });
    }, [history]);

    const handleRedo = useCallback(() => {
        if (future.length === 0) return;
        const next = future[0];
        setHistory(prev => [...prev, next]);
        setFuture(prev => prev.slice(1));
        setLocalData(JSON.parse(next));
        setHasUnsavedChanges(true);
        toast.success('Redo successful', { duration: 1000, icon: '↪️' });
    }, [future]);

    // Filtering Logic
    const filteredData = useMemo(() => {
        if (!searchQuery) return localData;
        const q = searchQuery.toLowerCase();
        return localData.filter(row =>
            Object.values(row).some(val =>
                String(val).toLowerCase().includes(q)
            )
        );
    }, [localData, searchQuery]);

    const excelFieldSuggestions = useCallback(
        (accessorKey, row) => {
            const base = getFieldSuggestions ? getFieldSuggestions(accessorKey, row) : [];
            const merged = new Set(base);
            localData.forEach((r) => {
                const val = readGridCellValue(r, accessorKey, category);
                if (val != null && String(val).trim()) merged.add(String(val).trim());
            });
            return [...merged];
        },
        [getFieldSuggestions, localData, category]
    );

    // Enhanced Columns
    const enhancedColumns = useMemo(() => {
        const isProducts = entityType === 'products' || !entityType;
        let base = isProducts
            ? [...buildInventoryGridColumns(category, { mode: 'excel', ...gridColumnOptions })]
            : [...columns];
        const keys = new Set(base.map(c => c.accessorKey || c.id));
        const addIfMissing = (key, header, width) => {
            if (!keys.has(key)) {
                base.push({ accessorKey: key, header, width });
                keys.add(key);
            }
        };

        if (isProducts) {
            addIfMissing('brand', 'Brand', 120);
            addIfMissing('hsn_code', 'HSN Code', 100);
            addIfMissing('sac_code', 'SAC Code', 100);
            addIfMissing('image_url', 'Image', 80);
            addIfMissing('location', 'Location', 120);
            addIfMissing('cost_price', 'Cost Price', 100);
            addIfMissing('mrp', 'MRP', 100);
            addIfMissing('min_stock', 'Min Stock', 90);
            addIfMissing('max_stock', 'Max Stock', 90);
            addIfMissing('reorder_point', 'Reorder Point', 110);
        } else {
            if (inventoryFeatures.batchTrackingEnabled) {
                addIfMissing('batch_number', 'Batch #', 120);
                addIfMissing('batch_quantity', 'Batch Qty', 100);
                addIfMissing('expiry_date', 'Expiry', 120);
                addIfMissing('manufacturing_date', 'Mfg Date', 120);
            }
            if (inventoryFeatures.serialTrackingEnabled) {
                addIfMissing('serial_number', 'Serial #', 150);
            }
        }

        // Common customer/vendor fields
        if (entityType === 'customers' || entityType === 'vendors') {
            addIfMissing('email', 'Email', 200);
            addIfMissing('ntn', 'NTN', 120);
            addIfMissing('cnic', 'CNIC', 150);
            addIfMissing('srn', 'SRN', 120);
            addIfMissing('state', 'State', 100);
            addIfMissing('pincode', 'Pincode', 90);
            addIfMissing('country', 'Country', 100);
            addIfMissing('credit_limit', 'Credit Limit', 120);
            addIfMissing('opening_balance', 'Opening Balance', 130);
            addIfMissing('filer_status', 'Filer Status', 110);
        }

        // Invoice fields
        if (entityType === 'invoices') {
            addIfMissing('payment_method', 'Payment Method', 130);
            addIfMissing('payment_status', 'Payment Status', 130);
            addIfMissing('terms', 'Terms', 150);
        }

        let out = [...base];
        if (isProducts && !out.some((c) => c.id === 'status_dot')) {
            out.unshift({
                id: 'status_dot',
                header: '',
                accessorKey: 'is_active',
                width: 28,
                size: 28,
                readOnly: true,
                cell: ({ row }) => (
                    <div className="flex items-center justify-center h-full">
                        <span
                            className={cn(
                                'h-2 w-2 rounded-full',
                                row.original.is_active === false ? 'bg-amber-400' : 'bg-green-500'
                            )}
                            title={row.original.is_active === false ? 'Inactive' : 'Active'}
                        />
                    </div>
                ),
            });
        }

        return out;
    }, [columns, category, entityType, gridColumnOptions, inventoryFeatures.batchTrackingEnabled, inventoryFeatures.serialTrackingEnabled]);

    useEffect(() => {
        if (!isOpen || !isMobileExcel || mobileColsAppliedRef.current) return;
        setHiddenCols((prev) => {
            const mobileHidden = buildExcelMobileHiddenColumnKeys(
                enhancedColumns,
                category,
                gridColumnOptions
            );
            const next = new Set(prev);
            mobileHidden.forEach((key) => next.add(key));
            return next;
        });
        mobileColsAppliedRef.current = true;
    }, [isOpen, isMobileExcel, enhancedColumns, category, gridColumnOptions]);

    const displayColumns = useMemo(() => {
        return enhancedColumns.filter((c) => {
            if (c.id === 'status_dot') return true;
            const key = c.accessorKey || c.id;
            return !hiddenCols.has(key);
        });
    }, [enhancedColumns, hiddenCols]);

    useEffect(() => {
        if (!isOpen || !hasUnsavedChanges) return undefined;
        const onBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isOpen, hasUnsavedChanges]);

    // Validation (aligned with productSchema)
    const validateRow = useCallback((row, rowKey) => {
        const errors = {};
        const payload = {
            name: row.name ?? '',
            sku: row.sku ?? null,
            barcode: row.barcode ?? null,
            brand: row.brand ?? null,
            description: row.description ?? null,
            category: row.category ?? null,
            unit: row.unit || 'pcs',
            price: Number(row.price) || 0,
            cost_price: row.cost_price != null ? Number(row.cost_price) : null,
            mrp: row.mrp != null ? Number(row.mrp) : null,
            stock: Number(row.stock) || 0,
            min_stock: row.min_stock != null ? Number(row.min_stock) : null,
            max_stock: row.max_stock != null ? Number(row.max_stock) : null,
            reorder_point: row.reorder_point != null ? Number(row.reorder_point) : null,
            reorder_quantity: row.reorder_quantity != null ? Number(row.reorder_quantity) : null,
            tax_percent: row.tax_percent != null ? Number(row.tax_percent) : 17,
            hsn_code: row.hsn_code ?? null,
            sac_code: row.sac_code ?? null,
            business_id: row.business_id || businessId,
            image_url: row.image_url ?? null,
            is_active: row.is_active !== false,
            domain_data: row.domain_data ?? {},
            unit_conversions: row.unit_conversions ?? {},
            expiry_date: row.expiry_date ?? null,
            manufacturing_date: row.manufacturing_date ?? null,
            batches: row.batches ?? [],
            serial_numbers: row.serial_numbers ?? row.serialNumbers ?? [],
            serialNumbers: row.serialNumbers ?? row.serial_numbers ?? [],
            variants: row.variants ?? [],
        };

        const result = productSchema.safeParse(payload);
        if (!result.success) {
            for (const issue of result.error.issues) {
                const field = issue.path[0];
                if (field) errors[`${rowKey}-${field}`] = issue.message;
            }
        }
        return errors;
    }, [businessId]);

    // Empty row = no name, sku, or meaningful domain_data (zero price/stock alone is not empty)
    const isEmptyRow = useCallback((row) => {
        if (row.name != null && String(row.name).trim() !== '') return false;
        if (row.sku != null && String(row.sku).trim() !== '') return false;
        const dd = row.domain_data;
        if (dd && typeof dd === 'object') {
            if (Object.values(dd).some((v) => v != null && String(v).trim() !== '')) return false;
        }
        return true;
    }, []);

    const exportCsv = useCallback(() => {
        const cols = displayColumns.filter(
            (c) => c.accessorKey && c.id !== 'status_dot' && c.accessorKey !== '__actions'
        );
        const header = cols.map((c) => (typeof c.header === 'string' ? c.header : c.accessorKey)).join(',');
        const body = localData
            .map((row) =>
                cols
                    .map((c) => {
                        const val = readGridCellValue(row, c.accessorKey, category);
                        return `"${String(val ?? '').replace(/"/g, '""')}"`;
                    })
                    .join(',')
            )
            .join('\n');
        const blob = new Blob([[header, body].filter(Boolean).join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventory-export.csv';
        a.click();
        URL.revokeObjectURL(url);
    }, [displayColumns, localData, category]);

    const validateAllData = useCallback(() => {
        const allErrors = {};
        localData.forEach((row, index) => {
            if (isEmptyRow(row)) return;
            const rowKey = inventoryGridRowKey(row, index);
            Object.assign(allErrors, validateRow(row, rowKey));
        });
        setValidationErrors(allErrors);
        return Object.keys(allErrors).length === 0;
    }, [localData, validateRow, isEmptyRow]);

    const handleSave = useCallback(async (isAutoSave = false) => {
        if (!hasUnsavedChanges && !isAutoSave) return;

        const dataToSave = localData.filter(row => !isEmptyRow(row));

        if (dataToSave.length === 0 && localData.length > 0) {
            toast('Nothing to save (empty rows ignored)', { id: 'excel-empty-save', duration: 2200 });
            if (!isAutoSave) onClose();
            return;
        }

        if (!validateAllData()) return toast.error('Please fix validation errors');

        setIsSaving(true);
        try {
            await onSave?.(dataToSave);
            setHasUnsavedChanges(false);
            if (isAutoSave) {
                toast.success('Auto-saved', { icon: '💾', duration: 1500 });
            }
        } catch (err) {
            console.error("Save Error:", err);
            toast.error('Save failed');
        }
        finally { setIsSaving(false); }
    }, [hasUnsavedChanges, localData, isEmptyRow, validateAllData, onSave, onClose]);

    const handleLocalCellEdit = useCallback((row, key, value) => {
        const knowledge = inventoryFeatures.knowledge || { productFields: [] };
        setLocalData(prev => {
            const newData = [...prev];
            const idx = newData.findIndex(r => r.id === row.id || (r._tempId && r._tempId === row._tempId));
            if (idx !== -1) {
                const updated = mapProductField(
                    { ...newData[idx], domain_data: newData[idx].domain_data || {} },
                    key,
                    value,
                    knowledge,
                    category
                );
                newData[idx] = updated;
                setHasUnsavedChanges(true);
                pushState(newData);

                const rowKey = inventoryGridRowKey(updated, idx);
                const rowErrors = validateRow(updated, rowKey);
                setValidationErrors(prevE => {
                    const next = { ...prevE };
                    Object.keys(next).forEach(k => {
                        if (k.startsWith(`${rowKey}-`)) delete next[k];
                    });
                    return { ...next, ...rowErrors };
                });
            }
            return newData;
        });
    }, [category, pushState, validateRow, inventoryFeatures.knowledge]);

    const handleLocalAddRow = useCallback((initialData = null) => {
        // Ensure we strip ID if coming from a duplicate action
        const { id, _tempId, ...cleanInitialData } = initialData || {};

        // Intelligent Naming: If duplicating, append (Copy) or increment
        if (cleanInitialData.name) {
            const name = cleanInitialData.name;
            const copyRegex = / \(Copy\s*(\d*)\)$/;
            const match = name.match(copyRegex);

            if (match) {
                const num = match[1] ? parseInt(match[1]) : 1;
                cleanInitialData.name = name.replace(copyRegex, ` (Copy ${num + 1})`);
            } else {
                cleanInitialData.name = `${name} (Copy)`;
            }
        }

        const previousRow = cleanInitialData.name
            ? cleanInitialData
            : getLastRowForDefaults(localData);
        const newRow = {
            ...(typeof onAddRow === 'function'
                ? onAddRow(previousRow)
                : buildNewInventoryRow(category, businessId, previousRow)),
            ...cleanInitialData,
            _tempId: crypto.randomUUID(),
            business_id: businessId,
        };

        setLocalData(prev => {
            const next = [...prev, newRow];
            setHasUnsavedChanges(true);
            pushState(next);
            return next;
        });

        // Auto-scroll to bottom
        setTimeout(() => {
            const grid = document.querySelector('.custom-scrollbar');
            if (grid) grid.scrollTop = grid.scrollHeight;
        }, 100);
    }, [localData, onAddRow, category, businessId, pushState]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key?.toLowerCase();
            if (e.ctrlKey && key === 's') { e.preventDefault(); void handleSave(); return; }
            if (e.ctrlKey && key === 'z') { e.preventDefault(); handleUndo(); return; }
            if (e.ctrlKey && key === 'y') { e.preventDefault(); handleRedo(); return; }
            if ((e.ctrlKey && key === 'n' && !e.shiftKey) || (e.altKey && key === 'n') || e.key === 'Insert') {
                e.preventDefault();
                handleLocalAddRow();
                return;
            }
            if (e.ctrlKey && key === 'd') {
                e.preventDefault();
                if (localData.length > 0) {
                    handleLocalAddRow({ ...localData[localData.length - 1], _tempId: undefined, id: undefined });
                }
            }
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, localData, handleUndo, handleRedo, handleSave, handleLocalAddRow]);

    const NUMERIC_PASTE_FIELDS = new Set([
        'price', 'cost_price', 'mrp', 'stock', 'min_stock', 'reorder_point', 'tax_percent',
    ]);
    const coercePasteNumber = (val) => {
        const n = parseFloat(String(val).replace(/,/g, '').replace(/[^0-9.\-]/g, ''));
        return Number.isFinite(n) ? n : 0;
    };

    const handlePasteFromExcel = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text || !text.trim()) {
                toast.error('Clipboard is empty. Copy cells from Excel/Sheets first.');
                return;
            }
            const rows = text
                .replace(/\r/g, '')
                .split('\n')
                .filter((l) => l.trim() !== '')
                .map((l) => l.split('\t'));
            if (rows.length === 0) return;

            const rowDefaults = buildNewInventoryRow(
                category,
                businessId,
                getLastRowForDefaults(localData),
                { countryIso }
            );

            // Domain (vertical-specific) header aliases → domain_data keys
            const domainFields = inventoryFeatures.knowledge?.productFields || [];
            const domainHeaderMap = new Map();
            domainFields.forEach((field) => {
                const key = resolveDomainFieldKey(field, category);
                domainHeaderMap.set(normalizeKey(field).toLowerCase(), key);
                domainHeaderMap.set(field.toLowerCase().replace(/\s+/g, '_'), key);
                domainHeaderMap.set(key.toLowerCase(), key);
            });

            const firstLine = rows[0].map((h) => String(h ?? '').trim());
            // Intelligent header detection: reuse the same engine as file import
            const canonicalMapping = detectColumnMapping(firstLine);
            const firstLineHasDomain = firstLine.some((h) =>
                domainHeaderMap.has(h.toLowerCase().replace(/\s+/g, '_'))
            );
            const hasHeaders =
                Object.keys(canonicalMapping).length > 0 || firstLineHasDomain;

            const buildBaseItem = () => ({
                ...rowDefaults,
                _tempId: crypto.randomUUID(),
                business_id: businessId,
                domain_data: { ...rowDefaults.domain_data },
            });

            let mapped;
            if (hasHeaders) {
                const headers = firstLine;
                const usedByCanonical = new Set(Object.values(canonicalMapping));
                const domainColIdx = {};
                headers.forEach((h, idx) => {
                    if (usedByCanonical.has(h)) return;
                    const norm = h.toLowerCase().replace(/\s+/g, '_');
                    const domainKey = domainHeaderMap.get(norm) || domainHeaderMap.get(h.toLowerCase());
                    if (domainKey && domainColIdx[domainKey] === undefined) domainColIdx[domainKey] = idx;
                });

                mapped = rows.slice(1).map((cells) => {
                    const rowObj = {};
                    headers.forEach((h, idx) => { rowObj[h] = cells[idx]; });
                    const canon = applyColumnMapping(rowObj, canonicalMapping);
                    const item = buildBaseItem();
                    Object.entries(canon).forEach(([field, val]) => {
                        if (val == null || String(val).trim() === '') return;
                        item[field] = NUMERIC_PASTE_FIELDS.has(field)
                            ? coercePasteNumber(val)
                            : String(val).trim();
                    });
                    Object.entries(domainColIdx).forEach(([domainKey, idx]) => {
                        const v = cells[idx];
                        if (v != null && String(v).trim() !== '') item.domain_data[domainKey] = String(v).trim();
                    });
                    return item;
                });
            } else {
                // No recognizable header row → positional name / sku / price / stock
                mapped = rows.map((cells) => {
                    const item = buildBaseItem();
                    if (cells[0] != null && String(cells[0]).trim() !== '') item.name = String(cells[0]).trim();
                    if (cells[1] != null && String(cells[1]).trim() !== '') item.sku = String(cells[1]).trim();
                    if (cells[2] != null && String(cells[2]).trim() !== '') item.price = coercePasteNumber(cells[2]);
                    if (cells[3] != null && String(cells[3]).trim() !== '') item.stock = coercePasteNumber(cells[3]);
                    return item;
                });
            }

            mapped = mapped.filter(
                (r) => (r.name && String(r.name).trim() !== '') || (r.sku && String(r.sku).trim() !== '')
            );
            if (mapped.length === 0) {
                toast.error('No product rows detected in the pasted content.');
                return;
            }

            setLocalData((prev) => {
                const next = [...prev, ...mapped];
                setHasUnsavedChanges(true);
                pushState(next);
                return next;
            });
            const detectedCount = Object.keys(canonicalMapping).length;
            toast.success(
                `Smart Paste: imported ${mapped.length} row${mapped.length === 1 ? '' : 's'}` +
                (hasHeaders && detectedCount ? ` · auto-mapped ${detectedCount} columns` : '')
            );
        } catch (err) {
            console.error('Smart paste failed:', err);
            toast.error('Paste failed. Copy cells from Excel/Sheets and try again.');
        }
    };

    const handleClear = () => { if (window.confirm('Delete all products in this session?')) { setLocalData([]); setHasUnsavedChanges(true); pushState([]); } };

    const handleLocalDeleteRow = useCallback(async (row) => {
        if (!row) return;
        const isNew = !row.id;
        const confirmMsg = isNew
            ? 'Are you sure you want to remove this new row?'
            : `Archive "${row.name || 'this product'}"? It will be hidden from inventory; history is kept.`;

        if (!window.confirm(confirmMsg)) return;

        if (!isNew && onDeleteRow) {
            try {
                await onDeleteRow(row);
            } catch (err) {
                console.error("Failed to delete row:", err);
                toast.error("Failed to archive product");
                return;
            }
        }

        setLocalData(prev => {
            const next = prev.filter(r => {
                if (row.id) return r.id !== row.id;
                return r._tempId !== row._tempId;
            });
            setHasUnsavedChanges(true);
            pushState(next);
            return next;
        });
        toast.success(isNew ? 'Row removed' : 'Product archived');
    }, [onDeleteRow, pushState]);

    // Close col picker on outside click
    useEffect(() => {
        if (!showColPicker) return;
        const handler = (e) => {
            if (colPickerRef.current && !colPickerRef.current.contains(e.target)) setShowColPicker(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showColPicker]);

    const handleClose = () => {
        if (hasUnsavedChanges) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;
    const errorCount = Object.keys(validationErrors).length;

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-0 animate-in fade-in duration-300"
            role="dialog"
            aria-modal="true"
            aria-labelledby="excel-modal-title"
        >
            <div className={cn(
                "bg-white flex flex-col min-h-0 shadow-[0_0_50px_rgba(0,0,0,0.3)] transition-all duration-500 overflow-hidden",
                isFullscreen ? "w-full h-full rounded-none" : "w-[96vw] h-[92vh] rounded-3xl border border-gray-200"
            )}>
                {/* Premium Header */}
                <div className="h-auto min-h-14 shrink-0 border-b-2 flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-0 sm:h-14" style={{ backgroundColor: colors?.bg || '#f8fafc', borderColor: colors?.border || '#e2e8f0' }}>
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: colors?.primary || '#3b82f6' }}>
                            <Table2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" aria-hidden="true" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                            <h2 id="excel-modal-title" className="truncate text-sm font-semibold uppercase tracking-wider text-slate-800 sm:text-base">
                                {title}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="bg-white/50 border-slate-200 text-slate-500 text-[10px] uppercase font-bold px-1.5 py-0">
                                    {localData.length}{sourceTotal > localData.length ? ` / ${sourceTotal}` : ''} rows
                                </Badge>
                                {hasUnsavedChanges && <span className="text-[10px] font-bold text-orange-500 uppercase">Unsaved</span>}
                            </div>
                        </div>
                    </div>

                    {/* Desktop search */}
                    <div className="hidden md:flex flex-1 max-w-md mx-8">
                        <div className="relative w-full group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search rows (Ctrl+F for legacy)..."
                                className="w-full h-10 pl-10 pr-4 bg-white/80 border-2 border-slate-200 rounded-full text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Active Actions */}
                    <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:gap-2">
                        <div className="hidden border-2 border-slate-200 rounded-xl overflow-hidden bg-white sm:flex">
                            <Button variant="ghost" size="icon" disabled={history.length <= 1} onClick={handleUndo} className="h-9 w-9 rounded-none border-r"><Undo className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" disabled={future.length === 0} onClick={handleRedo} className="h-9 w-9 rounded-none"><Redo className="w-4 h-4" /></Button>
                        </div>

                        <Button variant="outline" size="sm" onClick={() => handleLocalAddRow()} className="h-10 px-3 font-bold border-2 border-blue-200 text-blue-700 hover:bg-blue-50 sm:px-4"><Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Add Row</span></Button>
                        <Button variant="outline" size="sm" onClick={handlePasteFromExcel} className="hidden h-10 px-4 font-bold border-2 text-slate-700 hover:bg-slate-50 sm:inline-flex"><Copy className="w-4 h-4 mr-2" /> Smart Paste</Button>
                        <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={!hasUnsavedChanges || isSaving} className={cn("hidden h-10 px-6 font-semibold border-2 transition-all shadow-sm sm:inline-flex", hasUnsavedChanges ? "bg-green-600 text-white border-green-700 hover:bg-green-700 hover:shadow-green-200" : "bg-white text-slate-400 border-slate-100")}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} SAVE
                        </Button>

                        <div className="relative" ref={colPickerRef}>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowColPicker((v) => !v)}
                                className="h-10 px-3 font-bold border-2 text-slate-700"
                            >
                                <Columns className="w-4 h-4 mr-1.5" />
                                Columns
                                <ChevronDown className={cn('ml-1 h-3.5 w-3.5 transition-transform', showColPicker && 'rotate-180')} />
                            </Button>
                            {showColPicker && (
                                <div className="absolute right-0 top-full z-[10000] mt-1 max-h-72 w-60 overflow-auto rounded-xl border border-slate-200 bg-white p-2 text-left shadow-2xl">
                                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Visible columns</p>
                                    {enhancedColumns
                                        .filter((c) => c.id !== 'status_dot')
                                        .map((col) => {
                                            const key = col.accessorKey || col.id;
                                            const label =
                                                typeof col.header === 'function' ? col.header() : col.header || key;
                                            const visible = !hiddenCols.has(key);
                                            return (
                                                <label
                                                    key={String(key)}
                                                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300"
                                                        checked={visible}
                                                        onChange={() => {
                                                            setHiddenCols((prev) => {
                                                                const next = new Set(prev);
                                                                if (next.has(key)) next.delete(key);
                                                                else next.add(key);
                                                                return next;
                                                            });
                                                        }}
                                                    />
                                                    <span className="truncate font-medium text-slate-700">{label}</span>
                                                </label>
                                            );
                                        })}
                                </div>
                            )}
                        </div>

                        <div className="h-8 w-0.5 bg-slate-200 mx-1" />
                        <Button variant="ghost" size="icon" onClick={handleClose} className="h-10 w-10 hover:bg-red-50 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></Button>
                    </div>
                </div>

                {isMobileExcel && (
                    <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2 md:hidden">
                        <div className="mb-2 flex rounded-xl border border-slate-200 bg-slate-100 p-0.5">
                            <button
                                type="button"
                                className={cn(
                                    'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors',
                                    mobileViewMode === 'cards' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                                )}
                                onClick={() => setMobileViewMode('cards')}
                            >
                                <LayoutGrid className="h-4 w-4" />
                                Cards
                            </button>
                            <button
                                type="button"
                                className={cn(
                                    'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors',
                                    mobileViewMode === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                                )}
                                onClick={() => setMobileViewMode('grid')}
                            >
                                <Table2 className="h-4 w-4" />
                                Grid
                            </button>
                        </div>
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="search"
                                placeholder="Search rows..."
                                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-base outline-none focus:border-blue-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {localData.length < sourceTotal && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2 h-10 w-full text-xs font-semibold uppercase"
                                onClick={handleLoadMoreRows}
                            >
                                Load {Math.min(EXCEL_WORKSET_SIZE, sourceTotal - localData.length)} more rows
                            </Button>
                        )}
                    </div>
                )}

                {/* Grid / card entry */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden relative bg-slate-50">
                    {isMobileExcel && mobileViewMode === 'cards' ? (
                        <ExcelModeMobileCardView
                            rows={filteredData}
                            columns={displayColumns}
                            hiddenCols={hiddenCols}
                            category={category}
                            validationErrors={validationErrors}
                            onCellEdit={handleLocalCellEdit}
                            onAddRow={handleLocalAddRow}
                            onDeleteRow={handleLocalDeleteRow}
                            getFieldSuggestions={excelFieldSuggestions}
                            className="h-full min-h-0"
                        />
                    ) : (
                        <BusyGrid
                            data={filteredData}
                            columns={displayColumns}
                            onCellEdit={handleLocalCellEdit}
                            onAddRow={handleLocalAddRow}
                            onDeleteRow={handleLocalDeleteRow}
                            getFieldSuggestions={excelFieldSuggestions}
                            validationErrors={validationErrors}
                            category={category}
                            variant="excel"
                            touchOptimized={isMobileExcel}
                            className="h-full min-h-0 border-0 shadow-none"
                        />
                    )}
                </div>

                {isMobileExcel && (
                    <div className="shrink-0 border-t border-slate-800 bg-slate-900 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide lg:hidden">
                        {errorCount > 0 ? (
                            <span className="flex items-center gap-2 text-red-400">
                                <AlertCircle className="h-4 w-4" />
                                {errorCount} validation errors
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                                Data integrity verified
                            </span>
                        )}
                    </div>
                )}

                {isMobileExcel && (
                    <div className={cn('shrink-0 border-t border-slate-200 bg-white lg:hidden', MOBILE_FORM_FOOTER)}>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 flex-1 rounded-xl font-semibold"
                                onClick={handlePasteFromExcel}
                            >
                                <Copy className="mr-2 h-4 w-4" />
                                Paste
                            </Button>
                            <Button
                                type="button"
                                className={cn(
                                    'h-11 flex-[1.4] rounded-xl font-semibold',
                                    hasUnsavedChanges ? 'bg-green-600 text-white hover:bg-green-700' : ''
                                )}
                                onClick={() => handleSave(false)}
                                disabled={!hasUnsavedChanges || isSaving}
                            >
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save changes
                            </Button>
                        </div>
                    </div>
                )}

                {/* Intelligent Footer */}
                <div className="hidden shrink-0 border-t-2 bg-slate-900 px-4 text-[10px] font-bold uppercase tracking-wide text-slate-400 shadow-2xl sm:px-6 lg:flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between py-1.5 sm:py-0 sm:h-10">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div className="flex items-center gap-2">
                            {errorCount > 0 ? (
                                <span className="flex items-center gap-2 text-red-400 animate-pulse"><AlertCircle className="w-4 h-4" /> {errorCount} Critical Errors</span>
                            ) : (
                                <span className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-4 h-4" /> Data integrity Verified</span>
                            )}
                        </div>
                        <div className="h-4 w-px bg-slate-700" />
                        <div className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300">CTRL+S</kbd> Save
                            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 ml-2">Insert</kbd> New row
                            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 ml-2">Tab</kbd> Save + next
                            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 ml-2">F2</kbd> Edit
                            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 ml-2">CTRL+Z</kbd> Undo
                            <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 ml-2">
                                Ctrl+D
                            </kbd>
                            <span className="text-slate-500">Dup last</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div className="flex items-center gap-4 text-slate-500">
                            <button onClick={handleClear} className="hover:text-red-400 transition-colors flex items-center gap-1.5"><Eraser className="w-3.5 h-3.5" /> Clear Workspace</button>
                            <button type="button" onClick={exportCsv} className="hover:text-blue-400 transition-colors flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"><Download className="w-3.5 h-3.5" /> Export CSV</button>
                        </div>
                        <div className="h-4 w-px bg-slate-700" />
                        <span className="text-slate-300">INTELLIGENT MODE ACTIVE</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
