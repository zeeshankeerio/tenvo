'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, Package, AlertTriangle, Search, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { useBusiness } from '@/lib/context/BusinessContext';
import { formatCurrency } from '@/lib/currency';
import { adjustStockAction } from '@/lib/actions/standard/inventory/stock';
import { getWarehouseLocationsAction } from '@/lib/actions/standard/inventory/warehouse';
import toast from 'react-hot-toast';

// --- Reason codes for stock adjustments --------------------------------------
const ADJUSTMENT_REASONS = [
    { value: 'counting_error', label: 'Counting Error', icon: '🔢', color: 'bg-blue-100 text-blue-700' },
    { value: 'damage', label: 'Damage / Spoilage', icon: '💔', color: 'bg-red-100 text-red-700' },
    { value: 'theft', label: 'Theft / Loss', icon: '[ALERT]', color: 'bg-red-100 text-red-700' },
    { value: 'expiry', label: 'Expired Stock', icon: '⏳', color: 'bg-amber-100 text-amber-700' },
    { value: 'sample', label: 'Sample / Testing', icon: '[TEST]', color: 'bg-wine-100 text-wine-700' },
    { value: 'write_off', label: 'Write-Off', icon: '[DECREASE]', color: 'bg-gray-100 text-gray-700' },
    { value: 'found', label: 'Found Stock', icon: '[SEARCH]', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'opening', label: 'Opening Balance', icon: '[CHART]', color: 'bg-indigo-100 text-indigo-700' },
    { value: 'other', label: 'Other', icon: '[CLIPBOARD]', color: 'bg-gray-100 text-gray-700' },
];

const ADJUSTMENT_TYPES = [
    { value: 'increase', label: 'Increase Stock', icon: ArrowUp, color: 'emerald' },
    { value: 'decrease', label: 'Decrease Stock', icon: ArrowDown, color: 'red' },
    { value: 'set_to', label: 'Set Exact Quantity', icon: RotateCcw, color: 'blue' },
];

// Static class map for Tailwind JIT
const ADJ_COLOR_CLASSES = {
    emerald: { active: 'border-emerald-500 bg-emerald-50 shadow-lg', icon: 'text-emerald-600', text: 'text-emerald-700' },
    red: { active: 'border-red-500 bg-red-50 shadow-lg', icon: 'text-red-600', text: 'text-red-700' },
    blue: { active: 'border-blue-500 bg-blue-50 shadow-lg', icon: 'text-blue-600', text: 'text-blue-700' },
};

