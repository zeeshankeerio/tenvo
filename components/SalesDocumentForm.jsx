import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Save, FileText, Loader2, Link } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { useBusiness } from '@/lib/context/BusinessContext';
import { formatCurrency } from '@/lib/currency';
import {
    createQuotationAction,
    createSalesOrderAction,
    createChallanAction
} from '@/lib/actions/standard/quotation';
import {
    getDomainDefaultTax,
    isBatchTrackingEnabled,
    isSerialTrackingEnabled
} from '@/lib/utils/domainHelpers';
import { BatchSelector, SerialSelector } from '@/components/domain/SalesDomainSelectors';
import toast from 'react-hot-toast';
import { showActionError, formatValidationErrors, isValidationError } from '@/lib/utils/formErrorHandler';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';

const TYPE_CONFIGS = {
    quotation: {
        title: 'Quotation',
        prefix: 'QT',
        dateLabel: 'Quotation Date',
        extraDateLabel: 'Valid Until',
        extraDateField: 'valid_until',
        numberField: 'quotation_number',
        action: createQuotationAction
    },
    sales_order: {
        title: 'Sales Order',
        prefix: 'SO',
        dateLabel: 'Order Date',
        extraDateLabel: 'Delivery Date',
        extraDateField: 'delivery_date',
        numberField: 'order_number',
        action: createSalesOrderAction
    },
    delivery_challan: {
        title: 'Delivery Challan',
        prefix: 'DC',
        dateLabel: 'Challan Date',
        extraDateLabel: 'Delivery Date',
        extraDateField: 'delivery_date',
        numberField: 'challan_number',
        action: createChallanAction
    }
};

