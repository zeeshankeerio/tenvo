import { describe, expect, it } from 'vitest';
import {
  isStorefrontOrderNumberConflict,
  storefrontOrderTenantKey,
} from '../storefrontOrderNumber.js';

describe('storefrontOrderNumber', () => {
  it('detects global order_number unique violations', () => {
    expect(
      isStorefrontOrderNumberConflict({
        code: '23505',
        constraint: 'storefront_orders_order_number_key',
      })
    ).toBe(true);
  });

  it('detects per-tenant composite order_number violations', () => {
    expect(
      isStorefrontOrderNumberConflict({
        code: '23505',
        constraint: 'storefront_orders_business_id_order_number_key',
      })
    ).toBe(true);
  });

  it('detects index-only order_number violations via detail', () => {
    expect(
      isStorefrontOrderNumberConflict({
        code: '23505',
        detail: 'Key (order_number)=(ORD-20260705-0001) already exists.',
      })
    ).toBe(true);
  });

  it('derives stable tenant key from business id', () => {
    expect(storefrontOrderTenantKey('71f6fc60-1001-4abc-8def-0123456789ab')).toBe('71F6FC60');
  });

  it('ignores unrelated unique violations', () => {
    expect(
      isStorefrontOrderNumberConflict({
        code: '23505',
        constraint: 'customers_email_key',
      })
    ).toBe(false);
  });

  it('ignores non-unique errors', () => {
    expect(isStorefrontOrderNumberConflict({ code: '23503' })).toBe(false);
  });
});
