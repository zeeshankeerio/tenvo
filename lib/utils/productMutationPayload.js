/**
 * Trim product objects before server actions.
 * ProductService.updateProduct strips relation mirrors from Prisma `data`, but the client
 * still serializes them in the server-action POST — large payloads + many parallel calls
 * often surface as "Failed to fetch".
 */

const UPDATE_RELATION_KEYS = new Set([
  'batches',
  'serial_numbers',
  'serialNumbers',
  'stock_locations',
  'variants',
  'product_batches',
  'product_serials',
  'product_stock_locations',
  'product_variants',
]);

const NOISE_KEYS = new Set([
  '_tempId',
  'value',
  'percentage',
  'storefront_published',
  'created_at',
  'updated_at',
  'deleted_at',
  'embedding',
]);

const PRISMA_RELATION_ROOT_KEYS = new Set([
  'product_batches',
  'product_serials',
  'product_stock_locations',
  'product_variants',
]);

function omitUndefinedFunctions(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (typeof v === 'function') continue;
    out[k] = v;
  }
  return out;
}

/** Payload for updateProductAction — matches fields ProductService already drops before DB write */
export function leanProductPayloadForUpdate(updates) {
  if (!updates || typeof updates !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(updates)) {
    if (UPDATE_RELATION_KEYS.has(k) || NOISE_KEYS.has(k)) continue;
    if (k === 'id') continue;
    if (v === undefined) continue;
    if (typeof v === 'function') continue;
    out[k] = v;
  }
  return out;
}

/** Payload for createProductAction — keeps batches/serials/variants JSON; drops Prisma include mirrors */
export function leanProductPayloadForCreate(productData) {
  if (!productData || typeof productData !== 'object') return {};
  const out = omitUndefinedFunctions({ ...productData });
  for (const k of NOISE_KEYS) delete out[k];
  delete out.embedding;
  for (const k of PRISMA_RELATION_ROOT_KEYS) delete out[k];
  // Server assigns id
  delete out.id;
  return out;
}

/** UUID shape from Postgres `uuid_generate_v4()` — rejects temp keys and numeric-only ids */
export function isPersistedProductUuid(id) {
    if (id == null || id === '') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id).trim());
}

/** Unwrap composite upsert params accidentally passed to flat save handlers */
export function flattenCompositeProductPayload(input, businessId) {
  if (!input || typeof input !== 'object') return input;
  if (input.productData && typeof input.productData === 'object') {
    return {
      ...input.productData,
      business_id: businessId ?? input.productData.business_id,
      id: input.productId || input.productData.id || input.id,
      batches: input.batches ?? input.productData.batches,
      serialNumbers: input.serialNumbers ?? input.productData.serialNumbers,
      serial_numbers:
        input.serialNumbers ??
        input.serial_numbers ??
        input.productData.serial_numbers ??
        input.productData.serialNumbers,
    };
  }
  return input;
}

/** Map thrown errors from server actions / fetch to user-facing text */
export function formatInventoryActionError(error) {
  const msg = (error && error.message) || String(error || '');
  const name = error && error.name;
  if (
    msg === 'Failed to fetch' ||
    (typeof msg === 'string' && msg.includes('Failed to fetch')) ||
    (name === 'TypeError' && /fetch|network|load failed/i.test(msg))
  ) {
    return 'Network error: the server did not respond. Check your connection, wait a moment, or save in smaller batches.';
  }
  return msg || 'Request failed';
}

/** Run async work in fixed-size windows to avoid flooding HTTP/server-action concurrency */
export async function runWithConcurrency(items, limit, worker) {
  const results = [];
  const n = Math.max(1, Number(limit) || 4);
  for (let i = 0; i < items.length; i += n) {
    const slice = items.slice(i, i + n);
    const settled = await Promise.allSettled(slice.map((item, j) => worker(item, i + j)));
    results.push(...settled);
  }
  return results;
}
