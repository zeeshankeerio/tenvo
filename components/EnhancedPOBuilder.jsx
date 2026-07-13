'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Plus, Trash2, Save, Package, Loader2, X,
    Building2, Warehouse, Hash, CalendarDays,
    FileText, CheckCircle2, ChevronRight, AlertCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Combobox } from '@/components/ui/combobox';
import { formatCurrency } from '@/lib/currency';
import { useFormRegionalContext } from '@/lib/hooks/useFormRegionalContext';
import { calculatePurchaseLineTotal, calculatePurchaseTotals } from '@/lib/utils/purchaseTotals';
import { showActionError } from '@/lib/utils/formErrorHandler';
import { purchaseAPI } from '@/lib/api/purchases';
import { productAPI } from '@/lib/api/product';
import { vendorAPI } from '@/lib/api/vendors';
import { warehouseAPI } from '@/lib/api/warehouse';
import { QuickVendorForm } from '@/components/QuickVendorForm';
import { QuickWarehouseForm } from '@/components/QuickWarehouseForm';
import toast from 'react-hot-toast';
import { purchaseSchema, validateWithSchema } from '@/lib/validation/schemas';
import { PURCHASE_STATUSES } from '@/lib/constants/purchaseStatus';
import { cn } from '@/lib/utils';

