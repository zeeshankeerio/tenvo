'use server';

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
import { InventoryService } from '@/lib/services/InventoryService';
import { auditWrite } from '@/lib/actions/_shared/audit';
import pool from '@/lib/db';

async function checkAuth(businessId, permission = 'inventory.view') {
    const { session } = await withGuard(businessId, { permission });
    return session;
}

/**
 * Server Action: Reserve Stock for a Sales Order
 */
export async function reserveStockAction(params) {
    try {
        const validation = validateWithSchema(reserveStockSchema, params);
        if (!validation.success) return { success: false, error: 'Validation failed', errors: validation.errors };
        const validated = validation.data;

        await checkAuth(validated.business_id, 'inventory.adjust_stock');
        const reservation = await InventoryService.reserveStock(validated);
        return { success: true, reservation };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Release Reserved Stock
 */
export async function releaseStockAction(params) {
    try {
        const validation = validateWithSchema(releaseStockSchema, params);
        if (!validation.success) return { success: false, error: 'Validation failed', errors: validation.errors };
        const validated = validation.data;

        await checkAuth(validated.business_id, 'inventory.adjust_stock');
        const result = await InventoryService.releaseStock(validated);
        return result;
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Add Stock (Purchase/Stock In)
 */
export async function addStockAction(params) {
    try {
        const validation = validateWithSchema(addStockSchema, params);
        if (!validation.success) return { success: false, error: 'Validation failed', errors: validation.errors };
        const validated = validation.data;

        const session = await checkAuth(validated.business_id, 'inventory.adjust_stock');
        const result = await InventoryService.addStock(validated, session.user.id);

        auditWrite({
            businessId: validated.business_id,
            action: 'create',
            entityType: 'stock_movement',
            entityId: result.movementId,
            description: `Stock added: ${validated.quantity} items`,
            metadata: { productId: validated.product_id, warehouseId: validated.warehouse_id }
        });

        return { success: true, ...result };
    } catch (e) {
        console.error("addStockAction error:", e);
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Remove Stock (Sale/Stock Out)
 */
export async function removeStockAction(params) {
    try {
        const validation = validateWithSchema(removeStockSchema, params);
        if (!validation.success) return { success: false, error: 'Validation failed', errors: validation.errors };
        const validated = validation.data;

        const session = await checkAuth(validated.business_id, 'inventory.adjust_stock');
        const result = await InventoryService.removeStock(validated, session.user.id);

        auditWrite({
            businessId: validated.business_id,
            action: 'delete',
            entityType: 'stock_movement',
            entityId: result.movementId,
            description: `Stock removed: ${validated.quantity} items`,
            metadata: { productId: validated.product_id, warehouseId: validated.warehouse_id }
        });

        return { success: true, ...result };
    } catch (e) {
        console.error("removeStockAction error:", e);
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Transfer Stock
 */
export async function transferStockAction(params) {
    try {
        const validation = validateWithSchema(transferStockSchema, params);
        if (!validation.success) return { success: false, error: 'Validation failed', errors: validation.errors };
        const validated = validation.data;

        const session = await checkAuth(validated.business_id, 'inventory.transfer');
        const result = await InventoryService.transferStock(validated, session.user.id);
        return result;
    } catch (e) {
        console.error("transferStockAction error:", e);
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Adjust Stock
 */
export async function adjustStockAction(params) {
    try {
        const validation = validateWithSchema(adjustStockSchema, params);
        if (!validation.success) return { success: false, error: 'Validation failed', errors: validation.errors };
        const validated = validation.data;

        const session = await checkAuth(validated.business_id, 'inventory.adjust_stock');
        const result = await InventoryService.adjustStock({
            businessId: validated.business_id,
            productId: validated.product_id,
            warehouseId: validated.warehouse_id,
            adjustmentType: validated.quantity_change > 0 ? 'add' : 'remove',
            quantity: Math.abs(validated.quantity_change),
            reason: validated.reason,
            notes: validated.notes
        }, session.user.id);
        return result;
    } catch (e) {
        console.error("adjustStockAction error:", e);
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Get Stock Valuation
 */
export async function getStockValuationAction(businessId, warehouseId = null) {
    try {
        await checkAuth(businessId, 'inventory.view');
        return await InventoryService.getStockValuation(businessId, warehouseId);
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Get Stock Movements
 */
export async function getStockMovementsAction(productId, limit = 50) {
    try {
        // Need businessId for auth
        const pRes = await pool.query('SELECT business_id FROM products WHERE id = $1', [productId]);
        if (pRes.rows.length === 0) throw new Error('Product not found');
        const businessId = pRes.rows[0].business_id;
        
        await checkAuth(businessId, 'inventory.view');
        const movements = await InventoryService.getStockMovements(businessId, productId, limit);
        return { success: true, movements };
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
        const alerts = await InventoryService.getLowStockAlerts(businessId);
        return { success: true, alerts };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Get Recent Stock Adjustments (business-wide)
 */
export async function getRecentStockAdjustmentsAction(businessId, limit = 100) {
    try {
        await checkAuth(businessId, 'inventory.view');
        const adjustments = await InventoryService.getRecentStockAdjustments(businessId, limit);
        return { success: true, adjustments };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Get Inventory Reservations (active + historical)
 */
export async function getInventoryReservationsAction(businessId, status = 'all', limit = 200) {
    try {
        await checkAuth(businessId, 'inventory.view');
        const reservations = await InventoryService.getInventoryReservations(businessId, { status, limit });
        return { success: true, reservations };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Expire overdue reservations and release reserved batch quantities
 */
export async function expireOverdueReservationsAction(businessId, limit = 200) {
    try {
        await checkAuth(businessId, 'inventory.adjust_stock');
        const result = await InventoryService.expireOverdueReservations(businessId, limit);
        return { success: true, ...result };
    } catch (e) {
        return { success: false, error: e.message };
    }
}
