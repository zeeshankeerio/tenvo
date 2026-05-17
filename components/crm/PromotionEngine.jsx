'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gift, Plus, Percent, Tag, Calendar, Clock, Users, ShoppingBag,
    Trash2, Edit3, ToggleLeft, ToggleRight, Search, AlertTriangle,
    CheckCircle2, Zap, Filter, Copy, ArrowUpRight, ChevronDown, X,
    Package, TrendingUp, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// --- Constants ----------------------------------------------------------------

const PROMO_TYPES = [
    {
        key: 'percentage', label: 'Percentage Off', icon: Percent,
        description: 'Discount a percentage from the total',
        color: 'from-brand-primary to-brand-primary-dark', badgeColor: 'bg-brand-50 text-brand-primary'
    },
    {
        key: 'fixed', label: 'Fixed Amount', icon: Tag,
        description: 'Flat discount amount',
        color: 'from-emerald-500 to-teal-600', badgeColor: 'bg-emerald-100 text-emerald-700'
    },
    {
        key: 'bogo', label: 'Buy X Get Y', icon: Gift,
        description: 'Buy X items, get Y items free or discounted',
        color: 'from-wine-500 to-violet-600', badgeColor: 'bg-wine-100 text-wine-700'
    },
    {
        key: 'bundle', label: 'Bundle Deal', icon: Package,
        description: 'Special price when buying a set of products',
        color: 'from-orange-500 to-red-500', badgeColor: 'bg-orange-100 text-orange-700'
    },
    {
        key: 'threshold', label: 'Spend Threshold', icon: TrendingUp,
        description: 'Discount when order exceeds a minimum amount',
        color: 'from-amber-500 to-orange-600', badgeColor: 'bg-amber-100 text-amber-700'
    },
];

const STATUS_COLORS = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    scheduled: 'bg-brand-50 text-brand-primary border-brand-100',
    expired: 'bg-gray-100 text-gray-500 border-gray-200',
    paused: 'bg-amber-100 text-amber-700 border-amber-200',
};

// --- Promo Form Dialog -------------------------------------------------------

