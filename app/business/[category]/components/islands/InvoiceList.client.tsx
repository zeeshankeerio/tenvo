'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, FileText, CreditCard, AlertCircle, CheckCircle2, Clock, Eye, Upload, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { DataTable } from '@/components/DataTable';
import { cn } from '@/lib/utils';
import type { Invoice } from '@/types';
import { BulkImportModal } from '@/components/invoice/BulkImportModal';
import { BulkDeleteConfirmModal } from '@/components/invoice/BulkDeleteConfirmModal';
import { MobileTabHeader, MobileStatStrip } from '@/components/mobile/MobileTabHeader';

interface InvoiceListProps {
    invoices: Invoice[];
    currency?: string;
    onInvoiceDelete?: (id: string) => Promise<void>;
    onEdit?: (invoice: Invoice) => void;
    onAdd?: () => void;
    onView?: (invoice: Invoice) => void;
    onRecordPayment?: (invoice: Invoice) => void;
    onBulkDelete?: (ids: string[]) => Promise<void>;
    onBulkImport?: (invoices: any[]) => Promise<void>;
    onExport?: (data: any[]) => void;
    category?: string;
    colors?: any;
}

export function InvoiceList({
    invoices,
    currency = 'PKR',
    onInvoiceDelete,
    onEdit,
    onAdd,
    onView,
    onRecordPayment,
    onBulkDelete,
    onBulkImport,
    onExport,
    category = 'retail-shop',
    colors = { primary: '#10B981' }
}: InvoiceListProps) {
    // Modals state
    const [showImportModal, setShowImportModal] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [selectedForBulkDelete, setSelectedForBulkDelete] = useState<Invoice[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // Enhanced stats with payment tracking
    const stats = useMemo(() => {
        const now = new Date();
        const totals = invoices.reduce((acc, inv) => {
            const total = Number(inv.grand_total) || 0;
            // Balance is calculated from invoice_payments (will be available via API)
            const balance = (inv as any).balance || total;
            const paid = total - balance;

            acc.total += 1;
            acc.totalAmount += total;
            acc.totalPaid += paid;
            acc.totalBalance += balance;

            // Payment status
            if (inv.payment_status === 'paid' || inv.status === 'paid') {
                acc.paid += 1;
            } else if (inv.payment_status === 'partial' || (paid > 0 && paid < total)) {
                acc.partial += 1;
            } else {
                acc.unpaid += 1;
            }

            // Overdue calculation
            if (inv.due_date && inv.status !== 'paid' && inv.status !== 'voided') {
                const dueDate = new Date(inv.due_date);
                const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysOverdue > 0) {
                    acc.overdue += 1;
                    if (daysOverdue <= 30) acc.aging1_30 += balance;
                    else if (daysOverdue <= 60) acc.aging31_60 += balance;
                    else if (daysOverdue <= 90) acc.aging61_90 += balance;
                    else acc.agingOver90 += balance;
                }
            }

            // Status counts
            if (inv.status === 'draft') acc.draft += 1;
            if (inv.status === 'sent') acc.sent += 1;

            return acc;
        }, {
            total: 0,
            paid: 0,
            partial: 0,
            unpaid: 0,
            overdue: 0,
            draft: 0,
            sent: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalBalance: 0,
            aging1_30: 0,
            aging31_60: 0,
            aging61_90: 0,
            agingOver90: 0
        });

        return totals;
    }, [invoices]);

    // Handle bulk delete from DataTable
    const handleBulkDelete = (items: any[]) => {
        const invoicesToDelete = items.filter(item => item.id);
        if (invoicesToDelete.length === 0) return;
        
        setSelectedForBulkDelete(invoicesToDelete);
        setShowBulkDeleteModal(true);
    };

    // Confirm bulk delete
    const confirmBulkDelete = async () => {
        if (!onBulkDelete || selectedForBulkDelete.length === 0) return;
        
        setIsBulkDeleting(true);
        try {
            const ids = selectedForBulkDelete.map(inv => inv.id);
            await onBulkDelete(ids);
            setShowBulkDeleteModal(false);
            setSelectedForBulkDelete([]);
        } catch (error) {
            console.error('Bulk delete failed:', error);
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // Handle export
    const handleExport = (data?: any[]) => {
        if (!onExport) return;
        
        // If data provided, export selected rows, otherwise export all
        const exportData = data || invoices;
        onExport(exportData);
    };

    const getPaymentStatusBadge = (invoice: Invoice) => {
        const total = Number(invoice.grand_total) || 0;
        const balance = Number((invoice as any).balance) || total;
        const paid = total - balance;
        const percentage = total > 0 ? Math.round((paid / total) * 100) : 0;

        if (invoice.payment_status === 'paid' || invoice.status === 'paid' || percentage >= 100) {
            return (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Paid
                </Badge>
            );
        }

        if (invoice.payment_status === 'partial' || (paid > 0 && paid < total)) {
            return (
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                    <CreditCard className="w-3 h-3 mr-1" />
                    {percentage}% Paid
                </Badge>
            );
        }

        if (invoice.due_date && new Date(invoice.due_date) < new Date()) {
            return (
                <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Overdue
                </Badge>
            );
        }

        return (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                <Clock className="w-3 h-3 mr-1" />
                Unpaid
            </Badge>
        );
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
            case 'draft':
                return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
            case 'sent':
                return <Badge className="bg-blue-100 text-blue-800">Sent</Badge>;
            case 'partial':
                return <Badge className="bg-purple-100 text-purple-800">Partial</Badge>;
            case 'awaiting_approval':
                return <Badge className="bg-amber-100 text-amber-800">Awaiting Approval</Badge>;
            case 'overdue':
                return <Badge className="bg-orange-100 text-orange-800">Overdue</Badge>;
            case 'voided':
                return <Badge className="bg-red-100 text-red-800">Voided</Badge>;
            case 'cancelled':
                return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
            default:
                return <Badge className="bg-yellow-100 text-yellow-800">{status?.replace(/_/g, ' ')}</Badge>;
        }
    };

    const calculateAging = (invoice: Invoice) => {
        if (!invoice.due_date || invoice.status === 'paid' || invoice.status === 'voided') {
            return null;
        }

        const dueDate = new Date(invoice.due_date);
        const now = new Date();
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) return null;

        let color = 'text-gray-600';
        let label = `${daysOverdue}d overdue`;

        if (daysOverdue > 90) {
            color = 'text-red-600 font-bold';
            label = '90+ days overdue';
        } else if (daysOverdue > 60) {
            color = 'text-red-500';
            label = '60-90 days overdue';
        } else if (daysOverdue > 30) {
            color = 'text-orange-500';
            label = '30-60 days overdue';
        } else {
            color = 'text-amber-500';
            label = '1-30 days overdue';
        }

        return <span className={cn("text-xs", color)}>{label}</span>;
    };

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Mobile, compact header + stat strip */}
            <MobileTabHeader
                icon={FileText}
                iconClassName="bg-emerald-100 text-emerald-600"
                title="Sales & Invoicing"
                subtitle={`${stats.total} invoices · ${formatCurrency(stats.totalBalance, currency as any)} outstanding`}
                primaryAction={{
                    label: 'New',
                    icon: Plus,
                    className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
                    onClick: () => onAdd?.(),
                }}
                actions={[
                    ...(onBulkImport
                        ? [{ id: 'import', label: 'Import', icon: Upload, onClick: () => setShowImportModal(true) }]
                        : []),
                    ...(onExport
                        ? [{ id: 'export', label: 'Export', icon: Download, onClick: () => handleExport() }]
                        : []),
                ]}
            />

            <MobileStatStrip
                items={[
                    { label: 'Total', value: stats.total, hint: formatCurrency(stats.totalAmount, currency as any) },
                    { label: 'Paid', value: stats.paid, valueTone: 'text-green-600', hint: formatCurrency(stats.totalPaid, currency as any), hintTone: 'text-green-600' },
                    { label: 'Partial', value: stats.partial, valueTone: 'text-blue-600', hint: `${stats.total > 0 ? Math.round((stats.partial / stats.total) * 100) : 0}%`, hintTone: 'text-blue-600' },
                    { label: 'Unpaid', value: stats.unpaid, valueTone: 'text-amber-600', hint: formatCurrency(stats.totalBalance, currency as any), hintTone: 'text-amber-600' },
                    { label: 'Overdue', value: stats.overdue, valueTone: 'text-red-600', alert: stats.overdue > 0, hint: formatCurrency(stats.aging1_30 + stats.aging31_60 + stats.aging61_90 + stats.agingOver90, currency as any), hintTone: 'text-red-600' },
                    { label: 'Draft', value: stats.draft },
                ]}
            />

            {/* Desktop header */}
            <div className="hidden items-center justify-between lg:flex">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                        <FileText className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Sales & Invoicing</h2>
                        <p className="text-muted-foreground">
                            {stats.total} invoices • {formatCurrency(stats.totalBalance, currency as any)} outstanding
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onBulkImport && (
                        <Button
                            variant="outline"
                            onClick={() => setShowImportModal(true)}
                            className="h-10 px-4"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Import
                        </Button>
                    )}
                    {onExport && (
                        <Button
                            variant="outline"
                            onClick={() => handleExport()}
                            className="h-10 px-4"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    )}
                    <Button
                        onClick={() => onAdd?.()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-10 px-5 shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Invoice
                    </Button>
                </div>
            </div>

            {/* Desktop stats */}
            <div className="hidden grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7 lg:grid">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <div className="text-xs text-muted-foreground">
                            {formatCurrency(stats.totalAmount, currency as any)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-green-600">Paid</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
                        <div className="text-xs text-green-600">
                            {formatCurrency(stats.totalPaid, currency as any)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-blue-600">Partial</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.partial}</div>
                        <div className="text-xs text-blue-600">
                            {stats.total > 0 ? Math.round((stats.partial / stats.total) * 100) : 0}%
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-amber-600">Unpaid</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{stats.unpaid}</div>
                        <div className="text-xs text-amber-600">
                            {formatCurrency(stats.totalBalance, currency as any)}
                        </div>
                    </CardContent>
                </Card>

                <Card className={stats.overdue > 0 ? 'border-red-200' : ''}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-red-600">Overdue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                        <div className="text-xs text-red-600">
                            {formatCurrency(stats.aging1_30 + stats.aging31_60 + stats.aging61_90 + stats.agingOver90, currency as any)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-gray-600">Draft</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-purple-600">Sent</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{stats.sent}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Aging Summary (if there are overdue invoices) */}
            {stats.overdue > 0 && (
                <Card className="border-red-200 bg-red-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-red-700 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Aging Summary - Outstanding Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">1-30 days:</span>
                                <div className="font-semibold text-amber-600">{formatCurrency(stats.aging1_30, currency as any)}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground">31-60 days:</span>
                                <div className="font-semibold text-orange-600">{formatCurrency(stats.aging31_60, currency as any)}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground">61-90 days:</span>
                                <div className="font-semibold text-red-500">{formatCurrency(stats.aging61_90, currency as any)}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground">90+ days:</span>
                                <div className="font-semibold text-red-600">{formatCurrency(stats.agingOver90, currency as any)}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Invoice Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Invoices</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Manage and track your invoices
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        category={category}
                        data={invoices.map(inv => ({
                            ...inv,
                            customer_name: (inv as any).customer_name || inv.customer?.name || 'Walk-in Customer',
                            grand_total_formatted: formatCurrency(Number(inv.grand_total || inv.amount || 0), currency as any),
                            balance_formatted: formatCurrency(Number((inv as any).balance || inv.grand_total || 0), currency as any)
                        }))}
                        onExport={handleExport}
                        onBulkDelete={onBulkDelete ? handleBulkDelete : undefined}
                                                columns={[
                            {
                                accessorKey: 'invoice_number',
                                header: 'Invoice #',
                                cell: ({ row }: any) => (
                                    <div className="font-medium">{row.original.invoice_number}</div>
                                )
                            },
                            {
                                accessorKey: 'customer_name',
                                header: 'Customer',
                                cell: ({ row }: any) => (
                                    <div>
                                        <div>{row.original.customer_name}</div>
                                        {calculateAging(row.original)}
                                    </div>
                                )
                            },
                            {
                                accessorKey: 'date',
                                header: 'Date',
                                cell: ({ row }: any) => new Date(row.original.date).toLocaleDateString()
                            },
                            {
                                accessorKey: 'due_date',
                                header: 'Due Date',
                                cell: ({ row }: any) => (
                                    row.original.due_date 
                                        ? new Date(row.original.due_date).toLocaleDateString()
                                        : '-'
                                )
                            },
                            {
                                accessorKey: 'grand_total',
                                header: 'Total',
                                cell: ({ row }: any) => (
                                    <div className="text-right">
                                        <div className="font-bold" style={{ color: colors.primary }}>
                                            {row.original.grand_total_formatted}
                                        </div>
                                        {row.original.balance !== undefined && row.original.balance < row.original.grand_total && (
                                            <div className="text-xs text-green-600">
                                                Paid: {formatCurrency(Number(row.original.grand_total) - Number(row.original.balance), currency as any)}
                                            </div>
                                        )}
                                    </div>
                                )
                            },
                            {
                                accessorKey: 'payment_status',
                                header: 'Payment',
                                cell: ({ row }: any) => getPaymentStatusBadge(row.original)
                            },
                            {
                                accessorKey: 'status',
                                header: 'Status',
                                cell: ({ row }: any) => getStatusBadge(row.original.status)
                            },
                            {
                                id: 'actions',
                                header: 'Actions',
                                cell: ({ row }: any) => (
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onView?.(row.original)}
                                            className="h-8 w-8 text-gray-600 hover:text-gray-800"
                                            title="View"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        {(row.original.payment_status !== 'paid' && row.original.status !== 'voided') && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onRecordPayment?.(row.original)}
                                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                                                title="Record Payment"
                                            >
                                                <CreditCard className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onEdit?.(row.original)}
                                            className="h-8 w-8 text-brand-primary hover:text-brand-primary-dark"
                                            title="Edit"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onInvoiceDelete?.(row.original.id)}
                                            className="h-8 w-8 text-red-600 hover:text-red-700"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )
                            }
                        ]}
                    />
                </CardContent>
            </Card>

            {/* Bulk Import Modal */}
            {onBulkImport && (
                <BulkImportModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onImport={onBulkImport}
                    currency={currency}
                />
            )}

            {/* Bulk Delete Confirmation Modal */}
            <BulkDeleteConfirmModal
                isOpen={showBulkDeleteModal}
                onClose={() => setShowBulkDeleteModal(false)}
                onConfirm={confirmBulkDelete}
                selectedCount={selectedForBulkDelete.length}
                selectedInvoices={selectedForBulkDelete}
                isLoading={isBulkDeleting}
            />
        </div>
    );
}
