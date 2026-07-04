/**
 * Shared product lookup by scan code (barcode, SKU, or id).
 * Used by POS terminals and Inventory.
 */

/**
 * @param {object[]} products
 * @param {string} code
 * @returns {object|null}
 */
export function findProductByScanCode(products, code) {
    const q = String(code || '').trim();
    if (!q) return null;
    const lower = q.toLowerCase();
    return (
        (products || []).find(
            (p) =>
                String(p.barcode || '').toLowerCase() === lower ||
                String(p.sku || '').toLowerCase() === lower ||
                String(p.id || '') === q
        ) || null
    );
}

/**
 * @param {object[]} products
 * @param {string} code
 * @returns {object|null}
 */
export function findProductByPartialScan(products, code) {
    const product = findProductByScanCode(products, code);
    if (product) return product;
    const q = String(code || '').trim().toLowerCase();
    if (!q) return null;
    return (
        (products || []).find((p) => {
            const hay = [p.name, p.barcode, p.sku, p.brand]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return hay.includes(q);
        }) || null
    );
}
