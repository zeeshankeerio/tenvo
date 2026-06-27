'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PharmacyChromeContext = createContext(null);

export function PharmacyChromeProvider({ children }) {
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
    <PharmacyChromeContext.Provider value={value}>
      {children}
    </PharmacyChromeContext.Provider>
  );
}

export function usePharmacyChrome() {
  const ctx = useContext(PharmacyChromeContext);
  if (!ctx) {
    throw new Error('usePharmacyChrome must be used within PharmacyChromeProvider');
  }
  return ctx;
}

/** Safe hook when chrome may be absent (non-pharmacy pages). */
export function usePharmacyChromeOptional() {
  return useContext(PharmacyChromeContext);
}
