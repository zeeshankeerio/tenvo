'use server';

import { db } from '@/lib/db';
import { ProcurementAgent } from '@/lib/services/ai/ProcurementAgent';
import { AnomalyDetectionService } from '@/lib/services/ai/AnomalyDetectionService';
import { AIGenService } from '@/lib/services/ai/AIGenService';
import { BusinessAnalyst } from '@/lib/services/ai/BusinessAnalyst';
import { loadAnalystBusinessContext } from '@/lib/services/ai/analystSqlGuard';
import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';

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
 * @param {string} businessId
 * @returns {Promise<{ success: boolean, timestamp: string, stock: any, financial: any }>}
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
 * Ask the AI Business Analyst a question (hub only, auth + tenant scoped).
 * Client-supplied context is ignored; business identity comes from the DB row for businessId.
 */
export async function askBusinessAnalystAction(businessId, question) {
    try {
        await checkAuth(businessId, 'analytics.view');

        const trimmedQuestion = typeof question === 'string' ? question.trim().slice(0, 2000) : '';
        if (!trimmedQuestion) {
            return await actionFailure('ANALYST_QUERY_FAILED', 'Please enter a question.');
        }

        const biz = await loadAnalystBusinessContext(pool, businessId);
        const result = await BusinessAnalyst.ask(businessId, trimmedQuestion, {
            businessName: biz.business_name,
            category: biz.category,
        });
        if (!result?.success) {
            return await actionFailure(
                'ANALYST_QUERY_FAILED',
                typeof result?.error === 'string' ? result.error : 'The analyst could not complete this query.'
            );
        }
        const insightRaw = result.insight;
        const insight =
            typeof insightRaw === 'string'
                ? insightRaw.trim()
                : insightRaw != null
                  ? String(insightRaw).trim()
                  : '';
        const rowCount = Array.isArray(result.data) ? result.data.length : 0;
        const answer =
            insight ||
            (rowCount === 0
                ? 'Your query ran successfully but returned no rows. Try a different time range or confirm data exists for this business.'
                : `Your query returned ${rowCount} row(s). Enable AI narrative (API keys) for a fuller interpretation.`);

        return await actionSuccess({
            answer,
            rowCount,
            question: result.question,
        });
    } catch (e) {
        return await actionFailure('ANALYST_QUERY_FAILED', await getErrorMessage(e));
    }
}

/**
 * Generate AI-powered product content
 */
export async function enrichProductContentAction(businessId, productId) {
    try {
        await checkAuth(businessId, 'inventory.edit');

        await assertEntityBelongsToBusiness(null, 'product', productId, businessId);

        const product = await db.products.findFirst({
            where: { id: productId, business_id: businessId, is_deleted: false },
            select: { id: true, name: true, category: true, description: true },
        });
        if (!product) throw new Error('Product not found');

        const description = await AIGenService.generateProductDescription(product.name, product.category || 'General');

        if (description) {
            await db.products.updateMany({
                where: { id: productId, business_id: businessId },
                data: { description },
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
