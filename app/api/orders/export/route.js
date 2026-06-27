import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';

// Export orders to CSV or JSON
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const format = searchParams.get('format') || 'csv'; // csv or json
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    await withGuard(businessId, { permission: 'orders.view' });

    const client = await pool.connect();
    
    try {
      // Build query
      let whereClause = 'WHERE o.business_id = $1';
      const params = [businessId];
      let paramCount = 1;

      if (startDate) {
        params.push(startDate);
        whereClause += ` AND o.created_at >= $${++paramCount}`;
      }

      if (endDate) {
        params.push(endDate);
        whereClause += ` AND o.created_at <= $${++paramCount}`;
      }

      if (status) {
        params.push(status);
        whereClause += ` AND o.status = $${++paramCount}`;
      }

      const result = await client.query(
        `SELECT 
          o.order_number,
          o.customer_name,
          o.customer_email,
          o.customer_phone,
          o.total_amount,
          o.currency,
          o.subtotal,
          o.tax_amount,
          o.shipping_amount,
          o.discount_amount,
          o.status,
          o.payment_status,
          o.fulfillment_status,
          o.shipping_address,
          o.notes,
          o.created_at,
          o.updated_at,
          json_agg(
            json_build_object(
              'product_name', oi.product_name,
              'product_sku', oi.product_sku,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'total_price', oi.total_price
            )
          ) as items
        FROM storefront_orders o
        LEFT JOIN storefront_order_items oi ON o.id = oi.order_id
        ${whereClause}
        GROUP BY o.id
        ORDER BY o.created_at DESC`,
        params
      );

      if (format === 'json') {
        return NextResponse.json({
          orders: result.rows,
          count: result.rows.length,
          exported_at: new Date().toISOString()
        });
      }

      // Generate CSV
      const headers = [
        'Order Number',
        'Customer Name',
        'Customer Email',
        'Customer Phone',
        'Total Amount',
        'Currency',
        'Subtotal',
        'Tax',
        'Shipping',
        'Discount',
        'Status',
        'Payment Status',
        'Fulfillment Status',
        'Shipping Address',
        'Notes',
        'Items',
        'Created At',
        'Updated At'
      ];

      const rows = result.rows.map(order => [
        order.order_number,
        order.customer_name || '',
        order.customer_email || '',
        order.customer_phone || '',
        order.total_amount,
        order.currency,
        order.subtotal,
        order.tax_amount,
        order.shipping_amount,
        order.discount_amount,
        order.status,
        order.payment_status,
        order.fulfillment_status,
        order.shipping_address ? JSON.stringify(order.shipping_address) : '',
        order.notes || '',
        order.items ? order.items.map(i => `${i.product_name} (x${i.quantity})`).join('; ') : '',
        order.created_at,
        order.updated_at
      ]);

      // Escape and format CSV
      const escapeCsv = (value) => {
        const stringValue = String(value || '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsv).join(','))
      ].join('\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Order export error:', error);
    if (error?.code === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error?.code === 'PERMISSION_DENIED' || error?.code === 'BUSINESS_ACCESS_DENIED') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
