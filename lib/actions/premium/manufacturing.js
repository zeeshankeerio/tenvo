'use server';

import pool from '@/lib/db';
import { removeStockAction, addStockAction } from '@/lib/actions/standard/inventory/stock';
import { withGuard } from '@/lib/rbac/serverGuard';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';

async function checkAuthAndPlan(businessId, permission = 'manufacturing.view', client = null) {
    const { session } = await withGuard(businessId, {
        permission,
        feature: 'manufacturing',
        client,
    });
    return session;
}

/**
 * Server Action: Get all BOMs for a business
 */
export async function getBOMsAction(businessId) {
    try {
        await checkAuthAndPlan(businessId, 'manufacturing.view');

        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    b.*,
                    p.name as product_name,
                    p.sku as product_sku,
                    COALESCE(
                        (SELECT json_agg(json_build_object(
                            'material_id', bm.material_id,
                            'quantity', bm.quantity,
                            'unit', bm.unit,
                            'productName', mp.name,
                            'cost_price', mp.cost_price
                        ))
                        FROM bom_materials bm
                        LEFT JOIN products mp ON bm.material_id = mp.id
                        WHERE bm.bom_id = b.id),
                        '[]'::json
                    ) as components
                FROM boms b
                LEFT JOIN products p ON b.product_id = p.id
                WHERE b.business_id = $1
                ORDER BY b.created_at DESC
            `, [businessId]);

            return { success: true, boms: result.rows };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Get BOMs error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Create BOM with materials
 */
export async function createBOMAction(bomData) {
    const client = await pool.connect();

    try {
        await checkAuthAndPlan(bomData.business_id, 'manufacturing.manage_bom', client);

        await client.query('BEGIN');

        const { materials, ...header } = bomData;

        // Create BOM header
        const headerResult = await client.query(`
            INSERT INTO boms (
                business_id, product_id, name, version, notes, domain_data
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            header.business_id,
            header.product_id,
            header.name,
            header.version || '1.0',
            header.notes || null,
            header.domain_data || {}
        ]);

        const bom = headerResult.rows[0];

        // Create BOM materials
        if (materials && materials.length > 0) {
            for (const material of materials) {
                await client.query(`
                    INSERT INTO bom_materials (
                        bom_id, business_id, material_id, quantity, unit
                    ) VALUES ($1, $2, $3, $4, $5)
                `, [
                    bom.id,
                    header.business_id,
                    material.material_id,
                    material.quantity,
                    material.unit || 'pcs'
                ]);
            }
        }

        await client.query('COMMIT');

        return { success: true, bom };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create BOM error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Server Action: Get all production orders for a business
 */
export async function getProductionOrdersAction(businessId) {
    try {
        await checkAuthAndPlan(businessId, 'manufacturing.view');

        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    po.*,
                    p.name as product_name,
                    p.sku as product_sku,
                    COALESCE(
                        (SELECT json_agg(json_build_object(
                            'material_id', bm.material_id,
                            'quantity', bm.quantity,
                            'unit', bm.unit,
                            'productName', mp.name,
                            'cost_price', mp.cost_price
                        ))
                        FROM bom_materials bm
                        LEFT JOIN products mp ON bm.material_id = mp.id
                        WHERE bm.bom_id = po.bom_id),
                        '[]'::json
                    ) as components
                FROM production_orders po
                LEFT JOIN products p ON po.product_id = p.id
                WHERE po.business_id = $1
                ORDER BY po.created_at DESC
            `, [businessId]);

            return { success: true, productionOrders: result.rows };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Get production orders error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Helper: Consume raw materials for a production order
 */
async function consumeMaterials(client, businessId, bomId, productionOrderId, quantityToProduce, warehouseId, materialSerials = {}) {
    // 1. Get BOM materials and wastage config
    const bomRes = await client.query('SELECT domain_data FROM boms WHERE id = $1', [bomId]);
    const wastagePercent = Number(bomRes.rows[0]?.domain_data?.wastage_percent || 0);

    const materialsRes = await client.query(`
        SELECT bm.material_id, bm.quantity, bm.unit, p.cost_price, p.serial_tracked
        FROM bom_materials bm
        LEFT JOIN products p ON bm.material_id = p.id
        WHERE bm.bom_id = $1 AND bm.business_id = $2
    `, [bomId, businessId]);

    const materials = materialsRes.rows;
    let totalCost = 0;

    // 2. Deduct stock for each material (factoring in wastage)
    for (const mat of materials) {
        const baseQty = Number(mat.quantity) * Number(quantityToProduce);
        const consumedQty = baseQty * (1 + (wastagePercent / 100));

        // Use the transaction client to ensure atomicity
        const result = await removeStockAction({
            businessId,
            productId: mat.material_id,
            warehouseId,
            quantity: consumedQty,
            serial_numbers: materialSerials[mat.material_id] || [],
            referenceType: 'production_consumption',
            referenceId: productionOrderId,
            notes: `Consumed for Production Order #${productionOrderId}`
        }, client);

        if (!result.success) {
            throw new Error(`Failed to consume material ${mat.material_id}: ${result.error}`);
        }

        // Accumulate TRUE cost (returned from FIFO/Batch logic)
        totalCost += Number(result.costOfGoodsSold || 0);
    }
    return totalCost;
}

/**
 * Server Action: Create production order with material consumption
 */
