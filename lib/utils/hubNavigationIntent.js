/**
 * Cross-tab navigation intents for hub alerts and quick actions.
 * Radix tabs unmount inactive panels, so focus events fired synchronously
 * after switch-tab are often lost. Persist intent until the target mounts.
 */

const INVENTORY_FOCUS_KEY = 'tenvo_pending_inventory_focus';

/** @type {string | null} */
let pendingInventoryFocus = null;

/**
 * @param {'low-stock' | 'out-of-stock' | 'expiring-stock'} mode
 */
export function setPendingInventoryFocus(mode) {
  if (!mode) return;
  pendingInventoryFocus = mode;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(INVENTORY_FOCUS_KEY, mode);
    } catch {
      // ignore quota / private mode
    }
  }
}

/**
 * @returns {'low-stock' | 'out-of-stock' | 'expiring-stock' | null}
 */
export function consumePendingInventoryFocus() {
  let mode = pendingInventoryFocus;
  pendingInventoryFocus = null;

  if (!mode && typeof window !== 'undefined') {
    try {
      mode = sessionStorage.getItem(INVENTORY_FOCUS_KEY);
      if (mode) sessionStorage.removeItem(INVENTORY_FOCUS_KEY);
    } catch {
      // ignore
    }
  }

  if (
    mode === 'low-stock' ||
    mode === 'out-of-stock' ||
    mode === 'expiring-stock'
  ) {
    return mode;
  }
  return null;
}

/**
 * @param {'low-stock' | 'out-of-stock' | 'expiring-stock'} mode
 * @returns {'low' | 'out' | 'expiring'}
 */
export function inventoryFocusModeToStockFilter(mode) {
  if (mode === 'out-of-stock') return 'out';
  if (mode === 'expiring-stock') return 'expiring';
  return 'low';
}
