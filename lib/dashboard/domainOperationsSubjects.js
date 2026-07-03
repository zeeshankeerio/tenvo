/**
 * Storefront contact subject buckets for operations dashboard SQL.
 * Keep aligned with `app/api/storefront/[businessDomain]/contact/route.js` and booking verticals.
 */

/** @type {readonly string[]} */
export const CONTACT_PENDING_STATUSES = Object.freeze(['new', 'pending', 'open', 'in_progress']);

/** @type {readonly string[]} */
export const CONTACT_CLOSED_STATUSES = Object.freeze(['handled', 'closed', 'resolved', 'cancelled']);

/** @type {readonly string[]} */
export const PRESCRIPTION_SUBJECTS = Object.freeze(['prescription', 'refill']);

/** @type {readonly string[]} */
export const BOOKING_LEAD_SUBJECTS = Object.freeze([
  'appointment',
  'visit',
  'booking',
  'showroom',
  'consultation',
  'testdrive',
  'test-drive',
  'sell',
  'finance',
  'leasing',
  'insurance',
  'buy',
  'ppf',
  'conversion',
  'service',
]);

/** @type {readonly string[]} */
export const ALL_LEAD_SUBJECTS = Object.freeze([
  ...PRESCRIPTION_SUBJECTS,
  ...BOOKING_LEAD_SUBJECTS,
]);

/** @type {readonly string[]} */
export const STOREFRONT_GENERAL_SUBJECTS = Object.freeze([
  'general',
  'order',
  'product',
  'return',
  'wholesale',
  'other',
]);

/** Accepted by POST /api/storefront/[businessDomain]/contact — keep in sync with vertical booking flows. */
export const STOREFRONT_CONTACT_SUBJECTS = Object.freeze([
  ...STOREFRONT_GENERAL_SUBJECTS,
  ...ALL_LEAD_SUBJECTS,
]);

/**
 * @param {readonly string[]} values
 */
export function sqlStringInList(values) {
  return values.map((s) => `'${String(s).replace(/'/g, "''")}'`).join(', ');
}

/**
 * @param {readonly string[]} values
 */
export function sqlStatusInList(values) {
  return sqlStringInList(values.map((s) => s.toLowerCase()));
}
