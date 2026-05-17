import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import pool from '@/lib/db';
import { isPlatformLevel, isPlatformOwner } from '@/lib/config/platform';

/**
 * Role-Based Access Control (RBAC) System
 * 
 * Architecture:
 * - Decorator pattern: wrap any server action with `withAuth()` or `withRole()`
 * - 10-role hierarchy: owner > admin > manager > warehouse_manager > accountant > cashier > salesperson > chef > waiter > viewer
 * - Module-level permissions for granular control
 * - Platform owner (by email) and platform admin (user.role === 'admin') bypass everything
 */


// --- Role Hierarchy (synced with lib/rbac/permissions.js) -------------------
const ROLE_HIERARCHY = {
    viewer: 0,
    waiter: 1,
    chef: 2,
    salesperson: 3,
    cashier: 4,
    accountant: 5,
    warehouse_manager: 6,
    manager: 7,
    admin: 8,
    owner: 9,
};

// --- Module Permissions Matrix ----------------------------------------------
// Defines which roles can perform which operations on which modules
// All 10 roles: owner, admin, manager, warehouse_manager, accountant, cashier, salesperson, chef, waiter, viewer
const PERMISSIONS = {
    inventory: {
        read: ['viewer', 'waiter', 'salesperson', 'cashier', 'accountant', 'warehouse_manager', 'manager', 'admin', 'owner'],
        write: ['salesperson', 'warehouse_manager', 'manager', 'admin', 'owner'],
        delete: ['manager', 'admin', 'owner'],
        admin: ['admin', 'owner'],
    },
    invoices: {
        read: ['viewer', 'salesperson', 'cashier', 'accountant', 'manager', 'admin', 'owner'],
        write: ['salesperson', 'cashier', 'manager', 'admin', 'owner'],
        delete: ['manager', 'admin', 'owner'],
        admin: ['admin', 'owner'],
    },
    customers: {
        read: ['viewer', 'salesperson', 'cashier', 'accountant', 'manager', 'admin', 'owner'],
        write: ['salesperson', 'cashier', 'manager', 'admin', 'owner'],
        delete: ['manager', 'admin', 'owner'],
        admin: ['admin', 'owner'],
    },
    vendors: {
        read: ['accountant', 'warehouse_manager', 'manager', 'admin', 'owner'],
        write: ['accountant', 'manager', 'admin', 'owner'],
        delete: ['admin', 'owner'],
        admin: ['admin', 'owner'],
    },
    accounting: {
        read: ['accountant', 'manager', 'admin', 'owner'],
        write: ['accountant', 'admin', 'owner'],
        delete: ['owner'],
        admin: ['owner'],
    },
    manufacturing: {
        read: ['viewer', 'warehouse_manager', 'manager', 'admin', 'owner'],
        write: ['warehouse_manager', 'manager', 'admin', 'owner'],
        delete: ['admin', 'owner'],
        admin: ['admin', 'owner'],
    },
    purchases: {
        read: ['accountant', 'warehouse_manager', 'manager', 'admin', 'owner'],
        write: ['accountant', 'manager', 'admin', 'owner'],
        delete: ['admin', 'owner'],
        admin: ['admin', 'owner'],
    },
    reports: {
        read: ['accountant', 'manager', 'admin', 'owner'],
        write: ['admin', 'owner'],
        delete: ['owner'],
        admin: ['owner'],
    },
    business: {
        read: ['viewer', 'waiter', 'chef', 'salesperson', 'cashier', 'accountant', 'warehouse_manager', 'manager', 'admin', 'owner'],
        write: ['admin', 'owner'],
        delete: ['owner'],
        admin: ['owner'],
    },
    ai: {
        read: ['manager', 'admin', 'owner'],
        write: ['admin', 'owner'],
        delete: ['owner'],
        admin: ['owner'],
    },
    expenses: {
        read: ['accountant', 'manager', 'admin', 'owner'],
        write: ['accountant', 'manager', 'admin', 'owner'],
        delete: ['admin', 'owner'],
        admin: ['owner'],
    },
    pos: {
        read: ['cashier', 'salesperson', 'manager', 'admin', 'owner'],
        write: ['cashier', 'salesperson', 'manager', 'admin', 'owner'],
        delete: ['manager', 'admin', 'owner'],
        admin: ['admin', 'owner'],
    },
    credit_notes: {
        read: ['accountant', 'manager', 'admin', 'owner'],
        write: ['accountant', 'manager', 'admin', 'owner'],
        delete: ['admin', 'owner'],
        admin: ['owner'],
    },
    fiscal_periods: {
        read: ['accountant', 'manager', 'admin', 'owner'],
        write: ['accountant', 'admin', 'owner'],
        delete: ['owner'],
        admin: ['owner'],
    },
    exchange_rates: {
        read: ['accountant', 'manager', 'admin', 'owner'],
        write: ['accountant', 'admin', 'owner'],
        delete: ['owner'],
        admin: ['owner'],
    },
    promotions: {
        read: ['salesperson', 'cashier', 'manager', 'admin', 'owner'],
        write: ['manager', 'admin', 'owner'],
        delete: ['admin', 'owner'],
        admin: ['admin', 'owner'],
    },
    workflows: {
        read: ['manager', 'admin', 'owner'],
        write: ['admin', 'owner'],
        delete: ['owner'],
        admin: ['owner'],
    },
    hr: {
        read: ['manager', 'admin', 'owner'],
        write: ['admin', 'owner'],
        delete: ['owner'],
        admin: ['owner'],
    },
    restaurant: {
        read: ['waiter', 'chef', 'cashier', 'manager', 'admin', 'owner'],
        write: ['waiter', 'chef', 'cashier', 'manager', 'admin', 'owner'],
        delete: ['manager', 'admin', 'owner'],
        admin: ['admin', 'owner'],
    },
    warehouses: {
        read: ['warehouse_manager', 'manager', 'admin', 'owner'],
        write: ['warehouse_manager', 'admin', 'owner'],
        delete: ['admin', 'owner'],
        admin: ['admin', 'owner'],
    },
};

