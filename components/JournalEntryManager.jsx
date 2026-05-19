'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, Loader2, AlertCircle, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { accountingAPI } from '@/lib/api/accounting';
import toast from 'react-hot-toast';
import { Combobox } from '@/components/ui/combobox';

/**
 * @param {Object} props
 * @param {string} props.businessId
 * @param {() => void} [props.onSuccess]
 * @param {any} [props.colors]
 */
export default function JournalEntryManager({ businessId, onSuccess, colors }) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [accounts, setAccounts] = useState([]);

    const [entry, setEntry] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        lines: [
            { id: 1, accountId: '', debit: 0, credit: 0 },
            { id: 2, accountId: '', debit: 0, credit: 0 }
        ]
    });

    useEffect(() => {
        loadAccounts();
    }, [businessId]);

    const loadAccounts = async () => {
        try {
            setLoading(true);
            const res = await accountingAPI.getAccounts(businessId);
            if (res.success) {
                setAccounts(res.accounts);
            } else {
                toast.error('Failed to load accounts');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error loading accounts');
        } finally {
            setLoading(false);
        }
    };

    const addLine = () => {
        setEntry(prev => ({
            ...prev,
            lines: [...prev.lines, { id: Date.now(), accountId: '', debit: 0, credit: 0 }]
        }));
    };

    const removeLine = (id) => {
        if (entry.lines.length <= 2) {
            toast.error('A journal entry must have at least 2 lines');
            return;
        }
        setEntry(prev => ({
            ...prev,
            lines: prev.lines.filter(l => l.id !== id)
        }));
    };

    const updateLine = (id, field, value) => {
        setEntry(prev => ({
            ...prev,
            lines: prev.lines.map(l => {
                if (l.id === id) {
                    const updated = { ...l, [field]: value };

                    // Logic: If entering Debit, clear Credit and vice versa
                    if (field === 'debit' && parseFloat(String(value)) > 0) updated.credit = 0;
                    if (field === 'credit' && parseFloat(String(value)) > 0) updated.debit = 0;

                    return updated;
                }
                return l;
            })
        }));
    };

    const totals = useMemo(() => {
        const debit = entry.lines.reduce((sum, l) => sum + (parseFloat(String(l.debit)) || 0), 0);
        const credit = entry.lines.reduce((sum, l) => sum + (parseFloat(String(l.credit)) || 0), 0);
        return { debit, credit, diff: Math.abs(debit - credit) };
    }, [entry.lines]);

    const isBalanced = totals.diff < 0.01 && totals.debit > 0;

    const handleSubmit = async () => {
        if (!entry.description) return toast.error('Please enter a description');
        if (entry.lines.some(l => !l.accountId)) return toast.error('Please select an account for all lines');
        if (!isBalanced) return toast.error('Entry is not balanced');

        try {
            setSubmitting(true);
            const res = await accountingAPI.createEntry({
                businessId,
                date: entry.date,
                description: entry.description,
                entries: entry.lines.map(l => ({
                    accountId: l.accountId,
                    debit: parseFloat(String(l.debit)) || 0,
                    credit: parseFloat(String(l.credit)) || 0
                }))
            });

            if (res.success) {
                toast.success('Journal Entry Saved');
                setEntry({
                    date: new Date().toISOString().split('T')[0],
                    description: '',
                    lines: [
                        { id: Date.now(), accountId: '', debit: 0, credit: 0 },
                        { id: Date.now() + 1, accountId: '', debit: 0, credit: 0 }
                    ]
                });
                onSuccess?.();
            } else {
                toast.error(res.error || 'Failed to save entry');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error saving entry');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" /></div>;

    if (accounts.length === 0) {
        return (
            <Card className="border-none shadow-none">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Accounting Not Setup</h3>
                        <p className="text-gray-500 max-w-sm mt-2">To start recording transactions, we need to initialize your Chart of Accounts (COA).</p>
                    </div>
                    <Button
                        onClick={async () => {
                            setSubmitting(true);
                            try {
                                const res = await accountingAPI.initCOA(businessId);
                                if (res.success) {
                                    toast.success('Chart of Accounts Initialized');
                                    loadAccounts();
                                } else {
                                    toast.error('Failed to initialize COA');
                                }
                            } catch (e) {
                                toast.error('Error initializing COA');
                            } finally {
                                setSubmitting(false);
                            }
                        }}
                        disabled={submitting}
                        className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                        style={{ backgroundColor: colors?.primary }}
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Initialize Accounting System
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const accountOptions = accounts.map(a => ({
        value: a.id,
        label: `${a.code} - ${a.name}`,
        description: a.type
    }));

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    New Journal Entry
                </CardTitle>
                <CardDescription>Record manual adjustments to the general ledger.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
                {/* Header Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" value={entry.date} onChange={e => setEntry({ ...entry, date: e.target.value })} className="bg-gray-50/50" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <Label>Description / Narration</Label>
                        <Input
                            placeholder="e.g. Depreciation Adjustment for Jan 2026"
                            value={entry.description}
                            onChange={e => setEntry({ ...entry, description: e.target.value })}
                            className="bg-gray-50/50"
                        />
                    </div>
                </div>

                {/* Lines Table */}
                <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 font-medium text-gray-500 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left w-[40%]">Account</th>
                                <th className="px-4 py-3 text-right w-[20%]">Debit</th>
                                <th className="px-4 py-3 text-right w-[20%]">Credit</th>
                                <th className="px-4 py-3 text-center w-[10%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {entry.lines.map((line, index) => (
                                <tr key={line.id} className="hover:bg-gray-50/30">
                                    <td className="px-4 py-2">
                                        <Combobox
                                            options={accountOptions}
                                            value={line.accountId}
                                            onChange={val => updateLine(line.id, 'accountId', val)}
                                            placeholder="Select Account"
                                            className="w-full border-none shadow-none bg-transparent"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <Input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            placeholder="0.00"
                                            value={line.debit || ''}
                                            onChange={e => updateLine(line.id, 'debit', e.target.value)}
                                            className="text-right border-gray-100 bg-transparent focus:bg-white transition-colors"
                                            disabled={Number(line.credit) > 0}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <Input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            placeholder="0.00"
                                            value={line.credit || ''}
                                            onChange={e => updateLine(line.id, 'credit', e.target.value)}
                                            className="text-right border-gray-100 bg-transparent focus:bg-white transition-colors"
                                            disabled={Number(line.debit) > 0}
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeLine(line.id)}
                                            className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50/80 font-bold border-t">
                            <tr>
                                <td className="px-4 py-3">
                                    <Button variant="outline" size="sm" onClick={addLine} className="border-dashed text-gray-500 hover:text-blue-600 hover:border-blue-300">
                                        <Plus className="w-3.5 h-3.5 mr-2" />
                                        Add Line
                                    </Button>
                                </td>
                                <td className={`px-4 py-3 text-right ${totals.debit !== totals.credit ? 'text-red-500' : 'text-gray-900'}`}>
                                    {formatCurrency(totals.debit, 'PKR')}
                                </td>
                                <td className={`px-4 py-3 text-right ${totals.debit !== totals.credit ? 'text-red-500' : 'text-gray-900'}`}>
                                    {formatCurrency(totals.credit, 'PKR')}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Validation & Submit */}
                <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2 text-sm">
                        {totals.diff > 0.01 ? (
                            <span className="flex items-center text-red-600 bg-red-50 px-3 py-1.5 rounded-full font-medium">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                Out of balance by {formatCurrency(totals.diff, 'PKR')}
                            </span>
                        ) : totals.debit > 0 ? (
                            <span className="flex items-center text-green-600 bg-green-50 px-3 py-1.5 rounded-full font-medium">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                Balanced
                            </span>
                        ) : null}
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || totals.diff > 0.01 || totals.debit === 0}
                        className="w-48 font-bold shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                        style={{ backgroundColor: colors?.primary }}
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Post Journal Entry
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
