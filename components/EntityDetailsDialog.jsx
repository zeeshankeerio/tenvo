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
    Package, Users, FileText, ShoppingCart, Truck, Factory,
    ClipboardList, Info, Calendar, DollarSign, MapPin, Phone,
    Mail, Building2, BarChart3, Clock, CheckCircle2, AlertTriangle,
    Hash, Tag, ChevronRight, ExternalLink, Printer, Copy, TrendingUp, Layers, Settings,
    Edit3, Eye, ArrowUpRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { ProductDetailsDialog } from './ProductDetailsDialog';
import { CustomerForm } from './CustomerForm';
import { VendorForm } from './VendorForm';
import { EnhancedInvoiceBuilder } from './EnhancedInvoiceBuilder';
import toast from 'react-hot-toast';

export function EntityDetailsDialog({ item: initialItem, type, open, onClose, category = 'retail-shop' }) {
    const [isEditing, setIsEditing] = useState(false);
    const [item, setItem] = useState(initialItem);

    if (!item) return null;

    if (type === 'product' || (item.sku && !item.invoice_number && !item.finished_product_id)) {
        return (
            <ProductDetailsDialog
                product={item}
                open={open}
                onClose={onClose}
                category={category}
            />
        );
    }

    const handlePrint = () => { window.print(); };

    const handleUpdateSuccess = (updatedData) => {
        setItem(updatedData);
        setIsEditing(false);
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')} updated successfully`);
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const renderHeader = () => {
        let title = item.name || item.number || item.invoice_number || item.company_name || 'Item Details';
        let subtitle = type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
        let icon = <Info className="w-5 h-5 text-gray-400" />;
        let status = item.status || 'Active';
        let statusColor = "bg-gray-100 text-gray-600";

        if (['paid', 'completed', 'received', 'active', 'delivered'].includes(status.toLowerCase())) statusColor = "bg-emerald-100 text-emerald-700 font-bold border-emerald-200";
        if (['pending', 'draft', 'scheduled', 'processing'].includes(status.toLowerCase())) statusColor = "bg-amber-100 text-amber-700 font-bold border-amber-200";
        if (['cancelled', 'overdue', 'failed', 'inactive'].includes(status.toLowerCase())) statusColor = "bg-red-100 text-red-700 font-bold border-red-200";

        switch (type) {
            case 'invoice': icon = <FileText className="w-5 h-5 text-wine" />; title = item.invoice_number || item.number; break;
            case 'customer': icon = <Users className="w-5 h-5 text-green-500" />; break;
            case 'vendor': icon = <Truck className="w-5 h-5 text-blue-500" />; break;
            case 'purchase_order': icon = <ShoppingCart className="w-5 h-5 text-indigo-500" />; subtitle = "Purchase Order"; break;
            case 'quotation': icon = <ClipboardList className="w-5 h-5 text-orange-500" />; break;
            case 'sales_order': icon = <TrendingUp className="w-5 h-5 text-emerald-500" />; subtitle = "Sales Order"; break;
            case 'challan': icon = <Layers className="w-5 h-5 text-gray-500" />; subtitle = "Delivery Challan"; break;
            case 'bom': icon = <Factory className="w-5 h-5 text-wine-500" />; subtitle = "Bill of Materials"; break;
            case 'production_order': icon = <Settings className="w-5 h-5 text-slate-500" />; subtitle = "Production Order"; break;
        }

        return (
            <DialogHeader className="p-6 pb-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-gray-100">{icon}</div>
                            <div>
                                <DialogTitle className="text-xl font-bold text-gray-900 line-clamp-1">
                                    {isEditing ? `Edit ${subtitle}: ${title}` : title}
                                </DialogTitle>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{subtitle}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                    <Badge variant="outline" className={`text-[9px] uppercase font-black px-1.5 py-0 border ${statusColor}`}>
                                        {isEditing ? 'Editing Mode' : status}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                    {!isEditing && (item.grand_total || item.amount || item.total_cost) && (
                        <div className="text-right">
                            <div className={`text-2xl font-black ${item.grand_total > 0 ? 'text-gray-900' : 'text-gray-400 opacity-50'}`}>
                                {formatCurrency(item.grand_total || item.amount || item.total_cost || 0, 'PKR')}
                            </div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                {type === 'bom' ? 'Total Est. Cost' : 'Grand Total'}
                            </div>
                        </div>
                    )}
                </div>
            </DialogHeader>
        );
    };

    const renderInvoiceDetails = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-2"><Users className="w-3.5 h-3.5 text-gray-400" /><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</label></div>
                    <p className="font-bold text-gray-900">{item.customer_name || item.customer?.name || 'Walk-in Customer'}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight mt-1">{item.date ? new Date(item.date).toLocaleDateString('en-GB') : 'No date'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-2"><Hash className="w-3.5 h-3.5 text-gray-400" /><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference</label></div>
                    <p className="font-bold text-gray-900">{item.invoice_number || item.number || 'N/A'}</p>
                    <div className="flex items-center gap-2 mt-1"><span className={`w-2 h-2 rounded-full ${item.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} /><span className="text-[10px] font-black uppercase tracking-widest">{item.payment_method ? `Via ${item.payment_method}` : 'Record Found'}</span></div>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between px-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items ({item.items?.length || 0})</label></div>
                {item.items && item.items.length > 0 ? (
                    <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100/50 text-gray-400 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left font-black uppercase text-[9px] tracking-widest">Description</th>
                                    <th className="px-4 py-3 text-right font-black uppercase text-[9px] tracking-widest">Qty</th>
                                    <th className="px-4 py-3 text-right font-black uppercase text-[9px] tracking-widest">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {item.items.map((line, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-3"><div className="font-bold text-gray-900 text-xs">{line.name || line.product_name}</div></td>
                                        <td className="px-4 py-3 text-right"><Badge variant="outline" className="text-[10px] font-bold">{line.quantity}</Badge></td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900 text-xs">{formatCurrency(line.total || line.amount || (line.rate * line.quantity), 'PKR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/30"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No items summarized</p></div>}
            </div>
        </div>
    );

    const renderCRMDetails = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-gray-50/50 rounded-3xl border border-gray-100">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Email</label>
                    <p className="font-bold text-gray-900 truncate">{item.email || 'N/A'}</p>
                </div>
                <div className="p-5 bg-gray-50/50 rounded-3xl border border-gray-100">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Phone</label>
                    <p className="font-bold text-gray-900 underline underline-offset-4 decoration-emerald-200">{item.phone || 'N/A'}</p>
                </div>
                <div className="col-span-2 p-5 bg-gray-50/50 rounded-3xl border border-gray-100">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Location</label>
                    <p className="font-bold text-gray-900">{item.address || item.city || 'N/A'}</p>
                </div>
            </div>
        </div>
    );

    const renderManufacturingDetails = () => (
        <div className="space-y-6">
            <div className="p-5 bg-wine-50 rounded-3xl border border-wine-100">
                <div className="flex items-center justify-between mb-4">
                    <div><label className="text-[10px] font-black text-wine-400 uppercase tracking-widest block">Product</label><p className="font-bold text-wine-900">{item.product_name || item.name || 'N/A'}</p></div>
                    <div className="text-right"><label className="text-[10px] font-black text-wine-400 uppercase tracking-widest block">Qty</label><p className="font-black text-wine-900">{item.quantity || 1} {item.unit || 'pcs'}</p></div>
                </div>
                {item.materials && item.materials.length > 0 && (
                    <div className="bg-white rounded-2xl border border-wine-100 overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-wine-100/50 text-wine-400 border-b border-wine-100"><tr><th className="px-3 py-2 text-left text-[8px] uppercase tracking-widest">Material</th><th className="px-3 py-2 text-right text-[8px] uppercase tracking-widest">Needed</th></tr></thead>
                            <tbody className="divide-y divide-wine-50">{item.materials.map((m, i) => (<tr key={i}><td className="px-3 py-2 text-wine-900">{m.product_name || m.name}</td><td className="px-3 py-2 text-right font-bold text-wine-700">{m.quantity} {m.unit || 'unit'}</td></tr>))}</tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );

    const renderGenericDetails = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                {item.number && <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Ref</label><p className="font-mono font-bold text-gray-900">{item.number}</p></div>}
                {item.date && <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Date</label><p className="font-bold text-gray-900">{new Date(item.date).toLocaleDateString()}</p></div>}
                <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Attributes</label>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(item).map(([key, value]) => {
                            if (typeof value === 'object' || key.includes('id') || key.includes('_at') || ['name', 'number', 'status', 'grand_total', 'date', 'invoice_number', 'amount', 'tax_total', 'subtotal', 'discount_total', 'items', 'materials'].includes(key)) return null;
                            if (value === null || value === undefined || value === '') return null;
                            return (
                                <div key={key} className="p-3 bg-white rounded-xl border border-gray-100 flex flex-col"><label className="text-[8px] font-black text-gray-400 uppercase tracking-wider mb-0.5">{key.replace(/_/g, ' ')}</label><p className="font-bold text-gray-800 text-xs truncate capitalize">{String(value)}</p></div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl h-[85vh] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 rounded-[2.5rem] border-none shadow-2xl bg-white/95 backdrop-blur-xl animate-in zoom-in-95 duration-300">
                {renderHeader()}
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                    <div className="p-8 pb-12">
                        {isEditing ? (
                            <div className="px-1">
                                {type === 'invoice' && <EnhancedInvoiceBuilder initialData={item} category={category} onSave={handleUpdateSuccess} onClose={() => setIsEditing(false)} />}
                                {type === 'customer' && <CustomerForm initialData={item} category={category} onSave={handleUpdateSuccess} onEntitlementError={() => setIsEditing(false)} onClose={() => setIsEditing(false)} />}
                                {type === 'vendor' && <VendorForm initialData={item} category={category} onSave={handleUpdateSuccess} onEntitlementError={() => setIsEditing(false)} onClose={() => setIsEditing(false)} />}
                                {(type !== 'invoice' && type !== 'customer' && type !== 'vendor') && (
                                    <div className="p-8 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                        <p className="font-bold text-gray-900">Edit not supported for {type}</p>
                                        <Button variant="ghost" onClick={() => setIsEditing(false)} className="mt-4">Back to View</Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <React.Fragment>
                                {type === 'invoice' && renderInvoiceDetails()}
                                {(type === 'customer' || type === 'vendor') && renderCRMDetails()}
                                {(type === 'bom' || type === 'production_order') && renderManufacturingDetails()}
                                {type !== 'invoice' && type !== 'customer' && type !== 'vendor' && type !== 'bom' && type !== 'production_order' && renderGenericDetails()}
                            </React.Fragment>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between backdrop-blur-md shrink-0">
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 px-3"><Printer className="w-3.5 h-3.5 mr-2" /><span className="text-[10px] font-black uppercase tracking-widest">Print</span></Button>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(item), "Item data")} className="rounded-xl bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 px-3"><Copy className="w-3.5 h-3.5 mr-2" /><span className="text-[10px] font-black uppercase tracking-widest">Copy</span></Button>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={isEditing ? () => setIsEditing(false) : onClose} className="rounded-xl font-black uppercase text-[10px] tracking-widest px-6">{isEditing ? 'Cancel' : 'Close'}</Button>
                        <Button onClick={() => setIsEditing(!isEditing)} className="rounded-xl font-black uppercase tracking-widest px-6 shadow-lg shadow-gray-200 border-none bg-emerald-600 hover:bg-emerald-700 text-white">
                            {isEditing ? <React.Fragment><Eye className="w-3.5 h-3.5 mr-2" />View Details</React.Fragment> : <React.Fragment><Edit3 className="w-3.5 h-3.5 mr-2" />Update Record<ArrowUpRight className="w-3.5 h-3.5 ml-2" /></React.Fragment>}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

