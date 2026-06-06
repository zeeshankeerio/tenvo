'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag, Search, Menu, User, Heart,
  Phone, MapPin, X, ChevronDown,
  Truck, Shield, RotateCcw, HelpCircle, Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { useWishlist } from '@/lib/hooks/storefront/useWishlist';
import { SearchBar } from './SearchBar';
import { MobileNav } from './MobileNav';
import { getDomainConfig, getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { formatCurrency } from '@/lib/currency';

export function StoreHeader({ business, categories, settings }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const categoryRef = useRef(null);

  const { cart } = useCart();
  const { wishlistCount } = useWishlist();
  const { businessDomain, currency } = useStorefront();

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  // Derive accent color — settings override > domain default
  const accent = getStoreAccentColor(settings, business?.category);
  const domainCfg = getDomainConfig(business?.category);

  // Top bar settings
  const topBarEnabled = settings?.storefront?.showTopBar !== false;
  const showServiceStrip = settings?.storefront?.showServiceStrip !== false;
  const announcement = settings?.announcement || domainCfg.bannerText;
  const contactPhone = settings?.contact?.phone || business?.phone;
  const contactCity = settings?.contact?.address || business?.city;
  const freeShip = settings?.freeShippingThreshold;
  const returnDays = settings?.returnPolicyDays;

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close category dropdown on outside click
  useEffect(() => {
    const onClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const pathname = usePathname();
  const isActive = (href) => pathname === href || pathname.startsWith(href + '?');
  const storeRoot = `/store/${businessDomain}`;
  const isHome = pathname === storeRoot || pathname === `${storeRoot}/`;

  const visibleCategories = categories?.slice(0, 5) || [];
  const extraCategories = categories?.slice(5) || [];

  return (
    <header className="sticky top-0 z-50">
      {/* ── Announcement / Top Bar ─────────────────────────────────────── */}
      {topBarEnabled && (
        <div
          className="text-white text-xs py-2 px-4"
          style={{ backgroundColor: accent }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Left: contact info */}
            <div className="flex items-center gap-4 min-w-0">
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="flex items-center gap-1 hover:text-white/80 transition-colors whitespace-nowrap"
                >
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span className="hidden sm:inline">{contactPhone}</span>
                </a>
              )}
              {contactCity && (
                <span className="hidden md:flex items-center gap-1 text-white/80 truncate">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {contactCity}
                </span>
              )}
            </div>

            {/* Center: announcement */}
            {announcement && (
              <p className="text-center font-medium text-white/95 truncate hidden sm:block">
                {announcement}
              </p>
            )}

            {/* Right: orders link */}
            <Link
              href={`/store/${businessDomain}/orders`}
              className="whitespace-nowrap hover:text-white/80 transition-colors hidden sm:block"
            >
              Track Order
            </Link>
          </div>
        </div>
      )}

      {/* ── Main Header ────────────────────────────────────────────────── */}
      <div
        className={cn(
          'bg-white border-b transition-all duration-200',
          isScrolled ? 'shadow-md' : 'shadow-none'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              'flex items-center justify-between gap-4 transition-all duration-200',
              isScrolled ? 'py-2.5' : 'py-4'
            )}
          >
            {/* ── Logo ─────────────────────────────────────────────────── */}
            <Link
              href={`/store/${businessDomain}`}
              className="flex items-center gap-2.5 flex-shrink-0 group"
            >
              {business?.logo_url ? (
                <SmartProductImage
                  src={business.logo_url}
                  alt={business.business_name}
                  width={120}
                  height={36}
                  className={cn(
                    'w-auto object-contain transition-all duration-200',
                    isScrolled ? 'h-7' : 'h-9'
                  )}
                />
              ) : (
                <div
                  className={cn(
                    'rounded-xl flex items-center justify-center text-white font-black transition-all duration-200',
                    isScrolled ? 'w-7 h-7 text-sm' : 'w-9 h-9 text-base'
                  )}
                  style={{ backgroundColor: accent }}
                >
                  {business?.business_name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <span
                className={cn(
                  'font-black text-gray-900 hidden sm:block transition-all duration-200 group-hover:opacity-80',
                  isScrolled ? 'text-base' : 'text-lg'
                )}
              >
                {business?.business_name}
              </span>
            </Link>

            {/* ── Desktop Category Nav ──────────────────────────────────── */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              <Link
                href={storeRoot}
                className={cn(
                  'px-3 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap',
                  isHome ? 'text-white' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                )}
                style={isHome ? { backgroundColor: accent } : {}}
              >
                Home
              </Link>
              <Link
                href={`/store/${businessDomain}/products`}
                className={cn(
                  'px-3 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap',
                  isActive(`/store/${businessDomain}/products`)
                    ? 'text-white'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                )}
                style={isActive(`/store/${businessDomain}/products`) ? { backgroundColor: accent } : {}}
              >
                All Products
              </Link>

              {visibleCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/store/${businessDomain}/products?category=${cat.slug}`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  {cat.name}
                </Link>
              ))}

              {extraCategories.length > 0 && (
                <div className="relative" ref={categoryRef}>
                  <button
                    onClick={() => setCategoryMenuOpen((v) => !v)}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    More
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform duration-200',
                        categoryMenuOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {categoryMenuOpen && (
                    <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                      {extraCategories.map((cat) => (
                        <Link
                          key={cat.id}
                          href={`/store/${businessDomain}/products?category=${cat.slug}`}
                          onClick={() => setCategoryMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </nav>

            {/* ── Actions ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-1">
              {/* Search */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Wishlist — desktop only */}
              <Link
                href={`/store/${businessDomain}/account/wishlist`}
                className="relative hidden sm:flex p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label={`Wishlist (${wishlistCount} items)`}
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white text-[10px] font-black px-1"
                    style={{ backgroundColor: accent }}
                  >
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Account — desktop only */}
              <Link
                href={`/store/${businessDomain}/orders`}
                className="hidden sm:flex p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="My Orders"
              >
                <User className="w-5 h-5" />
              </Link>

              {/* Cart */}
              <Link
                href={`/store/${businessDomain}/cart`}
                className="relative p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label={`Cart (${cartItemCount} items)`}
              >
                <ShoppingBag className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white text-[10px] font-black px-1"
                    style={{ backgroundColor: accent }}
                  >
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </Link>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors ml-1"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Service strip (desktop): shipping, returns, help, contact ─── */}
      {showServiceStrip && (
        <div className="hidden md:block bg-slate-50/95 border-b border-slate-200/90">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <nav
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-600"
              aria-label="Store policies and help"
            >
              <Link
                href={`${storeRoot}/shipping`}
                className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors"
              >
                <Truck className="w-3.5 h-3.5" style={{ color: accent }} aria-hidden />
                {typeof freeShip === 'number' && freeShip > 0
                  ? `Free over ${formatCurrency(freeShip, currency || 'PKR', { maximumFractionDigits: 0 })}`
                  : 'Shipping'}
              </Link>
              <span className="text-slate-300 select-none" aria-hidden>
                |
              </span>
              <Link
                href={`${storeRoot}/returns`}
                className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" style={{ color: accent }} aria-hidden />
                {typeof returnDays === 'number' && returnDays > 0
                  ? `${returnDays}-day returns`
                  : 'Returns'}
              </Link>
              <span className="text-slate-300 select-none" aria-hidden>
                |
              </span>
              <Link
                href={`${storeRoot}/faqs`}
                className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" style={{ color: accent }} aria-hidden />
                FAQs
              </Link>
              <span className="text-slate-300 select-none" aria-hidden>
                |
              </span>
              <Link
                href={`${storeRoot}/contact`}
                className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" style={{ color: accent }} aria-hidden />
                Contact
              </Link>
              <span className="text-slate-300 select-none" aria-hidden>
                |
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-500 normal-case font-medium tracking-normal">
                <Shield className="w-3.5 h-3.5" style={{ color: accent }} aria-hidden />
                Secure checkout
              </span>
            </nav>
          </div>
        </div>
      )}

      {/* ── Search Overlay ─────────────────────────────────────────────── */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="font-semibold text-gray-900 flex-1">Search Products</h3>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <SearchBar
              businessDomain={businessDomain}
              onClose={() => setIsSearchOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Mobile Nav ─────────────────────────────────────────────────── */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        categories={categories}
        businessDomain={businessDomain}
        accent={accent}
      />
    </header>
  );
}
