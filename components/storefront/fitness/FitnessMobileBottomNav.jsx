'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingBag, Calendar, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import {
  getTenantMeetingUrl,
  shouldOfferTenantMeetingLink,
} from '@/lib/storefront/storefrontBooking';
import { useFitnessChromeOptional } from '@/components/storefront/fitness/FitnessChromeContext';

/**
 * Gym app-style bottom navigation (mobile / tablet below lg only).
 */
export function FitnessMobileBottomNav() {
  const pathname = usePathname();
  const { businessDomain, settings, business } = useStorefront();
  const { cart } = useCart();
  const chrome = useFitnessChromeOptional();
  const accent = getStoreAccentColor(settings, business?.category);

  const root = `/store/${businessDomain}`;
  const cartCount = cart?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  const meetingUrl = shouldOfferTenantMeetingLink(business, business?.category, settings)
    ? getTenantMeetingUrl(business, settings)
    : null;
  const bookHref = meetingUrl || `${root}#book`;

  if (
    pathname.includes('/checkout') ||
    pathname.includes('/account/login') ||
    pathname.includes('/account/register')
  ) {
    return null;
  }

  const tabs = [
    {
      key: 'home',
      href: root,
      icon: Home,
      label: 'Home',
      active: pathname === root || pathname === `${root}/`,
    },
    {
      key: 'shop',
      href: `${root}/products`,
      icon: LayoutGrid,
      label: 'Shop',
      active: pathname.startsWith(`${root}/products`),
    },
    {
      key: 'book',
      href: bookHref,
      icon: Calendar,
      label: 'Book',
      active: pathname.includes('#book') || pathname.startsWith(`${root}/contact`),
      fab: true,
      external: Boolean(meetingUrl),
    },
    {
      key: 'cart',
      href: `${root}/cart`,
      icon: ShoppingBag,
      label: 'Cart',
      badge: cartCount,
      active: pathname.startsWith(`${root}/cart`),
    },
    {
      key: 'menu',
      icon: Menu,
      label: 'Menu',
      active: chrome?.isMobileMenuOpen,
      onClick: () => chrome?.setIsMobileMenuOpen?.((open) => !open),
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0a0a0a]/95 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-lg pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Gym store navigation"
    >
      <div className="grid h-[3.75rem] grid-cols-5 items-end px-1">
        {tabs.map(({ key, href, icon: Icon, label, active, badge, fab, external, onClick }) => {
          const content = (
            <>
              <span
                className={cn(
                  'relative flex items-center justify-center',
                  fab && '-mt-5 h-12 w-12 rounded-full text-white shadow-lg shadow-rose-950/40',
                  !fab && 'h-7 w-7'
                )}
                style={fab ? { backgroundColor: accent } : undefined}
              >
                <Icon
                  className={cn(fab ? 'h-5 w-5' : 'h-[22px] w-[22px]', active && !fab && 'stroke-[2.5]')}
                  aria-hidden
                />
                {badge > 0 && !fab ? (
                  <span
                    className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  'mt-0.5 text-[10px] font-semibold leading-none',
                  fab ? 'text-rose-300' : active ? 'text-white' : 'text-white/50'
                )}
              >
                {label}
              </span>
              {active && !fab ? (
                <span
                  className="absolute top-0 h-0.5 w-8 rounded-full"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
              ) : null}
            </>
          );

          const className = cn(
            'relative flex flex-col items-center justify-end pb-1.5 transition-colors active:scale-95',
            fab && 'pb-0'
          );

          if (onClick) {
            return (
              <button key={key} type="button" onClick={onClick} className={className} aria-label={label}>
                {content}
              </button>
            );
          }

          if (external) {
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {content}
              </a>
            );
          }

          return (
            <Link key={key} href={href} className={className} aria-current={active ? 'page' : undefined}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default FitnessMobileBottomNav;
