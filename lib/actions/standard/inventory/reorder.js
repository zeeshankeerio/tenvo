'use server';

import { ReorderAutomationService } from '@/lib/services/ReorderAutomationService';
import { withGuard } from '@/lib/rbac/serverGuard';

// validateBusinessAccess was a non-existent import, replaced with withGuard
async function checkAuth(businessId, permission = 'inventory.view') {
    const { session } = await withGuard(businessId, { permission });
    return session;
}

/**
 * Check and trigger reorders for a business
 */
export async function checkAndTriggerReordersAction(businessId) {
    try {
        await checkAuth(businessId, 'inventory.view');
        const reorderCandidates = await ReorderAutomationService.checkAndTriggerReorders(businessId);
        return { success: true, reorderCandidates, count: reorderCandidates.length };
    } catch (error) {
        console.error('Error in checkAndTriggerReordersAction:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get low stock alerts for dashboard
 */
export async function getLowStockAlertsAction(businessId, limit = 20) {
    try {
        await checkAuth(businessId, 'inventory.view');
        const alerts = await ReorderAutomationService.getLowStockAlerts(businessId, limit);
        return { success: true, alerts };
    } catch (error) {
        console.error('Error in getLowStockAlertsAction:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Dismiss a low stock alert (tenant-scoped).
 */
export async function dismissLowStockAlertAction(alertId, businessId) {
    try {
        if (!alertId || !businessId) {
            return { success: false, error: 'Alert and business context are required' };
        }
        await checkAuth(businessId, 'inventory.adjust_stock');
        const alert = await ReorderAutomationService.dismissLowStockAlert(alertId, businessId);
        if (!alert) {
            return { success: false, error: 'Alert not found' };
        }
        return { success: true, alert };
    } catch (error) {
        console.error('Error in dismissLowStockAlertAction:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Set reorder configuration for a product
 */
export async function setReorderConfigAction(businessId, config) {
    try {
        await checkAuth(businessId, 'inventory.edit');
        const updated = await ReorderAutomationService.setReorderConfig(businessId, config);
        return { success: true, config: updated };
    } catch (error) {
        console.error('Error in setReorderConfigAction:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Calculate ABC analysis
 */
export async function calculateABCAnalysisAction(businessId, periodDays = 90) {
    try {
        await checkAuth(businessId, 'analytics.basic');
        const analysis = await ReorderAutomationService.calculateABCAnalysis(businessId, periodDays);
        return { success: true, analysis, count: analysis.length };
    } catch (error) {
        console.error('Error in calculateABCAnalysisAction:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generate reorder PO suggestion
 */
export async function generateReorderPOSuggestionAction(businessId, warehouseId = null) {
    try {
        await checkAuth(businessId, 'purchases.create');
        const suggestion = await ReorderAutomationService.generateReorderPOSuggestion(businessId, warehouseId);
        return { success: true, suggestion, hasItems: suggestion && suggestion.length > 0 };
    } catch (error) {
        console.error('Error in generateReorderPOSuggestionAction:', error);
        return { success: false, error: error.message };
    }
}
