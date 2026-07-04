'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRestaurantChromeOptional } from '@/components/storefront/restaurant/RestaurantChromeContext';

import { normalizeRestaurantOrderMode } from '@/lib/storefront/restaurantMenu';

const VALID_MODES = new Set(['delivery', 'collection', 'dine-in', 'takeaway', 'take-away', 'pickup', 'dinein']);

/**
 * Sync ?mode=delivery|collection|dine-in from URL into persisted order mode.
 */
export function RestaurantOrderModeUrlSync() {
  const searchParams = useSearchParams();
  const chrome = useRestaurantChromeOptional();

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode && VALID_MODES.has(mode) && chrome?.setOrderMode) {
      chrome.setOrderMode(normalizeRestaurantOrderMode(mode));
    }
  }, [searchParams, chrome]);

  return null;
}
