/**
 * Shared POS helpers — totals, domain UI, barcode lookup, stock guards, payments.
 */

import { getDomainConfig } from '@/lib/config/domains';
import { getPosDomainFlags } from '@/lib/config/posDomains';
import { getBusinessRegionalPack } from '@/lib/utils/businessRegionalContext';

/** @typedef {{ productId: string, name?: string, sku?: string, unitPrice: number, quantity: number, taxPercent?: number, discountAmount?: number }} PosCartLine */

/**
 * Domain + regional POS presentation config.
 * @param {string} category
 * @param {Record<string, unknown>} [business]
 */
export function getPosUiConfig(category, business = {}) {
    const domain = getDomainConfig(category) || {};
    const pack = getBusinessRegionalPack(business);
    const flags = getPosDomainFlags(category);
    const taxFromDomain = domain?.tax_config?.default_tax_rate;
    const defaultTaxRate =
        Number.isFinite(Number(pack.defaultTaxRate)) && pack.defaultTaxRate >= 0
            ? Number(pack.defaultTaxRate)
            : Number.isFinite(Number(taxFromDomain))
                ? Number(taxFromDomain)
                : 0;

    return {
        terminalLabel:
            domain?.label_overrides?.pos_terminal
            || domain?.label_overrides?.register
            || 'Counter',
        receiptLabel: domain?.label_overrides?.invoice || 'Receipt',
        productLabel: domain?.label_overrides?.product || 'Product',
        taxLabel: pack.taxLabel || domain?.tax_config?.tax_label || 'Tax',
        taxIdLabel: pack.taxIdLabel || 'Tax ID',
        defaultTaxRate,
        currencySymbol: pack.currencySymbol || '₨',
        currencyCode: pack.currency || 'PKR',
        locale: pack.locale || 'en',
        defaultCategories: Array.isArray(domain?.default_categories) ? domain.default_categories : [],
        supportsWeight: flags.supportsWeight,
        barcodeFirst: flags.barcodeFirst,
        wholesaleMode: flags.wholesaleMode,
        pharmacyMode: flags.pharmacyMode,
        serviceMode: flags.serviceMode,
        posVariant: flags.variant,
        variantMatrix: Boolean(domain?.special_rules?.size_color_matrix),
        maxCategoryChips: 12,
    };
}

/**
 * Domain defaults first, then product categories — capped for POS chip row.
 * @param {object[]} products
 * @param {string[]} [defaultCategories]
 * @param {number} [maxChips=12]
 */
export function buildPosCategoryChips(products, defaultCategories = [], maxChips = 12) {
    const defaults = (defaultCategories || []).filter(Boolean);
    const fromProducts = [...new Set((products || []).map((p) => p.category).filter(Boolean))];
    const defaultLower = new Set(defaults.map((c) => String(c).toLowerCase()));
    const extra = fromProducts
        .filter((c) => !defaultLower.has(String(c).toLowerCase()))
        .sort((a, b) => String(a).localeCompare(String(b)));
    return [...defaults, ...extra].slice(0, Math.max(1, maxChips));
}

/**
 * @param {PosCartLine[]} items
 * @param {{ discount?: number|string, discountType?: 'fixed'|'percentage' }} [opts]
 */
export function computePosOrderTotals(items, opts = {}) {
    const lines = Array.isArray(items) ? items : [];
    const subtotal = lines.reduce((sum, i) => sum + Number(i.unitPrice || 0) * Number(i.quantity || 0), 0);
    const taxAmount = Math.round(
        lines.reduce((sum, i) => {
            const line = Number(i.unitPrice || 0) * Number(i.quantity || 0);
            const pct = Number(i.taxPercent || 0);
            return sum + line * (pct / 100);
        }, 0) * 100
    ) / 100;

    const rawDiscount = parseFloat(String(opts.discount ?? 0)) || 0;
    const discountType = opts.discountType === 'percentage' ? 'percentage' : 'fixed';
    const lineDiscounts = lines.reduce((s, i) => s + Number(i.discountAmount || 0), 0);
    const orderDiscount =
        discountType === 'percentage'
            ? Math.min(subtotal * (rawDiscount / 100), subtotal)
            : Math.min(rawDiscount, subtotal);

    const discountAmount = Math.round((lineDiscounts + orderDiscount) * 100) / 100;
    const total = Math.round((subtotal + taxAmount - discountAmount) * 100) / 100;

    return { subtotal, taxAmount, discountAmount, orderDiscount, lineDiscounts, total };
}

/**
 * Spread cart-level discount across lines for persistence (pro-rata by line subtotal).
 * @param {PosCartLine[]} items
 * @param {number} orderDiscount
 */
