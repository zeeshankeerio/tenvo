'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { buildRestaurantMenuNavItems } from '@/lib/storefront/restaurantMenu';

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
 * Sticky category sidebar — digital menu navigation with icons.
 */
export function RestaurantMenuSidebar({
  storeBase,
  categories = [],
  accent = '#22c55e',
  className,
  onNavigate,
  compact = false,
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const productsPath = `${storeBase}/products`;
  const items = buildRestaurantMenuNavItems(categories, storeBase);

  return (
    <nav
      className={cn(
        'rounded-2xl border border-neutral-800 bg-[#141414] shadow-xl shadow-black/30',
        className
      )}
      aria-label="Menu categories"
    >
      <div className={cn('border-b border-neutral-800 px-4 py-3', compact && 'px-3 py-2')}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Menu</p>
      </div>
      <ul className={cn('space-y-0.5 p-2', compact ? 'max-h-[50vh]' : 'max-h-[calc(100vh-200px)]', 'overflow-y-auto scrollbar-thin')}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item, searchParams, pathname, productsPath);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                  active
                    ? 'text-white'
                    : 'text-neutral-400 hover:bg-neutral-800/80 hover:text-neutral-100'
                )}
                style={active ? { backgroundColor: `${accent}22`, color: accent } : undefined}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    active ? 'bg-neutral-900' : 'bg-neutral-900/60'
                  )}
                  style={active ? { color: accent } : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden />
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
