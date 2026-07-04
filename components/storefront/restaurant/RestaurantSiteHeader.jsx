'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, MapPin, ChevronRight, ShoppingBag, Bike, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { SearchBar } from '@/components/storefront/SearchBar';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { formatCurrency } from '@/lib/currency';
import { resolveStoreContact } from '@/lib/storefront/businessContact';
import { resolveStorefrontLogo } from '@/lib/storefront/resolveStorefrontLogo';
import {
  formatRestaurantStoreName,
  getRestaurantConfig,
  resolveRestaurantSubNav,
  resolveRestaurantTheme,
} from '@/lib/storefront/restaurantStorefront';
import { useRestaurantChrome } from '@/components/storefront/restaurant/RestaurantChromeContext';

/**
 * Supermeal-style kitchen header — promo strip, menu search, sub-nav.
 */
export function RestaurantSiteHeader({ business, settings }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { isSearchOpen, openSearch, closeSearch } = useRestaurantChrome();
  const pathname = usePathname();
  const { businessDomain, currency, categories } = useStorefront();
  const { cart } = useCart();
  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const theme = resolveRestaurantTheme(settings);
  const accent = theme.accent;
  const storeRoot = `/store/${businessDomain}`;
  const displayName = formatRestaurantStoreName(business?.business_name);
  const storeLogoUrl = resolveStorefrontLogo(business, settings);
  const contact = resolveStoreContact({ business, settings });
  const config = getRestaurantConfig(settings, businessDomain);
  const freeShip = settings?.freeShippingThreshold;
  const deliveryNotice = config.deliveryNotice;
  const subNavLinks = resolveRestaurantSubNav(settings, storeRoot, { categories });
  const isHome = pathname === storeRoot || pathname === `${storeRoot}/`;

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 6);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50" data-store-restaurant-header>
      <div className="text-white" style={{ backgroundColor: theme.promoBar }}>
        <div className="mx-auto flex min-h-8 max-w-[1400px] items-center justify-between gap-2 px-3 py-1.5 text-[10px] font-medium sm:px-6 sm:text-[11px] lg:px-8">
          <span className="inline-flex min-w-0 items-center gap-1 truncate sm:max-w-[55%]">
            <Bike className="hidden h-3 w-3 shrink-0 sm:inline" aria-hidden />
            <span className="truncate">{deliveryNotice}</span>
          </span>
          <div className="flex shrink-0 items-center gap-3">
            {contact.city ? (
              <span className="hidden items-center gap-1 text-white/95 md:inline-flex">
                <MapPin className="h-3 w-3" aria-hidden />
                {contact.city}
              </span>
            ) : null}
            {typeof freeShip === 'number' && freeShip > 0 ? (
              <span className="hidden text-white/95 lg:inline">
                Free delivery over {formatCurrency(freeShip, currency || 'PKR', { maximumFractionDigits: 0 })}
              </span>
            ) : null}
            <Link href={`${storeRoot}${config.promoStripHref}`} className="font-semibold text-white hover:text-white/90">
              {config.promoStripLabel}
            </Link>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'border-b border-violet-100/80 bg-white transition-shadow',
          isScrolled && 'shadow-md shadow-violet-900/5'
        )}
      >
        <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-2.5 lg:hidden">
            <Link href={storeRoot} className="min-w-0 flex-1">
              {storeLogoUrl ? (
                <SmartProductImage
                  src={storeLogoUrl}
                  alt={displayName}
                  width={120}
                  height={32}
                  className="mx-auto h-7 w-auto max-w-[140px] object-contain"
                />
              ) : (
                <span className="block truncate text-center text-sm font-semibold text-stone-900">{displayName}</span>
              )}
            </Link>
            <Link
              href={`${storeRoot}/cart`}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-50 text-stone-700"
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartItemCount > 0 ? (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              ) : null}
            </Link>
          </div>

          <button
            type="button"
            onClick={openSearch}
            className="mb-2.5 flex w-full items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-left lg:hidden"
            aria-label="Open search"
          >
            <Search className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm text-stone-500">{config.searchPlaceholder}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" aria-hidden />
          </button>

          <div className="hidden h-[68px] items-center gap-5 lg:flex">
            <Link href={storeRoot} className="flex shrink-0 items-center gap-2">
              {storeLogoUrl ? (
                <SmartProductImage
                  src={storeLogoUrl}
                  alt={displayName}
                  width={148}
                  height={40}
                  className="h-9 w-auto object-contain"
                />
              ) : (
                <span className="text-xl font-semibold tracking-tight text-stone-900">{displayName}</span>
              )}
            </Link>

            <div className="min-w-0 flex-1 max-w-2xl">
              <SearchBar businessDomain={businessDomain} />
            </div>

            <Link
              href={`${storeRoot}/cart`}
              className="relative ml-auto inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
              style={{ backgroundColor: accent }}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden />
              <span>My cart</span>
              {cartItemCount > 0 ? (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{cartItemCount}</span>
              ) : null}
            </Link>
          </div>
        </div>
      </div>

      <nav className="hidden border-b border-stone-100 bg-white lg:block" aria-label="Menu">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
            <Link
              href={storeRoot}
              className={cn(
                'shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                isHome ? 'text-white' : 'text-stone-600 hover:bg-stone-50'
              )}
              style={isHome ? { backgroundColor: accent } : undefined}
            >
              Home
            </Link>
            {subNavLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-violet-50 hover:text-violet-900"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <nav className="border-b border-stone-100 bg-white lg:hidden" aria-label="Quick menu">
        <div className="mx-auto max-w-[1400px] px-3">
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
            {subNavLinks.slice(0, 8).map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="shrink-0 rounded-full bg-stone-100 px-3 py-1.5 text-[11px] font-semibold text-stone-700 active:scale-[0.98]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {isSearchOpen ? (
        <div className="fixed inset-0 z-[70] bg-white lg:hidden">
          <div className="flex items-center gap-2 border-b border-stone-100 px-3 py-3">
            <div className="min-w-0 flex-1">
              <SearchBar businessDomain={businessDomain} onClose={closeSearch} />
            </div>
            <button
              type="button"
              onClick={closeSearch}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100"
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
