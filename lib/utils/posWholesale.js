/**
 * Wholesale / B2B pricing and MOQ helpers (domain_data on products).
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

export function getProductMoq(product) {
    const dd = readDomainData(product);
    const moq = Number(dd.min_order_qty ?? dd.minOrderQuantity ?? dd.moq ?? 0);
    return Number.isFinite(moq) && moq > 0 ? moq : 1;
}

export function getWholesaleUnitPrice(product, quantity = 1) {
    const dd = readDomainData(product);
    const wholesale = Number(dd.wholesale_price ?? dd.wholesalePrice ?? 0);
    const tierQty = Number(dd.wholesale_tier_qty ?? dd.wholesaleTierQty ?? getProductMoq(product));
    const retail = parseFloat(product?.selling_price ?? product?.price ?? 0);
    if (Number.isFinite(wholesale) && wholesale > 0 && Number(quantity) >= tierQty) {
        return wholesale;
    }
    return retail;
}

/**
 * @param {object} product
 * @param {number} quantity
 * @returns {{ ok: boolean, moq: number, message?: string }}
 */
export function validateWholesaleQuantity(product, quantity) {
    const moq = getProductMoq(product);
    const qty = Number(quantity) || 0;
    if (qty < moq) {
        return {
            ok: false,
            moq,
            message: `Minimum order quantity is ${moq} for ${product?.name || 'this item'}`,
        };
    }
    return { ok: true, moq };
}

export function getBulkQuickAdds(moq) {
    const base = Math.max(1, moq);
    return [base, base * 2, base * 5].filter((v, i, arr) => arr.indexOf(v) === i);
}
