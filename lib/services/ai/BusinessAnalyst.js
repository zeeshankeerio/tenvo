import { generateText, generateObject, embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import pool from '@/lib/db';

/**
 * Business Analyst Agent (Text-to-SQL & Semantic Search)
 * 2026 Standard: Natural language interface to ERP data.
 */
export const BusinessAnalyst = {

    /**
     * Answer a business question using the database
     */
    async ask(businessId, question) {
        try {
            // 1. Generate SQL from Question
            const { object: sqlQuery } = await generateObject({
                model: openai('gpt-4o'),
                schema: z.object({
                    sql: z.string().describe('The PostgreSQL query to execute'),
                    explanation: z.string().describe('What the query does'),
                    complexity: z.enum(['simple', 'medium', 'complex']),
                    tablesUsed: z.array(z.string())
                }),
                prompt: `
                You are an expert PostgreSQL data analyst for an ERP system.
                Generate a read-only SELECT query to answer the following question for business_id: ${businessId}.
                
                QUESTION: "${question}"
                
                SCHEMA CONTEXT:
                - products (id, name, sku, stock, price, cost_price, category)
                - invoices (id, total_amount, status, date)
                - invoice_items (invoice_id, product_id, quantity, unit_price)
                - inventory_ledger (product_id, quantity_change, transaction_type, created_at)
                - customers (id, name, city)
                - vendors (id, name)
                
                RULES:
                - Always filter by business_id = '${businessId}'.
                - Use joins where necessary.
                - Use aggregation (SUM, AVG, COUNT) for reporting.
                - Keep the query efficient.
                - Do NOT use DELETE, UPDATE, or INSERT.
                `
            });

            // 2. Execute SQL (Strictly Read-Only)
            const client = await pool.connect();
            let data;
            try {
                const res = await client.query(sqlQuery.sql);
                data = res.rows;
            } finally {
                client.release();
            }

            // 3. Generate Insight from Data
            const { text: insight } = await generateText({
                model: openai('gpt-4o-mini'),
                prompt: `
                Analyze the following data from the ERP system and provide a concise business insight.
                
                QUESTION: "${question}"
                QUERY EXPLANATION: ${sqlQuery.explanation}
                DATA: ${JSON.stringify(data, null, 2)}
                
                Format the response as a helpful business analyst would.
                `
            });

            return {
                success: true,
                question,
                sql: sqlQuery.sql,
                data,
                insight
            };

        } catch (error) {
            console.error('Business Analyst Error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Semantic Search: Find products based on natural language description
     */
    async semanticSearch(businessId, query, limit = 5) {
        try {
            // 1. Generate Embedding for Query
            const { embedding } = await embed({
                model: openai.embedding('text-embedding-3-small'),
                value: query
            });

            // 2. Query Database for Similar Products (using pgvector)
            // Note: Requires 'vector' extension and 'embedding' column on products
            const { rows: results } = await pool.query(`
                SELECT id, name, sku, category, stock, price,
                       1 - (embedding <=> $1::vector) as similarity
                FROM products
                WHERE business_id = $2 AND is_deleted = false
                ORDER BY embedding <=> $1::vector
                LIMIT $3
            `, [JSON.stringify(embedding), businessId, limit]);

            return {
                success: true,
                query,
                results
            };
        } catch (error) {
            console.error('Semantic Search Error:', error);
            return { success: false, error: error.message };
        }
    }
};

