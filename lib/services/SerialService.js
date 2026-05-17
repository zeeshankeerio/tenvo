import pool from '@/lib/db';
import { createModuleLogger } from '@/lib/services/logging/logger';

const log = createModuleLogger('serial-service');

/**
 * Serial Number Management Service
 * 2026 Enterprise Standards: Service-First Logic
 */
export const SerialService = {

    /**
     * Internal helper for database connection
     */
    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Create/Register a new serial number
     */
    async createSerial(serialData, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const {
                business_id, product_id, batch_id, warehouse_id,
                serial_number, notes
            } = serialData;

            // Auto-resolve Primary Warehouse if none provided
            let finalWarehouseId = warehouse_id;
            if (!finalWarehouseId) {
                const primaryRes = await client.query(`
                    SELECT id FROM warehouse_locations 
                    WHERE business_id = $1 AND is_primary = TRUE 
                    LIMIT 1
                `, [business_id]);
                if (primaryRes.rows.length > 0) {
                    finalWarehouseId = primaryRes.rows[0].id;
                }
            }

            const result = await client.query(`
                INSERT INTO product_serials (
                    business_id, product_id, batch_id, warehouse_id,
                    serial_number, status, notes
                ) VALUES ($1, $2, $3, $4, $5, 'in_stock', $6)
                RETURNING *
            `, [
                business_id, product_id, batch_id || null, finalWarehouseId || null,
                serial_number.toUpperCase(), notes || ''
            ]);

            log.info('Serial created', { serialId: result.rows[0].id, serialNumber: serial_number });
            return result.rows[0];
        } catch (error) {
            log.error('Create Serial Service Error', { error, serialData });
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Bulk Create Serials
     */
    async createBulkSerials(data, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const { business_id, product_id, serials } = data;
            const results = [];

            for (const serialNumber of serials) {
                const res = await client.query(`
                    INSERT INTO product_serials (
                        business_id, product_id, serial_number, status, notes
                    ) VALUES ($1, $2, $3, 'in_stock', 'Bulk Registration')
                    ON CONFLICT (business_id, serial_number) DO NOTHING
                    RETURNING *
                `, [business_id, product_id, serialNumber.toUpperCase()]);

                if (res.rows[0]) results.push(res.rows[0]);
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            log.info('Bulk serials created', { count: results.length, businessId: business_id });
            return { count: results.length, serials: results };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            log.error('Bulk Serial Service Error', { error, data });
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Sell a serial number
     */
    async sellSerial(businessId, serialNumber, customerId, invoiceId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const saleDate = new Date().toISOString().split('T')[0];
            const result = await client.query(`
                UPDATE product_serials 
                SET status = 'sold', customer_id = $1, invoice_id = $2, sale_date = $3, updated_at = NOW()
                WHERE serial_number = $4 AND business_id = $5 AND status = 'in_stock'
                RETURNING *
            `, [customerId, invoiceId, saleDate, serialNumber, businessId]);

            if (result.rows.length === 0) throw new Error('Serial not found or not in stock');
            
            log.info('Serial sold', { serialNumber, invoiceId });
            return result.rows[0];
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get all serials for a product
     */
    async getProductSerials(productId, businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const result = await client.query(
                'SELECT * FROM product_serials WHERE product_id = $1 AND business_id = $2 AND is_deleted = false ORDER BY created_at DESC',
                [productId, businessId]
            );
            return result.rows;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get available serials for a product
     */
    async getAvailableSerials(productId, businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const result = await client.query(
                `SELECT * FROM product_serials 
                 WHERE product_id = $1 
                 AND business_id = $2 
                 AND status = 'in_stock'
                 AND is_deleted = false
                 ORDER BY created_at ASC`,
                [productId, businessId]
            );
            return result.rows;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get specific serial detail
     */
    async getSerialDetail(businessId, serialNumber, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const result = await client.query(
                `SELECT ps.*, p.name as product_name, p.sku as product_sku
                 FROM product_serials ps
                 LEFT JOIN products p ON ps.product_id = p.id
                 WHERE ps.business_id = $1 AND ps.serial_number = $2 AND ps.is_deleted = false
                 LIMIT 1`,
                [businessId, serialNumber]
            );

            if (result.rows.length === 0) throw new Error('Serial number not found');
            return result.rows[0];
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Soft delete a serial
     */
    async deleteSerial(serialId, businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const result = await client.query(`
                UPDATE product_serials 
                SET is_deleted = true, deleted_at = NOW(), updated_at = NOW()
                WHERE id = $1 AND business_id = $2
                RETURNING id
            `, [serialId, businessId]);

            if (result.rows.length === 0) throw new Error('Serial not found');
            return true;
        } finally {
            if (!txClient) client.release();
        }
    }
};