export function StockAdjustmentForm({ onClose, onSave, products = [], warehouses = [] }) {
    const { business, currency } = useBusiness();
    const [isSaving, setIsSaving] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [formData, setFormData] = useState({
        product_id: '',
        warehouse_id: warehouses[0]?.id || '',
        adjustment_type: 'decrease',
        quantity: '',
        reason: 'counting_error',
        notes: '',
        date: new Date().toISOString().split('T')[0],
    });

    // Filter products by search
    const filteredProducts = products.filter(p =>
        !productSearch ||
        p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode?.includes(productSearch)
    ).slice(0, 15);

    const selectProduct = (product) => {
        setSelectedProduct(product);
        setFormData(prev => ({ ...prev, product_id: product.id }));
        setProductSearch('');
    };

    const handleSave = async () => {
        if (!formData.product_id) {
            toast.error('Please select a product');
            return;
        }
        if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
            toast.error('Please enter a valid quantity');
            return;
        }
        if (!formData.reason) {
            toast.error('Please select an adjustment reason');
            return;
        }

        setIsSaving(true);
        try {
            const qty = parseFloat(formData.quantity);
            let adjustmentQty = qty;

            if (formData.adjustment_type === 'decrease') {
                adjustmentQty = -qty;
            } else if (formData.adjustment_type === 'set_to') {
                // For "set to", calculate the difference
                const currentStock = selectedProduct?.current_stock || selectedProduct?.stock || 0;
                adjustmentQty = qty - currentStock;
            }

            const result = await adjustStockAction({
                businessId: business?.id,
                productId: formData.product_id,
                warehouseId: formData.warehouse_id || undefined,
                quantity: Math.abs(adjustmentQty),
                type: adjustmentQty >= 0 ? 'adjustment_in' : 'adjustment_out',
                reason: formData.reason,
                notes: formData.notes,
                date: formData.date,
                costPrice: selectedProduct?.cost_price || 0,
            });

            if (result.success) {
                toast.success(`Stock adjusted: ${selectedProduct?.name}`);
                onSave?.();
                onClose?.();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Stock adjustment error:', error);
            toast.error(`Adjustment failed: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const activeType = ADJUSTMENT_TYPES.find(t => t.value === formData.adjustment_type);
    const activeReason = ADJUSTMENT_REASONS.find(r => r.value === formData.reason);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border-none rounded-3xl">
                {/* Header */}
                <CardHeader className="flex flex-row items-center justify-between border-b p-6 bg-gradient-to-r from-amber-900 via-amber-800 to-orange-900 text-white flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black uppercase tracking-tighter">Stock Adjustment</CardTitle>
                            <p className="text-xs font-bold text-amber-300/70 uppercase tracking-widest mt-1">
                                {business?.name} * Inventory Correction
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-white/50 hover:text-white">
                        <X className="w-5 h-5" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/50">
                    {/* Product Search */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Product *</Label>
                        {selectedProduct ? (
                            <div className="flex items-center gap-4 p-4 bg-white border border-amber-200 rounded-2xl shadow-sm">
                                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                                    <Package className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-gray-900">{selectedProduct.name}</p>
                                    <p className="text-xs text-gray-400 font-bold">
                                        SKU: {selectedProduct.sku || '--'} * Current Stock: <span className="text-amber-600 font-black">{selectedProduct.current_stock || selectedProduct.stock || 0}</span>
                                    </p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedProduct(null); setFormData(prev => ({ ...prev, product_id: '' })); }} className="text-gray-400 hover:text-red-500">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    placeholder="Search by name, SKU, or barcode..."
                                    className="h-12 pl-11 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500"
                                />
                                {productSearch && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-10 max-h-60 overflow-y-auto">
                                        {filteredProducts.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => selectProduct(p)}
                                                className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
                                            >
                                                <Package className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                                                    <p className="text-[10px] text-gray-400">SKU: {p.sku || '--'} * Stock: {p.current_stock || p.stock || 0}</p>
                                                </div>
                                            </button>
                                        ))}
                                        {filteredProducts.length === 0 && (
                                            <p className="px-4 py-6 text-center text-gray-400 text-sm">No products found</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Adjustment Type */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Adjustment Type</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {ADJUSTMENT_TYPES.map(type => {
                                const TypeIcon = type.icon;
                                const isActive = formData.adjustment_type === type.value;
                                return (
                                    <button
                                        key={type.value}
                                        onClick={() => setFormData(prev => ({ ...prev, adjustment_type: type.value }))}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${isActive
                                                ? ADJ_COLOR_CLASSES[type.color]?.active
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                    >
                                        <TypeIcon className={`w-5 h-5 ${isActive ? ADJ_COLOR_CLASSES[type.color]?.icon : 'text-gray-400'}`} />
                                        <span className={`text-xs font-black uppercase tracking-widest ${isActive ? ADJ_COLOR_CLASSES[type.color]?.text : 'text-gray-500'}`}>
                                            {type.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quantity + Warehouse */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {formData.adjustment_type === 'set_to' ? 'New Quantity *' : 'Adjustment Quantity *'}
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                className="h-12 text-xl font-black text-center border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500"
                                value={formData.quantity}
                                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Warehouse</Label>
                            <Combobox
                                options={warehouses.map(w => ({
                                    value: String(w.id),
                                    label: w.name,
                                    description: w.location || ''
                                }))}
                                value={String(formData.warehouse_id || '')}
                                onChange={(val) => setFormData(prev => ({ ...prev, warehouse_id: val }))}
                                placeholder="Select warehouse..."
                                emptyText="No warehouses found"
                                className="h-12"
                            />
                        </div>
                    </div>

                    {/* Reason Code */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reason *</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {ADJUSTMENT_REASONS.map(reason => (
                                <button
                                    key={reason.value}
                                    onClick={() => setFormData(prev => ({ ...prev, reason: reason.value }))}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${formData.reason === reason.value
                                            ? `${reason.color} border-current shadow-md`
                                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                        }`}
                                >
                                    <span>{reason.icon}</span>
                                    {reason.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes + Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Notes (Optional)</Label>
                            <textarea
                                className="w-full h-24 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 transition-all outline-none font-medium shadow-sm resize-none"
                                placeholder="Additional details about this adjustment..."
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Adjustment Date</Label>
                            <Input
                                type="date"
                                className="h-12 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                            />
                        </div>
                    </div>
                </CardContent>

                {/* Footer */}
                <div className="p-6 bg-white border-t flex justify-between items-center bg-gray-50/80 backdrop-blur-md flex-shrink-0">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving} className="font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-900">
                        Cancel
                    </Button>
                    <Button
                        disabled={isSaving || !formData.product_id || !formData.quantity}
                        onClick={handleSave}
                        className="h-12 px-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Apply Adjustment
                    </Button>
                </div>
            </Card>
        </div>
    );
}

