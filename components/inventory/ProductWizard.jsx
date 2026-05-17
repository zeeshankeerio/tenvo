'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, ArrowRight, ArrowLeft, CheckCircle2, Save, X, Loader2,
    Barcode, DollarSign, Layers, Tag, Weight, Warehouse, Image,
    Info, Sparkles, AlertTriangle, ChevronRight, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getDomainDefaults } from '@/lib/domainKnowledge';
import { DomainFieldRenderer } from '@/components/domain/DomainFieldRenderer';
import { getDomainProductFields, getDomainFormLabels, isHighPrecisionDomain, sanitizeDomainData } from '@/lib/utils/domainHelpers';
import { validateDomainData } from '@/lib/validation/domainSchemas';

// --- Step Definitions --------------------------------------------------------

const PRECISION_STEPS = [
    { key: 'basics', label: 'Product Info', icon: Package, description: 'Name, SKU, and category' },
    { key: 'attributes', label: 'Attributes', icon: Layers, description: 'Domain-specific details' },
    { key: 'pricing', label: 'Pricing', icon: DollarSign, description: 'Cost, selling price, and tax' },
    { key: 'inventory', label: 'Inventory', icon: Warehouse, description: 'Stock levels and tracking' },
    { key: 'review', label: 'Review', icon: CheckCircle2, description: 'Confirm and save' },
];

const STANDARD_STEPS = [
    { key: 'basics', label: 'Product Info', icon: Package, description: 'Name, SKU, and category' },
    { key: 'pricing', label: 'Pricing', icon: DollarSign, description: 'Cost, selling price, and tax' },
    { key: 'inventory', label: 'Inventory', icon: Warehouse, description: 'Stock levels and tracking' },
    { key: 'attributes', label: 'Attributes', icon: Layers, description: 'Domain-specific details' },
    { key: 'review', label: 'Review', icon: CheckCircle2, description: 'Confirm and save' },
];

// --- Auto-Suggestion Categories by Domain ------------------------------------

const DOMAIN_CATEGORY_SUGGESTIONS = {
    'restaurant-cafe': ['Appetizers', 'Main Course', 'Beverages', 'Desserts', 'Sides', 'Combo Meals', 'Specials'],
    'grocery': ['Beverages', 'Snacks', 'Dairy', 'Frozen', 'Fresh Produce', 'Bakery', 'Household', 'Personal Care', 'Meat', 'Grocery'],
    'supermarket': ['Beverages', 'Snacks', 'Dairy', 'Frozen', 'Fresh Produce', 'Bakery', 'Household', 'Personal Care', 'Meat', 'Grocery'],
    'pharmacy': ['Medicines', 'OTC Drugs', 'Personal Care', 'Medical Devices', 'Supplements', 'Baby Care'],
    'electronics': ['Smartphones', 'Accessories', 'Laptops', 'Audio', 'Cables', 'Batteries', 'Peripherals'],
    'textile': ['Fabric', 'Ready-Made', 'Accessories', 'Tailoring Materials', 'Seasonal'],
    'auto_parts': ['Engine Parts', 'Electrical', 'Body Parts', 'Fluids', 'Tires', 'Accessories'],
    'retail': ['General', 'Electronics', 'Clothing', 'Home', 'Kitchen', 'Toys', 'Stationery'],
    'wholesale': ['Bulk Items', 'Fast Moving', 'Seasonal', 'Imported', 'Local Manufacturing'],
    'construction': ['Cement', 'Steel', 'Timber', 'Plumbing', 'Electrical', 'Paint', 'Tools'],
};

const TAX_PRESETS = [
    { label: 'Standard GST (17%)', value: 17 },
    { label: 'Reduced (5%)', value: 5 },
    { label: 'Zero Rated', value: 0 },
    { label: 'Exempt', value: 0 },
];

// --- Step 1: Basic Info ------------------------------------------------------

