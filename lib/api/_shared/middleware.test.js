import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from './middleware';
import { auth } from '@/lib/auth';

describe('withApiAuth middleware', () => {
    const mockHandler = vi.fn();
    const testUtils = globalThis.__testUtils;

    beforeEach(() => {
        testUtils.resetMocks();
        mockHandler.mockReset();
        vi.clearAllMocks();
    });

    describe('Authentication', () => {
        it('should return 401 when no session exists', async () => {
            // Mock no session
            auth.api.getSession.mockResolvedValueOnce(null);

            const request = new NextRequest('http://localhost:3000/api/test?business_id=test-business-id');
            const wrappedHandler = withApiAuth(mockHandler);
            const response = await wrappedHandler(request);

            expect(response.status).toBe(401);
            const body = await response.json();
            expect(body.success).toBe(false);
            expect(body.code).toBe('UNAUTHENTICATED');
            expect(mockHandler).not.toHaveBeenCalled();
        });

        it('should return 401 when session lookup fails', async () => {
            // Mock session lookup error
            auth.api.getSession.mockRejectedValueOnce(new Error('Session lookup failed'));

            const request = new NextRequest('http://localhost:3000/api/test?business_id=test-business-id');
            const wrappedHandler = withApiAuth(mockHandler);
            const response = await wrappedHandler(request);

            expect(response.status).toBe(401);
            const body = await response.json();
            expect(body.success).toBe(false);
            expect(body.code).toBe('UNAUTHENTICATED');
            expect(mockHandler).not.toHaveBeenCalled();
        });
    });

    describe('Business ID Extraction', () => {
        it('should extract business_id from query params for GET requests', async () => {
            const mockSession = {
                user: testUtils.createMockUser(),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            // Mock business membership
            testUtils.mockQueryResponse({ role: 'owner', status: 'active' });
            // Mock plan tier
            testUtils.mockQueryResponse({ plan_tier: 'business', plan_expires_at: null });

            mockHandler.mockResolvedValueOnce(NextResponse.json({ success: true }));

            const request = new NextRequest('http://localhost:3000/api/test?business_id=test-business-id');
            const wrappedHandler = withApiAuth(mockHandler);
            await wrappedHandler(request);

            expect(mockHandler).toHaveBeenCalledWith(
                request,
                expect.objectContaining({
                    session: mockSession,
                    businessId: 'test-business-id',
                    role: 'owner',
                    planTier: 'business',
                })
            );
        });

        it('should extract business_id from request body for POST requests', async () => {
            const mockSession = {
                user: testUtils.createMockUser(),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            // Mock business membership
            testUtils.mockQueryResponse({ role: 'manager', status: 'active' });
            // Mock plan tier
            testUtils.mockQueryResponse({ plan_tier: 'starter', plan_expires_at: null });

            mockHandler.mockResolvedValueOnce(NextResponse.json({ success: true }));

            const request = new NextRequest('http://localhost:3000/api/test', {
                method: 'POST',
                body: JSON.stringify({ business_id: 'test-business-id', data: 'test' }),
            });
            const wrappedHandler = withApiAuth(mockHandler);
            await wrappedHandler(request);

            expect(mockHandler).toHaveBeenCalledWith(
                request,
                expect.objectContaining({
                    session: mockSession,
                    businessId: 'test-business-id',
                    role: 'manager',
                    planTier: 'starter',
                })
            );
        });

        it('should return 400 when business_id is missing', async () => {
            const mockSession = {
                user: testUtils.createMockUser(),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            const request = new NextRequest('http://localhost:3000/api/test');
            const wrappedHandler = withApiAuth(mockHandler);
            const response = await wrappedHandler(request);

            expect(response.status).toBe(400);
            const body = await response.json();
            expect(body.success).toBe(false);
            expect(body.code).toBe('MISSING_BUSINESS_ID');
            expect(mockHandler).not.toHaveBeenCalled();
        });

        it('should support businessId (camelCase) as alternative to business_id', async () => {
            const mockSession = {
                user: testUtils.createMockUser(),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            // Mock business membership
            testUtils.mockQueryResponse({ role: 'owner', status: 'active' });
            // Mock plan tier
            testUtils.mockQueryResponse({ plan_tier: 'free', plan_expires_at: null });

            mockHandler.mockResolvedValueOnce(NextResponse.json({ success: true }));

            const request = new NextRequest('http://localhost:3000/api/test?businessId=test-business-id');
            const wrappedHandler = withApiAuth(mockHandler);
            await wrappedHandler(request);

            expect(mockHandler).toHaveBeenCalledWith(
                request,
                expect.objectContaining({
                    businessId: 'test-business-id',
                })
            );
        });
    });

    describe('Business Authorization', () => {
        it('should return 403 when user has no access to business', async () => {
            const mockSession = {
                user: testUtils.createMockUser(),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            // Mock no business membership
            testUtils.mockQueryResponse([]);
            // Mock not owner
            testUtils.mockQueryResponse([]);

            const request = new NextRequest('http://localhost:3000/api/test?business_id=test-business-id');
            const wrappedHandler = withApiAuth(mockHandler);
            const response = await wrappedHandler(request);

            expect(response.status).toBe(403);
            const body = await response.json();
            expect(body.success).toBe(false);
            expect(body.code).toBe('BUSINESS_ACCESS_DENIED');
            expect(mockHandler).not.toHaveBeenCalled();
        });

        it('should auto-create business_users entry for business owner', async () => {
            const mockSession = {
                user: testUtils.createMockUser(),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            // Mock no business_users entry
            testUtils.mockQueryResponse([]);
            // Mock owner check succeeds
            testUtils.mockQueryResponse([{ id: 'test-business-id' }]);
            // Mock INSERT query
            testUtils.mockQueryResponse([]);
            // Mock plan tier
            testUtils.mockQueryResponse({ plan_tier: 'business', plan_expires_at: null });

            mockHandler.mockResolvedValueOnce(NextResponse.json({ success: true }));

            const request = new NextRequest('http://localhost:3000/api/test?business_id=test-business-id');
            const wrappedHandler = withApiAuth(mockHandler);
            await wrappedHandler(request);

            expect(mockHandler).toHaveBeenCalledWith(
                request,
                expect.objectContaining({
                    role: 'owner',
                })
            );
        });

        it('should extract role from business_users table', async () => {
            const mockSession = {
                user: testUtils.createMockUser(),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            // Mock business membership with viewer role
            testUtils.mockQueryResponse({ role: 'viewer', status: 'active' });
            // Mock plan tier
            testUtils.mockQueryResponse({ plan_tier: 'premium', plan_expires_at: null });

            mockHandler.mockResolvedValueOnce(NextResponse.json({ success: true }));

            const request = new NextRequest('http://localhost:3000/api/test?business_id=test-business-id');
            const wrappedHandler = withApiAuth(mockHandler);
            await wrappedHandler(request);

            expect(mockHandler).toHaveBeenCalledWith(
                request,
                expect.objectContaining({
                    role: 'viewer',
                })
            );
        });

        it('should deny access when user status is not active', async () => {
            const mockSession = {
                user: testUtils.createMockUser(),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            // Mock business membership with inactive status
            testUtils.mockQueryResponse({ role: 'manager', status: 'inactive' });
            // Mock not owner
            testUtils.mockQueryResponse([]);

            const request = new NextRequest('http://localhost:3000/api/test?business_id=test-business-id');
            const wrappedHandler = withApiAuth(mockHandler);
            const response = await wrappedHandler(request);

            expect(response.status).toBe(403);
            const body = await response.json();
            expect(body.code).toBe('BUSINESS_ACCESS_DENIED');
        });
    });

    describe('Plan Tier Extraction', () => {
        it('should extract plan tier from businesses table', async () => {
            const mockSession = {
                user: testUtils.createMockUser(),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            // Mock business membership
            testUtils.mockQueryResponse({ role: 'owner', status: 'active' });
            // Mock plan tier
            testUtils.mockQueryResponse({ plan_tier: 'enterprise', plan_expires_at: null });

            mockHandler.mockResolvedValueOnce(NextResponse.json({ success: true }));

            const request = new NextRequest('http://localhost:3000/api/test?business_id=test-business-id');
            const wrappedHandler = withApiAuth(mockHandler);
            await wrappedHandler(request);

            expect(mockHandler).toHaveBeenCalledWith(
                request,
                expect.objectContaining({
                    planTier: 'enterprise',
                })
            );
        });

        it('should downgrade expired plans to free', async () => {
            const mockSession = {
                user: testUtils.createMockUser(),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            // Mock business membership
            testUtils.mockQueryResponse({ role: 'owner', status: 'active' });
            // Mock expired plan
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            testUtils.mockQueryResponse({ 
                plan_tier: 'premium', 
                plan_expires_at: yesterday.toISOString() 
            });

            mockHandler.mockResolvedValueOnce(NextResponse.json({ success: true }));

            const request = new NextRequest('http://localhost:3000/api/test?business_id=test-business-id');
            const wrappedHandler = withApiAuth(mockHandler);
            await wrappedHandler(request);

            expect(mockHandler).toHaveBeenCalledWith(
                request,
                expect.objectContaining({
                    planTier: 'free',
                })
            );
        });

        it('should default to free plan when plan_tier is null', async () => {
            const mockSession = {
                user: testUtils.createMockUser(),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            // Mock business membership
            testUtils.mockQueryResponse({ role: 'owner', status: 'active' });
            // Mock null plan tier
            testUtils.mockQueryResponse({ plan_tier: null, plan_expires_at: null });

            mockHandler.mockResolvedValueOnce(NextResponse.json({ success: true }));

            const request = new NextRequest('http://localhost:3000/api/test?business_id=test-business-id');
            const wrappedHandler = withApiAuth(mockHandler);
            await wrappedHandler(request);

            expect(mockHandler).toHaveBeenCalledWith(
                request,
                expect.objectContaining({
                    planTier: 'free',
                })
            );
        });
    });

    describe('Platform Admin Bypass', () => {
        it('should grant enterprise tier to platform admins', async () => {
            const mockSession = {
                user: testUtils.createMockUser({ role: 'admin' }),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            mockHandler.mockResolvedValueOnce(NextResponse.json({ success: true }));

            const request = new NextRequest('http://localhost:3000/api/test?business_id=test-business-id');
            const wrappedHandler = withApiAuth(mockHandler);
            await wrappedHandler(request);

            expect(mockHandler).toHaveBeenCalledWith(
                request,
                expect.objectContaining({
                    role: 'owner',
                    planTier: 'enterprise',
                })
            );
        });
    });

    describe('Error Handling', () => {
        it('should return 500 on unexpected errors', async () => {
            const mockSession = {
                user: testUtils.createMockUser(),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            // Mock database error
            testUtils.mockQueryError('Database connection failed');

            const request = new NextRequest('http://localhost:3000/api/test?business_id=test-business-id');
            const wrappedHandler = withApiAuth(mockHandler);
            const response = await wrappedHandler(request);

            expect(response.status).toBe(500);
            const body = await response.json();
            expect(body.success).toBe(false);
            expect(body.code).toBe('INTERNAL_ERROR');
            expect(mockHandler).not.toHaveBeenCalled();
        });
    });

    describe('Handler Invocation', () => {
        it('should pass request and context to handler', async () => {
            const mockSession = {
                user: testUtils.createMockUser(),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            // Mock business membership
            testUtils.mockQueryResponse({ role: 'manager', status: 'active' });
            // Mock plan tier
            testUtils.mockQueryResponse({ plan_tier: 'business', plan_expires_at: null });

            mockHandler.mockResolvedValueOnce(NextResponse.json({ success: true }));

            const request = new NextRequest('http://localhost:3000/api/test?business_id=test-business-id');
            const routeParams = { id: 'test-id' };
            const wrappedHandler = withApiAuth(mockHandler);
            await wrappedHandler(request, routeParams);

            expect(mockHandler).toHaveBeenCalledWith(
                request,
                expect.objectContaining({
                    session: mockSession,
                    businessId: 'test-business-id',
                    role: 'manager',
                    planTier: 'business',
                    routeParams,
                })
            );
        });

        it('should return handler response', async () => {
            const mockSession = {
                user: testUtils.createMockUser(),
            };
            auth.api.getSession.mockResolvedValueOnce(mockSession);

            // Mock business membership
            testUtils.mockQueryResponse({ role: 'owner', status: 'active' });
            // Mock plan tier
            testUtils.mockQueryResponse({ plan_tier: 'free', plan_expires_at: null });

            const expectedResponse = NextResponse.json({ data: 'test-data' });
            mockHandler.mockResolvedValueOnce(expectedResponse);

            const request = new NextRequest('http://localhost:3000/api/test?business_id=test-business-id');
            const wrappedHandler = withApiAuth(mockHandler);
            const response = await wrappedHandler(request);

            expect(response).toBe(expectedResponse);
        });
    });
});
