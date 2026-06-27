'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    UserCog, Play, FileText, DollarSign, Users, Calendar, Download,
    ChevronRight, Building2, CreditCard, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function PayrollDashboard({
    businessId,
    employees = [],
    payrollRuns = [],
    onProcessPayroll,
    onViewPayslips,
    onAddEmployee,
    currency = 'Rs.'
}) {
    const [showRunDialog, setShowRunDialog] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isProcessing, setIsProcessing] = useState(false);

    const activeEmployees = employees.filter(e => e.status === 'active');
    const totalBaseSalary = activeEmployees.reduce((sum, e) => sum + (parseFloat(e.base_salary) || 0), 0);
    const lastRun = payrollRuns[0];

    const handleRunPayroll = async () => {
        setIsProcessing(true);
        try {
            await onProcessPayroll?.({
                businessId,
                month: selectedMonth,
                year: selectedYear,
            });
            setShowRunDialog(false);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Active Employees</p>
                                <p className="text-2xl font-semibold text-gray-900 mt-1">{activeEmployees.length}</p>
                            </div>
                            <div className="p-2.5 bg-brand-50 rounded-lg">
                                <Users className="w-5 h-5 text-brand-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Monthly Gross</p>
                                <p className="text-2xl font-semibold text-gray-900 mt-1">{currency}{totalBaseSalary.toLocaleString()}</p>
                            </div>
                            <div className="p-2.5 bg-emerald-50 rounded-lg">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Last Run Net</p>
                                <p className="text-2xl font-semibold text-brand-primary mt-1">
                                    {lastRun ? `${currency}${(parseFloat(lastRun.total_net) || 0).toLocaleString()}` : '--'}
                                </p>
                            </div>
                            <div className="p-2.5 bg-brand-50 rounded-lg">
                                <CreditCard className="w-5 h-5 text-brand-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Total Runs</p>
                                <p className="text-2xl font-semibold text-gray-900 mt-1">{payrollRuns.length}</p>
                            </div>
                            <div className="p-2.5 bg-wine-50 rounded-lg">
                                <Calendar className="w-5 h-5 text-wine-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                <Button
                    onClick={() => setShowRunDialog(true)}
                    className="bg-gradient-to-r from-brand-primary to-brand-primary hover:from-brand-primary-dark hover:to-brand-primary-dark rounded-xl text-xs font-bold shadow-lg shadow-brand-primary/20"
                >
                    <Play className="w-4 h-4 mr-1" /> Run Payroll
                </Button>
                <Button variant="outline" onClick={onAddEmployee} className="rounded-xl text-xs font-bold">
                    <UserCog className="w-4 h-4 mr-1" /> Add Employee
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Employee Roster */}
                <Card className="lg:col-span-2 border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold">Employee Roster</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100">
                            {activeEmployees.map(emp => (
                                <div key={emp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-dark flex items-center justify-center text-white font-bold text-xs">
                                        {emp.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{emp.full_name}</p>
                                        <p className="text-[10px] text-gray-400">{emp.department || '--'} * {emp.designation || '--'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900">{currency}{(parseFloat(emp.base_salary) || 0).toLocaleString()}</p>
                                        <p className="text-[10px] text-gray-400">{emp.employee_code}</p>
                                    </div>
                                    <Badge variant={emp.tax_filer ? 'default' : 'secondary'} className="text-[10px]">
                                        {emp.tax_filer ? 'Filer' : 'Non-Filer'}
                                    </Badge>
                                </div>
                            ))}
                            {activeEmployees.length === 0 && (
                                <div className="py-12 text-center text-gray-400">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No employees registered</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Past Runs */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold">Payroll History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100">
                            {payrollRuns.map(run => (
                                <button
                                    key={run.id}
                                    onClick={() => onViewPayslips?.(run.id)}
                                    className="flex items-center gap-3 px-4 py-3 w-full hover:bg-gray-50 transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-900">{run.run_number}</p>
                                        <p className="text-[10px] text-gray-400">{run.period_month}/{run.period_year} * {run.employee_count} staff</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-semibold text-gray-900">{currency}{(parseFloat(run.total_net) || 0).toLocaleString()}</p>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                            ))}
                            {payrollRuns.length === 0 && (
                                <div className="py-8 text-center text-gray-400">
                                    <Calendar className="w-6 h-6 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs">No payroll runs yet</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Run Payroll Dialog */}
            <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <Play className="w-5 h-5 text-brand-primary" /> Run Payroll
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-700">Month</label>
                                <Input
                                    type="number"
                                    min={1} max={12}
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-700">Year</label>
                                <Input
                                    type="number"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-brand-50 border border-brand-100">
                            <p className="text-xs text-brand-primary-dark">
                                <strong>{activeEmployees.length}</strong> employees will be processed.
                                Estimated gross: <strong>{currency}{totalBaseSalary.toLocaleString()}</strong>
                            </p>
                        </div>
                        <Button
                            onClick={handleRunPayroll}
                            disabled={isProcessing}
                            className="w-full bg-brand-primary hover:bg-brand-primary-dark font-bold"
                        >
                            {isProcessing ? 'Processing...' : 'Process Payroll'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

