'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { buildRestaurantMenuNavItems, RESTAURANT_MENU_THEME } from '@/lib/storefront/restaurantMenu';

function isNavActive(item, searchParams, pathname, productsPath) {
  const category = searchParams.get('category');
  const onSale = searchParams.get('onSale') === 'true';
  const sort = searchParams.get('sort');

  if (item.id === 'popular') {
    return pathname.startsWith(productsPath) && !category && !onSale && (sort === 'popularity' || !sort);
  }
  if (item.id === 'deals') return onSale;
  if (item.slug && category === item.slug) return true;
  return false;
}

/**
 * Flush category sidebar for full-width menu layout.
 */
export function RestaurantMenuSidebar({
  storeBase,
  categories = [],
  accent = RESTAURANT_MENU_THEME.accentFallback,
  className,
  onNavigate,
  compact = false,
  flush = false,
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const productsPath = `${storeBase}/products`;
  const items = buildRestaurantMenuNavItems(categories, storeBase);

  return (
    <nav
      className={cn(
        flush ? 'bg-white' : 'rounded-xl border border-zinc-200 bg-white shadow-sm',
        className
      )}
      aria-label="Menu categories"
    >
      {!flush ? (
        <div className={cn('border-b border-zinc-200 px-3 py-2', compact && 'px-2 py-1.5')}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Menu</p>
        </div>
      ) : (
        <div className="border-b border-zinc-100 px-2 py-2 lg:px-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Categories</p>
        </div>
      )}
      <ul
        className={cn(
          'space-y-0.5',
          flush ? 'p-1 lg:p-1.5' : 'p-1.5',
          compact ? 'max-h-[50vh]' : flush ? '' : 'max-h-[calc(100vh-200px)]',
          'overflow-y-auto'
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item, searchParams, pathname, productsPath);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold transition lg:gap-2.5 lg:px-2.5 lg:text-[13px]',
                  active
                    ? 'bg-red-50 text-red-700'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                )}
                style={active ? { color: accent } : undefined}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md lg:h-8 lg:w-8',
                    active ? 'bg-white shadow-sm' : 'bg-zinc-100'
                  )}
                  style={active ? { color: accent } : undefined}
                >
                  <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" aria-hidden />
                </span>
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