// --- Session Resolution -----------------------------------------------------

/**
 * Get the current authenticated user's session from BetterAuth
 * Works in Server Components and Server Actions
 * 
 * @returns {Promise<{user: object, session: object} | null>}
 */
export async function getServerSession() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });
        return session;
    } catch {
        return null;
    }
}

/**
 * Get the user's role for a specific business
 * 
 * @param {string} userId
 * @param {string} businessId
 * @returns {Promise<string|null>} Role name or null if no access
 */
async function getUserBusinessRole(userId, businessId) {
    if (!userId || !businessId) return null;

    const client = await pool.connect();
    try {
        const res = await client.query(
            `SELECT role FROM business_users 
       WHERE user_id = $1 AND business_id = $2 AND status = 'active'`,
            [userId, businessId]
        );
        return res.rows.length > 0 ? res.rows[0].role : null;
    } finally {
        client.release();
    }
}

// --- Platform Admin Detection -----------------------------------------------

/**
 * Check if a user is a Platform Admin or Platform Owner.
 * Platform-level users bypass all business-level RBAC checks.
 * Covers both:
 *   1. Hardcoded platform owner email (zeeshan.keerio@mindscapeanalytics.com)
 *   2. BetterAuth admin-role users (user.role === 'admin')
 * 
 * @param {object} user - BetterAuth user object
 * @returns {boolean}
 */
function isPlatformAdmin(user) {
    return isPlatformLevel(user);
}

// --- Auth Context Builder ---------------------------------------------------

/**
 * Build an auth context object for use within server actions
 * Contains the authenticated user, their role, and helper methods
 * 
 * Platform admins (user.role === 'admin') automatically get 'owner' level  
 * access to ALL businesses, bypassing normal RBAC checks.
 * 
 * @param {string} businessId - The business ID to check access for
 * @returns {Promise<object>} Auth context
 */
