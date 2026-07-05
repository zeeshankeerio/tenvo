'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Plus, Receipt, CreditCard, History, Search, Download, Trash2, Calendar,
    ArrowUpRight, ArrowDownLeft, Filter, RefreshCcw, Wallet
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MobileTabHeader, MobileStatStrip } from '@/components/mobile/MobileTabHeader';
import { HubEntityMobileList } from '@/components/mobile/HubEntityMobileList';
import { MOBILE_DIALOG_SHELL } from '@/lib/utils/formMobileStyles';
import { MOBILE_BOTTOM_NAV_CLASS, MOBILE_FLOATING_Z, MOBILE_MODULE_FAB_RIGHT } from '@/lib/utils/mobileLayout';
import { cn } from '@/lib/utils';
import { DataTable } from "@/components/DataTable";
import { paymentAPI } from "@/lib/api/payments";
import { formatCurrency } from "@/lib/currency";
import { isReceiptType, getPaymentTypeLabel } from '@/lib/utils/paymentTypes';

export default function PaymentManager({
    businessId,
    customers = [],
    vendors = [],
    invoices = [],
    purchases = [],
    currency = 'PKR',
    refreshData
}) {
    const [payments, setPayments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [paymentType, setPaymentType] = useState('receipt'); // receipt or payment

    const [formData, setFormData] = useState({
        customerId: '',
        vendorId: '',
        referenceType: 'invoice',
        referenceId: '',
        amount: '',
        paymentMode: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        bankName: '',
        chequeNumber: '',
        transactionId: '',
        notes: ''
    });

    const fetchPayments = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await paymentAPI.getRegister(businessId, { limit: 300 });
            if (result.success) {
                setPayments(result.payments);
            } else {
                toast.error("Failed to load payments");
            }
        } catch (error) {
            console.error("Error fetching payments:", error);
            toast.error("Network error while loading payments");
        } finally {
            setIsLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        if (businessId) {
            fetchPayments();
        }
    }, [businessId, fetchPayments]);

    useEffect(() => {
        const openDialog = () => setShowPaymentDialog(true);
        window.addEventListener('hub-open-payment-dialog', openDialog);
        return () => window.removeEventListener('hub-open-payment-dialog', openDialog);
    }, []);

    const handleCreatePayment = async () => {
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (paymentType === 'receipt' && !formData.customerId) {
            toast.error("Please select a customer");
            return;
        }

        if (paymentType === 'payment' && !formData.vendorId) {
            toast.error("Please select a vendor");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                business_id: businessId,
                payment_type: paymentType,
                customer_id: paymentType === 'receipt' ? formData.customerId : null,
                vendor_id: paymentType === 'payment' ? formData.vendorId : null,
                reference_type: formData.referenceType,
                reference_id: formData.referenceId || null,
                amount: parseFloat(formData.amount),
                payment_mode: formData.paymentMode,
                payment_date: formData.paymentDate,
                bank_name: formData.bankName,
                cheque_number: formData.chequeNumber,
                transaction_id: formData.transactionId,
                notes: formData.notes
            };

            const result = await paymentAPI.create(payload);
            if (result.success) {
                toast.success(`${paymentType === 'receipt' ? 'Receipt' : 'Payment'} recorded successfully`);
                setShowPaymentDialog(false);
                fetchPayments();
                if (refreshData) refreshData();

                // Reset form
                setFormData({
                    ...formData,
                    amount: '',
                    notes: '',
                    referenceId: '',
                    transactionId: '',
                    chequeNumber: '',
                    bankName: ''
                });
            } else {
                toast.error(result.error || "Failed to record payment");
            }
        } catch (error) {
            console.error("Error creating payment:", error);
            toast.error("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePayment = async (id) => {
        if (!confirm("Are you sure you want to delete this payment record? This will reverse the balance updates.")) return;

        try {
            const result = await paymentAPI.delete(businessId, id);
            if (result.success) {
                toast.success("Payment deleted and balances adjusted");
                fetchPayments();
                if (refreshData) refreshData();
            } else {
                toast.error(result.error || "Failed to delete payment");
            }
        } catch (error) {
            console.error("Error deleting payment:", error);
            toast.error("An error occurred during deletion");
        }
    };

    // Filter reference documents based on selected entity
    const filteredReferences = paymentType === 'receipt'
        ? invoices.filter(inv => inv.customer_id === formData.customerId && inv.status !== 'paid')
        : purchases.filter(p => p.vendor_id === formData.vendorId && p.status !== 'paid');

    const filteredPayments = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return payments.filter((p) => {
            if (!q) return true;
            const searchStr = `${p.notes} ${p.bank_name} ${p.transaction_id} ${p.customer_name} ${p.vendor_name} ${p.party_name}`.toLowerCase();
            return searchStr.includes(q);
        });
    }, [payments, searchQuery]);

    const getPaymentParty = (p) =>
        p.party_name
        || (isReceiptType(p.payment_type)
            ? (p.customer_name || p.customers?.name || 'Customer')
            : (p.vendor_name || p.vendors?.name || 'Vendor'));

    const paymentFormDialog = (
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogContent className={cn(MOBILE_DIALOG_SHELL, 'max-w-2xl')}>
                <DialogHeader className="shrink-0 px-3 pt-3 sm:px-6 sm:pt-6 pb-2">
                    <DialogTitle>New Financial Transaction</DialogTitle>
                    <DialogDescription>
                        Record a customer receipt or vendor payment.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto overscroll-contain px-3 py-4 pb-6 sm:px-6">
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button
                            type="button"
                            className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${paymentType === 'receipt' ? 'bg-white shadow-sm text-wine' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => {
                                setPaymentType('receipt');
                                setFormData(prev => ({ ...prev, referenceType: 'invoice', referenceId: '' }));
                            }}
                        >
                            <ArrowDownLeft className="w-4 h-4" />
                            Customer Receipt
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${paymentType === 'payment' ? 'bg-white shadow-sm text-wine' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => {
                                setPaymentType('payment');
                                setFormData(prev => ({ ...prev, referenceType: 'purchase', referenceId: '' }));
                            }}
                        >
                            <ArrowUpRight className="w-4 h-4" />
                            Vendor Payment
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{paymentType === 'receipt' ? 'Customer' : 'Vendor'}</Label>
                            <Combobox
                                options={paymentType === 'receipt'
                                    ? customers.map(c => ({ value: String(c.id), label: c.name, description: c.phone || c.email || '' }))
                                    : vendors.map(v => ({ value: String(v.id), label: v.name, description: v.city || v.phone || '' }))
                                }
                                value={String(paymentType === 'receipt' ? formData.customerId : formData.vendorId) || ''}
                                onChange={(val) => setFormData({
                                    ...formData,
                                    [paymentType === 'receipt' ? 'customerId' : 'vendorId']: val,
                                    referenceId: ''
                                })}
                                placeholder={`Search ${paymentType === 'receipt' ? 'customers' : 'vendors'}...`}
                                emptyText={`No ${paymentType === 'receipt' ? 'customers' : 'vendors'} found`}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={formData.paymentDate}
                                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Amount ({currency})</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Mode</Label>
                            <Select
                                value={formData.paymentMode}
                                onValueChange={(val) => setFormData({ ...formData, paymentMode: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="bank">Bank Transfer</SelectItem>
                                    <SelectItem value="cheque">Cheque</SelectItem>
                                    <SelectItem value="online">Online Payment</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Reference (Optional)</Label>
                        <Combobox
                            options={[
                                { value: 'none', label: 'No Reference', description: '' },
                                ...filteredReferences.map(doc => ({
                                    value: String(doc.id),
                                    label: doc.invoice_number || doc.purchase_number || String(doc.id),
                                    description: formatCurrency(doc.grand_total || doc.total_amount, currency)
                                }))
                            ]}
                            value={String(formData.referenceId || 'none')}
                            onChange={(val) => setFormData({ ...formData, referenceId: val === 'none' ? '' : val })}
                            placeholder={`Link to ${paymentType === 'receipt' ? 'Invoice' : 'Purchase Order'}`}
                            emptyText="No outstanding documents found"
                        />
                    </div>

                    {(formData.paymentMode === 'bank' || formData.paymentMode === 'cheque') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Bank Name</Label>
                                <Input
                                    placeholder="HBL / UBL / etc"
                                    value={formData.bankName}
                                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{formData.paymentMode === 'cheque' ? 'Cheque #' : 'Transaction ID'}</Label>
                                <Input
                                    placeholder="Reference number"
                                    value={formData.paymentMode === 'cheque' ? formData.chequeNumber : formData.transactionId}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        [formData.paymentMode === 'cheque' ? 'chequeNumber' : 'transactionId']: e.target.value
                                    })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Input
                            placeholder="Optional transaction notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <Button
                        className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleCreatePayment}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <RefreshCcw className="w-4 h-4 animate-spin" />
                                Processing...
                            </div>
                        ) : 'Save Transaction'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );

    return (
        <div className="min-w-0 space-y-4 overflow-x-hidden touch-manipulation lg:space-y-6">
            <MobileTabHeader
                icon={Wallet}
                iconClassName="bg-wine/10 text-wine"
                title="Finance & Payments"
                subtitle={`${payments.length} transactions`}
                actions={[
                    { id: 'refresh', label: 'Refresh', icon: RefreshCcw, onClick: fetchPayments },
                ]}
            />

            <MobileStatStrip
                layout="grid"
                items={[
                    {
                        label: 'Receipts',
                        value: formatCurrency(
                            payments.filter((p) => isReceiptType(p.payment_type)).reduce((sum, p) => sum + Number(p.amount), 0),
                            currency
                        ),
                        valueTone: 'text-emerald-600',
                    },
                    {
                        label: 'Payments',
                        value: formatCurrency(
                            payments.filter((p) => !isReceiptType(p.payment_type)).reduce((sum, p) => sum + Number(p.amount), 0),
                            currency
                        ),
                        valueTone: 'text-red-600',
                    },
                    { label: 'Count', value: payments.length },
                ]}
            />

            <div className="hidden flex-col gap-4 md:flex-row md:items-center md:justify-between lg:flex">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Finance & Payments</h2>
                    <p className="text-muted-foreground">Manage customer receipts, vendor payments and financial history.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={fetchPayments}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>

                    <Button
                        className="bg-wine font-bold text-white shadow-lg shadow-wine/20 hover:bg-wine/90"
                        onClick={() => setShowPaymentDialog(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Record Transaction
                    </Button>
                </div>
            </div>

            <div className="hidden grid-cols-1 gap-6 duration-500 animate-in fade-in slide-in-from-top-2 md:grid-cols-3 lg:grid">
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-100 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-semibold text-emerald-700 uppercase tracking-widest">Total Receipts</CardTitle>
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                            <ArrowDownLeft className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold text-emerald-700 tracking-tight">
                            {formatCurrency(
                                payments.filter(p => isReceiptType(p.payment_type)).reduce((sum, p) => sum + Number(p.amount), 0),
                                currency
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-100 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-semibold text-red-700 uppercase tracking-widest">Total Payments</CardTitle>
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-inner">
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold text-red-700 tracking-tight">
                            {formatCurrency(
                                payments.filter(p => !isReceiptType(p.payment_type)).reduce((sum, p) => sum + Number(p.amount), 0),
                                currency
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-brand-50 to-brand-100/50 border-brand-100 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-semibold text-brand-primary uppercase tracking-widest">Net Cash Flow</CardTitle>
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-primary shadow-inner">
                            <RefreshCcw className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold text-brand-primary tracking-tight">
                            {formatCurrency(
                                payments.reduce((sum, p) => sum + (isReceiptType(p.payment_type) ? Number(p.amount) : -Number(p.amount)), 0),
                                currency
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="hidden lg:block">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-500" />
                        Transaction History
                    </CardTitle>
                    <CardDescription>A chronological record of all financial inflows and outflows.</CardDescription>
                </CardHeader>
                <CardContent>
                    {payments.length === 0 ? (
                        <div className="text-center py-16 px-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                                <Receipt className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 mb-1 tracking-tight">No Transactions Yet</h3>
                            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">Record your first customer receipt or vendor payment to start tracking your cash flow.</p>
                            <Button onClick={() => setShowPaymentDialog(true)} className="bg-wine hover:bg-wine/90 text-white rounded-xl shadow-lg shadow-wine/20 font-bold px-6">
                                <Plus className="w-4 h-4 mr-2" />
                                Record First Transaction
                            </Button>
                        </div>
                    ) : (
                        <DataTable
                            searchable={true}
                            exportable={true}
                            category="retail-shop"
                            data={payments.filter(p => {
                                const searchStr = `${p.notes} ${p.bank_name} ${p.transaction_id} ${p.customer_name} ${p.vendor_name}`.toLowerCase();
                                return searchStr.includes(searchQuery.toLowerCase());
                            }).map(p => ({
                                ...p,
                                formatted_amount: formatCurrency(p.amount, currency),
                                entity: p.party_name
                                    || (isReceiptType(p.payment_type)
                                        ? (p.customer_name || p.customers?.name || 'Customer')
                                        : (p.vendor_name || p.vendors?.name || 'Vendor')),
                                source: p.source || 'legacy',
                                date_formatted: new Date(p.payment_date).toLocaleDateString()
                            }))}
                            columns={[
                                {
                                    accessorKey: 'payment_date',
                                    header: 'Date',
                                    cell: ({ row }) => row.original.date_formatted
                                },
                                {
                                    accessorKey: 'payment_type',
                                    header: 'Type',
                                    cell: ({ row }) => (
                                        <Badge className={isReceiptType(row.original.payment_type) ? 'bg-emerald-100 text-emerald-700 border-emerald-200 font-bold' : 'bg-red-100 text-red-700 border-red-200 font-bold'}>
                                            {getPaymentTypeLabel(row.original.payment_type)}
                                        </Badge>
                                    )
                                },
                                {
                                    accessorKey: 'entity',
                                    header: 'Party',
                                    cell: ({ row }) => <span className="font-bold text-gray-700">{row.original.entity}</span>
                                },
                                {
                                    accessorKey: 'payment_mode',
                                    header: 'Mode',
                                    cell: ({ row }) => <span className="capitalize text-gray-600 font-medium">{row.original.payment_mode}</span>
                                },
                                {
                                    accessorKey: 'formatted_amount',
                                    header: 'Amount',
                                    cell: ({ row }) => (
                                        <span className={`font-semibold ${isReceiptType(row.original.payment_type) ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {row.original.formatted_amount}
                                        </span>
                                    )
                                },
                                {
                                    accessorKey: 'notes',
                                    header: 'Notes',
                                    cell: ({ row }) => <span className="text-gray-500 text-xs">{row.original.notes || '-'}</span>
                                },
                                {
                                    accessorKey: 'actions',
                                    header: 'Actions',
                                    cell: ({ row }) => (
                                        row.original.source === 'invoice_payment' ? (
                                            <span className="text-[10px] text-gray-400 font-medium">Invoice pay</span>
                                        ) : (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                                            onClick={() => handleDeletePayment(row.original.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        )
                                    )
                                }
                            ]}
                        />
                    )}
                </CardContent>
            </Card>

            <div className="pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:hidden">
                <HubEntityMobileList
                    items={filteredPayments}
                    search={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Search transactions..."
                    emptyIcon={Receipt}
                    emptyTitle="No transactions yet"
                    emptySubtitle="Record receipts and vendor payments"
                    emptyActionLabel="Record transaction"
                    onEmptyAction={() => setShowPaymentDialog(true)}
                    getKey={(p) => p.id}
                    renderIcon={(p) => (
                        isReceiptType(p.payment_type)
                            ? <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
                            : <ArrowUpRight className="h-5 w-5 text-red-600" />
                    )}
                    getTitle={(p) => getPaymentParty(p)}
                    getSubtitle={(p) => `${new Date(p.payment_date).toLocaleDateString()} · ${p.payment_mode || 'cash'}`}
                    getAmount={(p) => formatCurrency(p.amount, currency)}
                    getAmountClassName={(p) => (isReceiptType(p.payment_type) ? 'text-emerald-600' : 'text-red-600')}
                    renderBadge={(p) => (
                        <Badge className={cn('text-[10px] font-semibold', isReceiptType(p.payment_type) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                            {getPaymentTypeLabel(p.payment_type)}
                        </Badge>
                    )}
                    getActions={(p) =>
                        p.source === 'invoice_payment'
                            ? []
                            : [{ id: 'delete', icon: Trash2, label: 'Delete transaction', destructive: true, onClick: () => handleDeletePayment(p.id) }]
                    }
                />
            </div>

            <button
                type="button"
                onClick={() => setShowPaymentDialog(true)}
                className={cn(
                    'fixed flex h-14 w-14 items-center justify-center rounded-full bg-wine text-white shadow-lg shadow-wine/30 transition active:scale-95 lg:hidden',
                    MOBILE_MODULE_FAB_RIGHT,
                    MOBILE_BOTTOM_NAV_CLASS,
                    MOBILE_FLOATING_Z
                )}
                aria-label="Record transaction"
            >
                <Plus className="h-6 w-6" />
            </button>

            {paymentFormDialog}
        </div>
    );
}
