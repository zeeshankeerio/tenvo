'use server';

import { withGuard } from '@/lib/rbac/serverGuard';
import { SerialService } from '@/lib/services/SerialService';
import { serialSchema, bulkSerialsSchema, validateSchema } from '@/lib/validation/schemas';

async function checkAuth(businessId, permission = 'inventory.view') {
    const { session } = await withGuard(businessId, { permission });
    return session;
}

export async function createSerialAction(serialData) {
    try {
        const validatedData = validateSchema(serialSchema, serialData);
        await checkAuth(validatedData.business_id, 'inventory.edit');
        const serial = await SerialService.createSerial(validatedData);
        return { success: true, serial };
    } catch (error) {
        console.error('Create Serial Error:', error);
        return { success: false, error: error.message };
    }
}

export async function createBulkSerialsAction(bulkData) {
    try {
        const validatedData = validateSchema(bulkSerialsSchema, bulkData);
        await checkAuth(validatedData.business_id, 'inventory.edit');
        const result = await SerialService.createBulkSerials(validatedData);
        return { success: true, ...result };
    } catch (error) {
        console.error('Bulk Serial Error:', error);
        return { success: false, error: error.message };
    }
}

export async function sellSerialAction(businessId, serialNumber, customerId, invoiceId) {
    try {
        await checkAuth(businessId, 'inventory.adjust_stock');
        const serial = await SerialService.sellSerial(businessId, serialNumber, customerId, invoiceId);
        return { success: true, serial };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getProductSerialsAction(productId, businessId) {
    try {
        await checkAuth(businessId, 'inventory.view');
        const serials = await SerialService.getProductSerials(productId, businessId);
        return { success: true, serials };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getAvailableSerialsAction(productId, businessId) {
    try {
        await checkAuth(businessId, 'inventory.view');
        const serials = await SerialService.getAvailableSerials(productId, businessId);
        return { success: true, serials };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getSerialAction(businessId, serialNumber) {
    try {
        await checkAuth(businessId, 'inventory.view');
        const serial = await SerialService.getSerialDetail(businessId, serialNumber);
        return { success: true, serial };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deleteSerialAction(serialId, businessId) {
    try {
        await checkAuth(businessId, 'inventory.delete');
        await SerialService.deleteSerial(serialId, businessId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
