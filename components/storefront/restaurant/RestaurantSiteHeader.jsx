'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, MapPin, X, ShoppingBag, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { SearchBar } from '@/components/storefront/SearchBar';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { resolveStoreContact } from '@/lib/storefront/businessContact';
import { resolveStorefrontLogo } from '@/lib/storefront/resolveStorefrontLogo';
import {
  formatRestaurantStoreName,
  getRestaurantConfig,
  resolveRestaurantQuickSearchTerms,
  resolveRestaurantTheme,
} from '@/lib/storefront/restaurantStorefront';
import { RESTAURANT_MENU_THEME } from '@/lib/storefront/restaurantMenu';
import { useRestaurantChrome } from '@/components/storefront/restaurant/RestaurantChromeContext';
import { RestaurantOrderModeBar } from '@/components/storefront/restaurant/RestaurantOrderModeBar';

/**
 * Restaurant header — compact light menu bar or dark marketing header on home.
 */
export function RestaurantSiteHeader({ business, settings }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { isSearchOpen, openSearch, closeSearch, openSidebar, menuPageTitle } = useRestaurantChrome();
  const pathname = usePathname();
  const router = useRouter();
  const { businessDomain, categories } = useStorefront();
  const { cart } = useCart();
  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const theme = resolveRestaurantTheme(settings);
  const accent = theme.accent || RESTAURANT_MENU_THEME.cartCta;
  const storeRoot = `/store/${businessDomain}`;
  const productsUrl = `${storeRoot}/products`;
  const displayName = formatRestaurantStoreName(business?.business_name);
  const nameParts = displayName.split(/\s+/);
  const namePrimary = nameParts[0] || displayName;
  const nameSecondary = nameParts.slice(1).join(' ') || '';
  const storeLogoUrl = resolveStorefrontLogo(business, settings);
  const contact = resolveStoreContact({ business, settings });
  const config = getRestaurantConfig(settings, businessDomain);
  const deliveryNotice = config.deliveryNotice;
  const isMenuPage = pathname.startsWith(`${storeRoot}/products`);
  const isHomePage = pathname === storeRoot || pathname === `${storeRoot}/`;
  const quickSearchTerms = resolveRestaurantQuickSearchTerms(settings, [], categories, businessDomain);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (isMenuPage) {
    return (
      <header
        className={cn(
          'sticky top-0 z-50 border-b border-zinc-200 bg-white',
          isScrolled && 'shadow-sm'
        )}
        data-store-restaurant-header
        data-restaurant-menu-header
      >
        <div className="flex w-full items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
          <button
            type="button"
            onClick={openSidebar}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 lg:hidden"
            aria-label="Open categories"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <Link href={storeRoot} className="flex shrink-0 items-center">
            {storeLogoUrl ? (
              <SmartProductImage
                src={storeLogoUrl}
                alt={displayName}
                width={100}
                height={28}
                className="h-7 w-auto max-w-[96px] object-contain sm:max-w-[112px]"
              />
            ) : (
              <span className="text-sm font-semibold tracking-tight">
                <span className="text-zinc-900">{namePrimary}</span>
                {nameSecondary ? (
                  <span className="ml-0.5" style={{ color: accent }}>
                    {nameSecondary}
                  </span>
                ) : null}
              </span>
            )}
          </Link>

          <div className="hidden shrink-0 border-l border-zinc-200 pl-2 md:block">
            <RestaurantOrderModeBar
              settings={settings}
              businessDomain={businessDomain}
              variant="compact"
              accent={accent}
              theme="light"
            />
          </div>

          <div className="hidden min-w-0 shrink-0 items-center border-l border-zinc-200 pl-2 lg:flex">
            <h1 className="truncate text-sm font-semibold text-zinc-900 sm:text-base">
              {menuPageTitle || 'Our menu'}
            </h1>
          </div>

          <div className="hidden min-w-0 flex-1 md:block md:max-w-md lg:max-w-lg xl:max-w-xl">
            <div className="[&_input]:h-8 [&_input]:border-zinc-200 [&_input]:bg-zinc-50 [&_input]:text-sm [&_button]:h-8">
              <SearchBar businessDomain={businessDomain} />
            </div>
          </div>

          <button
            type="button"
            onClick={openSearch}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500 md:hidden"
            aria-label="Search menu"
          >
            <Search className="h-4 w-4" />
          </button>

          <Link
            href={`${storeRoot}/cart`}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-white sm:gap-1.5 sm:px-3 sm:text-xs"
            style={{ backgroundColor: RESTAURANT_MENU_THEME.cartCta }}
          >
            <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            <span className="hidden sm:inline">
              {cartItemCount > 0 ? `Cart (${cartItemCount})` : 'Cart'}
            </span>
            {cartItemCount > 0 ? (
              <span className="sm:hidden">{cartItemCount}</span>
            ) : null}
          </Link>
        </div>

        <div className="flex items-center gap-2 border-t border-zinc-100 px-2 py-1.5 md:hidden">
          <RestaurantOrderModeBar
            settings={settings}
            businessDomain={businessDomain}
            variant="compact"
            accent={accent}
            theme="light"
            className="min-w-0 flex-1"
          />
          <p className="shrink-0 text-xs font-semibold text-zinc-800">{menuPageTitle || 'Our menu'}</p>
        </div>

        {isSearchOpen ? (
          <div className="fixed inset-0 z-[70] bg-white md:hidden">
            <div className="flex items-center gap-2 border-b border-zinc-200 px-2 py-2">
              <div className="min-w-0 flex-1">
                <SearchBar businessDomain={businessDomain} onClose={closeSearch} />
              </div>
              <button
                type="button"
                onClick={closeSearch}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header
      className="sticky top-0 z-50 border-b border-neutral-800 bg-[#0a0a0a]"
      data-store-restaurant-header
    >
      <div className="text-white" style={{ backgroundColor: theme.promoBar || accent }}>
        <div className="mx-auto flex min-h-8 max-w-[1400px] items-center justify-between gap-2 px-3 py-1.5 text-[10px] font-medium sm:px-6 sm:text-[11px] lg:px-8">
          <span className="inline-flex min-w-0 items-center gap-1 truncate sm:max-w-[70%]">
            <span className="truncate">{deliveryNotice}</span>
          </span>
          <div className="flex shrink-0 items-center gap-3">
            {contact.city ? (
              <span className="hidden items-center gap-1 text-white/95 md:inline-flex">
                <MapPin className="h-3 w-3" aria-hidden />
                {contact.city}
              </span>
            ) : null}
            <Link href={productsUrl} className="font-semibold text-white hover:text-white/90">
              {config.promoStripLabel}
            </Link>
          </div>
        </div>
      </div>

      <div className={cn('bg-[#0a0a0a] transition-shadow', isScrolled && 'shadow-lg shadow-black/40')}>
        <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-2 lg:py-2.5">
            <Link href={storeRoot} className="flex min-w-0 shrink-0 items-center gap-2">
              {storeLogoUrl ? (
                <SmartProductImage
                  src={storeLogoUrl}
                  alt={displayName}
                  width={120}
                  height={32}
                  className="h-7 w-auto max-w-[108px] object-contain sm:max-w-[132px] sm:h-8"
                />
              ) : (
                <span className="truncate text-sm font-semibold tracking-tight sm:text-lg">
                  <span className="text-white">{namePrimary}</span>
                  {nameSecondary ? (
                    <span className="ml-1" style={{ color: accent }}>
                      {nameSecondary}
                    </span>
                  ) : null}
                </span>
              )}
            </Link>

            <div className="hidden min-w-0 flex-1 lg:block lg:max-w-xl xl:max-w-2xl lg:px-3">
              <div className="[&_input]:h-9 [&_input]:border-neutral-700 [&_input]:bg-[#1c1c1c] [&_input]:text-sm [&_input]:text-white [&_input]:placeholder:text-neutral-500 [&_button]:h-9 [&_button]:bg-neutral-800">
                <SearchBar businessDomain={businessDomain} dark />
              </div>
            </div>

            {config.showOrderModes !== false ? (
              <div className="hidden min-w-0 flex-1 justify-center lg:flex xl:max-w-md">
                <RestaurantOrderModeBar
                  settings={settings}
                  businessDomain={businessDomain}
                  variant="compact"
                  accent={accent}
                  theme="dark"
                  className="max-w-full"
                />
              </div>
            ) : null}

            <button
              type="button"
              onClick={openSearch}
              className="ml-auto flex h-9 flex-1 items-center gap-2 rounded-lg border border-neutral-700 bg-[#1c1c1c] px-3 text-left lg:hidden"
              aria-label="Open search"
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-xs text-neutral-500">
                {config.searchPlaceholder || 'Search dishes…'}
              </span>
            </button>

            <Link
              href={`${storeRoot}/cart`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-95 sm:gap-2 sm:text-sm"
              style={{ backgroundColor: RESTAURANT_MENU_THEME.cartCta }}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">
                {cartItemCount > 0 ? `Cart (${cartItemCount})` : 'View cart'}
              </span>
              <span className="sm:hidden">{cartItemCount > 0 ? cartItemCount : 'Cart'}</span>
            </Link>
          </div>

          {isHomePage && config.showOrderModes !== false ? (
            <div className="flex flex-col gap-2 border-t border-neutral-800/80 py-2 lg:hidden">
              <RestaurantOrderModeBar
                settings={settings}
                businessDomain={businessDomain}
                variant="compact"
                accent={accent}
                theme="dark"
              />
            </div>
          ) : null}

          {isHomePage && quickSearchTerms.length > 0 ? (
            <div className="hidden items-center gap-2 border-t border-neutral-800/80 py-2 lg:flex">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                Popular
              </span>
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {quickSearchTerms.slice(0, 6).map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => router.push(`${productsUrl}?search=${encodeURIComponent(term)}`)}
                    className="rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold text-neutral-300 transition hover:border-neutral-600 hover:text-white"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {isSearchOpen ? (
        <div className="fixed inset-0 z-[70] bg-[#0a0a0a] lg:hidden">
          <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-3">
            <div className="min-w-0 flex-1 [&_input]:border-neutral-700 [&_input]:bg-[#1c1c1c] [&_input]:text-white">
              <SearchBar businessDomain={businessDomain} onClose={closeSearch} dark />
            </div>
            <button
              type="button"
              onClick={closeSearch}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-neutral-300"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
