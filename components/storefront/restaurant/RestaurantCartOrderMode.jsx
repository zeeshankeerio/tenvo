'use client';

import { useEffect } from 'react';
import { Bike, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { useRestaurantChrome } from '@/components/storefront/restaurant/RestaurantChromeContext';
import {
  restaurantOrderModeToShipping,
  resolveRestaurantOrderModes,
} from '@/lib/storefront/restaurantMenu';
import { getRestaurantConfig, RESTAURANT_ORDER_MODES } from '@/lib/storefront/restaurantStorefront';

const MODE_ICONS = {
  delivery: Bike,
  collection: ShoppingBag,
  'dine-in': UtensilsCrossed,
};

/**
 * Order-type selector on cart — syncs shipping method for checkout.
 */
export function RestaurantCartOrderMode({ className, onShippingChange }) {
  const { orderMode, setOrderMode } = useRestaurantChrome();
  const { settings, businessDomain } = useStorefront();
  const config = getRestaurantConfig(settings, businessDomain);
  const modes = resolveRestaurantOrderModes(config.orderModes || RESTAURANT_ORDER_MODES);
  const shippingMethod = restaurantOrderModeToShipping(orderMode);

  useEffect(() => {
    onShippingChange?.(shippingMethod);
  }, [shippingMethod, onShippingChange]);

  return (
    <div className={cn('rounded-2xl border border-neutral-800 bg-[#141414] p-4', className)}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        How would you like your order?
      </p>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => {
          const active = orderMode === mode.id;
          const Icon = MODE_ICONS[mode.id] || UtensilsCrossed;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setOrderMode(mode.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition',
                active
                  ? 'border-green-600/50 bg-green-600/10 text-green-400'
                  : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-600'
              )}
              aria-pressed={active}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="text-[11px] font-semibold">{mode.label}</span>
            </button>
          );
        })}
      </div>
      {orderMode === 'dine-in' ? (
        <p className="mt-3 text-xs text-neutral-500">
          Add your table number or seating notes at checkout.
        </p>
      ) : orderMode === 'collection' ? (
        <p className="mt-3 text-xs text-neutral-500">
          We will prepare your order for pickup at the counter.
        </p>
      ) : null}
    </div>
  );
}
