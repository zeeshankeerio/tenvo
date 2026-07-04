'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, MapPin, X, ShoppingBag, PanelLeft } from 'lucide-react';
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
  resolveRestaurantTheme,
} from '@/lib/storefront/restaurantStorefront';
import { RESTAURANT_MENU_THEME } from '@/lib/storefront/restaurantMenu';
import { useRestaurantChrome } from '@/components/storefront/restaurant/RestaurantChromeContext';

/**
 * Premium dark digital-menu header — logo, search, cart CTA.
 */
export function RestaurantSiteHeader({ business, settings }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { isSearchOpen, openSearch, closeSearch, openSidebar } = useRestaurantChrome();
  const pathname = usePathname();
  const { businessDomain, currency, categories } = useStorefront();
  const { cart } = useCart();
  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const theme = resolveRestaurantTheme(settings);
  const accent = theme.accent || RESTAURANT_MENU_THEME.accentFallback;
  const storeRoot = `/store/${businessDomain}`;
  const displayName = formatRestaurantStoreName(business?.business_name);
  const nameParts = displayName.split(/\s+/);
  const namePrimary = nameParts[0] || displayName;
  const nameSecondary = nameParts.slice(1).join(' ') || 'Menu';
  const storeLogoUrl = resolveStorefrontLogo(business, settings);
  const contact = resolveStoreContact({ business, settings });
  const config = getRestaurantConfig(settings, businessDomain);
  const freeShip = settings?.freeShippingThreshold;
  const deliveryNotice = config.deliveryNotice;
  const isMenuPage = pathname.startsWith(`${storeRoot}/products`);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 6);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 border-b border-neutral-800 bg-[#0a0a0a]"
      data-store-restaurant-header
    >
      <div
        className="text-white"
        style={{ backgroundColor: theme.promoBar || accent }}
      >
        <div className="mx-auto flex min-h-8 max-w-[1400px] items-center justify-between gap-2 px-3 py-1.5 text-[10px] font-medium sm:px-6 sm:text-[11px] lg:px-8">
          <span className="inline-flex min-w-0 items-center gap-1 truncate sm:max-w-[55%]">
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
          'border-b border-neutral-800 bg-[#0a0a0a] transition-shadow',
          isScrolled && 'shadow-lg shadow-black/40'
        )}
      >
        <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-2.5 lg:py-3">
            <button
              type="button"
              onClick={openSidebar}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-300 lg:hidden"
              aria-label="Open menu categories"
            >
              <PanelLeft className="h-5 w-5" />
            </button>

            <Link href={storeRoot} className="flex min-w-0 shrink-0 items-center gap-2">
              {storeLogoUrl ? (
                <SmartProductImage
                  src={storeLogoUrl}
                  alt={displayName}
                  width={120}
                  height={32}
                  className="h-8 w-auto max-w-[120px] object-contain sm:max-w-[148px] sm:h-9"
                />
              ) : (
                <span className="truncate text-base font-semibold tracking-tight sm:text-xl">
                  <span className="text-white">{namePrimary}</span>
                  {nameSecondary ? (
                    <span className="ml-1.5" style={{ color: accent }}>
                      {nameSecondary}
                    </span>
                  ) : null}
                </span>
              )}
            </Link>

            <div className="hidden min-w-0 flex-1 lg:block lg:max-w-2xl lg:px-4">
              <div className="[&_input]:border-neutral-700 [&_input]:bg-[#1c1c1c] [&_input]:text-white [&_input]:placeholder:text-neutral-500 [&_button]:bg-neutral-800">
                <SearchBar businessDomain={businessDomain} dark />
              </div>
            </div>

            <button
              type="button"
              onClick={openSearch}
              className="ml-auto flex h-10 flex-1 items-center gap-2 rounded-xl border border-neutral-700 bg-[#1c1c1c] px-3 text-left lg:hidden"
              aria-label="Open search"
            >
              <Search className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-500">
                {config.searchPlaceholder || 'Search item'}
              </span>
            </button>

            <Link
              href={`${storeRoot}/cart`}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-white transition hover:opacity-95 sm:px-4 sm:text-sm',
                isMenuPage ? 'lg:ml-0' : 'lg:ml-auto'
              )}
              style={{ backgroundColor: RESTAURANT_MENU_THEME.cartCta }}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">
                {cartItemCount > 0 ? `Items in cart (${cartItemCount})` : 'View cart'}
              </span>
              <span className="sm:hidden">{cartItemCount > 0 ? cartItemCount : 'Cart'}</span>
            </Link>
          </div>
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
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-neutral-300"
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
