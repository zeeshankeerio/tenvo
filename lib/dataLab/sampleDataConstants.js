/** Tags and markers for opt-in business sample data (Settings → Load demo data). */

export const SAMPLE_SOURCE = 'business-sample-data';

/** Warehouse codes created by sample seed, safe to remove when clearing sample data. */
export const SAMPLE_WAREHOUSE_CODES = new Set([
  'WH-MAIN',
  'WH-KHI',
  'WH-TUAS',
  'WH-ORCH',
  'WH-DXB',
  'WH-AUH',
]);

export const SAMPLE_CUSTOMER_EMAILS = new Set([
  'ahmed.traders@example.com',
  'sara@example.com',
  'walkin@example.com',
  'orders@tanmotorworks.sg',
  'sales@lioncityauto.sg',
  'procurement@gulftrading.ae',
  'orders@desertretail.ae',
]);

export const SAMPLE_VENDOR_NAMES = new Set([
  'National Suppliers Co.',
  'Prime Fabrics Ltd.',
]);

/**
 * @param {string} batchId
 */
export function sampleNote(batchId) {
  return `__tenvo_sample:${batchId}__`;
}

/**
 * @param {string} batchId
 * @param {Record<string, unknown>} [extra]
 */
export function sampleDomainData(batchId, extra = {}) {
  return {
    ...extra,
    sample_batch_id: batchId,
    sample_source: SAMPLE_SOURCE,
    seedCatalog: true,
  };
}

/**
 * @param {string | null | undefined} email
 */
export function isSampleCustomerEmail(email) {
  if (!email) return false;
  const e = String(email).trim().toLowerCase();
  return SAMPLE_CUSTOMER_EMAILS.has(e) || e.endsWith('@example.com');
}

/**
 * @param {Record<string, unknown> | null | undefined} settings
 */
export function parseSampleDataSettings(settings) {
  const s =
    settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
  const sample = s.sample_data && typeof s.sample_data === 'object' ? s.sample_data : {};
  return {
    loaded: Boolean(sample.loaded_at),
    loadedAt: sample.loaded_at || null,
    batchId: sample.batch_id || null,
    version: sample.version || null,
    summary: sample.summary && typeof sample.summary === 'object' ? sample.summary : null,
  };
}
