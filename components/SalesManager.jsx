import { useState, useMemo } from 'react';
import {
    TrendingUp, DollarSign, ShoppingCart, Users,
    Target, Receipt, ChevronUp, ChevronDown, BarChart2,
    Award, Clock, Package, CreditCard, Activity
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { getDomainColors } from '@/lib/domainColors';
import { SalesChart, RevenueBarChart } from './AdvancedCharts';
import { aggregateMonthlyData, getTopCatalysts } from '@/lib/utils/analytics';

// ── Trend Badge ──────────────────────────────────────────────────────────────
function TrendBadge({ value }) {
    const up = value >= 0;
    return (
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            {up ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {Math.abs(value).toFixed(1)}%
        </span>
    );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, growth, color, accent }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color }} />
                </div>
                <TrendBadge value={growth} />
            </div>
            <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
            </div>
        </div>
    );
}

export function SalesManager({
    invoices = [],
    customers = [],
    products = [],
    category = 'retail-shop',
    businessId = null,
    currency = 'PKR'
}) {
    const colors = getDomainColors(category);
    const [timeframe, setTimeframe] = useState('monthly');
    const primaryColor = colors.primary || '#6366f1';

    // ── Core metrics ─────────────────────────────────────────────────────────
    const metrics = useMemo(() => {
        const now = new Date();
        const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const curInv = invoices.filter(inv => new Date(inv.date) >= curStart);
        const prevInv = invoices.filter(inv => { const d = new Date(inv.date); return d >= prevStart && d <= prevEnd; });

        const total = curInv.reduce((s, i) => s + (Number(i.grand_total) || 0), 0);
        const count = curInv.length;
        const avg = count > 0 ? total / count : 0;
        const paid = curInv.filter(i => i.payment_status === 'paid' || i.status === 'paid').reduce((s, i) => s + (Number(i.grand_total) || 0), 0);
        const outstanding = total - paid;
        const activeCustomers = new Set(curInv.filter(i => i.customer_id).map(i => i.customer_id)).size;

        const prevTotal = prevInv.reduce((s, i) => s + (Number(i.grand_total) || 0), 0);
        const prevCount = prevInv.length;
        const prevAvg = prevCount > 0 ? prevTotal / prevCount : 0;
        const prevCustomers = new Set(prevInv.filter(i => i.customer_id).map(i => i.customer_id)).size;

        const g = (cur, prev) => prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0;

        // Profit estimate: revenue - 60% COGS heuristic
        const profitEst = total * 0.4;
        const prevProfitEst = prevTotal * 0.4;

        // Repeat customers
        const custOrderCount = {};
        invoices.forEach(inv => { if (inv.customer_id) custOrderCount[inv.customer_id] = (custOrderCount[inv.customer_id] || 0) + 1; });
        const repeatCount = Object.values(custOrderCount).filter(c => c > 1).length;
        const retentionRate = customers.length > 0 ? Math.round((repeatCount / customers.length) * 100) : 0;

        return {
            total, count, avg, paid, outstanding, activeCustomers,
            profitEst, retentionRate,
            totalFmt: formatCurrency(total, currency),
            countFmt: count.toLocaleString(),
            avgFmt: formatCurrency(avg, currency),
            paidFmt: formatCurrency(paid, currency),
            outstandingFmt: formatCurrency(outstanding, currency),
            profitFmt: formatCurrency(profitEst, currency),
            growth: {
                revenue: g(total, prevTotal),
                count: g(count, prevCount),
                avg: g(avg, prevAvg),
                customers: g(activeCustomers, prevCustomers),
                profit: g(profitEst, prevProfitEst),
                retention: 0,
            }
        };
    }, [invoices, customers, currency]);

    const chartData = useMemo(() => aggregateMonthlyData(invoices, timeframe === 'monthly' ? 6 : 12), [invoices, timeframe]);
    const topCatalysts = useMemo(() => getTopCatalysts(invoices, products, 8), [invoices, products]);

    // ── Recent transactions ──────────────────────────────────────────────────
    const recentInvoices = useMemo(() =>
        [...invoices].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8),
        [invoices]
    );

    // ── Top customers ────────────────────────────────────────────────────────
    const topCustomers = useMemo(() => {
        const map = {};
        invoices.forEach(inv => {
            const id = inv.customer_id;
            if (!id) return;
            if (!map[id]) map[id] = { id, name: inv.customer?.name || inv.customer_name || 'Unknown', total: 0, count: 0 };
            map[id].total += Number(inv.grand_total) || 0;
            map[id].count += 1;
        });
        return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
    }, [invoices]);

    const statusColor = (status) => {
        if (!status) return 'bg-gray-100 text-gray-500';
        const s = status.toLowerCase();
        if (s === 'paid') return 'bg-emerald-50 text-emerald-600';
        if (s === 'partial') return 'bg-amber-50 text-amber-600';
        if (s === 'unpaid' || s === 'overdue') return 'bg-red-50 text-red-500';
        return 'bg-gray-100 text-gray-500';
    };

    return (
        <div className="space-y-5">
            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5" style={{ color: primaryColor }} />
                        Sales Performance
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">Revenue analytics & transaction intelligence</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                        {['monthly', 'quarterly'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTimeframe(t)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${timeframe === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── KPI Row 1 ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Gross Revenue" value={metrics.totalFmt} sub="This month" icon={DollarSign} growth={metrics.growth.revenue} color={primaryColor} />
                <KpiCard label="Orders" value={metrics.countFmt} sub="Completed deals" icon={ShoppingCart} growth={metrics.growth.count} color="#8b5cf6" />
                <KpiCard label="Avg Order Value" value={metrics.avgFmt} sub="Basket size" icon={Target} growth={metrics.growth.avg} color="#f59e0b" />
                <KpiCard label="Active Customers" value={metrics.activeCustomers.toLocaleString()} sub="This month" icon={Users} growth={metrics.growth.customers} color="#10b981" />
            </div>

            {/* ── KPI Row 2 ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Est. Gross Profit" value={metrics.profitFmt} sub="~40% margin est." icon={TrendingUp} growth={metrics.growth.profit} color="#6366f1" />
                <KpiCard label="Amount Collected" value={metrics.paidFmt} sub="Paid invoices" icon={CreditCard} growth={0} color="#0ea5e9" />
                <KpiCard label="Outstanding" value={metrics.outstandingFmt} sub="Unpaid balance" icon={Receipt} growth={0} color="#ef4444" />
                <KpiCard label="Retention Rate" value={`${metrics.retentionRate}%`} sub="Repeat customers" icon={Award} growth={metrics.growth.retention} color="#f97316" />
            </div>

            {/* ── Revenue Chart + Top Products ────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Revenue Trend</p>
                            <p className="text-xs text-gray-400">{timeframe === 'monthly' ? '6-month' : '12-month'} performance</p>
                        </div>
                        <Activity className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="p-4 h-[280px]">
                        <SalesChart data={chartData} colors={colors} currency={currency} />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Top Products</p>
                            <p className="text-xs text-gray-400">By revenue</p>
                        </div>
                        <Package className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="divide-y divide-gray-50">
                        {topCatalysts.length === 0 && (
                            <p className="text-xs text-gray-400 px-5 py-6 text-center">No sales data yet</p>
                        )}
                        {topCatalysts.slice(0, 6).map((p, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                                <span className="text-xs font-bold text-gray-300 w-4 shrink-0">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                                    <p className="text-[11px] text-gray-400">{p.sales} sold</p>
                                </div>
                                <span className="text-sm font-semibold text-gray-800 shrink-0">{formatCurrency(p.revenue, currency)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Order Distribution + Recent Transactions ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Order Distribution */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50">
                        <p className="text-sm font-semibold text-gray-800">Revenue Distribution</p>
                        <p className="text-xs text-gray-400">By month — sales vs revenue</p>
                    </div>
                    <div className="p-4 h-[260px]">
                        <RevenueBarChart data={chartData} colors={colors} currency={currency} />
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Recent Transactions</p>
                            <p className="text-xs text-gray-400">Latest sales activity</p>
                        </div>
                        <Clock className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[260px] overflow-y-auto">
                        {recentInvoices.length === 0 && (
                            <p className="text-xs text-gray-400 px-5 py-6 text-center">No transactions yet</p>
                        )}
                        {recentInvoices.map((inv, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                    <Receipt className="w-3.5 h-3.5 text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{inv.customer?.name || inv.customer_name || 'Walk-in'}</p>
                                    <p className="text-[11px] text-gray-400">{inv.invoice_number} · {inv.date ? new Date(inv.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-semibold text-gray-800">{formatCurrency(inv.grand_total, currency)}</p>
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColor(inv.payment_status || inv.status)}`}>
                                        {inv.payment_status || inv.status || 'pending'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Top Customers ────────────────────────────────────────────── */}
            {topCustomers.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50">
                        <p className="text-sm font-semibold text-gray-800">Top Customers</p>
                        <p className="text-xs text-gray-400">Ranked by total spend</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-50">
                                    <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">#</th>
                                    <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Customer</th>
                                    <th className="text-right text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Orders</th>
                                    <th className="text-right text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Total Spend</th>
                                    <th className="text-right text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Avg Order</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {topCustomers.map((c, i) => (
                                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-3 text-xs font-bold text-gray-300">{i + 1}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                    {c.name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <span className="font-medium text-gray-800">{c.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-right text-gray-600">{c.count}</td>
                                        <td className="px-5 py-3 text-right font-semibold text-gray-800">{formatCurrency(c.total, currency)}</td>
                                        <td className="px-5 py-3 text-right text-gray-500">{formatCurrency(c.count > 0 ? c.total / c.count : 0, currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