export async function createProductionOrderAction(orderData) {
    const client = await pool.connect();

    try {
        await checkAuthAndPlan(orderData.business_id, 'manufacturing.create', client);

        await client.query('BEGIN');

        // Create production order
        const orderResult = await client.query(`
            INSERT INTO production_orders (
                business_id, product_id, bom_id, quantity_to_produce, quantity,
                warehouse_id, scheduled_date, notes, status,
                domain_data, batch_number
            ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            orderData.business_id,
            orderData.product_id,
            orderData.bom_id,
            orderData.quantity_to_produce,
            orderData.warehouse_id || null, // Ensure we have a warehouse for stock moves
            orderData.scheduled_date || new Date().toISOString(),
            orderData.notes || null,
            orderData.status || 'planned',
            orderData.domain_data || {},
            orderData.batch_number || null
        ]);

        const productionOrder = orderResult.rows[0];

        // If status is 'completed', handle stock moves
        if (orderData.status === 'completed') {
            const warehouseId = orderData.warehouse_id;
            if (!warehouseId) throw new Error('Warehouse ID is required to complete production');

            // 1. Consumed Materials (get total cost)
            const materialSerials = productionOrder.domain_data?.material_serials || {};
            const totalMaterialCost = await consumeMaterials(client, orderData.business_id, orderData.bom_id, productionOrder.id, orderData.quantity_to_produce, warehouseId, materialSerials);
            const unitCost = totalMaterialCost / Number(orderData.quantity_to_produce);

            // 2. Add Finished Goods
            await addStockAction({
                businessId: orderData.business_id,
                productId: orderData.product_id,
                warehouseId: warehouseId,
                quantity: orderData.quantity_to_produce,
                costPrice: unitCost,
                batchNumber: orderData.batch_number,
                referenceType: 'production',
                referenceId: productionOrder.id,
                notes: `Finished Goods from Production Order #${productionOrder.id}`
            }, client);
        }

        await client.query('COMMIT');

        return { success: true, productionOrder };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create production order error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Server Action: Update production order status
 */
export async function updateProductionOrderStatusAction(businessId, orderId, status) {
    try {
        await checkAuthAndPlan(businessId, 'manufacturing.create');

        const client = await pool.connect();
        try {
            await checkAuthAndPlan(businessId, 'manufacturing.create', client);
            
            // Assert production order belongs to business before updating
            await assertEntityBelongsToBusiness(client, 'production_order', orderId, businessId);
            
            await client.query('BEGIN');

            // Get existing order to check previous status
            const existingRes = await client.query(`
                SELECT * FROM production_orders WHERE id = $1 AND business_id = $2
            `, [orderId, businessId]);

            if (existingRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, error: 'Order not found' };
            }

            const existingOrder = existingRes.rows[0];

            // Prevent double completion
            if (existingOrder.status === 'completed' && status === 'completed') {
                await client.query('ROLLBACK');
                return { success: true, productionOrder: existingOrder, message: 'Already completed' };
            }

            const result = await client.query(`
                UPDATE production_orders 
                SET status = $1, updated_at = NOW()
                WHERE id = $2 AND business_id = $3
                RETURNING *
            `, [status, orderId, businessId]);

            const productionOrder = result.rows[0];

            // If status is updated to 'completed', handle stock moves
            if (status === 'completed') {
                // Use warehouse from order
                const warehouseId = productionOrder.warehouse_id;
                if (!warehouseId) throw new Error('Order missing Warehouse ID');

                // 1. Consume Materials (get total cost - returns Actual Batch Cost now)
                const materialSerials = productionOrder.domain_data?.material_serials || {};
                const totalMaterialCost = await consumeMaterials(client, businessId, productionOrder.bom_id, productionOrder.id, productionOrder.quantity_to_produce, warehouseId, materialSerials);
                const unitCost = totalMaterialCost / Number(productionOrder.quantity_to_produce);

                // 2. Add Finished Goods
                await addStockAction({
                    businessId: productionOrder.business_id,
                    productId: productionOrder.product_id,
                    warehouseId: productionOrder.warehouse_id,
                    quantity: productionOrder.quantity_to_produce,
                    costPrice: unitCost, // TRUE COST
                    batchNumber: productionOrder.batch_number,
                    referenceType: 'production',
                    referenceId: productionOrder.id,
                    notes: `Finished Goods from Production Order #${productionOrder.id}`
                }, client);
            }

            await client.query('COMMIT');
            return { success: true, productionOrder };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Update production order status error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Delete BOM
 */
export async function deleteBOMAction(bomId, businessId) {
    try {
        const client = await pool.connect();
        try {
            // Assert BOM belongs to business before deleting
            await assertEntityBelongsToBusiness(client, 'bom', bomId, businessId);
            
            // Verify BOM belongs to this business
            const bomRes = await client.query('SELECT id FROM boms WHERE id = $1 AND business_id = $2', [bomId, businessId]);
            if (bomRes.rows.length === 0) return { success: false, error: 'BOM not found' };

            await checkAuthAndPlan(businessId, 'manufacturing.manage_bom', client);

            // First check if BOM is used in active production orders
            const checkRes = await client.query('SELECT count(*) FROM production_orders WHERE bom_id = $1 AND business_id = $2 AND status != $3', [bomId, businessId, 'completed']);
            if (parseInt(checkRes.rows[0].count) > 0) {
                return { success: false, error: 'Cannot delete BOM while active production orders exist' };
            }

            await client.query('BEGIN');
            // Delete materials first
            await client.query('DELETE FROM bom_materials WHERE bom_id = $1 AND business_id = $2', [bomId, businessId]);
            // Delete header
            await client.query('DELETE FROM boms WHERE id = $1 AND business_id = $2', [bomId, businessId]);
            await client.query('COMMIT');

            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Delete BOM error:', error);
        return { success: false, error: error.message };
    }
}
