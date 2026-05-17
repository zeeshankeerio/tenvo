'use client';
// v2: Forced recompile

import { useState, useEffect, useCallback } from 'react';
import { X, Save, Loader2, AlertCircle, CheckCircle2, BrainCircuit, Info, ImagePlus, Package, Layers, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FormError, FormWarning, FormInfo } from '@/components/ui/form-error';
import { Badge } from '@/components/ui/badge';
import { DomainFieldRenderer } from '@/components/domain/DomainFieldRenderer';
import { BatchNumberInput } from '@/components/domain/BatchTracking';
import { SerialNumberInput } from '@/components/domain/SerialTracking';
import { BrandAutocomplete } from '@/components/BrandAutocomplete';
import { QuickAddTemplates } from '@/components/QuickAddTemplates';
import { FileUpload } from '@/components/FileUpload';
import { PropheticInsightCard } from '@/components/domain/PropheticInsightCard';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    isBatchTrackingEnabled,
    isSerialTrackingEnabled,
    isExpiryTrackingEnabled,
    isSizeColorMatrixEnabled,
    getDomainProductFields,
    validateDomainProduct as validateDomainLogic,
    getDomainDefaults,
    getDomainUnits,
    getDomainDefaultTax,
    getDomainKnowledge,
} from '@/lib/utils/domainHelpers';
import { validateDomainProduct as validateDomainRegex } from '@/lib/utils/domainValidation';
import { TaxCategorySelector } from '@/components/domain/TaxCategorySelector';
import { formatCurrency } from '@/lib/utils/formatting';
import { productSchema, validateForm } from '@/lib/validation';
import toast from 'react-hot-toast';
import { showActionError, formatValidationErrors, isValidationError } from '@/lib/utils/formErrorHandler';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { StockHistory } from '@/components/StockHistory';
import { CustomParametersManager } from './inventory/CustomParametersManager';
import { useSafeSmartDefaults, mergeFormDefaults, getCurrentDate } from '@/lib/hooks/useSafeSmartDefaults';
import { useAutosave, AutosaveIndicator } from '@/hooks/useAutosave';
import { useKeyboardShortcuts, COMMON_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getCurrentSeason, getSeasonalDiscount, applySeasonalPricing } from '@/lib/domainData/pakistaniSeasons';
import { hasSeasonalPricing } from '@/lib/utils/pakistaniFeatures';
import { pakistaniSizes, pakistaniColors } from '@/lib/domainData/pakistaniRetailData';

/**
 * ProductForm Component
 * Enhanced product form with domain-specific fields and validation
 */
