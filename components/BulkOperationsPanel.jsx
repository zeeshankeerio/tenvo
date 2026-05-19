'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Upload, Download, Edit3, Trash2, CheckSquare, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

/**
 * BulkOperationsPanel Component
 * Provides bulk update, delete, import, and export capabilities for data grids
 */
export function BulkOperationsPanel({
    selectedRows = [],
    allData = [],
    columns = [],
    entityType = 'products',
    onBulkUpdate,
    onBulkDelete,
    onBulkImport,
    onBulkExport,
    onClearSelection,
    className
}) {
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Bulk update state
    const [updateField, setUpdateField] = useState('');
    const [updateValue, setUpdateValue] = useState('');
    const [updateOperation, setUpdateOperation] = useState('set'); // set, add, multiply

    // Bulk import state
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState([]);
    const [importErrors, setImportErrors] = useState([]);

    // Get editable columns (exclude id, created_at, updated_at, business_id)
    const editableColumns = columns.filter(col => {
        const key = col.accessorKey || col.id;
        return !['id', 'created_at', 'updated_at', 'business_id'].includes(key);
    });

    // Handle bulk update
    const handleBulkUpdate = async () => {
        if (!updateField || updateValue === '') {
            return;
        }

        setIsProcessing(true);
        try {
            const updates = selectedRows.map(row => {
                let newValue = updateValue;

                // Handle different operations
                if (updateOperation === 'add' && typeof row[updateField] === 'number') {
                    newValue = row[updateField] + parseFloat(updateValue);
                } else if (updateOperation === 'multiply' && typeof row[updateField] === 'number') {
                    newValue = row[updateField] * parseFloat(updateValue);
                } else if (updateOperation === 'percentage' && typeof row[updateField] === 'number') {
                    // e.g., +10% or -5%
                    const percentage = parseFloat(updateValue);
                    newValue = row[updateField] * (1 + percentage / 100);
                }

                return {
                    id: row.id,
                    [updateField]: newValue
                };
            });

            await onBulkUpdate?.(updates);
            setShowUpdateDialog(false);
            setUpdateField('');
            setUpdateValue('');
            onClearSelection?.();
        } catch (error) {
            console.error('Bulk update failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle bulk delete
    const handleBulkDelete = async () => {
        setIsProcessing(true);
        try {
            const ids = selectedRows.map(row => row.id);
            await onBulkDelete?.(ids);
            setShowDeleteDialog(false);
            onClearSelection?.();
        } catch (error) {
            console.error('Bulk delete failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle file import
    const handleFileImport = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportFile(file);
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const rows = text.split('\n').filter(row => row.trim());
                const headers = rows[0].split(',').map(h => h.trim());

                const data = rows.slice(1).map((row, index) => {
                    const values = row.split(',');
                    const obj = { _rowIndex: index + 2 }; // +2 for header and 1-based
                    headers.forEach((header, i) => {
                        obj[header] = values[i]?.trim();
                    });
                    return obj;
                });

                setImportPreview(data.slice(0, 10)); // Show first 10 rows

                // Basic validation
                const errors = [];
                data.forEach((row, index) => {
                    if (!row.name || row.name === '') {
                        errors.push(`Row ${row._rowIndex}: Name is required`);
                    }
                    if (row.price && isNaN(parseFloat(row.price))) {
                        errors.push(`Row ${row._rowIndex}: Invalid price`);
                    }
                });

                setImportErrors(errors);
            } catch (error) {
                console.error('Import parsing failed:', error);
                setImportErrors(['Failed to parse file. Please ensure it is a valid CSV.']);
            }
        };

        reader.readAsText(file);
    };

    // Handle bulk import confirmation
    const handleBulkImport = async () => {
        if (importErrors.length > 0) {
            return; // Don't import if there are errors
        }

        setIsProcessing(true);
        try {
            await onBulkImport?.(importPreview);
            setShowImportDialog(false);
            setImportFile(null);
            setImportPreview([]);
            setImportErrors([]);
        } catch (error) {
            console.error('Bulk import failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle bulk export
    const handleBulkExport = () => {
        const dataToExport = selectedRows.length > 0 ? selectedRows : allData;

        // Get all column keys
        const columnKeys = columns.map(col => col.accessorKey || col.id);

        // Create CSV
        const headers = columns.map(col => col.header).join(',');
        const rows = dataToExport.map(row => {
            return columnKeys.map(key => {
                const value = row[key] ?? '';
                // Escape commas and quotes
                return typeof value === 'string' && (value.includes(',') || value.includes('"'))
                    ? `"${value.replace(/"/g, '""')}"`
                    : value;
            }).join(',');
        });

        const csv = [headers, ...rows].join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${entityType}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        onBulkExport?.();
    };

    if (selectedRows.length === 0) {
        return null;
    }

    return (
        <>
            {/* Bulk Actions Toolbar */}
            <div className={cn(
                "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
                "bg-gradient-to-r from-blue-600 to-indigo-600 text-white",
                "rounded-2xl shadow-2xl border border-blue-400/20",
                "px-6 py-4 flex items-center gap-4",
                "animate-in slide-in-from-bottom-4 duration-300",
                className
            )}>
                <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    <span className="font-semibold">{selectedRows.length} selected</span>
                </div>

                <div className="h-6 w-px bg-white/20" />

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/10"
                        onClick={() => setShowUpdateDialog(true)}
                    >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Update
                    </Button>

                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/10"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </Button>

                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/10"
                        onClick={handleBulkExport}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>

                <div className="h-6 w-px bg-white/20" />

                <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                    onClick={onClearSelection}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Bulk Update Dialog */}
            <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Bulk Update {selectedRows.length} Items</DialogTitle>
                        <DialogDescription>
                            Update a field for all selected items at once.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Field to Update</Label>
                            <Select value={updateField} onValueChange={setUpdateField}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select field..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {editableColumns.map(col => (
                                        <SelectItem key={col.accessorKey || col.id} value={col.accessorKey || col.id}>
                                            {col.header}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Operation</Label>
                            <Select value={updateOperation} onValueChange={setUpdateOperation}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="set">Set to value</SelectItem>
                                    <SelectItem value="add">Add to current</SelectItem>
                                    <SelectItem value="multiply">Multiply by</SelectItem>
                                    <SelectItem value="percentage">Percentage change</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Value</Label>
                            <Input
                                value={updateValue}
                                onChange={(e) => setUpdateValue(e.target.value)}
                                placeholder={updateOperation === 'percentage' ? 'e.g., +10 or -5' : 'Enter value...'}
                            />
                            {updateOperation === 'percentage' && (
                                <p className="text-xs text-gray-500">
                                    Use +10 for 10% increase, -5 for 5% decrease
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkUpdate}
                            disabled={!updateField || updateValue === '' || isProcessing}
                        >
                            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin bg-emerald-600 hover:bg-emerald-700 text-white" />}
                            Update {selectedRows.length} Items
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="w-5 h-5" />
                            Delete {selectedRows.length} Items?
                        </DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the selected items from the database.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-800 font-medium">
                                You are about to delete {selectedRows.length} {entityType}.
                            </p>
                            <p className="text-xs text-red-600 mt-2">
                                This will also delete all related records (invoices, stock movements, etc.)
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBulkDelete}
                            disabled={isProcessing}
                        >
                            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Delete {selectedRows.length} Items
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Import Dialog */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Import {entityType}</DialogTitle>
                        <DialogDescription>
                            Upload a CSV file to import multiple items at once.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>CSV File</Label>
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={handleFileImport}
                            />
                            <p className="text-xs text-gray-500">
                                First row should contain column headers matching your data fields.
                            </p>
                        </div>

                        {importErrors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-red-800 mb-2">
                                    {importErrors.length} Validation Errors:
                                </p>
                                <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                                    {importErrors.map((error, i) => (
                                        <li key={i}>* {error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {importPreview.length > 0 && (
                            <div className="space-y-2">
                                <Label>Preview (first 10 rows)</Label>
                                <div className="border rounded-lg overflow-x-auto max-h-64">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                {Object.keys(importPreview[0]).filter(k => k !== '_rowIndex').map(key => (
                                                    <th key={key} className="px-3 py-2 text-left font-medium text-gray-700">
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {importPreview.map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    {Object.entries(row).filter(([k]) => k !== '_rowIndex').map(([key, value]) => (
                                                        <td key={key} className="px-3 py-2 text-gray-600">
                                                            {value}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkImport}
                            disabled={importPreview.length === 0 || importErrors.length > 0 || isProcessing}
                        >
                            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Import {importPreview.length} Items
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
