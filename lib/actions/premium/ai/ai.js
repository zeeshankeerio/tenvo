'use server';

import { AIOrderForecaster } from '@/lib/services/ai/forecasting';
import { WorkflowEngine } from '@/lib/services/workflows/workflowEngine';
import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';

async function checkAuthAndPlan(businessId, permission = 'analytics.basic', feature = 'ai_analytics', client = null) {
    const { session } = await withGuard(businessId, {
        permission,
        feature,
        client,
    });
    return session;
}

/**
 * Get AI-driven restock suggestions for a business
 */
export async function getAiRestockSuggestionsAction(businessId) {
    try {
        await checkAuthAndPlan(businessId, 'analytics.basic', 'ai_analytics');

        // Fetch products and their sales history
        const client = await pool.connect();
        try {
            const productsRes = await client.query(
                `SELECT id, name, sku, stock, reorder_point, cost_price, price
                 FROM products
                 WHERE business_id = $1
                   AND is_active = true
                   AND (is_deleted = false OR is_deleted IS NULL)`,
                [businessId]
            );

            const suggestions = [];
            for (const product of productsRes.rows) {
                // Fetch last 6 months of sales for this product
                const salesRes = await client.query(`
                    SELECT 
                        DATE_TRUNC('month', created_at) as date,
                        SUM(quantity_change) as quantity
                    FROM stock_movements
                    WHERE product_id = $1 AND movement_type = 'out'
                    AND created_at >= NOW() - INTERVAL '6 months'
                    GROUP BY DATE_TRUNC('month', created_at)
                    ORDER BY date ASC
                `, [product.id]);

                const forecast = await AIOrderForecaster.forecastDemand(businessId, product, salesRes.rows);

                if (product.stock < forecast.forecastedQuantity) {
                    suggestions.push({
                        ...product,
                        forecast,
                        priority: product.stock < (forecast.forecastedQuantity * 0.3) ? 'High' : 'Medium'
                    });
                }
            }

            return { success: true, suggestions };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('AI Suggestion error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Process a natural language "Fuzzy Rule" for automation
 */
export async function processAiFuzzyRuleAction(businessId, ruleText, context) {
    try {
        await checkAuthAndPlan(businessId, 'analytics.basic', 'ai_analytics');
        const result = await WorkflowEngine.processFuzzyRule(businessId, ruleText, context);
        return { success: true, result };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
