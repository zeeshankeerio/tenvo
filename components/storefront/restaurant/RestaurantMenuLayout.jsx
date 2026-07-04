'use client';

import { useEffect } from 'react';
import { Suspense } from 'react';
import { cn } from '@/lib/utils';
import { RestaurantMenuSidebar } from '@/components/storefront/restaurant/RestaurantMenuSidebar';
import { RestaurantOrderModeUrlSync } from '@/components/storefront/restaurant/RestaurantOrderModeUrlSync';
import { X } from 'lucide-react';
import { useRestaurantChrome } from '@/components/storefront/restaurant/RestaurantChromeContext';
import { RESTAURANT_MENU_THEME } from '@/lib/storefront/restaurantMenu';

/**
 * Full-width compact digital menu — flush sidebar + catalog column.
 */
export function RestaurantMenuLayout({
  children,
  storeBase,
  categories = [],
  settings = {},
  businessDomain,
  accent = RESTAURANT_MENU_THEME.accentFallback,
  title = 'Our menu',
  toolbar,
  className,
}) {
  const { isSidebarOpen, closeSidebar, setMenuPageTitle } = useRestaurantChrome();

  useEffect(() => {
    setMenuPageTitle(title || 'Our menu');
    return () => setMenuPageTitle('Our menu');
  }, [title, setMenuPageTitle]);

  return (
    <div
      className={cn('flex w-full min-h-[calc(100vh-52px)] flex-col', className)}
      style={{ backgroundColor: RESTAURANT_MENU_THEME.pageBg }}
      data-restaurant-menu
    >
      <Suspense fallback={null}>
        <RestaurantOrderModeUrlSync />
      </Suspense>

      <div className="flex min-h-0 flex-1 w-full">
        <aside className="sticky top-[52px] hidden h-[calc(100vh-52px)] w-[168px] shrink-0 overflow-y-auto border-r border-zinc-200 bg-white xl:w-[180px] lg:block">
          <Suspense fallback={<div className="h-40 animate-pulse bg-zinc-100" aria-hidden />}>
            <RestaurantMenuSidebar
              storeBase={storeBase}
              categories={categories}
              accent={accent}
              flush
            />
          </Suspense>
        </aside>

        <div className="min-w-0 flex-1">
          {toolbar ? (
            <div className="border-b border-zinc-200 bg-white px-2 py-2 sm:px-3">{toolbar}</div>
          ) : null}
          <div className="px-2 py-2 sm:px-3 sm:py-3">{children}</div>
        </div>
      </div>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={closeSidebar}
            aria-label="Close menu categories"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(260px,88vw)] flex-col border-r border-zinc-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Menu</p>
              <button
                type="button"
                onClick={closeSidebar}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Suspense fallback={null}>
                <RestaurantMenuSidebar
                  storeBase={storeBase}
                  categories={categories}
                  accent={accent}
                  compact
                  flush
                  onNavigate={closeSidebar}
                />
              </Suspense>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
