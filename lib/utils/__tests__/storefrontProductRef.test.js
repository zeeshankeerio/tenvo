import test from 'node:test';
import assert from 'node:assert/strict';
import { isStorefrontProductUuid, resolveStorefrontProductId } from '../storefrontProductRef.js';

test('isStorefrontProductUuid accepts canonical UUIDs', () => {
  assert.equal(
    isStorefrontProductUuid('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
    true
  );
  assert.equal(isStorefrontProductUuid('TF-GYM-MEM-M-1M'), false);
});

test('resolveStorefrontProductId resolves SKU within tenant', async () => {
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
  assert.equal(id, '11111111-2222-4333-8444-555555555555');
  assert.ok(queries.some((q) => q.params?.[1] === 'TF-GYM-MEM-M-1M'));
});
