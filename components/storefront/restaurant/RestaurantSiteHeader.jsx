'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { RestaurantMenuHeaderControls } from '@/components/storefront/restaurant/RestaurantMenuHeaderControls';

function MenuMobileSearch({ businessDomain, onClose }) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  return (
    <SearchBar
      businessDomain={businessDomain}
      initialQuery={searchQuery}
      onClose={onClose}
      key={`mobile-${searchQuery}`}
    />
  );
}

/**
 * Restaurant header — compact light menu bar or dark marketing header on home.
 */
export function RestaurantSiteHeader({ business, settings }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { isSearchOpen, openSearch, closeSearch, openSidebar } = useRestaurantChrome();
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
          'sticky top-0 z-50 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md',
          isScrolled && 'shadow-sm'
        )}
        data-store-restaurant-header
        data-restaurant-menu-header
      >
        <div className="flex w-full items-center gap-2 px-3 py-2 sm:gap-2.5 sm:px-4">
          <button
            type="button"
            onClick={openSidebar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 transition hover:bg-zinc-100 lg:hidden"
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
                className="h-7 w-auto max-w-[96px] object-contain sm:max-w-[120px]"
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

          <div className="hidden shrink-0 border-l border-zinc-200 pl-2.5 md:block">
            <RestaurantOrderModeBar
              settings={settings}
              businessDomain={businessDomain}
              variant="compact"
              accent={accent}
              theme="light"
            />
          </div>

          <RestaurantMenuHeaderControls businessDomain={businessDomain} />

          <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
            <button
              type="button"
              onClick={openSearch}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 transition hover:bg-zinc-100 md:hidden"
              aria-label="Search menu"
            >
              <Search className="h-4 w-4" />
            </button>

            <Link
              href={`${storeRoot}/cart`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 sm:px-3.5"
              style={{ backgroundColor: RESTAURANT_MENU_THEME.cartCta }}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">
                {cartItemCount > 0 ? `Cart (${cartItemCount})` : 'Cart'}
              </span>
              {cartItemCount > 0 ? (
                <span className="sm:hidden">{cartItemCount}</span>
              ) : null}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-zinc-100 px-3 py-1.5 md:hidden">
          <RestaurantOrderModeBar
            settings={settings}
            businessDomain={businessDomain}
            variant="compact"
            accent={accent}
            theme="light"
            className="min-w-0 flex-1"
          />
        </div>

        {isSearchOpen ? (
          <div className="fixed inset-0 z-[70] bg-white md:hidden">
            <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <Suspense fallback={null}>
                  <MenuMobileSearch businessDomain={businessDomain} onClose={closeSearch} />
                </Suspense>
              </div>
              <button
                type="button"
                onClick={closeSearch}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
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
      className={cn(
        'sticky top-0 z-50 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md',
        isScrolled && 'shadow-sm'
      )}
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

      <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 py-2 sm:gap-2.5 lg:py-2.5">
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
                <span className="text-zinc-900">{namePrimary}</span>
                {nameSecondary ? (
                  <span className="ml-1" style={{ color: accent }}>
                    {nameSecondary}
                  </span>
                ) : null}
              </span>
            )}
          </Link>

          <div className="hidden min-w-0 flex-1 lg:block lg:max-w-xl xl:max-w-2xl lg:px-2">
            <div className="[&_input]:h-9 [&_input]:rounded-lg [&_input]:border-zinc-200 [&_input]:bg-zinc-50 [&_input]:py-2 [&_input]:pl-10 [&_input]:text-sm [&_input]:placeholder:text-zinc-400 [&_svg:first-child]:left-3 [&_button[type=submit]]:hidden">
              <SearchBar businessDomain={businessDomain} />
            </div>
          </div>

          {config.showOrderModes !== false ? (
            <div className="hidden shrink-0 border-l border-zinc-200 pl-2.5 lg:block">
              <RestaurantOrderModeBar
                settings={settings}
                businessDomain={businessDomain}
                variant="compact"
                accent={accent}
                theme="light"
                className="max-w-full"
              />
            </div>
          ) : null}

          <div className="ml-auto flex flex-1 items-center justify-end gap-2 lg:flex-none">
            <button
              type="button"
              onClick={openSearch}
              className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-left lg:hidden"
              aria-label="Open search"
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">
                {config.searchPlaceholder || 'Search dishes…'}
              </span>
            </button>

            <Link
              href={`${storeRoot}/cart`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 sm:gap-2 sm:text-sm"
              style={{ backgroundColor: RESTAURANT_MENU_THEME.cartCta }}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">
                {cartItemCount > 0 ? `Cart (${cartItemCount})` : 'View cart'}
              </span>
              <span className="sm:hidden">{cartItemCount > 0 ? cartItemCount : 'Cart'}</span>
            </Link>
          </div>
        </div>

        {config.showOrderModes !== false ? (
          <div className="flex flex-col gap-2 border-t border-zinc-100 py-2 lg:hidden">
            <RestaurantOrderModeBar
              settings={settings}
              businessDomain={businessDomain}
              variant="compact"
              accent={accent}
              theme="light"
            />
          </div>
        ) : null}

        {isHomePage && quickSearchTerms.length > 0 ? (
          <div className="hidden items-center gap-2 border-t border-zinc-100 py-2 lg:flex">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Popular
            </span>
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {quickSearchTerms.slice(0, 6).map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => router.push(`${productsUrl}?search=${encodeURIComponent(term)}`)}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {isSearchOpen ? (
        <div className="fixed inset-0 z-[70] bg-white lg:hidden">
          <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-3">
            <div className="min-w-0 flex-1">
              <SearchBar businessDomain={businessDomain} onClose={closeSearch} />
            </div>
            <button
              type="button"
              onClick={closeSearch}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
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
