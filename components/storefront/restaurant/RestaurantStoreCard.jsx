'use client';

import { cn } from '@/lib/utils';
import { RESTAURANT_UI, RESTAURANT_CHECKOUT_UI } from '@/lib/storefront/restaurantMenu';

/**
 * Surface card for restaurant cart / checkout panels.
 * @param {{ light?: boolean }} props
 */
export function RestaurantStoreCard({ children, className, hover = false, light = false }) {
  const ui = light ? RESTAURANT_CHECKOUT_UI : RESTAURANT_UI;
  return (
    <div
      className={cn(
        ui.card,
        hover && ui.cardHover,
        className
      )}
    >
      {children}
    </div>
  );
}

export function RestaurantFieldLabel({ children, className, htmlFor, light = false }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'text-xs font-semibold uppercase tracking-wide',
        light ? 'text-zinc-500' : 'text-neutral-500',
        className
      )}
    >
      {children}
    </label>
  );
}

export function restaurantInputClass(extra = '', { light = false } = {}) {
  const ui = light ? RESTAURANT_CHECKOUT_UI : RESTAURANT_UI;
  return cn(
    'mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-offset-0',
    ui.input,
    extra
  );
}