export default function EnhancedPOBuilder({ businessId, onSuccess, onCancel, category = 'retail-shop', colors }) {
    const accentColor = colors?.primary || '#059669';
    const { currency, defaultTaxRate } = useFormRegionalContext(category);

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);

    const [showVendorForm, setShowVendorForm] = useState(false);
    const [showWarehouseForm, setShowWarehouseForm] = useState(false);

    const [header, setHeader] = useState({
        vendorId: '',
        warehouseId: '',
        purchaseNumber: `PO-${new Date().toISOString().slice(2, 4)}${new Date().toISOString().slice(5, 7)}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'draft',
    });

    const [items, setItems] = useState([{
        id: Date.now(),
        productId: '',
        description: '',
        quantity: 1,
        unitCost: 0,
        taxRate: 0,
        batchNumber: '',
        expiryDate: '',
        total: 0,
    }]);

    useEffect(() => {
        async function loadData() {
            if (!businessId) return;
            setLoading(true);
            try {
                const [vendResult, prodResult, whResult] = await Promise.allSettled([
                    vendorAPI.getAll(businessId),
                    productAPI.getAll(businessId),
                    warehouseAPI.getLocations(businessId),
                ]);
                if (vendResult.status === 'fulfilled') setVendors(vendResult.value || []);
                else toast.error('Could not load vendors');

                if (prodResult.status === 'fulfilled') setProducts(prodResult.value || []);
                else toast.error('Could not load products');

                if (whResult.status === 'fulfilled') {
                    const locs = whResult.value || [];
                    setWarehouses(locs);
                    if (locs.length > 0) setHeader(p => ({ ...p, warehouseId: locs[0].id }));
                } else {
                    toast.error('Could not load warehouses');
                }
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [businessId]);

    const addItem = () => setItems(prev => [...prev, {
        id: Date.now(), productId: '', description: '',
        quantity: 1, unitCost: 0, taxRate: 0,
        batchNumber: '', expiryDate: '', total: 0,
    }]);

    const updateItem = (id, field, value) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            if (field === 'productId') {
                const prod = products.find(p => p.id === value);
                if (prod) {
                    updated.description = prod.name;
                    updated.unitCost = parseFloat(prod.cost_price || prod.price || 0);
                    updated.taxRate = parseFloat(prod.tax_percent || defaultTaxRate || 0);
                }
            }
            if (['quantity', 'unitCost', 'taxRate', 'productId'].includes(field)) {
                updated.total = calculatePurchaseLineTotal(
                    updated.quantity,
                    updated.unitCost,
                    updated.taxRate
                );
            }
            return updated;
        }));
    };

    const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

    const totals = useMemo(() => calculatePurchaseTotals(items), [items]);

    const mapItemForApi = (item) => ({
        product_id: item.productId,
        description: item.description || 'Item',
        quantity: Number(item.quantity || 0),
        unit_cost: Number(item.unitCost || 0),
        tax_rate: Number(item.taxRate || 0),
        tax_amount: parseFloat(((Number(item.quantity || 0) * Number(item.unitCost || 0)) * Number(item.taxRate || 0) / 100).toFixed(2)),
        batch_number: item.batchNumber || null,
        expiry_date: item.expiryDate || null,
        total_amount: Number(item.total || 0),
    });

    const handleSubmit = async () => {
        const validItems = items.filter(i => i.productId && Number(i.unitCost || 0) > 0 && Number(i.quantity || 0) > 0);
        if (validItems.length === 0) {
            toast.error('Add at least one item with a product, quantity, and cost');
            return;
        }
        if (!header.vendorId) return toast.error('Please select a vendor');
        if (!header.warehouseId) return toast.error('Please select a warehouse');

        const mappedItems = validItems.map(mapItemForApi);
        const validation = validateWithSchema(purchaseSchema, {
            business_id: businessId,
            vendor_id: header.vendorId,
            purchase_number: header.purchaseNumber,
            date: header.date,
            warehouse_id: header.warehouseId,
            status: header.status,
            items: mappedItems,
            subtotal: totals.subtotal,
            tax_total: totals.taxTotal,
            total_amount: totals.total,
            notes: header.notes || null,
        });
        if (!validation.success) {
            toast.error(Object.values(validation.errors)[0] || 'Please fix validation errors');
            return;
        }

        try {
            setIsSubmitting(true);
            await purchaseAPI.create({
                business_id: businessId,
                vendor_id: header.vendorId,
                warehouse_id: header.warehouseId,
                purchase_number: header.purchaseNumber,
                date: header.date,
                notes: header.notes,
                status: header.status,
                subtotal: totals.subtotal,
                tax_total: totals.taxTotal,
                total_amount: totals.total,
                items: mappedItems,
            });
            toast.success(
                header.status === PURCHASE_STATUSES.RECEIVED
                    ? 'Purchase received and stock updated'
                    : 'Purchase order saved successfully'
            );
            onSuccess?.();
        } catch (error) {
            showActionError({
                success: false,
                error: error.message || 'Failed to create purchase order',
                code: error.code || null,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col items-center justify-center h-80 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                <p className="text-sm text-slate-400 font-medium">Loading purchase order form…</p>
            </div>
        );
    }

    const isDraft = header.status === 'draft';
    const selectedVendor = vendors.find(v => String(v.id) === String(header.vendorId));
    const selectedWarehouse = warehouses.find(w => String(w.id) === String(header.warehouseId));

    return (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[92vh] max-w-[1400px] mx-auto w-full">

            {/* ── Modal Header ─────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm sm:text-base font-bold text-slate-800 leading-tight truncate">New Purchase Order</h2>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate">{header.purchaseNumber}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Status pill */}
                    <div className={cn(
                        'hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap',
                        isDraft
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    )}>
                        {isDraft
                            ? <FileText className="w-3 h-3 shrink-0" />
                            : <CheckCircle2 className="w-3 h-3 shrink-0" />}
                        <span className="hidden md:inline">{isDraft ? 'Draft PO' : 'Direct Inward'}</span>
                        <span className="md:hidden">{isDraft ? 'Draft' : 'Direct'}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onCancel}
                        className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* ── Scrollable Body ───────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">

                {/* ── Section 1: Header Fields ─────────────────────── */}
                <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-slate-50">
                    <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-4 lg:grid-cols-4">

                        {/* Vendor */}
                        <div className="sm:col-span-2 lg:col-span-1 space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                <Building2 className="w-3 h-3" /> Supplier *
                            </Label>
                            <div className="flex gap-1.5">
                                <Combobox
                                    options={vendors.map(v => ({ value: String(v.id), label: v.name, description: v.city || v.phone || '' }))}
                                    value={String(header.vendorId)}
                                    onChange={val => setHeader(p => ({ ...p, vendorId: val }))}
                                    placeholder="Select vendor…"
                                    className="h-9 text-sm flex-1 min-w-0"
                                />
                                <Button size="icon" variant="outline"
                                    className="h-9 w-9 shrink-0 border-dashed border-slate-300 text-slate-400 hover:text-emerald-600 hover:border-emerald-300"
                                    onClick={() => setShowVendorForm(true)} title="Add new vendor">
                                    <Plus className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            {selectedVendor?.phone && (
                                <p className="text-[10px] text-slate-400 pl-0.5 truncate">{selectedVendor.phone}</p>
                            )}
                            {(selectedVendor?.address || selectedVendor?.city) && (
                                <p className="text-[10px] text-slate-400 pl-0.5 truncate">
                                    {[selectedVendor.address, selectedVendor.city].filter(Boolean).join(', ')}
                                </p>
                            )}
                        </div>

                        {/* Warehouse */}
                        <div className="sm:col-span-2 lg:col-span-1 space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                <Warehouse className="w-3 h-3" /> Warehouse *
                            </Label>
                            <div className="flex gap-1.5">
                                <Combobox
                                    options={warehouses.map(w => ({ value: String(w.id), label: w.name, description: w.location || '' }))}
                                    value={String(header.warehouseId)}
                                    onChange={val => setHeader(p => ({ ...p, warehouseId: val }))}
                                    placeholder="Select warehouse…"
                                    className="h-9 text-sm flex-1 min-w-0"
                                />
                                <Button size="icon" variant="outline"
                                    className="h-9 w-9 shrink-0 border-dashed border-slate-300 text-slate-400 hover:text-emerald-600 hover:border-emerald-300"
                                    onClick={() => setShowWarehouseForm(true)} title="Add new warehouse">
                                    <Plus className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            {selectedWarehouse?.location && (
                                <p className="text-[10px] text-slate-400 pl-0.5 truncate">{selectedWarehouse.location}</p>
                            )}
                        </div>

                        {/* PO Number */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                <Hash className="w-3 h-3" /> PO Number
                            </Label>
                            <Input
                                value={header.purchaseNumber}
                                onChange={e => setHeader(p => ({ ...p, purchaseNumber: e.target.value }))}
                                className="h-9 text-sm font-mono font-semibold bg-slate-50 border-slate-200"
                            />
                        </div>

                        {/* Date */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" /> Date
                            </Label>
                            <Input
                                type="date"
                                value={header.date}
                                onChange={e => setHeader(p => ({ ...p, date: e.target.value }))}
                                className="h-9 text-sm border-slate-200"
                            />
                        </div>
                    </div>

                    {/* Inventory Mode Toggle */}
                    <div className="mt-3.5 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">Inventory Mode:</span>
                        <div className="flex items-start sm:items-center gap-2 flex-wrap">
                            <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5 shrink-0">
                                <button
                                    onClick={() => setHeader(p => ({ ...p, status: PURCHASE_STATUSES.DRAFT }))}
                                    className={cn(
                                        'px-2.5 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap',
                                        isDraft
                                            ? 'bg-slate-800 text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    )}>
                                    Draft PO
                                </button>
                                <button
                                    onClick={() => setHeader(p => ({ ...p, status: PURCHASE_STATUSES.RECEIVED }))}
                                    className={cn(
                                        'px-2.5 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap',
                                        !isDraft
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    )}>
                                    Direct Inward
                                </button>
                            </div>
                            <span className="text-[9px] sm:text-[10px] text-slate-400 italic leading-relaxed">
                                {isDraft ? '⏳ No stock change until received' : '✓ Stock added immediately on save'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Section 2: Line Items ─────────────────────────── */}
                <div className="px-4 py-3 sm:px-6 sm:py-4">
                    <div className="flex items-center justify-between mb-3 gap-2">
                        <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5 min-w-0">
                            <Package className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" /> 
                            <span className="truncate">Line Items</span>
                            <span className="ml-1 bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                {items.length}
                            </span>
                        </h3>
                        <Button size="sm" variant="outline" onClick={addItem}
                            className="h-7 px-2.5 sm:px-3 text-[10px] sm:text-[11px] font-bold border-dashed border-slate-300 text-slate-500 hover:text-emerald-600 hover:border-emerald-300 shrink-0">
                            <Plus className="w-3 h-3 sm:mr-1" /> 
                            <span className="hidden sm:inline">Add Item</span>
                        </Button>
                    </div>

                    <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
                    <div className="min-w-[580px] rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                        {/* Table Header */}
                        <div className="grid bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400"
                            style={{ gridTemplateColumns: '1fr 70px 90px 68px 95px 36px' }}>
                            <div className="px-2 sm:px-3 py-2">Product</div>
                            <div className="px-1.5 sm:px-2 py-2 text-center">Qty</div>
                            <div className="px-1.5 sm:px-2 py-2 text-right">Unit Cost</div>
                            <div className="px-1.5 sm:px-2 py-2 text-right">Tax %</div>
                            <div className="px-1.5 sm:px-2 py-2 text-right">Total</div>
                            <div className="px-1 sm:px-2 py-2" />
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-slate-50">
                            {items.map((item, idx) => {
                                const base = parseFloat(item.quantity || 0) * parseFloat(item.unitCost || 0);
                                const tax = base * parseFloat(item.taxRate || 0) / 100;
                                return (
                                    <div key={item.id}
                                        className="grid items-center hover:bg-slate-50/60 transition-colors group"
                                        style={{ gridTemplateColumns: '1fr 70px 90px 68px 95px 36px' }}>

                                        {/* Product */}
                                        <div className="px-2 sm:px-3 py-2 min-w-0">
                                            <Combobox
                                                options={products.map(p => ({
                                                    value: p.id,
                                                    label: p.name,
                                                    description: `${p.sku ? `SKU: ${p.sku}` : ''} ${p.cost_price ? `· ${currency}${p.cost_price}` : ''}`.trim(),
                                                }))}
                                                value={item.productId}
                                                onChange={val => updateItem(item.id, 'productId', val)}
                                                placeholder="Select…"
                                                className="h-8 text-xs border-transparent bg-transparent hover:bg-white hover:border-slate-200 focus-within:bg-white focus-within:border-slate-300 transition-all"
                                            />
                                        </div>

                                        {/* Qty */}
                                        <div className="px-1.5 sm:px-2 py-2">
                                            <Input type="number" min={0}
                                                value={item.quantity}
                                                onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                                                className="h-8 text-center text-xs font-semibold px-1 border-slate-200 bg-white"
                                            />
                                        </div>

                                        {/* Unit Cost */}
                                        <div className="px-1.5 sm:px-2 py-2">
                                            <Input type="number" min={0} step="0.01"
                                                value={item.unitCost}
                                                onChange={e => updateItem(item.id, 'unitCost', e.target.value)}
                                                className="h-8 text-right text-xs font-semibold px-1.5 border-slate-200 bg-white"
                                            />
                                        </div>

                                        {/* Tax % */}
                                        <div className="px-1.5 sm:px-2 py-2">
                                            <Input type="number" min={0} max={100}
                                                value={item.taxRate}
                                                onChange={e => updateItem(item.id, 'taxRate', e.target.value)}
                                                className="h-8 text-right text-xs px-1.5 border-slate-200 bg-white"
                                            />
                                        </div>

                                        {/* Total */}
                                        <div className="px-1.5 sm:px-2 py-2 text-right">
                                            <p className="text-xs font-bold text-slate-800 truncate">{formatCurrency(item.total, currency)}</p>
                                            {item.taxRate > 0 && (
                                                <p className="text-[9px] sm:text-[10px] text-slate-400 leading-tight truncate">
                                                    {formatCurrency(base, currency)}+{formatCurrency(tax, currency)}
                                                </p>
                                            )}
                                        </div>

                                        {/* Delete */}
                                        <div className="px-0.5 sm:px-1 py-2 flex justify-center">
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                disabled={items.length === 1}
                                                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Empty state */}
                        {items.length === 0 && (
                            <div className="py-8 text-center text-slate-400">
                                <Package className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                                <p className="text-sm font-medium">No items added</p>
                                <p className="text-xs mt-0.5">Click "Add Item" to get started</p>
                            </div>
                        )}
                    </div>
                    </div>
                </div>

                {/* ── Section 3: Notes + Totals ─────────────────────── */}
                <div className="grid grid-cols-1 gap-3.5 px-4 pb-3.5 sm:px-6 sm:pb-4 md:grid-cols-2 md:gap-5">

                    {/* Notes */}
                    <div className="space-y-1.5 order-2 md:order-1">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Notes & Instructions
                        </Label>
                        <textarea
                            rows={4}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 resize-none transition-all"
                            placeholder="Delivery terms, special instructions…"
                            value={header.notes}
                            onChange={e => setHeader(p => ({ ...p, notes: e.target.value }))}
                        />
                    </div>

                    {/* Totals card */}
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3.5 sm:p-4 space-y-2.5 self-start order-1 md:order-2">
                        <div className="flex justify-between items-center text-sm text-slate-600">
                            <span className="font-medium">Subtotal</span>
                            <span className="font-semibold tabular-nums">{formatCurrency(totals.subtotal, currency)}</span>
                        </div>
                        {totals.taxTotal > 0 && (
                            <div className="flex justify-between items-center text-sm text-slate-500">
                                <span>Sales Tax</span>
                                <span className="tabular-nums">{formatCurrency(totals.taxTotal, currency)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2.5 border-t border-slate-200">
                            <span className="text-sm sm:text-base font-bold text-slate-800">Grand Total</span>
                            <span className="text-lg sm:text-xl font-semibold tabular-nums" style={{ color: accentColor }}>
                                {formatCurrency(totals.grandTotal, currency)}
                            </span>
                        </div>

                        {/* Item count summary */}
                        <div className="pt-1 text-[10px] text-slate-400 flex items-center gap-1">
                            <Package className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                                {items.filter(i => i.productId).length} product{items.filter(i => i.productId).length !== 1 ? 's' : ''} ·{' '}
                                {items.reduce((s, i) => s + parseFloat(i.quantity || 0), 0)} units total
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Sticky Footer ─────────────────────────────────────── */}
            <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-[11px] text-slate-400 order-2 sm:order-1">
                    {!header.vendorId && (
                        <span className="flex items-center gap-1 text-amber-500 whitespace-nowrap">
                            <AlertCircle className="w-3 h-3 shrink-0" /> Vendor required
                        </span>
                    )}
                    {!header.warehouseId && (
                        <span className="flex items-center gap-1 text-amber-500 whitespace-nowrap">
                            <AlertCircle className="w-3 h-3 shrink-0" /> Warehouse required
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 order-1 sm:order-2">
                    <Button variant="ghost" onClick={onCancel}
                        className="h-9 px-3 sm:px-4 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg flex-1 sm:flex-initial">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="h-9 px-4 sm:px-5 text-sm font-bold rounded-lg text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-60 flex-1 sm:flex-initial"
                        style={{ backgroundColor: accentColor }}>
                        {isSubmitting
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Saving…</>
                            : <><Save className="w-3.5 h-3.5 mr-2" />
                                <span className="hidden sm:inline">{isDraft ? 'Save Draft PO' : 'Confirm & Receive Stock'}</span>
                                <span className="sm:hidden">{isDraft ? 'Save Draft' : 'Receive Stock'}</span>
                            </>}
                    </Button>
                </div>
            </div>

            {/* ── Quick-add Dialogs ─────────────────────────────────── */}
            <Dialog open={showVendorForm} onOpenChange={setShowVendorForm}>
                <DialogContent className="max-w-lg w-[calc(100vw-1.5rem)] sm:w-full max-h-[min(90vh,800px)] overflow-y-auto overscroll-contain">
                    <div className="sr-only"><DialogTitle>Add New Vendor</DialogTitle></div>
                    <QuickVendorForm
                        onSave={(v) => {
                            setVendors(prev => [...prev, v]);
                            setHeader(p => ({ ...p, vendorId: v.id }));
                            setShowVendorForm(false);
                        }}
                        onCancel={() => setShowVendorForm(false)}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={showWarehouseForm} onOpenChange={setShowWarehouseForm}>
                <DialogContent className="max-w-lg w-[calc(100vw-1.5rem)] sm:w-full max-h-[min(90vh,800px)] overflow-y-auto overscroll-contain">
                    <div className="sr-only"><DialogTitle>Add Storage Location</DialogTitle></div>
                    <QuickWarehouseForm
                        onSave={(w) => {
                            setWarehouses(prev => [...prev, w]);
                            setHeader(p => ({ ...p, warehouseId: w.id }));
                            setShowWarehouseForm(false);
                        }}
                        onCancel={() => setShowWarehouseForm(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
