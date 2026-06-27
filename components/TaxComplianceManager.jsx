'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calculator, Receipt, ShieldCheck, Loader2 } from 'lucide-react';
import { generateReportPDF, exportToCSV } from '@/lib/pdf';
import { formatCurrency } from '@/lib/utils/formatting';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getTaxStrategy } from '@/lib/utils/taxStrategies';
import {
    filterRecordsByPeriod,
    getTaxPeriodRange,
    buildTaxPeriodSummaries,
} from '@/lib/utils/taxPeriodFilter';
import { getTaxConfigAction, configureTaxAction } from '@/lib/actions/standard/tax';
import toast from 'react-hot-toast';

/**
 * Tax Compliance Manager, regional output/input tax summary, filings, calculator, settings.
 */
export function TaxComplianceManager({ invoices = [], purchaseOrders = [], business = {} }) {
    const { regionalStandards, currency, regionalPack } = useBusiness();
    const standards = regionalStandards || { taxLabel: 'Tax', taxIdLabel: 'Tax ID', currency, countryCode: regionalPack?.countryIso || 'PK' };
    const regionalDefaultRate = standards.defaultTaxRate ?? regionalPack?.defaultTaxRate ?? 0;

    const [calcAmount, setCalcAmount] = useState('');
    const [calcRate, setCalcRate] = useState(String(regionalDefaultRate));
    const [calcType, setCalcType] = useState('exclusive');
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const [savingSettings, setSavingSettings] = useState(false);
    const [loadingConfig, setLoadingConfig] = useState(true);

    const [taxSettings, setTaxSettings] = useState({
        taxId: standards.taxId || business?.ntn || '',
        taxRegion: standards.countryCode === 'PK' ? 'Federal (FBR)' : standards.taxLabel,
        defaultRate: String(regionalDefaultRate),
        filingFrequency: 'monthly',
        filerStatus: 'Non-Filer',
    });

    const strategy = getTaxStrategy(standards);
    const periodMeta = useMemo(() => getTaxPeriodRange(selectedPeriod), [selectedPeriod]);

    const periodInvoices = useMemo(
        () => filterRecordsByPeriod(invoices, 'date', selectedPeriod),
        [invoices, selectedPeriod]
    );
    const periodPurchases = useMemo(
        () => filterRecordsByPeriod(
            purchaseOrders.filter((po) => po.status === 'received' || !po.status),
            'date',
            selectedPeriod
        ),
        [purchaseOrders, selectedPeriod]
    );

    useEffect(() => {
        let cancelled = false;
        async function loadConfig() {
            if (!business?.id) {
                setLoadingConfig(false);
                return;
            }
            setLoadingConfig(true);
            try {
                const result = await getTaxConfigAction(business.id);
                if (!cancelled && result.success && result.config) {
                    const cfg = result.config;
                    setTaxSettings((prev) => ({
                        ...prev,
                        taxId: cfg.gst_number || cfg.ntn_number || prev.taxId,
                        defaultRate: String(cfg.sales_tax_rate ?? cfg.gst_rate ?? prev.defaultRate),
                        filerStatus: cfg.filer_status || prev.filerStatus,
                    }));
                    if (cfg.sales_tax_rate != null) {
                        setCalcRate(String(cfg.sales_tax_rate));
                    }
                }
            } catch (error) {
                console.error('Load tax config error:', error);
            } finally {
                if (!cancelled) setLoadingConfig(false);
            }
        }
        loadConfig();
        return () => { cancelled = true; };
    }, [business?.id]);

    const taxMetrics = useMemo(() => {
        const totalSales = periodInvoices.reduce((sum, inv) => sum + (Number(inv.subtotal ?? inv.grand_total) || 0), 0);
        const outputTax = periodInvoices.reduce((sum, inv) => sum + (Number(inv.tax_total) || 0), 0);
        const totalPurchases = periodPurchases.reduce((sum, po) => sum + (Number(po.subtotal ?? po.total_amount) || 0), 0);
        const inputTax = periodPurchases.reduce((sum, po) => sum + (Number(po.tax_total) || 0), 0);

        const taxBreakdown = strategy.calculateBulk(periodInvoices.map((inv) => ({
            amount: Number(inv.subtotal) || 0,
            taxPercent: inv.tax_percent || Number(taxSettings.defaultRate) || regionalDefaultRate,
        })), standards);

        return {
            totalSales,
            totalPurchases,
            outputTax,
            inputTax,
            details: taxBreakdown.details,
            payable: Math.max(0, outputTax - inputTax),
            invoiceCount: periodInvoices.length,
            purchaseCount: periodPurchases.length,
        };
    }, [periodInvoices, periodPurchases, strategy, standards, taxSettings.defaultRate]);

    const periodReturns = useMemo(
        () => buildTaxPeriodSummaries(invoices, purchaseOrders.filter((po) => po.status === 'received' || !po.status)),
        [invoices, purchaseOrders]
    );

    const formatMoney = (value) => formatCurrency(value, currency);

    const buildSalesExportRows = () => periodInvoices.map((inv) => ({
        invoice_number: inv.invoice_number || '-',
        date: inv.date ? new Date(inv.date).toLocaleDateString() : '-',
        customer_name: inv.customer_name || inv.customer?.name || 'Walk-in',
        subtotal: formatMoney(Number(inv.subtotal) || 0),
        tax_total: formatMoney(Number(inv.tax_total) || 0),
        grand_total: formatMoney(Number(inv.grand_total) || 0),
    }));

    const buildPurchaseExportRows = () => periodPurchases.map((po) => ({
        purchase_number: po.purchase_number || '-',
        date: po.date ? new Date(po.date).toLocaleDateString() : '-',
        vendor_name: po.vendor_name || 'Supplier',
        subtotal: formatMoney(Number(po.subtotal ?? po.total_amount) || 0),
        tax_total: formatMoney(Number(po.tax_total) || 0),
        total_amount: formatMoney(Number(po.total_amount) || 0),
    }));

    const handleTaxExport = (type, format = 'pdf') => {
        try {
            const stamp = periodMeta.label.replace(/\s+/g, '_');
            if (type === 'Purchases') {
                const rows = buildPurchaseExportRows();
                if (rows.length === 0) {
                    toast.error('No purchase records in the selected period');
                    return;
                }
                if (format === 'csv') {
                    exportToCSV(rows, `${standards.taxLabel}_purchase_register_${stamp}`);
                    toast.success('Purchase register exported');
                    return;
                }
                const doc = generateReportPDF(`${standards.taxLabel} Purchase Register, ${periodMeta.label}`, rows, [
                    { label: 'Bill No', key: 'purchase_number' },
                    { label: 'Date', key: 'date' },
                    { label: 'Vendor', key: 'vendor_name' },
                    { label: 'Taxable', key: 'subtotal' },
                    { label: 'Input Tax', key: 'tax_total' },
                    { label: 'Total', key: 'total_amount' },
                ]);
                doc.save(`${standards.taxLabel}_purchase_register_${stamp}.pdf`);
                toast.success('Purchase register exported');
                return;
            }

            const rows = buildSalesExportRows();
            if (rows.length === 0) {
                toast.error('No sales invoices in the selected period');
                return;
            }

            if (format === 'csv') {
                exportToCSV(rows, `${standards.taxLabel}_sales_register_${stamp}`);
                toast.success(`${type} exported successfully`);
                return;
            }

            const summaryRows = [
                { metric: 'Period', value: periodMeta.label },
                { metric: 'Taxable Sales', value: formatMoney(taxMetrics.totalSales) },
                { metric: 'Output Tax', value: formatMoney(taxMetrics.outputTax) },
                { metric: 'Input Tax Credit', value: formatMoney(taxMetrics.inputTax) },
                { metric: 'Net Payable', value: formatMoney(taxMetrics.payable) },
                { metric: 'Invoices', value: String(taxMetrics.invoiceCount) },
                { metric: 'Purchase Bills', value: String(taxMetrics.purchaseCount) },
            ];

            const doc = type === 'Summary'
                ? generateReportPDF(`${standards.taxLabel} Summary, ${periodMeta.label}`, summaryRows, [
                    { label: 'Metric', key: 'metric' },
                    { label: 'Value', key: 'value' },
                ])
                : generateReportPDF(`${standards.taxLabel} Sales Register, ${periodMeta.label}`, rows, [
                    { label: 'Invoice No', key: 'invoice_number' },
                    { label: 'Date', key: 'date' },
                    { label: 'Customer', key: 'customer_name' },
                    { label: 'Taxable', key: 'subtotal' },
                    { label: 'Output Tax', key: 'tax_total' },
                    { label: 'Total', key: 'grand_total' },
                ]);

            doc.save(`${standards.taxLabel}_${type.toLowerCase()}_${stamp}.pdf`);
            toast.success(`${type} exported successfully`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error(`Failed to export ${type}`);
        }
    };

    const handleSaveSettings = async () => {
        if (!business?.id) {
            toast.error('Business context not ready');
            return;
        }
        setSavingSettings(true);
        try {
            const result = await configureTaxAction({
                businessId: business.id,
                ntnNumber: taxSettings.taxId,
                gstNumber: taxSettings.taxId,
                salesTaxRate: parseFloat(taxSettings.defaultRate) || 0,
                gstRate: parseFloat(taxSettings.defaultRate) || 0,
                filerStatus: taxSettings.filerStatus,
            });
            if (result.success) {
                toast.success('Tax configuration saved');
            } else {
                toast.error(result.error || 'Failed to save tax settings');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to save tax settings');
        } finally {
            setSavingSettings(false);
        }
    };

    const calcValues = useMemo(() => {
        const amt = Number(calcAmount) || 0;
        const rate = Number(calcRate) || 0;
        if (calcType === 'exclusive') {
            const tax = amt * (rate / 100);
            return { taxable: amt, tax, total: amt + tax };
        }
        const taxable = amt / (1 + (rate / 100));
        return { taxable, tax: amt - taxable, total: amt };
    }, [calcAmount, calcRate, calcType]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{standards.taxLabel} & Compliance</h2>
                    <p className="text-gray-500 font-medium">Output tax, input credit, and filing summaries for {periodMeta.label}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm font-medium"
                    >
                        <option value="month">This Month</option>
                        <option value="quarter">This Quarter</option>
                        <option value="year">This Year</option>
                        <option value="all">All Time</option>
                    </select>
                    <Button variant="outline" onClick={() => handleTaxExport('Statement', 'csv')} className="border-wine/20 text-wine hover:bg-wine/5 font-bold">
                        <Download className="w-4 h-4 mr-2" />
                        CSV Sales
                    </Button>
                    <Button variant="outline" onClick={() => handleTaxExport('Purchases', 'pdf')} className="border-wine/20 text-wine hover:bg-wine/5 font-bold">
                        <FileText className="w-4 h-4 mr-2" />
                        Purchase Register
                    </Button>
                    <Button onClick={() => handleTaxExport('Summary')} className="bg-wine hover:bg-wine/90 text-white font-bold shadow-lg shadow-wine/20">
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        {standards.taxLabel} Summary PDF
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
                                <CardTitle className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">Taxable Sales</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold text-gray-900">{formatMoney(taxMetrics.totalSales)}</div>
                                <Badge variant="secondary" className="mt-2 bg-green-50 text-green-700 text-[10px]">{periodMeta.label}</Badge>
                            </CardContent>
                        </Card>

                        <Card className="border-wine/5 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">{standards.taxLabel} Output</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold text-wine">{formatMoney(taxMetrics.outputTax)}</div>
                                <p className="text-xs text-gray-500 mt-1 font-medium">{taxMetrics.invoiceCount} invoice(s)</p>
                            </CardContent>
                        </Card>

                        <Card className="border-wine/5 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">Net Payable</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold text-red-600">{formatMoney(taxMetrics.payable)}</div>
                                <p className="text-xs text-gray-500 mt-1 font-medium">Output − Input credit</p>
                            </CardContent>
                        </Card>

                        <Card className="border-wine/5 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">Input Tax Credit</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold text-green-600">{formatMoney(taxMetrics.inputTax)}</div>
                                <p className="text-xs text-gray-500 mt-1 font-medium">{taxMetrics.purchaseCount} received bill(s)</p>
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
                                <CardDescription className="text-wine/60 font-medium">By rate bucket for {periodMeta.label}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                {Object.entries(taxMetrics.details || {}).length === 0 ? (
                                    <p className="text-sm text-gray-500">No taxable sales in this period.</p>
                                ) : Object.entries(taxMetrics.details || {}).map(([key, val]) => (
                                    <div key={key} className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-500">{key}</span>
                                        <span className="font-semibold text-gray-900">{formatMoney(val.amount)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between pt-4 border-t border-gray-100">
                                    <span className="font-semibold text-gray-900">Total Output Tax</span>
                                    <span className="font-semibold text-wine">{formatMoney(taxMetrics.outputTax)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-blue-100 bg-blue-50/30">
                            <CardHeader>
                                <CardTitle className="text-blue-900 flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-blue-600" />
                                    Compliance Checklist
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-blue-800 font-medium">
                                <p>• Record purchase bills as <strong>Received</strong> to claim input tax credit.</p>
                                <p>• Keep {standards.taxIdLabel} on all B2B invoices ({taxSettings.taxId || 'not configured'}).</p>
                                <p>• Export sales and purchase registers before filing {standards.taxLabel} returns.</p>
                                <Button variant="outline" className="w-full mt-2 border-blue-200 bg-white text-blue-700 hover:bg-blue-50 font-bold" onClick={() => handleTaxExport('Statement')}>
                                    Export Sales Register (PDF)
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="returns" className="space-y-4 pt-4">
                    <Card className="border-wine/10 shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-gray-900 font-semibold">{standards.taxIdLabel} Period Summaries</CardTitle>
                            <CardDescription>Computed from recorded invoices and received purchase bills</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {periodReturns.length === 0 ? (
                                <p className="text-sm text-gray-500 py-8 text-center">No tax activity recorded yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {periodReturns.map((item) => (
                                        <div key={item.periodKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-gray-100 rounded-2xl hover:bg-wine/5 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-gray-100 rounded-xl">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{item.period}</p>
                                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                                                        Due: {item.dueDate} · {item.invoiceCount} inv / {item.purchaseCount} bills
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 sm:gap-6">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Net Payable</p>
                                                    <p className="font-semibold text-gray-900">{formatMoney(item.netPayable)}</p>
                                                </div>
                                                <Badge className={item.status === 'Settled' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                                                    {item.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="calculator" className="pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-gray-100 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-gray-900 flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-brand-primary" />
                                    Quick Tax Calculator
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Amount</Label>
                                    <Input type="number" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} placeholder="0.00" className="font-bold" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tax Rate (%)</Label>
                                        <Input type="number" value={calcRate} onChange={(e) => setCalcRate(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Calculation Type</Label>
                                        <select value={calcType} onChange={(e) => setCalcType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                            <option value="exclusive">Tax Exclusive</option>
                                            <option value="inclusive">Tax Inclusive</option>
                                        </select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-wine/20 bg-gradient-to-br from-wine/5 to-transparent shadow-xl">
                            <CardHeader>
                                <CardTitle className="text-wine">Calculation Results</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between border-b border-wine/10 pb-3">
                                    <span className="text-sm font-bold text-gray-600">Taxable Amount</span>
                                    <span className="text-xl font-semibold">{formatMoney(calcValues.taxable)}</span>
                                </div>
                                <div className="flex justify-between border-b border-wine/10 pb-3">
                                    <span className="text-sm font-bold text-gray-600">{standards.taxLabel} @ {calcRate}%</span>
                                    <span className="text-xl font-semibold text-wine">{formatMoney(calcValues.tax)}</span>
                                </div>
                                <div className="flex justify-between pt-1">
                                    <span className="text-lg font-semibold">Total Value</span>
                                    <span className="text-3xl font-semibold text-emerald-600">{formatMoney(calcValues.total)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="config" className="pt-4">
                    <Card className="max-w-2xl mx-auto border-gray-100 shadow-xl">
                        <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-blue-600" />
                                {standards.taxIdLabel} Configuration
                            </CardTitle>
                            <CardDescription>Persisted to your business tax configuration</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            {loadingConfig ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>{standards.taxIdLabel} Number</Label>
                                            <Input value={taxSettings.taxId} onChange={(e) => setTaxSettings({ ...taxSettings, taxId: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Default Tax Rate (%)</Label>
                                            <Input type="number" value={taxSettings.defaultRate} onChange={(e) => setTaxSettings({ ...taxSettings, defaultRate: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Filer Status</Label>
                                            <select value={taxSettings.filerStatus} onChange={(e) => setTaxSettings({ ...taxSettings, filerStatus: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                                <option value="Filer">Filer</option>
                                                <option value="Non-Filer">Non-Filer</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Filing Frequency</Label>
                                            <select value={taxSettings.filingFrequency} onChange={(e) => setTaxSettings({ ...taxSettings, filingFrequency: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                                <option value="monthly">Monthly</option>
                                                <option value="quarterly">Quarterly</option>
                                                <option value="annually">Annually</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-4 border-t border-gray-100">
                                        <Button onClick={handleSaveSettings} disabled={savingSettings} className="bg-brand-primary hover:bg-brand-primary-dark text-white font-bold px-8 rounded-xl">
                                            {savingSettings ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : 'Save Configuration'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