function StepBasics({ formData, onChange, category, errors }) {
    const categorySuggestions = DOMAIN_CATEGORY_SUGGESTIONS[category] || DOMAIN_CATEGORY_SUGGESTIONS['retail'];
    const labels = getDomainFormLabels(category);

    return (
        <div className="space-y-5">
            <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider">{labels.name} *</label>
                <Input
                    value={formData.name || ''}
                    onChange={(e) => onChange('name', e.target.value)}
                    placeholder={`Enter ${labels.name.toLowerCase()}`}
                    className={cn(
                        "h-12 rounded-xl text-sm font-medium",
                        errors.name && "border-red-300 focus:ring-red-200"
                    )}
                    autoFocus
                />
                {errors.name && <p className="text-[10px] text-red-500 font-bold">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">SKU</label>
                    <Input
                        value={formData.sku || ''}
                        onChange={(e) => onChange('sku', e.target.value)}
                        placeholder="Auto-generated if empty"
                        className="h-11 rounded-xl text-sm"
                    />
                    <p className="text-[10px] text-gray-400">Leave empty to auto-generate</p>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Barcode</label>
                    <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            value={formData.barcode || ''}
                            onChange={(e) => onChange('barcode', e.target.value)}
                            placeholder="Scan or type barcode"
                            className="h-11 rounded-xl text-sm pl-10"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider">{labels.category} *</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {categorySuggestions.map(cat => (
                        <button
                            key={cat}
                            onClick={() => onChange('category', cat)}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-[11px] font-bold transition-all",
                                formData.category === cat
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <Input
                    value={formData.category || ''}
                    onChange={(e) => onChange('category', e.target.value)}
                    placeholder={`Or type a custom ${labels.category.toLowerCase()}`}
                    className="h-10 rounded-xl text-sm"
                />
                {errors.category && <p className="text-[10px] text-red-500 font-bold">{errors.category}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Brand</label>
                    <Input
                        value={formData.brand || ''}
                        onChange={(e) => onChange('brand', e.target.value)}
                        placeholder="Brand name"
                        className="h-11 rounded-xl text-sm"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Unit</label>
                    <select
                        value={formData.unit || 'pcs'}
                        onChange={(e) => onChange('unit', e.target.value)}
                        className="w-full h-11 rounded-xl text-sm border border-gray-200 px-3 bg-white"
                    >
                        <option value="pcs">Pieces</option>
                        <option value="kg">Kilograms</option>
                        <option value="g">Grams</option>
                        <option value="l">Litres</option>
                        <option value="ml">Millilitres</option>
                        <option value="m">Metres</option>
                        <option value="box">Box</option>
                        <option value="pack">Pack</option>
                        <option value="dozen">Dozen</option>
                        <option value="pair">Pair</option>
                    </select>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Description</label>
                <textarea
                    value={formData.description || ''}
                    onChange={(e) => onChange('description', e.target.value)}
                    placeholder="Optional product description"
                    className="w-full min-h-[80px] rounded-xl text-sm border border-gray-200 px-3 py-2 resize-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    rows={3}
                />
            </div>
        </div>
    );
}

// --- Step 2: Pricing ---------------------------------------------------------

function StepPricing({ formData, onChange, currency, errors }) {
    const margin = formData.price && formData.cost_price
        ? (((formData.price - formData.cost_price) / formData.price) * 100).toFixed(1)
        : null;

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Cost Price *</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{currency}</span>
                        <Input
                            type="number"
                            value={formData.cost_price || ''}
                            onChange={(e) => onChange('cost_price', parseFloat(e.target.value) || '')}
                            placeholder="0.00"
                            className={cn(
                                "h-12 rounded-xl text-sm font-bold pl-12",
                                errors.cost_price && "border-red-300"
                            )}
                            step="0.01"
                            min="0"
                        />
                    </div>
                    {errors.cost_price && <p className="text-[10px] text-red-500 font-bold">{errors.cost_price}</p>}
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Selling Price *</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{currency}</span>
                        <Input
                            type="number"
                            value={formData.price || ''}
                            onChange={(e) => onChange('price', parseFloat(e.target.value) || '')}
                            placeholder="0.00"
                            className={cn(
                                "h-12 rounded-xl text-sm font-bold pl-12",
                                errors.price && "border-red-300"
                            )}
                            step="0.01"
                            min="0"
                        />
                    </div>
                    {errors.price && <p className="text-[10px] text-red-500 font-bold">{errors.price}</p>}
                </div>
            </div>

            {/* Margin Indicator */}
            {margin !== null && (
                <div className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold",
                    parseFloat(margin) > 20 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        parseFloat(margin) > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            "bg-red-50 text-red-700 border border-red-200"
                )}>
                    <Sparkles className="w-4 h-4" />
                    <span>Profit Margin: {margin}%</span>
                    {parseFloat(margin) < 10 && <span className="text-[10px] opacity-70">(Consider increasing selling price)</span>}
                </div>
            )}

            {/* Tax Configuration */}
            <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Tax Rate</label>
                <div className="flex gap-2">
                    {TAX_PRESETS.map(preset => (
                        <button
                            key={preset.label}
                            onClick={() => onChange('tax_percent', preset.value)}
                            className={cn(
                                "px-3 py-2 rounded-xl text-[11px] font-bold transition-all",
                                parseFloat(formData.tax_percent) === preset.value
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
                <Input
                    type="number"
                    value={formData.tax_percent ?? 17}
                    onChange={(e) => onChange('tax_percent', parseFloat(e.target.value) || 0)}
                    className="h-10 rounded-xl text-sm w-32"
                    step="0.5"
                    min="0"
                    max="100"
                />
            </div>

            {/* Wholesale / Bulk Pricing */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Min Order Qty</label>
                    <Input
                        type="number"
                        value={formData.min_order_qty || ''}
                        onChange={(e) => onChange('min_order_qty', parseInt(e.target.value) || '')}
                        placeholder="1"
                        className="h-10 rounded-xl text-sm"
                        min="1"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Wholesale Price</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{currency}</span>
                        <Input
                            type="number"
                            value={formData.wholesale_price || ''}
                            onChange={(e) => onChange('wholesale_price', parseFloat(e.target.value) || '')}
                            placeholder="Optional bulk price"
                            className="h-10 rounded-xl text-sm pl-12"
                            step="0.01"
                            min="0"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Step 3: Inventory -------------------------------------------------------

function StepInventory({ formData, onChange, errors, category }) {
    const labels = getDomainFormLabels(category);
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">{labels.stock} *</label>
                    <Input
                        type="number"
                        value={formData.stock ?? ''}
                        onChange={(e) => onChange('stock', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className={cn(
                            "h-12 rounded-xl text-sm font-bold text-center",
                            errors.stock && "border-red-300"
                        )}
                        min="0"
                    />
                    {errors.stock && <p className="text-[10px] text-red-500 font-bold">{errors.stock}</p>}
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Reorder Level</label>
                    <Input
                        type="number"
                        value={formData.reorder_point || ''}
                        onChange={(e) => onChange('reorder_point', parseInt(e.target.value) || '')}
                        placeholder="10"
                        className="h-12 rounded-xl text-sm text-center"
                        min="0"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Max Stock</label>
                    <Input
                        type="number"
                        value={formData.max_stock || ''}
                        onChange={(e) => onChange('max_stock', parseInt(e.target.value) || '')}
                        placeholder="1000"
                        className="h-12 rounded-xl text-sm text-center"
                        min="0"
                    />
                </div>
            </div>

            {/* Tracking Toggles */}
            <div className="space-y-2">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Tracking Options</label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { key: 'track_inventory', label: 'Track Inventory', desc: 'Monitor stock levels' },
                        { key: 'is_weight_item', label: 'Weight Item', desc: 'Sell by weight (kg, g)' },
                        { key: 'allow_negative_stock', label: 'Allow Negative', desc: 'Sell even if out of stock' },
                        { key: 'is_perishable', label: 'Perishable', desc: 'Has an expiry date' },
                    ].map(option => (
                        <button
                            key={option.key}
                            onClick={() => onChange(option.key, !formData[option.key])}
                            className={cn(
                                "flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-all",
                                formData[option.key]
                                    ? "border-indigo-500 bg-indigo-50/50"
                                    : "border-gray-200 hover:border-gray-300 bg-white"
                            )}
                        >
                            <div className={cn(
                                "w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-all",
                                formData[option.key] ? "border-indigo-500 bg-indigo-500" : "border-gray-300"
                            )}>
                                {formData[option.key] && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-900">{option.label}</p>
                                <p className="text-[10px] text-gray-400">{option.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Warehouse Selection */}
            <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Warehouse / Location</label>
                <select
                    value={formData.warehouse_id || ''}
                    onChange={(e) => onChange('warehouse_id', e.target.value)}
                    className="w-full h-11 rounded-xl text-sm border border-gray-200 px-3 bg-white"
                >
                    <option value="">Default Location</option>
                </select>
            </div>
        </div>
    );
}

// --- Step 4: Domain Attributes -----------------------------------------------

function StepAttributes({ formData, onChange, category, errors }) {
    const domainFields = useMemo(() => {
        return getDomainProductFields(category);
    }, [category]);

    return (
        <div className="space-y-5">
            {domainFields.length > 0 ? (
                <>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold text-indigo-700">
                            Domain-specific fields for {category.replace('-', ' ')}
                        </span>
                    </div>
                    {errors.domain_data && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-[10px] text-red-600 font-bold uppercase animate-in fade-in slide-in-from-top-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {errors.domain_data}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {domainFields.map(field => {
                            const key = field.toLowerCase().replace(/[^a-z0-9]/g, '');
                            return (
                                <DomainFieldRenderer
                                    key={field}
                                    field={field}
                                    category={category}
                                    value={formData.domain_data?.[key] || ''}
                                    error={errors[`domain_data.${key}`]}
                                    onChange={(val) => onChange('domain_data', {
                                        ...formData.domain_data, [key]: val
                                    })}
                                />
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center py-12 text-gray-400">
                    <Layers className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm font-bold">No additional attributes</p>
                    <p className="text-[10px] mt-1">This domain uses standard product fields only</p>
                    <p className="text-[10px] mt-3 text-gray-300">You can skip this step</p>
                </div>
            )}
        </div>
    );
}

// --- Step 5: Review ----------------------------------------------------------

function StepReview({ formData, currency }) {
    const sections = [
        {
            title: 'Product Info', items: [
                { label: 'Name', value: formData.name },
                { label: 'SKU', value: formData.sku || 'Auto-generated' },
                { label: 'Category', value: formData.category },
                { label: 'Brand', value: formData.brand || '--' },
                { label: 'Barcode', value: formData.barcode || '--' },
            ]
        },
        {
            title: 'Pricing', items: [
                { label: 'Cost Price', value: `${currency}${formData.cost_price?.toLocaleString() || '0'}` },
                { label: 'Selling Price', value: `${currency}${formData.price?.toLocaleString() || '0'}` },
                { label: 'Tax', value: `${formData.tax_percent ?? 17}%` },
            ]
        },
        {
            title: 'Inventory', items: [
                { label: 'Opening Stock', value: formData.stock ?? 0 },
                { label: 'Reorder Point', value: formData.reorder_point || '--' },
                { label: 'Weight Item', value: formData.is_weight_item ? 'Yes' : 'No' },
            ]
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-700">
                    Review your product details before saving
                </span>
            </div>

            {sections.map(section => (
                <div key={section.title} className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{section.title}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {section.items.map(item => (
                            <div key={item.label} className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-xs text-gray-500">{item.label}</span>
                                <span className="text-xs font-bold text-gray-900">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// --- Main Product Wizard -----------------------------------------------------

export function ProductWizard({
    product = null,
    category = 'retail',
    onSave,
    onCancel,
    currency = 'Rs.',
}) {
    const isEditing = !!product;
    const isPrecision = useMemo(() => isHighPrecisionDomain(category), [category]);
    const wizardSteps = isPrecision ? PRECISION_STEPS : STANDARD_STEPS;

    const [currentStep, setCurrentStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // Form state
    const [formData, setFormData] = useState(() => {
        if (product) return { ...product };
        const defaults = {};
        try {
            const domainDefaults = getDomainDefaults(category);
            if (domainDefaults) Object.assign(defaults, domainDefaults);
        } catch { /* no defaults available */ }
        return {
            name: '', sku: '', barcode: '', category: '', brand: '',
            unit: 'pcs', description: '',
            cost_price: '', price: '', tax_percent: 17,
            min_order_qty: 1, wholesale_price: '',
            stock: 0, reorder_point: 10, max_stock: '', warehouse_id: '',
            track_inventory: true, is_weight_item: false,
            allow_negative_stock: false, is_perishable: false,
            domain_data: {},
            ...defaults,
        };
    });

    const handleFieldChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: null }));
    }, []);

    // --- Validation ----------------------------------------------------------

    const validateStep = useCallback((step) => {
        const newErrors = {};
        const stepKey = wizardSteps[step].key;

        switch (stepKey) {
            case 'basics':
                if (!formData.name?.trim()) newErrors.name = 'Product name is required';
                if (!formData.category?.trim()) newErrors.category = 'Category is required';
                break;
            case 'attributes':
                // [HARDENED] Sync with domain-specific Zod schema
                const validation = validateDomainData(category, formData.domain_data || {});
                if (!validation.success) {
                    newErrors.domain_data = 'Please complete mandatory domain fields';
                    validation.error.errors.forEach(err => {
                        const fieldKey = err.path.join('.');
                        newErrors[`domain_data.${fieldKey}`] = err.message;
                    });
                }
                break;
            case 'pricing':
                if (!formData.cost_price && formData.cost_price !== 0) newErrors.cost_price = 'Cost price is required';
                if (!formData.price && formData.price !== 0) newErrors.price = 'Selling price is required';
                break;
            case 'inventory':
                break;
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, category, wizardSteps]);

    const handleNext = useCallback(() => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, wizardSteps.length - 1));
        }
    }, [currentStep, validateStep, wizardSteps.length]);

    const handleBack = useCallback(() => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
    }, []);

    const handleSave = useCallback(async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const toNumber = (value, fallback = 0) => {
                if (value === '' || value === null || value === undefined) return fallback;
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : fallback;
            };

            const payload = {
                ...formData,
                cost_price: toNumber(formData.cost_price, 0),
                price: toNumber(formData.price, 0),
                tax_percent: toNumber(formData.tax_percent, 17),
                stock: toNumber(formData.stock, 0),
                reorder_point: toNumber(formData.reorder_point, 10),
                max_stock: toNumber(formData.max_stock, 0),
                min_order_qty: toNumber(formData.min_order_qty, 1),
                wholesale_price: toNumber(formData.wholesale_price, 0),
                domain_data: sanitizeDomainData(formData.domain_data || {}, category)
            };
            await onSave?.(payload);
        } catch (err) {
            console.error('ProductWizard save error:', err);
        } finally {
            setIsSaving(false);
        }
    }, [formData, onSave, isSaving]);

    // --- Keyboard Navigation -------------------------------------------------

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey && currentStep < WIZARD_STEPS.length - 1) {
                e.preventDefault();
                handleNext();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStep, handleNext]);

    // --- Render --------------------------------------------------------------

    const StepComponent = [StepBasics, StepPricing, StepInventory, StepAttributes, StepReview][currentStep];

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-gray-900">
                            {isEditing ? 'Edit Product' : 'Add New Product'}
                        </h2>
                        <p className="text-[10px] text-gray-400 font-bold">
                            Step {currentStep + 1} of {wizardSteps.length} -- {wizardSteps[currentStep].description}
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-xl">
                    <X className="w-4 h-4" />
                </Button>
            </div>
 
            {/* Step Progress */}
            <div className="flex items-center px-6 py-3 bg-gray-50/50 border-b border-gray-100">
                {wizardSteps.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = idx === currentStep;
                    const isCompleted = idx < currentStep;
 
                    return (
                        <React.Fragment key={step.key}>
                            <button
                                onClick={() => idx < currentStep && setCurrentStep(idx)}
                                disabled={idx > currentStep}
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-[10px] font-bold whitespace-nowrap",
                                    isActive && "bg-indigo-100 text-indigo-700",
                                    isCompleted && "text-emerald-600 hover:bg-emerald-50 cursor-pointer",
                                    !isActive && !isCompleted && "text-gray-400 cursor-not-allowed"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black",
                                    isActive && "bg-indigo-600 text-white",
                                    isCompleted && "bg-emerald-500 text-white",
                                    !isActive && !isCompleted && "bg-gray-200 text-gray-400"
                                )}>
                                    {isCompleted ? '✓' : idx + 1}
                                </div>
                                <span className="hidden sm:inline">{step.label}</span>
                            </button>
                            {idx < wizardSteps.length - 1 && (
                                <ChevronRight className={cn(
                                    "w-3 h-3 mx-1 shrink-0",
                                    isCompleted ? "text-emerald-400" : "text-gray-300"
                                )} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Step Content */}
            <div className="px-6 py-6 min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <StepComponent
                            formData={formData}
                            onChange={handleFieldChange}
                            category={category}
                            currency={currency}
                            errors={errors}
                        />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <Button
                    variant="outline"
                    onClick={currentStep === 0 ? onCancel : handleBack}
                    className="h-10 rounded-xl text-xs font-bold"
                >
                    {currentStep === 0 ? (
                        <>Cancel</>
                    ) : (
                        <><ArrowLeft className="w-4 h-4 mr-1.5" /> Back</>
                    )}
                </Button>

                <div className="flex items-center gap-2">
                    {currentStep < wizardSteps.length - 1 ? (
                        <Button
                            onClick={handleNext}
                            className="h-10 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200"
                        >
                            Next <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-10 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-emerald-600
                                       hover:from-emerald-600 hover:to-emerald-700 shadow-md shadow-emerald-200 px-6"
                        >
                            {isSaving ? (
                                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-1.5" /> Save Product</>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
