// Tab registry, defined as a plain array to avoid module-level const Set TDZ
// across Next.js chunk boundaries (minifier renames const bindings which can
// cause "Cannot access 'X' before initialization" if chunks load out of order).
const VALID_TAB_LIST = [
    'dashboard',
    'inventory',
    'invoices',
    'customers',
    'vendors',
    'payments',
    'purchases',
    'sales',
    'manufacturing',
    'warehouses',
    'quotations',
    'batches',
    'serials',
    'bom',
    'finance',
    'accounting',
    'expenses',
    'credit-notes',
    'fiscal',
    'exchange-rates',
    'journal',
    'reports',
    'analytics',
    'forecasting',
    'campaigns',
    'crm',
    'promotions',
    'gst',
    'pos',
    'refunds',
    'restaurant',
    'kds',
    'payroll',
    'attendance',
    'shifts',
    'approvals',
    'audit',
    'audit-trail',
    'loyalty',
    'memberships',
    'settings',
    'api',
    'integrations',
    'webhooks',
    'multi-branch',
    'orders',
    'store-settings',
    'inquiries',
];

// Lazily-built Set, never a top-level const binding, so no TDZ risk
let _tabSet = null;
function getTabSet() {
    if (!_tabSet) _tabSet = new Set(VALID_TAB_LIST);
    return _tabSet;
}

// Keep named export for any consumers that still reference it
export const VALID_DASHBOARD_TABS = { has: (v) => getTabSet().has(v) };

const TAB_ALIASES = {
    analytics: 'reports',
    report: 'reports',
    forecasting: 'reports',
    forecast: 'reports',
    'multi-location': 'warehouses',
    'financial-reports': 'finance',
    banking: 'payments',
    accounts: 'accounting',
    journal: 'finance',
    ai: 'reports',
    hr: 'payroll',
    attendance: 'payroll',
    shifts: 'payroll',
    operations: 'warehouses',
    cn: 'credit-notes',
    po: 'purchases',
    so: 'sales',
    inv: 'inventory',
    cust: 'customers',
    ven: 'vendors',
    serials: 'batches',
    bom: 'manufacturing',
    crm: 'loyalty',
    promotions: 'campaigns',
    kds: 'restaurant',
    'audit-trail': 'audit',
    api: 'settings',
    integrations: 'settings',
    webhooks: 'settings',
    'multi-branch': 'settings',
    'domain-operations': 'inquiries',
    inquiry: 'inquiries',
    inquiries: 'inquiries',
    contact: 'inquiries',
    'contact-messages': 'inquiries'
};

export function normalizeDashboardTab(tab) {
    if (!tab) return 'dashboard';
    const key = String(tab).trim().toLowerCase();
    return TAB_ALIASES[key] || key;
}

export function resolveDashboardTab(tab) {
    const normalized = normalizeDashboardTab(tab);
    return getTabSet().has(normalized) ? normalized : 'dashboard';
}

export function isValidTab(tab) {
    return getTabSet().has(normalizeDashboardTab(tab));
}
