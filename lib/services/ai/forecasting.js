/**
 * AI Forecasting Service
 * Uses historical sales data to predict future demand using 2026 best practices.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveSafeDomainKey(domainKey) {
    const key = String(domainKey || '').trim();
    if (!key || UUID_RE.test(key)) return 'retail-shop';
    return key;
}

function buildCulturalContext(countryIso = 'PK') {
    const iso = String(countryIso || 'PK').toUpperCase();
    if (iso === 'PK') {
        return 'Pakistani cultural context: Ramadan, Eids, wedding season (winter), and harvest/construction cycles where relevant.';
    }
    if (iso === 'AE' || iso === 'SA') {
        return 'Gulf market context: Ramadan, national holidays, tourism peaks, and regional buying seasons.';
    }
    if (iso === 'US' || iso === 'CA' || iso === 'GB') {
        return 'North American / Western retail context: major holidays (Black Friday, Christmas, back-to-school) and regional seasonality.';
    }
    if (iso === 'IN') {
        return 'Indian market context: festival seasons (Diwali, Holi, wedding season) and monsoon-related demand shifts.';
    }
    return 'Regional holidays and seasonal buying patterns for the tenant market.';
}

export const AIOrderForecaster = {
    /**
     * Forecast demand for a specific product with domain + market awareness.
     * @param {string} domainKey - Business vertical (e.g. 'pharmacy'). UUIDs are treated as unknown and fall back to retail-shop.
     * @param {Object} product
     * @param {Array} salesHistory - array of objects { date, quantity }
     * @param {{ countryIso?: string; intelligence?: Record<string, unknown> }} [options]
     */
    async forecastDemand(domainKey, product, salesHistory, options = {}) {
        try {
            let ai, openaiModule, zod, domainKnowledgeSvc;
            try {
                ai = await import('ai');
                openaiModule = await import('@ai-sdk/openai');
                zod = await import('zod');
                domainKnowledgeSvc = await import('../../domainKnowledge.js');
            } catch {
                console.warn('AI SDK or Domain modules not found. Falling back to WMA forecasting.');
                return this.fallbackForecast(product, salesHistory);
            }

            const { generateObject } = ai;
            const { openai } = openaiModule;
            const { z } = zod;

            const countryIso = options.countryIso || 'PK';
            const safeDomainKey = resolveSafeDomainKey(domainKey);
            const domainInfo = domainKnowledgeSvc.getDomainKnowledge(safeDomainKey, { countryIso });
            const intel = options.intelligence || domainInfo.intelligence || {};

            if (!generateObject || !openai || !z) {
                return this.fallbackForecast(product, salesHistory);
            }

            const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const culturalContext = buildCulturalContext(countryIso);
            const fashionNote =
                countryIso === 'PK' &&
                ['garments', 'boutique-fashion', 'textile-wholesale', 'textile-mill'].includes(safeDomainKey)
                    ? 'Fashion: factor Eid collections, wedding season (Nov-Jan), and summer launches; demand often spikes 6-8 weeks before festivals.'
                    : '';

            const { object } = await generateObject({
                model: openai('gpt-4o-mini'),
                schema: z.object({
                    forecastedQuantity: z.number().describe('Predicted quantity needed for the next 30 days'),
                    confidenceScore: z.number().min(0).max(1),
                    reasoning: z.string().describe('Explanation for the forecast, including seasonal factors'),
                    riskFactors: z.array(z.string()).describe('Potential risks like expiry or price fluctuation'),
                    suggestedAction: z.string().describe('Immediate business action recommended'),
                }),
                prompt: `
            Analyze sales history for product: ${product.name} in the ${domainInfo.name || safeDomainKey} domain.
            
            BUSINESS CONTEXT:
            - Market: ${countryIso}
            - Domain Intelligence: Seasonality is ${intel.seasonality || domainInfo.intelligence?.seasonality || 'medium'}.
            - Peak Months: ${(intel.peakMonths || domainInfo.intelligence?.peakMonths || []).join(', ') || 'N/A'}.
            - Lead time (days): ${intel.leadTime ?? domainInfo.intelligence?.leadTime ?? 7}.
            - Today's Date: ${currentDate}.
            - ${culturalContext}
            ${fashionNote ? `- ${fashionNote}` : ''}

            DATA:
            - Current Stock: ${product.stock}
            - Historical Sales (Last 6 months):
            ${JSON.stringify(salesHistory, null, 2)}
            
            Based on the data AND the domain context, predict demand for the next 30 days.
            `,
            });

            return {
                productId: product.id,
                ...object,
            };
        } catch (error) {
            console.error('Forecasting error:', error);
            return this.fallbackForecast(product, salesHistory);
        }
    },

    /**
     * Fallback calculation using Weighted Moving Average
     */
    fallbackForecast(product, salesHistory) {
        const history = Array.isArray(salesHistory)
            ? salesHistory.map((h) => Number(h.quantity ?? h.qty ?? 0))
            : [];
        const weights = [0.05, 0.1, 0.15, 0.2, 0.25, 0.25];
        const padded = [...Array(Math.max(0, 6 - history.length)).fill(0), ...history.slice(-6)];
        const wma = padded.reduce((acc, val, i) => acc + val * weights[i], 0);

        return {
            productId: product.id,
            forecastedQuantity: Math.max(0, Math.ceil(wma)),
            confidenceScore: history.length >= 3 ? 0.45 : 0.25,
            reasoning: 'Weighted moving average from recent sales history.',
            riskFactors: history.length < 2 ? ['Limited sales history'] : [],
            suggestedAction: wma > Number(product.stock || 0) ? 'Review reorder point and safety stock.' : 'Stock level appears adequate.',
        };
    },
};
