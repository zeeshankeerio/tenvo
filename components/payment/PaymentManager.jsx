'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Plus, Receipt, CreditCard, History, Search, Download, Trash2, Calendar,
    ArrowUpRight, ArrowDownLeft, Filter, RefreshCcw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DataTable } from "@/components/DataTable";
import { paymentAPI } from "@/lib/api/payments";
import { formatCurrency } from "@/lib/currency";

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
            const result = await paymentAPI.getAll(businessId);
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
            const result = await paymentAPI.delete(id);
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Finance & Payments</h2>
                    <p className="text-muted-foreground">Manage customer receipts, vendor payments and financial history.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={fetchPayments}>
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>

                    <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                        <DialogTrigger asChild>
                            <Button className="bg-wine hover:bg-wine/90 text-white font-bold shadow-lg shadow-wine/20">
                                <Plus className="w-4 h-4 mr-2" />
                                Record Transaction
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>New Financial Transaction</DialogTitle>
                                <DialogDescription>
                                    Record a customer receipt or vendor payment.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-6 py-4">
                                <div className="flex p-1 bg-gray-100 rounded-xl">
                                    <button
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

                                <div className="grid grid-cols-2 gap-4">
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

                                <div className="grid grid-cols-2 gap-4">
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
                                    <div className="grid grid-cols-2 gap-4">
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
                                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
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
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-500">
                <Card className="bg-green-50/50 border-green-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-600 uppercase tracking-wider">Total Receipts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">
                            {formatCurrency(
                                payments.filter(p => p.payment_type === 'receipt').reduce((sum, p) => sum + Number(p.amount), 0),
                                currency
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-red-50/50 border-red-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600 uppercase tracking-wider">Total Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">
                            {formatCurrency(
                                payments.filter(p => p.payment_type === 'payment').reduce((sum, p) => sum + Number(p.amount), 0),
                                currency
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 uppercase tracking-wider">Net Cash Flow</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">
                            {formatCurrency(
                                payments.reduce((sum, p) => sum + (p.payment_type === 'receipt' ? Number(p.amount) : -Number(p.amount)), 0),
                                currency
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-500" />
                        Transaction History
                    </CardTitle>
                    <CardDescription>A chronological record of all financial inflows and outflows.</CardDescription>
                </CardHeader>
                <CardContent>
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
                            entity: p.payment_type === 'receipt' ? (p.customer?.name || 'Customer') : (p.vendor?.name || 'Vendor'),
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
                                    <Badge className={row.original.payment_type === 'receipt' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                        {row.original.payment_type === 'receipt' ? 'Receipt' : 'Payment'}
                                    </Badge>
                                )
                            },
                            {
                                accessorKey: 'entity',
                                header: 'Party'
                            },
                            {
                                accessorKey: 'payment_mode',
                                header: 'Mode',
                                cell: ({ row }) => <span className="capitalize">{row.original.payment_mode}</span>
                            },
                            {
                                accessorKey: 'formatted_amount',
                                header: 'Amount',
                                cell: ({ row }) => (
                                    <span className={`font-bold ${row.original.payment_type === 'receipt' ? 'text-green-600' : 'text-red-600'}`}>
                                        {row.original.formatted_amount}
                                    </span>
                                )
                            },
                            {
                                accessorKey: 'notes',
                                header: 'Notes'
                            },
                            {
                                accessorKey: 'actions',
                                header: 'Actions',
                                cell: ({ row }) => (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDeletePayment(row.original.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )
                            }
                        ]}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
