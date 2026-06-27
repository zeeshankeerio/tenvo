'use client';

import { useMemo } from 'react';
import { X, Printer, Download, Mail, Building2, User, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatCurrency } from '@/lib/currency';
import { useBusiness } from '@/lib/context/BusinessContext';

const TYPE_LABELS = {
    quotation: 'Quotation',
    sales_order: 'Sales Order',
    delivery_challan: 'Delivery Challan'
};

const DOC_ID_LABELS = {
    quotation: 'QT',
    sales_order: 'SO',
    delivery_challan: 'DC'
};

export function SalesDocumentPreview({
    document,
    type = 'quotation',
    onClose,
    category = 'retail-shop'
}) {
    const { business, currency } = useBusiness();

    const docNumber = document.quotation_number || document.order_number || document.challan_number || 'DOC-XXXX';
    const docDate = document.date ? new Date(document.date).toLocaleDateString() : 'N/A';
    const extraDate = (document.valid_until || document.delivery_date)
        ? new Date(document.valid_until || document.delivery_date).toLocaleDateString()
        : null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
            <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border-none">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-white p-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gray-100`}>
                            <Building2 className={`w-5 h-5 text-gray-900`} />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold tracking-tight uppercase">
                                Preview: {TYPE_LABELS[type]}
                            </CardTitle>
                            <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">{docNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 print:hidden">
                        <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl font-bold border-gray-100">
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                        </Button>
                        <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl font-bold border-gray-100" title="Use Print dialog ? Save as PDF">
                            <Download className="w-4 h-4 mr-2" />
                            PDF
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-red-50 hover:text-red-500">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-0 bg-gray-100">
                    {/* Printable Area */}
                    <div id="printable-document" className="bg-white m-4 md:m-8 p-8 md:p-12 shadow min-h-[1056px] print:m-0 print:shadow-none print:p-8">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-12">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h1 className="text-4xl font-semibold text-wine-600 tracking-tighter uppercase italic">
                                        {business?.business_name || 'FINANCIAL HUB'}
                                    </h1>
                                    <p className="text-xs text-gray-500 font-bold tracking-[0.2em] uppercase">Professional Business Solution</p>
                                </div>
                                <div className="text-sm text-gray-600 space-y-0.5 font-medium">
                                    <p>{business?.address || 'Street Address, City'}</p>
                                    <p>{business?.phone || '+92 000 0000000'}</p>
                                    <p>{business?.email || 'business@example.com'}</p>
                                    {business?.ntn && <p className="font-bold">NTN: {business.ntn}</p>}
                                </div>
                            </div>
                            <div className="text-right space-y-2">
                                <h2 className={`text-5xl font-semibold text-gray-100 uppercase tracking-tighter`}>
                                    {TYPE_LABELS[type]}
                                </h2>
                                <div className="inline-block bg-gray-50 border border-gray-100 p-4 rounded-2xl text-left space-y-1">
                                    <div className="flex gap-4 justify-between min-w-[180px]">
                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Document #</span>
                                        <span className="text-sm font-semibold text-gray-900">{docNumber}</span>
                                    </div>
                                    <div className="flex gap-4 justify-between">
                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Date</span>
                                        <span className="text-sm font-bold text-gray-900">{docDate}</span>
                                    </div>
                                    {extraDate && (
                                        <div className="flex gap-4 justify-between border-t border-dashed border-gray-200 pt-1 mt-1">
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                                                {type === 'quotation' ? 'Valid Till' : 'Delivery By'}
                                            </span>
                                            <span className="text-sm font-bold text-gray-700">{extraDate}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Addresses */}
                        <div className="grid grid-cols-2 gap-12 mb-12">
                            <div className="space-y-3">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <User className="w-3 h-3 text-wine-600" />
                                    Bill To
                                </p>
                                <div className="space-y-1">
                                    <p className="text-xl font-semibold text-gray-900">{document.customer_name || 'Customer Name'}</p>
                                    <div className="text-sm text-gray-600 font-medium italic">
                                        <p>{document.customer_address || 'Address not specified'}</p>
                                        <p>{document.customer_phone}</p>
                                        <p>{document.customer_email}</p>
                                    </div>
                                </div>
                            </div>
                            {type === 'delivery_challan' && document.delivery_address && (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Calendar className="w-3 h-3 text-wine-600" />
                                        Ship To
                                    </p>
                                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 border-dashed">
                                        <p className="text-sm text-gray-700 font-bold leading-relaxed italic">
                                            {document.delivery_address}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Items Table */}
                        <div className="mb-12">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-wine-600/20">
                                        <th className="py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4">#</th>
                                        <th className="py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Item Description</th>
                                        <th className="py-4 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Qty</th>
                                        {type !== 'delivery_challan' && (
                                            <>
                                                <th className="py-4 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Unit Price</th>
                                                <th className="py-4 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4">Amount</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(document.items || []).map((item, idx) => (
                                        <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="py-5 px-4 text-sm font-bold text-gray-400 w-12">{idx + 1}</td>
                                            <td className="py-5">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{item.product_name || item.name}</p>
                                                    {item.description && <p className="text-xs text-gray-600">{item.description}</p>}
                                                    <div className="flex gap-2">
                                                        {item.batch_number && (
                                                            <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                                Batch: {item.batch_number}
                                                            </span>
                                                        )}
                                                        {item.serial_number && (
                                                            <span className="text-[10px] font-semibold bg-wine-50 text-wine-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                                Serial: {item.serial_number}
                                                            </span>
                                                        )}
                                                        {item.article_no && (
                                                            <span className="text-[10px] font-semibold bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                                Art: {item.article_no} / Des: {item.design_no}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 text-center text-sm font-semibold text-gray-700">{item.quantity}</td>
                                            {type !== 'delivery_challan' && (
                                                <>
                                                    <td className="py-5 text-right text-sm font-bold text-gray-600">
                                                        {formatCurrency(item.unit_price, currency)}
                                                    </td>
                                                    <td className="py-5 text-right text-sm font-semibold text-gray-900 px-4">
                                                        {formatCurrency(item.quantity * item.unit_price, currency)}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer & Totals */}
                        <div className="grid grid-cols-2 gap-12 pt-8 border-t border-gray-100">
                            <div className="space-y-6">
                                {document.notes && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Terms & Notes</p>
                                        <p className="text-xs text-gray-500 leading-relaxed font-medium italic bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            {document.notes}
                                        </p>
                                    </div>
                                )}
                                <div className="pt-12">
                                    <div className="border-t border-gray-200 w-48 mb-2"></div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Authorized Signature</p>
                                </div>
                            </div>

                            {type !== 'delivery_challan' && (
                                <div className="space-y-3 bg-white p-6 rounded-lg border border-gray-200 self-start">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
                                        <span className="font-bold text-gray-700">{formatCurrency(document.subtotal, currency)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Tax Total</span>
                                        <span className="font-bold text-gray-700">{formatCurrency(document.tax_total, currency)}</span>
                                    </div>
                                    <div className="flex justify-between border-t-2 border-wine-600/20 pt-3 mt-3">
                                        <span className="text-wine-600 font-semibold uppercase tracking-tighter text-lg">Grand Total</span>
                                        <span className="text-wine-600 font-semibold text-2xl">
                                            {formatCurrency(document.total_amount || document.grand_total, currency)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Branding */}
                        <div className="mt-24 text-center space-y-2 pb-12 opacity-50">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Generated via Financial Hub Enterprise AI</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <style jsx global>{`
                    @page {
                        size: auto;
                        margin: 0mm;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #printable-document, #printable-document * {
                        visibility: visible;
                    }
                    #printable-document {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        background: white;
                        z-index: 9999;
                        padding: 40px;
                        margin: 0 !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    body {
                        overflow: hidden;
                    }
                    /* Reset card styling for print */
                    .shadow-2xl, .shadow {
                        box-shadow: none !important;
                    }
            `}</style>
        </div>
    );
}

