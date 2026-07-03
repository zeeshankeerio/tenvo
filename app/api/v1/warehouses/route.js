export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { WarehouseService } from '@/lib/services/WarehouseService';
import { withGuard } from '@/lib/rbac/serverGuard';

/**
 * GET /api/v1/warehouses?businessId=xxx
 * List all warehouses for a business
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get('businessId');
        if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

        await withGuard(businessId, { permission: 'warehouses.view' });

        const result = await WarehouseService.getWarehouses(businessId);
        return NextResponse.json({ success: true, warehouses: result });
    } catch (error) {
        console.error('GET /api/v1/warehouses error:', error);
        return NextResponse.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 403 : 500 });
    }
}

/**
 * POST /api/v1/warehouses
 * Create a new warehouse
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { business_id: businessId, ...warehouseData } = body;
        if (!businessId) return NextResponse.json({ error: 'business_id required' }, { status: 400 });

        // Count current warehouses for plan limit check
        const countRes = await pool.query(
            `SELECT COUNT(*) FROM warehouses WHERE business_id = $1 AND (deleted_at IS NULL OR deleted_at > NOW())`,
            [businessId]
        );
        const currentCount = parseInt(countRes.rows[0].count, 10);

        await withGuard(businessId, {
            permission: 'warehouses.manage',
            limitKey: 'max_warehouses',
            currentCount,
        });

        const warehouse = await WarehouseService.createWarehouse({ ...warehouseData, business_id: businessId });
        return NextResponse.json({ success: true, warehouse }, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/warehouses error:', error);
        const status = error.code === 'LIMIT_REACHED' ? 403
            : error.code === 'UNAUTHENTICATED' ? 401
            : error.code === 'PERMISSION_DENIED' ? 403
            : 500;
        return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
}

