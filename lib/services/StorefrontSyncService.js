import pool from '@/lib/db';
import { createModuleLogger } from '@/lib/services/logging/logger';

const log = createModuleLogger('storefront-sync');

/**
 * Storefront Sync Service
 * Ensures inventory products are automatically published to storefront
 * Provides intelligent syncing between inventory and public store
 */
export const StorefrontSyncService = {
    /**
     * Auto-publish a product to storefront after creation
     * Ensures the product is visible in the public store
     */
    async autoPublishProduct(productId, businessId, tx = null) {
        const client = tx || await pool.connect();
        try {
            log.info(`Auto-publishing product ${productId} to storefront for business ${businessId}`);
            
            // Ensure product is marked as active and featured for storefront
            await client.query(
                `UPDATE products 
                 SET is_active = true, is_featured = false, is_new = true, updated_at = NOW()
                 WHERE id = $1 AND business_id = $2`,
                [productId, businessId]
            );
            
            log.info(`Product ${productId} auto-published successfully`);
            return { success: true, productId };
        } catch (error) {
            log.error(`Failed to auto-publish product ${productId}:`, error);
            return { success: false, error: error.message };
        } finally {
            if (!tx) client.release();
        }
    },

    /**
     * Sync all active inventory products to storefront
     * Use this to bulk-enable storefront for existing products
     */
    async syncInventoryToStorefront(businessId, tx = null) {
        const client = tx || await pool.connect();
        try {
            log.info(`Syncing inventory to storefront for business ${businessId}`);
            
            // Find all inventory products that should be in storefront
            // (active, not deleted, with stock > 0 or stock tracking disabled)
            const productsResult = await client.query(
                `SELECT id, name, stock FROM products 
                 WHERE business_id = $1 AND is_deleted = false AND is_active = true`,
                [businessId]
            );
            
            let synced = 0;
            for (const product of productsResult.rows) {
                // Products with stock > 0 or null stock (tracking disabled) are storefront-ready
                if (product.stock === null || product.stock > 0) {
                    const stockStatus = product.stock === 0 ? 'out_of_stock' : 'in_stock';
                    await client.query(
                        `UPDATE products 
                         SET is_active = true, stock_status = $1, updated_at = NOW()
                         WHERE id = $2`,
                        [stockStatus, product.id]
                    );
                    synced++;
                }
            }
            
            log.info(`Synced ${synced} products to storefront for business ${businessId}`);
            return { success: true, synced, total: productsResult.rows.length };
        } catch (error) {
            log.error(`Failed to sync inventory to storefront:`, error);
            return { success: false, error: error.message };
        } finally {
            if (!tx) client.release();
        }
    },

    /**
     * Update product availability based on stock changes
     * Automatically mark out-of-stock products in storefront
     */
    async updateStockAvailability(productId, newStock, tx = null) {
        const client = tx || await pool.connect();
        try {
            const stockStatus = newStock === 0 ? 'out_of_stock' : 
                              newStock <= 5 ? 'low_stock' : 'in_stock';
            
            await client.query(
                `UPDATE products 
                 SET stock = $1, stock_status = $2, is_active = true, updated_at = NOW()
                 WHERE id = $3`,
                [newStock, stockStatus, productId]
            );
            
            log.info(`Updated stock availability for product ${productId}: ${stockStatus}`);
            return { success: true, stockStatus };
        } catch (error) {
            log.error(`Failed to update stock availability for ${productId}:`, error);
            return { success: false, error: error.message };
        } finally {
            if (!tx) client.release();
        }
    },

    /**
     * Get storefront-ready products for a business
     * Filters products that should appear in public store
     */
    async getStorefrontProducts(businessId, options = {}, tx = null) {
        const { 
            limit = 24, 
            offset = 0, 
            category = null,
            search = null,
            inStockOnly = false 
        } = options;

        const client = tx || await pool.connect();
        try {
            // Build WHERE conditions
            let whereConditions = [
                'business_id = $1',
                'is_deleted = false',
                'is_active = true'
            ];
            let params = [businessId];
            let paramIndex = 2;

            if (category) {
                whereConditions.push(`category ILIKE $${paramIndex++}`);
                params.push(`%${category}%`);
            }

            if (search) {
                whereConditions.push(`(
                    name ILIKE $${paramIndex++} OR 
                    description ILIKE $${paramIndex++} OR 
                    sku ILIKE $${paramIndex++}
                )`);
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            if (inStockOnly) {
                whereConditions.push(`(stock > 0 OR stock IS NULL)`);
            }

            const whereClause = whereConditions.join(' AND ');

            // Get products with variants
            const [productsResult, totalResult] = await Promise.all([
                client.query(
                    `SELECT 
                        p.*,
                        COALESCE(
                            JSON_AGG(
                                JSON_BUILD_OBJECT(
                                    'id', pv.id,
                                    'variant_name', pv.variant_name,
                                    'price', pv.price,
                                    'stock', pv.stock
                                )
                            ) FILTER (WHERE pv.id IS NOT NULL), 
                            '[]'
                        ) as variants
                    FROM products p
                    LEFT JOIN product_variants pv ON p.id = pv.product_id 
                        AND pv.is_deleted = false AND pv.is_active = true
                    WHERE ${whereClause}
                    GROUP BY p.id
                    ORDER BY p.is_featured DESC, p.is_new DESC, p.created_at DESC
                    LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
                    [...params, parseInt(limit), parseInt(offset)]
                ),
                client.query(
                    `SELECT COUNT(*) as total FROM products WHERE ${whereClause}`,
                    params
                )
            ]);

            const products = productsResult.rows;
            const total = parseInt(totalResult.rows[0].total);

            return {
                success: true,
                products: products.map(p => ({
                    ...p,
                    // Ensure price is properly formatted
                    display_price: p.price || 0,
                    // Calculate total stock including variants
                    total_stock: p.stock || p.product_variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0,
                    has_variants: p.product_variants?.length > 0
                })),
                total,
                hasMore: offset + limit < total
            };
        } catch (error) {
            log.error(`Failed to get storefront products:`, error);
            return { success: false, error: error.message };
        } finally {
            if (!tx) client.release();
        }
    },

    /**
     * Initialize storefront for a new business
     * Sets up default domain entry (atomic with business creation when tx provided)
     */
    async initializeStorefront(businessId, domain, tx = db) {
        try {
            log.info(`Initializing storefront for business ${businessId} with domain ${domain}`);
            
            // Ensure business has a domain configured (use provided transaction)
            const existingDomain = await tx.business_custom_domains.findFirst({
                where: { business_id: businessId, is_active: true }
            });
            
            if (!existingDomain) {
                // Create default domain from business handle
                await tx.business_custom_domains.create({
                    data: {
                        business_id: businessId,
                        domain: domain || `store-${businessId}`,
                        is_active: true,
                        is_primary: true
                    }
                });
                log.info(`Created default domain for business ${businessId}`);
            }
            
            log.info(`Storefront initialized for business ${businessId}`);
            return {
                success: true,
                domain: existingDomain?.domain || domain
            };
        } catch (error) {
            log.error(`Failed to initialize storefront for ${businessId}:`, error);
            return { success: false, error: error.message };
        }
    }
};

export default StorefrontSyncService;
