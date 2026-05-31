/**
 * Dashboard / analytics date bounds (pure helpers).
 * Lives outside `'use server'` modules so Next.js does not treat exports as Server Actions.
 */

/** @param {unknown} v @returns {string|null} YYYY-MM-DD */
export function toAnalyticsIsoDate(v) {
    if (v == null || v === '') return null;
    try {
        const d = v instanceof Date ? v : new Date(v);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 10);
    } catch {
        return null;
    }
}

/**
 * Dashboard filter → inclusive SQL date bounds. Default: last 30 days ending today.
 * @param {{ from?: unknown; to?: unknown }} [filter]
 */
export function resolveAnalyticsRange(filter = {}) {
    const to = toAnalyticsIsoDate(filter.to) ?? toAnalyticsIsoDate(new Date());
    let from = toAnalyticsIsoDate(filter.from);
    if (!from) {
        const t = new Date(`${to}T12:00:00Z`);
        t.setUTCDate(t.getUTCDate() - 29);
        from = t.toISOString().slice(0, 10);
    }
    if (from > to) return { from: to, to: from, trendAnchor: to };
    return { from, to, trendAnchor: to };
}
