/**
 * Digital product fulfillment helpers (keys, accounts, licenses, etc.).
 * Fulfillment is flagged on `products.domain_data`.
 */

const DIGITAL_FLAGS = new Set(['digital', 'license', 'key', 'account', 'download']);

/**
 * @param {unknown} domainData
 * @returns {boolean}
 */
export function isDigitalFulfillment(domainData) {
  if (!domainData || typeof domainData !== 'object' || Array.isArray(domainData)) {
    return false;
  }
  const data = /** @type {Record<string, unknown>} */ (domainData);
  const fulfillment = String(data.fulfillment_type || data.fulfillmentType || data.product_type || '')
    .trim()
    .toLowerCase();
  if (DIGITAL_FLAGS.has(fulfillment)) return true;
  if (data.digital === true || data.is_digital === true) return true;
  if (String(data.delivery || '').trim().toLowerCase() === 'instant') return true;
  return false;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {Array<{ productId: string }>} lines
 */
export async function areAllLinesDigital(client, businessId, lines) {
  if (!lines?.length) return false;
  const productIds = [...new Set(lines.map((l) => l.productId).filter(Boolean))];
  const res = await client.query(
    `SELECT id, domain_data FROM products
     WHERE business_id = $1::uuid AND id = ANY($2::uuid[])`,
    [businessId, productIds]
  );
  if (res.rows.length !== productIds.length) return false;
  return res.rows.every((row) => isDigitalFulfillment(row.domain_data));
}

export function digitalShippingAddress(customer) {
  const name = [customer?.firstName, customer?.lastName].filter(Boolean).join(' ').trim();
  return {
    address: 'Digital delivery — no physical shipping',
    city: 'Digital',
    postalCode: '00000',
    country: customer?.country || 'PK',
    label: name || customer?.email || 'Digital customer',
  };
}

/**
 * Detect client-submitted placeholder addresses used for digital-only UI.
 * @param {Record<string, unknown> | null | undefined} addr
 */
export function isDigitalPlaceholderAddress(addr) {
  if (!addr || typeof addr !== 'object') return false;
  const city = String(addr.city || '').trim().toLowerCase();
  const address = String(addr.address || '').trim().toLowerCase();
  if (city === 'digital') return true;
  if (address.includes('digital delivery')) return true;
  return false;
}

/**
 * Classify cart lines as digital / physical / mixed from DB domain_data.
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {Array<{ productId: string }>} lines
 */
export async function classifyOrderLineFulfillment(client, businessId, lines) {
  if (!lines?.length) {
    return { allDigital: false, hasDigital: false, hasPhysical: false, mixed: false };
  }

  const productIds = [...new Set(lines.map((l) => l.productId).filter(Boolean))];
  const res = await client.query(
    `SELECT id, domain_data FROM products
     WHERE business_id = $1::uuid AND id = ANY($2::uuid[])`,
    [businessId, productIds]
  );

  if (res.rows.length !== productIds.length) {
    return { allDigital: false, hasDigital: false, hasPhysical: true, mixed: false };
  }

  let hasDigital = false;
  let hasPhysical = false;

  for (const row of res.rows) {
    if (isDigitalFulfillment(row.domain_data)) {
      hasDigital = true;
    } else {
      hasPhysical = true;
    }
  }

  return {
    allDigital: hasDigital && !hasPhysical,
    hasDigital,
    hasPhysical,
    mixed: hasDigital && hasPhysical,
  };
}
