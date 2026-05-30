/**
 * Platform Configuration -- Owner & Trial Settings
 * 
 * Centralizes platform-level constants:
 *  - Platform owner identity (always free, full bypass)
 *  - Trial period configuration
 *  - Platform-level role definitions
 */

// --- Platform Owner ----------------------------------------------------------
// The platform owner has FULL access to everything:
//   * All businesses, all admins, all users
//   * Payments, subscribers, and plan management
//   * Always free -- no plan restrictions
//   * Bypasses every guard, limit, and feature check
//
// Configure via env (comma-separated, case-insensitive):
//   PLATFORM_OWNER_EMAILS — primary list
//   PLATFORM_OWNER_EMAIL_EXTRA — legacy alias, merged into the same set
//   PLATFORM_OWNER_EMAIL — optional single email (merged + used as display fallback)

function collectOwnerEmails() {
    const parts = [
        process.env.PLATFORM_OWNER_EMAILS,
        process.env.PLATFORM_OWNER_EMAIL_EXTRA,
        process.env.PLATFORM_OWNER_EMAIL,
    ]
        .filter(Boolean)
        .join(',');
    return new Set(
        parts
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
    );
}

const PLATFORM_OWNER_EMAILS = collectOwnerEmails();

/** Display / legacy: first configured owner email, or empty. Not used for security — use isPlatformOwner(). */
export const PLATFORM_OWNER_EMAIL = process.env.PLATFORM_OWNER_EMAIL || [...PLATFORM_OWNER_EMAILS][0] || '';

/**
 * Check if a user is the platform owner by email.
 * @param {object|string} userOrEmail - BetterAuth user object or email string
 * @returns {boolean}
 */
export function isPlatformOwner(userOrEmail) {
    const email = typeof userOrEmail === 'string'
        ? userOrEmail
        : userOrEmail?.email;
    if (!email) return false;
    return PLATFORM_OWNER_EMAILS.has(email.toLowerCase());
}

/**
 * Check if a user is a platform-level admin.
 * This covers both:
 *   1. The hardcoded platform owner (by email)
 *   2. BetterAuth admin-role users (user.role === 'admin')
 * 
 * @param {object} user - BetterAuth user object with { email, role }
 * @returns {boolean}
 */
export function isPlatformLevel(user) {
    if (!user) return false;
    return isPlatformOwner(user) || user.role === 'admin';
}

// --- Trial Configuration -----------------------------------------------------

export const TRIAL_CONFIG = {
    /** Number of days for free trial */
    durationDays: 7,
    /** Plan tier granted during trial */
    trialPlanTier: 'starter',
    /** Plan to downgrade to after trial expires */
    expiredPlanTier: 'free',
    /** Whether to show trial banner in UI */
    showBanner: true,
};

/**
 * Calculate trial expiry date from now.
 * @returns {Date}
 */
export function getTrialExpiryDate() {
    const now = new Date();
    now.setDate(now.getDate() + TRIAL_CONFIG.durationDays);
    return now;
}

/**
 * Check if a trial is still active.
 * @param {string|Date} expiresAt - The plan_expires_at value
 * @returns {boolean}
 */
export function isTrialActive(expiresAt) {
    if (!expiresAt) return false;
    return new Date(expiresAt) > new Date();
}

/**
 * Get the number of trial days remaining.
 * @param {string|Date} expiresAt - The plan_expires_at value
 * @returns {number} Days remaining (0 if expired)
 */
export function getTrialDaysRemaining(expiresAt) {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// --- Business Role Descriptions (for UI) ------------------------------------

export const ROLE_DESCRIPTIONS = {
    owner: {
        label: 'Owner',
        description: 'Full business control. Manages billing, roles, and all settings.',
        color: 'text-amber-600',
        badge: 'bg-amber-100 text-amber-800',
    },
    admin: {
        label: 'Admin',
        description: 'Business administrator. Manages team, settings, and operations.',
        color: 'text-wine-600',
        badge: 'bg-wine-100 text-wine-800',
    },
    manager: {
        label: 'Manager',
        description: 'Manages inventory, staff, approvals, and day-to-day operations.',
        color: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-800',
    },
    warehouse_manager: {
        label: 'Warehouse Manager',
        description: 'Manages warehouses, stock transfers, and goods receipt.',
        color: 'text-cyan-600',
        badge: 'bg-cyan-100 text-cyan-800',
    },
    accountant: {
        label: 'Accountant',
        description: 'Manages financial records, journal entries, and reports.',
        color: 'text-green-600',
        badge: 'bg-green-100 text-green-800',
    },
    cashier: {
        label: 'Cashier',
        description: 'Processes POS sales, payments, and basic customer management.',
        color: 'text-orange-600',
        badge: 'bg-orange-100 text-orange-800',
    },
    salesperson: {
        label: 'Salesperson',
        description: 'Creates invoices, quotations, and manages customer orders.',
        color: 'text-indigo-600',
        badge: 'bg-indigo-100 text-indigo-800',
    },
    chef: {
        label: 'Chef',
        description: 'Views kitchen orders and manages restaurant KDS.',
        color: 'text-red-600',
        badge: 'bg-red-100 text-red-800',
    },
    waiter: {
        label: 'Waiter',
        description: 'Takes orders, manages tables, and handles reservations.',
        color: 'text-teal-600',
        badge: 'bg-teal-100 text-teal-800',
    },
    viewer: {
        label: 'Viewer',
        description: 'Read-only access to dashboards and reports.',
        color: 'text-gray-600',
        badge: 'bg-gray-100 text-gray-800',
    },
};

// --- Platform Owner Virtual Plan ---------------------------------------------
// When the platform owner accesses the system, they get enterprise-level access
// with unlimited everything, regardless of any business's actual plan.

export const PLATFORM_OWNER_PLAN = {
    key: 'platform_owner',
    name: 'Platform Owner',
    limits: {
        max_users: -1,
        max_products: -1,
        max_customers: -1,
        max_vendors: -1,
        max_warehouses: -1,
        max_invoices_per_month: -1,
        max_pos_terminals: -1,
        max_storage_mb: -1,
        max_branches: -1,
    },
};