export function SalesDocumentForm({
    type = 'quotation',
    onClose,
    onSave,
    products = [],
    customers = [],
    warehouses = [],
    initialData = null,
    category = 'retail-shop'
}) {
    const { business, currency } = useBusiness();
    const { language } = useLanguage();
    const t = translations[language];

    // Explicitly use the prop 'category' or fall back to business.category if available
    // But since `category` is passed as a prop, we use it.
    // However, if we need to check features, we should ensure we have the right context.
    const domainCategory = category || business?.category || 'retail-shop';

    const config = TYPE_CONFIGS[type];

    // Check features
    const showBatch = isBatchTrackingEnabled(domainCategory);
    const showSerial = isSerialTrackingEnabled(domainCategory);

    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState(() => {
        if (initialData) {
            return {
                customer_id: initialData.customer_id || '',
                date: new Date().toISOString().split('T')[0],
                [config.extraDateField]: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                notes: initialData.notes || '',
                items: initialData.items?.map(item => ({
                    id: Date.now() + Math.random(),
                    product_id: item.product_id,
                    name: item.product_name || item.name || '',
                    quantity: item.quantity,
                    unit_price: item.unit_price || 0,
                    batch_number: item.batch_number || '',
                    serial_number: item.serial_number || '',
                    expiry_date: item.expiry_date || null,
                    // Textile specific
                    article_no: item.article_no || '',
                    design_no: item.design_no || ''
                })) || [],
                // Linking logic
                quotation_id: type === 'sales_order' ? initialData.id : (initialData.quotation_id || null),
                sales_order_id: type === 'delivery_challan' ? initialData.id : null
            };
        }
        return {
            customer_id: '',
            date: new Date().toISOString().split('T')[0],
            [config.extraDateField]: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: '',
            items: []
        };
    });

    const totals = useMemo(() => {
        const subtotal = formData.items.reduce((sum, item) => {
            return sum + (item.quantity * item.unit_price);
        }, 0);

        const domainTax = getDomainDefaultTax(domainCategory);
        const tax_total = subtotal * (domainTax / 100);
        const total_amount = subtotal + tax_total;

        return { subtotal, tax_total, total_amount, taxRate: domainTax };
    }, [formData.items, domainCategory]);

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
                    unit_price: 0,
                    batch_number: '',
                    serial_number: '',
                    expiry_date: null,
                    article_no: '',
                    design_no: ''
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

                    // Auto-fill price if product is selected
                    if (field === 'product_id' && value) {
                        const product = products.find(p => p.id === value);
                        if (product) {
                            updated.unit_price = product.price || 0;
                            updated.name = product.name;
                        }
                    }

                    return updated;
                }
                return item;
            })
        }));
    };

    const handleSave = async () => {
        if (!formData.customer_id) {
            toast.error('Please select a customer');
            return;
        }
        if (formData.items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }
        if (formData.items.some(item => !item.product_id)) {
            toast.error('Please select products for all items');
            return;
        }
        // Validation for Batch/Serial
        if (showBatch && formData.items.some(item => !item.batch_number)) {
            toast.error('Batch number is required for all items');
            return;
        }
        if (showSerial && formData.items.some(item => !item.serial_number)) {
            toast.error('Serial number is required for all items');
            return;
        }

        setIsSaving(true);
        try {
            const documentData = {
                ...formData,
                ...totals,
                business_id: business?.id, // Use from context
                businessId: business?.id, // For compatibility
                status: type === 'quotation' ? 'draft' : (type === 'delivery_challan' ? 'issued' : 'pending'),
                [config.numberField]: `${config.prefix}-${Date.now()}`
            };

            // Add delivery address for challans if available
            if (type === 'delivery_challan') {
                documentData.delivery_address = formData.delivery_address || null;
            }

            const result = await config.action(documentData);

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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-wine-50/30">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black text-wine-600 tracking-tight">Generate {config.title}</CardTitle>
                        {initialData && (
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest animate-in slide-in-from-left-2 duration-300">
                                <Link className="w-3.5 h-3.5 text-wine-600" />
                                <span>Derived from {initialData.quotation_number || initialData.order_number || initialData.challan_number || 'Source Document'}</span>
                                <Badge className="bg-wine-600/10 text-wine-600 hover:bg-wine-600/20 border-none text-[9px] font-black h-4 px-1.5 uppercase">Linked</Badge>
                            </div>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-wine/5">
                        <X className="w-5 h-5 text-gray-400" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Customer *</Label>
                            <Combobox
                                options={customers.map(c => ({
                                    value: String(c.id),
                                    label: c.name,
                                    description: c.phone || c.email || ''
                                }))}
                                value={String(formData.customer_id || '')}
                                onChange={(val) => setFormData(prev => ({ ...prev, customer_id: val }))}
                                placeholder="Search customers..."
                                emptyText="No customers found"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label>{config.dateLabel}</Label>
                                <Input
                                    type="date"
                                    value={formData.date || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{config.extraDateLabel}</Label>
                                <Input
                                    type="date"
                                    value={formData[config.extraDateField] || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, [config.extraDateField]: e.target.value }))}
                                />
                            </div>
                        </div>
                        {type === 'delivery_challan' && (
                            <>
                                <div className="space-y-2 col-span-2">
                                    <Label>Delivery Address</Label>
                                    <Input
                                        value={formData.delivery_address || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_address: e.target.value }))}
                                        placeholder="Enter physical delivery address..."
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Warehouse *</Label>
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
                                    />
                                    <p className="text-xs text-gray-500">Stock will be deducted from this warehouse</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-lg font-bold">Items</Label>
                            <Button size="sm" onClick={addItem} type="button">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Item
                            </Button>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left">{t.products_stat || 'Product'}</th>
                                        {domainCategory === 'textile-wholesale' && <th className="px-4 py-2 text-left">{t.article_no}/{t.design_no}</th>}
                                        {(showBatch || showSerial) && <th className="px-4 py-2 text-left w-48">{t.batch_tracking}/{t.serial_numbers}</th>}
                                        <th className="px-4 py-2 text-right w-24">Qty</th>
                                        <th className="px-4 py-2 text-right w-32">Price</th>
                                        <th className="px-4 py-2 text-right w-32">Total</th>
                                        <th className="px-4 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.items.length === 0 ? (
                                        <tr>
                                            <td colSpan={(showBatch || showSerial) ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                                                No items added. Click "Add Item" to start.
                                            </td>
                                        </tr>
                                    ) : (
                                        formData.items.map((item) => (
                                            <tr key={item.id} className="border-b last:border-0">
                                                <td className="px-4 py-2">
                                                    <Combobox
                                                        options={products.map(p => ({
                                                            value: String(p.id),
                                                            label: p.name,
                                                            description: p.sku ? `SKU: ${p.sku}` : (p.price ? `Price: ${p.price}` : '')
                                                        }))}
                                                        value={String(item.product_id || '')}
                                                        onChange={(val) => updateItem(item.id, 'product_id', val)}
                                                        placeholder="Search products..."
                                                        emptyText="No products found"
                                                        className="h-8 border-none bg-transparent shadow-none"
                                                    />
                                                    {item.product_id && (
                                                        <div className="mt-1 flex items-center gap-1.5 px-1 animate-in fade-in slide-in-from-top-1 duration-300">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${(products.find(p => p.id === item.product_id)?.stock || 0) > 0
                                                                ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]'
                                                                : 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]'
                                                                }`} />
                                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                                In Stock: <span className="text-gray-900">{products.find(p => p.id === item.product_id)?.stock || 0}</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                {domainCategory === 'textile-wholesale' && (
                                                    <td className="px-4 py-2">
                                                        <div className="flex gap-1">
                                                            <Input
                                                                placeholder="Art #"
                                                                className="h-8 text-xs min-w-[60px]"
                                                                value={item.article_no || ''}
                                                                onChange={(e) => updateItem(item.id, 'article_no', e.target.value)}
                                                            />
                                                            <Input
                                                                placeholder="Des #"
                                                                className="h-8 text-xs min-w-[60px]"
                                                                value={item.design_no || ''}
                                                                onChange={(e) => updateItem(item.id, 'design_no', e.target.value)}
                                                            />
                                                        </div>
                                                    </td>
                                                )}
                                                {(showBatch || showSerial) && (
                                                    <td className="px-4 py-2">
                                                        {item.product_id ? (
                                                            <>
                                                                {showBatch && (
                                                                    <BatchSelector
                                                                        productId={item.product_id}
                                                                        businessId={business?.id}
                                                                        selectedBatch={item.batch_number}
                                                                        onSelect={(batchNum, expiry) => {
                                                                            updateItem(item.id, 'batch_number', batchNum);
                                                                            updateItem(item.id, 'expiry_date', expiry);
                                                                        }}
                                                                    />
                                                                )}
                                                                {showSerial && (
                                                                    <SerialSelector
                                                                        productId={item.product_id}
                                                                        businessId={business?.id}
                                                                        selectedSerial={item.serial_number}
                                                                        onSelect={(serialNum) => {
                                                                            updateItem(item.id, 'serial_number', serialNum);
                                                                            if (serialNum) updateItem(item.id, 'quantity', 1);
                                                                        }}
                                                                    />
                                                                )}
                                                            </>
                                                        ) : <span className="text-gray-400 text-xs">Select product first</span>}
                                                    </td>
                                                )}
                                                <td className="px-4 py-2">
                                                    <Input
                                                        type="number"
                                                        className="text-right"
                                                        value={item.quantity || 0}
                                                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                        disabled={showSerial && item.serial_number} // Lock qty if serial selected
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        type="number"
                                                        className="text-right"
                                                        value={item.unit_price || 0}
                                                        onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium">
                                                    {formatCurrency(item.quantity * item.unit_price, currency)}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-700"
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

                    {/* Footer / Totals */}
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <textarea
                                className="w-full p-2 border rounded-md h-24"
                                placeholder="Additional notes or instructions..."
                                value={formData.notes || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>{formatCurrency(totals.subtotal, currency)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Tax ({totals.taxRate}%)</span>
                                <span>{formatCurrency(totals.tax_total, currency)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                                <span>Total</span>
                                <span className="text-wine">{formatCurrency(totals.total_amount, currency)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <Button variant="outline" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button
                            disabled={isSaving}
                            onClick={handleSave}
                            className="bg-wine-600 hover:opacity-90 text-white font-black px-8 h-12 rounded-xl transition-all active:scale-95 flex items-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save {config.title}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
