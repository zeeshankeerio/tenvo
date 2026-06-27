'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle2, Package, Loader2, FileText, Building2, MapPin } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useBusiness } from '@/lib/context/BusinessContext';
import { purchaseAPI } from '@/lib/api/purchases';
import toast from 'react-hot-toast';
import {
  getPurchaseStatusLabel,
  isReceivablePurchaseStatus,
  normalizePurchaseStatus,
  PURCHASE_STATUSES,
} from '@/lib/constants/purchaseStatus';

export default function GRNView({ poId, businessId, business, onUpdateStatus, colors }) {
    const { currency: ctxCurrency } = useBusiness();
    const currency = business?.currency || ctxCurrency || 'PKR';
    const [purchase, setPurchase] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDetails() {
            if (!poId || !businessId) return;
            try {
                setLoading(true);
                const data = await purchaseAPI.getById(businessId, poId);
                setPurchase(data);
            } catch (error) {
                console.error('Error fetching PO details:', error);
                toast.error('Failed to load document details');
            } finally {
                setLoading(false);
            }
        }
        fetchDetails();
    }, [poId, businessId]);

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
    if (!purchase) return <div className="p-8 text-center text-gray-400 font-medium">Document not found</div>;

    const isReceived = normalizePurchaseStatus(purchase.status) === PURCHASE_STATUSES.RECEIVED;
    const canReceive = isReceivablePurchaseStatus(purchase.status);
    const vendorAddress = [purchase.vendor_address, purchase.vendor_city].filter(Boolean).join(', ');

    return (
        <div id="printable-grn" className="space-y-8 animate-in fade-in duration-500 bg-white p-1">
            {/* Header Info */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-8">
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 border-2 border-gray-900 text-gray-900 rounded-lg">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
                                {isReceived ? 'Good Receipt Note' : 'Purchase Order'}
                            </h2>
                            <p className="text-gray-600 font-bold uppercase text-[10px] tracking-widest mt-0.5">
                                Ref: #{purchase.purchase_number}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 pt-2">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">Supplier Details</Label>
                            </div>
                            <div className="pl-6">
                                <p className="font-semibold text-gray-800 text-lg">{purchase.vendor_name}</p>
                                <p className="text-sm text-gray-500">{purchase.vendor_email}</p>
                                <p className="text-sm text-gray-500">{purchase.vendor_phone}</p>
                                {vendorAddress && (
                                    <p className="text-sm text-gray-500">{vendorAddress}</p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">Receiving Entity</Label>
                            </div>
                            <div className="pl-6">
                                <p className="font-semibold text-gray-800 text-lg">{business?.name}</p>
                                <p className="text-sm text-gray-500">{business?.address || 'Primary Business Location'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-right space-y-6">
                    <div className="space-y-1">
                        <Label className="text-[10px] font-semibold uppercase text-gray-400">Date Issued</Label>
                        <p className="font-bold text-gray-800">{new Date(purchase.date).toLocaleDateString('en-PK', { dateStyle: 'long' })}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] font-semibold uppercase text-gray-500">Status</Label>
                        <div>
                            <span className="inline-block px-3 py-1 border-2 border-gray-900 text-gray-900 font-bold uppercase text-[10px] rounded-md">
                                {getPurchaseStatusLabel(purchase.status)}
                            </span>
                        </div>
                    </div>
                    {isReceived && (
                        <div className="pt-4 flex justify-end">
                            <div className="p-2 border-2 border-gray-900 rounded-lg flex flex-col items-center justify-center w-32">
                                <span className="text-xs font-semibold text-gray-900 uppercase">Received</span>
                                <span className="text-[10px] font-bold text-gray-600">{new Date().toLocaleDateString()}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Item Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200 font-semibold text-[10px] uppercase text-gray-600 tracking-widest">
                        <tr>
                            <th className="px-6 py-3 text-left">Item Description</th>
                            <th className="px-4 py-3 text-center">SKU</th>
                            <th className="px-4 py-3 text-center">Batch Info</th>
                            <th className="px-4 py-3 text-center w-24">Qty</th>
                            <th className="px-4 py-3 text-right w-32">Unit Cost</th>
                            <th className="px-6 py-3 text-right w-32">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-900">
                        {purchase.items?.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-3">
                                    <p className="font-bold">{item.product_name || item.description}</p>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="font-mono text-[10px]">{item.product_sku || 'N/A'}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {item.batch_number ? (
                                        <div className="flex flex-col text-[10px] font-bold">
                                            <span>B# {item.batch_number}</span>
                                            {item.expiry_date && <span>Exp: {new Date(item.expiry_date).toLocaleDateString()}</span>}
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="px-4 py-3 text-center font-bold">{item.quantity}</td>
                                <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.unit_cost, currency)}</td>
                                <td className="px-6 py-3 text-right font-semibold">{formatCurrency(item.total_amount, currency)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer / Notes */}
            <div className="flex justify-between items-start gap-12">
                <div className="flex-1 space-y-2">
                    <Label className="text-[10px] font-semibold uppercase text-gray-500 tracking-widest">Notes & Instructions</Label>
                    <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-800 border border-gray-200">
                        {purchase.notes || 'No additional notes provided for this transaction.'}
                    </div>
                </div>
                <div className="w-80 space-y-4 pt-2">
                    <div className="flex justify-between text-sm font-bold text-gray-500">
                        <span>Subtotal</span>
                        <span className="font-mono">{formatCurrency(purchase.subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-500">
                        <span>GST/Tax Total</span>
                        <span className="font-mono">{formatCurrency(purchase.tax_total, currency)}</span>
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                        <div className="flex justify-between text-xl font-semibold text-gray-900">
                            <span>Net Payable</span>
                            <span style={{ color: colors?.primary }}>{formatCurrency(purchase.total_amount, currency)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 no-print pt-6 border-t border-dashed border-gray-200">
                <Button variant="outline" className="rounded-xl h-11 px-6 font-bold" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" /> Print Document
                </Button>
                {canReceive && (
                    <Button
                        className="rounded-xl h-11 px-8 font-semibold shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95 bg-emerald-600 hover:bg-emerald-700 text-white"
                        style={{ backgroundColor: '#059669' }}
                        onClick={() => onUpdateStatus?.(purchase.id, PURCHASE_STATUSES.RECEIVED)}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Received
                    </Button>
                )}
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                    }
                    /* Hide everything by default */
                    body > * {
                        display: none !important;
                    }
                    /* Show only the printable container */
                    #printable-grn, #printable-grn * {
                        display: block !important;
                        visibility: visible !important;
                    }
                    /* Reset styles for printing */
                    #printable-grn {
                        display: block !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white;
                        padding: 0;
                        margin: 0;
                    }
                    .no-print {
                        display: none !important;
                    }
                    /* Specific layout fixes for print */
                    .flex { display: flex !important; }
                    .justify-between { justify-content: space-between !important; }
                    .items-start { align-items: flex-start !important; }
                    .grid { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 2rem !important; }
                    .gap-12 { gap: 3rem !important; }
                    
                    table { width: 100% !important; border-collapse: collapse !important; }
                    th, td { border: 1px solid #e5e7eb !important; padding: 0.5rem !important; }
                    
                    /* Ensure text is black and visible */
                    .text-gray-900 { color: #111827 !important; }
                    .text-gray-800 { color: #1f2937 !important; }
                    .text-gray-600 { color: #4b5563 !important; }
                    .text-gray-500 { color: #6b7280 !important; }
                }
            `}</style>
        </div>
    );
}
