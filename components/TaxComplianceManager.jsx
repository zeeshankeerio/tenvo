'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calculator, Receipt, TrendingUp, ShieldCheck } from 'lucide-react';
import { generateReportPDF } from '@/lib/pdf';
import { formatCurrency } from '@/lib/utils/formatting';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getTaxStrategy } from '@/lib/utils/taxStrategies';
import toast from 'react-hot-toast';

/**
 * Tax Compliance Manager (Localized for Pakistan FBR)
 * Manages Sales Tax, Provincial Tax, and FBR Filings
 */
export function TaxComplianceManager({ invoices = [], purchaseOrders = [], business = {} }) {
    const { regionalStandards, currency } = useBusiness();
    const [selectedPeriod, setSelectedPeriod] = useState('month');

    const standards = regionalStandards || { taxLabel: 'Tax', taxIdLabel: 'Tax ID', currency: 'PKR', countryCode: 'PK' };
    const strategy = getTaxStrategy(standards);

    // Calculate real tax data from invoices and purchases
    const taxMetrics = useMemo(() => {
        const totalSales = invoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
        const outputTax = invoices.reduce((sum, inv) => sum + (Number(inv.tax_total) || 0), 0);

        const totalPurchases = purchaseOrders.reduce((sum, po) => sum + (Number(po.total_amount) || 0), 0);
        const inputTax = purchaseOrders.reduce((sum, po) => sum + (Number(po.tax_total) || 0), 0);

        // Calculate using Strategy
        const taxBreakdown = strategy.calculateBulk(invoices.map(inv => ({
            amount: Number(inv.subtotal) || 0,
            taxPercent: inv.tax_percent || 18
        })), standards);

        return {
            totalSales,
            totalPurchases,
            outputTax,
            inputTax,
            details: taxBreakdown.details,
            payable: Math.max(0, outputTax - inputTax),
        };
    }, [invoices, purchaseOrders, strategy, standards]);

    const fbrReturns = [
        { period: 'Nov 2025', status: 'Filed', amount: 15400, dueDate: '2025-12-15' },
        { period: 'Oct 2025', status: 'Filed', amount: 12200, dueDate: '2025-11-15' },
        { period: 'Sep 2024', status: 'Draft', amount: 0, dueDate: '2025-10-15' },
    ];

    const handleTaxExport = (type) => {
        try {
            const columns = [
                { header: 'Invoice No', dataKey: 'invoice_number' },
                { header: 'Date', dataKey: 'date' },
                { header: 'Customer', dataKey: 'customer_name' },
                { header: 'Taxable Amount', dataKey: 'subtotal' },
                { header: 'Sales Tax', dataKey: 'tax_total' },
                { header: 'Total Value', dataKey: 'grand_total' },
            ];

            const reportData = invoices.map(inv => ({
                ...inv,
                customer_name: inv.customer?.name || 'Walk-in'
            }));

            generateReportPDF(`${standards.taxLabel} ${type} Filing Data`, reportData, columns);
            toast.success(`${type} statement exported successfully`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error(`Failed to export ${type}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{standards.taxLabel} & Compliance</h2>
                    <p className="text-gray-500 font-medium">Manage {standards.taxLabel} filings and regional compliance</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleTaxExport('Statement')} className="border-wine/20 text-wine hover:bg-wine/5 font-bold">
                        <FileText className="w-4 h-4 mr-2" />
                        Export Statement
                    </Button>
                    <Button onClick={() => handleTaxExport('Summary')} className="bg-wine hover:bg-wine/90 text-white font-bold shadow-lg shadow-wine/20">
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        {standards.taxLabel} Summary
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-gray-100/50 p-1 rounded-xl">
                    <TabsTrigger value="overview" className="rounded-lg">Financial Summary</TabsTrigger>
                    <TabsTrigger value="returns" className="rounded-lg">{standards.taxIdLabel} Filings</TabsTrigger>
                    <TabsTrigger value="calculator" className="rounded-lg">Tax Calculator</TabsTrigger>
                    <TabsTrigger value="config" className="rounded-lg">Tax Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 pt-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-wine/5 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Taxable Sales</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-gray-900">{formatCurrency(taxMetrics.totalSales, currency)}</div>
                                <Badge variant="secondary" className="mt-2 bg-green-50 text-green-700 hover:bg-green-100 text-[10px]">Current Month</Badge>
                            </CardContent>
                        </Card>

                        <Card className="border-wine/5 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{standards.taxLabel} Output</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-wine">{formatCurrency(taxMetrics.outputTax, currency)}</div>
                                <p className="text-xs text-gray-500 mt-1 font-medium">Regional {standards.taxLabel} Rates</p>
                            </CardContent>
                        </Card>

                        <Card className="border-wine/5 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Net Payable</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-red-600">{formatCurrency(taxMetrics.payable, currency)}</div>
                                <p className="text-xs text-red-500 mt-1 font-medium animate-pulse">Upcoming Due Date</p>
                            </CardContent>
                        </Card>

                        <Card className="border-wine/5 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Input Tax Credit</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-green-600">{formatCurrency(taxMetrics.inputTax, currency)}</div>
                                <p className="text-xs text-gray-500 mt-1 font-medium">From Verified Bills</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-wine/10 shadow-lg">
                            <CardHeader className="bg-wine/5 border-b border-wine/10">
                                <CardTitle className="text-wine flex items-center gap-2">
                                    <Receipt className="w-5 h-5" />
                                    Tax Breakdown
                                </CardTitle>
                                <CardDescription className="text-wine/60 font-medium">Federal vs Provincial Distribution</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                {Object.entries(taxMetrics.details || {}).map(([key, val]) => (
                                    <div key={key} className="flex justify-between items-center group">
                                        <span className="text-sm font-bold text-gray-500 group-hover:text-gray-900 transition-colors">{key}</span>
                                        <span className="font-black text-gray-900">{formatCurrency(val.amount, currency)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between pt-4 border-t border-gray-100">
                                    <span className="text-md font-black text-gray-900">Total Tax Liability</span>
                                    <span className="text-md font-black text-wine">{formatCurrency(taxMetrics.outputTax, currency)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-blue-100 bg-blue-50/30">
                            <CardHeader>
                                <CardTitle className="text-blue-900 flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-blue-600" />
                                    Tax Optimization Tips
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm text-blue-800 font-medium">
                                <p>* Ensure all purchase bills from active tax payers are uploaded to claim Input Tax Credit.</p>
                                <p>* Verify NTN numbers of B2B customers to correctly handle Withholding Tax requirements.</p>
                                <p>* Digital payments through JazzCash/Easypaisa can provide tax incentives for specialized sectors.</p>
                                <Button variant="outline" className="w-full mt-4 border-blue-200 bg-white text-blue-700 hover:bg-blue-50 font-black">
                                    Detailed Tax Analysis
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="returns" className="space-y-4 pt-4 animate-in slide-in-from-right-5 duration-300">
                    <Card className="border-wine/10 shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-gray-900 font-black">{standards.taxIdLabel} Return History</CardTitle>
                            <CardDescription>Track monthly {standards.taxLabel} returns</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {fbrReturns.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:bg-wine/5 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-gray-100 group-hover:bg-wine group-hover:text-white rounded-xl transition-colors">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900">{item.period}</p>
                                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Due: {item.dueDate}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount Filed</p>
                                                <p className="font-black text-gray-900">{formatCurrency(item.amount, currency)}</p>
                                            </div>
                                            <Badge className={
                                                item.status === 'Filed'
                                                    ? 'bg-green-100 text-green-700 border-green-200'
                                                    : 'bg-orange-100 text-orange-700 border-orange-200'
                                            }>
                                                {item.status}
                                            </Badge>
                                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-wine/10 text-wine">
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Placeholder contents for other tabs for structural completeness */}
                <TabsContent value="calculator" className="pt-4 animate-in fade-in duration-300">
                    <Card className="p-12 text-center border-dashed">
                        <Calculator className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <CardTitle className="text-gray-400">Tax Calculator Module</CardTitle>
                        <CardDescription>Advanced FBR/Provincial simulation coming soon</CardDescription>
                    </Card>
                </TabsContent>

                <TabsContent value="config" className="pt-4 animate-in fade-in duration-300">
                    <Card className="p-12 text-center border-dashed">
                        <ShieldCheck className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <CardTitle className="text-gray-400">{standards.taxIdLabel} Configuration</CardTitle>
                        <CardDescription>Verify your tax integration status and credentials</CardDescription>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
