'use client';

import { useState, useEffect } from 'react';
import { Save, Hash, Package, TrendingUp, Info, Zap, RefreshCw, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { getDomainDefaults } from '@/lib/domainKnowledge';
import { useFormRegionalContext } from '@/lib/hooks/useFormRegionalContext';
import { getDomainProductFields, getDomainFormLabels } from '@/lib/utils/domainHelpers';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

const inputClass = 'h-9 rounded-lg border-gray-200 bg-white text-sm focus-visible:ring-2 focus-visible:ring-blue-500/20';
const labelClass = 'text-[10px] font-bold uppercase tracking-wide text-gray-500';

/**
 * SmartQuickAddModal, compact product entry for domain experts.
 */
export function SmartQuickAddModal({
    isOpen,
    onClose,
    onSave,
    category = 'retail-shop',
    businessId,
    currency: currencyProp,
}) {
    const { currency, defaultTaxRate, domainKnowledge, countryIso } = useFormRegionalContext(category);
    const displayCurrency = currencyProp || currency;
    const defaults = getDomainDefaults(category, { countryIso });

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        costPrice: 0,
        marginPercent: 20,
        price: 0,
        stock: 0,
        unit: defaults.defaultUnit || 'pcs',
        taxPercent: defaults.defaultTax || defaultTaxRate || 0,
        category: domainKnowledge.name || 'General',
        domain_field: ''
    });

    const domainFields = getDomainProductFields(category);
    const primaryDomainField = domainFields[0] || null;
    const labels = getDomainFormLabels(category);
    const [isGeneratingSku, setIsGeneratingSku] = useState(false);

    useEffect(() => {
        const cost = Number(formData.costPrice) || 0;
        const margin = Number(formData.marginPercent) || 0;
        const calculatedPrice = cost + (cost * (margin / 100));
        if (Math.abs(formData.price - calculatedPrice) > 0.01) {
            setFormData(prev => ({ ...prev, price: Math.round(calculatedPrice) }));
        }
    }, [formData.costPrice, formData.marginPercent]);

    const generateSku = () => {
        setIsGeneratingSku(true);
        setTimeout(() => {
            const prefix = (domainKnowledge.name || category).substring(0, 3).toUpperCase();
            const date = new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7);
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            setFormData(prev => ({ ...prev, sku: `${prefix}-${date}-${random}` }));
            setIsGeneratingSku(false);
        }, 200);
    };

    useEffect(() => {
        if (isOpen && !formData.sku) generateSku();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!formData.name?.trim()) {
            toast.error('Product name is required');
            return;
        }

        const domainData = primaryDomainField ? {
            [primaryDomainField.toLowerCase().replace(/[^a-z0-9]/g, '')]: formData.domain_field
        } : {};

        const payload = {
            ...formData,
            business_id: businessId,
            cost_price: formData.costPrice,
            tax_percent: formData.taxPercent,
            mrp: formData.price,
            is_active: true,
            domain_data: { ...domainData, is_quick_add: true, source: 'smart-quick-add' }
        };

        try {
            await onSave(payload);
            setFormData({
                name: '',
                sku: '',
                costPrice: 0,
                marginPercent: 20,
                price: 0,
                stock: 0,
                unit: defaults.defaultUnit || 'pcs',
                taxPercent: defaults.defaultTax || defaultTaxRate || 0,
                category: domainKnowledge.name || 'General',
                domain_field: ''
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose?.(); }}>
            <DialogContent hideCloseButton className="flex max-h-[min(90vh,720px)] w-[calc(100vw-1.5rem)] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-none p-0 shadow-2xl sm:w-full">
                <DialogHeader className="shrink-0 space-y-1 bg-gradient-to-br from-slate-900 to-indigo-950 px-5 py-4 text-left text-white">
                    <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-white/10 p-2">
                            <Zap className="h-4 w-4 text-yellow-400" />
                        </div>
                        <div>
                            <Badge variant="outline" className="mb-0.5 border-blue-400/30 text-[10px] text-blue-300">Ultra-speed</Badge>
                            <DialogTitle className="text-lg font-bold leading-tight">Smart Quick-Add</DialogTitle>
                        </div>
                    </div>
                    <DialogDescription className="text-xs text-slate-400">
                        Optimized for <span className="font-semibold text-blue-300">{category.replace('-', ' ')}</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
                        <div className="space-y-1.5">
                            <Label className={labelClass}>{labels.name} *</Label>
                            <Input
                                autoFocus
                                placeholder={`e.g. ${labels.name.toLowerCase()}...`}
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className={inputClass}
                            />
                        </div>

                        {primaryDomainField && (
                            <div className="space-y-1.5">
                                <Label className={cn(labelClass, 'flex items-center gap-1 text-blue-600')}>
                                    <Sparkles className="h-3 w-3" /> {primaryDomainField}
                                </Label>
                                <Input
                                    placeholder={`Enter ${primaryDomainField.toLowerCase()}...`}
                                    value={formData.domain_field}
                                    onChange={e => setFormData(prev => ({ ...prev, domain_field: e.target.value }))}
                                    className={cn(inputClass, 'border-blue-100 bg-blue-50/30')}
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className={cn(labelClass, 'flex items-center justify-between')}>
                                SKU / Code
                                <button type="button" onClick={generateSku} className="flex items-center gap-1 text-[10px] font-bold normal-case text-blue-600">
                                    <RefreshCw className={cn('h-3 w-3', isGeneratingSku && 'animate-spin')} /> Auto-gen
                                </button>
                            </Label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                <Input
                                    value={formData.sku}
                                    onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                                    className={cn(inputClass, 'pl-9 font-mono uppercase')}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Opening Stock</Label>
                                <div className="relative">
                                    <Package className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                    <Input type="number" value={formData.stock} onChange={e => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value, 10) || 0 }))} className={cn(inputClass, 'pl-9')} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Unit</Label>
                                <select value={formData.unit} onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))} className={cn(inputClass, 'w-full border border-gray-200 px-2')}>
                                    {domainKnowledge.units?.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-900">
                                    <TrendingUp className="h-3.5 w-3.5" /> Margin-first pricing
                                </span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger type="button"><Info className="h-3.5 w-3.5 text-blue-400" /></TooltipTrigger>
                                        <TooltipContent className="max-w-[200px] text-xs">Set cost and margin, selling price updates automatically.</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-semibold text-blue-800">Net cost</Label>
                                    <Input type="number" value={formData.costPrice || ''} onChange={e => setFormData(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))} className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-semibold text-blue-800">Margin %</Label>
                                    <Input type="number" value={formData.marginPercent || ''} onChange={e => setFormData(prev => ({ ...prev, marginPercent: parseFloat(e.target.value) || 0 }))} className={inputClass} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-white px-3 py-2">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-gray-400">Selling price</p>
                                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(formData.price, displayCurrency)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase text-gray-400">Est. profit</p>
                                    <p className="text-sm font-bold text-emerald-600">+{formatCurrency(formData.price - formData.costPrice, displayCurrency)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="shrink-0 gap-2 border-t border-gray-100 bg-white px-5 py-3 sm:justify-end">
                        <Button type="button" variant="ghost" onClick={onClose} className="h-9">Cancel</Button>
                        <Button type="submit" className="h-9 bg-emerald-600 px-5 hover:bg-emerald-700">
                            Quick Deploy <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
