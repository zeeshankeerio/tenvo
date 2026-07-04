'use client';

import { Suspense } from 'react';
import { cn } from '@/lib/utils';
import { RestaurantMenuSidebar } from '@/components/storefront/restaurant/RestaurantMenuSidebar';
import { RestaurantOrderModeBar } from '@/components/storefront/restaurant/RestaurantOrderModeBar';
import { RestaurantOrderModeUrlSync } from '@/components/storefront/restaurant/RestaurantOrderModeUrlSync';
import { X } from 'lucide-react';
import { useRestaurantChrome } from '@/components/storefront/restaurant/RestaurantChromeContext';
import { RESTAURANT_MENU_THEME } from '@/lib/storefront/restaurantMenu';

/**
 * Digital menu shell — sticky sidebar + scrollable catalog column.
 */
export function RestaurantMenuLayout({
  children,
  storeBase,
  categories = [],
  settings = {},
  businessDomain,
  accent = RESTAURANT_MENU_THEME.accentFallback,
  title,
  subtitle,
  toolbar,
  className,
}) {
  const { isSidebarOpen, closeSidebar } = useRestaurantChrome();

  return (
    <div
      className={cn('relative min-h-[calc(100vh-120px)]', className)}
      style={{ backgroundColor: RESTAURANT_MENU_THEME.pageBg }}
      data-restaurant-menu
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-green-500/[0.07] to-transparent"
        aria-hidden
      />
      <Suspense fallback={null}>
        <RestaurantOrderModeUrlSync />
      </Suspense>
      <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mb-4 space-y-3 lg:mb-6">
          <RestaurantOrderModeBar
            settings={settings}
            businessDomain={businessDomain}
            variant="bar"
          />
          {(title || subtitle) && (
            <div>
              {title ? (
                <h1 className="text-xl font-semibold text-white sm:text-2xl">{title}</h1>
              ) : null}
              {subtitle ? <p className="mt-1 text-sm text-neutral-400">{subtitle}</p> : null}
            </div>
          )}
        </div>

        <div className="flex items-start gap-4 lg:gap-6">
          <aside className="sticky top-[132px] hidden w-[200px] shrink-0 self-start lg:block xl:w-[220px] xl:top-[140px]">
            <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-neutral-900" aria-hidden />}>
              <RestaurantMenuSidebar
                storeBase={storeBase}
                categories={categories}
                accent={accent}
              />
            </Suspense>
          </aside>

          <div className="min-w-0 flex-1 pb-8">
            {toolbar ? <div className="mb-4">{toolbar}</div> : null}
            {children}
          </div>
        </div>
      </div>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeSidebar}
            aria-label="Close menu categories"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(280px,85vw)] flex-col bg-[#0a0a0a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
              <p className="text-sm font-semibold text-white">Categories</p>
              <button
                type="button"
                onClick={closeSidebar}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-neutral-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <Suspense fallback={null}>
                <RestaurantMenuSidebar
                  storeBase={storeBase}
                  categories={categories}
                  accent={accent}
                  compact
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
