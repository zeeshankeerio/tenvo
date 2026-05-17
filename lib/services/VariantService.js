import pool from '@/lib/db';
import { createModuleLogger } from '@/lib/services/logging/logger';

const log = createModuleLogger('variant-service');

/**
 * Variant Management Service
 * 2026 Enterprise Standards: Service-First Logic
 */
export const VariantService = {

    /**
     * Internal helper for database connection
     */
    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Create a new variant
     */
    async createVariant(variantData, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const {
                business_id, product_id, variant_sku, variant_name,
                size, color, pattern, material, custom_attributes,
                price, cost_price, mrp, stock, min_stock, image_url
            } = variantData;

            const result = await client.query(`
                INSERT INTO product_variants (
                    business_id, product_id, variant_sku, variant_name,
                    size, color, pattern, material, custom_attributes,
                    price, cost_price, mrp, stock, min_stock, image_url
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *
            `, [
                business_id, product_id, variant_sku, variant_name,
                size, color, pattern, material, custom_attributes || {},
                price || 0, cost_price || 0, mrp || 0, stock || 0, min_stock || 0, image_url
            ]);

            log.info('Variant created', { variantId: result.rows[0].id, sku: variant_sku });
            return result.rows[0];
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get variants for a product
     */
    async getProductVariants(productId, businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const result = await client.query(
                'SELECT * FROM product_variants WHERE product_id = $1 AND business_id = $2 AND is_active = true AND is_deleted = false ORDER BY size, color',
                [productId, businessId]
            );
            return result.rows;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Update variant stock atomically
     */
    async updateVariantStock(variantId, businessId, quantityChange, reason = 'Adjustment', txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const result = await client.query(`
                UPDATE product_variants 
                SET stock = stock + $1, updated_at = NOW()
                WHERE id = $2 AND business_id = $3
                RETURNING *
            `, [quantityChange, variantId, businessId]);

            if (result.rows.length === 0) throw new Error('Variant not found');
            const variant = result.rows[0];

            // Record movement
            await client.query(`
                INSERT INTO stock_movements (
                    business_id, product_id, variant_id, movement_type, 
                    transaction_type, quantity_change, unit_cost, reference_type, notes
                ) VALUES ($1, $2, $3, $4, 'adjustment', $5, $6, 'adjustment', $7)
            `, [
                businessId, variant.product_id, variantId,
                quantityChange > 0 ? 'adjustment_in' : 'adjustment_out',
                quantityChange, variant.cost_price || 0, reason
            ]);

            if (shouldManageTransaction) await client.query('COMMIT');
            return variant;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Search variants with filters
     */
    async searchVariants(businessId, filters = {}, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const fields = ['business_id = $1', 'is_active = true', 'is_deleted = false'];
            const values = [businessId];
            let idx = 2;

            if (filters.size) { fields.push(`size = $${idx++}`); values.push(filters.size); }
            if (filters.color) { fields.push(`color = $${idx++}`); values.push(filters.color); }
            if (filters.productId) { fields.push(`product_id = $${idx++}`); values.push(filters.productId); }

            const result = await client.query(`
                SELECT * FROM product_variants 
                WHERE ${fields.join(' AND ')}
            `, values);

            return result.rows;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Create variant matrix
     */
    async createVariantMatrix(data, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const {
                business_id, product_id, sizes, colors,
                base_price, base_cost_price, base_mrp
            } = data;

            const results = [];
            for (const size of sizes) {
                for (const color of colors) {
                    const variantSku = `${product_id}-${size}-${color}`.toUpperCase();
                    const variantName = `${size} - ${color}`;

                    const res = await client.query(`
                        INSERT INTO product_variants (
                            business_id, product_id, variant_sku, variant_name,
                            size, color, price, cost_price, mrp, stock
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0)
                        ON CONFLICT (business_id, variant_sku) DO NOTHING
                        RETURNING *
                    `, [
                        business_id, product_id, variantSku, variantName,
                        size, color, base_price, base_cost_price, base_mrp
                    ]);
                    if (res.rows[0]) results.push(res.rows[0]);
                }
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return { count: results.length, variants: results };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get variant matrix for UI
     */
    async getVariantMatrix(productId, businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const result = await client.query(
                'SELECT * FROM product_variants WHERE product_id = $1 AND business_id = $2 AND is_active = true AND is_deleted = false',
                [productId, businessId]
            );
            const variants = result.rows;

            const sizes = [...new Set(variants.map(v => v.size))].filter(Boolean).sort();
            const colors = [...new Set(variants.map(v => v.color))].filter(Boolean).sort();

            const matrix = {};
            variants.forEach(v => {
                const key = `${v.size}-${v.color}`;
                matrix[key] = {
                    id: v.id,
                    sku: v.variant_sku,
                    stock: v.stock,
                    price: v.price,
                    isLowStock: v.stock <= (v.min_stock || 0)
                };
            });

            return { sizes, colors, matrix };
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Update variant pricing
     */
    async updateVariantPricing(variantId, businessId, pricingData, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const setClauses = [];
            const values = [];
            let idx = 1;

            if (pricingData.price !== undefined) {
                setClauses.push(`price = $${idx++}`);
                values.push(pricingData.price);
            }
            if (pricingData.costPrice !== undefined || pricingData.cost_price !== undefined) {
                setClauses.push(`cost_price = $${idx++}`);
                values.push(pricingData.costPrice ?? pricingData.cost_price);
            }
            if (pricingData.mrp !== undefined) {
                setClauses.push(`mrp = $${idx++}`);
                values.push(pricingData.mrp);
            }

            if (setClauses.length === 0) throw new Error('No pricing fields provided');

            setClauses.push('updated_at = NOW()');

            values.push(variantId);
            values.push(businessId);

            const result = await client.query(`
                UPDATE product_variants 
                SET ${setClauses.join(', ')}
                WHERE id = $${idx++} AND business_id = $${idx}
                RETURNING *
            `, values);

            if (result.rows.length === 0) throw new Error('Variant not found');

            return result.rows[0];
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Soft delete a variant
     */
    async deleteVariant(variantId, businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const result = await client.query(`
                UPDATE product_variants 
                SET is_deleted = true, deleted_at = NOW(), is_active = false
                WHERE id = $1 AND business_id = $2
                RETURNING id
            `, [variantId, businessId]);

            if (result.rows.length === 0) throw new Error('Variant not found');
            return true;
        } finally {
            if (!txClient) client.release();
        }
    }
};
