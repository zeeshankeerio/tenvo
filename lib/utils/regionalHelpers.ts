/**
 * Regional standards — single source of truth for country-aware registration,
 * tax labels, currency defaults, and time zones. Add new markets by extending
 * REGIONAL_REGISTRY and ALIAS_TO_ISO only.
 */

import type { CurrencyCode } from '../currency';
import { CURRENCY_CONFIG } from '../currency';

export type TaxStrategy = 'GST_PST' | 'VAT';

export interface RegionalStandards {
  countryCode: string;
  countryName: string;
  currency: CurrencyCode;
  currencySymbol: string;
  taxLabel: string;
  taxStrategy: TaxStrategy;
  taxIdLabel: string;
  phoneCode: string;
  timeZone: string;
  defaultTaxRate: number;
  /** BCP 47 — for dates, numbers, and future formatting */
  locale: string;
}

/** ISO 3166-1 alpha-2 → defaults (currency must exist in CURRENCY_CONFIG) */
export const REGIONAL_REGISTRY: Record<string, RegionalStandards> = {
  PK: {
    countryCode: 'PK',
    countryName: 'Pakistan',
    currency: 'PKR',
    currencySymbol: '₨',
    taxLabel: 'GST / PST',
    taxStrategy: 'GST_PST',
    taxIdLabel: 'NTN',
    phoneCode: '+92',
    timeZone: 'Asia/Karachi',
    defaultTaxRate: 18,
    locale: 'en-PK',
  },
  AE: {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'د.إ',
    taxLabel: 'VAT',
    taxStrategy: 'VAT',
    taxIdLabel: 'TRN',
    phoneCode: '+971',
    timeZone: 'Asia/Dubai',
    defaultTaxRate: 5,
    locale: 'en-AE',
  },
  SA: {
    countryCode: 'SA',
    countryName: 'Saudi Arabia',
    currency: 'SAR',
    currencySymbol: '﷼',
    taxLabel: 'VAT',
    taxStrategy: 'VAT',
    taxIdLabel: 'VAT / CR',
    phoneCode: '+966',
    timeZone: 'Asia/Riyadh',
    defaultTaxRate: 15,
    locale: 'ar-SA',
  },
  US: {
    countryCode: 'US',
    countryName: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    taxLabel: 'Sales tax',
    taxStrategy: 'VAT',
    taxIdLabel: 'EIN',
    phoneCode: '+1',
    timeZone: 'America/New_York',
    defaultTaxRate: 0,
    locale: 'en-US',
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    taxLabel: 'VAT',
    taxStrategy: 'VAT',
    taxIdLabel: 'VAT / Company No.',
    phoneCode: '+44',
    timeZone: 'Europe/London',
    defaultTaxRate: 20,
    locale: 'en-GB',
  },
  IN: {
    countryCode: 'IN',
    countryName: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    taxLabel: 'GST',
    taxStrategy: 'GST_PST',
    taxIdLabel: 'GSTIN',
    phoneCode: '+91',
    timeZone: 'Asia/Kolkata',
    defaultTaxRate: 18,
    locale: 'en-IN',
  },
  DE: {
    countryCode: 'DE',
    countryName: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    taxLabel: 'VAT (USt.)',
    taxStrategy: 'VAT',
    taxIdLabel: 'VAT ID (USt-IdNr.)',
    phoneCode: '+49',
    timeZone: 'Europe/Berlin',
    defaultTaxRate: 19,
    locale: 'de-DE',
  },
  FR: {
    countryCode: 'FR',
    countryName: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    taxLabel: 'TVA',
    taxStrategy: 'VAT',
    taxIdLabel: 'SIREN / VAT',
    phoneCode: '+33',
    timeZone: 'Europe/Paris',
    defaultTaxRate: 20,
    locale: 'fr-FR',
  },
  NL: {
    countryCode: 'NL',
    countryName: 'Netherlands',
    currency: 'EUR',
    currencySymbol: '€',
    taxLabel: 'VAT (BTW)',
    taxStrategy: 'VAT',
    taxIdLabel: 'VAT / KvK',
    phoneCode: '+31',
    timeZone: 'Europe/Amsterdam',
    defaultTaxRate: 21,
    locale: 'nl-NL',
  },
  IE: {
    countryCode: 'IE',
    countryName: 'Ireland',
    currency: 'EUR',
    currencySymbol: '€',
    taxLabel: 'VAT',
    taxStrategy: 'VAT',
    taxIdLabel: 'VAT / TRN',
    phoneCode: '+353',
    timeZone: 'Europe/Dublin',
    defaultTaxRate: 23,
    locale: 'en-IE',
  },
  ES: {
    countryCode: 'ES',
    countryName: 'Spain',
    currency: 'EUR',
    currencySymbol: '€',
    taxLabel: 'IVA',
    taxStrategy: 'VAT',
    taxIdLabel: 'NIF / VAT',
    phoneCode: '+34',
    timeZone: 'Europe/Madrid',
    defaultTaxRate: 21,
    locale: 'es-ES',
  },
  IT: {
    countryCode: 'IT',
    countryName: 'Italy',
    currency: 'EUR',
    currencySymbol: '€',
    taxLabel: 'IVA',
    taxStrategy: 'VAT',
    taxIdLabel: 'Partita IVA / VAT',
    phoneCode: '+39',
    timeZone: 'Europe/Rome',
    defaultTaxRate: 22,
    locale: 'it-IT',
  },
  CA: {
    countryCode: 'CA',
    countryName: 'Canada',
    currency: 'CAD',
    currencySymbol: '$',
    taxLabel: 'GST / HST / PST',
    taxStrategy: 'GST_PST',
    taxIdLabel: 'BN / GST number',
    phoneCode: '+1',
    timeZone: 'America/Toronto',
    defaultTaxRate: 5,
    locale: 'en-CA',
  },
  AU: {
    countryCode: 'AU',
    countryName: 'Australia',
    currency: 'AUD',
    currencySymbol: '$',
    taxLabel: 'GST',
    taxStrategy: 'GST_PST',
    taxIdLabel: 'ABN',
    phoneCode: '+61',
    timeZone: 'Australia/Sydney',
    defaultTaxRate: 10,
    locale: 'en-AU',
  },
};

