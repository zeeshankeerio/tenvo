import { BadgeDollarSign, CreditCard, TrendingUp } from 'lucide-react';
import type { KpiTheme } from '@/lib/dashboard/kpiThemes';
import type { MetricNavId } from '@/lib/dashboard/metricNavigation';
import { metricActionId } from '@/lib/dashboard/metricNavigation';

export interface FinanceSnapshotLike {
    finance?: {
        netProfit?: number;
        grossProfit?: number;
        netMargin?: number;
        receivables?: number;
        receivableCount?: number;
        payables?: number;
        netCashFlow?: number;
        periodRevenue?: number;
    };
}

export interface AccountingSummaryLike {
    accountsReceivable?: number;
    accountsPayable?: number;
    grossProfit?: number;
    margin?: number;
}

export interface FinanceHeroMetric {
    id: MetricNavId;
    label: string;
    value: string;
    subValue?: string;
    theme: KpiTheme;
    actionId: string;
    icon: typeof TrendingUp;
}

export function buildFinanceHeroMetrics(
    snapshot: FinanceSnapshotLike | null | undefined,
    accountingSummary: AccountingSummaryLike | null | undefined,
    formatCurrency: (amount: number) => string
): FinanceHeroMetric[] {
    const fin = snapshot?.finance;
    const gl = accountingSummary;

    const netProfit = Number(
        fin?.netProfit ??
            (Number(gl?.grossProfit || 0) - 0) ??
            0
    );
    const receivables = Number(
        fin?.receivables ?? gl?.accountsReceivable ?? 0
    );
    const payables = Number(fin?.payables ?? gl?.accountsPayable ?? 0);
    const netMargin = Number(fin?.netMargin ?? gl?.margin ?? 0);
    const receivableCount = Number(fin?.receivableCount ?? 0);

    return [
        {
            id: 'net_profit',
            label: 'Net Profit',
            value: formatCurrency(netProfit),
            subValue:
                netMargin !== 0
                    ? `${netMargin.toFixed(1)}% net margin`
                    : 'Period profitability',
            theme: netProfit >= 0 ? 'emerald' : 'rose',
            actionId: metricActionId('net_profit'),
            icon: TrendingUp,
        },
        {
            id: 'receivable',
            label: 'Receivable',
            value: formatCurrency(receivables),
            subValue:
                receivableCount > 0
                    ? `${receivableCount} open balance${receivableCount > 1 ? 's' : ''}`
                    : 'Outstanding A/R',
            theme: 'cyan',
            actionId: metricActionId('receivable'),
            icon: BadgeDollarSign,
        },
        {
            id: 'payable',
            label: 'Payable',
            value: formatCurrency(payables),
            subValue: 'Supplier & purchase obligations',
            theme: 'amber',
            actionId: metricActionId('payable'),
            icon: CreditCard,
        },
    ];
}
