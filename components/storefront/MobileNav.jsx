'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, ChevronDown, Home, ShoppingBag, User, Heart, Package, Truck, RotateCcw, HelpCircle, Phone } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { useWishlist } from '@/lib/hooks/storefront/useWishlist';
import { BRAND_PRIMARY } from '@/lib/theme/brandTokens';

export function MobileNav({ isOpen, onClose, categories, businessDomain, accent = BRAND_PRIMARY, navLinks }) {
  const [catsOpen, setCatsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { cart } = useCart();
  const { wishlistCount } = useWishlist();

  const cartCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const storeRoot = `/store/${businessDomain}`;
  const useCustomNav = Array.isArray(navLinks) && navLinks.length > 0;

  const mainLinks = [
    { label: 'Home',     href: storeRoot,                 icon: Home },
    { label: 'Products', href: `${storeRoot}/products`,         icon: ShoppingBag, badge: cartCount },
    { label: 'Wishlist', href: `${storeRoot}/account/wishlist`, icon: Heart,        badge: wishlistCount },
    { label: 'My Orders',href: `${storeRoot}/orders`,           icon: Package },
  ];

  const supportLinks = [
    { label: 'Shipping Info',       href: `${storeRoot}/shipping`,  icon: Truck },
    { label: 'Returns & Exchanges', href: `${storeRoot}/returns`,   icon: RotateCcw },
    { label: 'FAQs',                href: `${storeRoot}/faqs`,      icon: HelpCircle },
    { label: 'Contact Us',          href: `${storeRoot}/contact`,   icon: Phone },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[85vw] sm:max-w-sm p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold text-gray-900">Menu</SheetTitle>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto">
          {/* Main links */}
          <div className="px-3 py-3">
            {useCustomNav ? (
              navLinks.map((link) => (
                <Link
                  key={link.id || link.href}
                  href={link.href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <span className="font-semibold text-gray-800 group-hover:text-gray-900 flex-1">{link.label}</span>
                </Link>
              ))
            ) : (
              mainLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: accent + '18' }}
                  >
                    <link.icon className="w-4.5 h-4.5 w-[18px] h-[18px]" style={{ color: accent }} />
                  </div>
                  <span className="font-semibold text-gray-800 group-hover:text-gray-900 flex-1">{link.label}</span>
                  {link.badge > 0 && (
                    <span
                      className="text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1"
                      style={{ backgroundColor: accent }}
                    >
                      {link.badge > 99 ? '99+' : link.badge}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-gray-100" />

          {/* Categories accordion */}
          {categories?.length > 0 && !useCustomNav && (
            <div className="px-3 py-2">
              <button
                onClick={() => setCatsOpen((v) => !v)}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: accent + '18' }}
                >
                  <ShoppingBag className="w-[18px] h-[18px]" style={{ color: accent }} />
                </div>
                <span className="font-semibold text-gray-800 flex-1 text-left">Categories</span>
                <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform duration-200', catsOpen && 'rotate-180')} />
              </button>

              {catsOpen && (
                <div className="ml-12 mt-1 space-y-0.5">
                  <Link
                    href={`${storeRoot}/products`}
                    onClick={onClose}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    All Products
                  </Link>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`${storeRoot}/products?category=${cat.slug}`}
                      onClick={onClose}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      <span>{cat.name}</span>
                      {cat.product_count !== undefined && (
                        <span className="text-xs text-gray-400 tabular-nums">{cat.product_count}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="mx-5 border-t border-gray-100" />

          {/* Support accordion */}
          <div className="px-3 py-2">
            <button
              onClick={() => setSupportOpen((v) => !v)}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100">
                <HelpCircle className="w-[18px] h-[18px] text-gray-500" />
              </div>
              <span className="font-semibold text-gray-800 flex-1 text-left">Help & Support</span>
              <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform duration-200', supportOpen && 'rotate-180')} />
            </button>

            {supportOpen && (
              <div className="ml-12 mt-1 space-y-0.5">
                {supportLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <link.icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* CTA footer */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <Link
            href={useCustomNav ? `${storeRoot}/products` : `${storeRoot}/products`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            <ShoppingBag className="w-4 h-4" />
            {useCustomNav ? 'Explore inventory' : 'Shop Now'}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
