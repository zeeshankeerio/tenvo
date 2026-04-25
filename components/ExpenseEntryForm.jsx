import { useState, useEffect } from 'react';
import { X, Save, Loader2, DollarSign, Calendar, Tag, CreditCard, User, FileText, Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { useBusiness } from '@/lib/context/BusinessContext';
import { formatCurrency } from '@/lib/currency';
import { createExpenseAction } from '@/lib/actions/basic/expense';
import { getGLAccountsAction } from '@/lib/actions/basic/accounting';
import toast from 'react-hot-toast';
import { showActionError, formatValidationErrors, isValidationError } from '@/lib/utils/formErrorHandler';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import { expenseSchema, validateWithSchema } from '@/lib/validation/schemas';

export function ExpenseEntryForm({
    onClose,
    onSave,
    vendors = [],
    initialData = null,
    category = 'retail-shop'
}) {
    const { business, currency } = useBusiness();
    const { language } = useLanguage();
    const t = translations[language];

    const [isSaving, setIsSaving] = useState(false);
    const [glAccounts, setGlAccounts] = useState([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

    const [formData, setFormData] = useState({
        businessId: business?.id,
        accountId: initialData?.account_id || '',
        category: initialData?.category || '',
        amount: initialData?.amount || 0,
        taxAmount: initialData?.tax_amount || 0,
        vendorId: initialData?.vendor_id || '',
        paymentMethod: initialData?.payment_method || 'cash',
        date: initialData?.date || new Date().toISOString().split('T')[0],
        description: initialData?.description || '',
        receiptUrl: initialData?.receipt_url || ''
    });

    useEffect(() => {
        async function fetchAccounts() {
            if (!business?.id) return;
            try {
                const result = await getGLAccountsAction(business.id);
                if (result.success) {
                    // Filter for expense accounts (type = 'expense')
                    setGlAccounts(result.accounts.filter(a => a.type === 'expense'));
                }
            } catch (error) {
                console.error('Error fetching GL accounts:', error);
                toast.error('Failed to load expense accounts');
            } finally {
                setIsLoadingAccounts(false);
            }
        }
        fetchAccounts();
    }, [business?.id]);

    const handleSave = async (e) => {
        e.preventDefault();

        // Zod schema validation
        const validation = validateWithSchema(expenseSchema, {
            ...formData,
            amount: parseFloat(formData.amount),
            taxAmount: parseFloat(formData.taxAmount || 0)
        });
        if (!validation.success) {
            const firstError = Object.values(validation.errors)[0];
            toast.error(firstError || 'Please fix validation errors');
            return;
        }

        if (!formData.accountId) {
            toast.error('Please select an expense account');
            return;
        }

        setIsSaving(true);
        try {
            const result = await createExpenseAction({
                ...formData,
                amount: parseFloat(formData.amount),
                taxAmount: parseFloat(formData.taxAmount || 0)
            });

            if (result.success) {
                toast.success('Expense recorded successfully');
                onSave?.();
                onClose?.();
            } else {
                // Handle validation errors separately
                if (isValidationError(result)) {
                    const fieldErrors = formatValidationErrors(result);
                    toast.error('Please fix validation errors');
                    return;
                }
                
                // Show user-friendly error message
                showActionError(result);
            }
        } catch (error) {
            console.error('Error saving expense:', error);
            toast.error(`Failed to record expense: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const expenseCategories = [
        'Utilities', 'Rent', 'Salaries', 'Marketing', 'Supplies',
        'Travel', 'Repair & Maintenance', 'Entertainment', 'Others'
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border-none">
                <CardHeader className="flex flex-row items-center justify-between border-b p-6 bg-gradient-to-r from-red-900 to-red-800 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-white/10 text-white ring-1 ring-white/20">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black uppercase tracking-tighter">Record Expense</CardTitle>
                            <p className="text-xs font-bold text-red-200 uppercase tracking-widest mt-1">
                                {business?.name} • Financial Transactions
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-white/50 hover:text-white">
                        <X className="w-5 h-5" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Essential Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Expense Account (GL) *</Label>
                                <Combobox
                                    options={glAccounts.map(a => ({
                                        value: String(a.id),
                                        label: `${a.code} - ${a.name}`,
                                        description: a.type || 'Expense'
                                    }))}
                                    value={String(formData.accountId || '')}
                                    onChange={(val) => setFormData(prev => ({ ...prev, accountId: val }))}
                                    placeholder={isLoadingAccounts ? 'Loading accounts...' : 'Search GL accounts...'}
                                    emptyText="No expense accounts found"
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category Tag</Label>
                                <Combobox
                                    options={expenseCategories.map(c => ({
                                        value: c,
                                        label: c
                                    }))}
                                    value={formData.category || ''}
                                    onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                                    placeholder="Select category..."
                                    emptyText="No categories found"
                                    className="h-12"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Amount ({currency}) *</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="h-12 pl-10 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-red-500 transition-all font-bold text-lg"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                        required
                                    />
                                    <DollarSign className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tax Included (Optional)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    className="h-12 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-red-500 transition-all"
                                    placeholder="0.00"
                                    value={formData.taxAmount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, taxAmount: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Date</Label>
                                <div className="relative">
                                    <Input
                                        type="date"
                                        className="h-12 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-red-500 transition-all"
                                        value={formData.date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                    />
                                    <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Method</Label>
                                <div className="flex gap-2">
                                    {['cash', 'bank', 'credit'].map((method) => (
                                        <Button
                                            key={method}
                                            type="button"
                                            variant={formData.paymentMethod === method ? 'default' : 'outline'}
                                            className={`flex-1 h-12 rounded-xl uppercase text-[10px] font-black tracking-widest transition-all ${formData.paymentMethod === method
                                                    ? 'bg-red-600 hover:bg-red-700 text-white border-none'
                                                    : 'text-gray-400 hover:text-gray-900 border-gray-200'
                                                }`}
                                            onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method }))}
                                        >
                                            <CreditCard className="w-3 h-3 mr-2" />
                                            {method}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Paid to Vendor (Optional)</Label>
                            <Combobox
                                options={vendors.map(v => ({
                                    value: String(v.id),
                                    label: v.name,
                                    description: v.city || v.phone || ''
                                }))}
                                value={String(formData.vendorId || '')}
                                onChange={(val) => setFormData(prev => ({ ...prev, vendorId: val }))}
                                placeholder="Search vendors..."
                                emptyText="No vendors — internal expense"
                                className="h-12"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description / Narrative</Label>
                            <textarea
                                className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500 transition-all outline-none font-medium shadow-sm resize-none text-sm"
                                placeholder="Purpose of this expense..."
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Receipt Attachment</Label>
                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center hover:border-red-500/50 hover:bg-red-50/30 transition-all cursor-pointer group">
                                <div className="p-3 rounded-full bg-gray-50 text-gray-400 group-hover:bg-red-100 group-hover:text-red-500 transition-all mb-2">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Click or drag receipt image here</p>
                                <p className="text-[10px] text-gray-300 mt-1 uppercase">Max 5MB (PNG, JPG, PDF)</p>
                            </div>
                        </div>
                    </form>
                </CardContent>

                <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving} className="font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-900">
                        Discard
                    </Button>
                    <Button
                        disabled={isSaving}
                        onClick={handleSave}
                        className="h-12 px-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Record Expense
                    </Button>
                </div>
            </Card>
        </div>
    );
}
