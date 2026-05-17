import pool from '@/lib/db';
import { createModuleLogger } from '@/lib/services/logging/logger';
import { checkPlanLimit } from '@/lib/auth/planGuard';

const log = createModuleLogger('warehouse-service');

/**
 * Warehouse Management Service
 * 2026 Enterprise Standards: Service-First Logic
 */
export const WarehouseService = {

    /**
     * Internal helper for database connection
     */
    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Get all warehouse locations for a business
     */
    async getWarehouses(businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const result = await client.query(`
                SELECT * FROM warehouse_locations 
                WHERE business_id = $1 
                ORDER BY name ASC
            `, [businessId]);
            return result.rows;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Create a new warehouse
     */
    async createWarehouse(data, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const { business_id: businessId } = data;

            // Plan Limit Check
            const countRes = await client.query(
                'SELECT COUNT(*)::int as count FROM warehouse_locations WHERE business_id = $1',
                [businessId]
            );
            await checkPlanLimit(businessId, 'max_warehouses', countRes.rows[0].count, client);

            // Handle Primary Logic
            if (data.is_primary || data.isPrimary) {
                await client.query('UPDATE warehouse_locations SET is_primary = FALSE WHERE business_id = $1', [businessId]);
            } else {
                if (countRes.rows[0].count === 0) {
                    data.is_primary = true;
                }
            }

            const result = await client.query(`
                INSERT INTO warehouse_locations (
                    business_id, name, address, city, type, code, contact_person, phone, email, is_active, is_primary
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `, [
                businessId,
                data.name,
                data.address || null,
                data.city || null,
                data.type || 'warehouse',
                data.code || null,
                data.contact_person || data.contactPerson || null,
                data.phone || null,
                data.email || null,
                data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true),
                data.is_primary || data.isPrimary || false
            ]);

            if (shouldManageTransaction) await client.query('COMMIT');
            log.info('Warehouse created', { warehouseId: result.rows[0].id, businessId });
            return result.rows[0];
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Update warehouse details
     */
    async updateWarehouse(warehouseId, businessId, updates, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const ALLOWED_FIELDS = [
                'name', 'address', 'city', 'type', 'code',
                'contact_person', 'phone', 'email', 'is_active', 'is_primary'
            ];

            const dbUpdates = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.address !== undefined) dbUpdates.address = updates.address;
            if (updates.city !== undefined) dbUpdates.city = updates.city;
            if (updates.type !== undefined) dbUpdates.type = updates.type;
            if (updates.code !== undefined) dbUpdates.code = updates.code;
            if (updates.contact_person !== undefined) dbUpdates.contact_person = updates.contact_person;
            if (updates.contactPerson !== undefined) dbUpdates.contact_person = updates.contactPerson;
            if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
            if (updates.email !== undefined) dbUpdates.email = updates.email;
            if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
            if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
            if (updates.is_primary !== undefined) dbUpdates.is_primary = updates.is_primary;
            if (updates.isPrimary !== undefined) dbUpdates.is_primary = updates.isPrimary;

            if (dbUpdates.is_primary) {
                await client.query('UPDATE warehouse_locations SET is_primary = FALSE WHERE business_id = $1', [businessId]);
            }

            const fields = Object.keys(dbUpdates).filter(f => ALLOWED_FIELDS.includes(f));
            const values = fields.map(f => dbUpdates[f]);

            if (fields.length === 0) throw new Error('No valid fields to update');

            const setClause = fields.map((f, i) => `"${f}" = $${i + 3}`).join(', ');
            const result = await client.query(`
                UPDATE warehouse_locations 
                SET ${setClause}, updated_at = NOW()
                WHERE id = $1 AND business_id = $2
                RETURNING *
            `, [warehouseId, businessId, ...values]);

            if (result.rows.length === 0) throw new Error('Warehouse not found');

            if (shouldManageTransaction) await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Delete a warehouse
     */
    async deleteWarehouse(warehouseId, businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            // Check for stock
            const stockCheck = await client.query(`
                SELECT SUM(quantity) as total_stock 
                FROM product_stock_locations 
                WHERE warehouse_id = $1 AND business_id = $2
            `, [warehouseId, businessId]);

            if (parseFloat(stockCheck.rows[0]?.total_stock || 0) > 0) {
                throw new Error('Cannot delete location with existing stock. Please transfer stock first.');
            }

            const result = await client.query(`
                DELETE FROM warehouse_locations 
                WHERE id = $1 AND business_id = $2
                RETURNING id
            `, [warehouseId, businessId]);

            if (result.rows.length === 0) throw new Error('Warehouse not found');
            return true;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get stock levels across all locations for a business
     */
    async getLocationStock(businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const result = await client.query(`
                SELECT psl.*, w.name as warehouse_name, p.name as product_name
                FROM product_stock_locations psl
                JOIN warehouse_locations w ON psl.warehouse_id = w.id
                JOIN products p ON psl.product_id = p.id
                WHERE psl.business_id = $1
            `, [businessId]);
            return result.rows;
        } finally {
            if (!txClient) client.release();
        }
    }
};
