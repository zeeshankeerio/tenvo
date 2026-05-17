import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { db } from '@/lib/db';

/**
 * AI Anomaly Detection Service
 * 2026 Standard: Real-time fraud and error detection in ERP data.
 */
export const AnomalyDetectionService = {

    /**
     * Scan recent stock movements for anomalies
     */
    async detectStockAnomalies(businessId) {
        try {
            // Fetch last 100 stock movements
            const movements = await db.stock_movements.findMany({
                where: { business_id: businessId },
                take: 100,
                orderBy: { created_at: 'desc' },
                include: { products: true }
            });

            if (movements.length < 10) return { success: true, anomalies: [], message: 'Insufficient data for analysis' };

            const { object: analysis } = await generateObject({
                model: openai('gpt-4o'),
                schema: z.object({
                    anomalies: z.array(z.object({
                        movementId: z.string(),
                        severity: z.enum(['low', 'medium', 'high']),
                        reason: z.string(),
                        recommendation: z.string()
                    })),
                    summary: z.string()
                }),
                prompt: `
                Analyze the following stock movements for an ERP system and identify potential anomalies such as:
                1. Unusual large quantity changes.
                2. Frequent "adjustments" that might indicate theft or leakage.
                3. Movements during non-business hours (if timestamps look odd).
                4. Negative stock results.
                
                DATA: ${JSON.stringify(movements.map(m => ({
                    id: m.id,
                    product: m.products.name,
                    qty: m.quantity_change,
                    type: m.movement_type,
                    reason: m.reason,
                    time: m.created_at
                })), null, 2)}
                `
            });

            return {
                success: true,
                ...analysis
            };
        } catch (error) {
            console.error('Anomaly Detection Error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Scan financial entries for potential fraud or errors
     */
    async detectFinancialAnomalies(businessId) {
        try {
            const entries = await db.gl_entries.findMany({
                where: { gl_accounts: { business_id: businessId } },
                take: 100,
                orderBy: { created_at: 'desc' },
                include: { gl_accounts: true }
            });

            if (entries.length < 5) return { success: true, anomalies: [] };

            const { object: analysis } = await generateObject({
                model: openai('gpt-4o'),
                schema: z.object({
                    anomalies: z.array(z.object({
                        entryId: z.string(),
                        type: z.string(),
                        riskScore: z.number().min(0).max(1),
                        description: z.string()
                    }))
                }),
                prompt: `
                You are a forensic accountant. Scan these GL entries for:
                1. Round-number transactions (often indicating estimates or fraud).
                2. Unbalanced-looking offsets.
                3. High-value expenses in unusual categories.
                
                DATA: ${JSON.stringify(entries.map(e => ({
                    id: e.id,
                    account: e.gl_accounts.name,
                    debit: e.debit,
                    credit: e.credit,
                    date: e.transaction_date
                })), null, 2)}
                `
            });

            return {
                success: true,
                ...analysis
            };
        } catch (error) {
            console.error('Financial Anomaly Error:', error);
            return { success: false, error: error.message };
        }
    }
};
