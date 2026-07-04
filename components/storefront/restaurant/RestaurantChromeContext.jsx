'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getRestaurantOrderModeStorageKey, normalizeRestaurantOrderMode } from '@/lib/storefront/restaurantMenu';

const RestaurantChromeContext = createContext(null);

export function RestaurantChromeProvider({ children }) {
  const { businessId } = useStorefront();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orderMode, setOrderModeState] = useState('delivery');
  const [orderModeHydrated, setOrderModeHydrated] = useState(false);
  const [menuPageTitle, setMenuPageTitle] = useState('Our menu');

  const storageKey = getRestaurantOrderModeStorageKey(businessId);

  useEffect(() => {
    setOrderModeHydrated(false);
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        setOrderModeState(normalizeRestaurantOrderMode(raw));
      }
    } catch {
      // ignore
    }
    setOrderModeHydrated(true);
  }, [storageKey]);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const setOrderMode = useCallback(
    (mode) => {
      const next = normalizeRestaurantOrderMode(mode);
      setOrderModeState(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // ignore
      }
    },
    [storageKey]
  );

  const value = useMemo(
    () => ({
      isSearchOpen,
      openSearch,
      closeSearch,
      setIsSearchOpen,
      isSidebarOpen,
      openSidebar,
      closeSidebar,
      setIsSidebarOpen,
      orderMode,
      setOrderMode,
      orderModeHydrated,
      menuPageTitle,
      setMenuPageTitle,
    }),
    [
      isSearchOpen,
      openSearch,
      closeSearch,
      isSidebarOpen,
      openSidebar,
      closeSidebar,
      orderMode,
      setOrderMode,
      orderModeHydrated,
      menuPageTitle,
    ]
  );

  return (
    <RestaurantChromeContext.Provider value={value}>
      {children}
    </RestaurantChromeContext.Provider>
  );
}

export function useRestaurantChrome() {
  const ctx = useContext(RestaurantChromeContext);
  if (!ctx) {
    throw new Error('useRestaurantChrome must be used within RestaurantChromeProvider');
  }
  return ctx;
}

export function useRestaurantChromeOptional() {
  return useContext(RestaurantChromeContext);
}