export function ProductForm({
    product = null,
    category = 'retail-shop',
    onSave,
    onCancel,
    currency = 'PKR',
}) {
    const { regionalStandards } = useBusiness();
    const standards = regionalStandards || {
        currencySymbol: '₨',
        currency: 'PKR',
        taxLabel: 'Sales Tax',
        taxIdLabel: 'NTN',
        countryCode: 'PK'
    };

    const [activeTab, setActiveTab] = useState('basic');

    // Keyboard shortcuts for tabs & Focus Flow
    useEffect(() => {
        const handleKeys = (e) => {
            // ALT+NUMBER for Tab Switching
            if (e.altKey && e.key >= '1' && e.key <= '4') {
                const tabs = ['basic', 'inventory', 'intelligence', 'media'];
                const target = tabs[parseInt(e.key) - 1];
                if (target) {
                    e.preventDefault();
                    setActiveTab(target);
                }
            }

            // Command + Enter to Save
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e);
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [formData, activeTab]);

    /**
     * Ultra-Speed Navigation: Enter key moves focus to next logical element
     */
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !e.shiftKey) {
            e.preventDefault();
            const form = e.target.form;
            if (!form) return;
            
            const index = Array.from(form.elements).indexOf(e.target);
            const nextElement = form.elements[index + 1];
            
            if (nextElement) {
                // If the next element is the save button or hidden, check if we should auto-switch tabs
                if (nextElement.type === 'submit' || nextElement.tagName === 'BUTTON') {
                    // Boundary reached: Auto-Advance Tab
                    const tabs = ['basic', 'inventory', 'domain', 'history'];
                    const currentIdx = tabs.indexOf(activeTab);
                    if (currentIdx < tabs.length - 1) {
                        const nextTab = tabs[currentIdx + 1];
                        setActiveTab(nextTab);
                        toast.success(`Advancing to ${nextTab.toUpperCase()}`, { icon: '⚡', duration: 1000 });
                        setTimeout(() => {
                           const firstInput = document.querySelector(`[data-tab="${nextTab}"] input`);
                           firstInput?.focus();
                        }, 100);
                        return;
                    }
                }
                nextElement.focus();
                if (nextElement.select) nextElement.select();
            }
        }
    };

    // Smart Defaults Integration
    const { defaults: smartDefaults, error: smartDefaultsError } = useSafeSmartDefaults('product', {
        businessId: product?.business_id,
        category
    });

    // Form State with Smart Defaults
    const [formData, setFormData] = useState(() => {
        // Get domain-specific defaults
        const domainDefaults = getDomainDefaults(category, product);

        // Prepare existing product data
        const existingData = product ? {
            name: product.name || '',
            sku: product.sku || '',
            barcode: product.barcode || '',
            brand: product.brand || '',
            description: product.description || '',
            category: product.category || '',
            unit: product.unit || getDomainUnits(category)[0],
            price: Number(product.price) || 0,
            costPrice: Number(product.cost_price) || 0,
            mrp: Number(product.mrp) || 0,
            stock: Number(product.stock) || 0,
            minStock: Number(product.min_stock) || 10,
            maxStock: Number(product.max_stock) || 100,
            reorderPoint: Number(product.reorder_point) || 10,
            reorderQuantity: Number(product.reorder_quantity) || 0,
            hsnCode: product.hsn_code || '',
            sacCode: product.sac_code || '',
            taxPercent: product.tax_percent || getDomainDefaultTax(category),
            image_url: product.image_url || '',
            batches: product.batches || [],
            serialNumbers: product.serial_numbers || [],
            customParameters: product.customParameters || product.domain_data?.custom_parameters || [],
        } : {};

        // Merge with priority: existingData > domainDefaults > smartDefaults
        return mergeFormDefaults(smartDefaults, domainDefaults, existingData);
    });

    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const domainFields = getDomainProductFields(category);
    const hasBatchTracking = isBatchTrackingEnabled(category);
    const hasSerialTracking = isSerialTrackingEnabled(category);

    // Pakistani Seasonal Pricing
    const seasonalPricingEnabled = hasSeasonalPricing(category);
    const currentSeason = seasonalPricingEnabled ? getCurrentSeason() : null;
    const seasonalDiscount = seasonalPricingEnabled && formData.category ? getSeasonalDiscount(formData.category) : 0;
    const seasonalPricing = seasonalDiscount > 0 && formData.price > 0 ? applySeasonalPricing(formData.price, seasonalDiscount) : null;

    // Update handlers
    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error if exists
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // 4. Unified Identity Logic: Auto-derive Name and SKU
    useEffect(() => {
        const articleNo = formData.articleno || formData.partnumber || formData.designno;
        if (!articleNo) return;

        setFormData(prev => {
            const updates = {};

            // Auto-capitalize matching key
            const key = prev.articleno ? 'articleno' : (prev.partnumber ? 'partnumber' : 'designno');
            if (prev[key] && prev[key] !== prev[key].toUpperCase()) {
                updates[key] = prev[key].toUpperCase();
            }

            // Derivation: Brand + Article -> Name
            const brand = prev.brand || '';
            const derivedName = `${brand} ${articleNo}`.trim().toUpperCase();

            if (!prev.name || prev.name === 'Cotton Lawn Digital Print' || prev.name.startsWith('DEMO-')) {
                updates.name = derivedName;
            }

            // SKU matching Article No
            if (!prev.sku || prev.sku.startsWith('DEMO-') || prev.sku === prev[key]?.toUpperCase()) {
                updates.sku = articleNo.toUpperCase();
            }

            if (Object.keys(updates).length > 0) {
                return { ...prev, ...updates };
            }
            return prev;
        });
    }, [formData.articleno, formData.partnumber, formData.designno, formData.brand]);

    const handleBlur = (field) => {
        // Optional: Validate on blur
    };

    const fillDemoData = () => {
        const knowledge = getDomainKnowledge(category);
        const suggestions = knowledge?.setupTemplate?.suggestedProducts || [];
        const domainFieldsList = getDomainProductFields(category);
        const domainDataObj = {};

        // 1. Domain-Specific Intelligence Generation
        domainFieldsList.forEach(f => {
            const key = f.toLowerCase().replace(/[^a-z0-9]/g, '');
            const lowerField = f.toLowerCase();

            if (lowerField.includes('article')) domainDataObj[key] = `ART-${Math.floor(Math.random() * 900) + 100}`;
            else if (lowerField.includes('design')) domainDataObj[key] = `D-${Math.floor(Math.random() * 9000) + 1000}`;
            else if (lowerField.includes('width')) domainDataObj[key] = category === 'textile-wholesale' ? '44' : 'Standard';
            else if (lowerField.includes('length')) domainDataObj[key] = category === 'textile-wholesale' ? '40' : '100';
            else if (lowerField.includes('cutting')) domainDataObj[key] = '4.5';
            else if (lowerField.includes('fabric')) domainDataObj[key] = 'Cotton Lawn';
            else if (lowerField.includes('kora') || lowerField.includes('finish')) domainDataObj[key] = 'Finished';
            else if (lowerField.includes('gsm')) domainDataObj[key] = '150';
            else if (lowerField.includes('dosage')) domainDataObj[key] = '500mg';
            else if (lowerField.includes('part number')) domainDataObj[key] = `PN-${Math.floor(Math.random() * 89999) + 10000}`;
            else domainDataObj[key] = 'Standard Grade';
        });

        // 2. Product Identity & Pricing
        if (suggestions.length > 0) {
            const pick = suggestions[Math.floor(Math.random() * suggestions.length)];
            setFormData(prev => ({
                ...prev,
                name: pick.name,
                unit: pick.unit,
                category: pick.category,
                price: pick.defaultPrice,
                costPrice: Math.floor(pick.defaultPrice * 0.8),
                mrp: Math.floor(pick.defaultPrice * 1.1),
                description: pick.description,
                sku: `SKU-${Math.floor(Math.random() * 1000)}`,
                brand: pick.name.split(' ')[0], // Best guess for brand
                ...domainDataObj
            }));
            toast.success(`Loaded domain-compliant data: ${pick.name}`);
        } else {
            // Fallback for non-templated domains
            setFormData(prev => ({
                ...prev,
                name: `${category.split('-')[0].toUpperCase()} Premium Item`,
                sku: `DEMO-${Math.floor(Math.random() * 1000)}`,
                barcode: `890${Math.floor(Math.random() * 1000000000)}`,
                price: 1500,
                costPrice: 1200,
                mrp: 1600,
                ...domainDataObj
            }));
            toast.success('Generated domain-specific demo data');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            sku: '',
            barcode: '',
            brand: '',
            description: '',
            category: '',
            unit: getDomainUnits(category)[0],
            price: 0,
            costPrice: 0,
            mrp: 0,
            stock: 0,
            minStock: 10,
            maxStock: 100,
            reorderPoint: 10,
            reorderQuantity: 0,
            hsnCode: '',
            sacCode: '',
            taxPercent: getDomainDefaultTax(category),
            image_url: '',
            ...getDomainDefaults(category),
            batches: [],
            serialNumbers: [],
            customParameters: [],
        });
        setErrors({});
        setActiveTab('basic');
    };

    const handleSubmit = async (e, addAnother = false) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        setErrors({});

        // 1. Basic Validation (Include default stock 0 for new products)
        const validation = validateForm(productSchema, {
            name: formData.name,
            price: Number(formData.price),
            costPrice: Number(formData.costPrice),
            mrp: Number(formData.mrp),
            stock: Number(formData.stock) || 0,
            // Pass other optional fields if present to ensure full validation
            minStock: Number(formData.minStock),
            maxStock: Number(formData.maxStock),
        });

        if (!validation.isValid) {
            setErrors(validation.errors);
            setIsLoading(false);

            // Switch to Basic Info tab if errors are there
            if (activeTab !== 'basic') {
                setActiveTab('basic');
            }

            // Detailed toast for better UX
            const errorFields = Object.keys(validation.errors).join(', ');
            if (errorFields) {
                toast.error(`Please fix errors in: ${errorFields}`);
            }
            return;
        }

        // 2. Domain Validation (Logic: MRP rules etc.)
        const logicCheck = validateDomainLogic(formData, category);

        // 3. Regex Validation (Patterns: IMEI, ISBN etc.)
        const regexCheck = validateDomainRegex(formData, category);

        // Merge errors
        // logicCheck.errors is now Record<string, string>
        // regexCheck.errors is Record<string, string>
        let combinedErrors = {
            ...regexCheck.errors,
            ...logicCheck.errors
        };

        // Editing legacy records should not be blocked by newly added domain-required fields.
        if (product?.id) {
            combinedErrors = Object.fromEntries(
                Object.entries(combinedErrors).filter(([_, message]) => {
                    const msg = String(message || '').toLowerCase();
                    return !msg.includes('required for');
                })
            );
        }

        if (Object.keys(combinedErrors).length > 0) {
            setErrors(prev => ({
                ...prev,
                ...combinedErrors
            }));

            // Smart Tab Switching: If errors exist on 'domain' tab but not 'basic', switch to domain
            const domainFields = getDomainProductFields(category).map(f => f.toLowerCase().replace(/[^a-z0-9]/g, ''));
            const hasDomainErrors = Object.keys(combinedErrors).some(k => domainFields.includes(k));

            if (hasDomainErrors && activeTab !== 'domain') {
                setActiveTab('domain');
                toast.error('Please fix errors in the System Intelligence tab');
            } else {
                toast.error('Please correct the highlighted errors');
            }

            setIsLoading(false);
            return;
        }

        // Warning handling (from logic check)
        if (logicCheck.warnings?.length > 0) {
            logicCheck.warnings.forEach(warn => toast(warn, { icon: '[WARNING]' }));
        }

        try {
            // 3. Construct Payload
            // Separate standard fields from domain-specific fields
            const domainFieldKeys = getDomainProductFields(category)
                .map(f => f.toLowerCase().replace(/[^a-z0-9]/g, ''));

            const domainData = {};
            domainFieldKeys.forEach(key => {
                if (formData[key] !== undefined && formData[key] !== '') {
                    domainData[key] = formData[key];
                }
            });

            // Map camelCase form fields to snake_case schema fields
            const payload = {
                name: formData.name,
                sku: formData.sku || (() => {
                    // Auto-generate SKU for new products
                    const prefix = (category || 'GEN').substring(0, 3).toUpperCase();
                    const ts = Date.now().toString(36).slice(-4).toUpperCase();
                    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                    return `${prefix}-${ts}-${rand}`;
                })(),
                barcode: formData.barcode || null,
                brand: formData.brand || null,
                description: formData.description || null,
                category: formData.category || null,
                unit: formData.unit,
                price: Number(formData.price) || 0,
                cost_price: Number(formData.costPrice) || 0,
                mrp: Number(formData.mrp) || 0,
                min_stock: Number(formData.minStock) || 0,
                max_stock: Number(formData.maxStock) || 0,
                reorder_point: Number(formData.reorderPoint) || 0,
                reorder_quantity: Number(formData.reorderQuantity) || 0,
                hsn_code: formData.hsnCode || null,
                sac_code: formData.sacCode || null,
                tax_percent: Number(formData.taxPercent) || 0,
                expiry_date: formData.expiry_date || null,
                manufacturing_date: formData.manufacturing_date || null,
                domain_data: {
                    ...domainData,
                    custom_parameters: formData.customParameters || [],
                    ...(formData.sizeColorMatrix && Object.keys(formData.sizeColorMatrix).length > 0
                        ? { size_color_matrix: formData.sizeColorMatrix }
                        : {}),
                },
                stock: Number(formData.stock) || 0
            };

            // Add batch and serial tracking if present
            if (formData.batches && formData.batches.length > 0) {
                payload.batches = formData.batches;
            }
            if (formData.serialNumbers && formData.serialNumbers.length > 0) {
                payload.serialNumbers = formData.serialNumbers;
            }

            if (product?.id) {
                payload.id = product.id;
            }

            if (typeof onSave === 'function') {
                // Determine if we should clear the form (Add Another)
                // We await the onSave to ensure the parent operation succeeds before clearing
                const result = await onSave(payload);
                
                // Check if result indicates failure
                if (result && !result.success) {
                    // Handle validation errors separately
                    if (isValidationError(result)) {
                        const fieldErrors = formatValidationErrors(result);
                        setErrors(prev => ({ ...prev, ...fieldErrors }));
                        toast.error('Please fix highlighted errors');
                        return;
                    }
                    
                    // Show user-friendly error message
                    showActionError(result);
                    return;
                }

                // Form clearing logic is now handled by the parent or state reset
                if (addAnother && !product) {
                    resetForm();
                    toast.success('Ready for next product');
                }
            } else {
                console.error('Save error: onSave prop is missing or not a function');
                toast.error('Configuration Error: Save Handler Missing');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error(error.message || 'Failed to save product');
        } finally {
            setIsLoading(false);
        }
    };

    const renderError = (field) => {
        return errors[field] ? <FormError message={errors[field]} /> : null;
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <Card className="border-none shadow-2xl shadow-gray-200/50 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-8 px-8 border-b border-gray-50">
                    <div className="space-y-1">
                        <CardTitle className="text-3xl font-black text-wine-600 tracking-tight">{product ? 'Update Inventory' : 'New Stock Entry'}</CardTitle>
                        <CardDescription className="font-medium text-gray-500">
                            {product ? `Editing: ${product.name}` : `Initializing ${category.replace('-', ' ')} inventory record`}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Compliance Status</span>
                            <div className="flex items-center gap-2">
                                {Object.keys(errors).length === 0 ? (
                                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> System Ready
                                    </Badge>
                                ) : (
                                    <Badge className="bg-red-50 text-red-600 border-red-100 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {Object.keys(errors).length} Gaps
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-wine-50 text-wine-600 border-wine-100 px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-wine-600 animate-pulse" />
                            {category.replace('-', ' ')} Mode
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-8 px-8 pb-10">
                    {/* Domain Intelligence Banner */}
                    <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-white to-wine-50/20 border border-wine-100/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-500 cursor-default">
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className="p-4 rounded-2xl bg-wine-600 text-white shadow-xl shadow-wine-600/20 group-hover:scale-105 transition-transform duration-500">
                                    <BrainCircuit className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xl font-black text-gray-900 leading-tight">Domain Intelligence Active</h4>
                                    <p className="text-sm text-gray-500 max-w-sm">
                                        System is optimizing inventory for <span className="font-bold text-wine-600">{category.replace(/-/g, ' ')}</span> standards including reorder automation and specialized property tracking.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {isBatchTrackingEnabled(category) && <Badge className="bg-white/80 backdrop-blur-sm text-gray-600 border-gray-100">Batch Enabled</Badge>}
                                {isSerialTrackingEnabled(category) && <Badge className="bg-white/80 backdrop-blur-sm text-gray-600 border-gray-100">Serial Tracking</Badge>}
                                {isExpiryTrackingEnabled(category) && <Badge className="bg-white/80 backdrop-blur-sm text-gray-600 border-gray-100">Expiry Mgmt</Badge>}
                            </div>
                        </div>
                        {/* Decorative background element */}
                        <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-wine-600/5 blur-3xl group-hover:bg-wine-600/10 transition-all duration-700" />
                    </div>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md py-4 mb-6 border-b border-gray-100 flex items-center justify-between">
                            <TabsList className="bg-gray-100/50 p-1 rounded-2xl border border-gray-100">
                                <TabsTrigger value="basic" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Identity</TabsTrigger>
                                <TabsTrigger value="inventory" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Stock & Flow</TabsTrigger>
                                <TabsTrigger value="domain" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Expert Detail</TabsTrigger>
                                <TabsTrigger value="media" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Media</TabsTrigger>
                                {product && <TabsTrigger value="history" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Audit trail</TabsTrigger>}
                            </TabsList>
                            <div className="flex items-center gap-2">
                                <AutosaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                                                <Zap className="w-4 h-4" />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>Speed Entry Enabled: Use Enter to move fields</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>

                        <TabsContent value="basic" className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500" data-tab="basic">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-black uppercase text-gray-400 tracking-wider">Product Name *</Label>
                                    <Input id="name" value={formData.name ?? ''} onChange={(e) => updateField('name', e.target.value)} onBlur={() => handleBlur('name')} placeholder="e.g. Premium Filter" className="h-11 rounded-xl focus:ring-wine/20 font-bold" selectOnFocus />
                                    {renderError('name')}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sku" className="text-xs font-black uppercase text-gray-400 tracking-wider">SKU / Item Code</Label>
                                    <Input id="sku" value={formData.sku ?? ''} onChange={(e) => updateField('sku', e.target.value.toUpperCase())} placeholder="ITEM-001" className="h-11 rounded-xl font-mono" selectOnFocus />
                                    {renderError('sku')}
                                </div>
                            </div>

                            {/* Section: Primary Domain Identifiers (Moved from Intelligence Tab) */}
                            {['textile-wholesale', 'auto-parts', 'pharmacy', 'chemical'].includes(category) && (
                                <div className="p-6 bg-wine/5 rounded-3xl border border-wine/10 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BrainCircuit className="w-4 h-4 text-wine" />
                                        <span className="text-[10px] font-black uppercase text-wine tracking-widest">Primary Identifiers</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {domainFields.slice(0, 2).map((field) => {
                                            const key = field.toLowerCase().replace(/[^a-z0-9]/g, '');
                                            return (
                                                <div key={field} className="space-y-2">
                                                    <DomainFieldRenderer
                                                        field={field}
                                                        category={category}
                                                        value={formData[key]}
                                                        onChange={(val) => updateField(key, val)}
                                                        error={errors[key]}
                                                        selectOnFocus
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="barcode" className="text-xs font-black uppercase text-gray-400 tracking-wider">Barcode (EAN/UPC)</Label>
                                <div className="relative">
                                    <Input id="barcode" value={formData.barcode ?? ''} onChange={(e) => updateField('barcode', e.target.value)} placeholder="Scanning ready..." className="h-11 rounded-xl pr-10" selectOnFocus />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                </div>
                                {renderError('barcode')}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 p-6 bg-gray-50/30 rounded-3xl border border-gray-100">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="unit" className="text-xs font-black uppercase text-gray-400 tracking-wider">Unit</Label>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-white border-wine/10 text-wine p-3 shadow-xl rounded-xl">
                                                    <div className="space-y-1">
                                                        <p className="font-bold flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-wine" />
                                                            Standard Conversions
                                                        </p>
                                                        <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5">
                                                            <li>1 Dozen = 12 Pcs</li>
                                                            <li>1 Gross = 144 Pcs</li>
                                                            <li>1 Box = Varies by SKU</li>
                                                        </ul>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <select id="unit" value={formData.unit ?? ''} onChange={(e) => updateField('unit', e.target.value)} className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-wine/20">
                                        {getDomainUnits(category).map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    {renderError('unit')}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="price" className="text-xs font-black uppercase text-gray-400 tracking-wider">Selling Price *</Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{standards.currencySymbol}</span>
                                        <Input id="price" type="number" value={formData.price ?? ''} onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)} onBlur={() => handleBlur('price')} className="h-11 pl-12 rounded-xl" selectOnFocus />
                                    </div>
                                    {renderError('price')}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="mrp" className="text-xs font-black uppercase text-gray-400 tracking-wider">MRP (Max Retail Price) *</Label>
                                        {Number(formData.price) > 0 && Number(formData.costPrice) > 0 && (
                                            <Badge className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm",
                                                (Number(formData.price) - Number(formData.costPrice)) / Number(formData.price) > 0.2 ? "bg-green-50 text-green-700 border-green-200" :
                                                    (Number(formData.price) - Number(formData.costPrice)) / Number(formData.price) > 0 ? "bg-orange-50 text-orange-700 border-orange-200" :
                                                        "bg-red-50 text-red-700 border-red-200"
                                            )}>
                                                {((Number(formData.price) - Number(formData.costPrice)) / Number(formData.price) * 100).toFixed(1)}% Margin
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{standards.currencySymbol}</span>
                                        <Input id="mrp" type="number" value={formData.mrp ?? ''} onChange={(e) => updateField('mrp', parseFloat(e.target.value) || 0)} className="h-11 pl-12 rounded-xl" selectOnFocus />
                                    </div>
                                    {renderError('mrp')}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="costPrice" className="text-xs font-black uppercase text-gray-400 tracking-wider">Landing Cost</Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{standards.currencySymbol}</span>
                                        <Input id="costPrice" type="number" value={formData.costPrice ?? ''} onChange={(e) => updateField('costPrice', parseFloat(e.target.value) || 0)} className="h-11 pl-12 rounded-xl" selectOnFocus />
                                    </div>
                                    {formData.price > 0 && formData.costPrice > formData.price && (
                                        <FormWarning message="Selling Price is less than Cost Price! You will incur a loss." />
                                    )}
                                    {renderError('costPrice')}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-gray-400 tracking-wider">Brand</Label>
                                    <BrandAutocomplete
                                        value={formData.brand}
                                        onChange={(val) => updateField('brand', val)}
                                        domain={category}
                                        placeholder={`e.g. ${category === 'textile-wholesale' ? 'Gul Ahmed, Khaadi' : 'Samsung, Toyota'}`}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="productCategory" className="text-xs font-black uppercase text-gray-400 tracking-wider">Category</Label>
                                    <Input id="productCategory" value={formData.category ?? ''} onChange={(e) => updateField('category', e.target.value)} placeholder="e.g. Electronics, Spares" className="h-11 rounded-xl" selectOnFocus />
                                    {renderError('category')}
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="description" className="text-xs font-black uppercase text-gray-400 tracking-wider">Product Description</Label>
                                    <textarea id="description" value={formData.description ?? ''} onChange={(e) => updateField('description', e.target.value)} rows={2} className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-wine/20 shadow-inner" placeholder="Technical specifications or notes..." />
                                </div>

                                {/* Seasonal Pricing Preview */}
                                {seasonalPricing && currentSeason && (
                                    <div className="md:col-span-2 p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-pink-50 border-2 border-orange-200 animate-in slide-in-from-bottom-2 duration-500">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[10px] font-black uppercase">
                                                        [CELEBRATION] {currentSeason.name.en}
                                                    </Badge>
                                                    <span className="text-xs font-bold text-orange-600">
                                                        {seasonalDiscount}% Seasonal Discount Active
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 mb-3">
                                                    {currentSeason.description.en}
                                                </p>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Original Price</p>
                                                        <p className="text-lg font-bold text-gray-500 line-through">
                                                            {formatCurrency(seasonalPricing.original, standards.currency)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-orange-600 tracking-wider mb-1">Seasonal Price</p>
                                                        <p className="text-2xl font-black text-orange-600">
                                                            {formatCurrency(seasonalPricing.discounted, standards.currency)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-green-600 tracking-wider mb-1">Customer Saves</p>
                                                        <p className="text-lg font-bold text-green-600">
                                                            {formatCurrency(seasonalPricing.savings, standards.currency)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Section: Live Financial Dashboard */}
                            <div className="mt-8 p-6 rounded-3xl bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <TrendingUp className="w-16 h-16" />
                                </div>
                                <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Gross Margin</p>
                                        <p className={cn(
                                            "text-2xl font-black",
                                            (Number(formData.price) || 0) > 0 && ((Number(formData.price) || 0) - (Number(formData.costPrice) || 0)) / (Number(formData.price) || 0) > 0.15 ? "text-emerald-400" : "text-amber-400"
                                        )}>
                                            {(Number(formData.price) || 0) > 0 ? (((Number(formData.price) || 0) - (Number(formData.costPrice) || 0)) / (Number(formData.price) || 0) * 100).toFixed(1) : '0.0'}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Profit/Unit</p>
                                        <p className="text-2xl font-black text-white">
                                            {formatCurrency((Number(formData.price) || 0) - (Number(formData.costPrice) || 0), standards.currency)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Markup</p>
                                        <p className="text-2xl font-black text-slate-300">
                                            {(Number(formData.costPrice) || 0) > 0 ? (((Number(formData.price) || 0) - (Number(formData.costPrice) || 0)) / (Number(formData.costPrice) || 0) * 100).toFixed(1) : '0.0'}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Valuation</p>
                                        <p className="text-2xl font-black text-blue-400">
                                            {formatCurrency((Number(formData.stock) || 0) * (Number(formData.price) || 0), standards.currency)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="media" className="space-y-6 animate-in fade-in duration-300" data-tab="media">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-wine-600/10 text-wine-600">
                                            <ImagePlus className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">Product Media</h3>
                                            <p className="text-sm text-gray-500">Upload product images for catalogs and invoices</p>
                                        </div>
                                    </div>

                                    <div className="p-6 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/30">
                                        <FileUpload
                                            accept="image/*"
                                            maxSize={2}
                                            onFileSelect={(file) => {
                                                toast.success('Image selected: ' + (file?.name || 'File'));
                                                if (file) updateField('image_url', file.name);
                                            }}
                                        />
                                    </div>

                                    {formData.image_url && (
                                        <Badge variant="outline" className="mt-2 px-4 py-2 border-green-200 bg-green-50 text-green-700 rounded-xl flex items-center justify-between w-full">
                                            <span className="truncate flex-1">Image: {formData.image_url}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => updateField('image_url', '')}>
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="domain" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" data-tab="domain">
                            <div className="bg-wine-50/30 p-6 rounded-2xl border border-wine-100 shadow-inner">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2.5 rounded-xl bg-wine-600/10 text-wine-600">
                                        <BrainCircuit className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 capitalize">
                                            {category.replace(/-/g, ' ')} Specialist Data
                                        </h3>
                                        <p className="text-sm text-gray-500">Expert domain-specific attributes for precision tracking</p>
                                    </div>
                                </div>

                                {/* AI Prophetic Insight */}
                                <div className="mb-8">
                                    <PropheticInsightCard 
                                        businessId={product?.business_id || smartDefaults?.businessId} 
                                        category={category} 
                                    />
                                </div>

                                {/* Size-Color Matrix -- for garments, boutique-fashion, leather-footwear */}
                                {isSizeColorMatrixEnabled(category) && (
                                    <div className="mb-6 p-5 bg-white/70 rounded-2xl border border-dashed border-gray-300">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Layers className="w-4 h-4 text-wine" />
                                            <span className="text-xs font-black uppercase text-wine tracking-widest">Size / Color Matrix</span>
                                            <Badge variant="outline" className="text-[10px] ml-auto">Variant Stock Entry</Badge>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-4">
                                            Enter quantity per size and color. Each cell represents stock for that variant.
                                        </p>
                                        {(() => {
                                            // Determine size set based on domain
                                            const isFootwear = category === 'leather-footwear';
                                            const sizes = isFootwear
                                                ? pakistaniSizes.footwear.men.slice(0, 10)
                                                : pakistaniSizes.clothing.men;
                                            const colors = pakistaniColors.slice(0, 8).map(c => c.en);
                                            // matrix stored as domain_data.size_color_matrix
                                            const matrix = formData.sizeColorMatrix || {};
                                            const updateMatrix = (size, color, qty) => {
                                                const updated = {
                                                    ...matrix,
                                                    [`${size}-${color}`]: Number(qty) || 0,
                                                };
                                                updateField('sizeColorMatrix', updated);
                                            };
                                            return (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs border-collapse">
                                                        <thead>
                                                            <tr>
                                                                <th className="border border-gray-200 bg-gray-50 p-2 text-left font-semibold w-14">Size</th>
                                                                {colors.map(color => (
                                                                    <th key={color} className="border border-gray-200 bg-gray-50 p-2 text-center font-semibold min-w-[60px]">{color}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {sizes.map(size => (
                                                                <tr key={size}>
                                                                    <td className="border border-gray-200 bg-gray-50 p-2 font-bold text-center">{size}</td>
                                                                    {colors.map(color => {
                                                                        const val = matrix[`${size}-${color}`] ?? '';
                                                                        return (
                                                                            <td key={color} className="border border-gray-200 p-0">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    value={val}
                                                                                    onChange={e => updateMatrix(size, color, e.target.value)}
                                                                                    className="w-full h-8 text-center text-xs border-0 bg-transparent focus:bg-wine/5 focus:outline-none focus:ring-1 focus:ring-wine/30 rounded transition-colors"
                                                                                    placeholder="0"
                                                                                />
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 bg-white/50 p-6 rounded-2xl border border-dashed border-gray-200">
                                    {domainFields.map((field) => {
                                        const key = field.toLowerCase().replace(/[^a-z0-9]/g, '');
                                        return (
                                            <div key={field} className="space-y-2">
                                                <DomainFieldRenderer
                                                    field={field}
                                                    category={category}
                                                    value={formData[key]}
                                                    onChange={(val) => updateField(key, val)}
                                                    error={errors[key]}
                                                    selectOnFocus
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <Separator className="my-8" />
                                <CustomParametersManager
                                    value={{ customParameters: formData.customParameters }}
                                    onChange={(val) => updateField('customParameters', val.customParameters)}
                                    category={category}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="inventory" className="space-y-6 animate-in fade-in duration-300" data-tab="inventory">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                        {product ? 'Current Stock' : 'Opening Stock'}
                                    </Label>
                                    <div className="relative">
                                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            type="number"
                                            value={formData.stock ?? 0}
                                            onChange={(e) => updateField('stock', parseInt(e.target.value) || 0)}
                                            className="h-11 pl-10 rounded-xl font-bold text-gray-900"
                                            disabled={hasBatchTracking || hasSerialTracking}
                                            placeholder={hasBatchTracking || hasSerialTracking ? "Calculated automatically" : "0"}
                                            selectOnFocus
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Min Stock Level</Label>
                                    <Input type="number" value={formData.minStock ?? ''} onChange={(e) => updateField('minStock', parseInt(e.target.value) || 0)} className="h-11 rounded-xl" selectOnFocus />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Max Stock Level</Label>
                                    <Input type="number" value={formData.maxStock ?? ''} onChange={(e) => updateField('maxStock', parseInt(e.target.value) || 0)} className="h-11 rounded-xl" selectOnFocus />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Reorder Point</Label>
                                    <Input type="number" value={formData.reorderPoint ?? ''} onChange={(e) => updateField('reorderPoint', parseInt(e.target.value) || 0)} className="h-11 rounded-xl" selectOnFocus />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Reorder Qty</Label>
                                    <Input type="number" value={formData.reorderQuantity ?? ''} onChange={(e) => updateField('reorderQuantity', parseInt(e.target.value) || 0)} className="h-11 rounded-xl" selectOnFocus />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Mfg. Date</Label>
                                    <Input type="date" value={formData.manufacturing_date || ''} onChange={(e) => updateField('manufacturing_date', e.target.value)} className="h-11 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Expiry Date</Label>
                                    <Input type="date" value={formData.expiry_date || ''} onChange={(e) => updateField('expiry_date', e.target.value)} className="h-11 rounded-xl" />
                                </div>
                            </div>

                            {/* Section: Specialist Inventory Parameters (e.g. Textile Thaan/Cutting) */}
                            {['textile-wholesale', 'garments'].includes(category) && (
                                <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100/50 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Layers className="w-4 h-4 text-blue-600" />
                                        <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Specialist Parameters</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {['Thaan Length', 'Suit Cutting'].map((field) => {
                                            const key = field.toLowerCase().replace(/[^a-z0-9]/g, '');
                                            return (
                                                <div key={field} className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{field}</Label>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            value={formData[key] || ''}
                                                            onChange={(e) => updateField(key, e.target.value)}
                                                            className="h-11 pr-16 rounded-xl font-bold"
                                                            placeholder="Standard"
                                                            selectOnFocus
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">METERS</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Batch & Serial Tracking Section */}
                            {(hasBatchTracking || hasSerialTracking) && (
                                <div className="space-y-6 pt-8 mt-8 border-t border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <Layers className="w-5 h-5 text-gray-400" />
                                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Traceability & Control</h3>
                                        <Badge className="bg-emerald-500 text-white border-0 text-[10px] font-black uppercase">Active</Badge>
                                    </div>
                                    {hasBatchTracking && (
                                        <div className="animate-in zoom-in-95 duration-300">
                                            <BatchNumberInput
                                                value={formData.batches || []}
                                                onChange={(b) => {
                                                    // 1. Update Batches
                                                    updateField('batches', b);

                                                    // 2. Auto-update total stock
                                                    const totalStock = b.reduce((sum, batch) => sum + (Number(batch.quantity) || 0), 0);
                                                    updateField('stock', totalStock);

                                                    // 3. Auto-calculate Weighted Average Cost (WAC)
                                                    if (totalStock > 0) {
                                                        const totalValue = b.reduce((sum, batch) => sum + ((Number(batch.quantity) || 0) * (Number(batch.costPrice) || 0)), 0);
                                                        const wac = totalValue / totalStock;
                                                        // Only update cost if it's materially different to avoid loops/noise
                                                        if (Math.abs(wac - formData.costPrice) > 0.01) {
                                                            updateField('costPrice', wac);
                                                        }
                                                    }
                                                }}
                                                product={formData}
                                                category={category}
                                            />
                                        </div>
                                    )}
                                    {hasSerialTracking && (
                                        <div className="animate-in zoom-in-95 duration-300">
                                            <SerialNumberInput
                                                value={formData.serialNumbers || []}
                                                onChange={(s) => {
                                                    updateField('serialNumbers', s);
                                                    // Auto-update stock from serials
                                                    updateField('stock', s.length);
                                                }}
                                                product={formData}
                                                category={category}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-100">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{standards.countryCode === 'PK' ? 'HSN Code' : 'Tax/HSN Code'}</Label>
                                    <Input value={formData.hsnCode ?? ''} onChange={(e) => updateField('hsnCode', e.target.value)} placeholder="Code" className="h-11 rounded-xl" selectOnFocus />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">SAC Code</Label>
                                    <Input value={formData.sacCode ?? ''} onChange={(e) => updateField('sacCode', e.target.value)} className="h-11 rounded-xl" selectOnFocus />
                                </div>
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <TaxCategorySelector
                                        category={category}
                                        value={formData.taxCategory || (getDomainDefaultTax(category) ? `Sales Tax ${getDomainDefaultTax(category)}%` : '')}
                                        onChange={(cat, rate) => {
                                            updateField('taxCategory', cat);
                                            updateField('taxPercent', rate);
                                        }}
                                    />
                                    {/* Hidden input for backward compatibility */}
                                    <input type="hidden" value={formData.taxPercent ?? 0} name="taxPercent" />
                                </div>
                            </div>

                            <FormInfo info="Automated reordering triggered at reorder level" />
                        </TabsContent>

                        {product && (
                            <TabsContent value="history" className="space-y-6 animate-in fade-in duration-300" data-tab="history">
                                <StockHistory productId={product.id} businessId={product.business_id} />
                            </TabsContent>
                        )}
                    </Tabs>

                    {/* Validation Error Summary */}
                    {Object.keys(errors).length > 0 && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-red-800">Please correct the following errors:</h4>
                                <ul className="text-xs text-red-700 list-disc list-inside">
                                    {Object.entries(errors).map(([field, msg]) => (
                                        <li key={field}><span className="font-semibold capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</span> {msg}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Sticky Action Footer */}
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-6">
                        <div className="bg-slate-900/95 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl shadow-indigo-500/20 flex items-center justify-between">
                            <Button type="button" variant="ghost" onClick={fillDemoData} className="text-[10px] text-slate-400 hover:text-white uppercase font-black tracking-widest px-4">
                                <Sparkles className="w-3 h-3 mr-2 text-yellow-500" />
                                Smart Fill
                            </Button>
                            
                            <div className="flex gap-3">
                                {onCancel && (
                                    <Button type="button" variant="ghost" onClick={onCancel} className="font-bold text-slate-400 hover:text-white h-11 px-6 rounded-2xl">
                                        Dismiss
                                    </Button>
                                )}

                                {!product && (
                                    <Button
                                        type="button"
                                        onClick={(e) => handleSubmit(e, true)}
                                        disabled={isLoading}
                                        className="font-black px-6 h-11 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save & Next'}
                                    </Button>
                                )}

                                <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-10 h-11 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (product ? <><Save className="w-4 h-4" /> Finalize Update</> : <><CheckCircle2 className="w-4 h-4" /> Deploy to Stock</>)}
                                </Button>
                            </div>
                        </div>
                        <div className="mt-2 text-center">
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tip: Press <kbd className="bg-gray-100 px-1 rounded">Enter</kbd> to move fields or <kbd className="bg-gray-100 px-1 rounded">Cmd+Enter</kbd> to save</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </form >
    );
}