'use client';

import { LayoutList, LayoutGrid, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  INVENTORY_MOBILE_VIEWS,
  DEFAULT_INVENTORY_MOBILE_VIEW,
} from '@/lib/utils/inventoryMobileView';

const MODE_ICONS = {
  visual: LayoutList,
  busy: Table2,
  cards: LayoutGrid,
};

/**
 * Segmented control: Visual (list) · Busy (grid) · Cards (browse).
 */
export function InventoryMobileViewToggle({ value = DEFAULT_INVENTORY_MOBILE_VIEW, onChange, className }) {
  const modes = [
    INVENTORY_MOBILE_VIEWS.visual,
    INVENTORY_MOBILE_VIEWS.busy,
    INVENTORY_MOBILE_VIEWS.cards,
  ];

  return (
    <div
      className={cn(
        'flex h-9 items-center rounded-xl border border-gray-200 bg-gray-100/90 p-0.5 shadow-inner',
        className
      )}
      role="group"
      aria-label="Product view mode"
    >
      {modes.map((mode) => {
        const active = value === mode.id;
        const Icon = MODE_ICONS[mode.id] || LayoutList;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange?.(mode.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[9px] font-semibold uppercase tracking-wide transition-colors sm:gap-1.5 sm:text-[10px]',
              active ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500'
            )}
            aria-pressed={active}
            title={mode.hint}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

export default InventoryMobileViewToggle;
