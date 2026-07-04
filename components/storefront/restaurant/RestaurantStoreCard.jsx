'use client';

import { cn } from '@/lib/utils';
import { RESTAURANT_UI } from '@/lib/storefront/restaurantMenu';

/**
 * Dark surface card for restaurant cart / checkout panels.
 */
export function RestaurantStoreCard({ children, className, hover = false }) {
  return (
    <div
      className={cn(
        RESTAURANT_UI.card,
        hover && RESTAURANT_UI.cardHover,
        className
      )}
    >
      {children}
    </div>
  );
}

export function RestaurantFieldLabel({ children, className, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-xs font-semibold uppercase tracking-wide text-neutral-500', className)}
    >
      {children}
    </label>
  );
}

export function restaurantInputClass(extra = '') {
  return cn(
    'mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-offset-0',
    RESTAURANT_UI.input,
    extra
  );
}
