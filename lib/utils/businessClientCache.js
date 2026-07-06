/**
 * Client-side business shell cache (localStorage).
 * UI-only — never used for security; server actions always re-validate role/plan.
 */

import { ALL_ROLES } from '@/lib/rbac/permissions';

const BUSINESS_DATA_KEY = 'businessData';
const USER_ROLE_KEY = 'userRole';
const LAST_DOMAIN_KEY = 'lastBusinessDomain';

const VALID_ROLES = new Set(ALL_ROLES);

/** Read /business/[domain] from the current browser path (client only). */
export function getBusinessDomainFromWindowPath() {
    if (typeof window === 'undefined') return null;
    const parts = window.location.pathname.split('/');
    return parts[1] === 'business' ? parts[2] || null : null;
}

/** True when cached business matches the URL domain (or URL has no domain segment). */
export function shellMatchesDomain(business, domainFromPath) {
    if (!business?.id) return false;
    if (!domainFromPath) return true;
    const cachedDomain = String(business.domain || '').toLowerCase();
    return cachedDomain === String(domainFromPath).toLowerCase();
}

function normalizeCachedRole(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const role = raw.trim().toLowerCase();
    return VALID_ROLES.has(role) ? role : null;
}

/**
 * Hydrate optimistic business + role from localStorage.
 * Role is only restored when it matches lastBusinessDomain (prevents cross-tenant bleed).
 */
export function readOptimisticBusinessShell(domainFromPath = null) {
    if (typeof window === 'undefined') {
        return { business: null, role: null };
    }

    const pathDomain = domainFromPath ?? getBusinessDomainFromWindowPath();
    const storedBiz = localStorage.getItem(BUSINESS_DATA_KEY);
    if (!storedBiz) {
        return { business: null, role: null };
    }

    try {
        const parsedBiz = JSON.parse(storedBiz);
        // Strip embedded role — canonical role lives in USER_ROLE_KEY + LAST_DOMAIN_KEY.
        const { user_role: _ur, ...safeBiz } = parsedBiz;
        const business = safeBiz;

        if (!business?.id || !shellMatchesDomain(business, pathDomain)) {
            return { business: null, role: null };
        }

        const lastDomain = localStorage.getItem(LAST_DOMAIN_KEY);
        const cachedRole = normalizeCachedRole(localStorage.getItem(USER_ROLE_KEY));
        const role =
            cachedRole &&
            lastDomain &&
            String(lastDomain).toLowerCase() === String(business.domain || '').toLowerCase()
                ? cachedRole
                : null;

        return { business, role };
    } catch {
        localStorage.removeItem(BUSINESS_DATA_KEY);
        return { business: null, role: null };
    }
}

/** Whether the shell has enough context to render the hub without blocking on network. */
export function hasValidOptimisticShell(business, role, domainFromPath) {
    return Boolean(business?.id && role && shellMatchesDomain(business, domainFromPath));
}

export function persistBusinessShell(business, userRole) {
    if (typeof window === 'undefined' || !business) return;
    try {
        // Ensure approval status is persisted in cache for proper guards
        const shellData = {
            ...business,
            // Explicitly include approval fields for client-side guards
            approval_status: business.approval_status || null,
            approval_requested_at: business.approval_requested_at || null,
            approval_decided_at: business.approval_decided_at || null,
        };
        localStorage.setItem(BUSINESS_DATA_KEY, JSON.stringify(shellData));
    } catch {
        // quota / private mode
    }
    if (userRole) {
        try {
            localStorage.setItem(USER_ROLE_KEY, userRole);
        } catch {
            // ignore
        }
    }
    if (business.domain) {
        try {
            localStorage.setItem(LAST_DOMAIN_KEY, business.domain);
        } catch {
            // ignore
        }
    }
}

export function clearBusinessShell() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(BUSINESS_DATA_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem(LAST_DOMAIN_KEY);
}

export function restoreCachedRoleForBusiness(business) {
    if (typeof window === 'undefined' || !business?.domain) return null;
    const lastDomain = localStorage.getItem(LAST_DOMAIN_KEY);
    if (!lastDomain || String(lastDomain).toLowerCase() !== String(business.domain).toLowerCase()) {
        return null;
    }
    return normalizeCachedRole(localStorage.getItem(USER_ROLE_KEY));
}
