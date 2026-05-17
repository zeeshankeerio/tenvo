'use server';

import { ProcurementAgent } from '@/lib/services/ai/ProcurementAgent';
import { AnomalyDetectionService } from '@/lib/services/ai/AnomalyDetectionService';
import { AIGenService } from '@/lib/services/ai/AIGenService';
import { BusinessAnalyst } from '@/lib/services/ai/BusinessAnalyst';
import { withGuard } from '@/lib/rbac/serverGuard';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';

async function checkAuth(businessId, permission = 'analytics.premium') {
    const { session } = await withGuard(businessId, {
        permission,
        feature: 'ai_analytics'
    });
    return session;
}

/**
 * Trigger autonomous procurement analysis for a product
 */
export async function runAgenticProcurementAction(businessId, productId) {
    try {
        const session = await checkAuth(businessId, 'purchase.create');
        const result = await ProcurementAgent.analyzeAndProcure(businessId, productId, session.user.id);
        return await actionSuccess(result);
    } catch (e) {
        return await actionFailure('AGENT_PROCUREMENT_FAILED', await getErrorMessage(e));
    }
}

/**
 * Run a full system anomaly scan
 */
export async function runSystemAuditAction(businessId) {
    try {
        await checkAuth(businessId, 'admin.audit');

        const [stockAnomalies, financialAnomalies] = await Promise.all([
            AnomalyDetectionService.detectStockAnomalies(businessId),
            AnomalyDetectionService.detectFinancialAnomalies(businessId)
        ]);

        return await actionSuccess({
            timestamp: new Date().toISOString(),
            stock: stockAnomalies,
            financial: financialAnomalies
        });
    } catch (e) {
        return await actionFailure('AUDIT_SCAN_FAILED', await getErrorMessage(e));
    }
}

/**
 * Ask the AI Business Analyst a question
 */
export async function askBusinessAnalystAction(businessId, question) {
    try {
        await checkAuth(businessId, 'analytics.view');
        const result = await BusinessAnalyst.ask(businessId, question);
        return await actionSuccess({ data: result });
    } catch (e) {
        return await actionFailure('ANALYST_QUERY_FAILED', await getErrorMessage(e));
    }
}

/**
 * Generate AI-powered product content
 */
export async function enrichProductContentAction(businessId, productId) {
    try {
        const session = await checkAuth(businessId, 'inventory.edit');

        // 1. Fetch current product
        const { db } = await import('@/lib/db');
        const product = await db.products.findUnique({ where: { id: productId } });
        if (!product) throw new Error('Product not found');

        // 2. Generate description
        const description = await AIGenService.generateProductDescription(product.name, product.category || 'General');

        if (description) {
            await db.products.update({
                where: { id: productId },
                data: { description }
            });
        }

        return await actionSuccess({ message: 'Product content enriched', description });
    } catch (e) {
        return await actionFailure('CONTENT_ENRICHMENT_FAILED', await getErrorMessage(e));
    }
}

/**
 * Semantic Product Search
 */
export async function searchProductsSemanticAction(businessId, query) {
    try {
        await checkAuth(businessId, 'inventory.view');
        const result = await BusinessAnalyst.semanticSearch(businessId, query);
        return await actionSuccess(result);
    } catch (e) {
        return await actionFailure('SEMANTIC_SEARCH_FAILED', await getErrorMessage(e));
    }
}
