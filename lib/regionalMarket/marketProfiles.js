/**
 * Country-level market profiles: payments, tax compliance, languages, seasons.
 * Extend when launching a new country, do not hardcode in domain rows alone.
 */
export const MARKET_PROFILES = Object.freeze({
  PK: {
    countryCode: 'PK',
    languages: ['en', 'ur'],
    paymentGateways: ['jazzcash', 'easypaisa', 'payfast', 'raast', 'bank_transfer', 'cod', 'cash', 'card'],
    taxCompliance: ['fbr', 'ntn', 'srn', 'provincial_tax', 'wht'],
    seasonalPricing: true,
    marketLocations: true,
    brandCatalog: 'PK',
    launchTier: 'primary',
  },
  AE: {
    countryCode: 'AE',
    languages: ['en', 'ar'],
    paymentGateways: ['card', 'apple_pay', 'bank_transfer', 'cod', 'cash', 'wallet'],
    taxCompliance: ['trn', 'vat', 'corporate_tax'],
    seasonalPricing: true,
    marketLocations: false,
    brandCatalog: 'AE',
    launchTier: 'scale',
  },
  US: {
    countryCode: 'US',
    languages: ['en'],
    paymentGateways: ['card', 'cash', 'check', 'ach', 'stripe', 'paypal'],
    taxCompliance: ['ein', 'sales_tax', 'state_tax', '1099'],
    seasonalPricing: true,
    marketLocations: false,
    brandCatalog: 'US',
    launchTier: 'scale',
  },
  CN: {
    countryCode: 'CN',
    languages: ['zh', 'en'],
    paymentGateways: ['wechat_pay', 'alipay', 'unionpay', 'cash', 'bank_transfer'],
    taxCompliance: ['uscc', 'vat_invoice', 'fapiao'],
    seasonalPricing: true,
    marketLocations: false,
    brandCatalog: 'CN',
    launchTier: 'scale',
  },
  SA: {
    countryCode: 'SA',
    languages: ['ar', 'en'],
    paymentGateways: ['mada', 'card', 'apple_pay', 'cod', 'bank_transfer', 'cash'],
    taxCompliance: ['vat', 'cr', 'zakat_certificate'],
    seasonalPricing: true,
    marketLocations: false,
    brandCatalog: 'AE',
    launchTier: 'scale',
  },
  IN: {
    countryCode: 'IN',
    languages: ['en', 'hi'],
    paymentGateways: ['upi', 'paytm', 'card', 'cod', 'bank_transfer', 'cash'],
    taxCompliance: ['gstin', 'gst', 'pan', 'tds'],
    seasonalPricing: true,
    marketLocations: false,
    brandCatalog: 'PK',
    launchTier: 'future',
  },
  GB: {
    countryCode: 'GB',
    languages: ['en'],
    paymentGateways: ['card', 'bank_transfer', 'paypal', 'stripe', 'cash'],
    taxCompliance: ['vat', 'company_number', 'utr'],
    seasonalPricing: true,
    marketLocations: false,
    brandCatalog: 'US',
    launchTier: 'future',
  },
});

/** ISO codes with full brand + market profile (MVP + scale targets). */
export const SUPPORTED_MARKET_ISO = Object.freeze(['PK', 'AE', 'US', 'CN', 'SA']);

/** @param {string} countryIso */
export function getMarketProfile(countryIso) {
  const code = String(countryIso || 'PK').toUpperCase();
  return MARKET_PROFILES[code] || MARKET_PROFILES.PK;
}
