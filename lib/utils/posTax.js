/**
 * Shared tax allocation for POS checkout and restaurant→POS ledger sync.
 */

/**
 * @param {number|string} orderSubtotal
 * @param {number|string} orderTax
 */
export function computeOrderTaxRatio(orderSubtotal, orderTax) {
    const sub = Number(orderSubtotal) || 0;
    const tax = Number(orderTax) || 0;
    if (sub <= 0) return { taxRatio: 0, taxPercent: 0 };
    const taxRatio = tax / sub;
    return {
        taxRatio,
        taxPercent: Math.round(taxRatio * 10000) / 100,
    };
}

/**
 * Map order line rows to POS transaction items with pro-rata tax from order totals.
 * @param {object[]} lines
 * @param {{ orderSubtotal: number, orderTax: number, productIdKey?: string, nameKey?: string, qtyKey?: string, priceKey?: string }} opts
 */
export function mapOrderLinesToPosItems(lines, opts) {
    const {
        orderSubtotal,
        orderTax,
        productIdKey = 'product_id',
        nameKey = 'item_name',
        qtyKey = 'quantity',
        priceKey = 'unit_price',
    } = opts;

    const { taxRatio, taxPercent } = computeOrderTaxRatio(orderSubtotal, orderTax);

    return (lines || [])
        .filter((row) => row[productIdKey])
        .map((row) => {
            const qty = Number(row[qtyKey]) || 1;
            const unitPrice = Number(row[priceKey]) || 0;
            const lineSubtotal = unitPrice * qty;
            const lineTax = Math.round(lineSubtotal * taxRatio * 100) / 100;
            return {
                productId: row[productIdKey],
                productName: row[nameKey] || 'Item',
                quantity: qty,
                unitPrice,
                taxPercent,
                taxAmount: lineTax,
            };
        });
}

/**
 * Resolve line tax from explicit amount or percent.
 */
export function resolvePosLineTax(item) {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unitPrice) || 0;
    const lineSub = qty * unitPrice;
    if (item.taxAmount != null && Number.isFinite(Number(item.taxAmount))) {
        return Math.round(Number(item.taxAmount) * 100) / 100;
    }
    return Math.round(lineSub * (Number(item.taxPercent) || 0) / 100 * 100) / 100;
}
