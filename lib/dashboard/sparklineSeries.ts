/**
 * Build sparkline series for hero KPI cards.
 * Prefers GL/chart trend data; falls back to weekly invoice buckets.
 */

interface ChartPoint {
    revenue?: number | string;
    orderCount?: number | string;
    sales?: number | string;
    date?: string;
}

interface InvoiceLike {
    date?: string | Date;
    status?: string;
    grand_total?: number | string;
    amount?: number | string;
}

function inRange(rawDate: string | Date | undefined, from: Date, to: Date): boolean {
    const parsed = rawDate ? new Date(rawDate) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return false;
    return parsed >= from && parsed <= to;
}

function bucketByWeek(
    invoices: InvoiceLike[],
    dateRange: { from: Date; to: Date },
    valueFn: (inv: InvoiceLike) => number
): number[] {
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    const msWeek = 7 * 24 * 60 * 60 * 1000;
    const duration = Math.max(msWeek, to.getTime() - from.getTime());
    const bucketCount = Math.min(8, Math.max(2, Math.ceil(duration / msWeek)));

    const buckets = Array.from({ length: bucketCount }, () => 0);
    const valid = invoices.filter(
        (inv) => !['cancelled', 'draft', 'voided'].includes(String(inv?.status || '').toLowerCase())
    );

    valid.forEach((inv) => {
        if (!inRange(inv.date, from, to)) return;
        const parsed = new Date(inv.date!);
        const ratio = (parsed.getTime() - from.getTime()) / duration;
        const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor(ratio * bucketCount)));
        buckets[idx] += valueFn(inv);
    });

    return buckets;
}

export function buildSparklineFromChartData(
    chartData: ChartPoint[],
    kind: 'revenue' | 'orders'
): number[] | undefined {
    if (!chartData?.length) return undefined;
    const series = chartData.map((point) => {
        if (kind === 'revenue') return Number(point.revenue) || 0;
        return Number(point.orderCount) || Number(point.sales) || 0;
    });
    const hasSignal = series.some((v) => v > 0);
    return hasSignal && series.length >= 2 ? series : undefined;
}

export function buildSparklineFromInvoices(
    invoices: InvoiceLike[],
    dateRange: { from: Date; to: Date },
    kind: 'revenue' | 'orders'
): number[] | undefined {
    if (!invoices?.length) return undefined;

    if (kind === 'revenue') {
        const paid = invoices.filter((inv) => String(inv?.status || '').toLowerCase() === 'paid');
        const series = bucketByWeek(
            paid,
            dateRange,
            (inv) => Number(inv.grand_total) || Number(inv.amount) || 0
        );
        return series.some((v) => v > 0) ? series : undefined;
    }

    const series = bucketByWeek(invoices, dateRange, () => 1);
    return series.some((v) => v > 0) ? series : undefined;
}

export function resolveSparklineSeries(
    chartData: ChartPoint[],
    invoices: InvoiceLike[],
    dateRange: { from: Date; to: Date },
    kind: 'revenue' | 'orders'
): number[] | undefined {
    return (
        buildSparklineFromChartData(chartData, kind) ??
        buildSparklineFromInvoices(invoices, dateRange, kind)
    );
}
