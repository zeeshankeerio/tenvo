'use server';

import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { checkPlanLimit } from '@/lib/auth/planGuard';
import { productSchema, validateWithSchema } from '@/lib/validation/schemas';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';

import { ProductService } from '@/lib/services/ProductService';

async function checkAuth(businessId, client = null, permission = 'inventory.view') {
    const { session } = await withGuard(businessId, { permission, client });
    return session;
}

/**
 * Server Action: Get all products with optional pagination
 */
export async function getProductsAction(businessId, options = {}) {
    try {
        await checkAuth(businessId, null, 'inventory.view');
        const result = await ProductService.getProducts(businessId, options);
        return { success: true, ...result };
    } catch (error) {
        console.error('Get Products Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Get single product by ID
 */
export async function getProductAction(businessId, productId) {
    try {
        await checkAuth(businessId, null, 'inventory.view');
        const product = await ProductService.getProduct(productId, businessId);
        if (!product) return { success: false, error: 'Product not found' };
        return { success: true, product };
    } catch (error) {
        console.error('Get Product Error:', error);
        return { success: false, error: error.message };
    }
}




/**
 * Server Action: Create Product with Zod Validation and Transaction Support
 * Handles batches and serial numbers atomically
 * 
 * @param {Object} productData - Product data to create
 * @returns {Promise<{success: boolean, product?: any, error?: string, errors?: any[]}>}
 */
export async function createProductAction(productData) {
    try {
        await checkAuth(productData.business_id, null, 'inventory.create');
        
        // Validation handled inside service or shared validation logic
        const result = await ProductService.createProduct(productData);
        return { success: true, product: result, data: result };
    } catch (error) {
        console.error('Create Product Error:', error);
        return { success: false, error: error.message };
    }
}


/**
 * Server Action: Update Product
 * 
 * @param {string} id - Product UUID
 * @param {string} businessId - Business UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, product?: any, error?: string}>}
 */
export async function updateProductAction(id, businessId, updates) {
    try {
        await checkAuth(businessId, null, 'inventory.edit');
        const product = await ProductService.updateProduct(id, businessId, updates);
        return { success: true, product };
    } catch (error) {
        console.error('Update Product Error:', error);
        return { success: false, error: error.message };
    }
}


// ... existing imports

/**
 * Server Action: Bulk Create Products for Seeding
 * Polymorphic: Supports (businessId, products) OR ({ businessId, items })
 */
export async function seedBusinessProductsAction(arg1, arg2) {
    try {
        let businessId, items;
        if (typeof arg1 === 'object' && arg1.businessId) {
            businessId = arg1.businessId;
            items = arg1.items || arg1.products || [];
        } else {
            businessId = arg1;
            items = arg2 || [];
        }

        await checkAuth(businessId, null, 'inventory.create');
        const results = await ProductService.seedProducts(businessId, items);
        
        return { success: true, products: results, count: results.length };
    } catch (error) {
        console.error('Seed Products Error:', error);
        return { success: false, error: error.message };
    }
}


export async function deleteProductAction(id, businessId) {
    try {
        await checkAuth(businessId, null, 'inventory.delete');
        await ProductService.deleteProduct(id, businessId);
        return { success: true };
    } catch (error) {
        console.error('Delete Product Error:', error);
        return { success: false, error: error.message };
    }
}


/**
 * Server Action: Bulk Export Products
 * Exports all products with batch/serial data to Excel format
 */
export async function bulkExportProductsAction(businessId, options = {}) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'inventory.view');

        // Fetch all products with related inventory data using subqueries.
        // This avoids cross-join duplication between batches and serials.
        const result = await client.query(`
            SELECT 
                p.*,
                COALESCE(
                    (
                        SELECT json_agg(jsonb_build_object(
                            'id', b.id,
                            'batch_number', b.batch_number,
                            'quantity', b.quantity,
                            'available_quantity', GREATEST(COALESCE(b.quantity, 0) - COALESCE(b.reserved_quantity, 0), 0),
                            'expiry_date', b.expiry_date,
                            'manufacturing_date', b.manufacturing_date,
                            'notes', b.notes
                        ))
                        FROM product_batches b
                        WHERE b.product_id = p.id AND b.business_id = p.business_id AND b.is_deleted = false
                    ),
                    '[]'::json
                ) as product_batches,
                COALESCE(
                    (
                        SELECT json_agg(jsonb_build_object(
                            'serial_number', s.serial_number,
                            'status', s.status,
                            'warranty_expiry', s.warranty_expiry,
                            'notes', s.notes
                        ))
                        FROM product_serials s
                        WHERE s.product_id = p.id AND s.business_id = p.business_id AND s.is_deleted = false
                    ),
                    '[]'::json
                ) as product_serials,
                COALESCE(
                    (
                        SELECT json_agg(jsonb_build_object(
                            'warehouse_id', psl.warehouse_id,
                            'quantity', psl.quantity,
                            'reserved_quantity', psl.reserved_quantity,
                            'state', psl.state
                        ))
                        FROM product_stock_locations psl
                        WHERE psl.product_id = p.id AND psl.business_id = p.business_id
                    ),
                    '[]'::json
                ) as product_stock_locations
            FROM products p
            WHERE p.business_id = $1 AND p.is_deleted = false
            ORDER BY p.created_at DESC
        `, [businessId]);

        const products = result.rows;

        // Use export service to generate Excel
        const { exportProductsToExcel, validateRoundTrip } = await import('@/lib/services/excelExportService');
        const exportResult = await exportProductsToExcel(products, options);

        if (!exportResult.success) {
            return { success: false, error: exportResult.error };
        }

        // Validate round-trip capability
        const validationResult = await validateRoundTrip(exportResult.buffer);

        return {
            success: true,
            buffer: Array.from(exportResult.buffer),
            fileName: exportResult.fileName,
            recordCount: exportResult.recordCount,
            roundTripValid: validationResult.valid,
            roundTripWarnings: validationResult.errors
        };
    } catch (error) {
        console.error('Bulk Export Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Server Action: Bulk Import Products
 * Imports products from Excel file with batch/serial data
 */
export async function bulkImportProductsAction(businessId, file, options = {}) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'inventory.create');

        const { parseExcelFile, validateImportRow, transformImportedData, detectDuplicates } = await import('@/lib/services/excelImportService');

        // Parse Excel file
        const parseResult = await parseExcelFile(file);
        if (!parseResult.success) {
            return { success: false, error: parseResult.error };
        }

        // Resolve source sheet: prefer explicit option, then canonical Products sheet,
        // then first non-metadata sheet for compatibility with user-provided files.
        const fallbackSheetName = parseResult.sheetNames.find(name => name !== '_Metadata');
        const resolvedSheetName = options.sheetName || 'Products';
        const productsSheet =
            parseResult.sheets[resolvedSheetName] ||
            parseResult.sheets['Products'] ||
            parseResult.sheets[fallbackSheetName] ||
            [];
        if (productsSheet.length === 0) {
            return { success: false, error: 'No products found in Products sheet' };
        }

        // Validate each row
        const existingProducts = {};
        const existingRes = await client.query(
            'SELECT id, sku FROM products WHERE business_id = $1 AND is_deleted = false',
            [businessId]
        );
        existingRes.rows.forEach(p => {
            if (p.sku) existingProducts[p.sku] = p.id;
        });

        const validatedRows = [];
        const errors = [];

        productsSheet.forEach((row, idx) => {
            const validation = validateImportRow(row, existingProducts, options.category);
            validatedRows.push(validation);

            if (!validation.isValid) {
                errors.push({
                    row: idx + 1,
                    errors: validation.errors,
                    warnings: validation.warnings
                });
            }
        });

        // Check for duplicates in import
        const duplicates = detectDuplicates(validatedRows);
        if (duplicates.length > 0 && !options.allowDuplicates) {
            return {
                success: false,
                error: `Found ${duplicates.length} duplicate SKUs in import`,
                duplicates,
                validationErrors: errors.slice(0, 10)
            };
        }

        // If there are validation errors and strict mode
        if (errors.length > 0 && options.strictMode) {
            return {
                success: false,
                error: `Import has ${errors.length} validation errors`,
                validationErrors: errors.slice(0, 50)
            };
        }

        // Transform and insert valid rows
        const toInsert = transformImportedData(validatedRows, businessId, options.domainData || {});

        if (toInsert.length === 0) {
            return { success: false, error: 'No valid products to import' };
        }

        // Check plan limit for new inserts only (updates do not consume product quota).
        const productCountRes = await client.query(
            'SELECT COUNT(*)::int as count FROM products WHERE business_id = $1 AND is_deleted = false',
            [businessId]
        );
        const existingCount = Number(productCountRes.rows[0]?.count || 0);
        const newInsertCount = toInsert.filter(product => !existingProducts[product.sku]).length;
        await checkPlanLimit(businessId, 'max_products', existingCount + newInsertCount, client);

        // Bulk insert
        let imported = 0;
        let updated = 0;

        for (const product of toInsert) {
            try {
                // Check if SKU exists
                const existingId = existingProducts[product.sku];

                if (existingId && !options.skipExisting) {
                    // Update existing
                    await client.query(`
                        UPDATE products 
                        SET 
                            name = COALESCE($1, name),
                            cost_price = COALESCE($2, cost_price),
                            selling_price = COALESCE($3, selling_price),
                            stock = COALESCE($4, stock),
                            min_stock = COALESCE($5, min_stock),
                            domain_data = COALESCE($6, domain_data),
                            updated_at = NOW()
                        WHERE id = $7 AND business_id = $8
                    `, [
                        product.name,
                        product.cost,
                        product.price,
                        product.stock,
                        product.minStock,
                        JSON.stringify(product.domain_data),
                        existingId,
                        businessId
                    ]);
                    updated++;
                } else if (!existingId) {
                    // Insert new
                    await client.query(`
                        INSERT INTO products (
                            business_id, name, sku, cost_price, selling_price, stock, 
                            min_stock, category, unit, barcode, domain_data, is_active
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
                    `, [
                        businessId,
                        product.name,
                        product.sku,
                        product.cost,
                        product.price,
                        product.stock,
                        product.minStock,
                        product.category,
                        product.unit,
                        product.barcode,
                        JSON.stringify(product.domain_data)
                    ]);
                    imported++;
                }
            } catch (err) {
                console.error(`Error importing row ${product._rowIndex}:`, err);
            }
        }

        return {
            success: true,
            imported,
            updated,
            total: imported + updated,
            warnings: errors.filter(e => e.warnings?.length > 0).slice(0, 20),
            duplicatesFound: duplicates.length
        };
    } catch (error) {
        console.error('Bulk Import Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

