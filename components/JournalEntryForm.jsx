'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Plus, Trash2, Save, Loader2, BookOpen, AlertTriangle, CheckCircle2, Scale, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { useBusiness } from '@/lib/context/BusinessContext';
import { formatCurrency } from '@/lib/currency';
import { createJournalAction, getGLAccountsAction } from '@/lib/actions/basic/accounting';
import toast from 'react-hot-toast';
import { showActionError, formatValidationErrors, isValidationError } from '@/lib/utils/formErrorHandler';
import { journalEntrySchema, validateWithSchema } from '@/lib/validation/schemas';

// --- Quick templates for common journal entries ------------------------------
const JOURNAL_TEMPLATES = [
    {
        label: 'Depreciation', description: 'Monthly depreciation expense', entries: [
            { type: 'debit', account_hint: 'depreciation_expense', amount: 0 },
            { type: 'credit', account_hint: 'accumulated_depreciation', amount: 0 }
        ]
    },
    {
        label: 'Salary Accrual', description: 'Accrue monthly salaries', entries: [
            { type: 'debit', account_hint: 'salary_expense', amount: 0 },
            { type: 'credit', account_hint: 'salary_payable', amount: 0 }
        ]
    },
    {
        label: 'Opening Balance', description: 'Set up initial account balances', entries: [
            { type: 'debit', account_hint: 'cash', amount: 0 },
            { type: 'credit', account_hint: 'owner_equity', amount: 0 }
        ]
    },
    {
        label: 'Tax Payment', description: 'Record tax payment to FBR', entries: [
            { type: 'debit', account_hint: 'tax_payable', amount: 0 },
            { type: 'credit', account_hint: 'bank', amount: 0 }
        ]
    },
];

