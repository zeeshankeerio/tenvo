'use server';

import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { InventoryService } from '@/lib/services/InventoryService';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';
import {
    filterMeaningfulBatches,
    filterMeaningfulSerials,
    isMeaningfulInventoryBatch,
    isMeaningfulInventorySerial,
} from '@/lib/utils/inventoryTrackingHelpers';
import { serializeDecimalsDeep } from '@/lib/utils/serializePrismaDecimals';

async function checkAuthAndPlan(businessId, permission = 'inventory.create', client = null) {
    const { session } = await withGuard(businessId, {
        permission,
        client,
    });
    return session;
}

/**
 * Stock movements must run on the SAME pg client as the composite transaction.
 * Calling addStockAction/removeStockAction opens a new connection, under READ COMMITTED
 * the new product row from INSERT is invisible until COMMIT → "Product not found".
 */
async function invokeAddStockInTx(payload, client, userId) {
    await InventoryService.addStock(payload, userId, client);
}

async function invokeRemoveStockInTx(payload, client, userId) {
    await InventoryService.removeStock(payload, userId, client);
}

/**
 * Server-side orchestration for atomic product creation/update with inventory
 * This ensures consistency and avoids race conditions or duplicate batch errors.
 */
export async function upsertIntegratedProductAction(params) {
    const {
        productData,
        batches = [],
        serialNumbers = [],
        initialStock = 0,
        isUpdate = false,
        productId = null
    } = params;

    const businessId = productData.business_id;

    const client = await pool.connect();
    try {
        const session = await checkAuthAndPlan(businessId, isUpdate ? 'inventory.edit' : 'inventory.create', client);
        const userId = session?.user?.id != null ? String(session.user.id) : 'system';

        await client.query('BEGIN');

        let finalProductId = productId;

        const batchesInput = filterMeaningfulBatches(Array.isArray(batches) ? batches : []);
        const serialsInput = filterMeaningfulSerials(Array.isArray(serialNumbers) ? serialNumbers : []);

        const hasBatchesOrSerials =
            batchesInput.length > 0 || serialsInput.length > 0;

        const safeFields = [
            'business_id', 'name', 'sku', 'barcode', 'category', 'brand', 'unit',
            'description', 'price', 'cost_price', 'mrp', 'tax_percent', 'min_stock', 'max_stock', 'min_stock_level',
            'reorder_point', 'reorder_quantity', 'location', 'image_url', 'status',
            'is_featured', 'is_tax_inclusive', 'expiry_date', 'batch_number',
            'manufacturing_date',
            'domain_data', 'hsn_code', 'sac_code', 'is_active', 'unit_conversions',
            // Note: 'tracking_mode', 'attributes', and 'variants' columns do NOT exist on the
            // products table. Size/color variants live in `product_variants` and must be written
            // via VariantService / the VariantMatrixEditor dialog — never as a raw products column
            // (including 'variants' here caused Postgres 42703 on any save carrying a variants array).
            // Include 'stock' for products without batch/serial tracking
            // (batch/serial products derive stock from their sub-records)
            ...(!hasBatchesOrSerials ? ['stock'] : []),
        ];

        const numericFieldMap = {
            price: 0,
            cost_price: 0,
            mrp: 0,
            tax_percent: 0,
            min_stock: 0,
            max_stock: 0,
            min_stock_level: 0,
            reorder_point: 0,
            reorder_quantity: 0,
            stock: 0,
        };

        const dateFields = new Set(['expiry_date', 'manufacturing_date']);

        const sanitizeProductData = (data) => {
            const sanitized = {};
            Object.keys(data).forEach(key => {
                if (safeFields.includes(key)) {
                    const value = data[key];

                    if (key === 'domain_data') {
                        let dd = value;
                        if (typeof dd === 'string') {
                            const t = (dd || '').trim();
                            if (!t || t === '[object Object]') {
                                dd = {};
                            } else {
                                try {
                                    dd = JSON.parse(t);
                                } catch {
                                    dd = {};
                                }
                            }
                        }
                        if (dd === null || dd === undefined || typeof dd !== 'object' || Array.isArray(dd)) {
                            dd = {};
                        }
                        sanitized[key] = dd;
                        return;
                    }

                    if (Object.prototype.hasOwnProperty.call(numericFieldMap, key)) {
                        if (value === '' || value === null || value === undefined) {
                            sanitized[key] = numericFieldMap[key];
                        } else {
                            const parsed = Number(value);
                            sanitized[key] = Number.isFinite(parsed) ? parsed : numericFieldMap[key];
                        }
                        return;
                    }

                    if (dateFields.has(key)) {
                        sanitized[key] = value === '' ? null : value;
                        return;
                    }

                    sanitized[key] = value === '' ? null : value;
                }
            });
            return sanitized;
        };

        const sanitizedData = sanitizeProductData(productData);

        // 1. Upsert Product
        if (isUpdate && productId) {
            await assertEntityBelongsToBusiness(client, 'product', productId, businessId);
            // Update logic
            const fields = Object.keys(sanitizedData).filter(f => f !== 'id' && f !== 'business_id');
            if (fields.length > 0) {
                const values = fields.map(f => sanitizedData[f]);
                const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');

                await client.query(`
                    UPDATE products 
                    SET ${setClause}, updated_at = NOW() 
                    WHERE id = $1 AND business_id = $2
                `, [productId, businessId, ...values]);
            } else {
                await client.query(
                    `UPDATE products SET updated_at = NOW() WHERE id = $1 AND business_id = $2`,
                    [productId, businessId]
                );
            }
        } else {
            // Create logic
            const fields = Object.keys(sanitizedData);
            const values = Object.values(sanitizedData);
            const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

            const res = await client.query(`
                INSERT INTO products (${fields.join(', ')})
                VALUES (${placeholders})
                RETURNING id
            `, values);
            finalProductId = res.rows[0].id;
        }

        // 2. Handle Batches (Delta Reconciliation)
        if (batchesInput.length > 0) {
            // Fetch existing batches to compare
            const existingBatchesRes = await client.query(
                'SELECT id, quantity, batch_number FROM product_batches WHERE product_id = $1 AND business_id = $2',
                [finalProductId, businessId]
            );
            const existingBatches = existingBatchesRes.rows;

            for (const batch of batchesInput) {
                if (!isMeaningfulInventoryBatch(batch) && !batch?.id) continue;
                const incomingQty = Number(batch.quantity) || 0;
                // Match by ID if exists (reliable), else fallback to batch_number+warehouse (if we had it), else treat as new
                const existing = existingBatches.find(eb =>
                    (batch.id && String(batch.id) === String(eb.id)) ||
                    (!batch.id && batch.batch_number === eb.batch_number) // fallback for new entries in UI that might match existing
                );

                if (existing) {
                    const currentQty = Number(existing.quantity);
                    const delta = incomingQty - currentQty;

                    if (delta > 0) {
                        // Stock In
                        await invokeAddStockInTx({
                            business_id: businessId,
                            product_id: finalProductId,
                            warehouse_id: batch.warehouse_id || batch.warehouseId || null,
                            quantity: delta,
                            cost_price: Number(batch.cost_price || batch.costPrice || productData.cost_price || 0),
                            batch_number: existing.batch_number,
                            notes: 'Batch Quantity Adjustment (Increase)',
                            reference_type: 'adjustment',
                            reference_id: finalProductId
                        }, client, userId);
                    } else if (delta < 0) {
                        // Stock Out
                        await invokeRemoveStockInTx({
                            business_id: businessId,
                            product_id: finalProductId,
                            warehouse_id: batch.warehouse_id || batch.warehouseId || null,
                            quantity: Math.abs(delta),
                            batch_id: existing.id,
                            notes: 'Batch Quantity Adjustment (Decrease)',
                            reference_type: 'adjustment',
                            reference_id: finalProductId
                        }, client, userId);
                    } else {
                        // No quantity change, but maybe metadata update?
                        await client.query(`
                            UPDATE product_batches 
                            SET expiry_date = $1, manufacturing_date = $2, cost_price = $3, updated_at = NOW()
                            WHERE id = $4 AND business_id = $5
                        `, [
                            batch.expiry_date || batch.expiryDate || null,
                            batch.manufacturing_date || batch.manufacturingDate || null,
                            batch.cost_price || batch.costPrice || 0,
                            existing.id,
                            businessId
                        ]);
                    }
                } else {
                    // New Batch -> Stock In
                    if (incomingQty > 0) {
                        await invokeAddStockInTx({
                            business_id: businessId,
                            product_id: finalProductId,
                            warehouse_id: batch.warehouse_id || batch.warehouseId || null,
                            quantity: incomingQty,
                            cost_price: Number(batch.cost_price || batch.costPrice || productData.cost_price || 0),
                            batch_number: batch.batch_number || batch.batchNumber,
                            manufacturing_date: batch.manufacturing_date || batch.manufacturingDate || null,
                            expiry_date: batch.expiry_date || batch.expiryDate || null,
                            notes: batch.notes || 'Opening Balance (Batch)',
                            reference_type: 'adjustment',
                            reference_id: finalProductId
                        }, client, userId);
                    }
                }
            }
        }
        // 3. Handle Serials (Delta Reconciliation)
        else if (serialsInput.length > 0) {
            // For serials, "Quantity" is always 1 per serial.
            // We check if the serial exists. If not, add it.
            // If it exists but is 'sold', maybe we don't reactivate it here unless explicitly requested?
            // For now, let's assume this form only sends "Available" serials or new ones.

            // 1. Get existing active serials
            const existingSerialsRes = await client.query(
                `SELECT serial_number FROM product_serials WHERE product_id = $1 AND business_id = $2 AND status = 'available'`,
                [finalProductId, businessId]
            );
            const existingSet = new Set(existingSerialsRes.rows.map(r => r.serial_number));

            for (const serial of serialsInput) {
                const sn = serial.serial_number || serial.serialNumber;
                if (!existingSet.has(sn)) {
                    // New Serial -> Add Stock (Qty 1)
                    // Insert Serial record first (or let addStock handle it? addStock handles basics, but we might want explicit control)
                    // addStockAction currently has a hacky "serialNumbers" param but it's better to explicitly insert here if possible, 
                    // OR just rely on addStockAction to do it. 
                    // Let's use addStockAction as it handles Ledger + Product Stock update.

                    // Insert Serial record
                    await client.query(`
                        INSERT INTO product_serials (
                            business_id, product_id, serial_number, imei, status, warehouse_id
                        ) VALUES ($1, $2, $3, $4, 'available', $5)
                        ON CONFLICT (business_id, serial_number) DO NOTHING
                    `, [businessId, finalProductId, sn, serial.imei || null, serial.warehouse_id || null]);

                    // Record movement
                    await invokeAddStockInTx({
                        business_id: businessId,
                        product_id: finalProductId,
                        warehouse_id: serial.warehouse_id || null,
                        quantity: 1,
                        cost_price: Number(productData.cost_price || 0),
                        notes: `Stock Addition (Serial: ${sn})`,
                        reference_type: 'adjustment',
                        reference_id: finalProductId
                    }, client, userId);
                }
            }

            // Detect Deleted Serials? 
            // If a serial was in existingSet but NOT in incoming serialNumbers, it means it was removed from the list.
            // Should we mark it as 'removed'? 
            // For safety, let's strictly handle ADDITIONS for now to avoid accidental bulk deletions.
            // If user wants to delete a serial, they should use a specific "Delete Serial" action or we implement strictly mirroring the list.
            // PROCEEDING WITH ADDITION-ONLY FOR SAFETY as per "Split Brain" fix scope.
        }
        // 4. Handle Simple Stock (no batches/serials)
        else if (!hasBatchesOrSerials) {
            if (!isUpdate && initialStock > 0) {
                // New product with opening stock
                await invokeAddStockInTx({
                    business_id: businessId,
                    product_id: finalProductId,
                    warehouse_id: null,
                    quantity: initialStock,
                    cost_price: Number(productData.cost_price || 0),
                    notes: 'Opening Balance',
                    reference_type: 'adjustment',
                    reference_id: finalProductId
                }, client, userId);
            } else if (isUpdate && productData.stock !== undefined) {
                // Update: reconcile stock delta via ledger
                const prevRes = await client.query(
                    'SELECT stock FROM products WHERE id = $1 AND business_id = $2',
                    [finalProductId, businessId]
                );
                const prevStock = Number(prevRes.rows[0]?.stock ?? 0);
                const newStock = Number(productData.stock ?? 0);
                const delta = newStock - prevStock;
                if (delta > 0) {
                    await invokeAddStockInTx({
                        business_id: businessId,
                        product_id: finalProductId,
                        warehouse_id: null,
                        quantity: delta,
                        cost_price: Number(productData.cost_price || 0),
                        notes: 'Manual Stock Adjustment',
                        reference_type: 'adjustment',
                        reference_id: finalProductId
                    }, client, userId);
                } else if (delta < 0) {
                    await invokeRemoveStockInTx({
                        business_id: businessId,
                        product_id: finalProductId,
                        warehouse_id: null,
                        quantity: Math.abs(delta),
                        notes: 'Manual Stock Adjustment',
                        reference_type: 'adjustment',
                        reference_id: finalProductId
                    }, client, userId);
                }
            }
        }

        // 5. Headline stock when batch/serial mode omitted `stock` from UPDATE but the client sent an explicit
        //    quantity (BusyGrid / dashboard inline edit). Batch loops only move stock when batch qty changes;
        //    without this, edits like 4 → 6 snap back after refreshAllData().
        if (
            isUpdate &&
            finalProductId &&
            productId &&
            hasBatchesOrSerials &&
            productData &&
            Object.prototype.hasOwnProperty.call(productData, 'stock')
        ) {
            const prevRes = await client.query(
                'SELECT stock FROM products WHERE id = $1 AND business_id = $2',
                [finalProductId, businessId]
            );
            const prevStock = Number(prevRes.rows[0]?.stock ?? 0);
            const newStock = Number(productData.stock ?? 0);
            if (Number.isFinite(newStock) && newStock !== prevStock) {
                const delta = newStock - prevStock;
                if (delta > 0) {
                    await invokeAddStockInTx({
                        business_id: businessId,
                        product_id: finalProductId,
                        warehouse_id: null,
                        quantity: delta,
                        cost_price: Number(productData.cost_price || 0),
                        notes: 'Manual Stock Adjustment (headline)',
                        reference_type: 'adjustment',
                        reference_id: finalProductId
                    }, client, userId);
                } else if (delta < 0) {
                    await invokeRemoveStockInTx({
                        business_id: businessId,
                        product_id: finalProductId,
                        warehouse_id: null,
                        quantity: Math.abs(delta),
                        notes: 'Manual Stock Adjustment (headline)',
                        reference_type: 'adjustment',
                        reference_id: finalProductId
                    }, client, userId);
                }

                // Keep a single active batch aligned with headline stock so grid display does not snap back.
                const singleBatchRes = await client.query(
                    `SELECT id FROM product_batches
                     WHERE product_id = $1 AND business_id = $2 AND is_active = true AND is_deleted = false`,
                    [finalProductId, businessId]
                );
                if (singleBatchRes.rows.length === 1) {
                    await client.query(
                        `UPDATE product_batches SET quantity = $1, updated_at = NOW() WHERE id = $2`,
                        [newStock, singleBatchRes.rows[0].id]
                    );
                }
            }
        }

        await client.query('COMMIT');

        // Fetch final product state
        const finalRes = await client.query('SELECT * FROM products WHERE id = $1 AND business_id = $2', [finalProductId, businessId]);
        return { success: true, product: serializeDecimalsDeep(finalRes.rows[0]) };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Composite Upsert Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Bulk composite upsert for Excel mode / imports (Busy/Zoho-style batch entry).
 * Each row runs through the same atomic upsert + InventoryService ledger path.
 */
export async function bulkUpsertIntegratedProductsAction(businessId, items, options = {}) {
    const { stopOnFirstError = false } = options;

    if (!businessId) {
        return { success: false, error: 'business_id is required' };
    }
    if (!Array.isArray(items) || items.length === 0) {
        return { success: false, error: 'No items to save' };
    }

    const results = { created: 0, updated: 0, failed: [] };

    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        try {
            const res = await upsertIntegratedProductAction({
                ...item,
                productData: { ...item.productData, business_id: businessId },
            });
            if (res.success) {
                if (item.isUpdate) results.updated += 1;
                else results.created += 1;
            } else {
                results.failed.push({
                    index,
                    error: res.error || 'Upsert failed',
                    name: item.productData?.name,
                });
                if (stopOnFirstError) break;
            }
        } catch (error) {
            results.failed.push({
                index,
                error: error.message || 'Upsert failed',
                name: item.productData?.name,
            });
            if (stopOnFirstError) break;
        }
    }

    return {
        success: results.failed.length === 0,
        ...results,
        total: items.length,
    };
}
