import { describe, expect, it } from 'bun:test';
import {
  isDemoStoreDomain,
  isPlaceholderEmail,
  isPlaceholderPhone,
  sanitizePublicEmail,
  sanitizePublicPhone,
} from '@/lib/storefront/storeContactSanitize';
import { resolveStoreContact } from '@/lib/storefront/businessContact';

describe('storeContactSanitize', () => {
  it('flags seed placeholder phones', () => {
    expect(isPlaceholderPhone('+923001234567')).toBe(true);
    expect(isPlaceholderPhone('+92 300 1234567')).toBe(true);
    expect(isPlaceholderPhone('+6591234567')).toBe(false);
  });

  it('flags example.com emails', () => {
    expect(isPlaceholderEmail('walkin@example.com')).toBe(true);
    expect(isPlaceholderEmail('orders@tanmotorworks.sg')).toBe(false);
  });

  it('detects demo store domains', () => {
    expect(isDemoStoreDomain('demo-pharmacy')).toBe(true);
    expect(isDemoStoreDomain('my-pharmacy')).toBe(false);
  });
});

describe('resolveStoreContact', () => {
  it('hides placeholder phone on demo stores', () => {
    const contact = resolveStoreContact({
      business: {
        domain: 'demo-pharmacy',
        business_name: 'Tenvo Pharmacy',
        email: 'owner@company.com',
        phone: '+923001234567',
        city: 'Lahore',
        country: 'Pakistan',
      },
      settings: {},
    });
    expect(contact.phone).toBe('');
    expect(contact.email).toBe('');
    expect(contact.city).toBe('Lahore');
    expect(contact.showContactPageCta).toBe(true);
  });

  it('shows explicit settings contact', () => {
    const contact = resolveStoreContact({
      business: {
        domain: 'acme-pharmacy',
        phone: '+923001234567',
      },
      settings: {
        contact: { phone: '+92 42 3575 1200', email: 'hello@acme.pk' },
      },
    });
    expect(contact.phone).toBe('+92 42 3575 1200');
    expect(sanitizePublicPhone(contact.phone)).toBe('+92 42 3575 1200');
  });
});
