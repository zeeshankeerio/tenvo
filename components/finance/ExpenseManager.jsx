'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Receipt, Plus, Calendar, DollarSign, TrendingUp, TrendingDown,
    Filter, Download, Pencil, Trash2, ChevronDown, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ExpenseEntryForm } from '@/components/ExpenseEntryForm';

const EXPENSE_CATEGORIES = [
    { value: 'rent', label: 'Rent & Utilities', color: 'bg-brand-50 text-brand-primary' },
    { value: 'salary', label: 'Salaries & Wages', color: 'bg-wine-100 text-wine-700' },
    { value: 'supplies', label: 'Office Supplies', color: 'bg-amber-100 text-amber-700' },
    { value: 'transport', label: 'Transport', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'marketing', label: 'Marketing', color: 'bg-pink-100 text-pink-700' },
    { value: 'maintenance', label: 'Maintenance', color: 'bg-orange-100 text-orange-700' },
    { value: 'taxes', label: 'Taxes & Filing', color: 'bg-red-100 text-red-700' },
    { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700' },
];

export function ExpenseManager({ businessId, expenses = [], onCreateExpense, onDeleteExpense, currency = 'Rs.', vendors = [] }) {
    const [showForm, setShowForm] = useState(false);
    const [filterCategory, setFilterCategory] = useState('all');

    const filtered = filterCategory === 'all'
        ? expenses
        : expenses.filter(e => e.category === filterCategory);

    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const thisMonth = expenses
        .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const breakdown = EXPENSE_CATEGORIES.map(cat => ({
        ...cat,
        total: expenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0),
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);


    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-none shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500 font-medium">Total Expenses</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">{currency}{totalExpenses.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500 font-medium">This Month</p>
                        <p className="text-2xl font-semibold text-red-600 mt-1">{currency}{thisMonth.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500 font-medium">Top Category</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{breakdown[0]?.label || '--'}</p>
                        <p className="text-xs text-gray-400">{currency}{(breakdown[0]?.total || 0).toLocaleString()}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[180px] h-9 text-xs rounded-xl">
                            <Filter className="w-3 h-3 mr-2" />
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {EXPENSE_CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => setShowForm(true)} className="rounded-xl text-xs font-bold bg-brand-primary hover:bg-brand-primary-dark shadow-lg shadow-brand-primary/20">
                    <Plus className="w-4 h-4 mr-1" /> Record Expense
                </Button>
            </div>

            {/* Category Breakdown Bar */}
            {breakdown.length > 0 && (
                <Card className="border-none shadow-sm">
                    <CardContent className="p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Breakdown</p>
                        {breakdown.map(cat => (
                            <div key={cat.value} className="flex items-center gap-3">
                                <Badge className={cn('text-[10px] px-2', cat.color)}>{cat.label}</Badge>
                                <div className="flex-1 bg-gray-100 rounded-full h-2">
                                    <div
                                        className="bg-brand-primary h-2 rounded-full transition-all"
                                        style={{ width: `${Math.min((cat.total / totalExpenses) * 100, 100)}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-gray-700 w-24 text-right">{currency}{cat.total.toLocaleString()}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Expense List */}
            <Card className="border-none shadow-sm">
                <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                        {filtered.map((expense, idx) => {
                            const cat = EXPENSE_CATEGORIES.find(c => c.value === expense.category);
                            return (
                                <motion.div
                                    key={expense.id || idx}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                >
                                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', cat?.color || 'bg-gray-100 text-gray-500')}>
                                        <Receipt className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{expense.description}</p>
                                        <p className="text-[10px] text-gray-400">{expense.date} * {cat?.label || expense.category}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-red-600">{currency}{parseFloat(expense.amount).toLocaleString()}</span>
                                </motion.div>
                            );
                        })}
                        {filtered.length === 0 && (
                            <div className="py-12 text-center text-gray-400">
                                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No expenses recorded</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {showForm && (
                <ExpenseEntryForm
                    vendors={vendors}
                    onClose={() => setShowForm(false)}
                    onSave={() => onCreateExpense?.()}
                />
            )}
        </div>
    );
}

