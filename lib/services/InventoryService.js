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

/**
 * Inventory Service
 * Central Orchestration Layer for Stock and Intelligence
 * 2026 Enterprise Standards: Service-First Logic
 */
export const InventoryService = {

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

            // 2. Product Update
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

            const newStock = Math.round(((product.stock || 0) + finalQuantity) * 100) / 100;
            const totalValue = ((product.stock || 0) * (product.cost_price || 0)) + (finalQuantity * finalCostPrice);
            const newCostPrice = newStock > 0 ? Math.round((totalValue / newStock) * 100) / 100 : finalCostPrice;

            await client.query('UPDATE products SET stock = $1, cost_price = $2 WHERE id = $3 AND business_id = $4', [newStock, newCostPrice, productId, businessId]);

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
                ON CONFLICT (warehouse_id, product_id, state) DO UPDATE SET quantity = product_stock_locations.quantity + EXCLUDED.quantity, updated_at = NOW()
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
            const batches = await client.query(`SELECT id, quantity, cost_price FROM product_batches WHERE product_id = $1 AND business_id = $2 AND quantity > 0 ORDER BY expiry_date ASC NULLS LAST, created_at ASC`, [productId, businessId]);

            for (const batch of batches.rows) {
                if (allocated >= finalQuantity) break;
                const take = Math.min(batch.quantity, finalQuantity - allocated);
                await client.query('UPDATE product_batches SET quantity = quantity - $1 WHERE id = $2 AND business_id = $3', [take, batch.id, businessId]);
                allocated += take;
                costOfGoodsSold += (take * batch.cost_price);
            }

            const newStock = (product.stock || 0) - finalQuantity;
            await client.query('UPDATE products SET stock = $1 WHERE id = $2 AND business_id = $3', [newStock, productId, businessId]);

            if (warehouseId) {
                await client.query('UPDATE product_stock_locations SET quantity = quantity - $1 WHERE warehouse_id = $2 AND product_id = $3 AND state = $4 AND business_id = $5', [finalQuantity, warehouseId, productId, state, businessId]);
            }

            const moveRes = await client.query(`
                INSERT INTO stock_movements (business_id, product_id, warehouse_id, movement_type, transaction_type, quantity_change, unit_cost, reference_type, reference_id, notes)
                VALUES ($1, $2, $3, 'out', $4, $5, $6, $7, $8, $9) RETURNING id
            `, [businessId, productId, warehouseId, referenceType, -finalQuantity, costOfGoodsSold / finalQuantity, referenceType, referenceId, notes]);

            // Accounting (COGS)
            if (costOfGoodsSold > 0) {
                await AccountingService.recordBusinessTransaction('sale_cogs', {
                    businessId, referenceId: referenceId || moveRes.rows[0].id,
                    costAmount: costOfGoodsSold, description: notes, userId
                }, client);
            }

            if (shouldManageTransaction) await client.query('COMMIT');

            this.triggerOrchestration(businessId, productId, product.name, newStock, 'stock_out', -finalQuantity);

            return { success: true, newStock, movementId: moveRes.rows[0].id, costOfGoodsSold };
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
                INSERT INTO product_stock_locations (business_id, warehouse_id, product_id, quantity)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (warehouse_id, product_id, state) DO UPDATE SET quantity = product_stock_locations.quantity + EXCLUDED.quantity, updated_at = NOW()
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
    async getStockValuation(businessId, warehouseId = null) {
        const client = await this.getClient();
        try {
            const query = warehouseId 
                ? [`SELECT SUM(quantity * unit_cost) as total_value FROM stock_movements WHERE business_id = $1 AND warehouse_id = $2`, [businessId, warehouseId]]
                : [`SELECT SUM(stock * cost_price) as total_value FROM products WHERE business_id = $1`, [businessId]];
            
            const res = await client.query(query[0], query[1]);
            return { success: true, totalValue: Number(res.rows[0]?.total_value || 0) };
        } finally {
            client.release();
        }
    },

    async getLowStockAlerts(businessId) {
        const client = await this.getClient();
        try {
            const res = await client.query(`SELECT id, name, sku, stock, reorder_point FROM products WHERE business_id = $1 AND stock <= reorder_point`, [businessId]);
            return res.rows;
        } finally {
            client.release();
        }
    },

    async getStockMovements(businessId, productId, limit = 50) {
        const client = await this.getClient();
        try {
            const res = await client.query(`SELECT * FROM stock_movements WHERE business_id = $1 AND product_id = $2 ORDER BY created_at DESC LIMIT $3`, [businessId, productId, limit]);
            return res.rows;
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
            const { business_id: businessId, product_id: productId, quantity, batch_id: batchId, expires_at: expiresAtInput, reference } = params;

            if (batchId) {
                const bRes = await client.query('SELECT quantity, reserved_quantity FROM product_batches WHERE id = $1 AND business_id = $2 FOR UPDATE', [batchId, businessId]);
                if (bRes.rows.length === 0) throw new Error('Batch not found');
                const batch = bRes.rows[0];
                const available = Number(batch.quantity) - Number(batch.reserved_quantity || 0);
                if (available < quantity) throw new Error(`Insufficient batch stock. Available: ${available}`);

                await client.query('UPDATE product_batches SET reserved_quantity = COALESCE(reserved_quantity, 0) + $1 WHERE id = $2', [quantity, batchId]);
            }

            const expiresAt = expiresAtInput || new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
            const res = await client.query(`
                INSERT INTO inventory_reservations (business_id, product_id, batch_id, quantity, expires_at, status, reference)
                VALUES ($1, $2, $3, $4, $5, 'active', $6) RETURNING *
            `, [businessId, productId, batchId || null, quantity, expiresAt, reference || null]);

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
    }
};
