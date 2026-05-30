import { Prisma } from '@prisma/client';

/**
 * Recursively replace Prisma.Decimal with plain numbers for Server Action / RSC payloads.
 * Client Components cannot receive Decimal instances.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
export function serializeDecimalsDeep(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value.map((v) => serializeDecimalsDeep(v));
  }
  const out = {};
  for (const key of Object.keys(value)) {
    out[key] = serializeDecimalsDeep(/** @type {Record<string, unknown>} */(value)[key]);
  }
  return out;
}
