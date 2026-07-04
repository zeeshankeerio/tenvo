/**
 * Tenant POS preferences stored at business.settings.pos
 */

export const DEFAULT_POS_SETTINGS = Object.freeze({
    barcodeMode: 'auto', // auto | wedge | camera | manual
    defaultPaymentMethod: 'cash',
    requireSession: false,
    autoPrintReceipt: true,
    taxInclusiveDisplay: false,
    receiptFooter: '',
    allowCreditSale: false,
    blockExpiredProducts: true,
    enforcePharmacyBatch: true,
    enforceWholesaleMoq: true,
    syncRestaurantToPos: true,
    offlineModeEnabled: false,
});

/**
 * @param {Record<string, unknown>} [business]
 */
export function resolvePosSettings(business) {
    const raw = business?.settings?.pos;
    const fromSettings = raw && typeof raw === 'object' ? raw : {};
    return {
        ...DEFAULT_POS_SETTINGS,
        ...fromSettings,
    };
}

/**
 * @param {Record<string, unknown>} currentSettings
 * @param {Partial<typeof DEFAULT_POS_SETTINGS>} posPatch
 */
export function mergePosSettingsIntoBusiness(currentSettings = {}, posPatch = {}) {
    const base = currentSettings && typeof currentSettings === 'object' ? currentSettings : {};
    return {
        ...base,
        pos: {
            ...DEFAULT_POS_SETTINGS,
            ...(base.pos && typeof base.pos === 'object' ? base.pos : {}),
            ...posPatch,
        },
    };
}
