/**
 * Display helpers for storefront order shipping_address values.
 * Orders API stores a comma-separated plain string (see formatAddressBlock).
 */

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
    /* plain text from formatAddressBlock */
  }

  const parts = str.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length ? { lines: parts, text: str } : null;
}