export function allocateOrderDiscountToLines(items, orderDiscount) {
    const orderDisc = Math.max(0, Number(orderDiscount) || 0);
    if (!orderDisc || !items?.length) {
        return (items || []).map((i) => ({ ...i, discountAmount: Number(i.discountAmount || 0) }));
    }
    const subtotal = items.reduce((s, i) => s + Number(i.unitPrice || 0) * Number(i.quantity || 0), 0);
    if (subtotal <= 0) {
        return items.map((i) => ({ ...i, discountAmount: Number(i.discountAmount || 0) }));
    }
    let allocated = 0;
    return items.map((item, idx) => {
        const lineSub = Number(item.unitPrice || 0) * Number(item.quantity || 0);
        let share =
            idx === items.length - 1
                ? Math.round((orderDisc - allocated) * 100) / 100
                : Math.round((lineSub / subtotal) * orderDisc * 100) / 100;
        allocated += share;
        return {
            ...item,
            discountAmount: Math.round((Number(item.discountAmount || 0) + share) * 100) / 100,
        };
    });
}

/** Map UI payment keys to persisted methods + GL buckets. */
export function normalizePosPaymentMethod(method) {
    const m = String(method || 'cash').toLowerCase();
    if (m === 'wallet' || m === 'mobile' || m === 'upi') return 'card';
    if (m === 'split') return 'cash';
    return m;
}

export function isCardLikePaymentMethod(method) {
    return ['card', 'wallet', 'mobile', 'upi', 'bank'].includes(String(method || '').toLowerCase());
}

/**
 * @param {object[]} products
 * @param {string} code
 */
export { findProductByScanCode } from '@/lib/utils/productScanLookup';

export function getProductAvailableStock(product) {
    if (!product) return 0;
    const n = Number(product.stock ?? product.quantity ?? 0);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * @param {PosCartLine[]} cart
 * @param {object} product
 * @param {number} [addQty=1]
 */
export function getMaxAddableQuantity(cart, product, addQty = 1) {
    const stock = getProductAvailableStock(product);
    const existing = (cart || []).find((i) => i.productId === product.id);
    const inCart = existing ? Number(existing.quantity || 0) : 0;
    const requested = inCart + addQty;
    return Math.max(0, Math.min(stock, requested));
}

export const POS_AUTO_PRINT_KEY = 'tenvo_pos_auto_print';

export function getPosAutoPrintEnabled() {
    if (typeof window === 'undefined') return true;
    try {
        return window.localStorage.getItem(POS_AUTO_PRINT_KEY) !== 'false';
    } catch {
        return true;
    }
}

export function setPosAutoPrintEnabled(enabled) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(POS_AUTO_PRINT_KEY, enabled ? 'true' : 'false');
    } catch {
        /* ignore */
    }
}

/**
 * Build a receipt preview payload from cart state (pre- or post-sale).
 */
export function buildPosReceiptDraft({
    cart = [],
    subtotal,
    taxAmount,
    discountAmount = 0,
    total,
    customer = null,
    paymentMethod = 'cash',
    amountTendered = null,
    transactionRef = 'DRAFT',
    isDraft = true,
}) {
    const lineItems = (cart || []).map((i) => ({
        name: i.name || 'Item',
        sku: i.sku,
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unitPrice) || 0,
        lineTotal: Math.round(Number(i.unitPrice || 0) * Number(i.quantity || 0) * 100) / 100,
    }));
    const saleTotal = Number(total) || 0;
    const tendered = amountTendered != null && amountTendered !== ''
        ? Number(amountTendered)
        : saleTotal;
    return {
        saleNumber: transactionRef,
        transaction_number: transactionRef,
        invoice_number: isDraft ? null : transactionRef,
        subtotal: Number(subtotal) || 0,
        taxAmount: Number(taxAmount) || 0,
        discountAmount: Number(discountAmount) || 0,
        total: saleTotal,
        amountTendered: tendered,
        changeDue: Math.max(0, Math.round((tendered - saleTotal) * 100) / 100),
        lineItems,
        customerName: customer?.name || null,
        paymentMethod,
        date: new Date().toISOString(),
        isDraft,
    };
}

export function buildPosCheckoutPayload({
    businessId,
    sessionId,
    customerId,
    cart,
    discount,
    discountType,
    paymentMethod,
    payments,
}) {
    const totals = computePosOrderTotals(cart, { discount, discountType });
    const items = allocateOrderDiscountToLines(
        cart.map((i) => ({
            productId: i.productId,
            productName: i.name,
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unitPrice) || 0,
            taxPercent: Number(i.taxPercent) || 0,
            taxAmount: Math.round(
                Number(i.unitPrice || 0) * Number(i.quantity || 0) * (Number(i.taxPercent || 0) / 100) * 100
            ) / 100,
            sku: i.sku,
            batchId: i.batchId || null,
            serialNumber: i.serialNumber || null,
        })),
        totals.orderDiscount
    );

    const normalizedMethod = normalizePosPaymentMethod(paymentMethod);
    const paymentRows =
        Array.isArray(payments) && payments.length > 0
            ? payments.map((p) => ({
                  method: normalizePosPaymentMethod(p.method),
                  amount: Number(p.amount) || 0,
                  reference: p.reference || null,
              }))
            : [{ method: normalizedMethod, amount: totals.total }];

    return {
        businessId,
        sessionId,
        customerId: customerId || null,
        items,
        // Discounts are persisted on line items (allocateOrderDiscountToLines); avoid double-counting server-side.
        discountAmount: 0,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        paymentMethod: normalizedMethod,
        payments: paymentRows,
    };
}
