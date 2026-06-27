const EM_DASH = '\u2014';
const EN_DASH = '\u2013';

/**
 * Replace em/en dashes in user-facing copy. Em dashes read as AI-generated;
 * use commas, periods, or hyphens instead.
 */
export function normalizeProseCopy(text) {
  if (text == null) return text;
  if (typeof text !== 'string') return text;

  let out = text
    // "foo — bar" → "foo, bar"
    .replace(/\s*\u2014\s*/g, ', ')
    // en-dash ranges: "1–2 days" → "1-2 days"
    .replace(/(\d)\u2013(\d)/g, '$1-$2')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-');

  out = out.replace(/,\s*,+/g, ', ').replace(/,\s*([.!?])/g, '$1');
  return out.trim();
}

/** Empty table / KPI placeholder (not an em dash). */
export const EMPTY_VALUE = '-';

/**
 * Coerce unknown values for display; normalizes dash-like placeholders.
 */
export function formatDisplayValue(value, fallback = EMPTY_VALUE) {
  if (value == null || value === '') return fallback;
  if (value === EM_DASH || value === EN_DASH || value === '—' || value === '–') {
    return fallback;
  }
  if (typeof value === 'string') return normalizeProseCopy(value);
  return value;
}
