import { generateText, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { db } from '@/lib/db';

/**
 * AI Content Generation Service
 * 2026 Standard: Automated product catalog enrichment and marketing copy.
 */
export const AIGenService = {

    /**
     * Generate a professional product description based on name and category
     */
    async generateProductDescription(name, category, features = []) {
        try {
            const { text } = await generateText({
                model: openai('gpt-4o-mini'),
                prompt: `
                You are an expert product marketing specialist for an ERP system.
                Generate a professional, SEO-optimized product description for the following item:
                
                NAME: ${name}
                CATEGORY: ${category}
                FEATURES: ${features.join(', ')}
                
                The description should be concise (2-3 sentences), professional, and highlight the value proposition.
                `
            });

            return text;
        } catch (error) {
            console.error('AI Description Generation Error:', error);
            return null;
        }
    },

    /**
     * Generate a marketing slogan or short copy for a promotion
     */
    async generatePromoCopy(businessName, productNames, strategy) {
        try {
            const { object } = await generateObject({
                model: openai('gpt-4o-mini'),
                schema: z.object({
                    headline: z.string(),
                    body: z.string(),
                    callToAction: z.string()
                }),
                prompt: `
                Create a compelling marketing message for a ${strategy} promotion.
                BUSINESS: ${businessName}
                PRODUCTS: ${productNames.join(', ')}
                
                The copy should be energetic and encourage immediate action.
                `
            });

            return object;
        } catch (error) {
            console.error('AI Promo Generation Error:', error);
            return null;
        }
    }
};
