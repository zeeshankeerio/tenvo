/** Mobile inventory catalog layout — visual list is default (tap-to-edit data entry). */

export const INVENTORY_MOBILE_VIEW_STORAGE_KEY = 'tenvo-inventory-mobile-view';

export const INVENTORY_MOBILE_VIEWS = {
  visual: { id: 'visual', label: 'Visual', hint: 'Tap to edit · domain fields' },
  busy: { id: 'busy', label: 'Busy', hint: 'Spreadsheet grid' },
  cards: { id: 'cards', label: 'Cards', hint: 'Browse tiles' },
};

export const DEFAULT_INVENTORY_MOBILE_VIEW = 'visual';

/** Normalize legacy persisted values (`list` → `visual`). */
export function normalizeInventoryMobileView(mode) {
  if (mode === 'list') return 'visual';
  if (mode === 'visual' || mode === 'busy' || mode === 'cards') return mode;
  return DEFAULT_INVENTORY_MOBILE_VIEW;
}

export function readInventoryMobileViewPreference() {
  if (typeof window === 'undefined') return DEFAULT_INVENTORY_MOBILE_VIEW;
  try {
    const stored = window.localStorage.getItem(INVENTORY_MOBILE_VIEW_STORAGE_KEY);
    if (stored) return normalizeInventoryMobileView(stored);
  } catch {
    /* ignore */
  }
  return DEFAULT_INVENTORY_MOBILE_VIEW;
}

export function writeInventoryMobileViewPreference(mode) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(INVENTORY_MOBILE_VIEW_STORAGE_KEY, normalizeInventoryMobileView(mode));
  } catch {
    /* ignore */
  }
}
