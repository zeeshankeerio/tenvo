import { describe, it, expect } from 'vitest';
import { resolveStorefrontCurrency, resolveStorefrontLocale } from '@/lib/storefront/storefrontRegional';

describe('storefrontRegional', () => {
  it('resolves AED from registration country_iso when financials omit currency', () => {
    const settings = {
      registration: { country_iso: 'AE', country_name: 'United Arab Emirates' },
    };
    expect(resolveStorefrontCurrency(settings, null)).toBe('AED');
    expect(resolveStorefrontLocale(settings, null)).toBe('en-AE');
  });

  it('prefers financials.currency over registry defaults', () => {
    const settings = {
      registration: { country_iso: 'AE' },
      financials: { currency: 'USD' },
    };
    expect(resolveStorefrontCurrency(settings, null)).toBe('USD');
  });

  it('prefers storefront.currency override', () => {
    const settings = {
      registration: { country_iso: 'PK' },
      storefront: { currency: 'EUR' },
    };
    expect(resolveStorefrontCurrency(settings, null)).toBe('EUR');
  });
});
