/**
 * Storefront order shipping/billing address helpers.
 *
 * Live DB columns are JSONB (legacy storefront table DDL). Prisma historically
 * typed them as String — we persist structured JSON so inserts are valid JSONB,
 * and display code accepts object | JSON string | legacy plain text.
 */

/**
 * @param {Record<string, unknown> | null | undefined} addr
 * @returns {Record<string, string | null> | null}
 */
export function normalizeStorefrontOrderAddress(addr) {
  if (!addr || typeof addr !== 'object') return null;
  const postal = addr.postalCode ?? addr.postal_code ?? null;
  return {
    address: addr.address != null && String(addr.address).trim() ? String(addr.address).trim() : null,
    city: addr.city != null && String(addr.city).trim() ? String(addr.city).trim() : null,
    state: addr.state != null && String(addr.state).trim() ? String(addr.state).trim() : null,
    postalCode: postal != null && String(postal).trim() ? String(postal).trim() : null,
    country: addr.country != null && String(addr.country).trim() ? String(addr.country).trim() : null,
  };
}

/**
 * JSON string for `storefront_orders.shipping_address` / `billing_address` (JSONB).
 * @param {Record<string, unknown> | null | undefined} addr
 * @returns {string | null}
 */
export function serializeStorefrontOrderAddress(addr) {
  const normalized = normalizeStorefrontOrderAddress(addr);
  if (!normalized) return null;
  const hasAny = Object.values(normalized).some((v) => v != null && v !== '');
  if (!hasAny) return null;
  return JSON.stringify(normalized);
}

/**
 * Human-readable single-line address (notes, emails, exports).
 * @param {Record<string, unknown> | null | undefined} addr
 * @returns {string}
 */
export function formatAddressBlock(addr) {
  const normalized = normalizeStorefrontOrderAddress(addr);
  if (!normalized) return '';
  return [
    normalized.address,
    normalized.city,
    normalized.state,
    normalized.postalCode,
    normalized.country,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * @param {string | object | null | undefined} raw
 * @returns {{ lines: string[]; text: string } | null}
 */
export function parseStorefrontShippingAddress(raw) {
  if (raw == null || raw === '') return null;

  if (typeof raw === 'object') {
    const lines = [
      raw.address,
      [raw.city, raw.postalCode || raw.postal_code].filter(Boolean).join(', '),
      raw.state,
      raw.country,
    ].filter(Boolean);
    return lines.length ? { lines, text: lines.join('\n') } : null;
  }

  const str = String(raw).trim();
  if (!str) return null;

  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === 'object') {
      return parseStorefrontShippingAddress(parsed);
    }
  } catch {
    /* legacy plain text from older formatAddressBlock inserts */
  }

  const parts = str.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length ? { lines: parts, text: str } : null;
}
