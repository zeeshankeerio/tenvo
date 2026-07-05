import { describe, it, expect } from 'vitest';
import { isStorefrontProductUuid, resolveStorefrontProductId } from '../storefrontProductRef.js';

describe('storefrontProductRef', () => {
  it('accepts canonical UUIDs', () => {
    expect(isStorefrontProductUuid('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(true);
    expect(isStorefrontProductUuid('TF-GYM-MEM-M-1M')).toBe(false);
  });

  it('rejects UUID from another tenant', async () => {
    const foreignUuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const client = {
      query: async (sql) => {
        if (sql.includes('id = $1::uuid AND business_id = $2::uuid')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    };
    const id = await resolveStorefrontProductId(client, foreignUuid, 'biz-uuid');
    expect(id).toBeNull();
  });

  it('accepts UUID owned by tenant', async () => {
    const ownedUuid = '11111111-2222-4333-8444-555555555555';
    const client = {
      query: async (sql, params) => {
        if (sql.includes('id = $1::uuid AND business_id = $2::uuid')) {
          return { rows: [{ id: params[0] }] };
        }
        return { rows: [] };
      },
    };
    const id = await resolveStorefrontProductId(client, ownedUuid, 'biz-uuid');
    expect(id).toBe(ownedUuid);
  });

  it('resolves SKU within tenant', async () => {
    const queries = [];
    const client = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('sku = $2')) {
          return { rows: [{ id: '11111111-2222-4333-8444-555555555555' }] };
        }
        return { rows: [] };
      },
    };
    const id = await resolveStorefrontProductId(client, 'TF-GYM-MEM-M-1M', 'biz-uuid');
    expect(id).toBe('11111111-2222-4333-8444-555555555555');
    expect(queries.some((q) => q.params?.[1] === 'TF-GYM-MEM-M-1M')).toBe(true);
  });
});
