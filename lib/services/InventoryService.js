import pool from '@/lib/db';
import {
    addStockSchema,
    removeStockSchema,
    transferStockSchema,
    reserveStockSchema,
    releaseStockSchema,
    adjustStockSchema
} from '@/lib/validation/schemas';
import { getGLAccountsByTypes } from '@/lib/actions/basic/accounting'; // Still needed as action for now or refactor later
import { AccountingService } from './AccountingService';
import { IntegrationEngine } from './integrations/integrationEngine';
import { AIOrderForecaster } from './ai/forecasting';
import { WorkflowEngine } from './workflows/workflowEngine';
import { validateDomainData } from '@/lib/validation/domainSchemas';
import { ProcurementAgent } from './ai/ProcurementAgent';
import { notifyLowStock } from '@/lib/notifications/notificationHelpers';

/**
 * Inventory Service
 * Central Orchestration Layer for Stock and Intelligence
 * 2026 Enterprise Standards: Service-First Logic
 */
export const InventoryService = {

    /**
     * Sync Product Stock from locations to main product record (Cached Truth)
     */
    async syncProductStock(productId, businessId, txClient = null) {
        const client = await this.getClient(txClient);
        const res = await client.query(
            `SELECT COALESCE(SUM(quantity), 0) as total_stock 
             FROM product_stock_locations 
             WHERE product_id = $1 AND business_id = $2`,
            [productId, businessId]
        );
        const totalStock = parseFloat(res.rows[0]?.total_stock ?? 0);
        await client.query(
            `UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3`,
            [totalStock, productId, businessId]
        );
        return totalStock;
    },

    /**
     * Internal helper for database connection
     */
    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Add Stock (Inward Movement)
     */
    async addStock(params, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            // Internal Schema Validation for Parity
            addStockSchema.parse(params);

            if (shouldManageTransaction) await client.query('BEGIN');

            let {
                business_id: businessId, product_id: productId, warehouse_id: warehouseId,
                quantity: qty, cost_price: cp,
                batch_number: batchNumber, manufacturing_date: manufacturingDateRaw,
                expiry_date: expiryDateRaw, notes,
                reference_type: referenceType = 'purchase', reference_id: referenceId,
                domain_data: domainData = {},
                serial_numbers: serialNumbers = []
            } = params;

            // Secondary Sanitization for Multi-Tenant Safety
            const manufacturingDate = (manufacturingDateRaw === '' || !manufacturingDateRaw) ? null : manufacturingDateRaw;
            const expiryDate = (expiryDateRaw === '' || !expiryDateRaw) ? null : expiryDateRaw;

            const state = params.state || 'sellable';

            // 1. Resolve Warehouse & Business Context
            if (!warehouseId) {
                const whRes = await client.query(`SELECT id FROM warehouse_locations WHERE business_id = $1 AND is_primary = TRUE LIMIT 1`, [businessId]);
                warehouseId = whRes.rows[0]?.id;
                if (!warehouseId) {
                    const newWh = await client.query(`INSERT INTO warehouse_locations (business_id, name, is_primary, type) VALUES ($1, 'Main Warehouse', TRUE, 'warehouse') RETURNING id`, [businessId]);
                    warehouseId = newWh.rows[0].id;
                }
            }

            // High-Performance Domain Validation
            const bRes = await client.query('SELECT category FROM businesses WHERE id = $1', [businessId]);
            const businessCategory = bRes.rows[0]?.category;

            if (Object.keys(domainData).length > 0 && businessCategory) {
                const domainResult = validateDomainData(businessCategory, domainData);
                if (!domainResult.success) {
                    throw new Error(`Domain validation for [${businessCategory}] failed: ${domainResult.error.errors.map(e => e.path.join('.') + ' ' + e.message).join(', ')}`);
                }
                domainData = domainResult.data;
            }

            const quantity = Number(qty || 0);
            const costPrice = Number(cp || 0);

            // 2. Product Update (Cost Price Only - Stock will be synced from locations)
            const pRes = await client.query('SELECT stock, cost_price, unit, unit_conversions, name FROM products WHERE id = $1 AND business_id = $2 FOR UPDATE', [productId, businessId]);
            if (pRes.rows.length === 0) throw new Error('Product not found');
            const product = pRes.rows[0];

            let finalQuantity = quantity;
            let finalCostPrice = costPrice;

            if (params.unit && params.unit !== product.unit) {
                const factor = (product.unit_conversions || {})[params.unit];
                if (factor) {
                    finalQuantity = quantity * factor;
                    finalCostPrice = costPrice / factor;
                }
            }

            const currentStock = parseFloat(product.stock || 0);
            const totalValue = (currentStock * parseFloat(product.cost_price || 0)) + (finalQuantity * finalCostPrice);
            const newStockApprox = currentStock + finalQuantity;
            const newCostPrice = newStockApprox > 0 ? Math.round((totalValue / newStockApprox) * 100) / 100 : finalCostPrice;

            await client.query('UPDATE products SET cost_price = $1 WHERE id = $2 AND business_id = $3', [newCostPrice, productId, businessId]);

            // 3. Batch/Serial/Location Management
            let batchId = null;
            if (batchNumber) {
                const bRes = await client.query(`
                    INSERT INTO product_batches (business_id, product_id, warehouse_id, batch_number, manufacturing_date, expiry_date, quantity, cost_price, notes, domain_data)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (business_id, product_id, batch_number) 
                    DO UPDATE SET quantity = product_batches.quantity + EXCLUDED.quantity, updated_at = NOW()
                    RETURNING id
                `, [businessId, productId, warehouseId, batchNumber, manufacturingDate, expiryDate, finalQuantity, finalCostPrice, notes, domainData]);
                batchId = bRes.rows[0].id;
            }

            await client.query(`
                INSERT INTO product_stock_locations (business_id, warehouse_id, product_id, quantity, state)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (business_id, warehouse_id, product_id, state) DO UPDATE SET quantity = product_stock_locations.quantity + EXCLUDED.quantity, updated_at = NOW()
            `, [businessId, warehouseId, productId, finalQuantity, state]);

            if (serialNumbers?.length > 0) {
                for (const sn of serialNumbers) {
                    await client.query(`
                        INSERT INTO product_serials (business_id, product_id, warehouse_id, batch_id, serial_number, status, purchase_date)
                        VALUES ($1, $2, $3, $4, $5, 'available', NOW())
                        ON CONFLICT (business_id, serial_number) DO UPDATE SET status = 'available', updated_at = NOW()
                    `, [businessId, productId, warehouseId, batchId, sn]);
                }
            }

            // 4. Ledger & Movement
            const moveRes = await client.query(`
                INSERT INTO stock_movements (business_id, product_id, warehouse_id, batch_id, movement_type, transaction_type, quantity_change, unit_cost, reference_type, reference_id, notes, domain_data)
                VALUES ($1, $2, $3, $4, 'in', $5, $6, $7, $8, $9, $10, $11) RETURNING id
            `, [businessId, productId, warehouseId, batchId, referenceType, quantity, costPrice, referenceType, referenceId, notes, domainData]);

            // 5. Sync truth to products cache
            const newStock = await this.syncProductStock(productId, businessId, client);

            await client.query(`
                INSERT INTO inventory_ledger (business_id, warehouse_id, product_id, transaction_type, reference_id, reference_type, quantity_change, running_balance, unit_cost, total_value, batch_number)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [businessId, warehouseId, productId, referenceType, referenceId || moveRes.rows[0].id, referenceType, quantity, newStock, costPrice, quantity * costPrice, batchNumber]);

            // 5. Accounting Link
            if (referenceType === 'purchase' || referenceType === 'production') {
                await AccountingService.recordBusinessTransaction(referenceType, {
                    businessId, referenceId: referenceId || moveRes.rows[0].id,
                    totalAmount: quantity * costPrice, netAmount: quantity * costPrice, 
                    description: notes, date: new Date(), userId
                }, client);
            }

            if (shouldManageTransaction) await client.query('COMMIT');

            // 6. Post-process (Orchestration)
            this.triggerOrchestration(businessId, productId, product.name, newStock, 'stock_in', quantity);

            return { success: true, newStock, batchId, movementId: moveRes.rows[0].id };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Remove Stock (Outward Movement)
     */
    async removeStock(params, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            // Internal Schema Validation for Parity
            removeStockSchema.parse(params);

            if (shouldManageTransaction) await client.query('BEGIN');

            const {
                business_id: businessId, product_id: productId, warehouse_id: warehouseId,
                quantity: qty, reference_type: referenceType = 'sale', reference_id: referenceId, notes,
                serial_numbers: serialNumbers = [], batch_id: batchId
            } = params;

            const customerId = params.customer_id || null;
            const invoiceDate = params.invoice_date || new Date();

            const state = params.state || 'sellable';

            const pRes = await client.query('SELECT stock, cost_price, unit, unit_conversions, name, reorder_point, min_stock FROM products WHERE id = $1 AND business_id = $2 FOR UPDATE', [productId, businessId]);
            if (pRes.rows.length === 0) throw new Error('Product not found');
            const product = pRes.rows[0];

            let finalQuantity = qty;
            if (params.unit && params.unit !== product.unit) {
                const factor = (product.unit_conversions || {})[params.unit];
                if (factor) finalQuantity = qty * factor;
            }

            // Availability Check
            if (warehouseId) {
                const locRes = await client.query('SELECT quantity FROM product_stock_locations WHERE warehouse_id = $1 AND product_id = $2 AND state = $3 FOR UPDATE', [warehouseId, productId, state]);
                if (Number(locRes.rows[0]?.quantity || 0) < finalQuantity) throw new Error('Insufficient warehouse stock');
            } else if ((product.stock || 0) < finalQuantity) {
                throw new Error('Insufficient total stock');
            }

            // Allocation & COGS
            let costOfGoodsSold = 0;
            let allocated = 0;
            const allocations = [];

            if (batchId) {
                const selectedBatchRes = await client.query(
                    `SELECT id, quantity, reserved_quantity, cost_price
                     FROM product_batches
                     WHERE id = $1 AND product_id = $2 AND business_id = $3
                     FOR UPDATE`,
                    [batchId, productId, businessId]
                );

                if (selectedBatchRes.rows.length === 0) {
                    throw new Error('Selected batch not found for this product');
                }

                const selectedBatch = selectedBatchRes.rows[0];
                const availableInBatch = Number(selectedBatch.quantity || 0);
                if (availableInBatch < Number(finalQuantity)) {
                    throw new Error(`Insufficient stock in selected batch. Available: ${availableInBatch}, Required: ${finalQuantity}`);
                }

                await client.query(
                    'UPDATE product_batches SET quantity = quantity - $1 WHERE id = $2 AND business_id = $3',
                    [finalQuantity, selectedBatch.id, businessId]
                );

                allocations.push({
                    batch_id: selectedBatch.id,
                    quantity: Number(finalQuantity),
                    unit_cost: Number(selectedBatch.cost_price || 0)
                });

                allocated = Number(finalQuantity);
                costOfGoodsSold = Number(finalQuantity) * Number(selectedBatch.cost_price || 0);
            } else {
                const batches = await client.query(
                    `SELECT id, quantity, cost_price
                     FROM product_batches
                     WHERE product_id = $1 AND business_id = $2 AND quantity > 0
                     ORDER BY expiry_date ASC NULLS LAST, created_at ASC`,
                    [productId, businessId]
                );

                for (const batch of batches.rows) {
                    if (allocated >= finalQuantity) break;
                    const available = Number(batch.quantity || 0);
                    if (available <= 0) continue;
                    const take = Math.min(available, Number(finalQuantity) - allocated);

                    await client.query(
                        'UPDATE product_batches SET quantity = quantity - $1 WHERE id = $2 AND business_id = $3',
                        [take, batch.id, businessId]
                    );

                    allocations.push({
                        batch_id: batch.id,
                        quantity: Number(take),
                        unit_cost: Number(batch.cost_price || 0)
                    });

                    allocated += Number(take);
                    costOfGoodsSold += (Number(take) * Number(batch.cost_price || 0));
                }
            }

            if (allocated < Number(finalQuantity)) {
                // Fallback for non-batch-managed products: use current product cost.
                // Keep strict failure when an explicit batch was requested.
                if (!batchId && allocations.length === 0) {
                    allocations.push({
                        batch_id: null,
                        quantity: Number(finalQuantity),
                        unit_cost: Number(product.cost_price || 0)
                    });
                    allocated = Number(finalQuantity);
                    costOfGoodsSold = Number(finalQuantity) * Number(product.cost_price || 0);
                } else {
                    throw new Error(`Unable to allocate full quantity from batches. Allocated: ${allocated}, Required: ${finalQuantity}`);
                }
            }

            // Removed manual products.stock update - handled by syncProductStock below

            if (warehouseId) {
                await client.query('UPDATE product_stock_locations SET quantity = quantity - $1 WHERE warehouse_id = $2 AND product_id = $3 AND state = $4 AND business_id = $5', [finalQuantity, warehouseId, productId, state, businessId]);
            }

            let movementId = null;

            for (const allocation of allocations) {
                const moveRes = await client.query(`
                    INSERT INTO stock_movements (
                        business_id, product_id, warehouse_id, batch_id,
                        movement_type, transaction_type, quantity_change, unit_cost,
                        reference_type, reference_id, notes, domain_data
                    )
                    VALUES ($1, $2, $3, $4, 'out', $5, $6, $7, $8, $9, $10, $11)
                    RETURNING id
                `, [
                    businessId,
                    productId,
                    warehouseId,
                    allocation.batch_id,
                    referenceType,
                    -allocation.quantity,
                    allocation.unit_cost,
                    referenceType,
                    referenceId,
                    notes,
                    JSON.stringify({
                        allocated_quantity: allocation.quantity,
                        allocation_method: batchId ? 'manual_batch' : 'fifo'
                    })
                ]);

                if (!movementId) movementId = moveRes.rows[0].id;
            }

            if (serialNumbers.length > 0) {
                const serialRes = await client.query(
                    `SELECT id, serial_number, status, warranty_period_months
                     FROM product_serials
                     WHERE business_id = $1
                       AND product_id = $2
                       AND serial_number = ANY($3::text[])
                       AND is_deleted = false
                     FOR UPDATE`,
                    [businessId, productId, serialNumbers]
                );

                if (serialRes.rows.length !== serialNumbers.length) {
                    throw new Error('One or more serial numbers were not found for this product');
                }

                for (const serial of serialRes.rows) {
                    if (!['in_stock', 'available', 'reserved'].includes(String(serial.status || '').toLowerCase())) {
                        throw new Error(`Serial ${serial.serial_number} is not available for sale (status: ${serial.status})`);
                    }

                    let warrantyEndDate = null;
                    if (serial.warranty_period_months) {
                        const endDate = new Date(invoiceDate);
                        endDate.setMonth(endDate.getMonth() + Number(serial.warranty_period_months));
                        warrantyEndDate = endDate;
                    }

                    await client.query(
                        `UPDATE product_serials
                         SET status = 'sold',
                             sale_date = $1,
                             warranty_start_date = $1,
                             warranty_end_date = COALESCE($2, warranty_end_date),
                             warranty_expiry_date = COALESCE($2, warranty_expiry_date),
                             customer_id = COALESCE($3, customer_id),
                             invoice_id = CASE WHEN $4 = 'invoice' THEN $5 ELSE invoice_id END,
                             updated_at = NOW()
                         WHERE id = $6`,
                        [invoiceDate, warrantyEndDate, customerId, referenceType, referenceId, serial.id]
                    );
                }
            }

            // Accounting (COGS)
            if (costOfGoodsSold > 0) {
                await AccountingService.recordBusinessTransaction('sale_cogs', {
                    businessId, referenceId: referenceId || movementId,
                    costAmount: costOfGoodsSold, description: notes, userId
                }, client);
            }

            // 5. Sync truth to products cache
            const newStock = await this.syncProductStock(productId, businessId, client);

            // Check for low stock and create notification if needed
            const minStock = Number(product.reorder_point || product.min_stock || 5);
            if (newStock <= minStock) {
                try {
                    // Get business info for notification
                    const businessInfo = await client.query(
                        'SELECT id, domain, currency, country, business_name FROM businesses WHERE id = $1',
                        [businessId]
                    );
                    const business = businessInfo.rows[0];
                    
                    if (business) {
                        await notifyLowStock({
                            businessId,
                            business,
                            productId,
                            productName: product.name,
                            currentStock: newStock,
                            minStock,
                            client,
                        });
                    }
                } catch (notifyErr) {
                    console.warn('[InventoryService] low stock notification skipped:', notifyErr?.message || notifyErr);
                }
            }

            if (shouldManageTransaction) await client.query('COMMIT');

            this.triggerOrchestration(businessId, productId, product.name, newStock, 'stock_out', -finalQuantity);

            return {
                success: true,
                newStock,
                movementId,
                costOfGoodsSold,
                allocations,
                serialsUpdated: serialNumbers.length
            };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    async triggerOrchestration(businessId, productId, productName, stock, action, quantityChanged) {
        (async () => {
            try {
                await IntegrationEngine.syncAll(productId, stock);
                await WorkflowEngine.evaluateTriggers(businessId, { productId, productName, stock, action, quantityChanged });
                
                // Agentic Evolution: Trigger autonomous procurement re-evaluation
                if (action === 'stock_out' || action === 'adjustment') {
                    ProcurementAgent.evaluateAndAct(businessId).catch(err => 
                        console.error("Procurement Agent autonomous run failed:", err)
                    );
                }
            } catch (e) {
                console.error("Post-transaction orchestration failed:", e);
            }
        })();
    },

    /**
     * Transfer Stock between warehouses
     */
    async transferStock(params, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            // Internal Schema Validation for Parity
            transferStockSchema.parse(params);

            if (shouldManageTransaction) await client.query('BEGIN');

            const {
                business_id: businessId, product_id: productId, from_warehouse_id: fromWarehouseId,
                to_warehouse_id: toWarehouseId, quantity, batch_id: batchId, serial_numbers: serialNumbers, notes
            } = params;

            // 1. Withdraw from Source
            const srcRes = await client.query(`
                UPDATE product_stock_locations SET quantity = quantity - $1, updated_at = NOW()
                WHERE warehouse_id = $2 AND product_id = $3 AND business_id = $4 RETURNING quantity
            `, [quantity, fromWarehouseId, productId, businessId]);

            if (srcRes.rows.length === 0 || srcRes.rows[0].quantity < 0) throw new Error('Insufficient source stock');

            // 2. Deposit to Destination
            const destRes = await client.query(`
                INSERT INTO product_stock_locations (business_id, warehouse_id, product_id, quantity, state)
                VALUES ($1, $2, $3, $4, 'sellable')
                ON CONFLICT (business_id, warehouse_id, product_id, state) DO UPDATE SET quantity = product_stock_locations.quantity + EXCLUDED.quantity, updated_at = NOW()
                RETURNING quantity
            `, [businessId, toWarehouseId, productId, quantity]);

            // 3. Record Transfer
            const transferNumber = `TRF-${Date.now()}`;
            const trfRes = await client.query(`
                INSERT INTO stock_transfers (business_id, transfer_number, product_id, batch_id, from_warehouse_id, to_warehouse_id, quantity, status, transfer_date)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', NOW()) RETURNING *
            `, [businessId, transferNumber, productId, batchId, fromWarehouseId, toWarehouseId, quantity]);

            // Serials movement
            if (serialNumbers?.length > 0) {
                await client.query(`UPDATE product_serials SET warehouse_id = $1 WHERE business_id = $2 AND serial_number = ANY($3::text[])`, [toWarehouseId, businessId, serialNumbers]);
            }

            // Batch warehouse update (BUG-005 fix)
            // When transferring a batch to a new warehouse, update the batch's warehouse_id
            // so warehouse-filtered batch queries return accurate results.
            if (batchId) {
                await client.query(
                    `UPDATE product_batches SET warehouse_id = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3`,
                    [toWarehouseId, batchId, businessId]
                );
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return { success: true, transfer: trfRes.rows[0] };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Adjust Stock (Manual Reconciliation)
     */
    async adjustStock(params, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const { businessId, productId, warehouseId, adjustmentType, quantity, reason, notes } = params;
            const res = adjustmentType === 'add' 
                ? await this.addStock({ business_id: businessId, product_id: productId, warehouse_id: warehouseId, quantity, reference_type: 'adjustment', notes: reason || notes }, userId, client)
                : await this.removeStock({ business_id: businessId, product_id: productId, warehouse_id: warehouseId, quantity, reference_type: 'adjustment', notes: reason || notes }, userId, client);

            if (shouldManageTransaction) await client.query('COMMIT');
            return res;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Stock Valuation (High Performance)
     */
    async getStockValuation(businessId, warehouseId = null, method = 'standard') {
        const client = await this.getClient();
        try {
            const valuationMethod = String(method || 'standard').toLowerCase();

            if (!['standard', 'fifo', 'lifo', 'weighted-average', 'weighted_average'].includes(valuationMethod)) {
                throw new Error(`Unsupported valuation method: ${method}`);
            }

            if (valuationMethod === 'standard') {
                const query = warehouseId
                    ? [`SELECT SUM(quantity * unit_cost) as total_value FROM stock_movements WHERE business_id = $1 AND warehouse_id = $2`, [businessId, warehouseId]]
                    : [`SELECT SUM(stock * cost_price) as total_value FROM products WHERE business_id = $1`, [businessId]];

                const res = await client.query(query[0], query[1]);
                return { success: true, method: 'standard', totalValue: Number(res.rows[0]?.total_value || 0) };
            }

            const productsRes = await client.query(
                `SELECT id, stock, cost_price
                 FROM products
                 WHERE business_id = $1
                   AND is_deleted = false
                   AND COALESCE(stock, 0) > 0`,
                [businessId]
            );

            let totalValue = 0;

            for (const product of productsRes.rows) {
                const currentStock = Number(product.stock || 0);
                if (currentStock <= 0) continue;

                const purchasesRes = await client.query(
                    `SELECT quantity_change, unit_cost
                     FROM stock_movements
                     WHERE business_id = $1
                       AND product_id = $2
                       AND transaction_type = 'purchase'
                       AND quantity_change > 0
                     ORDER BY created_at ${valuationMethod === 'lifo' ? 'DESC' : 'ASC'}`,
                    [businessId, product.id]
                );

                const purchases = purchasesRes.rows;

                if (valuationMethod === 'weighted-average' || valuationMethod === 'weighted_average') {
                    let totalQty = 0;
                    let totalPurchaseValue = 0;

                    for (const purchase of purchases) {
                        const q = Number(purchase.quantity_change || 0);
                        const c = Number(purchase.unit_cost || 0);
                        totalQty += q;
                        totalPurchaseValue += (q * c);
                    }

                    const avgCost = totalQty > 0 ? (totalPurchaseValue / totalQty) : Number(product.cost_price || 0);
                    totalValue += (currentStock * avgCost);
                    continue;
                }

                let remaining = currentStock;
                let productValue = 0;
                for (const purchase of purchases) {
                    if (remaining <= 0) break;
                    const q = Number(purchase.quantity_change || 0);
                    const c = Number(purchase.unit_cost || 0);
                    const used = Math.min(q, remaining);
                    productValue += (used * c);
                    remaining -= used;
                }

                if (remaining > 0) {
                    productValue += (remaining * Number(product.cost_price || 0));
                }

                totalValue += productValue;
            }

            return {
                success: true,
                method: valuationMethod,
                totalValue: Number(totalValue.toFixed(2))
            };
        } finally {
            client.release();
        }
    },

    async getLowStockAlerts(businessId) {
        const client = await this.getClient();
        try {
            const res = await client.query(`
                SELECT id, name, sku, stock, min_stock
                FROM products 
                WHERE business_id = $1 
                AND is_active = true 
                AND stock <= COALESCE(min_stock, 5)
                ORDER BY stock ASC
            `, [businessId]);
            return res.rows;
        } finally {
            client.release();
        }
    },

    async getStockMovements(businessId, productId, limit = 50) {
        const client = await this.getClient();
        try {
            const res = await client.query(`
                SELECT m.*, w.name as warehouse_name, pb.batch_number
                FROM stock_movements m
                LEFT JOIN warehouse_locations w ON m.warehouse_id = w.id
                LEFT JOIN product_batches pb ON m.batch_id = pb.id
                WHERE m.product_id = $1 AND m.business_id = $2
                ORDER BY m.created_at DESC
                LIMIT $3
            `, [productId, businessId, limit]);
            
            return res.rows.map(row => ({
                ...row,
                warehouses: { name: row.warehouse_name },
                product_batches: { batch_number: row.batch_number }
            }));
        } finally {
            client.release();
        }
    },

    async getRecentStockAdjustments(businessId, limit = 100) {
        const client = await this.getClient();
        try {
            const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
            const res = await client.query(`
                SELECT
                    m.id, m.business_id, m.product_id, m.warehouse_id,
                    m.quantity_change, m.notes, m.created_at,
                    p.name as product_name, p.stock as current_stock,
                    w.name as warehouse_name
                FROM stock_movements m
                LEFT JOIN products p ON p.id = m.product_id
                LEFT JOIN warehouse_locations w ON w.id = m.warehouse_id
                WHERE m.business_id = $1
                  AND m.transaction_type = 'adjustment'
                ORDER BY m.created_at DESC
                LIMIT $2
            `, [businessId, safeLimit]);

            return res.rows.map((row) => ({
                id: row.id,
                productId: row.product_id,
                productName: row.product_name || 'Unknown',
                adjustmentType: Number(row.quantity_change) >= 0 ? 'increase' : 'decrease',
                quantity: Math.abs(Number(row.quantity_change) || 0),
                newStock: Number(row.current_stock || 0),
                warehouseName: row.warehouse_name || 'Primary',
                reason: String(row.notes || '').split(':')[0] || 'Stock Adjustment',
                notes: row.notes || '',
                createdAt: row.created_at,
                createdBy: 'System'
            }));
        } finally {
            client.release();
        }
    },

    async getInventoryReservations(businessId, options = {}) {
        const client = await this.getClient();
        try {
            const { status = 'all', limit = 200 } = options;
            const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 500));
            const statusFilter = String(status || 'all').toLowerCase();

            const params = [businessId];
            let whereClause = 'r.business_id = $1';

            if (statusFilter !== 'all') {
                params.push(statusFilter);
                whereClause += ` AND r.status = $${params.length}`;
            }

            params.push(safeLimit);

            const res = await client.query(`
                SELECT
                    r.id, r.business_id, r.product_id, r.batch_id,
                    r.quantity, r.expires_at, r.status, r.reference,
                    r.created_at, r.updated_at,
                    p.name AS product_name, pb.batch_number
                FROM inventory_reservations r
                LEFT JOIN products p ON p.id = r.product_id
                LEFT JOIN product_batches pb ON pb.id = r.batch_id
                WHERE ${whereClause}
                ORDER BY r.created_at DESC
                LIMIT $${params.length}
            `, params);

            return res.rows.map((row) => ({
                id: row.id,
                productId: row.product_id,
                batchId: row.batch_id,
                quantity: Number(row.quantity || 0),
                productName: row.product_name || 'Unknown Product',
                batchNumber: row.batch_number || null,
                reservedUntil: row.expires_at,
                status: row.status,
                reference: row.reference,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));
        } finally {
            client.release();
        }
    },

    async expireOverdueReservations(businessId, limit = 200) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 1000));

            const overdueRes = await client.query(`
                SELECT id, batch_id, quantity
                FROM inventory_reservations
                WHERE business_id = $1
                  AND status = 'active'
                  AND expires_at < NOW()
                ORDER BY expires_at ASC
                LIMIT $2
                FOR UPDATE
            `, [businessId, safeLimit]);

            const overdue = overdueRes.rows;
            if (overdue.length === 0) {
                await client.query('COMMIT');
                return { expiredCount: 0 };
            }

            for (const reservation of overdue) {
                if (reservation.batch_id) {
                    await client.query(`
                        UPDATE product_batches
                        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - $1)
                        WHERE id = $2 AND business_id = $3
                    `, [Number(reservation.quantity || 0), reservation.batch_id, businessId]);
                }
            }

            const ids = overdue.map(r => r.id);
            await client.query(`
                UPDATE inventory_reservations
                SET status = 'expired', updated_at = NOW()
                WHERE business_id = $1
                  AND id = ANY($2::uuid[])
            `, [businessId, ids]);

            await client.query('COMMIT');
            return { expiredCount: ids.length };
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    /**
     * Reserve Stock
     */
    async reserveStock(params, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');
            const {
                business_id: businessId, product_id: productId, quantity,
                batch_id: batchId, expires_at: expiresAtInput, reference,
                reference_type: referenceType = null, reference_id: referenceId = null,
                warehouse_id: warehouseId = null
            } = params;

            const requestedQty = Number(quantity || 0);
            if (requestedQty <= 0) throw new Error('Reservation quantity must be greater than zero');

            // Validate product-level availability to prevent overselling when reservation is not batch-specific.
            // available = products.stock - active reservations for this product.
            const pRes = await client.query(
                'SELECT stock FROM products WHERE id = $1 AND business_id = $2 FOR UPDATE',
                [productId, businessId]
            );
            if (pRes.rows.length === 0) throw new Error('Product not found');

            const activeReservationsRes = await client.query(
                `SELECT COALESCE(SUM(quantity), 0) AS reserved_qty
                 FROM inventory_reservations
                 WHERE business_id = $1
                   AND product_id = $2
                   AND status = 'active'
                   AND (expires_at IS NULL OR expires_at > NOW())`,
                [businessId, productId]
            );

            const totalStock = Number(pRes.rows[0].stock || 0);
            const reservedQty = Number(activeReservationsRes.rows[0]?.reserved_qty || 0);
            const availableQty = totalStock - reservedQty;

            // If product has no stock tracked (stock = 0) skip reservation, common for
            // restaurant menu items that are not warehouse-managed.
            if (totalStock === 0) {
                if (shouldManageTransaction) await client.query('COMMIT');
                return null;
            }

            if (availableQty < requestedQty) {
                throw new Error(`Insufficient available stock. Available: ${availableQty}, Requested: ${requestedQty}`);
            }

            if (batchId) {
                const bRes = await client.query('SELECT quantity, reserved_quantity FROM product_batches WHERE id = $1 AND business_id = $2 FOR UPDATE', [batchId, businessId]);
                if (bRes.rows.length === 0) throw new Error('Batch not found');
                const batch = bRes.rows[0];
                const available = Number(batch.quantity) - Number(batch.reserved_quantity || 0);
                if (available < requestedQty) throw new Error(`Insufficient batch stock. Available: ${available}`);

                await client.query('UPDATE product_batches SET reserved_quantity = COALESCE(reserved_quantity, 0) + $1 WHERE id = $2', [requestedQty, batchId]);
            }

            const expiresAt = expiresAtInput || new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
            const res = await client.query(`
                INSERT INTO inventory_reservations
                    (business_id, product_id, batch_id, warehouse_id, quantity, expires_at, status, reference, reference_type, reference_id)
                VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9)
                RETURNING *
            `, [businessId, productId, batchId || null, warehouseId || null, requestedQty, expiresAt, reference || null, referenceType, referenceId || null]);

            if (shouldManageTransaction) await client.query('COMMIT');
            return res.rows[0];
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Release Reserved Stock
     */
    async releaseStock(params, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');
            const { business_id: businessId, reservation_id: reservationId, batch_id: batchId, quantity } = params;

            let effectiveBatchId = batchId;
            let releaseQty = quantity;

            if (reservationId) {
                const rRes = await client.query('SELECT * FROM inventory_reservations WHERE id = $1 AND business_id = $2 FOR UPDATE', [reservationId, businessId]);
                if (rRes.rows.length === 0) throw new Error('Reservation not found');
                const r = rRes.rows[0];
                effectiveBatchId = r.batch_id;
                releaseQty = r.quantity;
                await client.query(`UPDATE inventory_reservations SET status = 'completed', updated_at = NOW() WHERE id = $1`, [reservationId]);
            }

            if (effectiveBatchId) {
                await client.query('UPDATE product_batches SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - $1) WHERE id = $2', [releaseQty, effectiveBatchId]);
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Fulfill Reservation
     * Converts an active reservation to a confirmed stock movement
     * Used when an invoice is fulfilled or a sales order is shipped
     * 
     * @param {string} reservationId - Reservation ID
     * @param {Object} context - { businessId, userId }
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Result with movement details
     */
    async fulfillReservation(reservationId, context, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        const { businessId, userId } = context;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // 1. Get reservation details
            const reservationRes = await client.query(`
                SELECT * FROM inventory_reservations
                WHERE id = $1 AND business_id = $2 FOR UPDATE
            `, [reservationId, businessId]);

            if (reservationRes.rows.length === 0) {
                throw new Error('Reservation not found');
            }

            const reservation = reservationRes.rows[0];

            if (reservation.status !== 'active') {
                throw new Error(`Cannot fulfill reservation with status: ${reservation.status}`);
            }

            // 2. Create confirmed stock movement (actual removal)
            await this.removeStock({
                business_id: businessId,
                product_id: reservation.product_id,
                warehouse_id: reservation.warehouse_id,
                quantity: reservation.quantity,
                batch_id: reservation.batch_id,
                reference_type: 'fulfillment',
                reference_id: reservation.reference_id,
                notes: `Fulfilled reservation ${reservationId}`
            }, userId, client);

            // 3. Mark reservation as fulfilled
            await client.query(`
                UPDATE inventory_reservations
                SET status = 'fulfilled', updated_at = NOW()
                WHERE id = $1
            `, [reservationId]);

            // 4. Release batch reservation
            if (reservation.batch_id) {
                await client.query(`
                    UPDATE product_batches
                    SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - $1)
                    WHERE id = $2
                `, [reservation.quantity, reservation.batch_id]);
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return { success: true, reservation };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Reconcile Stock
     * Performs physical inventory reconciliation
     * Calculates variance between system stock and physical count
     * Creates adjustment stock movement and updates all related tables
     * 
     * @param {string} productId - Product ID
     * @param {string} warehouseId - Warehouse ID
     * @param {number} physicalCount - Actual physical count
     * @param {Object} context - { businessId, userId, notes }
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Reconciliation result with variance details
     */
    async reconcileStock(productId, warehouseId, physicalCount, context, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        const { businessId, userId, notes } = context;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // 1. Get current system stock
            const locationRes = await client.query(`
                SELECT quantity, state
                FROM product_stock_locations
                WHERE product_id = $1 AND warehouse_id = $2 AND business_id = $3
                FOR UPDATE
            `, [productId, warehouseId, businessId]);

            const systemStock = Number(locationRes.rows[0]?.quantity || 0);
            const state = locationRes.rows[0]?.state || 'sellable';

            // 2. Calculate variance
            const variance = physicalCount - systemStock;

            if (variance === 0) {
                if (shouldManageTransaction) await client.query('COMMIT');
                return {
                    success: true,
                    variance: 0,
                    systemStock,
                    physicalCount,
                    message: 'No variance detected - stock is accurate'
                };
            }

            // 3. Get product details
            const productRes = await client.query(`
                SELECT name, cost_price, stock
                FROM products
                WHERE id = $1 AND business_id = $2
                FOR UPDATE
            `, [productId, businessId]);

            if (productRes.rows.length === 0) {
                throw new Error('Product not found');
            }

            const product = productRes.rows[0];
            const costPrice = Number(product.cost_price || 0);

            // 4. Create adjustment based on variance direction
            const adjustmentType = variance > 0 ? 'add' : 'remove';
            const adjustmentQuantity = Math.abs(variance);
            const adjustmentNotes = notes || `Stock reconciliation: ${variance > 0 ? 'surplus' : 'shortage'} of ${adjustmentQuantity} units`;

            if (variance > 0) {
                // Surplus - add stock
                await this.addStock({
                    business_id: businessId,
                    product_id: productId,
                    warehouse_id: warehouseId,
                    quantity: adjustmentQuantity,
                    cost_price: costPrice,
                    reference_type: 'reconciliation',
                    reference_id: null,
                    notes: adjustmentNotes,
                    state
                }, userId, client);
            } else {
                // Shortage - remove stock
                await this.removeStock({
                    business_id: businessId,
                    product_id: productId,
                    warehouse_id: warehouseId,
                    quantity: adjustmentQuantity,
                    reference_type: 'reconciliation',
                    reference_id: null,
                    notes: adjustmentNotes,
                    state
                }, userId, client);
            }

            // 5. Record reconciliation in inventory ledger
            const newStock = systemStock + variance;
            await client.query(`
                INSERT INTO inventory_ledger (
                    business_id, warehouse_id, product_id,
                    transaction_type, reference_type,
                    quantity_change, running_balance,
                    unit_cost, total_value, notes
                )
                VALUES ($1, $2, $3, 'reconciliation', 'reconciliation', $4, $5, $6, $7, $8)
            `, [
                businessId, warehouseId, productId,
                variance, newStock,
                costPrice, variance * costPrice,
                adjustmentNotes
            ]);

            if (shouldManageTransaction) await client.query('COMMIT');

            return {
                success: true,
                variance,
                systemStock,
                physicalCount,
                newStock,
                adjustmentType,
                adjustmentQuantity,
                valueImpact: variance * costPrice,
                message: `Reconciliation complete: ${variance > 0 ? 'Added' : 'Removed'} ${adjustmentQuantity} units`
            };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Get Available Stock
     * Returns true available stock (stock - active reservations)
     * 
     * @param {string} productId - Product ID
     * @param {string} businessId - Business ID
     * @param {string} warehouseId - Optional warehouse ID for location-specific availability
     * @returns {Promise<Object>} Available stock details
     */
    async getAvailableStock(productId, businessId, warehouseId = null) {
        const client = await this.getClient();
        try {
            // 1. Get total stock
            let totalStock = 0;
            if (warehouseId) {
                const locationRes = await client.query(`
                    SELECT COALESCE(SUM(quantity), 0) as total
                    FROM product_stock_locations
                    WHERE product_id = $1 AND warehouse_id = $2 AND business_id = $3
                `, [productId, warehouseId, businessId]);
                totalStock = Number(locationRes.rows[0]?.total || 0);
            } else {
                const productRes = await client.query(`
                    SELECT stock FROM products
                    WHERE id = $1 AND business_id = $2
                `, [productId, businessId]);
                totalStock = Number(productRes.rows[0]?.stock || 0);
            }

            // 2. Get active reservations
            const reservationQuery = warehouseId
                ? [`SELECT COALESCE(SUM(quantity), 0) as reserved FROM inventory_reservations WHERE product_id = $1 AND warehouse_id = $2 AND business_id = $3 AND status = 'active'`, [productId, warehouseId, businessId]]
                : [`SELECT COALESCE(SUM(quantity), 0) as reserved FROM inventory_reservations WHERE product_id = $1 AND business_id = $2 AND status = 'active'`, [productId, businessId]];

            const reservationRes = await client.query(reservationQuery[0], reservationQuery[1]);
            const reservedStock = Number(reservationRes.rows[0]?.reserved || 0);

            // 3. Calculate available
            const availableStock = totalStock - reservedStock;

            return {
                success: true,
                productId,
                warehouseId,
                totalStock,
                reservedStock,
                availableStock,
                isAvailable: availableStock > 0
            };
        } finally {
            client.release();
        }
    },

    /**
     * Expire Reservations
     * Marks expired inventory reservations as 'expired' and releases batch reserved_quantity
     * Designed to be called by a scheduled job (cron/background worker)
     * 
     * @param {string} businessId - Business ID
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Result with count of expired reservations
     */
    async expireReservations(businessId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // 1. Find all expired active reservations
            const expiredRes = await client.query(`
                SELECT id, batch_id, quantity
                FROM inventory_reservations
                WHERE business_id = $1
                  AND status = 'active'
                  AND expires_at < NOW()
                FOR UPDATE
            `, [businessId]);

            const expiredReservations = expiredRes.rows;

            if (expiredReservations.length === 0) {
                if (shouldManageTransaction) await client.query('COMMIT');
                return {
                    success: true,
                    expiredCount: 0,
                    message: 'No expired reservations found'
                };
            }

            // 2. Mark reservations as expired
            const reservationIds = expiredReservations.map(r => r.id);
            await client.query(`
                UPDATE inventory_reservations
                SET status = 'expired', updated_at = NOW()
                WHERE id = ANY($1::uuid[])
            `, [reservationIds]);

            // 3. Release batch reserved quantities
            const batchUpdates = {};
            for (const reservation of expiredReservations) {
                if (reservation.batch_id) {
                    batchUpdates[reservation.batch_id] = (batchUpdates[reservation.batch_id] || 0) + Number(reservation.quantity);
                }
            }

            for (const [batchId, quantity] of Object.entries(batchUpdates)) {
                await client.query(`
                    UPDATE product_batches
                    SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - $1)
                    WHERE id = $2
                `, [quantity, batchId]);
            }

            if (shouldManageTransaction) await client.query('COMMIT');

            return {
                success: true,
                expiredCount: expiredReservations.length,
                batchesUpdated: Object.keys(batchUpdates).length,
                message: `Expired ${expiredReservations.length} reservations and released ${Object.keys(batchUpdates).length} batch reservations`
            };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Get Products with filtering and pagination
     */
    async getProducts(businessId, options = {}) {
        const client = await this.getClient();
        try {
            const { 
                query = '', 
                category = 'all', 
                status = 'all', 
                stockStatus = 'all',
                limit = 50, 
                offset = 0 
            } = options;

            const params = [businessId];
            let whereClause = 'business_id = $1 AND is_deleted = false';

            if (query) {
                params.push(`%${query}%`);
                whereClause += ` AND (name ILIKE $${params.length} OR sku ILIKE $${params.length} OR barcode ILIKE $${params.length})`;
            }

            if (category !== 'all') {
                params.push(category);
                whereClause += ` AND category = $${params.length}`;
            }

            if (status === 'active') whereClause += ' AND is_active = true';
            if (status === 'inactive') whereClause += ' AND is_active = false';

            if (stockStatus === 'low') {
                whereClause += ' AND stock <= COALESCE(min_stock, 5)';
            } else if (stockStatus === 'out') {
                whereClause += ' AND stock <= 0';
            }

            const countRes = await client.query(`SELECT COUNT(*) FROM products WHERE ${whereClause}`, params);
            const totalCount = parseInt(countRes.rows[0].count);

            params.push(limit, offset);
            const productsRes = await client.query(`
                SELECT * FROM products 
                WHERE ${whereClause} 
                ORDER BY name ASC 
                LIMIT $${params.length - 1} OFFSET $${params.length}
            `, params);

            return {
                products: productsRes.rows,
                totalCount,
                limit,
                offset
            };
        } finally {
            client.release();
        }
    },

    /**
     * Get single product with full context
     */
    async getProductById(businessId, productId) {
        const client = await this.getClient();
        try {
            const pRes = await client.query(
                'SELECT * FROM products WHERE id = $1 AND business_id = $2 AND is_deleted = false',
                [productId, businessId]
            );
            if (pRes.rows.length === 0) return null;
            const product = pRes.rows[0];

            // Fetch related data
            const [locations, batches, serials] = await Promise.all([
                client.query('SELECT sl.*, w.name as warehouse_name FROM product_stock_locations sl JOIN warehouse_locations w ON sl.warehouse_id = w.id WHERE sl.product_id = $1 AND sl.business_id = $2', [productId, businessId]),
                client.query('SELECT * FROM product_batches WHERE product_id = $1 AND business_id = $2 AND quantity > 0 ORDER BY expiry_date ASC', [productId, businessId]),
                client.query('SELECT * FROM product_serials WHERE product_id = $1 AND business_id = $2 AND status = \'available\' LIMIT 100', [productId, businessId])
            ]);

            return {
                ...product,
                locations: locations.rows,
                batches: batches.rows,
                available_serials: serials.rows
            };
        } finally {
            client.release();
        }
    },

    /**
     * Create Product
     */
    async createProduct(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const {
                business_id, name, sku, barcode, description, category,
                unit, sale_price, cost_price, min_stock, reorder_point,
                is_active = true, is_service = false, track_inventory = true,
                tax_rate = 0, domain_data = {}
            } = data;

            // Check SKU uniqueness
            if (sku) {
                const skuCheck = await client.query('SELECT id FROM products WHERE business_id = $1 AND sku = $2 AND is_deleted = false', [business_id, sku]);
                if (skuCheck.rows.length > 0) throw new Error(`SKU ${sku} already exists`);
            }

            const res = await client.query(`
                INSERT INTO products (
                    business_id, name, sku, barcode, description, category,
                    unit, sale_price, cost_price, min_stock, reorder_point,
                    is_active, is_service, track_inventory, tax_rate, domain_data,
                    created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                RETURNING *
            `, [
                business_id, name, sku, barcode, description, category,
                unit, sale_price || 0, cost_price || 0, min_stock || 0, reorder_point || 0,
                is_active, is_service, track_inventory, tax_rate || 0, domain_data,
                userId
            ]);

            if (shouldManageTransaction) await client.query('COMMIT');
            return res.rows[0];
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Update Product
     */
    async updateProduct(productId, businessId, data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // Prevent changing business_id or critical metadata if needed
            const fields = [];
            const values = [productId, businessId];
            let i = 3;

            const allowedFields = [
                'name', 'sku', 'barcode', 'description', 'category',
                'unit', 'sale_price', 'cost_price', 'min_stock', 'reorder_point',
                'is_active', 'is_service', 'track_inventory', 'tax_rate', 'domain_data'
            ];

            for (const key of allowedFields) {
                if (data[key] !== undefined) {
                    fields.push(`${key} = $${i++}`);
                    values.push(data[key]);
                }
            }

            if (fields.length === 0) return { id: productId };

            const res = await client.query(`
                UPDATE products 
                SET ${fields.join(', ')}, updated_at = NOW() 
                WHERE id = $1 AND business_id = $2 AND is_deleted = false
                RETURNING *
            `, values);

            if (res.rows.length === 0) throw new Error('Product not found or access denied');

            if (shouldManageTransaction) await client.query('COMMIT');
            return res.rows[0];
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Delete Product (Soft)
     */
    async deleteProduct(productId, businessId, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const res = await client.query(
                'UPDATE products SET is_deleted = true, sku = sku || \'-deleted-\' || id, updated_at = NOW() WHERE id = $1 AND business_id = $2 AND is_deleted = false RETURNING id',
                [productId, businessId]
            );
            return res.rows.length > 0;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Get Inventory Summary for Dashboard
     */
    async getInventorySummary(businessId) {
        const client = await this.getClient();
        try {
            const [stockVal, alerts, stats] = await Promise.all([
                this.getStockValuation(businessId),
                this.getLowStockAlerts(businessId),
                client.query(`
                    SELECT 
                        COUNT(*) as total_items,
                        SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) as out_of_stock,
                        SUM(CASE WHEN stock <= min_stock AND stock > 0 THEN 1 ELSE 0 END) as low_stock,
                        COALESCE(SUM(stock), 0) as total_units
                    FROM products 
                    WHERE business_id = $1 AND is_deleted = false AND is_active = true
                `, [businessId])
            ]);

            return {
                totalValue: stockVal.totalValue,
                totalItems: parseInt(stats.rows[0].total_items),
                outOfStock: parseInt(stats.rows[0].out_of_stock),
                lowStock: parseInt(stats.rows[0].low_stock),
                totalUnits: parseFloat(stats.rows[0].total_units),
                lowStockItems: alerts
            };
        } finally {
            client.release();
        }
    }
};
