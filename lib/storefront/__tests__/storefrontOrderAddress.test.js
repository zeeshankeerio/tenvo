import { describe, it, expect } from 'vitest';
import {
  serializeStorefrontOrderAddress,
  parseStorefrontShippingAddress,
  formatAddressBlock,
} from '@/lib/storefront/storefrontOrderAddress.js';

describe('storefront order address JSONB wiring', () => {
  it('serializes structured JSON valid for jsonb columns', () => {
    const json = serializeStorefrontOrderAddress({
      address: 'Shop 12, Jama Cloth',
      city: 'Lahore',
      postalCode: '54000',
      country: 'Pakistan',
    });
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed).toMatchObject({
      address: 'Shop 12, Jama Cloth',
      city: 'Lahore',
      postalCode: '54000',
      country: 'Pakistan',
    });
  });

  it('rejects plain comma text as invalid json (legacy bug)', () => {
    const plain = 'Shop 12, Lahore, Pakistan';
    expect(() => JSON.parse(plain)).toThrow();
  });

  it('parses jsonb objects and legacy plain text for display', () => {
    const fromObj = parseStorefrontShippingAddress({
      address: 'A',
      city: 'Lahore',
      country: 'PK',
    });
    expect(fromObj.lines).toContain('A');
    expect(fromObj.lines).toContain('Lahore');

    const fromPlain = parseStorefrontShippingAddress('Street 1, Karachi, PK');
    expect(fromPlain.text).toContain('Karachi');
  });

  it('formatAddressBlock stays human-readable for notes/exports', () => {
    expect(
      formatAddressBlock({ address: 'A', city: 'Lahore', country: 'PK' })
    ).toBe('A, Lahore, PK');
  });
});
