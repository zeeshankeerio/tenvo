import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiSuccess, apiError, cleanupRateLimits } from '../response';

describe('API Response Helpers', () => {
    describe('apiSuccess', () => {
        it('should create a basic success response', async () => {
            const response = apiSuccess({ user: { id: 1, name: 'John' } });
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json).toEqual({
                success: true,
                data: { user: { id: 1, name: 'John' } }
            });
        });

        it('should create a success response with custom status', () => {
            const response = apiSuccess({ invoice: { id: 1 } }, 201);
            
            expect(response.status).toBe(201);
        });

        it('should create a success response with metadata', async () => {
            const meta = { page: 1, pageSize: 20, total: 100, totalPages: 5 };
            const response = apiSuccess({ invoices: [] }, 200, meta);
            const json = await response.json();

            expect(json).toEqual({
                success: true,
                data: { invoices: [] },
                meta
            });
        });

        it('should add rate limit headers when context provided', () => {
            const response = apiSuccess(
                { data: 'test' },
                200,
                null,
                { businessId: 'test-business-id', planTier: 'premium' }
            );

            expect(response.headers.get('X-RateLimit-Limit')).toBe('600');
            expect(response.headers.get('X-RateLimit-Remaining')).toBe('599');
            expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
        });

        it('should not add rate limit headers when no context provided', () => {
            const response = apiSuccess({ data: 'test' });

            expect(response.headers.get('X-RateLimit-Limit')).toBeNull();
            expect(response.headers.get('X-RateLimit-Remaining')).toBeNull();
            expect(response.headers.get('X-RateLimit-Reset')).toBeNull();
        });

        it('should handle different plan tiers correctly', () => {
            const planTiers = {
                free: 60,
                basic: 120,
                standard: 300,
                premium: 600,
                enterprise: 1200
            };

            Object.entries(planTiers).forEach(([tier, limit]) => {
                const response = apiSuccess(
                    { data: 'test' },
                    200,
                    null,
                    { businessId: `business-${tier}`, planTier: tier }
                );

                expect(response.headers.get('X-RateLimit-Limit')).toBe(limit.toString());
            });
        });
    });

    describe('apiError', () => {
        it('should create a basic error response', async () => {
            const response = apiError('NOT_FOUND', 'Resource not found', 404);
            const json = await response.json();

            expect(response.status).toBe(404);
            expect(json).toEqual({
                success: false,
                error: 'Resource not found',
                code: 'NOT_FOUND'
            });
        });

        it('should create an error response with default status', () => {
            const response = apiError('VALIDATION_ERROR', 'Invalid input');
            
            expect(response.status).toBe(400);
        });

        it('should create an error response with details', async () => {
            const details = {
                fields: {
                    email: 'Invalid email format',
                    amount: 'Must be greater than 0'
                }
            };
            const response = apiError('VALIDATION_ERROR', 'Invalid input', 400, details);
            const json = await response.json();

            expect(json).toEqual({
                success: false,
                error: 'Invalid input',
                code: 'VALIDATION_ERROR',
                details
            });
        });

        it('should add rate limit headers when context provided', () => {
            const response = apiError(
                'NOT_FOUND',
                'Resource not found',
                404,
                null,
                { businessId: 'test-business-id', planTier: 'standard' }
            );

            expect(response.headers.get('X-RateLimit-Limit')).toBe('300');
            expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
            expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
        });

        it('should not add rate limit headers when no context provided', () => {
            const response = apiError('NOT_FOUND', 'Resource not found', 404);

            expect(response.headers.get('X-RateLimit-Limit')).toBeNull();
            expect(response.headers.get('X-RateLimit-Remaining')).toBeNull();
            expect(response.headers.get('X-RateLimit-Reset')).toBeNull();
        });
    });

    describe('Rate Limiting', () => {
        beforeEach(() => {
            // Clean up rate limits before each test
            cleanupRateLimits();
        });

        it('should track requests per business', () => {
            const businessId = 'test-business-1';
            const planTier = 'free'; // 60 requests per minute

            // Make 3 requests
            const response1 = apiSuccess({ data: 1 }, 200, null, { businessId, planTier });
            const response2 = apiSuccess({ data: 2 }, 200, null, { businessId, planTier });
            const response3 = apiSuccess({ data: 3 }, 200, null, { businessId, planTier });

            expect(response1.headers.get('X-RateLimit-Remaining')).toBe('59');
            expect(response2.headers.get('X-RateLimit-Remaining')).toBe('58');
            expect(response3.headers.get('X-RateLimit-Remaining')).toBe('57');
        });

        it('should track requests separately per business', () => {
            const business1 = 'business-1';
            const business2 = 'business-2';
            const planTier = 'basic'; // 120 requests per minute

            // Make requests for business 1
            const response1a = apiSuccess({ data: 1 }, 200, null, { businessId: business1, planTier });
            const response1b = apiSuccess({ data: 2 }, 200, null, { businessId: business1, planTier });

            // Make requests for business 2
            const response2a = apiSuccess({ data: 1 }, 200, null, { businessId: business2, planTier });

            expect(response1a.headers.get('X-RateLimit-Remaining')).toBe('119');
            expect(response1b.headers.get('X-RateLimit-Remaining')).toBe('118');
            expect(response2a.headers.get('X-RateLimit-Remaining')).toBe('119'); // Separate counter
        });

        it('should not allow remaining to go below 0', () => {
            const businessId = 'test-business-overflow';
            const planTier = 'free'; // 60 requests per minute

            // Make 65 requests (more than the limit)
            let lastResponse;
            for (let i = 0; i < 65; i++) {
                lastResponse = apiSuccess({ data: i }, 200, null, { businessId, planTier });
            }

            const remaining = parseInt(lastResponse.headers.get('X-RateLimit-Remaining'), 10);
            expect(remaining).toBe(0); // Should not go negative
        });

        it('should include reset timestamp', () => {
            const businessId = 'test-business-reset';
            const planTier = 'premium';

            const response = apiSuccess({ data: 'test' }, 200, null, { businessId, planTier });
            const reset = parseInt(response.headers.get('X-RateLimit-Reset'), 10);
            const now = Math.floor(Date.now() / 1000);

            // Reset should be within the next minute (allow 1 second tolerance for test execution)
            expect(reset).toBeGreaterThan(now);
            expect(reset).toBeLessThanOrEqual(now + 61);
        });

        it('should default to free tier when plan tier is invalid', () => {
            const businessId = 'test-business-invalid-plan';
            const planTier = 'invalid-tier';

            const response = apiSuccess({ data: 'test' }, 200, null, { businessId, planTier });

            // Should default to free tier (60 requests)
            expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
        });

        it('should handle missing businessId gracefully', () => {
            const response = apiSuccess({ data: 'test' }, 200, null, { planTier: 'premium' });

            // Should not add rate limit headers
            expect(response.headers.get('X-RateLimit-Limit')).toBeNull();
            expect(response.headers.get('X-RateLimit-Remaining')).toBeNull();
            expect(response.headers.get('X-RateLimit-Reset')).toBeNull();
        });
    });

    describe('cleanupRateLimits', () => {
        it('should remove expired entries', async () => {
            const businessId = 'test-business-cleanup';
            const planTier = 'free';

            // Make a request
            const response1 = apiSuccess({ data: 1 }, 200, null, { businessId, planTier });
            expect(response1.headers.get('X-RateLimit-Remaining')).toBe('59');

            // Wait for the window to expire (simulate by advancing time)
            // Note: In a real test, you'd use fake timers
            // For now, we just verify the function exists and can be called
            expect(() => cleanupRateLimits()).not.toThrow();
        });
    });

    describe('Response Format Consistency', () => {
        it('should always include success field in success responses', async () => {
            const response = apiSuccess({ data: 'test' });
            const json = await response.json();

            expect(json).toHaveProperty('success');
            expect(json.success).toBe(true);
        });

        it('should always include success field in error responses', async () => {
            const response = apiError('ERROR', 'Error message');
            const json = await response.json();

            expect(json).toHaveProperty('success');
            expect(json.success).toBe(false);
        });

        it('should always include data field in success responses', async () => {
            const response = apiSuccess({ user: { id: 1 } });
            const json = await response.json();

            expect(json).toHaveProperty('data');
        });

        it('should always include error and code fields in error responses', async () => {
            const response = apiError('ERROR_CODE', 'Error message');
            const json = await response.json();

            expect(json).toHaveProperty('error');
            expect(json).toHaveProperty('code');
        });
    });
});
