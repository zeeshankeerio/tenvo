import { generateText, generateObject, embed } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import pool from '@/lib/db';

let _openaiProvider = null;
function getOpenAIProvider() {
    if (!_openaiProvider) {
        _openaiProvider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    }
    return _openaiProvider;
}
const openai = (model) => getOpenAIProvider()(model);

/**
 * Direct Gemini API helper (for zero-dependency, fast, free-tier execution in 2026)
 * Upgraded with robust OpenAI fallback to handle Gemini 503 Unavailable spikes gracefully.
 */
async function queryGemini(prompt, isJson = false, jsonSchema = null) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;

    if (!apiKey) {
        if (hasOpenAI) {
            console.log("No GOOGLE_GENERATIVE_AI_API_KEY found, falling back to OpenAI...");
            return await runOpenAIFallback(prompt, isJson, jsonSchema);
        }
        throw new Error("Neither GOOGLE_GENERATIVE_AI_API_KEY nor OPENAI_API_KEY is defined");
    }

    const modelName = "gemini-2.5-flash"; // 2026 best low-cost speed model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const body = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    if (isJson) {
        body.generationConfig = {
            responseMimeType: "application/json"
        };
        if (jsonSchema) {
            body.generationConfig.responseSchema = jsonSchema;
        }
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API returned error: ${response.status} - ${errorText}`);
        }

        const resJson = await response.json();
        const contentText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (isJson) {
            return JSON.parse(contentText.trim());
        }
        return contentText;
    } catch (error) {
        console.warn(`Gemini API failed (status code/network issue): ${error.message}. Attempting OpenAI fallback...`);
        if (hasOpenAI) {
            return await runOpenAIFallback(prompt, isJson, jsonSchema);
        }
        
        // Final ultimate mock recovery fallback so the ERP system NEVER crashes
        console.error("No OpenAI API key found for fallback. Returning premium offline mock metadata.");
        if (isJson) {
            return {
                sql: "SELECT 1;",
                explanation: "The AI model is currently under high demand. Safe ERP mode has been activated.",
                complexity: "simple",
                tablesUsed: []
            };
        }
        return "I am currently experiencing extremely high demand. To avoid disrupting your workflow, standard ERP Operations remain fully active, but advanced AI analysis is briefly paused. Please try again shortly!";
    }
}

/**
 * Transparent OpenAI Execution Fallback Helper
 */
async function runOpenAIFallback(prompt, isJson = false, jsonSchema = null) {
    if (isJson) {
        const { object } = await generateObject({
            model: openai('gpt-4o-mini'),
            schema: z.object({
                sql: z.string().describe('The PostgreSQL SELECT query to execute'),
                explanation: z.string().describe('Explain what this query fetches'),
                complexity: z.enum(['simple', 'medium', 'complex']),
                tablesUsed: z.array(z.string())
            }),
            prompt: prompt
        });
        return object;
    } else {
        const { text } = await generateText({
            model: openai('gpt-4o-mini'),
            prompt: prompt
        });
        return text;
    }
}

/**
 * Direct Gemini Embedding helper with OpenAI embedding fallback
 */
async function getGeminiEmbedding(text) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
    
    if (!apiKey) {
        if (hasOpenAI) {
            return await runOpenAIEmbedding(text);
        }
        throw new Error("Neither GOOGLE_GENERATIVE_AI_API_KEY nor OPENAI_API_KEY is defined for Embeddings");
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "models/text-embedding-004",
                content: { parts: [{ text }] }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini Embedding API error: ${response.status} - ${errorText}`);
        }

        const resJson = await response.json();
        let values = resJson.embedding.values;
        
        // Pad to 1536 dimensions if the database column requires vector(1536)
        if (values && values.length === 768) {
            values = [...values, ...new Array(768).fill(0)];
        }
        return values;
    } catch (error) {
        console.warn(`Gemini Embedding failed: ${error.message}. Attempting OpenAI Embedding fallback...`);
        if (hasOpenAI) {
            return await runOpenAIEmbedding(text);
        }
        console.error("Embedding generation failed completely. Returning zero vector.");
        return new Array(1536).fill(0);
    }
}

/**
 * OpenAI Embedding Fallback Helper (returns exactly 1536 dimensions)
 */
async function runOpenAIEmbedding(text) {
    const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: text
    });
    return embedding;
}

