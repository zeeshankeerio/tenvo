/**
 * Load full sample workspace for a tenant business (Settings opt-in).
 */
import { randomUUID } from 'crypto';
import { createPool, withTransaction } from './pool.mjs';
import { buildDemoCatalogPayload } from '../utils/registrationSeed.js';
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { sampleDomainData } from './sampleDataConstants.js';
import { seedCategories, seedProducts } from './catalogSeed.mjs';
import { seedOperationalData } from './seedOperations.mjs';

/**
 * @param {{ businessId: string, userId: string, domainKey: string, countryIso: string, replace?: boolean }} params
 */
export async function loadBusinessSampleData({ businessId, userId, domainKey, countryIso, replace = false }) {
  const batchId = randomUUID();
  const canonicalKey = resolveDomainKey(domainKey);
  const iso = String(countryIso || 'PK').trim().toUpperCase();

  const payload = buildDemoCatalogPayload({
    businessId,
    domainKey: canonicalKey,
    countryIso: iso,
  });

  if (!payload.items.length) {
    throw new Error(`No sample catalog is available for vertical "${canonicalKey}" yet.`);
  }

  const items = payload.items.map((item) => ({
    ...item,
    domain_data: sampleDomainData(batchId, item.domain_data || {}),
  }));

  const pool = createPool();
  const client = await pool.connect();

  try {
    await withTransaction(client, async (tx) => {
      if (replace) {
        await tx.query(
          `UPDATE products SET is_deleted = true, is_active = false, deleted_at = NOW()
           WHERE business_id = $1::uuid
             AND domain_data->>'sample_source' = 'business-sample-data'
             AND (is_deleted = false OR is_deleted IS NULL)`,
          [businessId]
        );
      }

      await seedCategories(tx, businessId, payload.categories);
      await seedProducts(tx, businessId, items, { refresh: false });
    });
  } finally {
    client.release();
    await pool.end();
  }

  const ops = await seedOperationalData({
    businessId,
    userId,
    sampleBatchId: batchId,
    replaceSampleOps: replace,
  });

  return {
    batchId,
    categoryCount: payload.categories.length,
    productCount: items.length,
    ...ops,
  };
}
