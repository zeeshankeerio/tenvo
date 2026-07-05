'use server';

import { db } from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { checkPlanLimit } from '@/lib/auth/planGuard';
import { productSchema, validateWithSchema } from '@/lib/validation/schemas';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';

import { ProductService } from '@/lib/services/ProductService';
import { StorefrontSyncService } from '@/lib/services/StorefrontSyncService';
import { leanProductPayloadForCreate, leanProductPayloadForUpdate } from '@/lib/utils/productMutationPayload';
import { prepareCompositeUpsertFromRow } from '@/lib/utils/excelProductPayload';
import { upsertIntegratedProductAction } from '@/lib/actions/premium/automation/inventory_composite';
import { invalidateStorefrontCatalog } from '@/lib/storefront/invalidateStorefrontCatalog';

async function checkAuth(businessId, client = null, permission = 'inventory.view') {
    const { session } = await withGuard(businessId, { permission, client });
    return session;
}

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

export async function createProductAction(productData) {
    try {
        await checkAuth(productData.business_id, null, 'inventory.create');
        const result = await ProductService.createProduct(leanProductPayloadForCreate(productData));
        
        // Auto-publish to storefront after creation
        if (result?.id) {
            console.log(`[createProductAction] Auto-publishing product ${result.id} to storefront`);
            try {
                await StorefrontSyncService.autoPublishProduct(result.id, productData.business_id);
                result.storefront_published = true;
            } catch (syncError) {
                console.warn(`[createProductAction] Failed to auto-publish product ${result.id}:`, syncError.message);
                result.storefront_published = false;
            }
            invalidateStorefrontCatalog(productData.business_id);
        }
        
        return { success: true, product: result, data: result };
    } catch (error) {
        console.error('Create Product Error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateProductAction(id, businessId, updates) {
    try {
        await checkAuth(businessId, null, 'inventory.edit');
        const product = await ProductService.updateProduct(id, businessId, leanProductPayloadForUpdate(updates));
        if (!product) return { success: false, error: 'Product not found or does not belong to this business' };
        invalidateStorefrontCatalog(businessId);
        return { success: true, product };
    } catch (error) {
        console.error('Update Product Error:', error);
        return { success: false, error: error.message };
    }
}

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
        invalidateStorefrontCatalog(businessId);
        return { success: true };
    } catch (error) {
        console.error('Delete Product Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Toggle a product's active/inactive status without archiving it.
 */
export async function toggleProductActiveAction(id, businessId, isActive) {
    try {
        await checkAuth(businessId, null, 'inventory.edit');
        await assertEntityBelongsToBusiness(db.products, id, businessId);
        const product = await ProductService.updateProduct(id, businessId, { is_active: Boolean(isActive) });
        if (!product) return { success: false, error: 'Product not found' };
        invalidateStorefrontCatalog(businessId);
        return { success: true, product };
    } catch (error) {
        console.error('Toggle Product Active Error:', error);
        return { success: false, error: error.message };
    }
}

export async function bulkExportProductsAction(businessId, options = {}) {
    try {
        await checkAuth(businessId, null, 'inventory.view');

        const products = await db.products.findMany({
            where: { business_id: businessId, is_deleted: false },
            include: {
                product_batches: {
                    where: { is_deleted: false },
                    select: { id: true, batch_number: true, quantity: true, reserved_quantity: true, expiry_date: true, manufacturing_date: true, notes: true }
                },
                product_serials: {
                    where: { is_deleted: false },
                    select: { serial_number: true, status: true, warranty_expiry_date: true, notes: true }
                },
                product_stock_locations: {
                    where: { business_id: businessId },
                    select: { warehouse_id: true, quantity: true, state: true },
                },
            },
            orderBy: { created_at: 'desc' }
        });

        const mappedProducts = products.map(p => {
            const mapped = {
                ...p,
                product_batches: p.product_batches.map(b => ({
                    id: b.id,
                    batch_number: b.batch_number,
                    quantity: b.quantity,
                    available_quantity: Math.max(0, (Number(b.quantity) || 0) - (Number(b.reserved_quantity) || 0)),
                    expiry_date: b.expiry_date,
                    manufacturing_date: b.manufacturing_date,
                    notes: b.notes
                }))
            };
            return mapped;
        });

        const { exportProductsToExcel, validateRoundTrip } = await import('@/lib/services/excelExportService');
        const exportResult = await exportProductsToExcel(mappedProducts, options);

        if (!exportResult.success) {
            return { success: false, error: exportResult.error };
        }

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
    }
}

export async function bulkImportProductsAction(businessId, file, options = {}) {
    try {
        await checkAuth(businessId, null, 'inventory.create');

        const { parseExcelFile, validateImportRow, transformImportedData, detectDuplicates, detectColumnMapping } = await import('@/lib/services/excelImportService');

        let toInsert = [];
        const existingProductsList = await db.products.findMany({
            where: { business_id: businessId, is_deleted: false },
            select: { id: true, sku: true }
        });
        const existingProducts = {};
        existingProductsList.forEach(p => {
            if (p.sku) existingProducts[p.sku] = p.id;
        });

        let errors = [];
        let duplicates = [];

        if (Array.isArray(file)) {
            // Already parsed/validated rows from client
            toInsert = file.map((row) => {
                const cleaned = row.cleaned || row;
                return {
                    ...cleaned,
                    business_id: businessId,
                    domain_data: cleaned.domain_data || options.domainData || {},
                    batches: cleaned.batches || [],
                    serialNumbers: cleaned.serialNumbers || cleaned.serial_numbers || [],
                };
            });
        } else {
            // File needs to be parsed
            const parseResult = await parseExcelFile(file);
            if (!parseResult.success) {
                return { success: false, error: parseResult.error };
            }

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

            // Intelligently map arbitrary spreadsheet headers to canonical product fields
            // so owners can upload files that don't match our template column names.
            const sheetHeaders = productsSheet[0] ? Object.keys(productsSheet[0]) : [];
            const columnMapping = options.columnMapping || detectColumnMapping(sheetHeaders);

            const validatedRows = [];
            productsSheet.forEach((row, idx) => {
                const validation = validateImportRow(row, existingProducts, options.category, columnMapping);
                validatedRows.push(validation);

                if (!validation.isValid) {
                    errors.push({
                        row: idx + 1,
                        errors: validation.errors,
                        warnings: validation.warnings
                    });
                }
            });

            duplicates = detectDuplicates(validatedRows);
            if (duplicates.length > 0 && !options.allowDuplicates) {
                return {
                    success: false,
                    error: `Found ${duplicates.length} duplicate SKUs in import`,
                    duplicates,
                    validationErrors: errors.slice(0, 10)
                };
            }

            if (errors.length > 0 && options.strictMode) {
                return {
                    success: false,
                    error: `Import has ${errors.length} validation errors`,
                    validationErrors: errors.slice(0, 50)
                };
            }

            toInsert = transformImportedData(validatedRows, businessId, options.domainData || {}, parseResult.sheets);
        }

        if (toInsert.length === 0) {
            return { success: false, error: 'No valid products to import' };
        }

        const existingCount = await db.products.count({
            where: { business_id: businessId, is_deleted: false }
        });
        const newInsertCount = toInsert.filter(product => !existingProducts[product.sku]).length;
        await checkPlanLimit(businessId, 'max_products', existingCount + newInsertCount, null);

        let imported = 0;
        let updated = 0;

        const category = options.category || 'retail-shop';

        for (const product of toInsert) {
            const existingId = product.sku ? existingProducts[product.sku] : null;

            if (existingId && options.skipExisting) {
                continue;
            }

            const row = existingId ? { ...product, id: existingId } : product;
            const params = prepareCompositeUpsertFromRow(row, category, businessId);
            params.productData = existingId
                ? { ...leanProductPayloadForUpdate(params.productData), id: existingId }
                : leanProductPayloadForCreate(params.productData);

            const res = await upsertIntegratedProductAction(params);
            if (!res.success) {
                errors.push({
                    row: product.name || product.sku || 'unknown',
                    errors: [res.error || 'Import failed'],
                });
                continue;
            }

            if (existingId && !options.skipExisting) {
                updated++;
            } else if (!existingId) {
                imported++;
                if (product.sku) existingProducts[product.sku] = res.product?.id;
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
    }
}
