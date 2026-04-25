'use server';

import pool from '@/lib/db';
import { checkPlanLimit } from '@/lib/auth/planGuard';
import { withGuard } from '@/lib/rbac/serverGuard';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';

async function checkAuthAndPlan(businessId, client = null, permission = 'warehouses.view', feature = 'multi_warehouse') {
    const { session } = await withGuard(businessId, { permission, feature, client });
    return session;
}

/**
 * Server Action: Get all warehouse locations for a business
 */
export async function getWarehouseLocationsAction(businessId) {
    try {
        const client = await pool.connect();
        try {
            await checkAuthAndPlan(businessId, client, 'warehouses.view', 'multi_warehouse');
            const result = await client.query(`
                SELECT * FROM warehouse_locations 
                WHERE business_id = $1 
                ORDER BY name ASC
            `, [businessId]);

            return { success: true, locations: result.rows };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Get warehouse locations error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Create warehouse location
 * ✅ Enhanced with Zod validation
 */
export async function createWarehouseLocationAction(locationData) {
    try {
        await checkAuthAndPlan(locationData.business_id, null, 'warehouses.manage', 'multi_warehouse');

        const countClient = await pool.connect();
        try {
            const countResult = await countClient.query(
                'SELECT COUNT(*)::int as count FROM warehouse_locations WHERE business_id = $1',
                [locationData.business_id]
            );
            await checkPlanLimit(locationData.business_id, 'max_warehouses', countResult.rows[0].count, countClient);
        } finally {
            countClient.release();
        }

        // ✅ VALIDATION: Validate input data
        const { createWarehouseLocationSchema } = await import('@/lib/validation/schemas');
        const validated = createWarehouseLocationSchema.safeParse(locationData);

        if (!validated.success) {
            const errors = validated.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return { success: false, error: `Validation failed: ${errors}` };
        }

        const data = validated.data;

        const client = await pool.connect();
        try {
            // Ensure only one primary location per business
            if (data.isPrimary || data.is_primary) {
                await client.query(`
                    UPDATE warehouse_locations 
                    SET is_primary = FALSE 
                    WHERE business_id = $1
                `, [data.business_id]);
            } else {
                // If it's the first location, make it primary
                const countRes = await client.query('SELECT COUNT(*) FROM warehouse_locations WHERE business_id = $1', [data.business_id]);
                if (parseInt(countRes.rows[0].count) === 0) {
                    data.isPrimary = true;
                }
            }

            const result = await client.query(`
                INSERT INTO warehouse_locations (
                    business_id, name, address, city, type, code, contact_person, phone, email, is_active, is_primary
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `, [
                data.business_id,
                data.name,
                data.address || null,
                data.city || null,
                data.type || 'warehouse',
                data.code || null,
                data.contactPerson || data.contact_person || null,
                data.phone || null,
                data.email || null,
                data.isActive !== undefined ? data.isActive : (data.is_active !== undefined ? data.is_active : true),
                data.isPrimary || data.is_primary || false
            ]);

            return { success: true, location: result.rows[0] };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Create warehouse location error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Update warehouse location
 */
export async function updateWarehouseLocationAction(businessId, locationId, updates) {
    try {
        await checkAuthAndPlan(businessId, null, 'warehouses.manage', 'multi_warehouse');

        // ✅ SECURITY FIX: Whitelist allowed fields to prevent SQL injection
        const ALLOWED_FIELDS = [
            'name', 'address', 'city', 'type', 'code',
            'contact_person', 'phone', 'email', 'is_active', 'is_primary'
        ];

        // Map camelCase UI fields to snake_case DB fields
        const dbUpdates = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.address !== undefined) dbUpdates.address = updates.address;
        if (updates.city !== undefined) dbUpdates.city = updates.city;
        if (updates.type !== undefined) dbUpdates.type = updates.type;
        if (updates.code !== undefined) dbUpdates.code = updates.code;
        if (updates.contactPerson !== undefined) dbUpdates.contact_person = updates.contactPerson;
        if (updates.contact_person !== undefined) dbUpdates.contact_person = updates.contact_person;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
        if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
        if (updates.isPrimary !== undefined) dbUpdates.is_primary = updates.isPrimary;
        if (updates.is_primary !== undefined) dbUpdates.is_primary = updates.is_primary;

        const client = await pool.connect();
        try {
            if (dbUpdates.is_primary) {
                await client.query(`
                    UPDATE warehouse_locations 
                    SET is_primary = FALSE 
                    WHERE business_id = $1
                `, [businessId]);
            }

            // ✅ SECURITY FIX: Filter to only allowed fields
            const fields = Object.keys(dbUpdates).filter(field => ALLOWED_FIELDS.includes(field));
            const values = fields.map(field => dbUpdates[field]);

            if (fields.length === 0) {
                return { success: false, error: 'No valid fields to update' };
            }

            // ✅ SAFE: Using whitelisted fields only
            const setClause = fields.map((field, idx) => `"${field}" = $${idx + 3}`).join(', ');

            const result = await client.query(`
                UPDATE warehouse_locations 
                SET ${setClause}, updated_at = NOW()
                WHERE id = $1 AND business_id = $2
                RETURNING *
            `, [locationId, businessId, ...values]);

            if (result.rows.length === 0) {
                return { success: false, error: 'Warehouse location not found' };
            }

            return { success: true, location: result.rows[0] };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Update warehouse location error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Get location stock levels
 */
export async function getLocationStockAction(businessId) {
    try {
        await checkAuthAndPlan(businessId, null, 'warehouses.view', 'multi_warehouse');

        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT * FROM product_stock_locations 
                WHERE business_id = $1
            `, [businessId]);

            return { success: true, stockLevels: result.rows };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Get location stock error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Delete warehouse location
 */
export async function deleteWarehouseLocationAction(businessId, locationId) {
    try {
        await checkAuthAndPlan(businessId, null, 'warehouses.manage', 'multi_warehouse');

        const client = await pool.connect();
        try {
            // Assert warehouse belongs to business before deleting
            await assertEntityBelongsToBusiness(client, 'warehouse', locationId, businessId);
            
            // Check if there's stock at this location before deleting
            const stockCheck = await client.query(`
                SELECT SUM(quantity) as total_stock 
                FROM product_stock_locations 
                WHERE warehouse_id = $1 AND business_id = $2
            `, [locationId, businessId]);

            if (stockCheck.rows[0]?.total_stock > 0) {
                return { success: false, error: 'Cannot delete location with existing stock. Please transfer stock first.' };
            }

            await client.query(`
                DELETE FROM warehouse_locations 
                WHERE id = $1 AND business_id = $2
            `, [locationId, businessId]);

            return { success: true };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Delete warehouse location error:', error);
        return { success: false, error: error.message };
    }
}
