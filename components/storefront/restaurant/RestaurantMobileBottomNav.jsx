'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, UtensilsCrossed, ShoppingBag, User, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { resolveRestaurantTheme } from '@/lib/storefront/restaurantStorefront';
import { RESTAURANT_MENU_THEME } from '@/lib/storefront/restaurantMenu';
import { useRestaurantChrome } from '@/components/storefront/restaurant/RestaurantChromeContext';

/**
 * Light app-style bottom nav for restaurant storefronts (mobile only).
 */
export function RestaurantMobileBottomNav() {
  const pathname = usePathname();
  const { businessDomain, settings } = useStorefront();
  const { cart } = useCart();
  const { openSidebar } = useRestaurantChrome();
  const theme = resolveRestaurantTheme(settings);
  const accent = theme.accent || RESTAURANT_MENU_THEME.accentFallback;

  const root = `/store/${businessDomain}`;
  const cartCount = cart?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  if (
    pathname.includes('/checkout') ||
    pathname.includes('/account/login') ||
    pathname.includes('/account/register')
  ) {
    return null;
  }

  const isMenuRoute = pathname.startsWith(`${root}/products`);

  const tabs = [
    {
      key: 'home',
      href: root,
      icon: Home,
      label: 'Home',
      active: pathname === root || pathname === `${root}/`,
    },
    {
      key: 'menu',
      href: `${root}/products`,
      icon: UtensilsCrossed,
      label: 'Menu',
      active: isMenuRoute,
    },
    {
      key: 'categories',
      icon: LayoutGrid,
      label: 'Categories',
      active: false,
      href: isMenuRoute ? undefined : `${root}/products?sort=popularity`,
      onClick: isMenuRoute ? () => openSidebar() : undefined,
    },
    {
      key: 'cart',
      href: `${root}/cart`,
      icon: ShoppingBag,
      label: 'Cart',
      badge: cartCount,
      active: pathname.startsWith(`${root}/cart`),
      highlight: cartCount > 0,
    },
    {
      key: 'orders',
      href: `${root}/orders`,
      icon: User,
      label: 'Orders',
      active: pathname.startsWith(`${root}/orders`) || pathname.startsWith(`${root}/account`),
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200/90 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-lg pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Restaurant navigation"
    >
      <div className="grid h-14 grid-cols-5">
        {tabs.map(({ key, href, icon: Icon, label, active, badge, highlight, onClick }) => {
          const content = (
            <>
              <span className="relative flex h-6 w-6 items-center justify-center">
                <Icon
                  className={cn('h-[22px] w-[22px]', active && 'stroke-[2.5]')}
                  aria-hidden
                />
                {badge > 0 ? (
                  <span
                    className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                    style={{ backgroundColor: RESTAURANT_MENU_THEME.cartCta }}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  'text-[10px] font-semibold leading-none',
                  active ? 'text-zinc-900' : 'text-zinc-500'
                )}
                style={active ? { color: accent } : undefined}
              >
                {label}
              </span>
            </>
          );

          if (onClick) {
            return (
              <button
                key={key}
                type="button"
                onClick={onClick}
                className="flex flex-col items-center justify-center gap-0.5 transition active:scale-95"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={key}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 transition active:scale-95',
                highlight && !active && 'text-red-600'
              )}
              aria-current={active ? 'page' : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
