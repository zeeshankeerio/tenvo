import { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2, DollarSign, Calendar, CreditCard, User, FileText, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { useBusiness } from '@/lib/context/BusinessContext';
import { formatCurrency } from '@/lib/currency';
import { createPaymentAction } from '@/lib/actions/basic/payment';
import { getInvoicesAction } from '@/lib/actions/basic/invoice';
import { getPurchasesAction } from '@/lib/actions/standard/purchase';
import toast from 'react-hot-toast';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import { paymentSchema, validateWithSchema } from '@/lib/validation/schemas';
import { cn } from '@/lib/utils';
import { MOBILE_OVERLAY, MOBILE_OVERLAY_CARD, MOBILE_FORM_FOOTER, MOBILE_GRID_FIELDS } from '@/lib/utils/formMobileStyles';

export function PaymentReceiptForm({
    type = 'receipt', // 'receipt' (Customer) or 'payment' (Vendor)
    onClose,
    onSave,
    customers = [],
    vendors = [],
    initialData = null
}) {
    const { business, currency } = useBusiness();
    const { language } = useLanguage();
    const t = translations[language];

    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [pendingDocs, setPendingDocs] = useState([]);

    const [formData, setFormData] = useState({
        business_id: business?.id,
        payment_type: type === 'receipt' ? 'receipt' : 'payment',
        customer_id: initialData?.customer_id || '',
        vendor_id: initialData?.vendor_id || '',
        amount: initialData?.amount || 0,
        payment_mode: initialData?.payment_mode || 'cash',
        payment_date: initialData?.payment_date || new Date().toISOString().split('T')[0],
        bank_name: initialData?.bank_name || '',
        cheque_number: initialData?.cheque_number || '',
        transaction_id: initialData?.transaction_id || '',
        notes: initialData?.notes || '',
        allocations: []
    });

    // Fetch outstanding documents when entity changes
    useEffect(() => {
        async function fetchDocs() {
            const entityId = type === 'receipt' ? formData.customer_id : formData.vendor_id;
            if (!entityId || !business?.id) {
                setPendingDocs([]);
                return;
            }

            setIsLoadingDocs(true);
            try {
                let result;
                if (type === 'receipt') {
                    result = await getInvoicesAction(business.id);
                    if (result.success) {
                        // Filter for pending/partial invoices of this customer
                        const docs = result.invoices
                            .filter(inv => inv.customer_id === entityId && (inv.status === 'pending' || inv.status === 'partial'))
                            .map(inv => ({
                                id: inv.id,
                                number: inv.invoice_number,
                                date: inv.date,
                                total: parseFloat(inv.grand_total),
                                balance: parseFloat(inv.grand_total) - (parseFloat(inv.paid_amount) || 0), // Assuming schema has paid_amount or we calculate from balance
                                // Note: In schema it was grand_total. We might need to fetch allocations to get real balance.
                                // For simplicity here, we assume total is balance if partial isn't fully tracked in header
                                type: 'invoice'
                            }));
                        setPendingDocs(docs);
                    }
                } else {
                    result = await getPurchasesAction(business.id);
                    if (result.success) {
                        const docs = result.purchases
                            .filter(p => p.vendor_id === entityId && (p.status === 'received' || p.status === 'partial'))
                            .map(p => ({
                                id: p.id,
                                number: p.purchase_number,
                                date: p.date,
                                total: parseFloat(p.total_amount),
                                balance: parseFloat(p.total_amount), // Simplified
                                type: 'purchase'
                            }));
                        setPendingDocs(docs);
                    }
                }
            } catch (error) {
                console.error('Error fetching pending docs:', error);
            } finally {
                setIsLoadingDocs(false);
            }
        }
        fetchDocs();
    }, [formData.customer_id, formData.vendor_id, business?.id, type]);

    const allocatedTotal = useMemo(() => {
        return formData.allocations.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
    }, [formData.allocations]);

    const autoAllocate = () => {
        const totalToAllocate = parseFloat(formData.amount);
        let remaining = totalToAllocate;
        const newAllocations = [];

        // Simple FIFO allocation
        for (const doc of pendingDocs) {
            if (remaining <= 0) break;
            const amount = Math.min(remaining, doc.balance);
            newAllocations.push({
                [doc.type === 'invoice' ? 'invoice_id' : 'purchase_id']: doc.id,
                amount: amount,
                number: doc.number
            });
            remaining -= amount;
        }

        setFormData(prev => ({ ...prev, allocations: newAllocations }));
    };

    const handleAllocationChange = (docId, amount) => {
        const doc = pendingDocs.find(d => d.id === docId);
        const idField = doc?.type === 'invoice' ? 'invoice_id' : 'purchase_id';

        setFormData(prev => {
            const others = prev.allocations.filter(a => a[idField] !== docId);
            if (parseFloat(amount) <= 0) return { ...prev, allocations: others };

            return {
                ...prev,
                allocations: [...others, { [idField]: docId, amount: parseFloat(amount), number: doc.number }]
            };
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Zod schema validation
        const validation = validateWithSchema(paymentSchema, {
            business_id: business?.id,
            amount: parseFloat(formData.amount),
            payment_type: type === 'receipt' ? 'receipt' : 'payment',
            payment_mode: formData.payment_mode || null,
            payment_date: formData.payment_date,
            customer_id: formData.customer_id || null,
            vendor_id: formData.vendor_id || null,
            bank_name: formData.bank_name || null,
            cheque_number: formData.cheque_number || null,
            transaction_id: formData.transaction_id || null,
            notes: formData.notes || null,
        });
        if (!validation.success) {
            const firstError = Object.values(validation.errors)[0];
            toast.error(firstError || 'Please fix validation errors');
            return;
        }

        setIsSaving(true);
        try {
            const result = await createPaymentAction({
                ...formData,
                amount: parseFloat(formData.amount)
            });

            if (result.success) {
                toast.success('Payment recorded successfully');
                onSave?.();
                onClose?.();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error saving payment:', error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const isCustomer = type === 'receipt';

    return (
        <div className={MOBILE_OVERLAY}>
            <Card className={cn(MOBILE_OVERLAY_CARD, 'max-w-4xl')}>
                <CardHeader className={`flex shrink-0 flex-row items-center justify-between border-b px-3 py-3 sm:p-6 bg-gradient-to-r ${isCustomer ? 'from-emerald-900 to-emerald-800' : 'from-blue-900 to-blue-800'} text-white`}>
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <div className="shrink-0 rounded-xl bg-white/10 p-2 text-white ring-1 ring-white/20 sm:rounded-2xl sm:p-3">
                            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="min-w-0">
                            <CardTitle className="truncate text-base font-semibold uppercase tracking-tighter sm:text-2xl">
                                {isCustomer ? 'Customer Receipt' : 'Vendor Payment'}
                            </CardTitle>
                            <p className="mt-0.5 hidden text-xs font-bold uppercase tracking-widest text-emerald-100 sm:block">
                                {business?.name} · Multi-Allocation Vouchers
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-white/50 hover:text-white">
                        <X className="w-5 h-5" />
                    </Button>
                </CardHeader>

                <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-gray-50/30 p-3 sm:space-y-8 sm:p-8">
                    <div className={cn(MOBILE_GRID_FIELDS, 'gap-6 lg:grid-cols-2 lg:gap-12')}>
                        {/* Left Column: Basic Info */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                    {isCustomer ? 'From Customer *' : 'To Vendor *'}
                                </Label>
                                <Combobox
                                    options={(isCustomer ? customers : vendors).map(e => ({
                                        value: String(e.id),
                                        label: e.name,
                                        description: e.city || e.phone || ''
                                    }))}
                                    value={String(isCustomer ? formData.customer_id : formData.vendor_id) || ''}
                                    onChange={(val) => setFormData(prev => ({
                                        ...prev,
                                        [isCustomer ? 'customer_id' : 'vendor_id']: val,
                                        allocations: []
                                    }))}
                                    placeholder={`Search ${isCustomer ? 'customers' : 'vendors'}...`}
                                    emptyText={`No ${isCustomer ? 'customers' : 'vendors'} found`}
                                    className="h-12"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Amount ({currency})</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            className="h-12 pl-10 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 font-semibold text-lg"
                                            value={formData.amount}
                                            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                        />
                                        <DollarSign className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Payment Date</Label>
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            className="h-12 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500"
                                            value={formData.payment_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                                        />
                                        <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Payment Mode</Label>
                                <div className="flex gap-2">
                                    {['cash', 'bank', 'cheque', 'online'].map((mode) => (
                                        <Button
                                            key={mode}
                                            type="button"
                                            variant={formData.payment_mode === mode ? 'default' : 'outline'}
                                            className={`flex-1 h-12 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all ${formData.payment_mode === mode
                                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-lg'
                                                    : 'text-gray-400 border-gray-200 hover:bg-white'
                                                }`}
                                            onClick={() => setFormData(prev => ({ ...prev, payment_mode: mode }))}
                                        >
                                            {mode}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {formData.payment_mode !== 'cash' && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Bank Name</Label>
                                        <Input
                                            className="h-12 border-gray-200 rounded-xl shadow-sm"
                                            placeholder="Standard Chartered..."
                                            value={formData.bank_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                            {formData.payment_mode === 'cheque' ? 'Cheque #' : 'Transaction ID'}
                                        </Label>
                                        <Input
                                            className="h-12 border-gray-200 rounded-xl shadow-sm"
                                            placeholder="Ref #..."
                                            value={formData.payment_mode === 'cheque' ? formData.cheque_number : formData.transaction_id}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                [formData.payment_mode === 'cheque' ? 'cheque_number' : 'transaction_id']: e.target.value
                                            }))}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Notes</Label>
                                <textarea
                                    className="w-full h-24 px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-medium shadow-sm resize-none text-sm"
                                    placeholder="Reference, remarks, etc..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Right Column: Allocation */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Outstanding Documents</Label>
                                    {isLoadingDocs && <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />}
                                </div>
                                <Button
                                    variant="link"
                                    className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 p-0 h-auto"
                                    onClick={autoAllocate}
                                    disabled={!formData.amount || pendingDocs.length === 0}
                                >
                                    Auto-Allocate
                                </Button>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden min-h-[300px] flex flex-col">
                                <div className="flex-1 overflow-y-auto max-h-[400px]">
                                    {pendingDocs.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4 text-gray-300">
                                                <AlertCircle className="w-6 h-6" />
                                            </div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No outstanding {isCustomer ? 'invoices' : 'purchases'} found for this entity</p>
                                        </div>
                                    ) : (
                                        <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:px-0">
                                        <table className="w-full min-w-[480px] text-xs">
                                            <thead className="bg-gray-50 sticky top-0 z-10">
                                                <tr className="border-b">
                                                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-widest text-gray-400">Document</th>
                                                    <th className="px-4 py-3 text-right font-semibold uppercase tracking-widest text-gray-400">Balance</th>
                                                    <th className="px-4 py-3 text-right font-semibold uppercase tracking-widest text-gray-400 w-32">Allocate</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {pendingDocs.map(doc => {
                                                    const idField = doc.type === 'invoice' ? 'invoice_id' : 'purchase_id';
                                                    const currentAlloc = formData.allocations.find(a => a[idField] === doc.id);
                                                    return (
                                                        <tr key={doc.id} className={`hover:bg-emerald-50/30 transition-colors ${currentAlloc ? 'bg-emerald-50/20' : ''}`}>
                                                            <td className="px-4 py-4">
                                                                <p className="font-semibold text-gray-900 uppercase tracking-tighter">#{doc.number}</p>
                                                                <p className="text-[10px] font-bold text-gray-400">{new Date(doc.date).toLocaleDateString()}</p>
                                                            </td>
                                                            <td className="px-4 py-4 text-right">
                                                                <p className="font-bold text-gray-600">{formatCurrency(doc.balance, currency)}</p>
                                                            </td>
                                                            <td className="px-4 py-4 text-right">
                                                                <div className="relative">
                                                                    <Input
                                                                        type="number"
                                                                        className={`h-9 text-right font-bold transition-all ${currentAlloc ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-200'}`}
                                                                        placeholder="0.00"
                                                                        value={currentAlloc?.amount || ''}
                                                                        onChange={(e) => handleAllocationChange(doc.id, e.target.value)}
                                                                    />
                                                                    {currentAlloc && <CheckCircle2 className="absolute -left-2 top-2.5 w-4 h-4 text-emerald-500 fill-white" />}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-1">Allocated Total</p>
                                        <p className={`text-xl font-semibold tracking-tighter ${Math.abs(allocatedTotal - formData.amount) < 0.01 ? 'text-emerald-600' : 'text-gray-900'}`}>
                                            {formatCurrency(allocatedTotal, currency)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant={Math.abs(allocatedTotal - formData.amount) < 0.01 ? 'default' : 'outline'} className={`rounded-full px-2 py-0 h-5 text-[10px] font-semibold uppercase ${Math.abs(allocatedTotal - formData.amount) < 0.01 ? 'bg-emerald-600' : 'text-gray-400 border-gray-200'}`}>
                                            {Math.abs(allocatedTotal - formData.amount) < 0.01 ? 'Fully Allocated' : `${formatCurrency(Math.max(0, formData.amount - allocatedTotal), currency)} Unallocated`}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>

                <div className={cn(MOBILE_FORM_FOOTER, 'bg-white')}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Button variant="ghost" onClick={onClose} disabled={isSaving} className="h-9 text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-900 sm:h-auto">
                            Cancel
                        </Button>
                        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                            <Button
                                disabled={isSaving}
                                variant="outline"
                                className="hidden h-9 rounded-xl border-gray-200 px-4 text-xs font-semibold uppercase tracking-widest hover:bg-gray-50 sm:inline-flex sm:h-12 sm:px-6"
                            >
                                Save as Draft
                            </Button>
                            <Button
                                disabled={isSaving || (formData.amount > 0 && Math.abs(allocatedTotal - formData.amount) > 0.01)}
                                onClick={handleSave}
                                className={`h-9 rounded-xl px-4 text-xs font-semibold uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 sm:h-12 sm:px-10 ${isCustomer ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'} text-white`}
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Process Voucher
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
