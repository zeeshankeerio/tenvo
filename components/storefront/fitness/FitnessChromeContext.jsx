'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const FitnessChromeContext = createContext(null);

export function FitnessChromeProvider({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const openMenu = useCallback(() => setIsMobileMenuOpen(true), []);
  const closeMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  const value = useMemo(
    () => ({
      isMobileMenuOpen,
      isSearchOpen,
      openMenu,
      closeMenu,
      openSearch,
      closeSearch,
      setIsMobileMenuOpen,
      setIsSearchOpen,
    }),
    [isMobileMenuOpen, isSearchOpen, openMenu, closeMenu, openSearch, closeSearch]
  );

  return (
    <FitnessChromeContext.Provider value={value}>{children}</FitnessChromeContext.Provider>
  );
}

export function useFitnessChrome() {
  const ctx = useContext(FitnessChromeContext);
  if (!ctx) {
    throw new Error('useFitnessChrome must be used within FitnessChromeProvider');
  }
  return ctx;
}

export function useFitnessChromeOptional() {
  return useContext(FitnessChromeContext);
}