export function JournalEntryForm({ onClose, onSave }) {
    const { business, currency } = useBusiness();
    const [isSaving, setIsSaving] = useState(false);
    const [glAccounts, setGlAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [searchFilter, setSearchFilter] = useState('');

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        reference: '',
        entries: [
            { id: Date.now(), account_id: '', account_name: '', type: 'debit', amount: 0 },
            { id: Date.now() + 1, account_id: '', account_name: '', type: 'credit', amount: 0 },
        ]
    });

    // Load GL Accounts
    useEffect(() => {
        async function loadAccounts() {
            if (!business?.id) return;
            try {
                const result = await getGLAccountsAction(business.id);
                if (result.success) {
                    setGlAccounts(result.accounts || []);
                }
            } catch (err) {
                console.error('Failed to load GL accounts:', err);
            } finally {
                setLoadingAccounts(false);
            }
        }
        loadAccounts();
    }, [business?.id]);

    // Calculate totals
    const totals = useMemo(() => {
        const totalDebit = formData.entries
            .filter(e => e.type === 'debit')
            .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const totalCredit = formData.entries
            .filter(e => e.type === 'credit')
            .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const difference = Math.abs(totalDebit - totalCredit);
        const isBalanced = difference < 0.01 && totalDebit > 0;
        return { totalDebit, totalCredit, difference, isBalanced };
    }, [formData.entries]);

    // Group accounts by type for the selector
    const groupedAccounts = useMemo(() => {
        const groups = {};
        glAccounts.forEach(acc => {
            const type = acc.account_type || 'Other';
            if (!groups[type]) groups[type] = [];
            groups[type].push(acc);
        });
        return groups;
    }, [glAccounts]);

    const addEntry = (type = 'debit') => {
        setFormData(prev => ({
            ...prev,
            entries: [
                ...prev.entries,
                { id: Date.now() + Math.random(), account_id: '', account_name: '', type, amount: 0 }
            ]
        }));
    };

    const removeEntry = (id) => {
        if (formData.entries.length <= 2) {
            toast.error('Minimum 2 entries required for a journal');
            return;
        }
        setFormData(prev => ({
            ...prev,
            entries: prev.entries.filter(e => e.id !== id)
        }));
    };

    const updateEntry = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            entries: prev.entries.map(e => {
                if (e.id !== id) return e;
                const updated = { ...e, [field]: value };
                if (field === 'account_id' && value) {
                    const account = glAccounts.find(a => a.id === value);
                    if (account) updated.account_name = account.account_name || account.name || '';
                }
                return updated;
            })
        }));
    };

    const applyTemplate = (template) => {
        setFormData(prev => ({
            ...prev,
            description: template.description,
            entries: template.entries.map((e, i) => ({
                id: Date.now() + i,
                account_id: '',
                account_name: '',
                type: e.type,
                amount: e.amount
            }))
        }));
        toast.success(`Template "${template.label}" applied`);
    };

    const handleSave = async () => {
        // Schema validation
        const schemaData = {
            businessId: business?.id,
            date: formData.date,
            description: formData.description,
            referenceType: formData.reference ? 'manual' : null,
            referenceNumber: formData.reference || null,
            entries: formData.entries.map(e => ({
                account_id: e.account_id || undefined,
                debit: e.type === 'debit' ? parseFloat(e.amount) || 0 : 0,
                credit: e.type === 'credit' ? parseFloat(e.amount) || 0 : 0,
            }))
        };
        const validation = validateWithSchema(journalEntrySchema, schemaData);
        if (!validation.success) {
            const firstError = Object.values(validation.errors)[0];
            toast.error(firstError || 'Please fix validation errors');
            return;
        }

        // Additional business logic checks
        if (!totals.isBalanced) {
            toast.error('Journal entry must be balanced (Debits = Credits)');
            return;
        }
        if (formData.entries.some(e => !e.account_id)) {
            toast.error('All entries must have a GL account selected');
            return;
        }

        setIsSaving(true);
        try {
            // [HARDENED] Call atomic action instead of looping in the UI
            const result = await createJournalAction({
                businessId: business?.id,
                date: formData.date,
                description: formData.description,
                referenceNumber: formData.reference,
                entries: formData.entries.map(e => ({
                    account_id: e.account_id,
                    debit: e.type === 'debit' ? parseFloat(e.amount) || 0 : 0,
                    credit: e.type === 'credit' ? parseFloat(e.amount) || 0 : 0,
                }))
            });

            if (!result.success) {
                // Handle validation errors separately
                if (isValidationError(result)) {
                    const fieldErrors = formatValidationErrors(result);
                    toast.error('Please fix validation errors');
                    return;
                }
                
                // Show user-friendly error message
                showActionError(result);
                return;
            }

            toast.success('Journal entry posted successfully');
            onSave?.();
            onClose?.();
        } catch (error) {
            console.error('Journal entry error:', error);
            toast.error(`Failed to post: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const debitEntries = formData.entries.filter(e => e.type === 'debit');
    const creditEntries = formData.entries.filter(e => e.type === 'credit');

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto overscroll-contain">
            <Card className="w-full max-w-5xl max-h-[min(95vh,calc(100dvh-1rem))] my-auto overflow-hidden flex flex-col min-h-0 shadow-2xl border-none rounded-3xl">
                {/* Header */}
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b p-4 sm:p-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-semibold uppercase tracking-tighter">Journal Entry</CardTitle>
                            <p className="text-xs font-bold text-emerald-300/70 uppercase tracking-widest mt-1">
                                {business?.name} * Double-Entry Posting
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Balance Indicator */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest ${totals.isBalanced
                                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40'
                                : 'bg-red-500/20 text-red-300 ring-1 ring-red-400/40 animate-pulse'
                            }`}>
                            {totals.isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            {totals.isBalanced ? 'BALANCED' : `OFF BY ${formatCurrency(totals.difference, currency)}`}
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-white/50 hover:text-white">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 min-h-0 overflow-y-auto bg-gray-50/50 p-3 space-y-4 sm:p-6 sm:space-y-6">
                    {/* Header Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Journal Date *</Label>
                            <Input
                                type="date"
                                className="h-12 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Description / Narration *</Label>
                            <Input
                                placeholder="e.g. Monthly depreciation entry for office equipment"
                                className="h-12 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Quick Templates */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Quick Templates</Label>
                        <div className="flex flex-wrap gap-2">
                            {JOURNAL_TEMPLATES.map((tpl, i) => (
                                <button
                                    key={i}
                                    onClick={() => applyTemplate(tpl)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all text-xs font-bold text-gray-600 hover:text-emerald-700 shadow-sm"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    {tpl.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Journal Lines -- Split Debit / Credit */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* DEBIT Column */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <Label className="text-sm font-semibold text-gray-900 uppercase tracking-tighter">Debit</Label>
                                    <Badge variant="outline" className="rounded-full px-2 h-5 text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                                        {formatCurrency(totals.totalDebit, currency)}
                                    </Badge>
                                </div>
                                <Button onClick={() => addEntry('debit')} size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold px-3">
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {debitEntries.map(entry => (
                                    <div key={entry.id} className="flex gap-2 items-start bg-white p-3 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow group">
                                        <div className="flex-1 space-y-2">
                                            <Combobox
                                                options={glAccounts.map(acc => ({
                                                    value: String(acc.id),
                                                    label: `${acc.account_code ? `${acc.account_code} -- ` : ''}${acc.account_name || acc.name}`,
                                                    description: acc.account_type || 'Other'
                                                }))}
                                                value={String(entry.account_id || '')}
                                                onChange={(val) => updateEntry(entry.id, 'account_id', val)}
                                                placeholder="Search GL accounts..."
                                                emptyText="No accounts found"
                                                className="h-10"
                                            />
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                className="h-10 text-right font-bold text-blue-700 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                value={entry.amount || ''}
                                                onChange={(e) => updateEntry(entry.id, 'amount', e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 mt-1"
                                            onClick={() => removeEntry(entry.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CREDIT Column */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                    <Label className="text-sm font-semibold text-gray-900 uppercase tracking-tighter">Credit</Label>
                                    <Badge variant="outline" className="rounded-full px-2 h-5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                                        {formatCurrency(totals.totalCredit, currency)}
                                    </Badge>
                                </div>
                                <Button onClick={() => addEntry('credit')} size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold px-3">
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {creditEntries.map(entry => (
                                    <div key={entry.id} className="flex gap-2 items-start bg-white p-3 rounded-xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow group">
                                        <div className="flex-1 space-y-2">
                                            <Combobox
                                                options={glAccounts.map(acc => ({
                                                    value: String(acc.id),
                                                    label: `${acc.account_code ? `${acc.account_code} -- ` : ''}${acc.account_name || acc.name}`,
                                                    description: acc.account_type || 'Other'
                                                }))}
                                                value={String(entry.account_id || '')}
                                                onChange={(val) => updateEntry(entry.id, 'account_id', val)}
                                                placeholder="Search GL accounts..."
                                                emptyText="No accounts found"
                                                className="h-10"
                                            />
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                className="h-10 text-right font-bold text-emerald-700 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                                value={entry.amount || ''}
                                                onChange={(e) => updateEntry(entry.id, 'amount', e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 mt-1"
                                            onClick={() => removeEntry(entry.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Balance Summary */}
                    <div className={`p-6 rounded-2xl border-2 ${totals.isBalanced
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-red-50 border-red-200'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Scale className={`w-8 h-8 ${totals.isBalanced ? 'text-emerald-500' : 'text-red-500'}`} />
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Balance Check</p>
                                    <p className={`text-lg font-semibold ${totals.isBalanced ? 'text-emerald-700' : 'text-red-700'}`}>
                                        {totals.isBalanced ? 'Entry is balanced -- ready to post' : `Difference: ${formatCurrency(totals.difference, currency)}`}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right space-y-1">
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-500 font-bold">Total Debit:</span>
                                    <span className="font-semibold text-blue-700">{formatCurrency(totals.totalDebit, currency)}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-500 font-bold">Total Credit:</span>
                                    <span className="font-semibold text-emerald-700">{formatCurrency(totals.totalCredit, currency)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reference */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Reference / Voucher # (Optional)</Label>
                        <Input
                            placeholder="e.g. JV-2026-001"
                            className="h-12 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 transition-all max-w-md"
                            value={formData.reference}
                            onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                        />
                    </div>
                </CardContent>

                {/* Footer */}
                <div className="p-6 bg-white border-t flex justify-between items-center bg-gray-50/80 backdrop-blur-md flex-shrink-0">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving} className="font-semibold text-xs uppercase tracking-widest text-gray-400 hover:text-gray-900">
                        Cancel & Close
                    </Button>
                    <Button
                        disabled={isSaving || !totals.isBalanced}
                        onClick={handleSave}
                        className="h-12 px-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Post Journal Entry
                    </Button>
                </div>
            </Card>
        </div>
    );
}
