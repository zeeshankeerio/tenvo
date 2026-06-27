import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Save, FileText, Loader2, Link } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { useFormRegionalContext } from '@/lib/hooks/useFormRegionalContext';
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
import { cn } from '@/lib/utils';
import {
    MOBILE_INPUT_CLASS,
    MOBILE_LABEL_CLASS,
    MOBILE_OVERLAY,
    MOBILE_OVERLAY_CARD,
    MOBILE_GRID_FIELDS,
} from '@/lib/utils/formMobileStyles';
import { MobileFormFooter, MobileFormActions, MobileLineTable } from '@/components/mobile/MobileFormShell';

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
    const { business, currency, countryIso, defaultTaxRate } = useFormRegionalContext(category);
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

        const domainTax = getDomainDefaultTax(domainCategory, { countryIso }) || defaultTaxRate;
        const tax_total = subtotal * (domainTax / 100);
        const total_amount = subtotal + tax_total;

        return { subtotal, tax_total, total_amount, taxRate: domainTax };
    }, [formData.items, domainCategory, countryIso, defaultTaxRate]);

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
        <div className={MOBILE_OVERLAY}>
            <Card className={cn(MOBILE_OVERLAY_CARD, 'max-w-5xl')}>
                <div className="flex shrink-0 items-start justify-between gap-2 border-b bg-wine-50/30 px-3 py-3 sm:px-5 sm:py-4">
                    <div className="min-w-0 space-y-0.5">
                        <CardTitle className="text-base font-bold text-wine-600 sm:text-xl">{config.title}</CardTitle>
                        {initialData && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-gray-500">
                                <Link className="h-3 w-3 shrink-0 text-wine-600" />
                                <span className="truncate">From source document</span>
                                <Badge className="h-4 border-none bg-wine-600/10 px-1.5 text-[10px] font-bold uppercase text-wine-600">Linked</Badge>
                            </div>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0 rounded-lg">
                        <X className="h-4 w-4 text-gray-400" />
                    </Button>
                </div>

                <CardContent className={cn('min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:space-y-6 sm:p-6')}>
                    <div className={MOBILE_GRID_FIELDS}>
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label className={MOBILE_LABEL_CLASS}>Customer *</Label>
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
                        <div className="space-y-1.5">
                            <Label className={MOBILE_LABEL_CLASS}>{config.dateLabel}</Label>
                            <Input
                                type="date"
                                className={MOBILE_INPUT_CLASS}
                                value={formData.date || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className={MOBILE_LABEL_CLASS}>{config.extraDateLabel}</Label>
                            <Input
                                type="date"
                                className={MOBILE_INPUT_CLASS}
                                value={formData[config.extraDateField] || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, [config.extraDateField]: e.target.value }))}
                            />
                        </div>
                        {type === 'delivery_challan' && (
                            <>
                                <div className="col-span-full space-y-1.5">
                                    <Label className={MOBILE_LABEL_CLASS}>Delivery Address</Label>
                                    <Input
                                        className={MOBILE_INPUT_CLASS}
                                        value={formData.delivery_address || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_address: e.target.value }))}
                                        placeholder="Enter physical delivery address..."
                                    />
                                </div>
                                <div className="col-span-full space-y-1.5">
                                    <Label className={MOBILE_LABEL_CLASS}>Warehouse *</Label>
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
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <Label className="text-sm font-bold">Items</Label>
                            <Button size="sm" onClick={addItem} type="button" className="h-8 rounded-xl text-xs font-semibold">
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Add
                            </Button>
                        </div>

                        <MobileLineTable>
                            <div className="min-w-[640px] rounded-lg border">
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
                                                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
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
                                                <td className="px-2 py-2 sm:px-4">
                                                    <Input
                                                        type="number"
                                                        className={cn(MOBILE_INPUT_CLASS, 'text-right w-20')}
                                                        value={item.quantity || 0}
                                                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                        disabled={showSerial && item.serial_number} // Lock qty if serial selected
                                                    />
                                                </td>
                                                <td className="px-2 py-2 sm:px-4">
                                                    <Input
                                                        type="number"
                                                        className={cn(MOBILE_INPUT_CLASS, 'text-right w-20')}
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
                        </MobileLineTable>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                        <div className="space-y-1.5">
                            <Label className={MOBILE_LABEL_CLASS}>Notes</Label>
                            <textarea
                                className="w-full rounded-lg border border-gray-200 p-2.5 text-sm h-20 sm:h-24"
                                placeholder="Additional notes..."
                                value={formData.notes || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2 rounded-xl bg-gray-50 p-3 sm:p-4">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>{formatCurrency(totals.subtotal, currency)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Tax ({totals.taxRate}%)</span>
                                <span>{formatCurrency(totals.tax_total, currency)}</span>
                            </div>
                            <div className="mt-1 flex justify-between border-t pt-2 text-base font-bold">
                                <span>Total</span>
                                <span className="text-wine">{formatCurrency(totals.total_amount, currency)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>

                <MobileFormFooter>
                    <MobileFormActions
                        onCancel={onClose}
                        onSubmit={handleSave}
                        submitLabel={`Save ${config.title}`}
                        submitIcon={Save}
                        isLoading={isSaving}
                    />
                </MobileFormFooter>
            </Card>
        </div>
    );
}
