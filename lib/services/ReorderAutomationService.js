import pool from '@/lib/db';
import { z } from 'zod';

/**
 * Reorder Automation Service
 * Handles reorder point logic, PO generation, and low-stock alerts
 * 2026 Best Practice: Automated supply chain optimization
 */

const reorderConfigSchema = z.object({
    product_id: z.string().uuid('Invalid product ID'),
    min_stock_level: z.number().positive('Min stock must be > 0'),
    reorder_quantity: z.number().positive('Reorder quantity must be > 0'),
    lead_time_days: z.number().int().nonnegative('Lead time cannot be negative'),
    warehouse_id: z.string().uuid().optional(),
    enabled: z.boolean().default(true),
});

export const ReorderAutomationService = {
    
    /**
     * Get reorder configuration for a product
     */
    async getReorderConfig(businessId, productId, warehouseId = null) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT 
                    id, product_id, min_stock_level, reorder_quantity,
                    lead_time_days, warehouse_id, enabled, created_at, updated_at
                FROM reorder_points
                WHERE business_id = $1 AND product_id = $2
                    ${warehouseId ? 'AND warehouse_id = $3' : ''}
                LIMIT 1
            `;
            const params = warehouseId ? [businessId, productId, warehouseId] : [businessId, productId];
            const res = await client.query(query, params);
            return res.rows[0] || null;
        } finally {
            client.release();
        }
    },

    /**
     * Set reorder configuration (create or update)
     */
    async setReorderConfig(businessId, config) {
        const client = await pool.connect();
        try {
            reorderConfigSchema.parse(config);

            const existing = await this.getReorderConfig(
                businessId,
                config.product_id,
                config.warehouse_id
            );

            if (existing) {
                const res = await client.query(`
                    UPDATE reorder_points
                    SET min_stock_level = $1, reorder_quantity = $2, 
                        lead_time_days = $3, enabled = $4, updated_at = NOW()
                    WHERE id = $5 RETURNING *
                `, [
                    config.min_stock_level,
                    config.reorder_quantity,
                    config.lead_time_days,
                    config.enabled,
                    existing.id
                ]);
                return res.rows[0];
            } else {
                const res = await client.query(`
                    INSERT INTO reorder_points
                    (business_id, product_id, warehouse_id, min_stock_level, 
                     reorder_quantity, lead_time_days, enabled)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                `, [
                    businessId,
                    config.product_id,
                    config.warehouse_id || null,
                    config.min_stock_level,
                    config.reorder_quantity,
                    config.lead_time_days,
                    config.enabled !== false
                ]);
                return res.rows[0];
            }
        } finally {
            client.release();
        }
    },

    /**
     * Check inventory and trigger reorders for products below min stock
     * Returns list of products that need reordering
     */
    async checkAndTriggerReorders(businessId, warehouseId = null) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get all enabled reorder configs
            const configQuery = `
                SELECT rp.*, p.name, p.sku, NULL::uuid as vendor_id, NULL::text as vendor_name
                FROM reorder_points rp
                JOIN products p ON p.id = rp.product_id
                WHERE rp.business_id = $1 AND rp.enabled = TRUE
                    ${warehouseId ? 'AND rp.warehouse_id = $2' : ''}
            `;
            const configParams = warehouseId ? [businessId, warehouseId] : [businessId];
            const configRes = await client.query(configQuery, configParams);

            const reorderCandidates = [];

            for (const config of configRes.rows) {
                // Get current stock level
                const stockQuery = `
                    SELECT COALESCE(SUM(quantity), 0) as current_stock
                    FROM product_stock_location
                    WHERE product_id = $1 AND warehouse_id = $2 AND state = 'sellable'
                `;
                const stockRes = await client.query(stockQuery, [
                    config.product_id,
                    config.warehouse_id || (await this.getPrimaryWarehouse(businessId, client))
                ]);

                const currentStock = stockRes.rows[0].current_stock;

                // Calculate reorder point: min_stock + (daily_usage * lead_time)
                // For now, use simple min_stock check; enhance with demand forecasting later
                if (currentStock < config.min_stock_level) {
                    reorderCandidates.push({
                        product_id: config.product_id,
                        product_name: config.name,
                        product_sku: config.sku,
                        current_stock: currentStock,
                        min_stock_level: config.min_stock_level,
                        reorder_quantity: config.reorder_quantity,
                        vendor_id: config.vendor_id,
                        vendor_name: config.vendor_name,
                        lead_time_days: config.lead_time_days,
                        warehouse_id: config.warehouse_id,
                    });

                    // Create low stock alert
                    await client.query(`
                        INSERT INTO low_stock_alerts
                        (business_id, product_id, warehouse_id, current_stock, min_stock_level, status, created_at)
                        VALUES ($1, $2, $3, $4, $5, 'active', NOW())
                        ON CONFLICT (business_id, product_id, warehouse_id, status)
                        DO UPDATE SET created_at = NOW()
                    `, [
                        businessId,
                        config.product_id,
                        config.warehouse_id,
                        currentStock,
                        config.min_stock_level
                    ]);
                }
            }

            await client.query('COMMIT');
            return reorderCandidates;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Get low stock alerts for dashboard
     */
    async getLowStockAlerts(businessId, limit = 20) {
        const client = await pool.connect();
        try {
            const res = await client.query(`
                SELECT 
                    lsa.id, lsa.product_id, lsa.warehouse_id, lsa.current_stock,
                    lsa.min_stock_level, lsa.status, lsa.created_at,
                    p.name as product_name, p.sku, p.price as selling_price,
                    wl.name as warehouse_name
                FROM low_stock_alerts lsa
                JOIN products p ON p.id = lsa.product_id
                LEFT JOIN warehouse_locations wl ON wl.id = lsa.warehouse_id
                WHERE lsa.business_id = $1 AND lsa.status = 'active'
                ORDER BY lsa.created_at DESC
                LIMIT $2
            `, [businessId, limit]);
            return res.rows;
        } finally {
            client.release();
        }
    },

    /**
     * Dismiss a low stock alert
     */
    async dismissLowStockAlert(alertId, businessId) {
        const client = await pool.connect();
        try {
            const res = await client.query(`
                UPDATE low_stock_alerts
                SET status = 'dismissed', updated_at = NOW()
                WHERE id = $1 AND business_id = $2::uuid
                RETURNING *
            `, [alertId, businessId]);
            return res.rows[0] || null;
        } finally {
            client.release();
        }
    },

    /**
     * Get primary warehouse for business
     */
    async getPrimaryWarehouse(businessId, client = null) {
        const conn = client || await pool.connect();
        try {
            const res = await conn.query(`
                SELECT id FROM warehouse_locations
                WHERE business_id = $1 AND is_primary = TRUE
                LIMIT 1
            `, [businessId]);
            return res.rows[0]?.id;
        } finally {
            if (!client) conn.release();
        }
    },

    /**
     * Calculate ABC analysis for inventory optimization
     * A: High-value, frequently sold items (control tightly)
     * B: Medium-value, moderate sales
     * C: Low-value, slow movers (looser control)
     */
    async calculateABCAnalysis(businessId, period_days = 90) {
        const client = await pool.connect();
        try {
            const query = `
                WITH sales_data AS (
                    SELECT 
                        p.id,
                        p.name,
                        p.sku,
                        p.price as selling_price,
                        SUM(ii.quantity) as total_qty,
                        SUM(ii.quantity * ii.unit_price) as total_value,
                        ROW_NUMBER() OVER (ORDER BY SUM(ii.quantity * ii.unit_price) DESC) as rank_num
                    FROM products p
                    LEFT JOIN invoice_items ii ON ii.product_id = p.id
                    LEFT JOIN invoices i ON i.id = ii.invoice_id
                    WHERE p.business_id = $1
                        AND i.date >= NOW() - INTERVAL '${period_days} days'
                    GROUP BY p.id, p.name, p.sku, p.price
                ),
                total_value AS (
                    SELECT SUM(total_value) as grand_total FROM sales_data
                ),
                cum_value AS (
                    SELECT 
                        *,
                        SUM(total_value) OVER (ORDER BY rank_num) as cumulative_value,
                        (SUM(total_value) OVER (ORDER BY rank_num) / tv.grand_total * 100) as cumulative_pct
                    FROM sales_data, total_value tv
                )
                SELECT 
                    id, name, sku, selling_price, total_qty, total_value,
                    CASE 
                        WHEN cumulative_pct <= 80 THEN 'A'
                        WHEN cumulative_pct <= 95 THEN 'B'
                        ELSE 'C'
                    END as abc_category,
                    cumulative_pct as pct_of_total_value
                FROM cum_value
                WHERE total_qty > 0 OR total_value > 0
                ORDER BY rank_num
            `;

            const res = await client.query(query, [businessId]);
            return res.rows;
        } finally {
            client.release();
        }
    },

    /**
     * Create reorder PO suggestion for products below min stock
     * This returns a pre-populated PO that can be approved by user
     */
    async generateReorderPOSuggestion(businessId, warehouseId = null) {
        try {
            const reorderCandidates = await this.checkAndTriggerReorders(businessId, warehouseId);
            
            if (reorderCandidates.length === 0) {
                return null;
            }

            // Group by vendor for efficient ordering
            const byVendor = {};
            reorderCandidates.forEach(item => {
                const vendorId = item.vendor_id || 'no-vendor';
                if (!byVendor[vendorId]) {
                    byVendor[vendorId] = {
                        vendor_id: item.vendor_id,
                        vendor_name: item.vendor_name || 'Unknown Vendor',
                        items: [],
                        total_value: 0
                    };
                }
                const itemCost = (item.reorder_quantity * 50); // Placeholder unit cost; should fetch from vendor price list
                byVendor[vendorId].items.push({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    product_sku: item.product_sku,
                    quantity: item.reorder_quantity,
                    current_stock: item.current_stock,
                    min_stock: item.min_stock_level,
                });
                byVendor[vendorId].total_value += itemCost;
            });

            return Object.values(byVendor);
        } catch (error) {
            console.error('Error generating reorder PO suggestions:', error);
            throw error;
        }
    }
};
