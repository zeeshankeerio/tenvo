'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search, Menu, ShoppingBag, User, X, Calendar, Dumbbell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { SearchBar } from '@/components/storefront/SearchBar';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { resolveStorefrontLogo } from '@/lib/storefront/resolveStorefrontLogo';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import {
  formatFitnessStoreName,
  getFitnessNavLinks,
} from '@/lib/storefront/fitnessStorefront';
import {
  getTenantMeetingUrl,
  shouldOfferTenantMeetingLink,
} from '@/lib/storefront/storefrontBooking';
import { useFitnessChromeOptional } from '@/components/storefront/fitness/FitnessChromeContext';

/**
 * Dark fitness storefront header — transparent on homepage hero, solid on scroll.
 */
export function FitnessSiteHeader({ business, settings, categories = [] }) {
  const chrome = useFitnessChromeOptional();
  const [localMenuOpen, setLocalMenuOpen] = useState(false);
  const [localSearchOpen, setLocalSearchOpen] = useState(false);
  const isMobileMenuOpen = chrome ? chrome.isMobileMenuOpen : localMenuOpen;
  const setIsMobileMenuOpen = chrome ? chrome.setIsMobileMenuOpen : setLocalMenuOpen;
  const isSearchOpen = chrome ? chrome.isSearchOpen : localSearchOpen;
  const setIsSearchOpen = chrome ? chrome.setIsSearchOpen : setLocalSearchOpen;

  const [isScrolled, setIsScrolled] = useState(false);

  const pathname = usePathname();
  const { businessDomain } = useStorefront();
  const { cart } = useCart();
  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const accent = getStoreAccentColor(settings, business?.category);
  const storeRoot = `/store/${businessDomain}`;
  const isHome = pathname === storeRoot || pathname === `${storeRoot}/`;
  const transparent = isHome && !isScrolled;
  const displayName = formatFitnessStoreName(business?.business_name);
  const storeLogoUrl = resolveStorefrontLogo(business, settings);
  const navLinks = getFitnessNavLinks(storeRoot, categories);
  const meetingUrl = shouldOfferTenantMeetingLink(business, business?.category, settings)
    ? getTenantMeetingUrl(business, settings)
    : null;

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className={cn(
          'z-50 w-full transition-colors duration-300',
          transparent
            ? 'absolute left-0 right-0 top-0 border-b border-white/0 bg-transparent'
            : 'sticky top-0 border-b border-white/10 bg-[#0a0a0a]/95 shadow-lg shadow-black/20 backdrop-blur-md'
        )}
      >
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link href={storeRoot} className="flex min-w-0 items-center gap-2.5">
            {storeLogoUrl ? (
              <SmartProductImage
                src={storeLogoUrl}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg object-cover"
              />
            ) : (
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: accent }}
              >
                <Dumbbell className="h-5 w-5" aria-hidden />
              </span>
            )}
            <span
              className={cn(
                'truncate text-sm font-semibold sm:text-base',
                transparent ? 'text-white' : 'text-white'
              )}
            >
              {displayName}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Fitness store">
            {navLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition',
                  transparent ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                'rounded-lg p-2 transition',
                transparent ? 'text-white/80 hover:bg-white/10' : 'text-white/70 hover:bg-white/10'
              )}
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              href={`${storeRoot}/account`}
              className={cn(
                'hidden rounded-lg p-2 transition sm:inline-flex',
                transparent ? 'text-white/80 hover:bg-white/10' : 'text-white/70 hover:bg-white/10'
              )}
              aria-label="Account"
            >
              <User className="h-5 w-5" />
            </Link>
            <Link
              href={`${storeRoot}/cart`}
              className={cn(
                'relative rounded-lg p-2 transition',
                transparent ? 'text-white/80 hover:bg-white/10' : 'text-white/70 hover:bg-white/10'
              )}
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Link>
            {meetingUrl ? (
              <a
                href={meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-95 sm:inline-flex"
                style={{ backgroundColor: accent }}
              >
                <Calendar className="h-4 w-4" aria-hidden />
                Book
              </a>
            ) : (
              <Link
                href={`${storeRoot}#book`}
                className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-95 sm:inline-flex"
                style={{ backgroundColor: accent }}
              >
                <Calendar className="h-4 w-4" aria-hidden />
                Book
              </Link>
            )}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className={cn(
                'rounded-lg p-2 lg:hidden',
                chrome && 'hidden',
                transparent ? 'text-white' : 'text-white/80'
              )}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="border-t border-white/10 bg-[#0a0a0a] px-4 py-4 lg:hidden">
            <nav className="flex max-h-[min(60vh,420px)] flex-col gap-1 overflow-y-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-3.5 text-sm font-semibold text-white/90 active:bg-white/10"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={`${storeRoot}/account`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-xl px-3 py-3.5 text-sm font-semibold text-white/90 active:bg-white/10"
              >
                Account
              </Link>
              <Link
                href={`${storeRoot}/orders`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-xl px-3 py-3.5 text-sm font-semibold text-white/90 active:bg-white/10"
              >
                Track order
              </Link>
            </nav>
          </div>
        )}
      </header>

      {isSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="mx-auto max-w-xl px-4 pt-20">
            <div className="rounded-2xl border border-white/10 bg-[#111] p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Search the gym store</p>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="rounded-lg p-1 text-white/60 hover:text-white"
                  aria-label="Close search"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SearchBar businessDomain={businessDomain} onClose={() => setIsSearchOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
