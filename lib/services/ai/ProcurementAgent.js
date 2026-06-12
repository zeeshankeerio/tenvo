import { db } from '@/lib/db';
import { AIOrderForecaster } from './forecasting';
import { InventoryService } from '../InventoryService';
import { AccountingService } from '../AccountingService';
import { auditLog } from '../auditLog';

/**
 * Agentic Procurement Service
 * 2026 Standard: Autonomous supply chain management with human-in-the-loop approval.
 */
export const ProcurementAgent = {
    
    /**
     * Run an autonomous health check on a product and suggest procurement if needed
     */
    async analyzeAndProcure(businessId, productId, userId) {
        try {
            // 1. Gather Intelligence
            const product = await db.products.findFirst({
                where: { id: productId, business_id: businessId, is_deleted: false },
                include: {
                    businesses: true,
                    purchase_items: {
                        take: 5,
                        orderBy: { created_at: 'desc' },
                        include: { purchases: { include: { vendors: true } } }
                    }
                }
            });

            if (!product) return { success: false, reason: 'Product not found' };

            // 2. Fetch Sales History (Last 90 days for trend analysis)
            const salesHistory = await db.invoice_items.groupBy({
                by: ['created_at'],
                where: {
                    product_id: productId,
                    business_id: businessId,
                    created_at: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
                },
                _sum: { quantity: true }
            });

            // 3. Run AI Forecasting
            const forecast = await AIOrderForecaster.forecastDemand(
                product.businesses.category, 
                product, 
                salesHistory.map(s => ({ date: s.created_at, quantity: s._sum.quantity }))
            );

            // 4. Decision Logic
            const currentStock = parseFloat(product.stock || 0);
            const needsProcurement = currentStock < forecast.forecastedQuantity;

            if (!needsProcurement) {
                return { success: true, action: 'none', reason: 'Stock levels sufficient for forecasted demand' };
            }

            // 5. Research Suppliers (Get last vendor or best price)
            const lastVendor = product.purchase_items[0]?.purchases?.vendors;
            if (!lastVendor) {
                return { success: false, reason: 'No vendor history found for this product. Agent cannot research external vendors yet.' };
            }

            // 6. Check Financial Health
            const financialContext = await AccountingService.getBusinessBalance(businessId);
            const estimatedCost = forecast.forecastedQuantity * (parseFloat(product.cost_price) || 0);
            
            const canAfford = financialContext.total_balance > estimatedCost;

            // 7. Generate Agentic Proposal
            const proposal = {
                type: 'PROCUREMENT_PROPOSAL',
                businessId,
                productId,
                vendorId: lastVendor.id,
                quantity: forecast.forecastedQuantity,
                estimatedCost,
                reasoning: forecast.reasoning,
                riskFactors: forecast.riskFactors,
                confidence: forecast.confidenceScore,
                financialApproval: canAfford ? 'HEALTHY' : 'LOW_LIQUIDITY',
                suggestedAction: forecast.suggestedAction
            };

            // 8. Create Approval Request (Human-in-the-loop)
            const approvalRequest = await db.approval_requests.create({
                data: {
                    business_id: businessId,
                    request_type: 'purchase',
                    status: 'pending',
                    priority: (forecast.confidenceScore || 0) > 0.8 ? 'high' : 'medium',
                    title: `Agentic PO Proposal: ${product.name}`,
                    description: `Agent suggests ordering ${forecast.forecastedQuantity} units from ${lastVendor.name || 'preferred vendor'}. Reasoning: ${forecast.reasoning}`,
                    metadata: proposal,
                    requested_by: userId,
                    amount: proposal.totalCost
                }
            });


            // 9. Update Product Domain Data with Forecast
            await db.products.update({
                where: { id: productId },
                data: {
                    domain_data: {
                        ...(product.domain_data || {}),
                        last_ai_forecast: forecast,
                        agent_procurement_pending: true,
                        optimal_stock_level: forecast.forecastedQuantity
                    }
                }
            });

            await auditLog({
                businessId,
                action: 'AGENT_PROCUREMENT_PROPOSAL',
                entityType: 'product',
                entityId: productId,
                description: `Agent generated a procurement proposal for ${product.name} (Qty: ${forecast.forecastedQuantity})`,
                userId
            });

            return {
                success: true,
                action: 'proposal_created',
                approvalId: approvalRequest.id,
                forecast
            };

        } catch (error) {
            console.error('Procurement Agent Error:', error);
            throw error;
        }
    },

    /**
     * Orchestrator: Scan business inventory and trigger procurement for items needing attention.
     * Usually called by background jobs or orchestration hooks.
     */
    async evaluateAndAct(businessId) {
        try {
            console.log(`[ProcurementAgent] Starting autonomous evaluation for business: ${businessId}`);
            
            // Find products that are below min_stock_level or reorder_point
            // 2026 Strategy: We also check products with high velocity even if stock is currently okay
            const criticalProducts = await db.products.findMany({
                where: {
                    business_id: businessId,
                    is_deleted: false,
                    is_active: true,
                    OR: [
                        { stock: { lte: db.products.fields.min_stock_level } },
                        { stock: { lte: db.products.fields.reorder_point } },
                        { stock: { lte: 5 } } // Absolute floor
                    ]
                },
                select: { id: true, name: true, stock: true }
            });

            console.log(`[ProcurementAgent] Found ${criticalProducts.length} products needing evaluation.`);

            const results = [];
            for (const product of criticalProducts) {
                try {
                    const result = await this.analyzeAndProcure(businessId, product.id, 'system-agent');
                    results.push({ productId: product.id, status: result.success ? 'processed' : 'skipped', reason: result.reason });
                } catch (e) {
                    console.error(`[ProcurementAgent] Failed to evaluate product ${product.id}:`, e);
                    results.push({ productId: product.id, status: 'error', error: e.message });
                }
            }

            return {
                success: true,
                evaluatedCount: criticalProducts.length,
                results
            };
        } catch (error) {
            console.error('[ProcurementAgent] Orchestration Error:', error);
            return { success: false, error: error.message };
        }
    }
};

