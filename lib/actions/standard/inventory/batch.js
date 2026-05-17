'use server';

import { withGuard } from '@/lib/rbac/serverGuard';
import { BatchService } from '@/lib/services/BatchService';

async function checkAuth(businessId, permission = 'inventory.view') {
    const { session } = await withGuard(businessId, { permission });
    return session;
}

/**
 * Server Action: Create Batch
 */
export async function createBatchAction(batchData) {
    try {
        await checkAuth(batchData.business_id, 'inventory.create');
        const batch = await BatchService.createBatch(batchData);
        return { success: true, batch };
    } catch (error) {
        console.error('Create Batch Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Get Batches for a Product
 */
export async function getBatchesAction(productId, businessId) {
    try {
        await checkAuth(businessId, 'inventory.view');
        const batches = await BatchService.getBatches(productId, businessId);
        return { success: true, batches };
    } catch (error) {
        console.error('Get Batches Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Update Batch
 */
export async function updateBatchAction(batchId, businessId, updates) {
    try {
        await checkAuth(businessId, 'inventory.edit');
        const batch = await BatchService.updateBatch(batchId, businessId, updates);
        return { success: true, batch };
    } catch (error) {
        console.error('Update Batch Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Delete Batch
 */
export async function deleteBatchAction(batchId, businessId) {
    try {
        await checkAuth(businessId, 'inventory.delete');
        await BatchService.deleteBatch(batchId, businessId);
        return { success: true };
    } catch (error) {
        console.error('Delete Batch Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Get Expiring Batches
 */
export async function getExpiringBatchesAction(businessId, daysThreshold = 30) {
    try {
        await checkAuth(businessId, 'inventory.view');
        const batches = await BatchService.getExpiringSoon(businessId, daysThreshold);
        return { success: true, batches };
    } catch (error) {
        console.error('Get Expiring Batches Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Get Available Batches (Qty > 0 & Not Expired)
 */
export async function getAvailableBatchesAction(productId, businessId) {
    try {
        await checkAuth(businessId, 'inventory.view');
        const batches = await BatchService.getAvailableBatches(productId, businessId);
        return { success: true, batches };
    } catch (error) {
        console.error('Get Available Batches Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Update Batch Quantity (Atomic)
 */
export async function updateBatchQuantityAction(batchId, businessId, quantityChange, isReservation = false) {
    try {
        await checkAuth(businessId, 'inventory.adjust_stock');
        const batch = await BatchService.adjustQuantity(batchId, businessId, quantityChange, isReservation);
        return { success: true, batch };
    } catch (error) {
        console.error('Update Batch Quantity Error:', error);
        return { success: false, error: error.message };
    }
}
