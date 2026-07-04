'use client';

import { Bike, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRestaurantChrome } from '@/components/storefront/restaurant/RestaurantChromeContext';
import {
  resolveRestaurantOrderModes,
  RESTAURANT_MENU_THEME,
} from '@/lib/storefront/restaurantMenu';
import { getRestaurantConfig, RESTAURANT_ORDER_MODES } from '@/lib/storefront/restaurantStorefront';

const MODE_ICONS = {
  delivery: Bike,
  collection: ShoppingBag,
  'dine-in': UtensilsCrossed,
  bike: Bike,
  bag: ShoppingBag,
  utensils: UtensilsCrossed,
};

/**
 * Compact order-type selector — delivery, takeaway, dine-in.
 */
export function RestaurantOrderModeBar({
  settings = {},
  businessDomain,
  className,
  variant = 'bar',
  accent,
  theme = 'light',
}) {
  const { orderMode, setOrderMode } = useRestaurantChrome();
  const config = getRestaurantConfig(settings, businessDomain);
  const modes = resolveRestaurantOrderModes(config.orderModes || RESTAURANT_ORDER_MODES);
  const activeColor = accent || RESTAURANT_MENU_THEME.cartCta;
  const isLight = theme === 'light';

  if (config.showOrderModes === false) return null;

  return (
    <div
      className={cn(
        variant === 'bar'
          ? isLight
            ? 'flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5'
            : 'flex flex-wrap gap-1.5 rounded-2xl border border-neutral-800 bg-[#141414] p-1.5'
          : variant === 'compact'
            ? 'flex gap-0.5 overflow-x-auto scrollbar-hide'
            : 'grid grid-cols-3 gap-2',
        className
      )}
      role="group"
      aria-label="Order type"
    >
      {modes.map((mode) => {
        const active = orderMode === mode.id;
        const Icon = MODE_ICONS[mode.id] || MODE_ICONS[mode.icon] || UtensilsCrossed;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => setOrderMode(mode.id)}
            className={cn(
              'inline-flex min-w-0 items-center justify-center gap-1 rounded-md font-semibold transition sm:gap-1.5',
              variant === 'compact'
                ? 'shrink-0 px-2 py-1 text-[10px] sm:px-2.5 sm:py-1.5 sm:text-[11px]'
                : 'flex-1 px-2 py-1.5 text-[11px] sm:px-3 sm:py-2 sm:text-xs',
              active
                ? 'text-white shadow-sm'
                : isLight
                  ? variant === 'compact'
                    ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900'
                    : 'border border-transparent bg-white text-zinc-600 hover:text-zinc-900'
                  : variant === 'compact'
                    ? 'border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
            )}
            style={active ? { backgroundColor: activeColor } : undefined}
            aria-pressed={active}
          >
            <Icon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
            <span className="truncate">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
