'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, Save, ArrowLeft, Building2, Calendar, FileText, Search, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { purchaseAPI } from '@/lib/api/purchases';
import { useBusiness } from '@/lib/context/BusinessContext';
import { formatCurrency } from '@/lib/currency';
import toast from 'react-hot-toast';
import { ProductForm } from '@/components/ProductForm';
import { QuickVendorForm } from '@/components/QuickVendorForm';
import { QuickWarehouseForm } from '@/components/QuickWarehouseForm';
import { productAPI } from '@/lib/api/product';
import { vendorAPI } from '@/lib/api/vendors';
import { warehouseAPI } from '@/lib/api/warehouse';
import { Combobox } from '@/components/ui/combobox';

export default function NewPurchasePage() {
    const router = useRouter();
    const { business, currency } = useBusiness();
    const [loading, setLoading] = useState(false);
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
        notes: ''
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
        if (!business?.id) {
            console.log('NewPurchasePage: Waiting for business context...');
            return;
        }

        async function loadData() {
            try {
                setLoading(true);
                const bid = business.id;
                console.log('NewPurchasePage: Initializing for Business ID:', bid);

                // Load all in parallel for performance
                const [vendRes, prodRes, whRes] = await Promise.all([
                    vendorAPI.getAll(bid),
                    productAPI.getAll(bid),
                    warehouseAPI.getLocations(bid)
                ]);

                console.log('NewPurchasePage Data Load Stats:', {
                    vendors: vendRes?.length || 0,
                    products: prodRes?.length || 0,
                    warehouses: whRes?.length || 0
                });

                setVendors(vendRes || []);
                setProducts(prodRes || []);

                const locations = whRes || [];
                setWarehouses(locations);

                if (locations.length > 0) {
                    setHeader(prev => ({
                        ...prev,
                        warehouseId: locations[0].id
                    }));
                } else {
                    toast('No warehouse found. Please create one to manage stock.', {
                        icon: '[WARNING]',
                        duration: 5000
                    });
                }
            } catch (err) {
                console.error('NewPurchasePage Critical Load Error:', err);
                toast.error('Data Sync Failed: Check connectivity');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [business?.id]);

    const addItem = () => {
        setItems([
            ...items,
            {
                id: Date.now(),
                productId: '',
                description: '',
                quantity: 1,
                unitCost: 0,
                taxRate: 0,
                batchNumber: '',
                expiryDate: '',
                total: 0
            }
        ]);
    };

    const updateItem = (id, field, value) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };

                // Auto-fill product details
                if (field === 'productId') {
                    const prod = products.find(p => p.id === value);
                    if (prod) {
                        updated.description = prod.name;
                        updated.unitCost = prod.cost_price || 0;
                        updated.taxRate = prod.tax_percent || 0;
                    }
                }

                // Recalculate total
                // Trigger recalc on relevant fields change
                const fieldsAffectingTotal = ['quantity', 'unitCost', 'taxRate', 'productId'];
                if (fieldsAffectingTotal.includes(field)) {
                    const q = field === 'quantity' ? parseFloat(String(value || 0)) : updated.quantity;
                    const c = field === 'unitCost' ? parseFloat(String(value || 0)) : updated.unitCost;
                    const t = field === 'taxRate' ? parseFloat(String(value || 0)) : updated.taxRate;

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

    const calculateTotals = useMemo(() => {
        const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);
        const taxTotal = items.reduce((sum, i) => sum + (i.quantity * i.unitCost * i.taxRate / 100), 0);
        const totalAmount = subtotal + taxTotal;
        return { subtotal, taxTotal, totalAmount };
    }, [items]);

    const handleSubmit = async () => {
        if (!header.vendorId) return toast.error('Please select a vendor');
        if (!header.warehouseId) return toast.error('Please select a warehouse');
        if (!header.purchaseNumber) return toast.error('Please enter purchase/invoice number');
        if (items.length === 0) return toast.error('Please add at least one item');

        const invalidItems = items.filter(i => !i.productId || i.quantity <= 0);
        if (invalidItems.length > 0) return toast.error('Please check items: ensure product selected and quantity > 0');

        try {
            setIsSubmitting(true);
            const payload = {
                business_id: business.id,
                vendor_id: header.vendorId,
                warehouse_id: header.warehouseId,
                purchase_number: header.purchaseNumber,
                date: header.date,
                notes: header.notes,
                subtotal: calculateTotals.subtotal,
                tax_total: calculateTotals.taxTotal,
                total_amount: calculateTotals.totalAmount,
                items: items.map(i => ({
                    product_id: i.productId,
                    description: i.description,
                    quantity: parseFloat(String(i.quantity)),
                    unit_cost: parseFloat(String(i.unitCost)),
                    tax_rate: parseFloat(String(i.taxRate)),
                    batch_number: i.batchNumber,
                    manufacturing_date: i.manufacturingDate, // Should be added to UI if needed, currently reusing logic
                    expiry_date: i.expiryDate,
                    total_amount: i.total
                }))
            };

            await purchaseAPI.create(payload);
            toast.success('Purchase recorded successfully');
            router.push('/purchases');
        } catch (error) {
            console.error('Save error:', error);
            toast.error(error.message || 'Failed to save purchase');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVendorCreated = (newVendor) => {
        setVendors([...vendors, newVendor]);
        setHeader(prev => ({ ...prev, vendorId: newVendor.id }));
        setShowVendorForm(false);
    };

    const handleWarehouseCreated = (newWh) => {
        setWarehouses(prev => [...prev, newWh]);
        setHeader(prev => ({ ...prev, warehouseId: newWh.id }));
        setShowWarehouseForm(false);
    };

    const handleProductCreated = async (productData) => {
        // ProductForm passes pure data, we need to save it via API here to get ID
        // Actually ProductForm usually calls onSave with the payload. 
        // If we use the standard ProductForm component, it expects onSave to be an async function that handles everything.
        try {
            const newProduct = await productAPI.create({
                ...productData,
                business_id: business.id
            });
            setProducts(prev => [...prev, newProduct]);

            // Auto-fill in the first empty line item or add new one
            setItems(prev => {
                const newItems = [...prev];
                const emptyIndex = newItems.findIndex(i => !i.productId);
                if (emptyIndex !== -1) {
                    newItems[emptyIndex] = {
                        ...newItems[emptyIndex],
                        productId: newProduct.id,
                        description: newProduct.name,
                        unitCost: newProduct.cost_price || 0,
                        taxRate: newProduct.tax_percent || 0,
                        total: (newItems[emptyIndex].quantity || 1) * (newProduct.cost_price || 0) * (1 + (newProduct.tax_percent || 0) / 100)
                    };
                    return newItems;
                } else {
                    return [...prev, {
                        id: Date.now(),
                        productId: newProduct.id,
                        description: newProduct.name,
                        quantity: 1,
                        unitCost: newProduct.cost_price || 0,
                        taxRate: newProduct.tax_percent || 0,
                        batchNumber: '',
                        expiryDate: '',
                        total: (newProduct.cost_price || 0) * (1 + (newProduct.tax_percent || 0) / 100)
                    }];
                }
            });

            toast.success(`Product "${newProduct.name}" created and selected`);
            setShowProductForm(false);
        } catch (error) {
            console.error(error);
            // Error handled by form or toast
        }
    };

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back to Purchases</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900">Record Purchase</h1>
                    <p className="text-gray-500">Enter supplier invoice details to update inventory</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Purchase
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Purchase Details */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-md overflow-hidden">
                        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-800">
                                <FileText className="w-5 h-5 text-blue-500" />
                                Invoice Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 grid gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-400">Supplier *</Label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Combobox
                                                options={vendors.map(v => ({
                                                    value: v.id,
                                                    label: v.name,
                                                    description: v.city ? `City: ${v.city}` : (v.ntn ? `NTN: ${v.ntn}` : null)
                                                }))}
                                                value={header.vendorId}
                                                onChange={(val) => setHeader({ ...header, vendorId: val })}
                                                placeholder="Select Vendor"
                                                emptyText="No vendors found. Click + to add."
                                            />
                                        </div>
                                        <Dialog open={showVendorForm} onOpenChange={setShowVendorForm}>
                                            <DialogTrigger asChild>
                                                <Button size="icon" variant="outline" className="h-11 w-11 shrink-0 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50">
                                                    <Plus className="w-5 h-5 text-gray-500 hover:text-blue-600" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Add New Vendor</DialogTitle>
                                                </DialogHeader>
                                                <QuickVendorForm onSave={handleVendorCreated} onCancel={() => setShowVendorForm(false)} />
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-400">Warehouse *</Label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Combobox
                                                options={warehouses.map(w => ({
                                                    value: w.id,
                                                    label: w.name,
                                                    description: w.type || 'Warehouse'
                                                }))}
                                                value={header.warehouseId}
                                                onChange={(val) => setHeader({ ...header, warehouseId: val })}
                                                placeholder="Receiving Location"
                                                renderEmpty={/** @type {() => React.ReactNode} */ () => (
                                                    <div className="py-2 px-3 text-center">
                                                        <p className="text-xs text-gray-400 mb-2 font-medium">No storage locations found</p>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 text-[10px] w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                                                            onClick={() => setShowWarehouseForm(true)}
                                                        >
                                                            <Plus className="w-3 h-3 mr-1" /> Add Warehouse
                                                        </Button>
                                                    </div>
                                                )}
                                            />
                                        </div>
                                        <Dialog open={showWarehouseForm} onOpenChange={setShowWarehouseForm}>
                                            <DialogTrigger asChild>
                                                <Button size="icon" variant="outline" className="h-11 w-11 shrink-0 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50">
                                                    <Plus className="w-5 h-5 text-gray-500 hover:text-blue-600" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Add Storage Location</DialogTitle>
                                                </DialogHeader>
                                                <QuickWarehouseForm
                                                    onSave={handleWarehouseCreated}
                                                    onCancel={() => setShowWarehouseForm(false)}
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-400">Invoice No. *</Label>
                                    <Input
                                        value={header.purchaseNumber}
                                        onChange={e => setHeader({ ...header, purchaseNumber: e.target.value })}
                                        placeholder="e.g. INV-2024-001"
                                        className="h-11 font-medium"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-400">Invoice Date *</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            type="date"
                                            value={header.date}
                                            onChange={e => setHeader({ ...header, date: e.target.value })}
                                            className="h-11 pl-10"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md overflow-hidden min-h-[400px]">
                        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-800">
                                <Building2 className="w-5 h-5 text-blue-500" />
                                Line Items
                            </CardTitle>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => setShowProductForm(true)} className="h-8 text-xs border-dashed">
                                    <Plus className="w-3 h-3 mr-1" /> New Product
                                </Button>
                                <Button size="sm" onClick={addItem} className="h-8 text-xs bg-gray-900 text-white hover:bg-gray-800">
                                    <Plus className="w-3 h-3 mr-1" /> Add Line
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-wider border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-3 w-[30%]">Product</th>
                                            <th className="px-4 py-3 w-[10%]">Qty</th>
                                            <th className="px-4 py-3 w-[15%]">Cost</th>
                                            <th className="px-4 py-3 w-[10%]">Tax %</th>
                                            <th className="px-4 py-3 w-[15%]">Batch/Exp</th>
                                            <th className="px-6 py-3 w-[15%] text-right">Line Total</th>
                                            <th className="px-4 py-3 w-[5%]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {items.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-6 py-3 align-top">
                                                    <div className="space-y-1">
                                                        <Combobox
                                                            options={products.map(p => ({
                                                                value: p.id,
                                                                label: p.name,
                                                                description: `SKU: ${p.sku || 'N/A'} | Stock: ${p.stock || 0} ${p.unit || ''} | Price: ${formatCurrency(p.cost_price || 0, currency)}`
                                                            }))}
                                                            value={item.productId}
                                                            onChange={val => updateItem(item.id, 'productId', val)}
                                                            placeholder="Select Product..."
                                                            className="h-9 rounded-md border-gray-200"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <Input
                                                        type="number"
                                                        className="h-9 text-center rounded-xl border-gray-200 bg-white font-bold text-gray-900 focus:ring-blue-500"
                                                        value={item.quantity}
                                                        onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                                                        min="0"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">₨</span>
                                                        <Input
                                                            type="number"
                                                            className="h-9 text-right pl-7 rounded-xl border-gray-200 bg-white font-bold text-gray-900 focus:ring-blue-500"
                                                            value={item.unitCost}
                                                            onChange={e => updateItem(item.id, 'unitCost', e.target.value)}
                                                            min="0"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            className="h-9 text-center pr-5 rounded-xl border-gray-200 bg-white font-bold text-gray-900 focus:ring-blue-500"
                                                            value={item.taxRate}
                                                            onChange={e => updateItem(item.id, 'taxRate', e.target.value)}
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 align-top space-y-2">
                                                    <Input
                                                        className="h-8 text-[10px] bg-transparent border-gray-200"
                                                        placeholder="Batch No"
                                                        value={item.batchNumber}
                                                        onChange={e => updateItem(item.id, 'batchNumber', e.target.value)}
                                                    />
                                                    <Input
                                                        type="date"
                                                        className="h-8 text-[10px] bg-transparent border-gray-200"
                                                        value={item.expiryDate}
                                                        onChange={e => updateItem(item.id, 'expiryDate', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-6 py-3 align-top text-right font-mono font-bold text-gray-700">
                                                    {formatCurrency(item.total, currency)}
                                                </td>
                                                <td className="px-4 py-3 align-top text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => removeItem(item.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {items.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-12 text-center text-gray-400 bg-gray-50/30 dashed-border">
                                                    No items added. Use the &quot;Add Line&quot; button to start.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Summary & Notes */}
                <div className="space-y-6">
                    <Card className="border-none shadow-md bg-white">
                        <CardHeader className="bg-gray-900 text-white rounded-t-xl pb-6">
                            <CardTitle className="text-sm font-medium opacity-80">Total Payable</CardTitle>
                            <div className="text-3xl font-black tracking-tight mt-1">
                                {formatCurrency(calculateTotals.totalAmount, currency)}
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span className="font-medium">{formatCurrency(calculateTotals.subtotal, currency)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Total Tax</span>
                                <span className="font-medium">{formatCurrency(calculateTotals.taxTotal, currency)}</span>
                            </div>
                            <div className="border-t border-gray-100 pt-4 mt-2">
                                <div className="flex justify-between text-base font-bold text-gray-900">
                                    <span>Grand Total</span>
                                    <span>{formatCurrency(calculateTotals.totalAmount, currency)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase text-gray-500">Notes / Instructions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                className="w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                                rows={4}
                                placeholder="Add notes about delivery, payment terms, or condition..."
                                value={header.notes}
                                onChange={e => setHeader({ ...header, notes: e.target.value })}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Product Dialog */}
            <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Product</DialogTitle>
                    </DialogHeader>
                    <ProductForm
                        onSave={handleProductCreated}
                        onCancel={() => setShowProductForm(false)}
                        category={business?.domain || 'retail-shop'} // Pass current domain
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
