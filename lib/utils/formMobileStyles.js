/** Shared compact form tokens for mobile app-like data entry. */

import { MOBILE_BTN, MOBILE_INPUT, MOBILE_LABEL } from '@/lib/utils/typography';

export const MOBILE_INPUT_CLASS = `h-9 rounded-lg border-gray-200 ${MOBILE_INPUT}`;
export const MOBILE_LABEL_CLASS = MOBILE_LABEL;
export const MOBILE_SELECT_TRIGGER = `h-9 rounded-lg ${MOBILE_INPUT}`;

export const MOBILE_FORM_BODY = 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4';
export const MOBILE_FORM_HEADER =
  'shrink-0 border-b bg-white px-3 py-3 sm:px-5 sm:py-4';
export const MOBILE_FORM_FOOTER =
  'shrink-0 border-t border-gray-100 bg-white px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-3';

/** Dialog shell for full-height forms on mobile */
export const MOBILE_DIALOG_SHELL =
  'flex max-h-[min(92dvh,900px)] w-[calc(100vw-1rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-full sm:max-w-2xl sm:rounded-2xl';

export const MOBILE_DIALOG_SHELL_WIDE =
  'flex max-h-[min(92dvh,900px)] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:w-full sm:rounded-2xl';

/** Fixed overlay card for legacy full-screen forms */
export const MOBILE_OVERLAY = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4';
export const MOBILE_OVERLAY_CARD =
  'flex w-full max-h-[100dvh] sm:max-h-[min(92vh,900px)] flex-col overflow-hidden rounded-none border-0 shadow-2xl sm:max-w-5xl sm:rounded-2xl sm:border';

export const MOBILE_LINE_TABLE_WRAP = '-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0';
export const MOBILE_GRID_FIELDS = 'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4';
export const MOBILE_TAB_LIST = 'mb-3 flex h-9 w-full gap-0.5 overflow-x-auto rounded-lg bg-gray-100/80 p-0.5 scrollbar-none sm:grid sm:overflow-visible';

export const MOBILE_BTN_PRIMARY = `h-9 rounded-xl px-4 ${MOBILE_BTN} sm:h-10`;
export const MOBILE_BTN_SECONDARY = `h-9 rounded-xl px-3 text-xs font-semibold sm:h-10`;
