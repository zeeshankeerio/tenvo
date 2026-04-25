/**
 * Vitest Global Setup
 * 
 * Provides:
 * - Mock for database pool (prevents real DB calls in unit tests)
 * - Mock for BetterAuth
 * - Global test utilities
 */

import { vi } from 'vitest';

// ─── Mock Database Pool ─────────────────────────────────────────────────────
// Prevents tests from hitting the real database
const mockClient = {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: vi.fn(),
};

const mockPool = {
    connect: vi.fn().mockResolvedValue(mockClient),
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: vi.fn(),
};

vi.mock('@/lib/db', () => ({
    default: mockPool,
}));

// ─── Mock BetterAuth ────────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn().mockResolvedValue(null),
        },
    },
}));

vi.mock('@/lib/auth-client', () => ({
    authClient: {
        useSession: vi.fn().mockReturnValue({ data: null, isPending: false }),
    },
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    useSession: vi.fn().mockReturnValue({ data: null, isPending: false }),
}));

// ─── Mock next/headers ──────────────────────────────────────────────────────
vi.mock('next/headers', () => ({
    headers: vi.fn().mockResolvedValue(new Headers()),
    cookies: vi.fn().mockReturnValue({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
    }),
}));

// ─── Mock server-only ───────────────────────────────────────────────────────
vi.mock('server-only', () => ({}));

// ─── Global Test Utilities ──────────────────────────────────────────────────
// Available in all test files via globalThis

globalThis.__testUtils = {
    mockPool,
    mockClient,

    /**
     * Reset all mock function calls between tests
     */
    resetMocks() {
        mockClient.query.mockReset().mockResolvedValue({ rows: [], rowCount: 0 });
        mockClient.release.mockReset();
        mockPool.connect.mockReset().mockResolvedValue(mockClient);
        mockPool.query.mockReset().mockResolvedValue({ rows: [], rowCount: 0 });
    },

    /**
     * Mock a database query response
     * @param {Array|object} response - Rows to return
     */
    mockQueryResponse(response) {
        const rows = Array.isArray(response) ? response : [response];
        mockClient.query.mockResolvedValueOnce({ rows, rowCount: rows.length });
    },

    /**
     * Mock a database query error
     * @param {string} message - Error message
     */
    mockQueryError(message) {
        mockClient.query.mockRejectedValueOnce(new Error(message));
    },

    /**
     * Create a mock business user for testing
     */
    createMockUser(overrides = {}) {
        return {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            ...overrides,
        };
    },

    /**
     * Create a mock business for testing
     */
    createMockBusiness(overrides = {}) {
        return {
            id: 'test-business-id',
            name: 'Test Business',
            domain: 'retail',
            owner_id: 'test-user-id',
            currency: 'PKR',
            ...overrides,
        };
    },
};
