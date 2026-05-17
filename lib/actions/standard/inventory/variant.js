'use server';

import { withGuard } from '@/lib/rbac/serverGuard';
import { VariantService } from '@/lib/services/VariantService';
import { variantSchema, validateSchema } from '@/lib/validation/schemas';
import pool from '@/lib/db';

async function checkAuth(businessId, permission = 'inventory.view') {
    const { session } = await withGuard(businessId, { permission });
    return session;
}

export async function createVariantAction(variantData) {
    try {
        const validatedData = validateSchema(variantSchema, variantData);
        await checkAuth(validatedData.business_id, 'inventory.create');
        const variant = await VariantService.createVariant(validatedData);
        return { success: true, variant };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getProductVariantsAction(productId, businessId) {
    try {
        if (!businessId) throw new Error('businessId is required for tenant isolation');
        await checkAuth(businessId, 'inventory.view');
        const variants = await VariantService.getProductVariants(productId, businessId);
        return { success: true, variants };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function updateVariantStockAction(variantId, businessId, quantityChange, reason = 'Manual Adjustment', notes = '') {
    try {
        await checkAuth(businessId, 'inventory.adjust_stock');
        const variant = await VariantService.updateVariantStock(variantId, businessId, quantityChange, `${reason}: ${notes}`);
        return { success: true, variant };
    } catch (error) {
        console.error('Update Variant Stock Error:', error);
        return { success: false, error: error.message };
    }
}

export async function searchVariantsAction(businessId, filters = {}) {
    try {
        await checkAuth(businessId, 'inventory.view');
        const variants = await VariantService.searchVariants(businessId, filters);
        return { success: true, variants };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function createVariantMatrixAction(data) {
    try {
        await checkAuth(data.business_id, 'inventory.create');
        const result = await VariantService.createVariantMatrix(data);
        return { success: true, ...result };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getVariantMatrixAction(productId) {
    try {
        // Need to find businessId first for auth
        const productRes = await pool.query(
            'SELECT business_id FROM products WHERE id = $1 AND is_deleted = false LIMIT 1',
            [productId]
        );

        if (productRes.rows.length === 0) {
            return { success: false, error: 'Product not found' };
        }

        const businessId = productRes.rows[0].business_id;
        await checkAuth(businessId, 'inventory.view');

        const matrixData = await VariantService.getVariantMatrix(productId, businessId);
        return { success: true, matrixData };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Update variant pricing (price, cost_price, mrp)
 */
export async function updateVariantPricingAction(variantId, businessId, pricingData) {
    try {
        await checkAuth(businessId, 'inventory.edit');
        const variant = await VariantService.updateVariantPricing(variantId, businessId, pricingData);
        return { success: true, variant };
    } catch (error) {
        console.error('Update Variant Pricing Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Soft-delete a variant
 */
export async function deleteVariantAction(variantId, businessId) {
    try {
        await checkAuth(businessId, 'inventory.delete');
        await VariantService.deleteVariant(variantId, businessId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
