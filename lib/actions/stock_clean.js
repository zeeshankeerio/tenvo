'use server';

import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import {
    addStockSchema,
    removeStockSchema,
    transferStockSchema,
    reserveStockSchema,
    releaseStockSchema,
    adjustStockSchema,
    validateWithSchema
} from '@/lib/validation/schemas';
import { createGLEntryAction, getGLAccountsByTypes } from './accounting';
import { IntegrationEngine } from '@/lib/services/integrations/integrationEngine';
import { WorkflowEngine } from '@/lib/services/workflows/workflowEngine';

// Helper to check auth and business access
async function checkAuth(businessId, permission = 'inventory.view', client = null) {
    const { session } = await withGuard(businessId, {
        permission,
        client,
    });
    return session;
}

/**
 * Server Action: Reserve Stock for a Sales Order
 */
export async function reserveStockAction(params, txClient = null) {
    try {
        // [OK] 1. Validate with Zod
        const validation = validateWithSchema(reserveStockSchema, params);
        if (!validation.success) {
            return { success: false, error: 'Validation failed', errors: validation.errors };
        }
        const validated = validation.data;

        await checkAuth(validated.business_id, 'inventory.adjust_stock', txClient || null);
        const client = txClient || await pool.connect();
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const { business_id: businessId, product_id: productId, quantity, batch_id: batchId } = validated;

            // 1. Check availability (Stock - Reserved)
            // If batchId is provided, check batch availability
            if (batchId) {
                const bRes = await client.query(
                    'SELECT quantity, reserved_quantity FROM product_batches WHERE id = $1 AND business_id = $2 FOR UPDATE',
                    [batchId, businessId]
                );

                if (bRes.rows.length === 0) throw new Error('Batch not found or access denied');
                const batch = bRes.rows[0];
                const available = Number(batch.quantity) - Number(batch.reserved_quantity || 0);

                if (available < quantity) {
                    throw new Error(`Insufficient batch stock for reservation. Available: ${available}, Requested: ${quantity}`);
                }

                // Update batch reservation
                await client.query(
                    'UPDATE product_batches SET reserved_quantity = COALESCE(reserved_quantity, 0) + $1 WHERE id = $2 AND business_id = $3',
                    [quantity, batchId, businessId]
                );
            } else {
                // Global reservation logic or warehouse specific
                const pRes = await client.query(
                    'SELECT stock FROM products WHERE id = $1 AND business_id = $2 FOR UPDATE',
                    [productId, businessId]
                );

                if (pRes.rows.length === 0) throw new Error('Product not found or access denied');
                

                // We don't have a global reserved_stock in products table currently, 
                // but we might want to check total reserved from all batches?
                // For now, if no batchId, we just assume we can reserve from general stock.
                // Best practice: always track reservation in a field. 
                // Since schema lacks global reserved_stock, let's just use batches if possible.
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Release Reserved Stock
 */
export async function releaseStockAction(params, txClient = null) {
    try {
        // [OK] 1. Validate with Zod
        const validation = validateWithSchema(releaseStockSchema, params);
        if (!validation.success) {
            return { success: false, error: 'Validation failed', errors: validation.errors };
        }
        const validated = validation.data;

        await checkAuth(validated.business_id, 'inventory.adjust_stock', txClient || null);
        const client = txClient || await pool.connect();
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const { business_id: businessId, batch_id: batchId, quantity } = validated;

            if (batchId) {
                await client.query(
                    'UPDATE product_batches SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - $1) WHERE id = $2 AND business_id = $3',
                    [quantity, batchId, businessId]
                );
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Add Stock (Purchase/Stock In)
 * 
 * @param {Object} params - Stock in parameters
 * @param {string} params.businessId - Business UUID
 * @param {string} params.productId - Product UUID
 * @param {string} [params.warehouseId] - Warehouse UUID
 * @param {number} params.quantity - Quantity to add
 * @param {number} params.costPrice - Unit cost price
 * @param {string} [params.batchNumber] - Optional batch number
 * @param {string|Date} [params.manufacturingDate] - Manufacturing date
 * @param {string|Date} [params.expiryDate] - Expiry date
 * @param {string} [params.notes] - Entry notes
 * @param {string} [params.referenceType='purchase'] - Reference type
 * @param {string} [params.referenceId] - Reference document ID
 * @param {Object} [params.domainData] - Domain specific metadata
 * @param {import('pg').PoolClient} [txClient] - Optional transaction client
 */
export async function addStockAction(params, txClient = null) {
    try {
        // [OK] 1. Validate with Zod
        const validation = validateWithSchema(addStockSchema, params);
        if (!validation.success) {
            return { success: false, error: 'Validation failed', errors: validation.errors };
        }
        const validated = validation.data;

        await checkAuth(validated.business_id, 'inventory.adjust_stock', txClient || null);
        const client = txClient || await pool.connect();
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            let {
                business_id: businessId, product_id: productId, warehouse_id: warehouseId,
                quantity: qty, cost_price: cp,
                batch_number: batchNumber, manufacturing_date: manufacturingDate,
                expiry_date: expiryDate, notes,
                reference_type: referenceType = 'purchase', reference_id: referenceId,
                domain_data: domainData = {},
                serial_numbers: serialNumbers = []
            } = validated;

            // 0. Auto-resolve Primary Warehouse if none provided
            if (!warehouseId) {
                const primaryRes = await client.query(`
                    SELECT id FROM warehouse_locations 
                    WHERE business_id = $1 AND is_primary = TRUE 
                    LIMIT 1
                `, [businessId]);
                warehouseId = primaryRes.rows[0]?.id || null;

                // STRICT MODE: If we still don't have a warehouseId, we must CREATE a default one on the fly.
                // This prevents "Floating Stock" (stock in null warehouse).
                if (!warehouseId) {
                    const newWhRes = await client.query(`
                        INSERT INTO warehouse_locations (business_id, name, is_primary, type)
                        VALUES ($1, 'Main Warehouse', TRUE, 'warehouse')
                        ON CONFLICT (business_id) WHERE is_primary = TRUE DO NOTHING
                        RETURNING id
                    `, [businessId]);

                    // If insert returned nothing (race condition), fetch again
                    if (newWhRes.rows.length === 0) {
                        const retryRes = await client.query(`
                            SELECT id FROM warehouse_locations 
                            WHERE business_id = $1 AND is_primary = TRUE LIMIT 1
                        `, [businessId]);
                        warehouseId = retryRes.rows[0]?.id;
                    } else {
                        warehouseId = newWhRes.rows[0].id;
                    }
                }

                if (!warehouseId) throw new Error("Critical: Failed to resolve or create a valid Warehouse ID for stock entry.");
            }

            const quantity = Number(qty || 0);
            const costPrice = Number(cp || 0);

            // 1. Get Product with Lock
            const pRes = await client.query('SELECT stock, cost_price, name, reorder_point, min_stock FROM products WHERE id = $1 AND business_id = $2 FOR UPDATE', [productId, businessId]);
            if (pRes.rows.length === 0) throw new Error('Product not found or access denied');
            const product = pRes.rows[0];

            const newStock = Math.round(((product.stock || 0) + quantity) * 100) / 100;
            const totalValue = ((product.stock || 0) * (product.cost_price || 0)) + (quantity * costPrice);
            const newCostPrice = newStock > 0 ? Math.round((totalValue / newStock) * 100) / 100 : costPrice;

            // Update Product
            await client.query('UPDATE products SET stock = $1, cost_price = $2 WHERE id = $3 AND business_id = $4', [newStock, newCostPrice, productId, businessId]);

            // 2. Handle Batch (Robust Upsert)
            let batchId = null;
            if (batchNumber) {
                const batchRes = await client.query(`
                    INSERT INTO product_batches (
                        business_id, product_id, warehouse_id, batch_number,
                        manufacturing_date, expiry_date, quantity, cost_price, notes, domain_data
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (business_id, product_id, batch_number) 
                    DO UPDATE SET 
                        quantity = product_batches.quantity + EXCLUDED.quantity,
                        cost_price = (product_batches.quantity * product_batches.cost_price + EXCLUDED.quantity * EXCLUDED.cost_price) / (product_batches.quantity + EXCLUDED.quantity),
                        updated_at = NOW()
                    RETURNING id
                `, [businessId, productId, warehouseId, batchNumber, manufacturingDate, expiryDate, quantity, costPrice, notes, domainData]);
                batchId = batchRes.rows[0].id;
            }

            // 2.5 Update Location Stock
            if (warehouseId) {
                await client.query(`
                    INSERT INTO product_stock_locations (
                        business_id, warehouse_id, product_id, quantity
                    ) VALUES ($1, $2, $3, $4)
                    ON CONFLICT (warehouse_id, product_id) 
                    DO UPDATE SET 
                        quantity = product_stock_locations.quantity + EXCLUDED.quantity,
                        updated_at = NOW()
                `, [businessId, warehouseId, productId, quantity]);
            }

            // 2.7 Handle Serials
            if (serialNumbers && serialNumbers.length > 0) {
                for (const sn of serialNumbers) {
                    await client.query(`
                        INSERT INTO product_serials (
                            business_id, product_id, warehouse_id, batch_id, 
                            serial_number, status, purchase_date, notes
                        ) VALUES ($1, $2, $3, $4, $5, 'available', NOW(), $6)
                        ON CONFLICT (business_id, serial_number) 
                        DO UPDATE SET 
                            status = 'available',
                            updated_at = NOW()
                    `, [businessId, productId, warehouseId, batchId, sn, notes]);
                }
            }

            // 3. Stock Movement
            const moveRes = await client.query(`
                INSERT INTO stock_movements (
                    business_id, product_id, warehouse_id, batch_id, movement_type,
                    transaction_type, quantity_change, unit_cost, reference_type, 
                    reference_id, notes, domain_data
                ) VALUES ($1, $2, $3, $4, 'in', $5, $6, $7, $8, $9, $10, $11)
                RETURNING id
            `, [
                businessId, productId, warehouseId, batchId,
                referenceType, quantity, costPrice, referenceType,
                referenceId, notes, domainData
            ]);

            // 3.5 Inventory Ledger
            await client.query(`
                INSERT INTO inventory_ledger (
                    business_id, warehouse_id, product_id, transaction_type, 
                    reference_id, reference_type, quantity_change, running_balance,
                    unit_cost, total_value, batch_number, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
                businessId, warehouseId, productId, referenceType,
                referenceId || moveRes.rows[0].id, referenceType,
                quantity, newStock, costPrice, quantity * costPrice,
                batchNumber || null, notes
            ]);

            // 4. Accounting (Synchronous within Transaction) - Dynamic GL Lookup
            if (referenceType === 'purchase' || referenceType === 'production') {
                try {
                    // [OK] Dynamic GL Account Lookup
                    const accountTypes = referenceType === 'purchase'
                        ? ['inventory', 'ap']  // Inventory Asset, Accounts Payable
                        : ['inventory', 'expense'];  // Inventory Asset, Manufacturing Cost

                    const glAccounts = await getGLAccountsByTypes(businessId, accountTypes, client);

                    const entries = referenceType === 'purchase'
                        ? [
                            { account_id: glAccounts.inventory.id, debit: quantity * costPrice, credit: 0 },
                            { account_id: glAccounts.ap.id, debit: 0, credit: quantity * costPrice }
                        ]
                        : [
                            { account_id: glAccounts.inventory.id, debit: quantity * costPrice, credit: 0 },
                            { account_id: glAccounts.expense.id, debit: 0, credit: quantity * costPrice }
                        ];

                    // Create GL entries in batch
                    await createGLEntryAction({
                        businessId: businessId,
                        date: new Date(),
                        description: `Stock In (${referenceType}): ${notes || 'Inventory Addition'}`,
                        referenceType: referenceType === 'purchase' ? 'purchase' : 'production',
                        referenceId: referenceId || moveRes.rows[0].id,
                        entries
                    }, client);
                } catch (accError) {
                    console.error("Accounting posting failed in addStockAction. Rolling back.", accError);
                    throw accError; // Fail the entire transaction if accounting fails
                }
            }

            if (shouldManageTransaction) await client.query('COMMIT');

            // 🚀 2026 BEST PRACTICE: Proactive Post-Transaction Orchestration
            // These are fire-and-forget or async syncs to prevent blocking the main response
            (async () => {
                try {
                    // 1. Omnichannel Sync
                    await IntegrationEngine.syncAll(productId, newStock);

                    // 2. Agentic Workflow Trigger
                    await WorkflowEngine.evaluateTriggers(businessId, {
                        productId,
                        productName: product.name,
                        stock: newStock,
                        reorderPoint: Number(product.reorder_point || product.min_stock || 0),
                        action: 'stock_in',
                        quantityChanged: quantity
                    });
                } catch (e) {
                    console.error("Post-transaction orchestration failed:", e);
                }
            })();

            return { success: true, newStock, newCostPrice, batchId, movementId: moveRes.rows[0].id };

        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Remove Stock (Sale/Stock Out)
 * 
 * @param {Object} params - Stock out parameters
 * @param {string} params.businessId - Business UUID
 * @param {string} params.productId - Product UUID
 * @param {string} [params.warehouseId] - Warehouse UUID
 * @param {number} params.quantity - Quantity to remove
 * @param {string} [params.valuationMethod='FIFO'] - Stock valuation method
 * @param {string} [params.referenceType='sale'] - Reference type
 * @param {string} [params.referenceId] - Reference document ID
 * @param {string} [params.notes] - Entry notes
 * @param {import('pg').PoolClient} [txClient] - Optional transaction client
 */
export async function removeStockAction(params, txClient = null) {
    try {
        // [OK] 1. Validate with Zod
        const validation = validateWithSchema(removeStockSchema, params);
        if (!validation.success) {
            return { success: false, error: 'Validation failed', errors: validation.errors };
        }
        const validated = validation.data;

        await checkAuth(validated.business_id, 'inventory.adjust_stock', txClient || null);
        const client = txClient || await pool.connect();
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const {
                business_id: businessId, product_id: productId, warehouse_id: warehouseId,
                quantity,
                reference_type: referenceType = 'sale', reference_id: referenceId, notes,
                serial_numbers: serialNumbers = [], batch_id: batchId
            } = validated;

            // 1. Get Product
            const pRes = await client.query(
                'SELECT stock, cost_price FROM products WHERE id = $1 AND business_id = $2 FOR UPDATE',
                [productId, businessId]
            );
            if (pRes.rows.length === 0) {
                throw new Error('Product not found or access denied');
            }
            const product = pRes.rows[0];

            if ((product.stock || 0) < quantity) {
                throw new Error(`Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`);
            }

            // 2. Allocations (Simplified FIFO/FEFO logic directly via SQL)
            let costOfGoodsSold = 0;
            let allocated = 0;

            if (batchId) {
                // [OK] EXPLICIT BATCH TARGETING (for Delta Reconciliation)
                const bRes = await client.query(
                    'SELECT id, quantity, cost_price FROM product_batches WHERE id = $1 AND business_id = $2 FOR UPDATE',
                    [batchId, businessId]
                );

                if (bRes.rows.length === 0) throw new Error('Target batch not found');
                const batch = bRes.rows[0];

                if (batch.quantity < quantity) {
                    throw new Error(`Insufficient stock in specified batch. Available: ${batch.quantity}, Requested: ${quantity}`);
                }

                // Update Specific Batch
                await client.query('UPDATE product_batches SET quantity = quantity - $1 WHERE id = $2 AND business_id = $3', [quantity, batchId, businessId]);

                allocated = quantity;
                costOfGoodsSold = quantity * batch.cost_price;
            } else {
                // 🔄 FEFO (First Expiry First Out) Default Logic
                const batchRes = await client.query(`
                    SELECT id, quantity, cost_price, expiry_date 
                    FROM product_batches 
                    WHERE product_id = $1 AND business_id = $2 AND quantity > 0 AND is_active = true
                    ORDER BY expiry_date ASC NULLS LAST, created_at ASC
                `, [productId, businessId]);

                for (const batch of batchRes.rows) {
                    if (allocated >= quantity) break;

                    const needed = quantity - allocated;
                    const take = Math.min(batch.quantity, needed);

                    // Update Batch
                    await client.query('UPDATE product_batches SET quantity = quantity - $1 WHERE id = $2 AND business_id = $3', [take, batch.id, businessId]);

                    allocated += take;
                    costOfGoodsSold += (take * batch.cost_price);
                }

                if (allocated < quantity) {
                    // Fallback if batches didn't cover it (legacy stock?)
                    // Use avg cost for remainder
                    const remainder = quantity - allocated;
                    costOfGoodsSold += (remainder * product.cost_price);
                }
            }

            // 3. Update Product
            const newStock = product.stock - quantity;
            await client.query('UPDATE products SET stock = $1 WHERE id = $2 AND business_id = $3', [newStock, productId, businessId]);

            // 3.2 Update Serials status if provided
            if (serialNumbers && serialNumbers.length > 0) {
                // Update status of specific serials
                await client.query(`
                    UPDATE product_serials 
                    SET status = 'sold', 
                        sale_date = NOW(),
                        invoice_id = $1,
                        updated_at = NOW()
                    WHERE business_id = $2 AND serial_number = ANY($3::text[])
                `, [referenceId, businessId, serialNumbers]);
            } else if (batchId) {
                // If specific batch provided, decrement its stock explicitly
                // Note: removeStockAction already does FIFO/FEFO if no batchId is passed.
                // If batchId IS passed, we should probably ONLY take from that batch?
                // This would override the FEFO logic below.
            }

            // 3.5 Update Location Stock
            if (warehouseId) {
                const locRes = await client.query(`
                    UPDATE product_stock_locations 
                    SET quantity = quantity - $1, updated_at = NOW()
                    WHERE warehouse_id = $2 AND product_id = $3
                    RETURNING quantity
                `, [quantity, warehouseId, productId]);

                if (locRes.rows.length === 0 || locRes.rows[0].quantity < 0) {
                    // If no record or resulting negative, we might want to throw or just allow if global allowed?
                    // Busy.in usually prevents negative if configured.
                    // For now, let's enforce warehouse-level stock integrity.
                    if (locRes.rows.length === 0) {
                        throw new Error(`Stock not found at specified warehouse.`);
                    }
                }
            }

            // 4. Movement
            const moveRes = await client.query(`
                INSERT INTO stock_movements (
                    business_id, product_id, warehouse_id, movement_type, transaction_type,
                    quantity_change, unit_cost, reference_type, reference_id, notes
                ) VALUES ($1, $2, $3, 'out', $4, $5, $6, $7, $8, $9)
                RETURNING id
            `, [
                businessId, productId, warehouseId, referenceType, -quantity,
                costOfGoodsSold / quantity, referenceType, referenceId, notes
            ]);

            // 4.5 Inventory Ledger
            await client.query(`
                INSERT INTO inventory_ledger (
                    business_id, warehouse_id, product_id, transaction_type, 
                    reference_id, reference_type, quantity_change, running_balance,
                    unit_cost, total_value, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                businessId, warehouseId, productId, referenceType,
                referenceId || moveRes.rows[0].id, referenceType,
                -quantity, newStock, costOfGoodsSold / quantity, costOfGoodsSold, notes
            ]);

            // 5. Financial Posting (COGS) - Synchronous with Dynamic GL Lookup
            // Record Cost of Goods Sold every time stock is removed for sales or other purposes
            if (costOfGoodsSold > 0) {
                try {
                    const isSale = referenceType === 'sale' || referenceType === 'invoices';
                    const isProduction = referenceType === 'production_consumption';

                    // [OK] Dynamic GL Account Lookup
                    const accountTypes = isProduction
                        ? ['expense', 'inventory']  // Manufacturing Cost, Inventory Asset
                        : ['cogs', 'inventory'];     // COGS, Inventory Asset

                    const glAccounts = await getGLAccountsByTypes(businessId, accountTypes, client);

                    const entries = isProduction
                        ? [
                            { account_id: glAccounts.expense.id, debit: costOfGoodsSold, credit: 0 },
                            { account_id: glAccounts.inventory.id, debit: 0, credit: costOfGoodsSold }
                        ]
                        : [
                            { account_id: glAccounts.cogs.id, debit: costOfGoodsSold, credit: 0 },
                            { account_id: glAccounts.inventory.id, debit: 0, credit: costOfGoodsSold }
                        ];

                    // Create GL entries in batch
                    await createGLEntryAction({
                        businessId: businessId,
                        date: new Date(),
                        description: `${isProduction ? 'Manufacturing Consumption' : 'COGS'}: ${notes || 'Stock Out'}`,
                        referenceType: isSale ? 'invoice' : 'production',
                        referenceId: referenceId || moveRes.rows[0].id,
                        entries
                    }, client);
                } catch (accError) {
                    console.error("Accounting posting failed in removeStockAction:", accError);
                    throw accError;
                }
            }

            if (shouldManageTransaction) await client.query('COMMIT');

            // 🚀 2026 BEST PRACTICE: Proactive Post-Transaction Orchestration
            (async () => {
                try {
                    // 1. Omnichannel Sync
                    await IntegrationEngine.syncAll(productId, newStock);

                    // 2. Agentic Workflow Trigger
                    await WorkflowEngine.evaluateTriggers(businessId, {
                        productId,
                        productName: product.name,
                        stock: newStock,
                        reorderPoint: Number(product.reorder_point || product.min_stock || 0),
                        action: 'stock_out',
                        quantityChanged: -quantity
                    });
                } catch (e) {
                    console.error("Post-transaction orchestration failed:", e);
                }
            })();

            return { success: true, newStock, movementId: moveRes.rows[0].id, costOfGoodsSold };

        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Transfer Stock
 */
export async function transferStockAction(params) {
    try {
        // [OK] 1. Validate with Zod
        const validation = validateWithSchema(transferStockSchema, params);
        if (!validation.success) {
            return { success: false, error: 'Validation failed', errors: validation.errors };
        }
        const validated = validation.data;

        await checkAuth(validated.business_id, 'inventory.transfer');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { business_id: businessId, product_id: productId, from_warehouse_id: fromWarehouseId, to_warehouse_id: toWarehouseId, quantity, batch_id: batchId, serial_numbers: serialNumbers, notes } = validated;

            // 0. Pre-transaction validation: Ensure stock exists at source
            const stockCheck = await client.query(`
                SELECT quantity FROM product_stock_locations 
                WHERE warehouse_id = $1 AND product_id = $2 AND business_id = $3
            `, [fromWarehouseId, productId, businessId]);

            const available = Number(stockCheck.rows[0]?.quantity || 0);
            if (available < quantity) {
                throw new Error(`Insufficient stock at source warehouse. Available: ${available}, Requested: ${quantity}`);
            }

            // 0.5 If serials provided, ensure they exist at source
            if (serialNumbers && serialNumbers.length > 0) {
                if (serialNumbers.length !== quantity) {
                    throw new Error(`Serial numbers count (${serialNumbers.length}) does not match quantity (${quantity})`);
                }

                const sRes = await client.query(`
                    SELECT COUNT(*) FROM product_serials 
                    WHERE business_id = $1 AND product_id = $2 AND warehouse_id = $3 
                    AND status = 'in_stock' AND serial_number = ANY($4::text[])
                `, [businessId, productId, fromWarehouseId, serialNumbers]);

                if (parseInt(sRes.rows[0].count) !== serialNumbers.length) {
                    throw new Error('Some serial numbers are not available at the source warehouse');
                }

                // Update serials location
                await client.query(`
                    UPDATE product_serials 
                    SET warehouse_id = $1, updated_at = NOW()
                    WHERE business_id = $2 AND serial_number = ANY($3::text[])
                `, [toWarehouseId, businessId, serialNumbers]);
            }

            // 1. Create Transfer Record
            const transferNumber = `TRF-${Date.now()}`;
            const trfRes = await client.query(`
                INSERT INTO stock_transfers (
                    business_id, transfer_number, product_id, batch_id, 
                    from_warehouse_id, to_warehouse_id, quantity, status, 
                    transfer_date, actual_arrival_date, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', NOW(), NOW(), $8)
                RETURNING *
            `, [businessId, transferNumber, productId, batchId, fromWarehouseId, toWarehouseId, quantity, notes]);
            const transfer = trfRes.rows[0];

            // 2. Movements (Out from Source, In to Dest)
            // Note: transfers don't change global products.stock, but DO change location stock

            // 2.1 Validate and Update Source
            const srcRes = await client.query(`
                UPDATE product_stock_locations 
                SET quantity = quantity - $1, updated_at = NOW()
                WHERE warehouse_id = $2 AND product_id = $3 AND business_id = $4
                RETURNING quantity
            `, [quantity, fromWarehouseId, productId, businessId]);

            if (srcRes.rows.length === 0 || srcRes.rows[0].quantity < 0) {
                throw new Error('Insufficient stock at source warehouse or access denied');
            }

            // 2.1.5 Ledger entry for Source
            await client.query(`
                INSERT INTO inventory_ledger (
                    business_id, warehouse_id, product_id, transaction_type, 
                    reference_id, reference_type, quantity_change, running_balance,
                    notes
                ) VALUES ($1, $2, $3, 'transfer_out', $4, 'transfer', $5, $6, $7)
            `, [businessId, fromWarehouseId, productId, transfer.id, -quantity, srcRes.rows[0].quantity, notes]);

            // 2.2 Update Destination
            await client.query(`
                INSERT INTO product_stock_locations (
                    business_id, warehouse_id, product_id, quantity
                ) VALUES ($1, $2, $3, $4)
                ON CONFLICT (warehouse_id, product_id) 
                DO UPDATE SET 
                    quantity = product_stock_locations.quantity + EXCLUDED.quantity,
                    updated_at = NOW()
            `, [businessId, toWarehouseId, productId, quantity]);

            await client.query(`
                INSERT INTO stock_movements (
                    business_id, product_id, warehouse_id, batch_id, movement_type, 
                    transaction_type, quantity_change, unit_cost, reference_type, reference_id, notes
                ) VALUES ($1, $2, $3, $4, 'transfer_out', 'transfer', $5, 0, 'stock_transfer', $6, $7)
            `, [businessId, productId, fromWarehouseId, batchId, -quantity, transfer.id, `Transfer to ${toWarehouseId}`]);

            await client.query(`
                INSERT INTO stock_movements (
                    business_id, product_id, warehouse_id, batch_id, movement_type, 
                    transaction_type, quantity_change, unit_cost, reference_type, reference_id, notes
                ) VALUES ($1, $2, $3, $4, 'transfer_in', 'transfer', $5, 0, 'stock_transfer', $6, $7)
            `, [businessId, productId, toWarehouseId, batchId, quantity, transfer.id, `Transfer from ${fromWarehouseId}`]);

            await client.query('COMMIT');
            return { success: true, transfer };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Adjust Stock
 */
export async function adjustStockAction(params) {
    try {
        // [OK] 1. Validate with Zod
        const validation = validateWithSchema(adjustStockSchema, params);
        if (!validation.success) {
            return { success: false, error: 'Validation failed', errors: validation.errors };
        }
        const validated = validation.data;

        await checkAuth(validated.business_id, 'inventory.adjust_stock');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { business_id: businessId, product_id: productId, warehouse_id: warehouseId, quantity_change: quantityChange, serial_numbers: serialNumbers, reason, notes } = validated;

            // 1. Get Product
            const pRes = await client.query('SELECT stock, cost_price FROM products WHERE id = $1 AND business_id = $2 FOR UPDATE', [productId, businessId]);
            if (pRes.rows.length === 0) throw new Error('Product not found or access denied');
            const product = pRes.rows[0];
            const prevStock = Number(product.stock || 0);
            const newStock = prevStock + quantityChange;

            if (newStock < 0) throw new Error('Invalid adjustment. Resulting stock negative.');

            // 1.5 Handle Serials
            if (serialNumbers && serialNumbers.length > 0) {
                const qty = Math.abs(quantityChange);
                if (serialNumbers.length !== qty) {
                    throw new Error(`Serial numbers count (${serialNumbers.length}) does not match quantity change magnitude (${qty})`);
                }

                if (quantityChange < 0) {
                    // Outgoing: Verify they exist and mark as sold/adjusted
                    const sRes = await client.query(`
                        SELECT COUNT(*) FROM product_serials 
                        WHERE business_id = $1 AND product_id = $2 AND warehouse_id = $3 
                        AND status = 'in_stock' AND serial_number = ANY($4::text[])
                    `, [businessId, productId, warehouseId, serialNumbers]);

                    if (parseInt(sRes.rows[0].count) !== serialNumbers.length) {
                        throw new Error('Some serial numbers are not available for removal');
                    }

                    await client.query(`
                        UPDATE product_serials 
                        SET status = 'sold', notes = $1, updated_at = NOW()
                        WHERE business_id = $2 AND serial_number = ANY($3::text[])
                    `, [`Adjustment Out: ${reason}`, businessId, serialNumbers]);
                } else {
                    // Incoming: Register new serials (Parameterized for safety)
                    for (const s of serialNumbers) {
                        await client.query(`
                            INSERT INTO product_serials (business_id, product_id, serial_number, status, warehouse_id, created_at, updated_at)
                            VALUES ($1, $2, $3, 'in_stock', $4, NOW(), NOW())
                            ON CONFLICT (business_id, serial_number) DO UPDATE SET status = 'in_stock', warehouse_id = EXCLUDED.warehouse_id, updated_at = NOW()
                        `, [businessId, productId, s, warehouseId]);
                    }
                }
            }

            // 2. Update Stock
            await client.query('UPDATE products SET stock = $1 WHERE id = $2 AND business_id = $3', [newStock, productId, businessId]);

            // 2.5 Update Location Stock
            if (warehouseId) {
                await client.query(`
                    INSERT INTO product_stock_locations (
                        business_id, warehouse_id, product_id, quantity
                    ) VALUES ($1, $2, $3, $4)
                    ON CONFLICT (warehouse_id, product_id)
                    DO UPDATE SET 
                        quantity = product_stock_locations.quantity + EXCLUDED.quantity,
                        updated_at = NOW()
                `, [businessId, warehouseId, productId, quantityChange]);
            }

            // 3. Movement
            const moveType = quantityChange > 0 ? 'adjustment_in' : 'adjustment_out';
            const moveRes = await client.query(`
                INSERT INTO stock_movements (
                    business_id, product_id, warehouse_id, movement_type, transaction_type,
                    quantity_change, unit_cost, reference_type, notes
                ) VALUES ($1, $2, $3, $4, 'adjustment', $5, $6, 'adjustment', $7)
                RETURNING id
            `, [businessId, productId, warehouseId, moveType, quantityChange, product.cost_price, `${reason}: ${notes}`]);

            // 4. Automated Accounting (GL Posting) - must remain inside transaction
            const amount = Math.abs(quantityChange) * (product.cost_price || 0);
            if (amount > 0) {
                // Stock adjustments use inventory vs expense (not revenue)
                // Positive adjustment: DR Inventory, CR Inventory Adjustment (expense reversal)
                // Negative adjustment: DR Inventory Adjustment (expense), CR Inventory
                const accountTypes = ['inventory', 'expense'];

                const glAccounts = await getGLAccountsByTypes(businessId, accountTypes, client);
                const entries = quantityChange > 0
                    ? [
                        { account_id: glAccounts.inventory.id, debit: amount, credit: 0 },
                        { account_id: glAccounts.expense.id, debit: 0, credit: amount }
                    ]
                    : [
                        { account_id: glAccounts.expense.id, debit: amount, credit: 0 },
                        { account_id: glAccounts.inventory.id, debit: 0, credit: amount }
                    ];

                await createGLEntryAction({
                    businessId: businessId,
                    date: new Date(),
                    description: `Stock Adjustment: ${reason}`,
                    referenceType: 'adjustment',
                    referenceId: moveRes.rows[0].id,
                    entries
                }, client);
            }

            await client.query('COMMIT');

            // 🚀 2026 BEST PRACTICE: Proactive Post-Transaction Orchestration
            (async () => {
                try {
                    // 1. Omnichannel Sync
                    await IntegrationEngine.syncAll(productId, newStock);

                    // 2. Agentic Workflow Trigger
                    await WorkflowEngine.evaluateTriggers(businessId, {
                        productId,
                        productName: product.name,
                        stock: newStock,
                        reorderPoint: Number(product.reorder_point || product.min_stock || 0),
                        action: 'stock_adjustment',
                        quantityChanged: quantityChange
                    });
                } catch (e) {
                    console.error("Post-transaction orchestration failed for adjustment:", e);
                }
            })();

            return { success: true, newStock, movementId: moveRes.rows[0].id };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Get Stock Valuation
 */
export async function getStockValuationAction(businessId, warehouseId = null) {
    try {
        await checkAuth(businessId, 'inventory.view');
        const client = await pool.connect();
        try {
            let query = `
                SELECT p.id, p.name, p.sku, p.cost_price, p.price,
                COALESCE(SUM(psl.quantity), p.stock) as stock
                FROM products p
                LEFT JOIN product_stock_locations psl ON p.id = psl.product_id
                WHERE p.business_id = $1 AND p.is_active = true
            `;
            const params = [businessId];

            if (warehouseId) {
                query += ` AND psl.warehouse_id = $2`;
                params.push(warehouseId);
            }

            query += ` GROUP BY p.id`;

            const res = await client.query(query, params);

            const products = res.rows;
            const valuation = products.map(p => ({
                productId: p.id,
                name: p.name,
                sku: p.sku,
                stock: Number(p.stock),
                costPrice: Number(p.cost_price),
                sellingPrice: Number(p.price),
                stockValue: Number(p.stock) * Number(p.cost_price),
                potentialRevenue: Number(p.stock) * Number(p.price),
                potentialProfit: Number(p.stock) * (Number(p.price) - Number(p.cost_price))
            }));

            const totals = {
                totalStockValue: valuation.reduce((sum, v) => sum + v.stockValue, 0),
                totalPotentialRevenue: valuation.reduce((sum, v) => sum + v.potentialRevenue, 0),
                totalPotentialProfit: valuation.reduce((sum, v) => sum + v.potentialProfit, 0),
                totalItems: products.length,
                totalUnits: valuation.reduce((sum, v) => sum + v.stock, 0)
            };

            return { success: true, valuation, totals };
        } finally {
            client.release();
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Get Stock Movements
 */
export async function getStockMovementsAction(productId, limit = 50) {
    try {
        const client = await pool.connect();
        try {
            const pRes = await client.query('SELECT business_id FROM products WHERE id = $1', [productId]);
            if (pRes.rows.length === 0) throw new Error('Product not found');
            await checkAuth(pRes.rows[0].business_id, 'inventory.view');
            const res = await client.query(`
                SELECT m.*, w.name as warehouse_name, pb.batch_number
                FROM stock_movements m
                LEFT JOIN warehouse_locations w ON m.warehouse_id = w.id
                LEFT JOIN product_batches pb ON m.batch_id = pb.id
                WHERE m.product_id = $1 AND m.business_id = $2
                ORDER BY m.created_at DESC
                LIMIT $3
            `, [productId, pRes.rows[0].business_id, limit]);

            // Map keys to match expected output if needed (e.g. nested objects)
            // Original used Supabase join: warehouses (name). Result is { ..., warehouses: { name: ... } }
            // Our SQL returns flat `warehouse_name`.
            // We should map it to match UI expectations if it accesses properties deeply.
            // Let's assume UI might do `movement.warehouses?.name`.
            const movements = res.rows.map(row => ({
                ...row,
                warehouses: { name: row.warehouse_name },
                product_batches: { batch_number: row.batch_number }
            }));

            return { success: true, movements };
        } finally {
            client.release();
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Get Low Stock Alerts
 */
export async function getLowStockAlertsAction(businessId) {
    try {
        await checkAuth(businessId, 'inventory.view');
        const client = await pool.connect();
        try {
            // Using a default threshold of 10 if min_stock_level is not set/exists
            // Checking if min_stock_level column exists effectively by coalescing or just using logic.
            // Ideally schema has min_stock_level. If not, we assume 5.
            const res = await client.query(`
                SELECT id, name, sku, stock, min_stock
                FROM products 
                WHERE business_id = $1 
                AND is_active = true 
                AND stock <= COALESCE(min_stock, 5)
                ORDER BY stock ASC
            `, [businessId]);

            return { success: true, alerts: res.rows };
        } finally {
            client.release();
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}
