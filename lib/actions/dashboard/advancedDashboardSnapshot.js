'use server';

import { getDashboardKPIs } from '@/lib/actions/basic/dashboard';
import { getAccountingSummaryAction } from '@/lib/actions/standard/report';
import { resolveAnalyticsRange } from '@/lib/utils/analyticsRange';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';
import { withGuard } from '@/lib/rbac/serverGuard';

/**
 * Date-range-aware finance snapshot for the advanced dashboard hero strip.
 * Merges operational KPIs (getDashboardKPIs) with GL summary when available.
 *
 * @param {string} businessId
 * @param {{ from?: unknown; to?: unknown }} [filter]
 */
export async function getAdvancedDashboardSnapshotAction(businessId, filter = {}) {
    try {
        await withGuard(businessId, { permission: 'sales.view' });

        const { from, to } = resolveAnalyticsRange(filter);
        const fromDate = new Date(`${from}T00:00:00`);
        const toDate = new Date(`${to}T23:59:59.999`);

        const [kpisRes, glRes] = await Promise.all([
            getDashboardKPIs(businessId, { dateFrom: fromDate, dateTo: toDate }),
            getAccountingSummaryAction(businessId, fromDate.toISOString(), toDate.toISOString()).catch(() => ({
                success: false,
            })),
        ]);

        if (!kpisRes.success) {
            return await actionFailure('ADVANCED_SNAPSHOT_FAILED', kpisRes.error || 'Could not load dashboard KPIs');
        }

        const gl = glRes.success ? glRes.summary : null;
        const profitability = kpisRes.profitability || {};
        const receivables = kpisRes.receivables || {};
        const purchases = kpisRes.purchases || {};
        const payments = kpisRes.payments || {};

        const glReceivable = Number(gl?.accountsReceivable || 0);
        const glPayable = Number(gl?.accountsPayable || 0);
        const glGrossProfit = Number(gl?.grossProfit || 0);

        const receivablesTotal =
            glReceivable > 0 ? glReceivable : Number(receivables.total || 0);
        const payablesTotal =
            glPayable > 0 ? glPayable : Number(purchases.payablesTotal || 0);

        const netProfit = Number(profitability.netProfit ?? 0);
        const grossProfit =
            glGrossProfit > 0 ? glGrossProfit : Number(profitability.grossProfit || 0);

        return await actionSuccess({
            range: { from, to },
            finance: {
                netProfit,
                grossProfit,
                netMargin: Number(profitability.netMargin || gl?.margin || 0),
                receivables: receivablesTotal,
                receivableCount: Number(receivables.count || 0),
                payables: payablesTotal,
                overdueAmount: Number(receivables.overdueTotal || 0),
                overdueCount: Number(receivables.overdueCount || 0),
                netCashFlow: Number(payments.netCashFlow || 0),
                paymentsReceived: Number(payments.received || 0),
                paymentsMade: Number(payments.made || 0),
                periodRevenue: Number(kpisRes.revenue?.total || 0),
                periodExpenses: Number(kpisRes.expenses?.total || 0),
                source: gl ? 'gl_merged' : 'operational',
            },
            // Expose full GL summary so callers can reuse it without a separate round-trip
            glSummary: gl || null,
        });
    } catch (error) {
        console.error('Advanced dashboard snapshot error:', error);
        return await actionFailure('ADVANCED_SNAPSHOT_FAILED', await getErrorMessage(error));
    }
}
