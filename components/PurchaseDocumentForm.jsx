import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Save, FileText, Loader2, Link, ShoppingCart, Truck, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { useBusiness } from '@/lib/context/BusinessContext';
import { formatCurrency } from '@/lib/currency';
import {
    createPurchaseAction,
} from '@/lib/actions/standard/purchase';
import {
    getDomainDefaultTax,
    getDomainTheme,
    isBatchTrackingEnabled,
} from '@/lib/utils/domainHelpers';
import toast from 'react-hot-toast';
import { showActionError, formatValidationErrors, isValidationError } from '@/lib/utils/formErrorHandler';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import { purchaseSchema, validateWithSchema } from '@/lib/validation/schemas';

const PROCUREMENT_CONFIGS = {
    purchase_order: {
        title: 'Purchase Order',
        prefix: 'PO',
        status: 'draft',
        theme: 'indigo',
        icon: ShoppingCart
    },
    purchase_requisition: {
        title: 'Purchase Requisition',
        prefix: 'PR',
        status: 'pending',
        theme: 'amber',
        icon: FileText
    },
    received_purchase: {
        title: 'Received Purchase (Bill)',
        prefix: 'PB',
        status: 'received',
        theme: 'green',
        icon: Truck
    }
};

// Static class map for Tailwind JIT -- avoids dynamic template-literal classes
const THEME_CLASSES = {
    indigo: {
        iconBg: 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/50',
        saveBtn: 'bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20',
    },
    amber: {
        iconBg: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50',
        saveBtn: 'bg-amber-600 hover:bg-amber-700 shadow-xl shadow-amber-500/20',
    },
    green: {
        iconBg: 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50',
        saveBtn: 'bg-green-600 hover:bg-green-700 shadow-xl shadow-green-500/20',
    },
};

