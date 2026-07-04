'use client';

import { useEffect } from 'react';
import { Suspense } from 'react';
import { cn } from '@/lib/utils';
import { RestaurantMenuSidebar } from '@/components/storefront/restaurant/RestaurantMenuSidebar';
import { RestaurantOrderModeUrlSync } from '@/components/storefront/restaurant/RestaurantOrderModeUrlSync';
import { RestaurantMenuMobileActions } from '@/components/storefront/restaurant/RestaurantMenuMobileActions';
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
  className,
}) {
  const { isSidebarOpen, closeSidebar, setMenuPageTitle } = useRestaurantChrome();

  useEffect(() => {
    setMenuPageTitle(title || 'Our menu');
    return () => setMenuPageTitle('Our menu');
  }, [title, setMenuPageTitle]);

  return (
    <div
      className={cn('flex w-full min-h-[calc(100vh-88px)] flex-col md:min-h-[calc(100vh-56px)]', className)}
      style={{ backgroundColor: RESTAURANT_MENU_THEME.pageBg }}
      data-restaurant-menu
    >
      <Suspense fallback={null}>
        <RestaurantOrderModeUrlSync />
      </Suspense>

      <div className="flex min-h-0 flex-1 w-full">
        <aside className="sticky top-[88px] hidden h-[calc(100vh-88px)] w-[220px] shrink-0 overflow-y-auto border-r border-zinc-200/80 bg-white md:top-[56px] md:h-[calc(100vh-56px)] lg:block xl:w-[240px]">
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
          <div className="border-b border-zinc-200/80 bg-white px-3 py-3 sm:px-4 sm:py-3.5">
            <div className="flex items-center justify-between gap-3">
              <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
                {title}
              </h1>
              <div className="md:hidden">
                <RestaurantMenuMobileActions businessDomain={businessDomain} />
              </div>
            </div>
          </div>
          <div className="px-3 py-3 sm:px-4 sm:py-4">{children}</div>
        </div>
      </div>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={closeSidebar}
            aria-label="Close menu categories"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(280px,90vw)] flex-col border-r border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Categories</p>
              <button
                type="button"
                onClick={closeSidebar}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
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