/** Default when no country is provided — Pakistan-first product heritage */
export const DEFAULT_REGISTRATION_COUNTRY_ISO = 'PK' as const;

const ALIAS_TO_ISO: Record<string, keyof typeof REGIONAL_REGISTRY> = {
  PK: 'PK',
  PAKISTAN: 'PK',
  KARACHI: 'PK',
  LAHORE: 'PK',
  ISLAMABAD: 'PK',
  AE: 'AE',
  UAE: 'AE',
  'UNITED ARAB EMIRATES': 'AE',
  DUBAI: 'AE',
  SA: 'SA',
  'SAUDI ARABIA': 'SA',
  SAUDI: 'SA',
  RIYADH: 'SA',
  US: 'US',
  USA: 'US',
  'UNITED STATES': 'US',
  'UNITED STATES OF AMERICA': 'US',
  'NEW YORK': 'US',
  GB: 'GB',
  UK: 'GB',
  'UNITED KINGDOM': 'GB',
  ENGLAND: 'GB',
  IN: 'IN',
  INDIA: 'IN',
  MUMBAI: 'IN',
  DE: 'DE',
  GERMANY: 'DE',
  FR: 'FR',
  FRANCE: 'FR',
  NL: 'NL',
  NETHERLANDS: 'NL',
  HOLLAND: 'NL',
  IE: 'IE',
  IRELAND: 'IE',
  ES: 'ES',
  SPAIN: 'ES',
  IT: 'IT',
  ITALY: 'IT',
  CA: 'CA',
  CANADA: 'CA',
  AU: 'AU',
  AUSTRALIA: 'AU',
};

