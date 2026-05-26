export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
    const runtimeMigrationEnabled = process.env.ALLOW_RUNTIME_MIGRATION === 'true';
    const maintenanceKey = process.env.MAINTENANCE_API_KEY;
    const providedKey = request.headers.get('x-maintenance-key');

    if (!runtimeMigrationEnabled) {
        return NextResponse.json(
            { success: false, error: 'Runtime migrations are disabled. Use Prisma migrations instead.' },
            { status: 403 }
        );
    }

    if (!maintenanceKey || providedKey !== maintenanceKey) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized maintenance request' },
            { status: 401 }
        );
    }

    const client = await pool.connect();
    try {
        await client.query(`
      ALTER TABLE businesses 
      ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
    `);
        await client.query(`
      ALTER TABLE journal_entries 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'posted';
    `);
        await client.query(`
      ALTER TABLE payments 
      ADD COLUMN IF NOT EXISTS status      VARCHAR(20)  DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS is_deleted  BOOLEAN      DEFAULT false,
      ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS domain_data JSONB        DEFAULT '{}'::jsonb;
    `);
        await client.query(`
      ALTER TABLE purchase_items 
      ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
    `);
        return NextResponse.json({ success: true, message: 'Migration successful' });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}

