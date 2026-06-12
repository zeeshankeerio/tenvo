'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, RefreshCw, Calendar, TrendingUp, TrendingDown, Scale, ArrowDownLeft, ArrowUpRight, Banknote } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { accountingAPI } from '@/lib/api/accounting';
import { useBusiness } from '@/lib/context/BusinessContext';
import toast from 'react-hot-toast';

// Helper for row rendering
/** @type {React.FC<{label: string, amount: number, type?: 'normal'|'total', indent?: boolean, currency?: import('@/lib/currency').CurrencyCode}>} */
const ReportRow = ({ label, amount, type = 'normal', indent = false, currency = 'PKR' }) => (
    <div className={`flex justify-between py-2 border-b border-gray-50 ${type === 'total' ? 'font-bold bg-gray-50/50 px-2 rounded mt-1' : ''} ${indent ? 'pl-8' : ''}`}>
        <span className={`${type === 'total' ? 'text-gray-900' : 'text-gray-600'}`}>{label}</span>
        <span className={`${type === 'total' ? 'text-gray-900' : 'text-gray-700 font-mono'}`}>
            {formatCurrency(amount || 0, currency)}
        </span>
    </div>
);

// Helper for section header
const SectionHeader = ({ title, icon: Icon, color }) => (
    <div className="flex items-center gap-2 mt-6 mb-3 pb-2 border-b border-gray-100">
        <div className={`p-1.5 rounded-lg ${color}`}>
            <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">{title}</h3>
    </div>
);

/**
 * @param {Object} props
 * @param {string} props.businessId
 * @param {string} [props.category] optional — reserved for future domain-specific report chrome
 */
