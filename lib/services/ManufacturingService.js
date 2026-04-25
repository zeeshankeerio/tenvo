import {
    getBOMsAction,
    createBOMAction,
    getProductionOrdersAction,
    createProductionOrderAction,
    updateProductionOrderStatusAction
} from '../actions/premium/manufacturing';
import pool from '@/lib/db';
import { InventoryService } from './InventoryService';
import { AccountingService } from './AccountingService';
import { auditWrite } from '@/lib/actions/_shared/audit';

/**
 * Manufacturing Management Service
 * 2026 Enterprise Standards: Service-First Logic with Transaction Safety
 */
export const ManufacturingService = {

    /**
     * Internal helper for database connection
     */
    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Get all BOMs for a business
     */
    async getBOMs(businessId) {
        const result = await getBOMsAction(businessId);
        if (!result.success) throw new Error(result.error);
        return result.boms;
    },

    /**
     * Create a Bill of Materials
     */
    async createBOM(bomData) {
        const result = await createBOMAction(bomData);
        if (!result.success) throw new Error(result.error);
        return result.bom;
    },

    /**
     * Get all production orders
     */
    async getProductionOrders(businessId) {
        const result = await getProductionOrdersAction(businessId);
        if (!result.success) throw new Error(result.error);
        return result.productionOrders;
    },

    /**
     * Create a production order
     */
    async createProductionOrder(orderData) {
        const result = await createProductionOrderAction(orderData);
        if (!result.success) throw new Error(result.error);
        return result.productionOrder;
    },

    /**
     * Update production order status
     */
    async updateProductionOrderStatus(businessId, orderId, status) {
        const result = await updateProductionOrderStatusAction(businessId, orderId, status);
        if (!result.success) throw new Error(result.error);
        return result.productionOrder;
    },

    /**
     * Start Production
     * Validates status is 'planned', checks raw material availability in warehouse_id,
     * reserves materials via InventoryService.reserveStock, updates status to 'in_progress'
     * 
     * @param {string} orderId - Production order ID
     * @param {Object} context - { businessId, userId }
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Updated production order with reservation details
     */
    async startProduction(orderId, context, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        const { businessId, userId } = context;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // 1. Get production order and validate status
            const orderRes = await client.query(`
                SELECT po.*, p.name as product_name
                FROM production_orders po
                LEFT JOIN products p ON po.product_id = p.id
                WHERE po.id = $1 AND po.business_id = $2
                FOR UPDATE
            `, [orderId, businessId]);

            if (orderRes.rows.length === 0) {
                throw new Error('Production order not found');
            }

            const order = orderRes.rows[0];

            // Validate status is 'planned'
            if (order.status !== 'planned') {
                throw new Error(`Cannot start production: order status is '${order.status}', expected 'planned'`);
            }

            // Validate warehouse exists
            if (!order.warehouse_id) {
                throw new Error('Production order missing warehouse_id for raw material sourcing');
            }

            // Validate BOM exists
            if (!order.bom_id) {
                throw new Error('Production order missing bom_id');
            }

            // 2. Get BOM materials
            const materialsRes = await client.query(`
                SELECT 
                    bm.material_id,
                    bm.quantity as unit_quantity,
                    bm.unit,
                    p.name as material_name,
                    p.cost_price
                FROM bom_materials bm
                LEFT JOIN products p ON bm.material_id = p.id
                WHERE bm.bom_id = $1 AND bm.business_id = $2
            `, [order.bom_id, businessId]);

            const materials = materialsRes.rows;

            if (materials.length === 0) {
                throw new Error('BOM has no materials defined');
            }

            // 3. Calculate required quantities based on production quantity
            const quantityToProduce = Number(order.quantity_to_produce || order.quantity);
            const requiredMaterials = materials.map(mat => ({
                material_id: mat.material_id,
                material_name: mat.material_name,
                unit_quantity: Number(mat.unit_quantity),
                required_quantity: Number(mat.unit_quantity) * quantityToProduce,
                unit: mat.unit,
                cost_price: Number(mat.cost_price || 0)
            }));

            // 4. Check availability for all materials in the warehouse
            const availabilityChecks = [];
            for (const material of requiredMaterials) {
                const availability = await InventoryService.getAvailableStock(
                    material.material_id,
                    businessId,
                    order.warehouse_id
                );

                if (availability.availableStock < material.required_quantity) {
                    availabilityChecks.push({
                        material_id: material.material_id,
                        material_name: material.material_name,
                        required: material.required_quantity,
                        available: availability.availableStock,
                        shortage: material.required_quantity - availability.availableStock
                    });
                }
            }

            // If any material is insufficient, throw detailed error
            if (availabilityChecks.length > 0) {
                const shortageDetails = availabilityChecks.map(s => 
                    `${s.material_name}: need ${s.required}, have ${s.available} (short ${s.shortage})`
                ).join('; ');
                throw new Error(`Insufficient raw materials in warehouse: ${shortageDetails}`);
            }

            // 5. Reserve all materials
            const reservations = [];
            for (const material of requiredMaterials) {
                const reservation = await InventoryService.reserveStock({
                    business_id: businessId,
                    product_id: material.material_id,
                    quantity: material.required_quantity,
                    warehouse_id: order.warehouse_id,
                    reference: `production_order:${orderId}`,
                    expires_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days expiry
                }, client);

                reservations.push({
                    reservation_id: reservation.id,
                    material_id: material.material_id,
                    material_name: material.material_name,
                    quantity: material.required_quantity
                });
            }

            // 6. Update production order status to 'in_progress'
            const updateRes = await client.query(`
                UPDATE production_orders
                SET 
                    status = 'in_progress',
                    start_date = CURRENT_DATE,
                    updated_at = NOW(),
                    domain_data = COALESCE(domain_data, '{}'::jsonb) || $1::jsonb
                WHERE id = $2 AND business_id = $3
                RETURNING *
            `, [
                JSON.stringify({ 
                    material_reservations: reservations,
                    started_by: userId,
                    started_at: new Date().toISOString()
                }),
                orderId,
                businessId
            ]);

            const updatedOrder = updateRes.rows[0];

            if (shouldManageTransaction) await client.query('COMMIT');

            // 7. Audit trail (fire-and-forget)
            auditWrite({
                businessId,
                userId,
                action: 'update',
                entityType: 'production_order',
                entityId: orderId,
                description: `Started production order for ${order.product_name} (${quantityToProduce} units)`,
                metadata: {
                    status_change: 'planned → in_progress',
                    materials_reserved: reservations.length,
                    warehouse_id: order.warehouse_id,
                    quantity: quantityToProduce
                },
                changes: {
                    before: { status: 'planned' },
                    after: { status: 'in_progress', start_date: updatedOrder.start_date }
                }
            });

            return {
                success: true,
                productionOrder: updatedOrder,
                reservations,
                message: `Production started successfully. Reserved ${reservations.length} materials.`
            };

        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Complete Production
     * Validates status is 'in_progress', consumes raw materials (negative stock_movements),
     * produces finished goods in output_warehouse_id (positive stock_movements),
     * creates GL entries via AccountingService, updates status to 'completed'
     * 
     * @param {string} orderId - Production order ID
     * @param {number} actualQuantity - Actual quantity produced (may differ from planned)
     * @param {Object} context - { businessId, userId }
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Completed production order with cost details
     */
    async completeProduction(orderId, actualQuantity, context, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        const { businessId, userId } = context;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // 1. Get production order and validate status
            const orderRes = await client.query(`
                SELECT po.*, p.name as product_name, p.cost_price as product_cost_price
                FROM production_orders po
                LEFT JOIN products p ON po.product_id = p.id
                WHERE po.id = $1 AND po.business_id = $2
                FOR UPDATE
            `, [orderId, businessId]);

            if (orderRes.rows.length === 0) {
                throw new Error('Production order not found');
            }

            const order = orderRes.rows[0];

            // Validate status is 'in_progress'
            if (order.status !== 'in_progress') {
                throw new Error(`Cannot complete production: order status is '${order.status}', expected 'in_progress'`);
            }

            // Validate warehouses exist
            if (!order.warehouse_id) {
                throw new Error('Production order missing warehouse_id for raw material consumption');
            }

            if (!order.output_warehouse_id) {
                throw new Error('Production order missing output_warehouse_id for finished goods');
            }

            // Validate BOM exists
            if (!order.bom_id) {
                throw new Error('Production order missing bom_id');
            }

            // Validate product exists
            if (!order.product_id) {
                throw new Error('Production order missing product_id');
            }

            // 2. Get BOM materials
            const materialsRes = await client.query(`
                SELECT 
                    bm.material_id,
                    bm.quantity as unit_quantity,
                    bm.unit,
                    p.name as material_name,
                    p.cost_price
                FROM bom_materials bm
                LEFT JOIN products p ON bm.material_id = p.id
                WHERE bm.bom_id = $1 AND bm.business_id = $2
            `, [order.bom_id, businessId]);

            const materials = materialsRes.rows;

            if (materials.length === 0) {
                throw new Error('BOM has no materials defined');
            }

            // 3. Calculate quantities and costs
            const quantityProduced = Number(actualQuantity);
            const plannedQuantity = Number(order.quantity_to_produce || order.quantity);

            // Calculate material consumption based on actual quantity produced
            const materialConsumption = materials.map(mat => ({
                material_id: mat.material_id,
                material_name: mat.material_name,
                unit_quantity: Number(mat.unit_quantity),
                consumed_quantity: Number(mat.unit_quantity) * quantityProduced,
                unit: mat.unit,
                cost_price: Number(mat.cost_price || 0),
                total_cost: Number(mat.unit_quantity) * quantityProduced * Number(mat.cost_price || 0)
            }));

            // Calculate total production cost (sum of all material costs)
            const totalProductionCost = materialConsumption.reduce((sum, mat) => sum + mat.total_cost, 0);
            const unitProductionCost = quantityProduced > 0 ? totalProductionCost / quantityProduced : 0;

            // 4. Consume raw materials (create negative stock movements)
            const consumedMaterials = [];
            for (const material of materialConsumption) {
                const removeResult = await InventoryService.removeStock({
                    business_id: businessId,
                    product_id: material.material_id,
                    warehouse_id: order.warehouse_id,
                    quantity: material.consumed_quantity,
                    reference_type: 'production',
                    reference_id: orderId,
                    notes: `Consumed for production order ${order.batch_number || orderId}: ${order.product_name}`
                }, userId, client);

                consumedMaterials.push({
                    material_id: material.material_id,
                    material_name: material.material_name,
                    quantity: material.consumed_quantity,
                    cost: material.total_cost,
                    movement_id: removeResult.movementId
                });
            }

            // 5. Produce finished goods (create positive stock movements in output warehouse)
            const addResult = await InventoryService.addStock({
                business_id: businessId,
                product_id: order.product_id,
                warehouse_id: order.output_warehouse_id,
                quantity: quantityProduced,
                cost_price: unitProductionCost,
                batch_number: order.batch_number,
                reference_type: 'production',
                reference_id: orderId,
                notes: `Produced from production order ${order.batch_number || orderId}`
            }, userId, client);

            // 6. Release any unused reservations from domain_data
            const domainData = order.domain_data || {};
            const reservations = domainData.material_reservations || [];

            for (const reservation of reservations) {
                try {
                    await InventoryService.releaseStock({
                        business_id: businessId,
                        reservation_id: reservation.reservation_id
                    }, client);
                } catch (releaseError) {
                    // Log but don't fail - reservation might already be released or expired
                    console.warn(`Failed to release reservation ${reservation.reservation_id}:`, releaseError.message);
                }
            }

            // 7. Create GL entries for manufacturing costs
            // Debit: Inventory (finished goods) - Credit: Production Cost / Raw Materials
            await AccountingService.recordBusinessTransaction('production', {
                businessId,
                referenceId: orderId,
                totalAmount: totalProductionCost,
                netAmount: totalProductionCost,
                description: `Production completed: ${order.product_name} (${quantityProduced} units)`,
                date: new Date(),
                userId
            }, client);

            // 8. Update production order status to 'completed'
            const completionData = {
                completed_by: userId,
                completed_at: new Date().toISOString(),
                actual_quantity: quantityProduced,
                planned_quantity: plannedQuantity,
                variance: quantityProduced - plannedQuantity,
                total_cost: totalProductionCost,
                unit_cost: unitProductionCost,
                materials_consumed: consumedMaterials,
                finished_goods_movement_id: addResult.movementId
            };

            const updateRes = await client.query(`
                UPDATE production_orders
                SET 
                    status = 'completed',
                    updated_at = NOW(),
                    domain_data = COALESCE(domain_data, '{}'::jsonb) || $1::jsonb
                WHERE id = $2 AND business_id = $3
                RETURNING *
            `, [
                JSON.stringify(completionData),
                orderId,
                businessId
            ]);

            const completedOrder = updateRes.rows[0];

            if (shouldManageTransaction) await client.query('COMMIT');

            // 9. Audit trail (fire-and-forget)
            auditWrite({
                businessId,
                userId,
                action: 'update',
                entityType: 'production_order',
                entityId: orderId,
                description: `Completed production order for ${order.product_name} (${quantityProduced} units, cost: ${totalProductionCost.toFixed(2)})`,
                metadata: {
                    status_change: 'in_progress → completed',
                    actual_quantity: quantityProduced,
                    planned_quantity: plannedQuantity,
                    variance: quantityProduced - plannedQuantity,
                    total_cost: totalProductionCost,
                    unit_cost: unitProductionCost,
                    materials_consumed: consumedMaterials.length,
                    input_warehouse_id: order.warehouse_id,
                    output_warehouse_id: order.output_warehouse_id
                },
                changes: {
                    before: { status: 'in_progress' },
                    after: { status: 'completed', actual_quantity: quantityProduced }
                }
            });

            return {
                success: true,
                productionOrder: completedOrder,
                production: {
                    quantityProduced,
                    plannedQuantity,
                    variance: quantityProduced - plannedQuantity,
                    totalCost: Math.round(totalProductionCost * 100) / 100,
                    unitCost: Math.round(unitProductionCost * 100) / 100
                },
                materialsConsumed: consumedMaterials,
                finishedGoods: {
                    product_id: order.product_id,
                    product_name: order.product_name,
                    quantity: quantityProduced,
                    warehouse_id: order.output_warehouse_id,
                    movement_id: addResult.movementId
                },
                message: `Production completed successfully. Produced ${quantityProduced} units at ${unitProductionCost.toFixed(2)} per unit.`
            };

        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Explode BOM (Bill of Materials)
     * Returns flat list of required materials with quantities scaled to production quantity.
     * This is a read-only utility method for material requirement calculation.
     * 
     * @param {string} bomId - BOM ID
     * @param {number} quantity - Production quantity to scale materials by
     * @param {string} businessId - Business ID for tenant isolation
     * @returns {Promise<Array>} Flat list of materials with scaled quantities and details
     */
    async explodeBOM(bomId, quantity, businessId) {
        const client = await pool.connect();

        try {
            // Validate inputs
            if (!bomId) {
                throw new Error('BOM ID is required');
            }

            if (!businessId) {
                throw new Error('Business ID is required');
            }

            const productionQuantity = Number(quantity);

            if (isNaN(productionQuantity) || productionQuantity <= 0) {
                throw new Error('Production quantity must be a positive number');
            }

            // 1. Verify BOM exists and belongs to business
            const bomRes = await client.query(`
                SELECT b.id, b.product_id, p.name as product_name
                FROM boms b
                LEFT JOIN products p ON b.product_id = p.id
                WHERE b.id = $1 AND b.business_id = $2
            `, [bomId, businessId]);

            if (bomRes.rows.length === 0) {
                throw new Error('BOM not found');
            }

            const bom = bomRes.rows[0];

            // 2. Get all BOM materials with product details
            const materialsRes = await client.query(`
                SELECT 
                    bm.id as bom_material_id,
                    bm.material_id,
                    bm.quantity as unit_quantity,
                    bm.unit,
                    p.name as material_name,
                    p.sku,
                    p.cost_price,
                    p.stock as available_stock,
                    p.unit as product_unit
                FROM bom_materials bm
                LEFT JOIN products p ON bm.material_id = p.id
                WHERE bm.bom_id = $1 AND bm.business_id = $2
                ORDER BY p.name ASC
            `, [bomId, businessId]);

            const materials = materialsRes.rows;

            // Handle edge case: BOM with no materials
            if (materials.length === 0) {
                return {
                    success: true,
                    bom: {
                        id: bom.id,
                        product_id: bom.product_id,
                        product_name: bom.product_name
                    },
                    productionQuantity,
                    materials: [],
                    totalMaterials: 0,
                    totalEstimatedCost: 0,
                    message: 'BOM has no materials defined'
                };
            }

            // 3. Calculate required quantities by scaling unit quantities to production quantity
            const explodedMaterials = materials.map(mat => {
                const unitQty = Number(mat.unit_quantity);
                const requiredQty = unitQty * productionQuantity;
                const costPrice = Number(mat.cost_price || 0);
                const totalCost = requiredQty * costPrice;
                const availableStock = Number(mat.available_stock || 0);

                return {
                    material_id: mat.material_id,
                    material_name: mat.material_name,
                    sku: mat.sku,
                    unit_quantity: unitQty,
                    required_quantity: requiredQty,
                    unit: mat.unit || mat.product_unit || 'unit',
                    cost_price: costPrice,
                    total_cost: Math.round(totalCost * 100) / 100,
                    available_stock: availableStock,
                    shortage: Math.max(0, requiredQty - availableStock),
                    is_sufficient: availableStock >= requiredQty
                };
            });

            // 4. Calculate totals
            const totalEstimatedCost = explodedMaterials.reduce((sum, mat) => sum + mat.total_cost, 0);
            const insufficientMaterials = explodedMaterials.filter(mat => !mat.is_sufficient);

            return {
                success: true,
                bom: {
                    id: bom.id,
                    product_id: bom.product_id,
                    product_name: bom.product_name
                },
                productionQuantity,
                materials: explodedMaterials,
                totalMaterials: explodedMaterials.length,
                totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
                insufficientMaterials: insufficientMaterials.length,
                canProduce: insufficientMaterials.length === 0,
                message: insufficientMaterials.length > 0 
                    ? `${insufficientMaterials.length} material(s) have insufficient stock`
                    : 'All materials are available for production'
            };

        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Cancel Production
     * Validates order can be cancelled, releases all raw material reservations,
     * updates status to 'cancelled', stores cancellation reason in domain_data
     * 
     * @param {string} orderId - Production order ID
     * @param {string} reason - Cancellation reason
     * @param {Object} context - { businessId, userId }
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Cancelled production order
     */
    async cancelProduction(orderId, reason, context, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        const { businessId, userId } = context;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // 1. Get production order and validate
            const orderRes = await client.query(`
                SELECT po.*, p.name as product_name
                FROM production_orders po
                LEFT JOIN products p ON po.product_id = p.id
                WHERE po.id = $1 AND po.business_id = $2
                FOR UPDATE
            `, [orderId, businessId]);

            if (orderRes.rows.length === 0) {
                throw new Error('Production order not found');
            }

            const order = orderRes.rows[0];

            // Validate order can be cancelled (not already completed or cancelled)
            if (order.status === 'completed') {
                throw new Error('Cannot cancel production: order is already completed');
            }

            if (order.status === 'cancelled') {
                throw new Error('Production order is already cancelled');
            }

            // Validate reason is provided
            if (!reason || reason.trim().length === 0) {
                throw new Error('Cancellation reason is required');
            }

            // 2. Release all raw material reservations from domain_data
            const domainData = order.domain_data || {};
            const reservations = domainData.material_reservations || [];
            const releasedReservations = [];

            for (const reservation of reservations) {
                try {
                    await InventoryService.releaseStock({
                        business_id: businessId,
                        reservation_id: reservation.reservation_id
                    }, client);

                    releasedReservations.push({
                        reservation_id: reservation.reservation_id,
                        material_id: reservation.material_id,
                        material_name: reservation.material_name,
                        quantity: reservation.quantity,
                        released: true
                    });
                } catch (releaseError) {
                    // Log but continue - reservation might already be released or expired
                    console.warn(`Failed to release reservation ${reservation.reservation_id}:`, releaseError.message);
                    releasedReservations.push({
                        reservation_id: reservation.reservation_id,
                        material_id: reservation.material_id,
                        material_name: reservation.material_name,
                        quantity: reservation.quantity,
                        released: false,
                        error: releaseError.message
                    });
                }
            }

            // 3. Update production order status to 'cancelled' and store cancellation details
            const cancellationData = {
                cancelled_by: userId,
                cancelled_at: new Date().toISOString(),
                cancellation_reason: reason.trim(),
                previous_status: order.status,
                reservations_released: releasedReservations
            };

            const updateRes = await client.query(`
                UPDATE production_orders
                SET 
                    status = 'cancelled',
                    updated_at = NOW(),
                    domain_data = COALESCE(domain_data, '{}'::jsonb) || $1::jsonb
                WHERE id = $2 AND business_id = $3
                RETURNING *
            `, [
                JSON.stringify(cancellationData),
                orderId,
                businessId
            ]);

            const cancelledOrder = updateRes.rows[0];

            if (shouldManageTransaction) await client.query('COMMIT');

            // 4. Audit trail (fire-and-forget)
            auditWrite({
                businessId,
                userId,
                action: 'update',
                entityType: 'production_order',
                entityId: orderId,
                description: `Cancelled production order for ${order.product_name}: ${reason}`,
                metadata: {
                    status_change: `${order.status} → cancelled`,
                    cancellation_reason: reason,
                    reservations_released: releasedReservations.filter(r => r.released).length,
                    reservations_failed: releasedReservations.filter(r => !r.released).length,
                    batch_number: order.batch_number,
                    quantity: order.quantity_to_produce || order.quantity
                },
                changes: {
                    before: { status: order.status },
                    after: { status: 'cancelled', cancellation_reason: reason }
                }
            });

            return {
                success: true,
                productionOrder: cancelledOrder,
                cancellation: {
                    reason,
                    previousStatus: order.status,
                    reservationsReleased: releasedReservations.filter(r => r.released).length,
                    reservationsFailed: releasedReservations.filter(r => !r.released).length
                },
                releasedReservations,
                message: `Production order cancelled successfully. Released ${releasedReservations.filter(r => r.released).length} material reservations.`
            };

        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    }
};
