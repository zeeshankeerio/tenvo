/**
 * Storefront product row / rail layout — 6 equal columns on large screens, no dead space.
 */

export const STORE_PRODUCT_ROW_COLUMNS = 6;

/** Scrollable rail: each column = even share of visible width (2 mobile, 3 sm, 6 lg). */
export const STORE_PRODUCT_RAIL_TRACK_CLASS =
  'grid grid-flow-col auto-cols-[calc((100%-0.75rem)/2)] sm:auto-cols-[calc((100%-2rem)/3)] lg:auto-cols-[calc((100%-5*0.875rem)/6)] gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory motion-reduce:scroll-auto';

export const STORE_PRODUCT_RAIL_ITEM_CLASS = 'min-w-0 snap-start';

/** Wider vehicle cards: 4 equal columns on lg (vehicles need more width than product rails). */
export const STORE_VEHICLE_RAIL_TRACK_CLASS =
  'grid grid-flow-col auto-cols-[calc((100%-0.75rem)/2)] sm:auto-cols-[calc((100%-2rem)/3)] lg:auto-cols-[calc((100%-3*0.875rem)/4)] gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory motion-reduce:scroll-auto';

/**
 * Resolve a stable product id for rail deduplication.
 * @param {object | null | undefined} p
 * @returns {string | null}
 */
export function resolveRailProductId(p) {
  if (!p) return null;
  const id = p.id ?? p.product_id;
  if (id == null || id === '') return null;
  return String(id);
}

/**
 * Backfill a rail/row list to at least `minItems` using `pool` (no duplicate ids).
 * @param {object[]} primary
 * @param {object[]} pool
 * @param {number} [minItems]
 * @param {number} [maxItems]
 */
export function fillProductRailItems(primary = [], pool = [], minItems = STORE_PRODUCT_ROW_COLUMNS, maxItems = 12) {
  const seen = new Set();
  const out = [];

  for (const p of primary) {
    const id = resolveRailProductId(p);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(p);
    if (out.length >= maxItems) return out.slice(0, maxItems);
  }

  for (const p of pool) {
    if (out.length >= maxItems) break;
    const id = resolveRailProductId(p);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(p);
    if (out.length >= minItems && out.length >= maxItems) break;
  }

  return out.slice(0, maxItems);
}

/**
 * Ensure a rail has at least `minItems` products when the catalog pool allows it.
 * @param {object[]} primary
 * @param {object[]} catalogPool
 * @param {number} [minItems]
 * @param {number} [maxItems]
 */
export function ensureRailProducts(primary = [], catalogPool = [], minItems = STORE_PRODUCT_ROW_COLUMNS, maxItems = 12) {
  const pool = catalogPool?.length ? catalogPool : primary;
  return fillProductRailItems(primary, pool, minItems, maxItems);
}
