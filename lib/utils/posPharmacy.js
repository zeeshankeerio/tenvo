/**
 * Pharmacy POS — expiry checks and batch metadata on cart lines.
 */

function readDomainData(product) {
    const dd = product?.domain_data;
    if (!dd) return {};
    if (typeof dd === 'string') {
        try {
            return JSON.parse(dd);
        } catch {
            return {};
        }
    }
    return typeof dd === 'object' ? dd : {};
}

export function getProductExpiryDate(product) {
    const dd = readDomainData(product);
    const raw = product?.expiry_date ?? dd.expiry_date ?? dd.expiryDate ?? null;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {object} product
 * @param {Date} [asOf]
 */
export function isProductExpired(product, asOf = new Date()) {
    const expiry = getProductExpiryDate(product);
    if (!expiry) return false;
    const check = new Date(asOf);
    check.setHours(23, 59, 59, 999);
    return expiry < check;
}

/**
 * @param {object} product
 * @param {number} [warnDays=30]
 */
export function getExpiryWarning(product, warnDays = 30) {
    const expiry = getProductExpiryDate(product);
    if (!expiry) return null;
    const now = new Date();
    if (expiry < now) {
        return { level: 'blocked', label: 'Expired', expiry };
    }
    const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (days <= warnDays) {
        return { level: 'warning', label: `Expires in ${days}d`, expiry, days };
    }
    return { level: 'ok', label: null, expiry, days };
}

export function productRequiresBatch(product, category) {
    if (category === 'pharmacy') return true;
    const dd = readDomainData(product);
    return Boolean(dd.requires_batch ?? dd.batch_tracked ?? product?.batch_number);
}