function PromoFormDialog({ open, onClose, onSave, promotion = null, currency = 'Rs.' }) {
    const isEditing = !!promotion;
    const [step, setStep] = useState(isEditing ? 1 : 0);
    const [formData, setFormData] = useState(() => promotion || {
        name: '', description: '', type: 'percentage',
        value: '', min_order: '', max_discount: '',
        buy_qty: '', get_qty: '', get_discount: 100,
        bundle_items: [], bundle_price: '',
        start_date: '', end_date: '',
        usage_limit: '', per_customer_limit: '',
        applicable_products: 'all',
        product_ids: [], category_filter: '',
        is_active: true,
    });

    const selectedType = PROMO_TYPES.find(t => t.key === formData.type);

    const handleFieldChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSave = useCallback(async () => {
        const payload = {
            ...formData,
            value: parseFloat(formData.value) || 0,
            min_order: parseFloat(formData.min_order) || 0,
            max_discount: parseFloat(formData.max_discount) || null,
            buy_qty: parseInt(formData.buy_qty) || 0,
            get_qty: parseInt(formData.get_qty) || 0,
            get_discount: parseFloat(formData.get_discount) || 100,
            usage_limit: parseInt(formData.usage_limit) || null,
            per_customer_limit: parseInt(formData.per_customer_limit) || null,
        };
        await onSave?.(payload);
        onClose();
    }, [formData, onSave, onClose]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl p-0 border-none bg-white rounded-2xl shadow-2xl overflow-hidden">
                <DialogHeader className="sr-only">
                    <DialogTitle>{isEditing ? 'Edit Promotion' : 'Create Promotion'}</DialogTitle>
                    <DialogDescription>Configure promotion details</DialogDescription>
                </DialogHeader>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br",
                            selectedType?.color || 'from-brand-primary to-brand-primary-dark'
                        )}>
                            <Gift className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-gray-900">
                                {isEditing ? 'Edit Promotion' : 'Create New Promotion'}
                            </h2>
                            <p className="text-[10px] text-gray-400 font-bold">
                                {step === 0 ? 'Choose promotion type' : 'Configure details'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Step 0: Type Selection */}
                {step === 0 && (
                    <div className="p-6 space-y-3">
                        {PROMO_TYPES.map(type => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.key}
                                    onClick={() => {
                                        handleFieldChange('type', type.key);
                                        setStep(1);
                                    }}
                                    className={cn(
                                        "flex items-center gap-4 w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-md",
                                        formData.type === type.key
                                            ? "border-brand-primary bg-brand-50/50"
                                            : "border-gray-200 hover:border-gray-300 bg-white"
                                    )}
                                >
                                    <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-sm", type.color)}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-black text-gray-900">{type.label}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{type.description}</p>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90" />
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Step 1: Configuration */}
                {step === 1 && (
                    <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                        {/* Name & Description */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Promotion Name *</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => handleFieldChange('name', e.target.value)}
                                    placeholder="e.g., Weekend Special, Ramadan Bundle"
                                    className="h-11 rounded-xl text-sm"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Description</label>
                                <Input
                                    value={formData.description}
                                    onChange={(e) => handleFieldChange('description', e.target.value)}
                                    placeholder="Brief description for internal reference"
                                    className="h-10 rounded-xl text-sm"
                                />
                            </div>
                        </div>

                        {/* Type-Specific Fields */}
                        {(formData.type === 'percentage' || formData.type === 'fixed') && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">
                                        {formData.type === 'percentage' ? 'Discount (%)' : `Discount (${currency})`}
                                    </label>
                                    <Input
                                        type="number"
                                        value={formData.value}
                                        onChange={(e) => handleFieldChange('value', e.target.value)}
                                        placeholder={formData.type === 'percentage' ? "10" : "500"}
                                        className="h-11 rounded-xl text-sm font-bold"
                                        min="0"
                                        max={formData.type === 'percentage' ? "100" : undefined}
                                    />
                                </div>
                                {formData.type === 'percentage' && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Max Discount ({currency})</label>
                                        <Input
                                            type="number"
                                            value={formData.max_discount}
                                            onChange={(e) => handleFieldChange('max_discount', e.target.value)}
                                            placeholder="No limit"
                                            className="h-11 rounded-xl text-sm"
                                            min="0"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {formData.type === 'bogo' && (
                            <div className="p-4 rounded-xl bg-wine-50/50 border border-wine-200 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Gift className="w-4 h-4 text-wine-500" />
                                    <span className="text-xs font-black text-wine-700 uppercase">Buy X Get Y Configuration</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500">Buy Quantity</label>
                                        <Input
                                            type="number"
                                            value={formData.buy_qty}
                                            onChange={(e) => handleFieldChange('buy_qty', e.target.value)}
                                            placeholder="2"
                                            className="h-10 rounded-xl text-sm font-bold text-center"
                                            min="1"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500">Get Quantity</label>
                                        <Input
                                            type="number"
                                            value={formData.get_qty}
                                            onChange={(e) => handleFieldChange('get_qty', e.target.value)}
                                            placeholder="1"
                                            className="h-10 rounded-xl text-sm font-bold text-center"
                                            min="1"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500">Discount (%)</label>
                                        <Input
                                            type="number"
                                            value={formData.get_discount}
                                            onChange={(e) => handleFieldChange('get_discount', e.target.value)}
                                            placeholder="100"
                                            className="h-10 rounded-xl text-sm font-bold text-center"
                                            min="0" max="100"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-wine-500">
                                    Customer buys {formData.buy_qty || 'X'} items, gets {formData.get_qty || 'Y'} at {formData.get_discount || 100}% off
                                </p>
                            </div>
                        )}

                        {formData.type === 'threshold' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Minimum Spend ({currency})</label>
                                    <Input
                                        type="number"
                                        value={formData.min_order}
                                        onChange={(e) => handleFieldChange('min_order', e.target.value)}
                                        placeholder="5000"
                                        className="h-11 rounded-xl text-sm font-bold"
                                        min="0"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Discount ({currency})</label>
                                    <Input
                                        type="number"
                                        value={formData.value}
                                        onChange={(e) => handleFieldChange('value', e.target.value)}
                                        placeholder="500"
                                        className="h-11 rounded-xl text-sm font-bold"
                                        min="0"
                                    />
                                </div>
                            </div>
                        )}

                        {formData.type === 'bundle' && (
                            <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-200 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-orange-500" />
                                    <span className="text-xs font-black text-orange-700 uppercase">Bundle Configuration</span>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500">Bundle Price ({currency})</label>
                                    <Input
                                        type="number"
                                        value={formData.bundle_price}
                                        onChange={(e) => handleFieldChange('bundle_price', e.target.value)}
                                        placeholder="Special bundle price"
                                        className="h-10 rounded-xl text-sm font-bold"
                                        min="0"
                                    />
                                </div>
                                <p className="text-[10px] text-orange-500">
                                    Select products for this bundle from the product filter below
                                </p>
                            </div>
                        )}

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Start Date</label>
                                <Input
                                    type="datetime-local"
                                    value={formData.start_date}
                                    onChange={(e) => handleFieldChange('start_date', e.target.value)}
                                    className="h-10 rounded-xl text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-700 uppercase tracking-wider">End Date</label>
                                <Input
                                    type="datetime-local"
                                    value={formData.end_date}
                                    onChange={(e) => handleFieldChange('end_date', e.target.value)}
                                    className="h-10 rounded-xl text-sm"
                                />
                            </div>
                        </div>

                        {/* Usage Limits */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Total Usage Limit</label>
                                <Input
                                    type="number"
                                    value={formData.usage_limit}
                                    onChange={(e) => handleFieldChange('usage_limit', e.target.value)}
                                    placeholder="Unlimited"
                                    className="h-10 rounded-xl text-sm"
                                    min="0"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Per Customer Limit</label>
                                <Input
                                    type="number"
                                    value={formData.per_customer_limit}
                                    onChange={(e) => handleFieldChange('per_customer_limit', e.target.value)}
                                    placeholder="Unlimited"
                                    className="h-10 rounded-xl text-sm"
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* Product Scope */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Applies To</label>
                            <div className="flex gap-2">
                                {[
                                    { key: 'all', label: 'All Products' },
                                    { key: 'category', label: 'Specific Category' },
                                    { key: 'products', label: 'Specific Products' },
                                ].map(opt => (
                                    <button
                                        key={opt.key}
                                        onClick={() => handleFieldChange('applicable_products', opt.key)}
                                        className={cn(
                                            "px-3 py-2 rounded-xl text-[11px] font-bold transition-all",
                                            formData.applicable_products === opt.key
                                                ? "bg-brand-primary text-white shadow-md"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            {formData.applicable_products === 'category' && (
                                <Input
                                    value={formData.category_filter}
                                    onChange={(e) => handleFieldChange('category_filter', e.target.value)}
                                    placeholder="Category name (e.g., Beverages, Electronics)"
                                    className="h-10 rounded-xl text-sm mt-2"
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <Button variant="outline" onClick={step === 0 ? onClose : () => setStep(0)} className="h-10 rounded-xl text-xs font-bold">
                        {step === 0 ? 'Cancel' : '<- Back'}
                    </Button>
                    {step === 1 && (
                        <Button
                            onClick={handleSave}
                            disabled={!formData.name.trim()}
                            className="h-10 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md px-6"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            {isEditing ? 'Update Promotion' : 'Create Promotion'}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// --- Promotion Card ----------------------------------------------------------

function PromoCard({ promotion, onEdit, onToggle, onDuplicate, onDelete, currency }) {
    const typeInfo = PROMO_TYPES.find(t => t.key === promotion.type) || PROMO_TYPES[0];
    const Icon = typeInfo.icon;

    const getStatus = () => {
        if (!promotion.is_active) return 'paused';
        const now = new Date();
        if (promotion.start_date && new Date(promotion.start_date) > now) return 'scheduled';
        if (promotion.end_date && new Date(promotion.end_date) < now) return 'expired';
        return 'active';
    };

    const status = getStatus();
    const usagePercent = promotion.usage_limit
        ? Math.min(100, ((promotion.usage_count || 0) / promotion.usage_limit) * 100)
        : null;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "rounded-xl border-2 bg-white overflow-hidden transition-all hover:shadow-lg group",
                status === 'active' ? "border-gray-200 hover:border-emerald-300" :
                    status === 'paused' ? "border-amber-200/50 bg-amber-50/20" :
                        "border-gray-200/50 opacity-70"
            )}
        >
            <div className="p-4">
                {/* Top Row */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-sm", typeInfo.color)}>
                            <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-gray-900">{promotion.name}</h3>
                            <Badge variant="outline" className={cn("text-[9px] mt-0.5", typeInfo.badgeColor)}>
                                {typeInfo.label}
                            </Badge>
                        </div>
                    </div>
                    <Badge className={cn("text-[9px] font-bold border", STATUS_COLORS[status])}>
                        {status}
                    </Badge>
                </div>

                {/* Value Display */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="text-lg font-black text-gray-900">
                        {promotion.type === 'percentage' && `${promotion.value}% OFF`}
                        {promotion.type === 'fixed' && `${currency}${promotion.value} OFF`}
                        {promotion.type === 'bogo' && `Buy ${promotion.buy_qty} Get ${promotion.get_qty}`}
                        {promotion.type === 'bundle' && `Bundle: ${currency}${promotion.bundle_price}`}
                        {promotion.type === 'threshold' && `Spend ${currency}${promotion.min_order}+`}
                    </div>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-2 text-[10px] text-gray-400">
                    {promotion.start_date && (
                        <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(promotion.start_date).toLocaleDateString()} -- {promotion.end_date ? new Date(promotion.end_date).toLocaleDateString() : 'Ongoing'}
                        </span>
                    )}
                    {promotion.min_order > 0 && (
                        <span className="flex items-center gap-0.5">
                            <ShoppingBag className="w-3 h-3" /> Min: {currency}{promotion.min_order}
                        </span>
                    )}
                </div>

                {/* Usage Bar */}
                {usagePercent !== null && (
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                            <span>Usage: {promotion.usage_count || 0} / {promotion.usage_limit}</span>
                            <span>{Math.round(usagePercent)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-amber-500" : "bg-emerald-500"
                                )}
                                style={{ width: `${usagePercent}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50/50
                            opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(promotion)} className="h-7 text-[10px] text-gray-500 hover:text-brand-primary">
                        <Edit3 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDuplicate(promotion)} className="h-7 text-[10px] text-gray-500 hover:text-brand-primary">
                        <Copy className="w-3 h-3 mr-1" /> Duplicate
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(promotion)} className="h-7 text-[10px] text-gray-500 hover:text-red-600">
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                </div>
                <button
                    onClick={() => onToggle(promotion)}
                    className={cn("flex items-center gap-1 text-[10px] font-bold transition-colors",
                        promotion.is_active ? "text-emerald-600" : "text-gray-400"
                    )}
                >
                    {promotion.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {promotion.is_active ? 'Active' : 'Paused'}
                </button>
            </div>
        </motion.div>
    );
}

// --- Main Promotion Engine ---------------------------------------------------

export function PromotionEngine({ businessId, currency = 'Rs.' }) {
    const [promotions, setPromotions] = useState([
        // Demo data for rendering
        {
            id: '1', name: 'Weekend Special', type: 'percentage', value: 15,
            is_active: true, start_date: '2026-02-20', end_date: '2026-03-20',
            min_order: 0, max_discount: 2000, usage_limit: 100, usage_count: 34,
            applicable_products: 'all',
        },
        {
            id: '2', name: 'Buy 2 Get 1 Free', type: 'bogo',
            buy_qty: 2, get_qty: 1, get_discount: 100,
            is_active: true, start_date: '2026-02-01', end_date: '2026-02-28',
            min_order: 0, usage_limit: 50, usage_count: 12, applicable_products: 'category',
            category_filter: 'Beverages',
        },
        {
            id: '3', name: 'Ramadan Bundle', type: 'bundle', bundle_price: 2500,
            is_active: false, start_date: '2026-03-01', end_date: '2026-03-30',
            min_order: 0, usage_limit: null, usage_count: 0, applicable_products: 'products',
        },
    ]);
    const [showForm, setShowForm] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPromotions = useMemo(() => {
        let items = promotions;
        if (filterStatus !== 'all') {
            items = items.filter(p => {
                const now = new Date();
                if (filterStatus === 'active') return p.is_active && (!p.end_date || new Date(p.end_date) >= now);
                if (filterStatus === 'paused') return !p.is_active;
                if (filterStatus === 'expired') return p.end_date && new Date(p.end_date) < now;
                return true;
            });
        }
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(p => p.name.toLowerCase().includes(lower));
        }
        return items;
    }, [promotions, filterStatus, searchTerm]);

    // Stats
    const stats = useMemo(() => ({
        total: promotions.length,
        active: promotions.filter(p => p.is_active).length,
        totalUsage: promotions.reduce((sum, p) => sum + (p.usage_count || 0), 0),
    }), [promotions]);

    const handleSave = useCallback(async (data) => {
        if (editingPromo) {
            setPromotions(prev => prev.map(p => p.id === editingPromo.id ? { ...p, ...data } : p));
        } else {
            setPromotions(prev => [...prev, { ...data, id: Date.now().toString(), usage_count: 0 }]);
        }
        setEditingPromo(null);
    }, [editingPromo]);

    const handleToggle = useCallback((promo) => {
        setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: !p.is_active } : p));
    }, []);

    const handleDuplicate = useCallback((promo) => {
        setPromotions(prev => [...prev, { ...promo, id: Date.now().toString(), name: `${promo.name} (Copy)`, usage_count: 0 }]);
    }, []);

    const handleDelete = useCallback((promo) => {
        setPromotions(prev => prev.filter(p => p.id !== promo.id));
    }, []);

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Promotions', value: stats.total, icon: Gift, color: 'from-brand-primary to-brand-primary-dark' },
                    { label: 'Active Now', value: stats.active, icon: Zap, color: 'from-emerald-500 to-teal-600' },
                    { label: 'Total Redemptions', value: stats.totalUsage, icon: Users, color: 'from-amber-500 to-orange-600' },
                ].map(stat => (
                    <Card key={stat.label} className="border-gray-200 shadow-sm">
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm", stat.color)}>
                                <stat.icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xl font-black text-gray-900">{stat.value}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search promotions..."
                            className="pl-10 h-10 rounded-xl text-sm"
                        />
                    </div>
                    <div className="flex gap-1">
                        {['all', 'active', 'paused', 'expired'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={cn(
                                    "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                    filterStatus === status
                                        ? "bg-brand-primary text-white shadow-md"
                                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                )}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
                <Button
                    onClick={() => { setEditingPromo(null); setShowForm(true); }}
                    className="h-10 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-primary to-brand-primary-dark hover:from-brand-primary-dark hover:to-brand-primary shadow-md shadow-brand-primary/20"
                >
                    <Plus className="w-4 h-4 mr-1.5" /> New Promotion
                </Button>
            </div>

            {/* Promotion Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence>
                    {filteredPromotions.map(promo => (
                        <PromoCard
                            key={promo.id}
                            promotion={promo}
                            currency={currency}
                            onEdit={(p) => { setEditingPromo(p); setShowForm(true); }}
                            onToggle={handleToggle}
                            onDuplicate={handleDuplicate}
                            onDelete={handleDelete}
                        />
                    ))}
                </AnimatePresence>
                {filteredPromotions.length === 0 && (
                    <div className="col-span-full py-16 text-center text-gray-400">
                        <Gift className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-bold">No promotions found</p>
                        <p className="text-[10px] mt-1">Create your first promotion to drive sales</p>
                    </div>
                )}
            </div>

            {/* Form Dialog */}
            <PromoFormDialog
                open={showForm}
                onClose={() => { setShowForm(false); setEditingPromo(null); }}
                onSave={handleSave}
                promotion={editingPromo}
                currency={currency}
            />
        </div>
    );
}