async function buildAuthContext(businessId) {
    const session = await getServerSession();

    if (!session?.user) {
        return { authenticated: false, error: 'Not authenticated' };
    }

    const platformAdmin = isPlatformAdmin(session.user);

    // Platform admins bypass business-level RBAC -- they are treated as 'owner' everywhere
    let role;
    if (platformAdmin) {
        role = 'owner';
    } else {
        role = businessId ? await getUserBusinessRole(session.user.id, businessId) : null;
    }

    if (businessId && !role && !platformAdmin) {
        return {
            authenticated: true,
            authorized: false,
            error: 'No access to this business',
            user: session.user,
        };
    }

    return {
        authenticated: true,
        authorized: true,
        user: session.user,
        userId: session.user.id,
        role: role || 'viewer',
        roleLevel: ROLE_HIERARCHY[role] || 0,
        businessId,
        isPlatformAdmin: platformAdmin,

        // Helper: check if user has at least the given role level
        hasMinRole(minRole) {
            if (this.isPlatformAdmin) return true;
            return (ROLE_HIERARCHY[this.role] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
        },

        // Helper: check if user can perform operation on module
        canPerform(module, operation) {
            if (this.isPlatformAdmin) return true;
            const modulePerms = PERMISSIONS[module];
            if (!modulePerms || !modulePerms[operation]) return false;
            return modulePerms[operation].includes(this.role);
        },
    };
}

// --- Decorator: withAuth ----------------------------------------------------

/**
 * Wrap a server action with basic authentication check.
 * The wrapped action receives an auth context as its first argument.
 * The businessId is extracted from the first argument of the original action.
 * 
 * @param {Function} action - Server action to wrap: (context, ...originalArgs) => result
 * @param {object} options - Configuration options
 * @param {string} options.businessIdArg - How to extract businessId: 'first' (default), 'second', or 'fromObject'
 * @param {string} options.businessIdKey - Key name when businessIdArg is 'fromObject'
 * @returns {Function} Wrapped server action
 */
export function withAuth(action, options = {}) {
    const { businessIdArg = 'first', businessIdKey = 'business_id' } = options;

    return async function (...args) {
        // Extract businessId from arguments
        let businessId;
        if (businessIdArg === 'first') {
            businessId = args[0];
        } else if (businessIdArg === 'second') {
            businessId = args[1];
        } else if (businessIdArg === 'fromObject') {
            businessId = args[0]?.[businessIdKey] || args[0]?.businessId;
        }

        const context = await buildAuthContext(businessId);

        if (!context.authenticated) {
            return { success: false, error: 'Authentication required. Please log in.' };
        }

        if (businessId && !context.authorized) {
            return { success: false, error: 'You do not have access to this business.' };
        }

        try {
            return await action(context, ...args);
        } catch (error) {
            console.error(`[RBAC] Action error for user ${context.userId}:`, error.message);
            return {
                success: false,
                error: error.message || 'An unexpected error occurred',
            };
        }
    };
}

// --- Decorator: withRole ----------------------------------------------------

/**
 * Wrap a server action with role-based access check.
 * Only users with one of the specified roles can execute the action.
 * 
 * @param {string[]} allowedRoles - Array of role names that can access this action
 * @param {Function} action - Server action to wrap
 * @param {object} options - Same options as withAuth
 * @returns {Function} Wrapped server action
 */
export function withRole(allowedRoles, action, options = {}) {
    return withAuth(async (context, ...args) => {
        if (!allowedRoles.includes(context.role)) {
            return {
                success: false,
                error: `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}`,
            };
        }
        return await action(context, ...args);
    }, options);
}

// --- Decorator: withPermission ----------------------------------------------

/**
 * Wrap a server action with module-level permission check.
 * 
 * @param {string} module - Module name (e.g., 'inventory', 'invoices')
 * @param {string} operation - Operation type ('read', 'write', 'delete', 'admin')
 * @param {Function} action - Server action to wrap
 * @param {object} options - Same options as withAuth
 * @returns {Function} Wrapped server action
 */
export function withPermission(module, operation, action, options = {}) {
    return withAuth(async (context, ...args) => {
        if (!context.canPerform(module, operation)) {
            return {
                success: false,
                error: `Permission denied: cannot ${operation} on ${module}`,
            };
        }
        return await action(context, ...args);
    }, options);
}

// --- Utility Exports --------------------------------------------------------

export { ROLE_HIERARCHY, PERMISSIONS, isPlatformAdmin };
