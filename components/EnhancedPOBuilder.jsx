'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, ShoppingCart, Building2, Package, Search, Loader2, AlertCircle, Warehouse } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Combobox } from '@/components/ui/combobox';
import { formatCurrency } from '@/lib/currency';
import { purchaseAPI } from '@/lib/api/purchases';
import { productAPI } from '@/lib/api/product';
import { vendorAPI } from '@/lib/api/vendors';
import { warehouseAPI } from '@/lib/api/warehouse';
import { ProductForm } from '@/components/ProductForm';
import { QuickVendorForm } from '@/components/QuickVendorForm';
import { QuickWarehouseForm } from '@/components/QuickWarehouseForm';
import toast from 'react-hot-toast';
import { purchaseSchema, validateWithSchema } from '@/lib/validation/schemas';

export default function EnhancedPOBuilder({ businessId, onSuccess, onCancel, category = 'retail-shop', colors }) {
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data lists
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);

    // UI States
    const [showProductForm, setShowProductForm] = useState(false);
    const [showVendorForm, setShowVendorForm] = useState(false);
    const [showWarehouseForm, setShowWarehouseForm] = useState(false);

    // Form State
    const [header, setHeader] = useState({
        vendorId: '',
        warehouseId: '',
        purchaseNumber: `PO-${new Date().toISOString().slice(2, 4)}${new Date().toISOString().slice(5, 7)}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'draft' // Default to draft for POs
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
        total: 0
    }]);

    // Load initial data
    useEffect(() => {
        async function loadData() {
            if (!businessId) return;
            try {
                setLoading(true);
                const [vendRes, prodRes, whRes] = await Promise.all([
                    vendorAPI.getAll(businessId),
                    productAPI.getAll(businessId),
                    warehouseAPI.getLocations(businessId)
                ]);

                setVendors(vendRes || []);
                setProducts(prodRes || []);
                setWarehouses(whRes || []);

                if (whRes?.length > 0) {
                    setHeader(prev => ({ ...prev, warehouseId: whRes[0].id }));
                }
            } catch (err) {
                console.error('Data load error:', err);
                toast.error('Failed to load required data');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [businessId]);

    const addItem = () => {
        setItems([...items, {
            id: Date.now(),
            productId: '',
            description: '',
            quantity: 1,
            unitCost: 0,
            taxRate: 0,
            batchNumber: '',
            expiryDate: '',
            total: 0
        }]);
    };

    const updateItem = (id, field, value) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'productId') {
                    const prod = products.find(p => p.id === value);
                    if (prod) {
                        updated.description = prod.name;
                        updated.unitCost = prod.cost_price || 0;
                        updated.taxRate = prod.tax_percent || 0;
                    }
                }
                const fieldsAffectingTotal = ['quantity', 'unitCost', 'taxRate', 'productId'];
                if (fieldsAffectingTotal.includes(field)) {
                    const q = field === 'quantity' ? parseFloat(value || 0) : updated.quantity;
                    const c = field === 'unitCost' ? parseFloat(value || 0) : updated.unitCost;
                    const t = field === 'taxRate' ? parseFloat(value || 0) : updated.taxRate;
                    updated.total = (q * c) + (q * c * t / 100);
                }
                return updated;
            }
            return item;
        }));
    };

    const removeItem = (id) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);
        const taxTotal = items.reduce((sum, i) => sum + (i.quantity * i.unitCost * i.taxRate / 100), 0);
        return { subtotal, taxTotal, total: subtotal + taxTotal };
    }, [items]);

    const handleSubmit = async () => {
        // Zod schema validation
        const validation = validateWithSchema(purchaseSchema, {
            business_id: businessId,
            vendor_id: header.vendorId || undefined,
            purchase_number: header.purchaseNumber,
            date: header.date,
            warehouse_id: header.warehouseId || undefined,
            status: header.status,
            items: items.map(i => ({
                product_id: i.productId || undefined,
                name: i.description || 'Item',
                quantity: Number(i.quantity || 0),
                unit_cost: Number(i.unitCost || 0),
                tax_rate: Number(i.taxRate || 0),
            })),
            subtotal: totals.subtotal,
            tax_total: totals.taxTotal,
            total_amount: totals.total,
            notes: header.notes || null,
        });
        if (!validation.success) {
            const firstError = Object.values(validation.errors)[0];
            toast.error(firstError || 'Please fix validation errors');
            return;
        }

        if (!header.vendorId) return toast.error('Please select a vendor');
        if (!header.warehouseId) return toast.error('Please select a warehouse');

        try {
            setIsSubmitting(true);
            const payload = {
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
                items: items.map(i => ({
                    product_id: i.productId,
                    description: i.description,
                    quantity: Number(i.quantity || 0),
                    unit_cost: Number(i.unitCost || 0),
                    tax_rate: Number(i.taxRate || 0),
                    batch_number: i.batchNumber,
                    expiry_date: i.expiryDate,
                    total_amount: Number(i.total || 0)
                }))
            };

            await purchaseAPI.create(payload);
            toast.success('Purchase Order created');
            onSuccess?.();
        } catch (error) {
            toast.error(error.message || 'Failed to create purchase');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;

    return (
        <div className="space-y-6 max-h-[85vh] overflow-y-auto px-1 custom-scrollbar">
            <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">Supplier *</Label>
                    <div className="flex gap-2">
                        <Combobox
                            options={vendors.map(v => ({ value: String(v.id), label: v.name, description: String(v.city || '') }))}
                            value={String(header.vendorId)}
                            onChange={val => setHeader({ ...header, vendorId: val })}
                            placeholder="Select Vendor"
                        />
                        <Button size="icon" variant="outline" className="h-10 w-10 shrink-0 border-dashed" onClick={() => setShowVendorForm(true)}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">Warehouse *</Label>
                    <div className="flex gap-2">
                        <Combobox
                            options={warehouses.map(w => ({ value: String(w.id), label: w.name, description: String(w.location || '') }))}
                            value={String(header.warehouseId)}
                            onChange={val => setHeader({ ...header, warehouseId: val })}
                            placeholder="Select Warehouse"
                        />
                        <Button size="icon" variant="outline" className="h-10 w-10 shrink-0 border-dashed" onClick={() => setShowWarehouseForm(true)}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">PO Number</Label>
                    <Input value={header.purchaseNumber} onChange={e => setHeader({ ...header, purchaseNumber: e.target.value })} className="h-10 font-bold" />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">Date</Label>
                    <Input type="date" value={header.date} onChange={e => setHeader({ ...header, date: e.target.value })} className="h-10" />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">Inventory Status</Label>
                    <div className="flex bg-white border border-gray-200 rounded-xl p-1 h-10">
                        <button
                            onClick={() => setHeader({ ...header, status: 'draft' })}
                            className={`flex-1 rounded-lg text-[10px] font-black uppercase transition-all ${header.status === 'draft' ? 'bg-slate-900 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Draft PO
                        </button>
                        <button
                            onClick={() => setHeader({ ...header, status: 'received' })}
                            className={`flex-1 rounded-lg text-[10px] font-black uppercase transition-all ${header.status === 'received' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Direct Inward
                        </button>
                    </div>
                    <p className="text-[9px] text-gray-400 italic px-1">
                        {header.status === 'received' ? '✓ Stock will be added immediately upon save' : '* Pending approval, no stock change'}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black uppercase text-gray-500 tracking-tighter flex items-center gap-2">
                        <Package className="w-4 h-4" /> Line Items
                    </h4>
                    <Button size="sm" variant="outline" onClick={addItem} className="h-8 border-dashed">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                    </Button>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 font-black text-gray-400 uppercase tracking-widest text-[9px] border-b border-gray-100">
                            <tr>
                                <th className="px-3 py-2 text-left">Product</th>
                                <th className="px-3 py-2 w-20 text-center">Qty</th>
                                <th className="px-3 py-2 w-28 text-right">Cost</th>
                                <th className="px-3 py-2 w-32 text-right">Total</th>
                                <th className="px-2 py-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {items.map(item => (
                                <tr key={item.id} className="group hover:bg-gray-50/50">
                                    <td className="px-3 py-2">
                                        <Combobox
                                            options={products.map(p => ({ value: p.id, label: p.name, description: `SKU: ${p.sku}` }))}
                                            value={item.productId}
                                            onChange={val => updateItem(item.id, 'productId', val)}
                                            placeholder="Select Product"
                                            className="h-8 border-none bg-transparent"
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                                            className="h-8 text-center font-bold px-1"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <Input
                                            type="number"
                                            value={item.unitCost}
                                            onChange={e => updateItem(item.id, 'unitCost', e.target.value)}
                                            className="h-8 text-right font-bold"
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold text-gray-900">
                                        {formatCurrency(item.total, 'PKR')}
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-300 hover:text-red-500 rounded-full" onClick={() => removeItem(item.id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-between items-start gap-8 bg-gray-50/30 p-6 rounded-2xl border border-dashed border-gray-200">
                <div className="flex-1 space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Notes & Special Instructions</Label>
                    <textarea
                        className="w-full h-24 bg-white border border-gray-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/10 resize-none outline-none"
                        placeholder="Add delivery terms or other details..."
                        value={header.notes}
                        onChange={e => setHeader({ ...header, notes: e.target.value })}
                    />
                </div>
                <div className="w-64 space-y-3 pt-6">
                    <div className="flex justify-between text-xs font-bold text-gray-500">
                        <span>Subtotal</span>
                        <span>{formatCurrency(totals.subtotal, 'PKR')}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-gray-500">
                        <span>Sales Tax</span>
                        <span>{formatCurrency(totals.taxTotal, 'PKR')}</span>
                    </div>
                    <div className="flex justify-between text-lg font-black text-gray-900 border-t border-gray-100 pt-2">
                        <span>Grand Total</span>
                        <span style={{ color: colors?.primary }}>{formatCurrency(totals.total, 'PKR')}</span>
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full font-black rounded-xl h-11 shadow-lg mt-4"
                        style={{ backgroundColor: colors?.primary, boxShadow: `0 8px 16px -4px ${colors?.primary}40` }}
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Finalize Order
                    </Button>
                </div>
            </div>

            {/* Helper Dialogs */}
            <Dialog open={showVendorForm} onOpenChange={setShowVendorForm}>
                <DialogContent>
                    <div className="sr-only">
                        <DialogTitle>Add New Vendor</DialogTitle>
                    </div>
                    <QuickVendorForm onSave={(v) => { setVendors([...vendors, v]); setHeader({ ...header, vendorId: v.id }); setShowVendorForm(false); }} onCancel={() => setShowVendorForm(false)} />
                </DialogContent>
            </Dialog>
            <Dialog open={showWarehouseForm} onOpenChange={setShowWarehouseForm}>
                <DialogContent>
                    <div className="sr-only">
                        <DialogTitle>Add Storage Location</DialogTitle>
                    </div>
                    <QuickWarehouseForm onSave={(w) => { setWarehouses([...warehouses, w]); setHeader({ ...header, warehouseId: w.id }); setShowWarehouseForm(false); }} onCancel={() => setShowWarehouseForm(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