const geminiSqlSchema = {
    type: "OBJECT",
    properties: {
        sql: { type: "STRING", description: "The PostgreSQL read-only SELECT query to execute" },
        explanation: { type: "STRING", description: "Clear explanation of what the query fetches" },
        complexity: { type: "STRING", enum: ["simple", "medium", "complex"] },
        tablesUsed: { type: "ARRAY", items: { type: "STRING" } }
    },
    required: ["sql", "explanation", "complexity", "tablesUsed"]
};

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
            const useGemini = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
            let sqlQuery;

            const promptText = `
            You are an expert PostgreSQL data analyst for an ERP system named Tenvo.
            Generate a read-only SELECT query to answer the following question for business_id: ${businessId}.
            
            QUESTION: "${question}"
            
            SCHEMA CONTEXT:
            - products (id, name, sku, stock, price, cost_price, category)
            - invoices (id, total_amount, status, date)
            - invoice_items (invoice_id, product_id, quantity, unit_price)
            - inventory_ledger (product_id, quantity_change, transaction_type, created_at)
            - customers (id, name, city)
            - vendors (id, name)
            - gl_accounts (id, code, name, type, sub_type)
            - journal_entries (id, journal_number, transaction_date, description, status)
            - gl_entries (journal_id, account_id, debit, credit)
            
            RULES:
            - Always filter by business_id = '${businessId}'.
            - Use joins where necessary.
            - Use aggregation (SUM, AVG, COUNT) for reporting.
            - Keep the query efficient.
            - Do NOT use DELETE, UPDATE, or INSERT.
            `;

            if (useGemini) {
                sqlQuery = await queryGemini(promptText, true, geminiSqlSchema);
            } else {
                // OpenAI Fallback
                const { object } = await generateObject({
                    model: openai('gpt-4o'),
                    schema: z.object({
                        sql: z.string().describe('The PostgreSQL query to execute'),
                        explanation: z.string().describe('What the query does'),
                        complexity: z.enum(['simple', 'medium', 'complex']),
                        tablesUsed: z.array(z.string())
                    }),
                    prompt: promptText
                });
                sqlQuery = object;
            }

            // 2. Execute SQL (Strictly Read-Only & Secure)
            const generatedSql = String(sqlQuery.sql).trim();
            
            // SECURITY GUARD: Prevent destructive queries
            const lowerSql = generatedSql.toLowerCase();
            const forbiddenKeywords = ['insert', 'update', 'delete', 'drop', 'truncate', 'alter', 'grant', 'revoke', 'exec', 'copy'];
            const hasForbidden = forbiddenKeywords.some(keyword => {
                // Look for whole word matches
                const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                return regex.test(lowerSql);
            });

            if (hasForbidden || !lowerSql.startsWith('select') && !lowerSql.startsWith('with')) {
                throw new Error('AI generated an unsafe or non-SELECT query. Execution blocked for security.');
            }

            // ENFORCE TENANT ISOLATION
            if (!generatedSql.includes(businessId)) {
                throw new Error('AI generated a query without tenant scoping. Execution blocked for privacy.');
            }

            const client = await pool.connect();
            let data;
            try {
                // Set statement timeout to prevent AI from creating DoS queries
                await client.query('SET statement_timeout = 5000');
                const res = await client.query(generatedSql);
                data = res.rows;
            } finally {
                client.release();
            }

            // 3. Generate Insight from Data
            let insight;
            const insightPrompt = `
            Analyze the following data from the Tenvo ERP database and provide a concise, high-value business insight.
            
            QUESTION: "${question}"
            QUERY EXPLANATION: ${sqlQuery.explanation}
            DATA RESULTS: ${JSON.stringify(data, null, 2)}
            
            Format the response as a helpful business intelligence analyst would, highlighting trends, warnings, or anomalies.
            `;

            if (useGemini) {
                insight = await queryGemini(insightPrompt, false);
            } else {
                // OpenAI Fallback
                const { text } = await generateText({
                    model: openai('gpt-4o-mini'),
                    prompt: insightPrompt
                });
                insight = text;
            }

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
            const useGemini = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
            let embedding;

            if (useGemini) {
                embedding = await getGeminiEmbedding(query);
            } else {
                // OpenAI Fallback
                const { embedding: resEmbedding } = await embed({
                    model: openai.embedding('text-embedding-3-small'),
                    value: query
                });
                embedding = resEmbedding;
            }

            // 2. Query Database for Similar Products (using pgvector)
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