export default function FinancialReports({ businessId }) {
    const { business, currency: businessCurrencyCode } = useBusiness();
    const reportCurrency = businessCurrencyCode || 'PKR';
    const [activeTab, setActiveTab] = useState('pl');
    const [loading, setLoading] = useState(false);

    // Date States
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]); // First day of month
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]); // Today for BS
    const [cfStartDate, setCfStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [cfEndDate, setCfEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Data States
    const [plData, setPlData] = useState(null);
    const [bsData, setBsData] = useState(null);
    const [cfData, setCfData] = useState(null);

    const fetchPL = async () => {
        setLoading(true);
        try {
            const res = await accountingAPI.getProfitLoss(businessId, startDate, endDate);
            if (res.success) setPlData(res.statement);
            else toast.error(res.error || 'Failed to load P&L');
        } catch { toast.error('Error loading P&L'); }
        finally { setLoading(false); }
    };

    const fetchBS = async () => {
        setLoading(true);
        try {
            const res = await accountingAPI.getBalanceSheet(businessId, asOfDate);
            if (res.success) setBsData(res.statement);
            else toast.error(res.error || 'Failed to load Balance Sheet');
        } catch { toast.error('Error loading Balance Sheet'); }
        finally { setLoading(false); }
    };

    const fetchCashFlow = async () => {
        setLoading(true);
        try {
            // Derive cash flow using indirect method from P&L and Balance Sheet data
            const [plRes, bsEndRes, bsStartRes] = await Promise.all([
                accountingAPI.getProfitLoss(businessId, cfStartDate, cfEndDate),
                accountingAPI.getBalanceSheet(businessId, cfEndDate),
                accountingAPI.getBalanceSheet(businessId, cfStartDate),
            ]);

            if (!plRes.success || !bsEndRes.success || !bsStartRes.success) {
                toast.error('Failed to load data for Cash Flow Statement');
                return;
            }

            const pl = plRes.statement;
            const bsEnd = bsEndRes.statement;
            const bsStart = bsStartRes.statement;

            const netIncome = Number(pl.netIncome || 0);

            // Helper: find account balance change between periods
            const findBalance = (accounts, namePattern) => {
                const acc = (accounts || []).find(a =>
                    a.name?.toLowerCase().includes(namePattern.toLowerCase()) ||
                    a.code?.toLowerCase().includes(namePattern.toLowerCase())
                );
                return Number(acc?.balance || acc?.amount || 0);
            };

            // Operating Activities (Indirect Method)
            const arEnd = findBalance(bsEnd.assets, 'receivable');
            const arStart = findBalance(bsStart.assets, 'receivable');
            const changeInAR = arEnd - arStart;

            const invEnd = findBalance(bsEnd.assets, 'inventory');
            const invStart = findBalance(bsStart.assets, 'inventory');
            const changeInInventory = invEnd - invStart;

            const apEnd = findBalance(bsEnd.liabilities, 'payable');
            const apStart = findBalance(bsStart.liabilities, 'payable');
            const changeInAP = apEnd - apStart;

            const taxEnd = findBalance(bsEnd.liabilities, 'tax');
            const taxStart = findBalance(bsStart.liabilities, 'tax');
            const changeInTax = taxEnd - taxStart;

            const operatingItems = [
                { label: 'Net Income', amount: netIncome },
                { label: 'Change in Accounts Receivable', amount: -changeInAR },
                { label: 'Change in Inventory', amount: -changeInInventory },
                { label: 'Change in Accounts Payable', amount: changeInAP },
                { label: 'Change in Tax Liabilities', amount: changeInTax },
            ];
            const operatingTotal = operatingItems.reduce((s, i) => s + i.amount, 0);

            // Investing Activities (simplified” fixed assets changes)
            const faEnd = findBalance(bsEnd.assets, 'fixed') + findBalance(bsEnd.assets, 'equipment') + findBalance(bsEnd.assets, 'property');
            const faStart = findBalance(bsStart.assets, 'fixed') + findBalance(bsStart.assets, 'equipment') + findBalance(bsStart.assets, 'property');
            const investingItems = [
                { label: 'Purchase of Fixed Assets', amount: -(faEnd - faStart) },
            ];
            const investingTotal = investingItems.reduce((s, i) => s + i.amount, 0);

            // Financing Activities (equity + long-term debt changes)
            const equityEnd = Number(bsEnd.totalEquity || 0) - netIncome; // Remove net income already captured
            const equityStart = Number(bsStart.totalEquity || 0);
            const financingItems = [
                { label: 'Change in Equity / Capital', amount: equityEnd - equityStart },
            ];
            const financingTotal = financingItems.reduce((s, i) => s + i.amount, 0);

            const netChange = operatingTotal + investingTotal + financingTotal;
            const cashEnd = findBalance(bsEnd.assets, 'cash') + findBalance(bsEnd.assets, 'bank');
            const cashStart = findBalance(bsStart.assets, 'cash') + findBalance(bsStart.assets, 'bank');

            setCfData({
                operatingItems, operatingTotal,
                investingItems, investingTotal,
                financingItems, financingTotal,
                netChange,
                cashStart,
                cashEnd,
            });
        } catch { toast.error('Error loading Cash Flow'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (!businessId) return;
        queueMicrotask(() => {
            if (activeTab === 'pl') void fetchPL();
            else if (activeTab === 'bs') void fetchBS();
            else if (activeTab === 'cf') void fetchCashFlow();
        });
        // Fetches close over date state; ranges refresh via explicit Refresh buttons.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId, activeTab]);

    const handlePrint = () => window.print();

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl font-bold text-gray-900">Financial Reports</CardTitle>
                        <CardDescription>Comprehensive view of your business financial health.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center justify-between mb-6">
                        <TabsList className="bg-white border">
                            <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
                            <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
                            <TabsTrigger value="cf">Cash Flow</TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-2 print:hidden">
                            {activeTab === 'pl' ? (
                                <>
                                    <div className="flex items-center gap-2 bg-white border rounded-md px-2 py-1">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm outline-none w-32" />
                                        <span className="text-gray-400">-</span>
                                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm outline-none w-32" />
                                    </div>
                                    <Button variant="outline" size="sm" onClick={fetchPL} disabled={loading}>
                                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    </Button>
                                </>
                            ) : activeTab === 'bs' ? (
                                <>
                                    <div className="flex items-center gap-2 bg-white border rounded-md px-2 py-1">
                                        <span className="text-xs text-gray-500 font-medium">As of:</span>
                                        <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="text-sm outline-none w-32" />
                                    </div>
                                    <Button variant="outline" size="sm" onClick={fetchBS} disabled={loading}>
                                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 bg-white border rounded-md px-2 py-1">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <input type="date" value={cfStartDate} onChange={e => setCfStartDate(e.target.value)} className="text-sm outline-none w-32" />
                                        <span className="text-gray-400">-</span>
                                        <input type="date" value={cfEndDate} onChange={e => setCfEndDate(e.target.value)} className="text-sm outline-none w-32" />
                                    </div>
                                    <Button variant="outline" size="sm" onClick={fetchCashFlow} disabled={loading}>
                                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    </Button>
                                </>
                            )}
                            <Button variant="outline" size="sm" onClick={handlePrint}>
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>

                    {/* PROFIT & LOSS CONTENT */}
                    <TabsContent value="pl">
                        <Card className="border shadow-sm print:shadow-none bg-white min-h-[500px]">
                            <CardContent className="p-8">
                                <div className="text-center mb-8 border-b pb-4">
                                    <h2 className="text-2xl font-bold text-gray-900 uppercase">Profit & Loss Statement</h2>
                                    {business?.business_name && (
                                        <p className="text-gray-800 font-semibold text-base mt-2">{business.business_name}</p>
                                    )}
                                    {(business?.ntn || business?.address) && (
                                        <p className="text-gray-500 text-xs mt-1">
                                            {[business.ntn ? `NTN: ${business.ntn}` : null, business.address].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    <p className="text-gray-500 text-sm mt-1">
                                        For the period {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
                                    </p>
                                </div>

                                {loading && !plData ? (
                                    <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
                                ) : plData ? (
                                    <div className="max-w-3xl mx-auto space-y-8">
                                        {/* INCOME SECTION */}
                                        <section>
                                            <SectionHeader title="Operating Income" icon={TrendingUp} color="bg-green-500" />
                                            <div className="space-y-1">
                                                {plData.income.length > 0 ? (
                                                    plData.income.map(acc => (
                                                        <ReportRow currency={reportCurrency} key={acc.id} label={acc.name} amount={acc.amount} />
                                                    ))
                                                ) : (
                                                    <div className="text-gray-400 italic py-2 px-4">No income recorded</div>
                                                )}
                                                <ReportRow currency={reportCurrency} label="Total Income" amount={plData.totalIncome} type="total" />
                                            </div>
                                        </section>

                                        {/* COGS SECTION */}
                                        <section>
                                            <SectionHeader title="Cost of Goods Sold" icon={TrendingDown} color="bg-orange-500" />
                                            <div className="space-y-1">
                                                {plData.cogs.length > 0 ? (
                                                    plData.cogs.map(acc => (
                                                        <ReportRow currency={reportCurrency} key={acc.id} label={acc.name} amount={acc.amount} />
                                                    ))
                                                ) : (
                                                    <div className="text-gray-400 italic py-2 px-4">No COGS recorded</div>
                                                )}
                                                <ReportRow currency={reportCurrency} label="Total COGS" amount={plData.totalCOGS} type="total" />
                                            </div>
                                        </section>

                                        {/* GROSS PROFIT SUMMARY */}
                                        <section className="bg-green-50/50 p-4 rounded-xl border border-green-100 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-green-800">Gross Profit</h3>
                                                <p className="text-green-600/70 text-xs">Operating Income - COGS</p>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-xl font-bold ${Number(plData.grossProfit) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                    {formatCurrency(Number(plData.grossProfit), reportCurrency)}
                                                </div>
                                                <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider">
                                                    {Number(plData.totalIncome) > 0 ? Math.round((Number(plData.grossProfit) / Number(plData.totalIncome)) * 100) : 0}% Margin
                                                </div>
                                            </div>
                                        </section>

                                        {/* OTHER EXPENSE SECTION */}
                                        <section>
                                            <SectionHeader title="Operating Expenses" icon={TrendingDown} color="bg-red-500" />
                                            <div className="space-y-1">
                                                {plData.otherExpenses.length > 0 ? (
                                                    plData.otherExpenses.map(acc => (
                                                        <ReportRow currency={reportCurrency} key={acc.id} label={acc.name} amount={acc.amount} />
                                                    ))
                                                ) : (
                                                    <div className="text-gray-400 italic py-2 px-4">No other expenses recorded</div>
                                                )}
                                                <ReportRow currency={reportCurrency} label="Total Operating Expenses" amount={plData.totalExpense - plData.totalCOGS} type="total" />
                                            </div>
                                        </section>

                                        {/* NET INCOME SUMMARY */}
                                        <section className="bg-gray-900 p-6 rounded-xl shadow-lg flex items-center justify-between mt-8 text-white">
                                            <div>
                                                <h3 className="text-lg font-bold">Net Income</h3>
                                                <p className="text-gray-400 text-sm">Gross Profit - Operating Expenses</p>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-bold ${Number(plData.netIncome) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {formatCurrency(Number(plData.netIncome), reportCurrency)}
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 py-12">Click refresh to load data</div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* BALANCE SHEET CONTENT */}
                    <TabsContent value="bs">
                        <Card className="border shadow-sm print:shadow-none bg-white min-h-[500px]">
                            <CardContent className="p-8">
                                <div className="text-center mb-8 border-b pb-4">
                                    <h2 className="text-2xl font-bold text-gray-900 uppercase">Balance Sheet</h2>
                                    {business?.business_name && (
                                        <p className="text-gray-800 font-semibold text-base mt-2">{business.business_name}</p>
                                    )}
                                    {(business?.ntn || business?.address) && (
                                        <p className="text-gray-500 text-xs mt-1">
                                            {[business.ntn ? `NTN: ${business.ntn}` : null, business.address].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    <p className="text-gray-500 text-sm mt-1">
                                        As of {new Date(asOfDate).toLocaleDateString()}
                                    </p>
                                </div>

                                {loading && !bsData ? (
                                    <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
                                ) : bsData ? (
                                    <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                        {/* ASSETS */}
                                        <div className="space-y-8">
                                            <section>
                                                <SectionHeader title="Assets" icon={TrendingUp} color="bg-blue-500" />
                                                <div className="space-y-1">
                                                    {bsData.assets.map(acc => (
                                                        <ReportRow currency={reportCurrency} key={acc.id} label={acc.name} amount={acc.balance} />
                                                    ))}
                                                    <div className="mt-4 pt-2 border-t-2 border-gray-900">
                                                        <ReportRow currency={reportCurrency} label="Total Assets" amount={bsData.totalAssets} type="total" />
                                                    </div>
                                                </div>
                                            </section>
                                        </div>

                                        {/* LIABILITIES & EQUITY */}
                                        <div className="space-y-8">
                                            <section>
                                                <SectionHeader title="Liabilities" icon={TrendingDown} color="bg-orange-500" />
                                                <div className="space-y-1">
                                                    {bsData.liabilities.map(acc => (
                                                        <ReportRow currency={reportCurrency} key={acc.id} label={acc.name} amount={acc.balance} />
                                                    ))}
                                                    <ReportRow currency={reportCurrency} label="Total Liabilities" amount={bsData.totalLiabilities} type="total" />
                                                </div>
                                            </section>

                                            <section>
                                                <SectionHeader title="Equity" icon={Scale} color="bg-wine-500" />
                                                <div className="space-y-1">
                                                    {bsData.equity.map(acc => (
                                                        <ReportRow currency={reportCurrency} key={acc.id} label={acc.name} amount={acc.balance} />
                                                    ))}
                                                    <ReportRow currency={reportCurrency} label="Net Income (Retained)" amount={bsData.retainedEarnings} indent />
                                                    <ReportRow currency={reportCurrency} label="Total Equity" amount={bsData.totalEquity} type="total" />
                                                </div>
                                            </section>

                                            <div className="pt-4 mt-4 border-t-2 border-gray-900 bg-gray-50 p-2 rounded">
                                                <div className="flex justify-between items-center font-bold text-gray-900">
                                                    <span>Total Liabilities & Equity</span>
                                                    <span>{formatCurrency(bsData.totalLiabilitiesAndEquity, reportCurrency)}</span>
                                                </div>
                                                {!bsData.isBalanced && (
                                                    <div className="text-xs text-red-500 mt-1 font-medium bg-red-50 p-1 rounded">
                                                        Unbalanced: {formatCurrency(Math.abs(bsData.totalAssets - bsData.totalLiabilitiesAndEquity), reportCurrency)} difference
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 py-12">Click refresh to load data</div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* CASH FLOW STATEMENT */}
                    <TabsContent value="cf">
                        <Card className="border shadow-sm print:shadow-none bg-white min-h-[500px]">
                            <CardContent className="p-8">
                                <div className="text-center mb-8 border-b pb-4">
                                    <h2 className="text-2xl font-bold text-gray-900 uppercase">Cash Flow Statement</h2>
                                    {business?.business_name && (
                                        <p className="text-gray-800 font-semibold text-base mt-2">{business.business_name}</p>
                                    )}
                                    {(business?.ntn || business?.address) && (
                                        <p className="text-gray-500 text-xs mt-1">
                                            {[business.ntn ? `NTN: ${business.ntn}` : null, business.address].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    <p className="text-gray-500 text-sm mt-1">
                                        For the period {new Date(cfStartDate).toLocaleDateString()} to {new Date(cfEndDate).toLocaleDateString()} (Indirect Method)
                                    </p>
                                </div>

                                {loading && !cfData ? (
                                    <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
                                ) : cfData ? (
                                    <div className="max-w-3xl mx-auto space-y-8">
                                        {/* Operating Activities */}
                                        <section>
                                            <SectionHeader title="Cash from Operating Activities" icon={Banknote} color="bg-green-500" />
                                            <div className="space-y-1">
                                                {cfData.operatingItems.map((item, idx) => (
                                                    <ReportRow currency={reportCurrency} key={idx} label={item.label} amount={item.amount} indent={idx > 0} />
                                                ))}
                                                <ReportRow currency={reportCurrency} label="Net Cash from Operations" amount={cfData.operatingTotal} type="total" />
                                            </div>
                                        </section>

                                        {/* Investing Activities */}
                                        <section>
                                            <SectionHeader title="Cash from Investing Activities" icon={ArrowDownLeft} color="bg-blue-500" />
                                            <div className="space-y-1">
                                                {cfData.investingItems.map((item, idx) => (
                                                    <ReportRow currency={reportCurrency} key={idx} label={item.label} amount={item.amount} />
                                                ))}
                                                <ReportRow currency={reportCurrency} label="Net Cash from Investing" amount={cfData.investingTotal} type="total" />
                                            </div>
                                        </section>

                                        {/* Financing Activities */}
                                        <section>
                                            <SectionHeader title="Cash from Financing Activities" icon={ArrowUpRight} color="bg-wine-500" />
                                            <div className="space-y-1">
                                                {cfData.financingItems.map((item, idx) => (
                                                    <ReportRow currency={reportCurrency} key={idx} label={item.label} amount={item.amount} />
                                                ))}
                                                <ReportRow currency={reportCurrency} label="Net Cash from Financing" amount={cfData.financingTotal} type="total" />
                                            </div>
                                        </section>

                                        {/* Net Change */}
                                        <section className="bg-gray-900 p-6 rounded-xl shadow-lg mt-8 text-white space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-bold">Net Change in Cash</h3>
                                                    <p className="text-gray-400 text-sm">Operating + Investing + Financing</p>
                                                </div>
                                                <div className={`text-2xl font-bold ${cfData.netChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {formatCurrency(cfData.netChange, reportCurrency)}
                                                </div>
                                            </div>
                                            <div className="border-t border-gray-700 pt-3 flex justify-between text-sm">
                                                <span className="text-gray-400">Beginning Cash Balance</span>
                                                <span className="font-mono text-gray-300">{formatCurrency(cfData.cashStart, reportCurrency)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Ending Cash Balance</span>
                                                <span className="font-mono text-white font-bold">{formatCurrency(cfData.cashEnd, reportCurrency)}</span>
                                            </div>
                                        </section>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 py-12">Click refresh to load data</div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

