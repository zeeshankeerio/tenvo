/**
 * TENVO typography tokens — Open Sans scale aligned with Zoho / Shopify / Busy ERP density.
 * Import these instead of ad-hoc text-[9px] font-black patterns.
 */

const SANS = 'font-sans';
const TRACK_TIGHT = 'tracking-tight';
const TRACK_WIDE = 'tracking-wide';
const TRACK_WIDER = 'tracking-wider';
const LEADING_SNUG = 'leading-snug';
const LEADING_NORMAL = 'leading-normal';
const LEADING_RELAXED = 'leading-relaxed';

/** Marketing / public site */
export const MARKETING_DISPLAY =
  `${SANS} text-balance text-3xl font-semibold ${TRACK_TIGHT} text-neutral-900 min-[400px]:text-4xl sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]`;

export const MARKETING_H1 =
  `${SANS} text-balance text-3xl font-semibold ${TRACK_TIGHT} text-neutral-900 min-[400px]:text-4xl sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]`;

export const MARKETING_H2 =
  `${SANS} text-balance text-2xl font-semibold ${TRACK_TIGHT} text-neutral-900 sm:text-3xl lg:text-4xl`;

export const MARKETING_H3 =
  `${SANS} text-xl font-semibold ${TRACK_TIGHT} text-neutral-900 sm:text-2xl`;

export const MARKETING_H4 =
  `${SANS} text-lg font-semibold ${TRACK_TIGHT} text-neutral-900`;

export const MARKETING_LEAD =
  `${SANS} text-pretty text-base font-normal ${LEADING_RELAXED} text-neutral-600 sm:text-lg`;

export const MARKETING_BODY =
  `${SANS} text-sm font-normal ${LEADING_RELAXED} text-neutral-600 sm:text-base`;

export const MARKETING_EYEBROW =
  `${SANS} text-[11px] font-semibold uppercase ${TRACK_WIDER} text-brand-primary sm:text-xs`;

/** Section titles on long-form marketing pages (toolkit, FAQ, CTA bands). */
export const MARKETING_SECTION_HEADING =
  `${SANS} text-balance text-3xl font-semibold ${TRACK_TIGHT} text-neutral-900 sm:text-4xl md:text-5xl`;

/** KPI / price figures on marketing surfaces — tabular nums like Zoho/Busy. */
export const MARKETING_STAT_VALUE =
  `${SANS} text-2xl font-semibold tabular-nums ${TRACK_TIGHT} text-neutral-900`;

export const MARKETING_STAT_LABEL =
  `${SANS} text-xs font-medium ${LEADING_SNUG} text-neutral-500`;

export const MARKETING_PAGE_TITLE =
  `${SANS} text-balance text-2xl font-semibold ${TRACK_TIGHT} text-neutral-900 sm:text-3xl lg:text-4xl`;

/** Hub / ERP surfaces — 14px base, compact labels */
export const HUB_PAGE_TITLE =
  `${SANS} text-xl font-semibold ${TRACK_TIGHT} text-neutral-900 sm:text-2xl`;

export const HUB_SECTION_TITLE =
  `${SANS} text-base font-semibold ${TRACK_TIGHT} text-neutral-900`;

export const HUB_CARD_TITLE =
  `${SANS} text-sm font-semibold ${TRACK_TIGHT} text-neutral-900`;

export const HUB_BODY =
  `${SANS} text-sm font-normal ${LEADING_NORMAL} text-neutral-700`;

export const HUB_BODY_MUTED =
  `${SANS} text-sm font-normal ${LEADING_NORMAL} text-neutral-500`;

export const HUB_CAPTION =
  `${SANS} text-xs font-normal ${LEADING_SNUG} text-neutral-500`;

export const HUB_LABEL =
  `${SANS} text-[11px] font-semibold uppercase ${TRACK_WIDE} text-neutral-500`;

/** Sidebar group headers and compact tab strip labels. */
export const HUB_NAV_SECTION =
  `${SANS} text-[10px] font-semibold uppercase ${TRACK_WIDE} text-neutral-400`;

/** Micro KPI captions on dashboard tiles (minimum readable size). */
export const HUB_MICRO_LABEL =
  `${SANS} text-[10px] font-semibold uppercase ${TRACK_WIDER} text-neutral-500`;

export const HUB_TABLE_HEAD =
  `${SANS} text-xs font-semibold uppercase ${TRACK_WIDER} text-neutral-500`;

export const HUB_STAT_VALUE =
  `${SANS} text-2xl font-semibold tabular-nums ${TRACK_TIGHT} text-neutral-900`;

export const HUB_STAT_LABEL =
  `${SANS} text-[11px] font-medium uppercase ${TRACK_WIDE} text-neutral-500`;

/** Cards, dialogs, sheets (shadcn-aligned) */
export const CARD_TITLE =
  `${SANS} text-base font-semibold ${TRACK_TIGHT} text-neutral-900 sm:text-lg`;

export const CARD_DESCRIPTION =
  `${SANS} text-sm font-normal ${LEADING_NORMAL} text-neutral-500`;

/** Storefront product / commerce */
export const STORE_PRODUCT_TITLE =
  `${SANS} text-sm font-semibold ${TRACK_TIGHT} text-neutral-900`;

export const STORE_PRICE =
  `${SANS} text-base font-semibold tabular-nums text-neutral-900`;

export const STORE_SECTION_HEADING =
  `${SANS} store-heading text-xl font-semibold sm:text-2xl`;

/** Mono for SKUs, codes, amounts in tables */
export const DATA_MONO =
  'font-mono text-sm tabular-nums';

/** Mobile form tokens (re-export pattern for forms) */
export const MOBILE_LABEL = `${SANS} text-[11px] font-semibold text-slate-600`;
export const MOBILE_INPUT = `${SANS} text-sm`;
export const MOBILE_BTN = `${SANS} text-xs font-semibold sm:text-sm`;
