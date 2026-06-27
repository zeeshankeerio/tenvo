'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Package, Hash, DollarSign, ArrowRight, Save, X, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getDomainProductFields, getDomainFormLabels } from '@/lib/utils/domainHelpers';

/**
 * BulkIntakeRow
 * Optimized for high-speed, keyboard-first data entry.
 * Designed to feel like an Excel row with institutional intelligence.
 */
export function BulkIntakeRow({ 
    category = 'retail-shop', 
    onSave, 
    onCancel,
    isFirst = false,
    autoFocus = false
}) {
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        cost_price: '',
        price: '',
        stock: '',
        domain_field: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // Identify primary domain identifier
    const domainFields = getDomainProductFields(category);
    const primaryDomainField = domainFields[0] || null;
    const labels = getDomainFormLabels(category);

    // Refs for keyboard navigation
    const nameRef = useRef(null);
    const skuRef = useRef(null);
    const costRef = useRef(null);
    const priceRef = useRef(null);
    const stockRef = useRef(null);
    const domainRef = useRef(null);

    useEffect(() => {
        if (autoFocus && nameRef.current) {
            nameRef.current.focus();
        }
    }, [autoFocus]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter') {
            if (nextRef && nextRef.current) {
                nextRef.current.focus();
            } else {
                handleSave();
            }
        }
    };

    const handleSave = async () => {
        // Validation
        const newErrors = {};
        if (!formData.name) newErrors.name = true;
        if (!formData.price) newErrors.price = true;
        if (!formData.stock) newErrors.stock = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSaving(true);
        try {
            const domainData = primaryDomainField ? {
                [primaryDomainField.toLowerCase().replace(/[^a-z0-9]/g, '')]: formData.domain_field
            } : {};

            const payload = {
                name: formData.name,
                sku: formData.sku,
                cost_price: parseFloat(formData.cost_price) || 0,
                price: parseFloat(formData.price) || 0,
                stock: parseInt(formData.stock) || 0,
                category: labels.category || 'Retail',
                domain_data: domainData
            };

            await onSave?.(payload);
            
            // Reset for next entry
            setFormData({
                name: '',
                sku: '',
                cost_price: '',
                price: '',
                stock: '',
                domain_field: ''
            });
            nameRef.current?.focus();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={cn(
            "group flex items-center gap-3 p-3 bg-white hover:bg-white/50 transition-all border-b border-gray-100 animate-in fade-in slide-in-from-left-2 duration-300",
            isSaving && "opacity-50 pointer-events-none"
        )}>
            {/* Status Indicator */}
            <div className="w-8 flex justify-center shrink-0">
                {isSaving ? (
                    <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                ) : (
                    <div className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        formData.name ? "bg-indigo-400" : "bg-gray-200"
                    )} />
                )}
            </div>

            {/* Name Field */}
            <div className="flex-[3] relative">
                <Input
                    ref={nameRef}
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, primaryDomainField ? domainRef : skuRef)}
                    placeholder={labels.name}
                    selectOnFocus
                    className={cn(
                        "h-10 rounded-xl bg-transparent border-transparent focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all truncate",
                        errors.name && "border-red-200 focus:border-red-400 bg-red-50/30"
                    )}
                />
            </div>

            {/* Optional Domain Primary Identifier */}
            {primaryDomainField && (
                <div className="flex-[2] relative">
                    <Input
                        ref={domainRef}
                        value={formData.domain_field}
                        onChange={(e) => handleChange('domain_field', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, skuRef)}
                        placeholder={primaryDomainField}
                        selectOnFocus
                        className="h-10 rounded-xl bg-transparent border-transparent focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 font-mono text-xs text-indigo-700"
                    />
                </div>
            )}

            {/* SKU Field */}
            <div className="flex-[1.5] relative">
                <Input
                    ref={skuRef}
                    value={formData.sku}
                    onChange={(e) => handleChange('sku', e.target.value.toUpperCase())}
                    onKeyDown={(e) => handleKeyDown(e, costRef)}
                    placeholder="SKU (Auto)"
                    selectOnFocus
                    className="h-10 rounded-xl bg-transparent border-transparent focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 font-mono text-xs text-gray-400 uppercase"
                />
            </div>

            {/* Cost Price */}
            <div className="flex-1 relative max-w-[120px]">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-400">₨</div>
                <Input
                    ref={costRef}
                    type="number"
                    value={formData.cost_price}
                    onChange={(e) => handleChange('cost_price', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, priceRef)}
                    placeholder="Cost"
                    selectOnFocus
                    className="h-10 pl-7 pr-2 rounded-xl bg-transparent border-transparent focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 font-bold text-gray-500 text-center"
                />
            </div>

            {/* Selling Price */}
            <div className="flex-1 relative max-w-[120px]">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-indigo-400">₨</div>
                <Input
                    ref={priceRef}
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, stockRef)}
                    placeholder="Price"
                    selectOnFocus
                    className={cn(
                        "h-10 pl-7 pr-2 rounded-xl bg-transparent border-transparent focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 font-bold text-indigo-600 text-center",
                        errors.price && "border-red-200"
                    )}
                />
            </div>

            {/* Stock */}
            <div className="flex-1 relative max-w-[100px]">
                <Input
                    ref={stockRef}
                    type="number"
                    value={formData.stock}
                    onChange={(e) => handleChange('stock', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, null)}
                    placeholder="Stock"
                    selectOnFocus
                    className={cn(
                        "h-10 rounded-xl bg-transparent border-transparent focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 font-semibold text-center text-gray-900",
                        errors.stock && "border-red-200"
                    )}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Package className="w-3 h-3 text-gray-300" />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0 w-24 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleSave} 
                    className="h-8 w-8 rounded-lg text-indigo-600 hover:bg-indigo-100"
                    title="Press Enter to Save"
                >
                    <Save className="w-4 h-4" />
                </Button>
                {onCancel && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onCancel}
                        className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
