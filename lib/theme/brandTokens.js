/**
 * Brand color tokens — keep hex values in sync with `app/globals.css` :root.
 * Use for charts, SVG, and inline styles; prefer Tailwind `brand-*` / CSS vars in UI.
 */
export const BRAND_PRIMARY = '#D22B2B';
export const BRAND_PRIMARY_LIGHT = '#E84545';
export const BRAND_PRIMARY_DARK = '#A82020';
export const BRAND_50 = '#FEF6F6';
export const BRAND_100 = '#FCEAEA';
export const HALF_WHITE = '#FAFAFA';
export const SUPER_WHITE = '#FFFFFF';
export const CANVAS_BG = '#F7F5F5';

/** Chart / data-viz palette (brand first, then complementary enterprise tones) */
export const CHART_PALETTE = [
  BRAND_PRIMARY,
  '#C49C3B',
  '#1E293B',
  '#10B981',
  '#64748B',
  '#D4A017',
];
