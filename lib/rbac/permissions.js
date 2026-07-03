/**
 * Role-Based Access Control (RBAC) System
 * 
 * Defines granular permissions for each role, provides middleware
 * for server action enforcement, and exposes helpers for UI gating.
 *
 * Roles: owner > admin > manager > accountant > cashier > salesperson > waiter > viewer
 */

import { planHasFeature, FEATURE_MIN_PLAN } from '@/lib/config/plans';
import { planHasFeatureWithPackaging } from '@/lib/subscription/effectivePlanAccess';

// --- Role Hierarchy (higher index = higher privilege) ------------------------

export const ROLE_HIERARCHY = {
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

export const ALL_ROLES = Object.keys(ROLE_HIERARCHY);

// --- Permission Definitions --------------------------------------------------

/**
 * Each permission key maps to an array of roles that have access.
 * Permissions cascade upward: if 'manager' has it, 'admin' and 'owner' also have it.
 */
export const PERMISSION_DEFINITIONS = {
    // -- Dashboard --
    'dashboard.view': ['viewer', 'waiter', 'chef', 'salesperson', 'cashier', 'accountant', 'warehouse_manager', 'manager', 'admin', 'owner'],
    'dashboard.full_kpis': ['manager', 'admin', 'owner'],
    'dashboard.financial_kpis': ['accountant', 'manager', 'admin', 'owner'],

    // -- Inventory --
    'inventory.view': ['viewer', 'salesperson', 'cashier', 'accountant', 'warehouse_manager', 'manager', 'admin', 'owner'],
    'inventory.create': ['warehouse_manager', 'manager', 'admin', 'owner'],
    'inventory.edit': ['warehouse_manager', 'manager', 'admin', 'owner'],
    'inventory.delete': ['admin', 'owner'],
    'inventory.adjust_stock': ['warehouse_manager', 'manager', 'admin', 'owner'],
    'inventory.transfer': ['warehouse_manager', 'manager', 'admin', 'owner'],

    // -- POS --
    'pos.access': ['cashier', 'salesperson', 'manager', 'admin', 'owner'],
    'pos.open_session': ['cashier', 'manager', 'admin', 'owner'],
    'pos.close_session': ['cashier', 'manager', 'admin', 'owner'],
    'pos.process_sale': ['cashier', 'salesperson', 'manager', 'admin', 'owner'],
    'pos.apply_discount': ['manager', 'admin', 'owner'],
    'pos.void_transaction': ['manager', 'admin', 'owner'],
    'pos.process_refund': ['manager', 'admin', 'owner'],

    // -- Sales & Invoicing --
    'sales.view': ['salesperson', 'cashier', 'accountant', 'manager', 'admin', 'owner'],
    'sales.create_invoice': ['salesperson', 'cashier', 'manager', 'admin', 'owner'],
    'sales.edit_invoice': ['manager', 'admin', 'owner'],
    'sales.delete_invoice': ['admin', 'owner'],
    'sales.create_quotation': ['salesperson', 'manager', 'admin', 'owner'],
    'sales.create_order': ['salesperson', 'manager', 'admin', 'owner'],
    'sales.create_challan': ['salesperson', 'manager', 'admin', 'owner'],
    'sales.record_payment': ['salesperson', 'cashier', 'accountant', 'manager', 'admin', 'owner'],
    'sales.void_payment': ['accountant', 'manager', 'admin', 'owner'],
    'sales.approve_invoice': ['accountant', 'manager', 'admin', 'owner'],

    // -- Orders --
    'orders.view': ['salesperson', 'cashier', 'manager', 'admin', 'owner'],
    'orders.create': ['cashier', 'salesperson', 'manager', 'admin', 'owner'],
    'orders.edit': ['manager', 'admin', 'owner'],
    'orders.cancel': ['manager', 'admin', 'owner'],
    'orders.refund': ['manager', 'admin', 'owner'],

    // -- Customers --
    'customers.view': ['salesperson', 'cashier', 'accountant', 'manager', 'admin', 'owner'],
    'customers.create': ['salesperson', 'manager', 'admin', 'owner'],
    'customers.edit': ['salesperson', 'manager', 'admin', 'owner'],
    'customers.delete': ['admin', 'owner'],
    'customers.view_ledger': ['accountant', 'manager', 'admin', 'owner'],

    // -- Vendors --
    'vendors.view': ['accountant', 'manager', 'admin', 'owner'],
    'vendors.create': ['accountant', 'manager', 'admin', 'owner'],
    'vendors.edit': ['accountant', 'manager', 'admin', 'owner'],
    'vendors.delete': ['admin', 'owner'],

    // -- Purchases --
    'purchases.view': ['accountant', 'warehouse_manager', 'manager', 'admin', 'owner'],
    'purchases.create': ['accountant', 'warehouse_manager', 'manager', 'admin', 'owner'],
    'purchases.approve': ['manager', 'admin', 'owner'],
    'purchases.delete': ['admin', 'owner'],

    // -- Finance --
    'finance.view_gl': ['accountant', 'manager', 'admin', 'owner'],
    'finance.manage_accounts': ['accountant', 'admin', 'owner'],
    'finance.create_journal': ['accountant', 'admin', 'owner'],
    'finance.close_period': ['accountant', 'admin', 'owner'],
    'finance.view_reports': ['accountant', 'manager', 'admin', 'owner'],
    'finance.manage_expenses': ['accountant', 'manager', 'admin', 'owner'],
    'finance.manage_payments': ['accountant', 'cashier', 'manager', 'admin', 'owner'],
    'finance.credit_notes': ['accountant', 'admin', 'owner'],
    'finance.exchange_rates': ['accountant', 'admin', 'owner'],

    // -- Payments --
    'payments.view': ['accountant', 'manager', 'admin', 'owner'],
    'payments.create': ['accountant', 'cashier', 'manager', 'admin', 'owner'],
    'payments.allocate': ['accountant', 'admin', 'owner'],

    // -- Tax Compliance --
    'tax.view': ['accountant', 'admin', 'owner'],
    'tax.configure': ['admin', 'owner'],
    'tax.file_returns': ['accountant', 'admin', 'owner'],

    // -- HR & Payroll --
    'hr.view_employees': ['manager', 'admin', 'owner'],
    'hr.manage_employees': ['admin', 'owner'],
    'hr.run_payroll': ['admin', 'owner'],
    'hr.view_payslips': ['manager', 'admin', 'owner'],

    // -- Restaurant --
    'restaurant.view_tables': ['waiter', 'chef', 'cashier', 'manager', 'admin', 'owner'],
    'restaurant.manage_tables': ['manager', 'admin', 'owner'],
    'restaurant.create_order': ['waiter', 'chef', 'cashier', 'manager', 'admin', 'owner'],
    'restaurant.view_kds': ['waiter', 'chef', 'manager', 'admin', 'owner'],
    'restaurant.manage_menu': ['manager', 'admin', 'owner'],
    'restaurant.manage_reservations': ['waiter', 'manager', 'admin', 'owner'],

    // -- Warehouses --
    'warehouses.view': ['warehouse_manager', 'manager', 'admin', 'owner'],
    'warehouses.manage': ['warehouse_manager', 'admin', 'owner'],
    'warehouses.receive_goods': ['warehouse_manager', 'manager', 'admin', 'owner'],
    'warehouses.dispatch': ['warehouse_manager', 'manager', 'admin', 'owner'],

    // -- CRM & Marketing --
    'crm.view_segments': ['manager', 'admin', 'owner'],
    'crm.manage_segments': ['admin', 'owner'],
    'crm.view_campaigns': ['manager', 'admin', 'owner'],
    'crm.manage_campaigns': ['admin', 'owner'],
    'crm.manage_loyalty': ['manager', 'admin', 'owner'],
    'crm.manage_memberships': ['manager', 'admin', 'owner'],
    'crm.manage_promotions': ['manager', 'admin', 'owner'],

    // -- Workflows & Approvals --
    'approvals.request': ['salesperson', 'cashier', 'accountant', 'manager', 'admin', 'owner'],
    'approvals.approve': ['manager', 'admin', 'owner'],
    'approvals.reject': ['manager', 'admin', 'owner'],
    'workflows.view': ['manager', 'admin', 'owner'],
    'workflows.manage': ['admin', 'owner'],

    // -- Manufacturing --
    'manufacturing.view': ['manager', 'admin', 'owner'],
    'manufacturing.create': ['manager', 'admin', 'owner'],
    'manufacturing.manage_bom': ['manager', 'admin', 'owner'],

    // -- Analytics & Reports --
    'analytics.basic': ['accountant', 'manager', 'admin', 'owner'],
    'analytics.advanced': ['admin', 'owner'],
    'analytics.ai': ['admin', 'owner'],

    // -- Audit --
    'audit.view_logs': ['admin', 'owner'],

    // -- Settings & Administration --
    'settings.view': ['admin', 'owner'],
    'settings.edit': ['admin', 'owner'],
    'settings.manage_users': ['admin', 'owner'],
    'settings.manage_roles': ['owner'],
    /** Per-tenant `settings.packaging` (custom module toggles vs plan tier only). Owner-only. */
    'settings.packaging': ['owner'],
    'settings.billing': ['owner'],
};

// --- Core Permission Functions -----------------------------------------------

/**
 * Check if a role has a specific permission
 * @param {string} role - User role (e.g., 'cashier')
 * @param {string} permission - Permission key (e.g., 'pos.process_sale')
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
    const effectiveRole = (role || 'viewer').toLowerCase().trim();

    // Business owner: full access to all defined permissions (plan limits still enforced in withGuard).
    // Unknown permission keys still return true so new features never brick the business owner.
    if (effectiveRole === 'owner') {
        return true;
    }

    const allowedRoles = PERMISSION_DEFINITIONS[permission];

    if (!allowedRoles) {
        // Failsafe: new server actions may ship before this matrix is updated.
        // Anyone who can use Sales & Invoicing (sales.view) at salesperson+ level gets sales.* gates.
        if (
            permission.startsWith('sales.') &&
            hasPermission(effectiveRole, 'sales.view') &&
            isRoleAtLeast(effectiveRole, 'salesperson')
        ) {
            return true;
        }
        console.warn(`[RBAC] Unknown permission: "${permission}"`);
        return false;
    }

    // Normalize allowed roles for comparison
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase().trim());
    
    // Check direct permission
    if (normalizedAllowed.includes(effectiveRole)) {
        return true;
    }
    
    // Check role hierarchy - higher roles inherit from lower roles
    const userLevel = ROLE_HIERARCHY[effectiveRole];
    if (userLevel !== undefined) {
        for (const [roleName, roleLevel] of Object.entries(ROLE_HIERARCHY)) {
            if (roleLevel <= userLevel && normalizedAllowed.includes(roleName)) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Check if a role is at least a certain level
 * @param {string} role - User role
 * @param {string} minRole - Minimum required role
 * @returns {boolean}
 */
export function isRoleAtLeast(role, minRole) {
    const roleLevel = ROLE_HIERARCHY[role] ?? -1;
    const minLevel = ROLE_HIERARCHY[minRole] ?? 999;
    return roleLevel >= minLevel;
}

/**
 * Get all permissions for a given role
 * @param {string} role - User role
 * @returns {string[]} Array of permission keys
 */
export function getPermissionsForRole(role) {
    const effectiveRole = role || 'viewer';
    return Object.keys(PERMISSION_DEFINITIONS).filter((perm) =>
        hasPermission(effectiveRole, perm)
    );
}

/**
 * Get all permissions grouped by module
 * @param {string} role - User role
 * @returns {Record<string, string[]>}
 */
export function getPermissionsByModule(role) {
    const perms = getPermissionsForRole(role);
    const grouped = {};

    perms.forEach(perm => {
        const [module] = perm.split('.');
        if (!grouped[module]) grouped[module] = [];
        grouped[module].push(perm);
    });

    return grouped;
}

// --- Server-Side Enforcement -------------------------------------------------

/**
 * Server action permission guard
 * Throws an error if the user doesn't have the required permission.
 * Use this at the top of every server action.
 * 
 * @param {string} role - User role from business context
 * @param {string} permission - Required permission key
 * @param {string} [planTier] - Optional plan tier for feature flag check
 * @param {string} [featureKey] - Optional feature key for plan check
 * @throws {Error} If permission denied
 */
export function requirePermission(role, permission, planTier, featureKey) {
    if (!hasPermission(role, permission)) {
        throw new Error(
            `Access denied: role "${role}" lacks permission "${permission}". ` +
            `Contact your business administrator to request access.`
        );
    }

    // Optional: also check plan tier if feature key provided
    if (planTier && featureKey) {
        if (!planHasFeature(planTier, featureKey)) {
            throw new Error(
                `Feature "${featureKey}" requires a plan upgrade. ` +
                `Current plan: ${planTier}. Please upgrade to access this feature.`
            );
        }
    }
}

// --- Sidebar / UI Navigation Gating ------------------------------------------

/**
 * Maps sidebar navigation keys to their required permission and feature flag.
 * Used by the Sidebar component to determine visibility and lock state.
 */
export const NAV_PERMISSION_MAP = {
    // ESSENTIALS - Available on all tiers (Free+)
    dashboard: { permission: 'dashboard.view', feature: null },
    inventory: { permission: 'inventory.view', feature: null },
    invoices: { permission: 'sales.view', feature: null },
    customers: { permission: 'customers.view', feature: null },
    vendors: { permission: 'vendors.view', feature: null },
    purchases: { permission: 'purchases.view', feature: null },
    quotations: { permission: 'sales.create_quotation', feature: null },
    sales: { permission: 'sales.view', feature: 'sales_hub' },

    // ACCOUNTS Module Features - Starter+
    accounting: { permission: 'finance.view_gl', feature: 'expense_tracking' },
    payments: { permission: 'payments.view', feature: null },
    expenses: { permission: 'finance.manage_expenses', feature: 'expense_tracking' },
    'credit-notes': { permission: 'finance.credit_notes', feature: 'credit_notes' },
    finance: { permission: 'finance.view_reports', feature: 'expense_tracking' },
    fiscal: { permission: 'finance.close_period', feature: 'fiscal_periods' },
    'exchange-rates': { permission: 'finance.exchange_rates', feature: 'exchange_rates' },
    gst: { permission: 'tax.view', feature: null },
    journal: { permission: 'finance.view_gl', feature: null },
    
    // POS Module Features - Starter+
    pos: { permission: 'pos.access', feature: 'pos' },
    refunds: { permission: 'pos.process_refund', feature: 'pos_refunds' },
    
    // Store Module Features
    orders: { permission: 'orders.view', feature: 'storefront_orders' },
    'store-settings': { permission: 'settings.view', feature: null },
    restaurant: { permission: 'restaurant.view_tables', feature: 'restaurant_pos' },
    kds: { permission: 'restaurant.view_kds', feature: 'restaurant_kds' },
    
    // CRM Module Features - Growth+
    loyalty: { permission: 'crm.manage_loyalty', feature: 'loyalty_programs' },
    memberships: { permission: 'crm.manage_memberships', feature: 'membership_management' },
    campaigns: { permission: 'crm.view_campaigns', feature: 'campaigns' },
    crm: { permission: 'crm.view_segments', feature: 'loyalty_programs' },
    promotions: { permission: 'crm.manage_promotions', feature: 'promotions_crm' },
    
    // OPERATIONS Module Features - Professional+
    warehouses: { permission: 'warehouses.view', feature: 'multi_warehouse' },
    manufacturing: { permission: 'manufacturing.view', feature: 'manufacturing' },
    batches: { permission: 'inventory.view', feature: 'batch_tracking' },
    serials: { permission: 'inventory.view', feature: 'serial_tracking' },
    bom: { permission: 'manufacturing.view', feature: 'manufacturing' },
    
    // HR Module Features - Business+
    payroll: { permission: 'hr.view_employees', feature: 'payroll' },
    attendance: { permission: 'hr.view_employees', feature: 'attendance_tracking' },
    shifts: { permission: 'hr.view_employees', feature: 'shift_scheduling' },
    
    // INTELLIGENCE Module Features - Professional+
    reports: { permission: 'analytics.basic', feature: 'advanced_reports' },
    analytics: { permission: 'analytics.basic', feature: 'ai_analytics' },
    forecasting: { permission: 'analytics.basic', feature: 'ai_forecasting' },
    
    // GOVERNANCE Module Features - Business+
    approvals: { permission: 'approvals.request', feature: 'approval_workflows' },
    audit: { permission: 'audit.view_logs', feature: 'audit_logs' },
    audit_trail: { permission: 'audit.view_logs', feature: 'audit_logs' },
    multi_branch: { permission: 'settings.manage_users', feature: 'multi_branch' },
    
    // PLATFORM Module Features - Starter+
    settings: { permission: 'settings.view', feature: null },
    api: { permission: 'settings.view', feature: 'api_access' },
    integrations: { permission: 'settings.view', feature: 'webhook_integrations' },
    webhooks: { permission: 'settings.view', feature: 'webhook_integrations' },
    
    // ADMIN
    'platform-admin': { permission: 'settings.manage_roles', feature: null },
};

/**
 * Check if a navigation item should be visible AND accessible
 * Returns: { visible: boolean, locked: boolean, requiredPlan: string | null }
 *
 * @param {string} navKey - Sidebar navigation key (e.g., 'pos')
 * @param {string} role - User role
 * @param {string} planTier - Business plan tier
 * @param {unknown} [businessSettings] - `businesses.settings` JSON (optional); used for `settings.packaging` overrides
 * @param {Record<string, boolean>} [platformOverrides] - Optional platform admin feature overrides
 * @returns {{ visible: boolean, locked: boolean, requiredPlan: string | null }}
 */
export function getNavItemAccess(navKey, role, planTier, businessSettings, platformOverrides) {
    const mapping = NAV_PERMISSION_MAP[navKey];
    if (!mapping) return { visible: true, locked: false, requiredPlan: null };

    // 1. Role-based visibility
    const hasRole = hasPermission(role, mapping.permission);
    if (!hasRole) {
        return { visible: false, locked: false, requiredPlan: null };
    }

    // 2. Feature flag (subscription) lock
    if (mapping.feature) {
        const featureEnabled = planHasFeatureWithPackaging(
            planTier || 'free',
            mapping.feature,
            businessSettings,
            platformOverrides
        );
        if (!featureEnabled) {
            return {
                visible: true,
                locked: true,
                requiredPlan: FEATURE_MIN_PLAN[mapping.feature] || 'starter',
            };
        }
    }

    return { visible: true, locked: false, requiredPlan: null };
}

/**
 * Minimum plan tier that unlocks a nav tab's plan-gated feature (if any).
 * @param {string} navKey - key in NAV_PERMISSION_MAP
 * @returns {string|null} e.g. 'business' or null when not plan-gated
 */
export function getRequiredPlan(navKey) {
    const mapping = NAV_PERMISSION_MAP[navKey];
    if (!mapping?.feature) return null;
    return FEATURE_MIN_PLAN[mapping.feature] ?? null;
}

/**
 * Whether the user may use this tab (role + plan feature).
 */
export function canAccessTab(role, planTier, navKey, businessSettings, platformOverrides) {
    const access = getNavItemAccess(navKey, role, planTier, businessSettings, platformOverrides);
    return access.visible && !access.locked;
}

export function getRequiredPermission(navKey) {
    return NAV_PERMISSION_MAP[navKey]?.permission ?? null;
}

/** @returns {{ visible: boolean, locked: boolean, requiredPlan: string | null }} */
export function checkAccess(role, planTier, navKey, businessSettings) {
    return getNavItemAccess(navKey, role, planTier, businessSettings);
}

// --- Default Role Assignments Per Domain -------------------------------------

/**
 * Domain-specific default roles to suggest during team member invitation.
 * Restaurant domains get waiter/chef roles, retail gets cashier, etc.
 */
export const DOMAIN_DEFAULT_ROLES = {
    'restaurant-cafe': ['owner', 'admin', 'manager', 'cashier', 'waiter'],
    'retail-shop': ['owner', 'admin', 'manager', 'cashier', 'salesperson'],
    'wholesale-distribution': ['owner', 'admin', 'manager', 'accountant', 'salesperson'],
    'pharmacy': ['owner', 'admin', 'manager', 'cashier', 'salesperson'],
    'auto-parts': ['owner', 'admin', 'manager', 'cashier', 'salesperson'],
    'textile-wholesale': ['owner', 'admin', 'manager', 'accountant', 'salesperson'],
    'default': ['owner', 'admin', 'manager', 'cashier', 'salesperson', 'viewer'],
};

/**
 * Get suggested roles for a business domain
 * @param {string} domain - Business domain category
 * @returns {string[]}
 */
export function getSuggestedRoles(domain) {
    return DOMAIN_DEFAULT_ROLES[domain] || DOMAIN_DEFAULT_ROLES['default'];
}
