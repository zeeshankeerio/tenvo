export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';

/**
 * GET /api/v1/customers?businessId=xxx
 * List all active customers for a business
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get('businessId');
        if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

        await withGuard(businessId, { permission: 'customers.view' });

        const client = await pool.connect();
        try {
            const search = searchParams.get('search') || '';
            const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
            const offset = parseInt(searchParams.get('offset') || '0');

            let query = `
                SELECT id, name, email, phone, type, city, country,
                       outstanding_balance, credit_limit, is_active, created_at
                FROM customers
                WHERE business_id = $1 AND is_deleted = false
            `;
            const params = [businessId];
            let idx = 2;

            if (search) {
                query += ` AND (name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx})`;
                params.push(`%${search}%`);
                idx++;
            }

            query += ` ORDER BY name ASC LIMIT $${idx} OFFSET $${idx + 1}`;
            params.push(limit, offset);

            const result = await client.query(query, params);
            const countRes = await client.query(
                `SELECT COUNT(*)::int as total FROM customers WHERE business_id = $1 AND is_deleted = false`,
                [businessId]
            );

            return NextResponse.json({
                success: true,
                customers: result.rows,
                total: countRes.rows[0].total,
                limit, offset
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('GET /api/v1/customers error:', error);
        return NextResponse.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 403 : 500 });
    }
}

/**
 * POST /api/v1/customers
 * Create a new customer
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { business_id: businessId, ...customerData } = body;
        if (!businessId) return NextResponse.json({ error: 'business_id required' }, { status: 400 });

        // Count current customers and enforce plan limit
        const countRes = await pool.query(
            `SELECT COUNT(*) FROM customers WHERE business_id = $1 AND is_active = true`,
            [businessId]
        );
        const currentCount = parseInt(countRes.rows[0].count, 10);

        await withGuard(businessId, {
            permission: 'customers.create',
            limitKey: 'max_customers',
            currentCount,
        });

        const client = await pool.connect();
        try {
            const result = await client.query(`
                INSERT INTO customers (
                    business_id, name, email, phone, address, city, state, country,
                    credit_limit, type, notes, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
                RETURNING *
            `, [
                businessId, customerData.name, customerData.email, customerData.phone,
                customerData.address, customerData.city, customerData.state,
                customerData.country || 'Pakistan', customerData.credit_limit || 0,
                customerData.type || 'individual', customerData.notes
            ]);

            return NextResponse.json({ success: true, customer: result.rows[0] }, { status: 201 });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('POST /api/v1/customers error:', error);
        const status = error.code === 'LIMIT_REACHED' ? 403
            : error.code === 'UNAUTHENTICATED' ? 401
            : error.code === 'PERMISSION_DENIED' ? 403
            : 500;
        return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
}