export function PurchaseDocumentForm({
    type = 'purchase_order',
    onClose,
    onSave,
    products = [],
    vendors = [],
    warehouses = [],
    initialData = null,
    category = 'retail-shop'
}) {
    const { business, currency } = useBusiness();
    const { language } = useLanguage();
    const t = translations[language];

    const domainCategory = category || business?.category || 'retail-shop';
    const theme = getDomainTheme(domainCategory);
    const config = PROCUREMENT_CONFIGS[type];

    const showBatch = isBatchTrackingEnabled(domainCategory);

    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState(() => {
        if (initialData) {
            return {
                vendor_id: initialData.vendor_id || '',
                date: new Date().toISOString().split('T')[0],
                expected_delivery: initialData.expected_delivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                notes: initialData.notes || '',
                shipping_address: initialData.shipping_address || '',
                warehouse_id: initialData.warehouse_id || '',
                items: initialData.items?.map(item => ({
                    id: Date.now() + Math.random(),
                    product_id: item.product_id,
                    name: item.product_name || item.name || '',
                    quantity: item.quantity,
                    unit_cost: item.unit_cost || item.cost_price || 0,
                    batch_number: item.batch_number || '',
                    expiry_date: item.expiry_date || null,
                    tax_rate: item.tax_rate || 0
                })) || []
            };
        }
        return {
            vendor_id: '',
            date: new Date().toISOString().split('T')[0],
            expected_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: '',
            shipping_address: '',
            warehouse_id: warehouses[0]?.id || '',
            items: []
        };
    });

    const totals = useMemo(() => {
        const subtotal = formData.items.reduce((sum, item) => {
            return sum + (item.quantity * item.unit_cost);
        }, 0);

        const tax_total = formData.items.reduce((sum, item) => {
            return sum + (item.quantity * item.unit_cost * (item.tax_rate / 100));
        }, 0);

        const total_amount = subtotal + tax_total;

        return { subtotal, tax_total, total_amount };
    }, [formData.items]);

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    id: Date.now(),
                    product_id: '',
                    name: '',
                    quantity: 1,
                    unit_cost: 0,
                    batch_number: '',
                    expiry_date: null,
                    tax_rate: getDomainDefaultTax(domainCategory)
                }
            ]
        }));
    };

    const removeItem = (id) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== id)
        }));
    };

    const updateItem = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };

                    if (field === 'product_id' && value) {
                        const product = products.find(p => p.id === value);
                        if (product) {
                            updated.unit_cost = product.cost_price || 0;
                            updated.name = product.name;
                            updated.tax_rate = product.tax_percent || getDomainDefaultTax(domainCategory);
                        }
                    }

                    return updated;
                }
                return item;
            })
        }));
    };

    const handleSave = async () => {
        // Zod schema validation
        const validation = validateWithSchema(purchaseSchema, {
            business_id: business?.id,
            vendor_id: formData.vendor_id || null,
            purchase_number: `${config.prefix}-${Date.now()}`,
            date: formData.date,
            warehouse_id: formData.warehouse_id || null,
            status: config.status,
            items: formData.items.map(item => ({
                product_id: item.product_id || undefined,
                name: item.name,
                quantity: parseFloat(item.quantity) || 0,
                unit_cost: parseFloat(item.unit_cost) || 0,
                tax_rate: parseFloat(item.tax_rate) || 0,
            })),
            subtotal: totals.subtotal,
            tax_total: totals.tax_total,
            total_amount: totals.total_amount,
            notes: formData.notes || null,
        });
        if (!validation.success) {
            const firstError = Object.values(validation.errors)[0];
            toast.error(firstError || 'Please fix validation errors');
            return;
        }

        if (!formData.vendor_id) {
            toast.error('Please select a vendor');
            return;
        }

        setIsSaving(true);
        try {
            const documentData = {
                ...formData,
                ...totals,
                business_id: business?.id,
                status: config.status,
                purchase_number: `${config.prefix}-${Date.now()}`
            };

            const result = await createPurchaseAction(documentData);

            if (result.success) {
                toast.success(`${config.title} created successfully`);
                onSave?.();
                onClose?.();
            } else {
                // Handle validation errors separately
                if (isValidationError(result)) {
                    const fieldErrors = formatValidationErrors(result);
                    // You can set field errors here if you have a state for them
                    toast.error('Please fix validation errors');
                    return;
                }
                
                // Show user-friendly error message
                showActionError(result);
            }
        } catch (error) {
            console.error(`Error saving ${type}:`, error);
            toast.error(`Failed to save ${type}: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const Icon = config.icon;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border-none">
                <CardHeader className={`flex flex-row items-center justify-between border-b p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${THEME_CLASSES[config.theme]?.iconBg}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black uppercase tracking-tighter">{config.title}</CardTitle>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                {business?.name} * Procurement Module
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-white/50 hover:text-white">
                        <X className="w-5 h-5" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/50">
                    {/* Header Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vendor / Supplier *</Label>
                            <Combobox
                                options={vendors.map(v => ({
                                    value: String(v.id),
                                    label: v.name,
                                    description: v.city || 'No City'
                                }))}
                                value={String(formData.vendor_id || '')}
                                onChange={(val) => setFormData(prev => ({ ...prev, vendor_id: val }))}
                                placeholder="Search vendors..."
                                emptyText="No vendors found"
                                className="h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Order Date</Label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    className="h-12 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                                    value={formData.date || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                />
                                <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Expected Delivery</Label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    className="h-12 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                                    value={formData.expected_delivery || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery: e.target.value }))}
                                />
                                <Truck className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Receiving Warehouse</Label>
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
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Shipping Address (Optional)</Label>
                            <Input
                                placeholder="Warehouse location or custom address..."
                                className="h-12 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={formData.shipping_address || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, shipping_address: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Label className="text-xl font-black text-gray-900 uppercase tracking-tighter">Purchase Items</Label>
                                <Badge variant="outline" className="rounded-full px-2 py-0 h-5 text-[10px] font-bold bg-white">{formData.items.length} Lines</Badge>
                            </div>
                            <Button onClick={addItem} type="button" className="bg-gray-900 border-none hover:bg-black text-white h-10 px-5 rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-lg">
                                <Plus className="w-4 h-4" />
                                Add Product
                            </Button>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product / Service</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Qty</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Unit Cost</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Tax%</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Line Total</th>
                                        <th className="px-6 py-4 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {formData.items.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                                                        <ShoppingCart className="w-6 h-6 text-gray-300" />
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No items added to this order</p>
                                                    <Button variant="link" onClick={addItem} className="text-indigo-600 font-black text-xs uppercase p-0">Click here to start adding items</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        formData.items.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <Combobox
                                                        options={products.map(p => ({
                                                            value: String(p.id),
                                                            label: p.name,
                                                            description: p.sku ? `SKU: ${p.sku}` : ''
                                                        }))}
                                                        value={String(item.product_id || '')}
                                                        onChange={(val) => updateItem(item.id, 'product_id', val)}
                                                        placeholder="Search products..."
                                                        emptyText="No products found"
                                                        className="h-10 border-gray-200"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 px-2">
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        className="h-10 text-right border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                        value={item.quantity || 0}
                                                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 px-2">
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            className="h-10 text-right border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-8"
                                                            value={item.unit_cost || 0}
                                                            onChange={(e) => updateItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 px-2">
                                                    <Input
                                                        type="number"
                                                        className="h-10 text-right border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                        value={item.tax_rate || 0}
                                                        onChange={(e) => updateItem(item.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-gray-900">
                                                    {formatCurrency(item.quantity * item.unit_cost * (1 + item.tax_rate / 100), currency)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        onClick={() => removeItem(item.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer / Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Order Notes / Internal Instructions</Label>
                                <textarea
                                    className="w-full h-32 px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-medium shadow-sm resize-none"
                                    placeholder="Tell the supplier about delivery instructions, quality checks, etc..."
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-2xl space-y-4">
                            <div className="flex justify-between items-center text-gray-500 text-sm">
                                <span className="font-bold uppercase tracking-widest text-[10px]">Net Subtotal</span>
                                <span className="font-bold">{formatCurrency(totals.subtotal, currency)}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-500 text-sm">
                                <span className="font-bold uppercase tracking-widest text-[10px]">Tax Amount</span>
                                <span className="font-bold">{formatCurrency(totals.tax_total, currency)}</span>
                            </div>
                            <div className="pt-4 mt-4 border-t border-dashed flex justify-between items-end">
                                <div>
                                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 leading-none mb-2">Grand Total</span>
                                    <span className="text-4xl font-black text-gray-900 tracking-tighter leading-none">
                                        {formatCurrency(totals.total_amount, currency)}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded-md mb-1">Items: {formData.items.length}</span>
                                    <Badge className="bg-gray-100 text-gray-900 border-none font-black text-[10px] uppercase">
                                        {currency}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>

                <div className="p-6 bg-white border-t flex justify-between items-center bg-gray-50/80 backdrop-blur-md">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving} className="font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-900">
                        Cancel & Close
                    </Button>
                    <div className="flex gap-4">
                        <Button
                            disabled={isSaving}
                            variant="outline"
                            onClick={() => {
                                toast.success('Draft saved locally');
                            }}
                            className="h-12 px-6 rounded-xl border-gray-200 font-black text-xs uppercase tracking-widest hover:bg-gray-100"
                        >
                            Save Draft
                        </Button>
                        <Button
                            disabled={isSaving}
                            onClick={handleSave}
                            className={`h-12 px-10 rounded-xl ${THEME_CLASSES[config.theme]?.saveBtn} text-white font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2`}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Process {config.title}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
