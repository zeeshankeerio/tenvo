import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';

// Advanced reporting & analytics for orders
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    await withGuard(businessId, { permission: 'orders.view' });

    const client = await pool.connect();
    
    try {
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      // Overview metrics
      const overviewResult = await client.query(
        `SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as completed_revenue,
          COALESCE(AVG(total_amount), 0) as average_order_value,
          COALESCE(SUM(tax_amount), 0) as total_tax,
          COALESCE(SUM(shipping_amount), 0) as total_shipping,
          COALESCE(SUM(discount_amount), 0) as total_discounts
        FROM storefront_orders
        WHERE business_id = $1 AND created_at >= $2`,
        [businessId, startDate]
      );

      // Daily trend
      const dailyResult = await client.query(
        `SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders,
          COALESCE(SUM(total_amount), 0) as revenue,
          COALESCE(AVG(total_amount), 0) as aov
        FROM storefront_orders
        WHERE business_id = $1 AND created_at >= $2
        GROUP BY DATE(created_at)
        ORDER BY date DESC`,
        [businessId, startDate]
      );

      // Status breakdown
      const statusResult = await client.query(
        `SELECT 
          status,
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as revenue,
          COALESCE(AVG(total_amount), 0) as avg_order_value
        FROM storefront_orders
        WHERE business_id = $1 AND created_at >= $2
        GROUP BY status
        ORDER BY count DESC`,
        [businessId, startDate]
      );

      // Payment status breakdown
      const paymentResult = await client.query(
        `SELECT 
          payment_status,
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM storefront_orders
        WHERE business_id = $1 AND created_at >= $2
        GROUP BY payment_status
        ORDER BY count DESC`,
        [businessId, startDate]
      );

      // Top customers
      const customersResult = await client.query(
        `SELECT 
          customer_email,
          customer_name,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount), 0) as total_spent,
          COALESCE(AVG(total_amount), 0) as avg_order_value,
          MAX(created_at) as last_order
        FROM storefront_orders
        WHERE business_id = $1 
          AND created_at >= $2
          AND customer_email IS NOT NULL
        GROUP BY customer_email, customer_name
        ORDER BY total_spent DESC
        LIMIT 10`,
        [businessId, startDate]
      );

      // Hourly distribution (for peak hours analysis)
      const hourlyResult = await client.query(
        `SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM storefront_orders
        WHERE business_id = $1 AND created_at >= $2
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour`,
        [businessId, startDate]
      );

      // Day of week distribution
      const dowResult = await client.query(
        `SELECT 
          EXTRACT(DOW FROM created_at) as day_of_week,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM storefront_orders
        WHERE business_id = $1 AND created_at >= $2
        GROUP BY EXTRACT(DOW FROM created_at)
        ORDER BY day_of_week`,
        [businessId, startDate]
      );

      // Product performance (top selling products)
      const productsResult = await client.query(
        `SELECT 
          oi.product_name,
          oi.product_sku,
          SUM(oi.quantity) as total_quantity,
          COUNT(DISTINCT oi.order_id) as order_count,
          COALESCE(SUM(oi.total_price), 0) as total_revenue
        FROM storefront_order_items oi
        JOIN storefront_orders o ON oi.order_id = o.id
        WHERE o.business_id = $1 AND o.created_at >= $2
        GROUP BY oi.product_name, oi.product_sku
        ORDER BY total_revenue DESC
        LIMIT 10`,
        [businessId, startDate]
      );

      // Comparison to previous period
      const prevStartDate = new Date(startDate);
      const daysDiff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
      prevStartDate.setDate(prevStartDate.getDate() - daysDiff);

      const prevPeriodResult = await client.query(
        `SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(AVG(total_amount), 0) as average_order_value
        FROM storefront_orders
        WHERE business_id = $1 AND created_at >= $2 AND created_at < $3`,
        [businessId, prevStartDate, startDate]
      );

      const current = overviewResult.rows[0];
      const previous = prevPeriodResult.rows[0];

      const growth = {
        orders: previous.total_orders > 0 
          ? ((current.total_orders - previous.total_orders) / previous.total_orders * 100).toFixed(1)
          : 0,
        revenue: previous.total_revenue > 0 
          ? ((current.total_revenue - previous.total_revenue) / previous.total_revenue * 100).toFixed(1)
          : 0,
        aov: previous.average_order_value > 0 
          ? ((current.average_order_value - previous.average_order_value) / previous.average_order_value * 100).toFixed(1)
          : 0,
      };

      return NextResponse.json({
        period,
        start_date: startDate,
        end_date: now,
        overview: {
          ...current,
          growth,
        },
        daily_trend: dailyResult.rows,
        status_breakdown: statusResult.rows,
        payment_status: paymentResult.rows,
        top_customers: customersResult.rows,
        hourly_distribution: hourlyResult.rows,
        day_of_week_distribution: dowResult.rows,
        top_products: productsResult.rows,
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Order report error:', error);
    if (error?.code === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error?.code === 'PERMISSION_DENIED' || error?.code === 'BUSINESS_ACCESS_DENIED') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
