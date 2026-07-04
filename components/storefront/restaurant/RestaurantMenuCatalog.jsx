'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RestaurantMenuItemCard,
  RestaurantMenuListItem,
} from '@/components/storefront/restaurant/RestaurantMenuItemCard';
import { ProductsSkeleton } from '@/components/storefront/LoadingSkeletons';

function MenuPagination({ businessDomain, currentPage, hasMore, filters }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = (page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/store/${businessDomain}/products?${params.toString()}`);
  };

  if (currentPage <= 1 && !hasMore) return null;

  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => goToPage(currentPage - 1)}
        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Previous
      </button>
      <span className="text-sm text-zinc-500">Page {currentPage}</span>
      <button
        type="button"
        disabled={!hasMore}
        onClick={() => goToPage(currentPage + 1)}
        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40"
      >
        Next
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/**
 * Grid or list catalog for restaurant menu items.
 */
export function RestaurantMenuCatalog({
  products = [],
  total = 0,
  hasMore = false,
  businessDomain,
  currentPage = 1,
  view = 'grid',
  accent = '#22c55e',
  emptyMessage = 'No dishes match your search. Try another category.',
}) {
  if (!products.length) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-12 text-center">
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {total > 0 ? (
        <p className="mb-3 text-xs font-medium text-zinc-500">
          {total} {total === 1 ? 'item' : 'items'}
        </p>
      ) : null}

      {view === 'list' ? (
        <div className="space-y-2.5">
          {products.map((product) => (
            <RestaurantMenuListItem
              key={product.id}
              product={product}
              businessDomain={businessDomain}
              accent={accent}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:gap-3.5">
          {products.map((product) => (
            <RestaurantMenuItemCard
              key={product.id}
              product={product}
              businessDomain={businessDomain}
              accent={accent}
            />
          ))}
        </div>
      )}

      <Suspense fallback={null}>
        <MenuPagination
          businessDomain={businessDomain}
          currentPage={currentPage}
          hasMore={hasMore}
        />
      </Suspense>
    </div>
  );
}

export function RestaurantMenuViewToggle({ currentView = 'grid', businessDomain, className }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setView = (view) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`/store/${businessDomain}/products?${params.toString()}`);
  };

  return (
    <div
      className={cn(
        'inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5',
        className
      )}
      role="group"
      aria-label="View mode"
    >
      <button
        type="button"
        onClick={() => setView('grid')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition',
          currentView === 'grid' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
        )}
        aria-pressed={currentView === 'grid'}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        type="button"
        onClick={() => setView('list')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition',
          currentView === 'list' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
        )}
        aria-pressed={currentView === 'list'}
      >
        <List className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}

export function RestaurantMenuCatalogSkeleton({ view = 'grid' }) {
  return <ProductsSkeleton count={view === 'list' ? 6 : 9} density="default" />;
}
