import pool from '@/lib/db';
import { createModuleLogger } from '@/lib/services/logging/logger';

const log = createModuleLogger('product-service');

/**
 * Product Management Service
 * Central Logic for Product Lifecycle, Seeding, and Relational Data
 * 2026 Enterprise Standards: Service-First Logic
 */
export const ProductService = {

    /**
     * Internal helper for database connection
     */
    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Get products with optional pagination and search
     */
    async getProducts(businessId, options = {}, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const { limit, offset, search } = options;
            const usePagination = limit !== undefined && offset !== undefined;

            let whereClause = 'p.business_id = $1 AND p.is_deleted = false';
            const params = [businessId];

            if (search) {
                params.push(`%${search}%`);
                whereClause += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`;
            }

            const query = `
                SELECT 
                    p.*,
                    COALESCE(
                        (SELECT json_agg(json_build_object(
                            'id', b.id,
                            'batch_number', b.batch_number,
                            'quantity', b.quantity,
                            'expiry_date', b.expiry_date,
                            'manufacturing_date', b.manufacturing_date, 
                            'cost_price', b.cost_price,
                            'is_active', b.is_active
                        )) FROM product_batches b WHERE b.product_id = p.id AND b.is_active = true AND b.is_deleted = false),
                        '[]'::json
                    ) as batches,
                    COALESCE(
                        (SELECT json_agg(json_build_object(
                            'id', s.id,
                            'serial_number', s.serial_number,
                            'status', s.status,
                            'notes', s.notes
                        )) FROM product_serials s WHERE s.product_id = p.id AND s.status = 'in_stock' AND s.is_deleted = false),
                        '[]'::json
                    ) as serial_numbers,
                    COALESCE(
                        (SELECT json_agg(json_build_object(
                            'warehouse_id', psl.warehouse_id, 
                            'quantity', psl.quantity,
                            'state', psl.state
                        ))
                            FROM product_stock_locations psl 
                            WHERE psl.product_id = p.id AND psl.business_id = $1),
                        '[]'::json
                    ) as stock_locations,
                    COALESCE(
                        (SELECT json_agg(json_build_object(
                            'id', v.id,
                            'variant_sku', v.variant_sku,
                            'variant_name', v.variant_name,
                            'size', v.size,
                            'color', v.color,
                            'price', v.price,
                            'stock', v.stock
                        )) FROM product_variants v WHERE v.product_id = p.id AND v.is_deleted = false),
                        '[]'::json
                    ) as variants
                FROM products p
                WHERE ${whereClause}
                ORDER BY p.name ASC
                ${usePagination ? `LIMIT $${params.length + 1} OFFSET $${params.length + 2}` : ''}
            `;

            if (usePagination) {
                params.push(limit, offset);
            }

            const result = await client.query(query, params);

            let total = result.rows.length;
            if (usePagination) {
                const countQuery = `SELECT COUNT(*) FROM products p WHERE ${whereClause}`;
                const countResult = await client.query(countQuery, params.slice(0, search ? 2 : 1));
                total = parseInt(countResult.rows[0].count);
            }

            const products = result.rows.map(product => this.sanitizeProduct(product));

            return { products, total, hasMore: usePagination ? (offset + limit < total) : false };
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get single product by ID
     */
    async getProduct(productId, businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const query = `
                SELECT 
                    p.*,
                    COALESCE(
                        (SELECT json_agg(b.*) FROM product_batches b WHERE b.product_id = p.id AND b.is_active = true AND b.is_deleted = false),
                        '[]'::json
                    ) as batches,
                    COALESCE(
                        (SELECT json_agg(s.*) FROM product_serials s WHERE s.product_id = p.id AND s.status = 'in_stock' AND s.is_deleted = false),
                        '[]'::json
                    ) as serial_numbers,
                    COALESCE(
                        (SELECT json_agg(json_build_object(
                            'warehouse_id', psl.warehouse_id, 
                            'quantity', psl.quantity,
                            'state', psl.state
                        ))
                            FROM product_stock_locations psl 
                            WHERE psl.product_id = p.id AND psl.business_id = $1),
                        '[]'::json
                    ) as stock_locations
                FROM products p
                WHERE p.id = $2 AND p.business_id = $1 AND p.is_deleted = false
            `;

            const result = await client.query(query, [businessId, productId]);
            if (result.rows.length === 0) return null;

            return this.sanitizeProduct(result.rows[0]);
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Create product with relational data
     */
    async createProduct(productData, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const batches = productData.batches || [];
            const serialNumbers = productData.serial_numbers || productData.serialNumbers || [];
            const variants = productData.variants || [];

            const validColumns = [
                'business_id', 'name', 'description', 'sku', 'price', 'cost_price',
                'mrp', 'stock', 'min_stock', 'max_stock', 'min_stock_level', 'reorder_point',
                'reorder_quantity', 'unit', 'location', 'barcode', 'brand',
                'tax_percent', 'hsn_code', 'sac_code', 'image_url', 'is_active',
                'status', 'expiry_date', 'manufacturing_date',
                'batch_number', 'domain_data', 'category', 'unit_conversions'
            ];

            const insertData = {};
            for (const col of validColumns) {
                if (productData[col] !== undefined) insertData[col] = productData[col];
            }

            if (insertData.domain_data && typeof insertData.domain_data !== 'string') {
                insertData.domain_data = JSON.stringify(insertData.domain_data);
            }

            const fields = Object.keys(insertData);
            const values = Object.values(insertData);
            const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

            const productQuery = `
                INSERT INTO products (${fields.join(', ')})
                VALUES (${placeholders})
                RETURNING *
            `;

            const productResult = await client.query(productQuery, values);
            const product = productResult.rows[0];
            const productId = product.id;

            // Batches
            if (batches.length > 0) {
                for (const batch of batches) {
                    await client.query(
                        `INSERT INTO product_batches 
                        (product_id, business_id, batch_number, quantity, manufacturing_date, expiry_date, cost_price, notes, is_active)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
                        [
                            productId, productData.business_id,
                            batch.batch_number || batch.batchNumber,
                            Number(batch.quantity) || 0,
                            batch.manufacturing_date || batch.manufacturingDate || null,
                            batch.expiry_date || batch.expiryDate || null,
                            Number(batch.cost_price || batch.costPrice) || null,
                            batch.notes || null
                        ]
                    );
                }
            }

            // Serials
            if (serialNumbers.length > 0) {
                for (const sn of serialNumbers) {
                    await client.query(
                        `INSERT INTO product_serials (product_id, business_id, serial_number, status, notes)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [productId, productData.business_id, sn.serial_number || sn.serialNumber || sn, sn.status || 'in_stock', sn.notes || null]
                    );
                }
            }

            // Variants
            if (variants.length > 0) {
                for (const v of variants) {
                    await client.query(`
                        INSERT INTO product_variants (
                            business_id, product_id, variant_sku, variant_name,
                            size, color, price, cost_price, stock
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    `, [
                        productData.business_id, productId,
                        v.variant_sku || v.variantSku || `${product.sku}-${Math.random().toString(36).substr(2, 5)}`,
                        v.variant_name || v.variantName || `${product.name} - Variant`,
                        v.size || null, v.color || null, Number(v.price) || 0,
                        Number(v.cost_price || v.costPrice) || 0, Number(v.stock) || 0
                    ]);
                }
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            log.info('Product created with relational data', { productId });
            return this.sanitizeProduct(product);
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Update product
     */
    async updateProduct(id, businessId, updates, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const validColumns = [
                'name', 'description', 'sku', 'price', 'cost_price',
                'mrp', 'stock', 'min_stock', 'max_stock', 'min_stock_level', 'reorder_point',
                'reorder_quantity', 'unit', 'location', 'barcode', 'brand',
                'tax_percent', 'hsn_code', 'sac_code', 'image_url', 'is_active',
                'status', 'expiry_date', 'manufacturing_date',
                'batch_number', 'domain_data', 'category', 'unit_conversions'
            ];

            const cleanUpdates = {};
            for (const [key, val] of Object.entries(updates)) {
                if (validColumns.includes(key) && key !== 'id' && key !== 'business_id') {
                    cleanUpdates[key] = val;
                }
            }

            if (cleanUpdates.domain_data && typeof cleanUpdates.domain_data !== 'string') {
                cleanUpdates.domain_data = JSON.stringify(cleanUpdates.domain_data);
            }

            const fields = Object.keys(cleanUpdates);
            const values = Object.values(cleanUpdates);
            if (fields.length === 0) return null;

            const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
            const query = `
                UPDATE products SET ${setClause}, updated_at = NOW()
                WHERE id = $${fields.length + 1} AND business_id = $${fields.length + 2}
                RETURNING *
            `;

            const result = await client.query(query, [...values, id, businessId]);
            if (result.rows.length === 0) return null;

            return this.sanitizeProduct(result.rows[0]);
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Bulk seed products for a business
     */
    async seedProducts(businessId, items, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const results = [];
            for (const item of items) {
                const product = await this.createProduct({
                    ...item,
                    business_id: businessId
                }, client);
                results.push(product);
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return results;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Soft delete product
     */
    async deleteProduct(productId, businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const result = await client.query(`
                UPDATE products 
                SET is_deleted = true, updated_at = NOW()
                WHERE id = $1 AND business_id = $2
                RETURNING id
            `, [productId, businessId]);

            if (result.rows.length === 0) throw new Error('Product not found or already deleted');
            log.info('Product soft-deleted', { productId, businessId });
            return true;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Internal Sanitizer for Product Records
     */
    sanitizeProduct(product) {
        if (!product) return null;
        return {
            ...product,
            price: parseFloat(product.price || 0),
            cost_price: parseFloat(product.cost_price || 0),
            mrp: parseFloat(product.mrp || 0),
            stock: parseFloat(product.stock || 0),
            min_stock: parseFloat(product.min_stock || 0),
            max_stock: parseFloat(product.max_stock || 0),
            reorder_point: parseFloat(product.reorder_point || 0),
            reorder_quantity: parseFloat(product.reorder_quantity || 0),
            tax_percent: parseFloat(product.tax_percent || 0),
            domain_data: typeof product.domain_data === 'string' ? JSON.parse(product.domain_data) : product.domain_data || {},
            batches: Array.isArray(product.batches) ? product.batches : JSON.parse(product.batches || '[]'),
            serial_numbers: Array.isArray(product.serial_numbers) ? product.serial_numbers : JSON.parse(product.serial_numbers || '[]'),
            stock_locations: Array.isArray(product.stock_locations) ? product.stock_locations : JSON.parse(product.stock_locations || '[]'),
            variants: Array.isArray(product.variants) ? product.variants : JSON.parse(product.variants || '[]'),
            unit_conversions: typeof product.unit_conversions === 'string' ? JSON.parse(product.unit_conversions) : product.unit_conversions || {}
        };
    }
};
