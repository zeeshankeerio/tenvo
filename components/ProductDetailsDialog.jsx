'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Package,
    Tag,
    Calendar,
    DollarSign,
    BarChart3,
    Layers,
    Hash,
    AlertTriangle,
    CheckCircle2,
    Info,
    ChevronRight,
    Copy,
    Printer,
    ArrowUpRight,
    Clock,
    Edit3,
    Eye
} from 'lucide-react';
import { useBusiness } from '@/lib/context/BusinessContext';
import { formatCurrency } from '@/lib/utils/formatting';
import { getDomainDefaults } from '@/lib/domainKnowledge';
import { ProductForm } from './ProductForm';
import toast from 'react-hot-toast';

const DetailSection = ({ title, icon: Icon, children }) => (
    <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-gray-100 rounded-lg">
                {Icon && <Icon className="w-3.5 h-3.5 text-gray-500" />}
            </div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{title}</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 px-1">
            {children}
        </div>
    </div>
);

const DetailItem = ({ label, value, className = "", fullWidth = false, isCurrency = false }) => {
    const isEmpty = value === null || value === undefined || value === '' || (isCurrency && value === 0);

    return (
        <div className={`group flex flex-col gap-1.5 ${fullWidth ? 'col-span-full' : ''}`}>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                {label}
                {isCurrency && value > 0 && <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />}
            </label>
            <div className={`text-sm font-bold tracking-tight transition-colors ${isEmpty ? 'text-gray-300 italic font-medium' : 'text-gray-900'} ${className}`}>
                {isEmpty ? (isCurrency ? 'Price not set' : 'Not specified') : value}
            </div>
        </div>
    );
};
export function ProductDetailsDialog({
    product: initialProduct,
    open,
    onClose,
    category = 'retail-shop'
}) {
    const { regionalStandards } = useBusiness();
    const standards = regionalStandards || {
        currency: 'PKR',
        currencySymbol: '₨',
        taxLabel: 'Sales Tax',
        taxIdLabel: 'NTN',
        countryCode: 'PK'
    };

    const [isEditing, setIsEditing] = useState(false);
    const [product, setProduct] = useState(initialProduct);

    // Sync local state when initialProduct changes
    React.useEffect(() => {
        if (initialProduct) setProduct(initialProduct);
    }, [initialProduct]);

    if (!product) return null;

    const stockValue = (product.cost_price || product.price || 0) * (product.stock || 0);
    const isLowStock = (product.stock || 0) <= (product.min_stock || 0);

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleUpdateSuccess = (updatedData) => {
        setProduct(updatedData);
        setIsEditing(false);
        toast.success('Product updated successfully');
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl h-[85vh] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 rounded-[2.5rem] border-none shadow-2xl bg-white/95 backdrop-blur-xl animate-in zoom-in-95 duration-300">
                <DialogHeader className="p-8 pb-6 border-b border-gray-100 bg-gray-50/50 relative shrink-0 overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />

                    <div className="relative flex items-start justify-between gap-6">
                        <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-blue-600">
                                    <Package className="w-6 h-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black text-gray-950 tracking-tight leading-tight">
                                        {isEditing ? `Edit: ${product.name}` : product.name}
                                    </DialogTitle>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant={isLowStock ? "destructive" : "outline"} className={`text-[10px] uppercase font-black px-2 py-0 border-none ${isLowStock ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                                            {isLowStock ? "Low Stock Alert" : "Stable Inventory"}
                                        </Badge>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {product.sku || 'No SKU'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <DialogDescription className="text-sm font-medium text-gray-500 leading-relaxed max-w-lg">
                                {isEditing ? 'Modify the details of this inventory record.' : (product.description || 'Professional inventory record for business management.')}
                            </DialogDescription>
                        </div>

                        {!isEditing && (
                            <div className="text-right flex flex-col items-end">
                                <div className={`text-3xl font-black tracking-tighter ${product.price > 0 ? 'text-gray-950' : 'text-gray-300'}`}>
                                    {product.price > 0 ? formatCurrency(product.price, standards.currency) : '---'}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 justify-end">
                                    <Tag className="w-3 h-3 text-emerald-500" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.15em]">Official Selling Price</span>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                {/* SCROLLABLE VIEWPORT */}
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar relative">
                    <div className="p-8 pb-12">
                        {isEditing ? (
                            <div className="px-1">
                                <ProductForm
                                    product={product}
                                    category={category}
                                    onSave={handleUpdateSuccess}
                                    onCancel={() => setIsEditing(false)}
                                />
                            </div>
                        ) : (
                            <div className="space-y-12 print-section">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'In Stock', value: product.stock || 0, color: isLowStock ? 'text-red-600' : 'text-blue-600', sub: product.unit || 'units' },
                                        { label: 'Asset Value', value: formatCurrency(stockValue, standards.currency), color: 'text-gray-900', sub: 'Est. Valuation' },
                                        { label: 'Min Level', value: product.min_stock || 0, color: 'text-gray-500', sub: 'Buffer limit' },
                                        { label: 'Growth', value: product.price && product.cost_price ? `${(((product.price - product.cost_price) / (product.cost_price || 1)) * 100).toFixed(0)}%` : '0%', color: 'text-emerald-600', sub: 'Gross Margin' }
                                    ].map((card, i) => (
                                        <div key={i} className="p-4 bg-gray-50/50 border border-gray-100 rounded-3xl group hover:bg-white hover:shadow-lg transition-all duration-300">
                                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-blue-400 transition-colors">{card.label}</div>
                                            <div className={`text-lg font-black tracking-tight ${card.color}`}>{card.value}</div>
                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">{card.sub}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 gap-12">
                                    <DetailSection title="Core Specifications" icon={Hash}>
                                        <DetailItem label="Barcode (GTIN)" value={product.barcode} className="font-mono text-xs p-1 bg-gray-50 rounded border border-gray-100 w-fit" />
                                        <DetailItem label="Brand / Origin" value={product.brand} />
                                        <DetailItem label="Primary Category" value={product.category} />
                                        <DetailItem label="Measurement Unit" value={product.unit} />
                                        <DetailItem label="Sales Tax Rate" value={product.tax_percent ? `${product.tax_percent}%` : null} />
                                        <DetailItem label="Reorder Point" value={product.reorder_point} />
                                    </DetailSection>

                                    <DetailSection title="Financial Profile" icon={DollarSign}>
                                        <DetailItem label="Landed Cost" value={product.cost_price && formatCurrency(product.cost_price, standards.currency)} isCurrency />
                                        <DetailItem label="Market Status (MRP)" value={product.mrp && formatCurrency(product.mrp, standards.currency)} isCurrency />
                                        <DetailItem label="Profit Contribution" value={product.cost_price && product.price ? formatCurrency(product.price - product.cost_price, standards.currency) : null} className="text-emerald-600" />
                                        <DetailItem label="Margin Percent" value={product.cost_price && product.price ? `${(((product.price - product.cost_price) / (product.cost_price || 1)) * 100).toFixed(2)}%` : null} className="text-emerald-600" />
                                    </DetailSection>

                                    {((product.batches?.length > 0) || (product.serial_numbers?.length > 0) || (product.variants?.length > 0)) && (
                                        <DetailSection title="Logistics & Tracking" icon={Layers}>
                                            {product.batches?.length > 0 && (
                                                <div className="col-span-full space-y-3">
                                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Batches ({product.batches.length})</label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {product.batches.map((batch, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors">
                                                                <div>
                                                                    <div className="font-mono font-black text-gray-950 text-xs">{batch.batch_number}</div>
                                                                    <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                                                                        Expiry: {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'N/A'}
                                                                    </div>
                                                                </div>
                                                                <div className="px-3 py-1 bg-white border border-gray-100 rounded-xl shadow-sm text-xs font-black text-gray-900">
                                                                    Qt: {batch.quantity}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {product.serial_numbers?.length > 0 && (
                                                <div className="col-span-full space-y-3 mt-4">
                                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Serial Assets ({product.serial_numbers.length})</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {product.serial_numbers.map((serial, idx) => (
                                                            <Badge key={idx} variant="secondary" className="font-mono text-[9px] font-black py-1 px-3 border-gray-200 text-gray-600 bg-gray-50 rounded-xl">
                                                                {typeof serial === 'string' ? serial : (serial.serial_number || serial.number)}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {product.variants?.length > 0 && (
                                                <div className="col-span-full space-y-3 mt-4">
                                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Product Variations ({product.variants.length})</label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {product.variants.map((v, idx) => (
                                                            <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                                                                <div>
                                                                    <div className="text-[10px] font-black text-gray-900 leading-tight">
                                                                        {v.sku}
                                                                    </div>
                                                                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                                                                        {v.size || 'N/A'} * {v.color || 'N/A'}
                                                                    </div>
                                                                </div>
                                                                <Badge className="bg-white border-gray-100 text-gray-600 font-black text-[9px] px-2 py-0.5">
                                                                    {v.stock}
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </DetailSection>
                                    )}

                                    <DetailSection title="System Governance" icon={Clock}>
                                        <DetailItem label="Unique Resource ID" value={product.id} className="font-mono text-[10px] text-gray-400" fullWidth />
                                        <DetailItem label="Database Entrance" value={product.created_at ? new Date(product.created_at).toLocaleString() : 'N/A'} />
                                        <DetailItem label="Last Verified Update" value={product.updated_at ? new Date(product.updated_at).toLocaleString() : 'N/A'} />
                                    </DetailSection>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* FIXED FOOTER */}
                <div className="p-6 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between backdrop-blur-md shrink-0">
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(product.sku || product.name, "Product info")} className="rounded-xl bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 shadow-sm transition-all active:scale-95 px-3">
                            <Copy className="w-3.5 h-3.5 mr-2" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Copy SKU</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 shadow-sm transition-all active:scale-95 px-3">
                            <Printer className="w-3.5 h-3.5 mr-2" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Print Tag</span>
                        </Button>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={isEditing ? () => setIsEditing(false) : onClose} className="rounded-xl font-black uppercase text-[10px] tracking-widest px-6 hover:bg-gray-200 hover:text-gray-900 transition-all active:scale-95">
                            {isEditing ? 'Cancel' : 'Close'}
                        </Button>
                        <Button onClick={() => setIsEditing(!isEditing)} className="rounded-xl font-black uppercase tracking-widest px-6 shadow-lg shadow-blue-100 transition-all active:scale-95 border-none bg-emerald-600 hover:bg-emerald-700 text-white">
                            {isEditing ? (
                                <React.Fragment>
                                    <Eye className="w-3.5 h-3.5 mr-2" />
                                    View Details
                                </React.Fragment>
                            ) : (
                                <React.Fragment>
                                    <Edit3 className="w-3.5 h-3.5 mr-2" />
                                    Update Record
                                    <ArrowUpRight className="w-3.5 h-3.5 ml-2" />
                                </React.Fragment>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
