/**
 * PKR Currency Utilities
 * Handles Pakistani Rupee formatting, parsing, and conversions
 * 
 * This module provides currency handling for Pakistani market
 * while maintaining compatibility with existing INR-based code.
 */

export const CURRENCY_CONFIG = {
  PKR: {
    code: 'PKR',
    symbol: '₨',
    decimal: 2,
    locale: 'en-PK',
    name: 'Pakistani Rupee',
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    decimal: 2,
    locale: 'en-IN',
    name: 'Indian Rupee',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    decimal: 2,
    locale: 'en-US',
    name: 'US Dollar',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    decimal: 2,
    locale: 'en-GB',
    name: 'Euro',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    decimal: 2,
    locale: 'en-GB',
    name: 'British Pound',
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    decimal: 2,
    locale: 'ar-AE',
    name: 'UAE Dirham',
  },
  SAR: {
    code: 'SAR',
    symbol: '﷼',
    decimal: 2,
    locale: 'ar-SA',
    name: 'Saudi Riyal',
  },
  CAD: {
    code: 'CAD',
    symbol: '$',
    decimal: 2,
    locale: 'en-CA',
    name: 'Canadian Dollar',
  },
  AUD: {
    code: 'AUD',
    symbol: '$',
    decimal: 2,
    locale: 'en-AU',
    name: 'Australian Dollar',
  },
} as const;

export type CurrencyCode = keyof typeof CURRENCY_CONFIG;

function clampFractionDigits(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(20, Math.floor(n)));
}

/**
 * Format amount in specified currency
 * 
 * @param amount - Numeric amount to format
 * @param currency - Currency code (default: PKR)
 * @param options - Additional Intl.NumberFormat options
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1000, 'PKR') // Returns '₨1,000.00'
 * formatCurrency(100, 'USD') // Returns '$100.00'
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'PKR',
  options?: Intl.NumberFormatOptions
): string {
  // Robust NaN handling
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }

  const config = CURRENCY_CONFIG[currency];

  if (!config) {
    console.warn(`Unknown currency: ${currency}, defaulting to PKR`);
    return formatCurrency(amount, 'PKR', options);
  }

  const { minimumFractionDigits: optMin, maximumFractionDigits: optMax, ...restOptions } = options || {};
  let minD = clampFractionDigits(optMin, config.decimal);
  let maxD = clampFractionDigits(optMax, config.decimal);
  if (minD > maxD) {
    maxD = minD;
  }

  // Use Intl.NumberFormat with regional config
  // For specific currencies like PKR, we might need to force the symbol if the locale is inconsistent
  const formatter = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'symbol',
    minimumFractionDigits: minD,
    maximumFractionDigits: maxD,
    ...restOptions,
  });

  // Fallback for PKR if symbol is not ₨
  if (currency === 'PKR') {
    const parts = new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: minD,
      maximumFractionDigits: maxD,
      ...restOptions,
    }).format(amount);
    return `₨${parts}`;
  }

  return formatter.format(amount);
}

/**
 * Format amount without currency symbol (for display in tables)
 * 
 * @param amount - Numeric amount
 * @param currency - Currency code (default: PKR)
 * @returns Formatted number string
 * 
 * @example
 * formatAmount(1000, 'PKR') // Returns '1,000.00'
 */
export function formatAmount(
  amount: number,
  currency: CurrencyCode = 'PKR'
): string {
  // Robust NaN handling
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }

  const config = CURRENCY_CONFIG[currency];
  const minD = clampFractionDigits(config.decimal, config.decimal);
  const maxD = clampFractionDigits(config.decimal, config.decimal);
  const formatter = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: minD,
    maximumFractionDigits: maxD,
  });

  return formatter.format(amount);
}

/**
 * Parse currency string to number
 * Removes currency symbols and formatting
 * 
 * @param value - Currency string (e.g., "₨1,000.00" or "1,000")
 * @param _currency - Expected currency code (for validation)
 * @returns Parsed number
 * 
 * @example
 * parseCurrency('₨1,000.00', 'PKR') // Returns 1000
 * parseCurrency('1,000', 'PKR') // Returns 1000
 */
