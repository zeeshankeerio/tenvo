'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Maximize2, Minimize2, Download, Upload, Save, Grid3x3, Table2, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Copy, Trash2, Eraser, Undo, Redo, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BusyGrid } from './BusyGrid';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getDomainColors } from '@/lib/domainColors';
import { isBatchTrackingEnabled, isSerialTrackingEnabled } from '@/lib/utils/domainHelpers';
import toast from 'react-hot-toast';

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
    category = 'retail-shop',
    entityType = 'products', // Added missing prop
    title = 'Excel Data Entry',
    businessId
}) {
    const [isFullscreen, setIsFullscreen] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [localData, setLocalData] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [searchQuery, setSearchQuery] = useState('');

    // History Tracking (Undo/Redo)
    const [history, setHistory] = useState([]);
    const [future, setFuture] = useState([]);

    const colors = getDomainColors(category);

    // Sync local data when modal opens
    useEffect(() => {
        if (isOpen) {
            const sanitizedData = data.map(item => {
                const newItem = { ...item };
                // Flatten nested domain_data if needed or sanitize Dates
                Object.keys(newItem).forEach(key => {
                    if (newItem[key] instanceof Date) newItem[key] = newItem[key].toISOString().split('T')[0];
                    if (newItem[key] && typeof newItem[key] === 'object' && newItem[key].toDate) newItem[key] = newItem[key].toDate().toISOString().split('T')[0];
                });
                return newItem;
            });
            setLocalData(sanitizedData);
            setHistory([JSON.stringify(sanitizedData)]); // Start history
            setFuture([]);
            setHasUnsavedChanges(false);
            setValidationErrors({});
        }
    }, [isOpen, data]);

    // History Logic
    const pushState = useCallback((newData) => {
        const stateStr = JSON.stringify(newData);
        setHistory(prev => {
            if (prev[prev.length - 1] === stateStr) return prev;
            return [...prev.slice(-29), stateStr]; // Keep 30 steps
        });
        setFuture([]);
    }, []);

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

    // Enhanced Columns
    const enhancedColumns = useMemo(() => {
        const base = [...columns];
        const keys = new Set(base.map(c => c.accessorKey || c.id));
        const addIfMissing = (key, header, width) => {
            if (!keys.has(key)) base.push({ accessorKey: key, header, width });
        };

        // Domain-specific tracking columns
        if (isBatchTrackingEnabled(category)) {
            addIfMissing('batch_number', 'Batch #', 120);
            addIfMissing('batch_quantity', 'Batch Qty', 100);
            addIfMissing('expiry_date', 'Expiry', 120);
            addIfMissing('manufacturing_date', 'Mfg Date', 120);
        }
        if (isSerialTrackingEnabled(category)) {
            addIfMissing('serial_number', 'Serial #', 150);
        }

        // Common product fields (if not already present)
        if (entityType === 'products' || !entityType) {
            addIfMissing('brand', 'Brand', 120);
            addIfMissing('category', 'Category', 120);
            addIfMissing('hsn_code', 'HSN Code', 100);
            addIfMissing('sac_code', 'SAC Code', 100);
            addIfMissing('image_url', 'Image', 80);
            addIfMissing('location', 'Location', 120);
            addIfMissing('cost_price', 'Cost Price', 100);
            addIfMissing('mrp', 'MRP', 100);
            addIfMissing('min_stock', 'Min Stock', 90);
            addIfMissing('max_stock', 'Max Stock', 90);
            addIfMissing('reorder_point', 'Reorder Point', 110);
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

        return base;
    }, [columns, category, entityType]);

    // Validation
    const validateRow = useCallback((row, index) => {
        const errors = {};
        if (!row.name || row.name.trim() === '') errors[`${index}-name`] = 'Required';
        if (row.price < 0) errors[`${index}-price`] = 'Positive Only';
        if (row.stock < 0) errors[`${index}-stock`] = 'Non-negative';
        return errors;
    }, []);

    // Intelligent Empty Row Detection
    const isEmptyRow = useCallback((row) => {
        const fieldsToCheck = ['name', 'sku', 'price', 'stock'];
        return fieldsToCheck.every(key => {
            const val = row[key];
            if (val === undefined || val === null || val === '') return true;
            if (typeof val === 'number' && val === 0) {
                // For price/stock, 0 is often the default, so we check if other fields are empty
                return true;
            }
            return false;
        });
    }, []);

    const validateAllData = useCallback(() => {
        const allErrors = {};
        localData.forEach((row, index) => {
            // Skip empty rows during validation
            if (isEmptyRow(row)) return;

            Object.assign(allErrors, validateRow(row, index));
        });
        setValidationErrors(allErrors);
        return Object.keys(allErrors).length === 0;
    }, [localData, validateRow, isEmptyRow]);

    // Global Key Events
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); }
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo(); }
            // Duplicate Last Row Shortcut (Ctrl+D like Excel)
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                if (localData.length > 0) handleLocalAddRow({ ...localData[localData.length - 1], _tempId: undefined, id: undefined });
            }
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, localData, handleUndo, handleRedo, hasUnsavedChanges]);

    const handleSave = async (isAutoSave = false) => {
        if (!hasUnsavedChanges && !isAutoSave) return;

        // Intelligent Filtering: Don't save empty rows
        const dataToSave = localData.filter(row => !isEmptyRow(row));

        if (dataToSave.length === 0 && localData.length > 0) {
            toast.info("Nothing to save (empty rows ignored)");
            if (!isAutoSave) onClose();
            return;
        }

        if (!validateAllData()) return toast.error('Please fix validation errors');

        setIsSaving(true);
        try {
            await onSave?.(dataToSave);
            if (!isAutoSave) {
                toast.success('Inventory saved successfully!');
                setHasUnsavedChanges(false);
                setTimeout(() => onClose(), 300);
            } else {
                toast.success('Auto-saved', { icon: '💾' });
                setHasUnsavedChanges(false);
            }
        } catch (err) {
            console.error("Save Error:", err);
            toast.error('Save failed');
        }
        finally { setIsSaving(false); }
    };

    const handleLocalCellEdit = (row, key, value) => {
        setLocalData(prev => {
            const newData = [...prev];
            const idx = newData.findIndex(r => r.id === row.id || (r._tempId && r._tempId === row._tempId));
            if (idx !== -1) {
                const updated = { ...newData[idx] };
                // Intelligent Data Cleansing
                let cleanValue = value;

                // Auto-convert numeric fields
                const numericFields = ['price', 'stock', 'cost_price', 'mrp', 'min_stock', 'max_stock', 'reorder_point', 'reorder_quantity', 'tax_percent', 'value'];
                // Handle nested numeric fields if needed, but for now flat fields

                if (numericFields.includes(key)) {
                    if (value === '' || value === null || value === undefined) {
                        cleanValue = 0;
                    } else if (typeof value === 'string') {
                        // Remove currency symbols and commas if present
                        const numStr = value.replace(/[^\d.-]/g, '');
                        const parsed = parseFloat(numStr);
                        cleanValue = isNaN(parsed) ? 0 : parsed;
                    } else if (typeof value === 'number') {
                        cleanValue = value;
                    }
                } else if (typeof value === 'string') {
                    // Auto-trim and sanitize strings
                    cleanValue = value.trim();
                    // Auto-capitalize Names and SKUs if not already
                    if (key === 'name' || key.includes('sku') || key.includes('code')) {
                        if (cleanValue.length > 0 && cleanValue[0] === cleanValue[0].toLowerCase()) {
                            cleanValue = cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1);
                        }
                    }
                }

                if (key.includes('.')) {
                    const keys = key.split('.');
                    let curr = updated;
                    for (let i = 0; i < keys.length - 1; i++) {
                        if (!curr[keys[i]]) curr[keys[i]] = {};
                        curr[keys[i]] = { ...curr[keys[i]] }; curr = curr[keys[i]];
                    }
                    curr[keys[keys.length - 1]] = cleanValue;
                } else updated[key] = cleanValue;
                newData[idx] = updated;
                setHasUnsavedChanges(true);
                pushState(newData);

                // Real-time validation update
                const rowErrors = validateRow(updated, idx);
                setValidationErrors(prevE => {
                    const next = { ...prevE };
                    Object.keys(next).forEach(k => { if (k.startsWith(`${idx}-`)) delete next[k]; });
                    return { ...next, ...rowErrors };
                });
            }
            return newData;
        });
    };

    const handleLocalAddRow = (initialData = null) => {
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

        const newRow = {
            _tempId: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            name: '',
            sku: '',
            price: 0,
            stock: 0,
            business_id: businessId,
            category: 'General',
            ...cleanInitialData,
            ...onAddRow?.()
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
    };

    const handlePasteFromExcel = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const lines = text.trim().split('\n').map(l => l.split('\t'));
            if (lines.length === 0) return;

            // Intelligence: Try to detect headers
            const headerLine = lines[0].map(h => h.toLowerCase().trim());
            const hasHeaders = headerLine.some(h => ['name', 'sku', 'price', 'qty', 'stock'].some(key => h.includes(key)));
            const dataRows = hasHeaders ? lines.slice(1) : lines;
            const mapping = hasHeaders ? {
                name: headerLine.findIndex(h => h.includes('name')),
                sku: headerLine.findIndex(h => h.includes('sku')),
                price: headerLine.findIndex(h => h.includes('price')),
                stock: headerLine.findIndex(h => h.includes('qty') || h.includes('stock')),
                batch_number: headerLine.findIndex(h => h.includes('batch')),
                expiry_date: headerLine.findIndex(h => h.includes('expiry'))
            } : { name: 0, sku: 1, price: 2, stock: 3 };

            const mapped = dataRows.map(row => {
                const item = { _tempId: Date.now() + Math.random(), business_id: businessId, category: 'General' };
                Object.keys(mapping).forEach(key => {
                    if (mapping[key] !== -1 && row[mapping[key]]) {
                        const val = row[mapping[key]];
                        if (['price', 'stock'].includes(key)) item[key] = parseFloat(val) || 0;
                        else item[key] = val;
                    }
                });
                return item;
            });

            setLocalData(prev => {
                const next = [...prev, ...mapped];
                setHasUnsavedChanges(true); pushState(next); return next;
            });
            toast.success(`Smart Paster: Imported ${mapped.length} rows`);
        } catch (err) { toast.error('Paste failed'); }
    };

    const handleClear = () => { if (window.confirm('Delete all products in this session?')) { setLocalData([]); setHasUnsavedChanges(true); pushState([]); } };

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
                "bg-white flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.3)] transition-all duration-500 overflow-hidden",
                isFullscreen ? "w-full h-full rounded-none" : "w-[96vw] h-[92vh] rounded-3xl border border-gray-200"
            )}>
                {/* Premium Header */}
                <div className="h-16 border-b-2 flex items-center justify-between px-6 shrink-0" style={{ backgroundColor: colors?.bg || '#f8fafc', borderColor: colors?.border || '#e2e8f0' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform" style={{ backgroundColor: colors?.primary || '#3b82f6' }}>
                            <Table2 className="w-6 h-6 text-white" aria-hidden="true" />
                        </div>
                        <div className="flex flex-col">
                            <h2 id="excel-modal-title" className="text-base font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                {title} <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" aria-hidden="true" />
                            </h2>
                            <div className="flex items-center gap-3 mt-0.5">
                                <Badge variant="secondary" className="bg-white/50 border-slate-200 text-slate-500 text-[10px] uppercase font-bold px-1.5 py-0">
                                    {localData.length} Records
                                </Badge>
                                {hasUnsavedChanges && <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 uppercase"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" /> Unsaved</span>}
                            </div>
                        </div>
                    </div>

                    {/* Middle Integrated Search */}
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
                    <div className="flex items-center gap-2">
                        <div className="flex border-2 border-slate-200 rounded-xl overflow-hidden bg-white mr-2">
                            <Button variant="ghost" size="icon" disabled={history.length <= 1} onClick={handleUndo} className="h-9 w-9 rounded-none border-r"><Undo className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" disabled={future.length === 0} onClick={handleRedo} className="h-9 w-9 rounded-none"><Redo className="w-4 h-4" /></Button>
                        </div>

                        <Button variant="outline" size="sm" onClick={handlePasteFromExcel} className="h-10 px-4 font-bold border-2 text-slate-700 hover:bg-slate-50"><Copy className="w-4 h-4 mr-2" /> Smart Paste</Button>
                        <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={!hasUnsavedChanges || isSaving} className={cn("h-10 px-6 font-black border-2 transition-all shadow-sm", hasUnsavedChanges ? "bg-green-600 text-white border-green-700 hover:bg-green-700 hover:shadow-green-200" : "bg-white text-slate-400 border-slate-100")}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} SAVE
                        </Button>

                        <div className="h-8 w-0.5 bg-slate-200 mx-1" />
                        <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} className="h-10 w-10 text-slate-500 hover:bg-slate-100">{isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}</Button>
                        <Button variant="ghost" size="icon" onClick={handleClose} className="h-10 w-10 hover:bg-red-50 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></Button>
                    </div>
                </div>

                {/* Grid Container */}
                <div className="flex-1 overflow-hidden relative bg-slate-50">
                    <BusyGrid
                        data={filteredData}
                        columns={enhancedColumns}
                        onCellEdit={handleLocalCellEdit}
                        onAddRow={handleLocalAddRow}
                        onDeleteRow={onDeleteRow}
                        validationErrors={validationErrors}
                        category={category}
                        className="h-full border-0"
                    />
                </div>

                {/* Intelligent Footer */}
                <div className="h-10 border-t-2 bg-slate-900 text-slate-400 flex items-center px-6 text-[11px] font-bold uppercase tracking-wider justify-between shadow-2xl">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            {errorCount > 0 ? (
                                <span className="flex items-center gap-2 text-red-400 animate-pulse"><AlertCircle className="w-4 h-4" /> {errorCount} Critical Errors</span>
                            ) : (
                                <span className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-4 h-4" /> Data integrity Verified</span>
                            )}
                        </div>
                        <div className="h-4 w-px bg-slate-700" />
                        <div className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300">CTRL+S</kbd> Save
                            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300 ml-2">CTRL+Z</kbd> Undo
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 text-slate-500">
                            <button onClick={handleClear} className="hover:text-red-400 transition-colors flex items-center gap-1.5"><Eraser className="w-3.5 h-3.5" /> Clear Workspace</button>
                            <button onClick={() => { const csv = localData.map(r => enhancedColumns.map(c => `"${r[c.accessorKey] || ''}"`).join(',')).join('\n'); const b = new Blob([csv], { type: 'text/csv' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'export.csv'; a.click(); }} className="hover:text-blue-400 transition-colors flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"><Download className="w-3.5 h-3.5" /> Export CSV</button>
                        </div>
                        <div className="h-4 w-px bg-slate-700" />
                        <span className="text-slate-300">INTELLIGENT MODE ACTIVE</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
