'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Search, MapPin, X, FileUp, Truck, Phone, ChevronRight, User, ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { SearchBar } from '@/components/storefront/SearchBar';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { formatCurrency } from '@/lib/currency';
import { resolveStoreContact } from '@/lib/storefront/businessContact';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { getStoreHomeCopy } from '@/lib/storefront/storeCopy';
import {
  formatPharmacyStoreName,
  resolvePharmacyCategoryNav,
} from '@/lib/storefront/pharmacyStorefront';
import { PharmacyMobileMenu } from '@/components/storefront/pharmacy/PharmacyMobileMenu';
import { resolveStorefrontLogo } from '@/lib/storefront/resolveStorefrontLogo';
import { usePharmacyChrome } from '@/components/storefront/pharmacy/PharmacyChromeContext';

/**
 * Unified pharmacy storefront header — compact app-style on mobile, full bar on desktop.
 */
export function PharmacySiteHeader({ business, settings }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const {
    isMobileMenuOpen,
    isSearchOpen,
    openSearch,
    closeSearch,
    setIsMobileMenuOpen,
  } = usePharmacyChrome();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { businessDomain, currency } = useStorefront();
  const { cart } = useCart();
  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const accent = getStoreAccentColor(settings, business?.category);
  const storeCopy = getStoreHomeCopy(business, {});
  const contact = resolveStoreContact({ business, settings });
  const storeRoot = `/store/${businessDomain}`;
  const displayName = formatPharmacyStoreName(business?.business_name);
  const storeLogoUrl = resolveStorefrontLogo(business, settings);
  const announcement = settings?.announcement || 'Genuine medicines · Pharmacist support';
  const freeShip = settings?.freeShippingThreshold;
  const categoryItems = resolvePharmacyCategoryNav(settings, storeRoot);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isCategoryActive = (href) => {
    const url = new URL(href, 'https://tenvo.local');
    if (!pathname.startsWith(url.pathname)) return false;
    const category = url.searchParams.get('category');
    const onSale = url.searchParams.get('onSale');
    if (category) return searchParams.get('category') === category;
    if (onSale) return searchParams.get('onSale') === 'true';
    return pathname === url.pathname || pathname === `${url.pathname}/`;
  };

  const isShopAllActive =
    (pathname === `${storeRoot}/products` || pathname === `${storeRoot}/products/`)
    && !searchParams.get('category')
    && searchParams.get('onSale') !== 'true';

  const categoryLinks = [
    { id: 'all', label: 'All', href: `${storeRoot}/products`, active: isShopAllActive },
    ...categoryItems.map((item) => ({
      id: item.id,
      label: item.label.split(' & ')[0].split(' ').slice(0, 2).join(' '),
      fullLabel: item.label,
      href: item.href,
      active: isCategoryActive(item.href),
    })),
  ];

  return (
    <header className="sticky top-0 z-50">
      {/* Mobile utility strip */}
      <div className="border-b border-emerald-800/20 text-white lg:hidden" style={{ backgroundColor: accent }}>
        <div className="flex h-7 items-center justify-between gap-2 px-3 text-[10px] font-medium">
          {contact.city ? (
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              {contact.city}
            </span>
          ) : (
            <span className="truncate opacity-90">{announcement}</span>
          )}
          <Link href={`${storeRoot}/orders`} className="shrink-0 font-semibold text-white/95">
            Track order
          </Link>
        </div>
      </div>

      {/* Desktop utility bar */}
      <div className="hidden border-b border-emerald-800/20 text-white lg:block" style={{ backgroundColor: accent }}>
        <div className="mx-auto flex h-8 max-w-[1400px] items-center justify-between gap-3 px-4 text-[11px] font-medium sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {contact.city ? (
              <span className="inline-flex items-center gap-1 truncate text-white/90">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                {contact.city}
              </span>
            ) : null}
            {contact.phone ? (
              <a href={`tel:${contact.phone}`} className="hidden items-center gap-1 text-white/85 hover:text-white xl:inline-flex">
                <Phone className="h-3 w-3" aria-hidden />
                {contact.phone}
              </a>
            ) : null}
          </div>
          <p className="hidden min-w-0 flex-1 truncate text-center text-white/95 sm:block">{announcement}</p>
          <div className="flex shrink-0 items-center gap-3">
            {typeof freeShip === 'number' && freeShip > 0 ? (
              <span className="hidden items-center gap-1 text-white/90 xl:inline-flex">
                <Truck className="h-3 w-3" aria-hidden />
                Free over {formatCurrency(freeShip, currency || 'PKR', { maximumFractionDigits: 0 })}
              </span>
            ) : null}
            <Link href={`${storeRoot}/faqs`} className="text-white/90 hover:text-white">
              Help
            </Link>
            <Link href={`${storeRoot}/orders`} className="font-semibold text-white hover:text-white/90">
              Track order
            </Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div
        className={cn(
          'border-b border-emerald-100/80 bg-white transition-shadow duration-200',
          isScrolled && 'shadow-sm'
        )}
      >
        <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
          {/* Mobile app header */}
          <div className="space-y-2 py-2 lg:hidden">
            <div className="flex items-center gap-2">
              <Link href={storeRoot} className="flex min-w-0 shrink-0 items-center gap-2">
                {storeLogoUrl ? (
                  <SmartProductImage
                    src={storeLogoUrl}
                    alt={displayName}
                    width={96}
                    height={28}
                    className="h-7 w-auto object-contain"
                  />
                ) : (
                  <span className="text-sm font-bold text-emerald-800">{displayName}</span>
                )}
              </Link>
              <Link
                href={`${storeRoot}/contact?prescription=1`}
                className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800"
              >
                <FileUp className="h-3 w-3" aria-hidden />
                Rx
              </Link>
            </div>

            <button
              type="button"
              onClick={openSearch}
              className="flex w-full items-center gap-2.5 rounded-xl bg-slate-100 px-3 py-2.5 text-left active:bg-slate-200/80"
              aria-label="Open search"
            >
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-500">
                {storeCopy.searchPlaceholder || 'Search medicines & health products'}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
            </button>
          </div>

          {/* Desktop main bar */}
          <div className="hidden h-[60px] items-center gap-4 lg:flex">
            <Link href={storeRoot} className="flex shrink-0 items-center gap-2.5">
              {storeLogoUrl ? (
                <SmartProductImage
                  src={storeLogoUrl}
                  alt={displayName}
                  width={132}
                  height={36}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <span className="text-lg font-bold tracking-tight text-emerald-800">{displayName}</span>
              )}
            </Link>

            <div className="min-w-0 max-w-2xl flex-1">
              <SearchBar businessDomain={businessDomain} />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Link
                href={`${storeRoot}/contact?prescription=1`}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-95"
                style={{ backgroundColor: accent }}
              >
                <FileUp className="h-3.5 w-3.5" aria-hidden />
                Upload Rx
              </Link>
              <Link
                href={`${storeRoot}/orders`}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800"
                aria-label="My orders"
              >
                <User className="h-5 w-5" />
              </Link>
              <Link
                href={`${storeRoot}/cart`}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800"
                aria-label="Cart"
              >
                <ShoppingBag className="h-5 w-5" />
                {cartItemCount > 0 ? (
                  <span
                    className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile category chips */}
      <nav className="border-b border-slate-100 bg-white lg:hidden" aria-label="Quick categories">
        <div className="mx-auto max-w-[1400px] px-3">
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
            {categoryLinks.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                title={item.fullLabel || item.label}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition active:scale-[0.98]',
                  item.active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Desktop category underline nav */}
      <nav className="hidden border-b border-slate-200/90 bg-white lg:block" aria-label="Shop categories">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
            <Link
              href={`${storeRoot}/products`}
              className={cn(
                'shrink-0 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition',
                isShopAllActive
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-600 hover:border-emerald-200 hover:text-emerald-800'
              )}
            >
              Shop all
            </Link>
            {categoryItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'shrink-0 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition',
                  isCategoryActive(item.href)
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-600 hover:border-emerald-200 hover:text-emerald-800'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile full-screen search */}
      {isSearchOpen ? (
        <div className="fixed inset-0 z-[70] flex flex-col bg-white lg:hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={closeSearch}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600"
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="text-sm font-semibold text-slate-900">Search</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <SearchBar businessDomain={businessDomain} onClose={closeSearch} />
          </div>
        </div>
      ) : null}

      <PharmacyMobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        businessDomain={businessDomain}
        storeRoot={storeRoot}
        displayName={displayName}
        categoryItems={categoryItems}
        accent={accent}
        contact={contact}
      />
    </header>
  );
}