export function parseCurrency(
  value: string,
  _currency: CurrencyCode = 'PKR'
): number {
  if (!value || typeof value !== 'string') {
    return 0;
  }

  // const config = CURRENCY_CONFIG[currency];

  // Remove currency symbols
  let cleaned = value
    .replace(/[₨₹$€£د.إ﷼,]/g, '')
    .replace(/\s/g, '')
    .trim();

  // Remove any remaining non-numeric characters except decimal point
  cleaned = cleaned.replace(/[^\d.]/g, '');

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert between currencies
 * 
 * @param amount - Amount to convert
 * @param from - Source currency
 * @param to - Target currency
 * @param exchangeRate - Exchange rate (to/from)
 * @returns Converted amount
 * 
 * @example
 * convertCurrency(100, 'USD', 'PKR', 280) // Returns 28000
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  exchangeRate: number
): number {
  if (from === to) return amount;
  if (exchangeRate <= 0) {
    console.warn('Invalid exchange rate, returning original amount');
    return amount;
  }

  return amount * exchangeRate;
}

/**
 * Get currency symbol
 * 
 * @param currency - Currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: CurrencyCode = 'PKR'): string {
  return CURRENCY_CONFIG[currency]?.symbol || '₨';
}

/**
 * Get currency name
 * 
 * @param currency - Currency code
 * @returns Currency name
 */
export function getCurrencyName(currency: CurrencyCode = 'PKR'): string {
  return CURRENCY_CONFIG[currency]?.name || 'Pakistani Rupee';
}

/**
 * Validate currency code
 * 
 * @param code - Currency code to validate
 * @returns True if valid currency code
 */
export function isValidCurrency(code: string): code is CurrencyCode {
  return code in CURRENCY_CONFIG;
}

/**
 * Format currency for display in invoices/receipts
 * Includes both symbol and formatted amount
 * 
 * @param amount - Amount to format
 * @param currency - Currency code
 * @param showSymbol - Whether to show currency symbol (default: true)
 * @returns Formatted string
 */
export function formatCurrencyForDisplay(
  amount: number,
  currency: CurrencyCode = 'PKR',
  showSymbol: boolean = true
): string {
  const formatted = formatAmount(amount, currency);
  return showSymbol ? `${getCurrencySymbol(currency)} ${formatted}` : formatted;
}

/**
 * Format large amounts with abbreviations (K, L, Cr)
 * 
 * @param amount - Amount to format
 * @param currency - Currency code
 * @returns Abbreviated string
 * 
 * @example
 * formatCurrencyAbbr(100000, 'PKR') // Returns '₨1.00 L'
 * formatCurrencyAbbr(10000000, 'PKR') // Returns '₨1.00 Cr'
 */
export function formatCurrencyAbbr(
  amount: number,
  currency: CurrencyCode = 'PKR'
): string {
  const symbol = getCurrencySymbol(currency);

  if (amount >= 10000000) {
    // Crores (1 Cr = 10 million)
    return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    // Lakhs (1 L = 100 thousand)
    return `${symbol}${(amount / 100000).toFixed(2)} L`;
  } else if (amount >= 1000) {
    // Thousands
    return `${symbol}${(amount / 1000).toFixed(2)} K`;
  }

  return formatCurrency(amount, currency);
}

/**
 * Calculate percentage of amount
 * Useful for tax calculations
 * 
 * @param amount - Base amount
 * @param percentage - Percentage value (e.g., 17 for 17%)
 * @returns Calculated amount
 */
export function calculatePercentage(
  amount: number,
  percentage: number
): number {
  return (amount * percentage) / 100;
}

/**
 * Add tax to amount
 * 
 * @param amount - Base amount
 * @param taxPercent - Tax percentage
 * @returns Amount with tax
 */
export function addTax(
  amount: number,
  taxPercent: number
): number {
  return amount + calculatePercentage(amount, taxPercent);
}

/**
 * Calculate tax amount
 * 
 * @param amount - Base amount
 * @param taxPercent - Tax percentage
 * @returns Tax amount
 */
export function calculateTax(
  amount: number,
  taxPercent: number
): number {
  return calculatePercentage(amount, taxPercent);
}

/**
 * Round to currency decimal places
 * 
 * @param amount - Amount to round
 * @param currency - Currency code
 * @returns Rounded amount
 */
export function roundCurrency(
  amount: number,
  currency: CurrencyCode = 'PKR'
): number {
  const decimals = CURRENCY_CONFIG[currency]?.decimal || 2;
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

