export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDashboardKPIs, getRecentActivity, getSalesTrend, getTopCustomers, getTopProducts } from '@/lib/actions/basic/dashboard';
import { withApiAuth } from '@/lib/api/_shared/middleware';

/**
 * GET /api/v1/dashboard?businessId=xxx&period=month
 * Returns comprehensive dashboard KPIs
 */
export const GET = withApiAuth(async (request, { businessId }) => {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'month';
        const section = searchParams.get('section') || 'all';

        switch (section) {
            case 'kpis': {
                const kpis = await getDashboardKPIs(businessId, { period });
                return NextResponse.json(kpis);
            }
            case 'activity': {
                const limit = parseInt(searchParams.get('limit') || '20');
                const activity = await getRecentActivity(businessId, limit);
                return NextResponse.json(activity);
            }
            case 'trend': {
                const days = parseInt(searchParams.get('days') || '30');
                const groupBy = searchParams.get('groupBy') || 'day';
                const trend = await getSalesTrend(businessId, { days, groupBy });
                return NextResponse.json(trend);
            }
            case 'top-customers': {
                const limit = parseInt(searchParams.get('limit') || '10');
                const result = await getTopCustomers(businessId, limit);
                return NextResponse.json(result);
            }
            case 'top-products': {
                const limit = parseInt(searchParams.get('limit') || '10');
                const result = await getTopProducts(businessId, limit);
                return NextResponse.json(result);
            }
            default: {
                const [kpis, activity, trend, topCustomers, topProducts] = await Promise.all([
                    getDashboardKPIs(businessId, { period }),
                    getRecentActivity(businessId, 15),
                    getSalesTrend(businessId, { days: 30, groupBy: 'day' }),
                    getTopCustomers(businessId, 5),
                    getTopProducts(businessId, 5),
                ]);

                return NextResponse.json({
                    success: true,
                    kpis: kpis.data,
                    activity: activity.data?.activities || [],
                    trend: trend.data?.trend || [],
                    topCustomers: topCustomers.data?.customers || [],
                    topProducts: topProducts.data?.products || [],
                });
            }
        }
    } catch (error) {
        console.error('GET /api/v1/dashboard error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
