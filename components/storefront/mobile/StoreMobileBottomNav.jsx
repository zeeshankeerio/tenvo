'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';

/**
 * Daraz / Amazon-style fixed bottom nav for public storefront (mobile only).
 */
export function StoreMobileBottomNav() {
  const pathname = usePathname();
  const { businessDomain, settings, business } = useStorefront();
  const { cart } = useCart();
  const accent = getStoreAccentColor(settings, business?.category);

  const root = `/store/${businessDomain}`;
  const cartCount =
    cart?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  // Full-screen flows, hide chrome
  if (
    pathname.includes('/checkout') ||
    pathname.includes('/account/login') ||
    pathname.includes('/account/register')
  ) {
    return null;
  }

  const items = [
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
      key: 'cart',
      href: `${root}/cart`,
      icon: ShoppingBag,
      label: 'Cart',
      badge: cartCount,
      active: pathname.startsWith(`${root}/cart`),
    },
    {
      key: 'account',
      href: `${root}/orders`,
      icon: User,
      label: 'Account',
      active: pathname.startsWith(`${root}/orders`) || pathname.startsWith(`${root}/account`),
    },
  ];

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      aria-label="Store navigation"
    >
      <div className="grid grid-cols-4 h-14">
        {items.map(({ key, href, icon: Icon, label, active, badge }) => (
          <Link
            key={key}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors relative',
              active ? 'text-gray-900' : 'text-gray-500'
            )}
            style={active ? { color: accent } : undefined}
          >
            <span className="relative">
              <Icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} aria-hidden />
              {badge > 0 && (
                <span
                  className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                  style={{ backgroundColor: accent }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default StoreMobileBottomNav;
