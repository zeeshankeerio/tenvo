/**
 * POS domain routing and presentation config.
 * Maps business verticals to POS UI variants and workflow flags.
 */

import { getDomainConfig } from '@/lib/config/domains';

/** @typedef {'restaurant' | 'superstore' | 'retail' | 'service'} PosVariant */

/** Domains that use the high-throughput scan-first superstore terminal. */
const SUPERSTORE_CATEGORIES = new Set([
    'supermarket',
    'grocery',
    'wholesale-distribution',
    'bakery-confectionery',
    'pharmacy',
    'cold-storage',
    'fmcg',
    'petrol-pump',
]);

/** Domains with service-style checkout (appointments / labor SKUs on retail shell). */
const SERVICE_CATEGORIES = new Set([
    'salon-spa',
    'courier-logistics',
    'mobile-repairing',
    'clinics-healthcare',
    'gym-fitness',
]);

const DEPARTMENT_COLORS = [
    'bg-brand-primary',
    'bg-brand-primary-dark',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-violet-500',
    'bg-pink-500',
    'bg-red-500',
    'bg-lime-600',
    'bg-teal-500',
];

const CATEGORY_ICONS = {
    beverages: '🥤',
    snacks: '🍿',
    dairy: '🥛',
    frozen: '🧊',
    fresh: '🥬',
    bakery: '🥖',
    household: '🏠',
    personal: '🧴',
    meat: '🥩',
    grocery: '🛒',
    pharmacy: '💊',
    electronics: '📱',
    apparel: '👕',
    default: '📦',
};

/**
 * Resolve which POS shell to mount for a business category.
 * @param {string} category
 * @returns {PosVariant}
 */
export function resolvePosVariant(category) {
    const key = String(category || '').toLowerCase();
    if (key === 'restaurant-cafe') return 'restaurant';
    if (SUPERSTORE_CATEGORIES.has(key)) return 'superstore';
    if (SERVICE_CATEGORIES.has(key)) return 'service';
    return 'retail';
}

/**
 * POS workflow flags per domain (weight items, barcode-first, bulk qty, credit sale hints).
 * @param {string} category
 */
export function getPosDomainFlags(category) {
    const key = String(category || '').toLowerCase();
    const domain = getDomainConfig(key) || {};
    const variant = resolvePosVariant(key);

    return {
        variant,
        barcodeFirst: variant === 'superstore' || [
            'pharmacy', 'electronics-goods', 'electronics-mobile', 'mobile',
            'textile-wholesale', 'auto-parts',
        ].includes(key),
        supportsWeight: variant === 'superstore' || [
            'butcher-meat-shop', 'textile-wholesale', 'textile-mill', 'agriculture',
        ].includes(key),
        supportsBulkQty: variant === 'superstore' || key === 'wholesale-distribution',
        supportsHeldOrders: variant === 'superstore' || variant === 'retail',
        showProductBrowse: true,
        serviceMode: SERVICE_CATEGORIES.has(key) || Boolean(domain?.serviceMode),
        wholesaleMode: key === 'wholesale-distribution' || key === 'textile-wholesale',
        pharmacyMode: key === 'pharmacy',
    };
}

/**
 * Pick a display icon for a category chip.
 * @param {string} label
 */
export function getPosCategoryIcon(label) {
    const lower = String(label || '').toLowerCase();
    if (lower.includes('beverage') || lower.includes('drink')) return CATEGORY_ICONS.beverages;
    if (lower.includes('snack')) return CATEGORY_ICONS.snacks;
    if (lower.includes('dairy') || lower.includes('milk')) return CATEGORY_ICONS.dairy;
    if (lower.includes('frozen') || lower.includes('ice')) return CATEGORY_ICONS.frozen;
    if (lower.includes('fresh') || lower.includes('produce') || lower.includes('fruit')) return CATEGORY_ICONS.fresh;
    if (lower.includes('baker') || lower.includes('bread')) return CATEGORY_ICONS.bakery;
    if (lower.includes('house') || lower.includes('clean')) return CATEGORY_ICONS.household;
    if (lower.includes('personal') || lower.includes('beauty') || lower.includes('care')) return CATEGORY_ICONS.personal;
    if (lower.includes('meat') || lower.includes('poultry')) return CATEGORY_ICONS.meat;
    if (lower.includes('pharm') || lower.includes('medic')) return CATEGORY_ICONS.pharmacy;
    if (lower.includes('electron') || lower.includes('mobile')) return CATEGORY_ICONS.electronics;
    if (lower.includes('garment') || lower.includes('fashion') || lower.includes('apparel')) return CATEGORY_ICONS.apparel;
    return CATEGORY_ICONS.default;
}

/**
 * Build department chips from domain defaults + live product categories.
 * @param {string} category
 * @param {object[]} [products]
 * @param {number} [maxChips=14]
 */
export function buildPosDepartments(category, products = [], maxChips = 14) {
    const domain = getDomainConfig(category) || {};
    const defaults = Array.isArray(domain.default_categories) ? domain.default_categories : [];
    const fromProducts = [...new Set((products || []).map((p) => p.category).filter(Boolean))];
    const defaultLower = new Set(defaults.map((c) => String(c).toLowerCase()));
    const extra = fromProducts
        .filter((c) => !defaultLower.has(String(c).toLowerCase()))
        .sort((a, b) => String(a).localeCompare(String(b)));
    const labels = [...defaults, ...extra].slice(0, Math.max(1, maxChips - 1));

    const departments = [
        { key: 'all', label: 'All', icon: '🛍️', color: 'bg-brand-primary' },
        ...labels.map((label, idx) => ({
            key: normalizePosCategoryKey(label),
            label,
            icon: getPosCategoryIcon(label),
            color: DEPARTMENT_COLORS[idx % DEPARTMENT_COLORS.length],
        })),
    ];

    return departments;
}

/**
 * Normalize a product category label to a stable slug key for filtering.
 * @param {string} label
 */
export function normalizePosCategoryKey(label) {
    return String(label || 'other')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'other';
}

/**
 * Count products per department key (includes `all`).
 * @param {object[]} products
 */
export function countProductsByDepartment(products) {
    const counts = { all: (products || []).length };
    (products || []).forEach((p) => {
        const key = normalizePosCategoryKey(p.category || 'other');
        counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
}

/**
 * Filter products by active department key.
 * @param {object[]} products
 * @param {string} departmentKey
 */
export function filterProductsByDepartment(products, departmentKey) {
    if (!departmentKey || departmentKey === 'all') return products || [];
    return (products || []).filter(
        (p) => normalizePosCategoryKey(p.category || 'other') === departmentKey
    );
}
