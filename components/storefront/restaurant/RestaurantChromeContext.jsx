'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const RestaurantChromeContext = createContext(null);

export function RestaurantChromeProvider({ children }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  const value = useMemo(
    () => ({
      isSearchOpen,
      openSearch,
      closeSearch,
      setIsSearchOpen,
    }),
    [isSearchOpen, openSearch, closeSearch]
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
