import pool from '@/lib/db';
import { createModuleLogger } from '@/lib/services/logging/logger';

const log = createModuleLogger('batch-service');

/**
 * Batch Management Service
 * Handles batch tracking, FEFO/FIFO allocation, expiry management
 * 2026 Enterprise Standards: Service-First Logic
 */
export const BatchService = {

    /**
     * Internal helper for database connection
     */
    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Create a new batch
     */
    async createBatch(batchData, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            // Auto-resolve Primary Warehouse if none provided
            if (!batchData.warehouse_id) {
                const primaryRes = await client.query(`
                    SELECT id FROM warehouse_locations 
                    WHERE business_id = $1 AND is_primary = TRUE 
                    LIMIT 1
                `, [batchData.business_id]);
                if (primaryRes.rows.length > 0) {
                    batchData.warehouse_id = primaryRes.rows[0].id;
                }
            }

            const fields = [
                'business_id',
                'product_id',
                'batch_number',
                'quantity',
                'manufacturing_date',
                'expiry_date',
                'cost_price',
                'mrp',
                'warehouse_id',
                'notes',
                'domain_data'
            ];

            const values = fields.map(f => batchData[f] ?? null);
            const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

            const query = `
                INSERT INTO product_batches (${fields.join(', ')})
                VALUES (${placeholders})
                RETURNING *
            `;

            const result = await client.query(query, values);
            log.info('Batch created', { batchId: result.rows[0].id, productId: batchData.product_id });
            return result.rows[0];
        } catch (error) {
            log.error('Create Batch Service Error', { error, batchData });
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get batches for a product
     */
    async getProductBatches(productId, businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const result = await client.query(
                `SELECT * FROM product_batches 
                 WHERE product_id = $1 AND business_id = $2 
                 AND is_deleted = false
                 ORDER BY expiry_date ASC NULLS LAST`,
                [productId, businessId]
            );
            return result.rows;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Update an existing batch
     */
    async updateBatch(batchId, businessId, updates, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const allowedColumns = [
                'batch_number', 'manufacturing_date', 'expiry_date',
                'quantity', 'reserved_quantity', 'cost_price', 'mrp',
                'notes', 'is_active', 'domain_data'
            ];

            const safeUpdates = Object.entries(updates)
                .filter(([key]) => allowedColumns.includes(key));

            if (safeUpdates.length === 0) {
                throw new Error('No valid fields to update');
            }

            const fields = safeUpdates.map(([key]) => key);
            const values = safeUpdates.map(([, val]) => val);
            const setClause = fields.map((f, i) => `"${f}" = $${i + 3}`).join(', ');

            const query = `
                UPDATE product_batches 
                SET ${setClause}, updated_at = NOW()
                WHERE id = $1 AND business_id = $2
                RETURNING *
            `;

            const result = await client.query(query, [batchId, businessId, ...values]);
            if (result.rows.length === 0) throw new Error('Batch not found');

            return result.rows[0];
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Soft delete a batch
     */
    async deleteBatch(batchId, businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const result = await client.query(
                'UPDATE product_batches SET is_deleted = true, deleted_at = NOW(), is_active = false WHERE id = $1 AND business_id = $2 RETURNING id',
                [batchId, businessId]
            );
            if (result.rows.length === 0) throw new Error('Batch not found');
            return true;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Update batch quantity (Atomic)
     */
    async updateBatchQuantity(batchId, businessId, quantityChange, isReservation = false, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const field = isReservation ? 'reserved_quantity' : 'quantity';
            const result = await client.query(
                `UPDATE product_batches 
                 SET ${field} = COALESCE(${field}, 0) + $1, updated_at = NOW() 
                 WHERE id = $2 AND business_id = $3
                 RETURNING *`,
                [quantityChange, batchId, businessId]
            );
            if (result.rows.length === 0) throw new Error('Batch not found');
            return result.rows[0];
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get expiring batches
     */
    async getExpiringBatches(businessId, daysThreshold = 30, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const result = await client.query(
                `SELECT pb.*, p.name as product_name
                 FROM product_batches pb
                 JOIN products p ON pb.product_id = p.id
                 WHERE pb.business_id = $1
                   AND pb.expiry_date IS NOT NULL
                   AND pb.expiry_date > CURRENT_DATE
                   AND pb.expiry_date <= CURRENT_DATE + $2
                   AND pb.is_active = true
                   AND pb.is_deleted = false
                   AND pb.quantity > 0
                 ORDER BY pb.expiry_date ASC`,
                [businessId, daysThreshold]
            );
            return result.rows;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get available batches (Qty > 0 & Not Expired)
     */
    async getAvailableBatches(productId, businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const result = await client.query(
                `SELECT * FROM product_batches 
                 WHERE product_id = $1 
                 AND business_id = $2 
                 AND quantity > 0
                 AND is_active = true
                 AND is_deleted = false
                 AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
                 ORDER BY expiry_date ASC NULLS LAST`,
                [productId, businessId]
            );
            return result.rows;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Allocate batches for sale using FEFO (First Expiry First Out)
     */
    async allocateBatchesFEFO(productId, businessId, quantityNeeded, warehouseId = null, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            let query = `
                SELECT id, batch_number, quantity, reserved_quantity, cost_price, expiry_date,
                       (quantity - COALESCE(reserved_quantity, 0)) AS available_quantity
                FROM product_batches
                WHERE product_id = $1 AND business_id = $2
                  AND is_active = true AND is_deleted = false
                  AND (quantity - COALESCE(reserved_quantity, 0)) > 0
                  AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
            `;
            const params = [productId, businessId];

            if (warehouseId) {
                query += ` AND warehouse_id = $${params.length + 1}`;
                params.push(warehouseId);
            }

            query += ` ORDER BY expiry_date ASC NULLS LAST, created_at ASC`;

            const res = await client.query(query, params);
            const batches = res.rows;

            const allocation = [];
            let remainingQuantity = quantityNeeded;

            for (const batch of batches) {
                if (remainingQuantity <= 0) break;

                const availableInBatch = Number(batch.available_quantity);
                if (availableInBatch <= 0) continue;

                const allocateFromBatch = Math.min(availableInBatch, remainingQuantity);

                allocation.push({
                    batchId: batch.id,
                    batchNumber: batch.batch_number,
                    quantity: allocateFromBatch,
                    unitCost: Number(batch.cost_price),
                    expiryDate: batch.expiry_date
                });

                remainingQuantity -= allocateFromBatch;
            }

            if (remainingQuantity > 0) {
                throw new Error(`Insufficient stock. Need ${quantityNeeded}, available ${quantityNeeded - remainingQuantity}`);
            }

            log.info('FEFO allocation completed', { productId, allocated: allocation.length, totalQty: quantityNeeded });
            return allocation;
        } catch (error) {
            log.error('FEFO Allocation Error', { error, productId, quantityNeeded });
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Allocate batches using FIFO (First In First Out)
     */
    async allocateBatchesFIFO(productId, businessId, quantityNeeded, warehouseId = null, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            let query = `
                SELECT id, batch_number, quantity, reserved_quantity, cost_price, expiry_date, created_at,
                       (quantity - COALESCE(reserved_quantity, 0)) AS available_quantity
                FROM product_batches
                WHERE product_id = $1 AND business_id = $2
                  AND is_active = true AND is_deleted = false
                  AND (quantity - COALESCE(reserved_quantity, 0)) > 0
            `;
            const params = [productId, businessId];

            if (warehouseId) {
                query += ` AND warehouse_id = $${params.length + 1}`;
                params.push(warehouseId);
            }

            query += ` ORDER BY created_at ASC`;

            const res = await client.query(query, params);
            const batches = res.rows;

            const allocation = [];
            let remainingQuantity = quantityNeeded;

            for (const batch of batches) {
                if (remainingQuantity <= 0) break;

                const availableInBatch = Number(batch.available_quantity);
                if (availableInBatch <= 0) continue;

                const allocateFromBatch = Math.min(availableInBatch, remainingQuantity);

                allocation.push({
                    batchId: batch.id,
                    batchNumber: batch.batch_number,
                    quantity: allocateFromBatch,
                    unitCost: Number(batch.cost_price),
                    expiryDate: batch.expiry_date,
                    createdAt: batch.created_at,
                });

                remainingQuantity -= allocateFromBatch;
            }

            if (remainingQuantity > 0) {
                throw new Error(`Insufficient stock (FIFO). Need ${quantityNeeded}, available ${quantityNeeded - remainingQuantity}`);
            }

            log.info('FIFO allocation completed', { productId, allocated: allocation.length, totalQty: quantityNeeded });
            return allocation;
        } catch (error) {
            log.error('FIFO Allocation Error', { error, productId, quantityNeeded });
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get all expired batches
     */
    async getExpiredBatches(businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const res = await client.query(`
                SELECT pb.*, p.name AS product_name, p.sku
                FROM product_batches pb
                JOIN products p ON pb.product_id = p.id
                WHERE pb.business_id = $1
                  AND pb.is_active = true AND pb.is_deleted = false
                  AND pb.expiry_date IS NOT NULL
                  AND pb.expiry_date < CURRENT_DATE
                  AND pb.quantity > 0
                ORDER BY pb.expiry_date ASC
            `, [businessId]);

            return res.rows;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Deactivate all expired batches
     */
    async deactivateExpiredBatches(businessId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const res = await client.query(`
                UPDATE product_batches pb
                SET is_active = false,
                    updated_at = NOW()
                FROM products p
                WHERE pb.product_id = p.id
                  AND pb.business_id = $1
                  AND pb.is_active = true AND pb.is_deleted = false
                  AND pb.expiry_date IS NOT NULL
                  AND pb.expiry_date < CURRENT_DATE
                  AND pb.quantity > 0
                RETURNING pb.id, pb.batch_number, pb.product_id, pb.quantity, pb.expiry_date, 
                          p.name AS product_name, p.sku
            `, [businessId]);

            const deactivated = res.rows;

            // Update product stock levels for affected products
            const affectedProductIds = [...new Set(deactivated.map(b => b.product_id))];
            for (const productId of affectedProductIds) {
                await client.query(`
                    UPDATE products 
                    SET stock = COALESCE((
                        SELECT SUM(quantity - COALESCE(reserved_quantity, 0))
                        FROM product_batches 
                        WHERE product_id = $1 AND is_active = true AND is_deleted = false
                    ), 0),
                    updated_at = NOW()
                    WHERE id = $1 AND business_id = $2
                `, [productId, businessId]);
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return deactivated;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    }
};
