'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ShieldAlert, Loader2, Save, X, BookOpen, Layers } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createGLAccountAction, updateGLAccountAction, deleteGLAccountAction, initializeCOAAction } from '@/lib/actions/basic/accounting';
import toast from 'react-hot-toast';

export function ChartOfAccountsManager({ businessId, accounts, onRefresh }) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentAccount, setCurrentAccount] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);

    const initialForm = {
        code: '',
        name: '',
        type: 'asset',
        sub_type: '',
        description: '',
        is_active: true
    };
    const [formData, setFormData] = useState(initialForm);

    const handleEdit = (acc) => {
        setCurrentAccount(acc);
        setFormData({
            code: acc.code,
            name: acc.name,
            type: acc.type,
            sub_type: acc.sub_type || '',
            description: acc.description || '',
            is_active: acc.is_active
        });
        setIsEditing(true);
    };

    const handleAddNew = () => {
        setCurrentAccount(null);
        setFormData(initialForm);
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!formData.code || !formData.name) {
            toast.error('Code and Name are required');
            return;
        }

        setIsLoading(true);
        try {
            const payload = { ...formData, business_id: businessId };
            let res;
            if (currentAccount) {
                res = await updateGLAccountAction(currentAccount.id, payload);
            } else {
                res = await createGLAccountAction(payload);
            }

            if (res.success) {
                toast.success(currentAccount ? 'Account updated' : 'Account created');
                setIsEditing(false);
                onRefresh?.();
            } else {
                toast.error(res.error || 'Failed to save account');
            }
        } catch (e) {
            toast.error(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id, isSystem) => {
        if (isSystem) {
            toast.error('Cannot delete system protected accounts');
            return;
        }
        if (!confirm('Are you sure you want to delete this account? (Must have no transactions)')) return;

        try {
            const res = await deleteGLAccountAction(businessId, id);
            if (res.success) {
                toast.success('Account deleted');
                onRefresh?.();
            } else {
                toast.error(res.error || 'Failed to delete account');
            }
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleInitializeStandardCoa = async () => {
        if (!businessId) return;
        if (!confirm('Add the standard chart of accounts for this business? Existing codes are skipped.')) return;
        setSeeding(true);
        try {
            const res = await initializeCOAAction(businessId);
            if (res.success) {
                toast.success(res.message || 'Chart of accounts initialized');
                onRefresh?.();
            } else {
                toast.error(res.error || 'Failed to initialize');
            }
        } catch (e) {
            toast.error(e.message || 'Failed to initialize');
        } finally {
            setSeeding(false);
        }
    };

    // Grouping for Display
    const grouped = { asset: [], liability: [], equity: [], income: [], expense: [] };
    accounts.forEach(acc => {
        if (grouped[acc.type]) grouped[acc.type].push(acc);
        else grouped['asset'].push(acc);
    });

    return (
        <div className="min-w-0 space-y-4 overflow-x-hidden touch-manipulation">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Chart of Accounts Management</h3>
                <div className="flex flex-wrap items-center gap-2">
                    {accounts.length === 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={seeding}
                            onClick={handleInitializeStandardCoa}
                            className="rounded-xl h-8 px-3 font-bold text-xs border-brand-200 dark:border-brand-800 text-brand-primary dark:text-brand-400"
                        >
                            {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5 mr-1" />}
                            Standard COA
                        </Button>
                    )}
                    <Button onClick={handleAddNew} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-8 px-4 font-bold text-xs shadow-lg shadow-emerald-500/20">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Account
                    </Button>
                </div>
            </div>

            {accounts.length === 0 && !isEditing && (
                <div className="rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-300">
                    <span className="font-bold">No GL accounts yet.</span>{' '}
                    Use <strong>Standard COA</strong> to load the default chart, or add accounts manually.
                </div>
            )}

            {isEditing && (
                <Card className="border border-emerald-100 dark:border-emerald-900/30 bg-white dark:bg-slate-950 shadow-md">
                    <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/10 pb-4 border-b border-emerald-100 dark:border-emerald-900/30">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
                                {currentAccount ? 'Edit Account' : 'New GL Account'}
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)} className="h-6 w-6">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-600 dark:text-gray-400">Account Code *</Label>
                            <Input className="bg-white dark:bg-slate-900 border-gray-250 dark:border-slate-800 text-gray-900 dark:text-gray-100" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} disabled={currentAccount?.is_system} placeholder="e.g. 1010" />
                            {currentAccount?.is_system && <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold"><ShieldAlert className="inline w-3 h-3 mr-1"/>System Code</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-600 dark:text-gray-400">Account Name *</Label>
                            <Input className="bg-white dark:bg-slate-900 border-gray-250 dark:border-slate-800 text-gray-900 dark:text-gray-100" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Bank Account" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-600 dark:text-gray-400">Primary Type *</Label>
                            <select 
                                value={formData.type} 
                                onChange={e => setFormData({ ...formData, type: e.target.value })} 
                                disabled={currentAccount?.is_system}
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input dark:border-slate-800 bg-background dark:bg-slate-900 text-foreground dark:text-gray-100 px-3 py-2 text-sm ring-offset-background"
                            >
                                <option value="asset">Asset</option>
                                <option value="liability">Liability</option>
                                <option value="equity">Equity</option>
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-600 dark:text-gray-400">Sub-Type</Label>
                            <Input className="bg-white dark:bg-slate-900 border-gray-250 dark:border-slate-800 text-gray-900 dark:text-gray-100" value={formData.sub_type} onChange={e => setFormData({ ...formData, sub_type: e.target.value })} disabled={currentAccount?.is_system} placeholder="e.g. current_asset" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-xs font-bold text-gray-600 dark:text-gray-400">Description</Label>
                            <Input className="bg-white dark:bg-slate-900 border-gray-250 dark:border-slate-800 text-gray-900 dark:text-gray-100" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Account usage details" />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Account
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-3">
                {['asset', 'liability', 'equity', 'income', 'expense'].map(type => {
                    const typeAccounts = grouped[type];
                    if (!typeAccounts || typeAccounts.length === 0) return null;
                    return (
                        <div key={type} className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="bg-gray-50 dark:bg-slate-900/50 px-4 py-2 border-b border-gray-200 dark:border-slate-800 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <h4 className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 tracking-wider flex-1">{type}s</h4>
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-800">{typeAccounts.length}</span>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-slate-800/60">
                                {typeAccounts.sort((a,b) => a.code.localeCompare(b.code)).map(acc => (
                                    <div key={acc.id} className="flex items-center gap-2 p-3 transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-900/10 group">
                                        <div className="w-14 shrink-0 font-mono text-xs font-bold text-gray-500 dark:text-gray-400 sm:w-16">{acc.code}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{acc.name}</span>
                                                {acc.is_system && <span className="text-[10px] uppercase tracking-widest font-semibold bg-brand-50 dark:bg-brand-950/30 text-brand-primary dark:text-brand-400 px-1.5 py-0.5 rounded-sm">System</span>}
                                                {!acc.is_active && <span className="text-[10px] uppercase tracking-widest font-semibold bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-sm">Inactive</span>}
                                            </div>
                                            {acc.description && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{acc.description}</p>}
                                        </div>
                                        <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 dark:text-gray-500 hover:text-brand-primary dark:hover:text-brand-light" onClick={() => handleEdit(acc)}>
                                                <Edit2 className="w-3 h-3" />
                                            </Button>
                                            {!acc.is_system && (
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400" onClick={() => handleDelete(acc.id, acc.is_system)}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