/**
 * Normalize free-text, legacy wizard labels, or ISO codes to a registry key.
 */
export function normalizeCountryToIso(input?: string | null): keyof typeof REGIONAL_REGISTRY {
  const raw = (input ?? '').trim();
  if (!raw) return DEFAULT_REGISTRATION_COUNTRY_ISO;

  const upper = raw.toUpperCase();
  if (upper in REGIONAL_REGISTRY) return upper as keyof typeof REGIONAL_REGISTRY;

  const fromAlias = ALIAS_TO_ISO[upper] ?? ALIAS_TO_ISO[raw.toLowerCase()];
  if (fromAlias) return fromAlias;

  return DEFAULT_REGISTRATION_COUNTRY_ISO;
}

/**
 * Map persisted registration values from older wizards (full country names) to ISO.
 */
export function coerceRegistrationCountryValue(raw?: string | null): keyof typeof REGIONAL_REGISTRY {
  return normalizeCountryToIso(raw);
}

export function getRegionalStandards(cityOrCountry?: string | null): RegionalStandards {
  const iso = normalizeCountryToIso(cityOrCountry);
  const row = REGIONAL_REGISTRY[iso];
  if (row) return row;
  // PK is always present; Record<> indexing is widened to undefined for TS.
  return REGIONAL_REGISTRY[DEFAULT_REGISTRATION_COUNTRY_ISO]!;
}

export function getTaxLabel(standards: RegionalStandards): string {
  return standards.taxLabel;
}

export function getTaxIdLabel(standards: RegionalStandards): string {
  return standards.taxIdLabel;
}

/** Wizard / admin dropdowns — sorted with Pakistan first, then A–Z */
export function getRegistrationCountryOptions(): Array<{
  value: keyof typeof REGIONAL_REGISTRY;
  label: string;
  detail: string;
}> {
  const rows = Object.values(REGIONAL_REGISTRY).map((r) => ({
    value: r.countryCode as keyof typeof REGIONAL_REGISTRY,
    label: r.countryName,
    detail: `${r.currency} · ${r.taxLabel}`,
  }));
  return rows.sort((a, b) => {
    if (a.value === DEFAULT_REGISTRATION_COUNTRY_ISO) return -1;
    if (b.value === DEFAULT_REGISTRATION_COUNTRY_ISO) return 1;
    return a.label.localeCompare(b.label);
  });
}

const GLOBAL_TRADE_CURRENCIES: CurrencyCode[] = [
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SAR',
  'INR',
  'PKR',
  'CAD',
  'AUD',
];

/**
 * Operating-currency choices at signup: home currency + common trade currencies
 * (all must exist in CURRENCY_CONFIG).
 */
export function getRegistrationCurrencyOptions(iso: string): Array<{ code: CurrencyCode; label: string }> {
  const r = getRegionalStandards(iso);
  const codes = new Set<CurrencyCode>([r.currency, ...GLOBAL_TRADE_CURRENCIES]);
  const ordered = Array.from(codes).filter((c) => c in CURRENCY_CONFIG);
  const primary = r.currency;
  ordered.sort((a, b) => {
    if (a === primary) return -1;
    if (b === primary) return 1;
    return a.localeCompare(b);
  });

  return ordered.map((code) => ({
    code,
    label: `${code} — ${CURRENCY_CONFIG[code]?.name ?? code}`,
  }));
}

/**
 * Plan card display: PKR list prices for Pakistan; USD reference elsewhere.
 */
export function getPlanDisplayForRegion(
  pricePkr: number,
  priceUsd: number,
  regional: RegionalStandards
): { amount: number; currency: CurrencyCode; footnote: string | null } {
  if (regional.countryCode === 'PK' && regional.currency === 'PKR') {
    return { amount: pricePkr, currency: 'PKR', footnote: null };
  }
  return {
    amount: priceUsd,
    currency: 'USD',
    footnote: 'International list price in USD; local taxes may apply.',
  };
}
