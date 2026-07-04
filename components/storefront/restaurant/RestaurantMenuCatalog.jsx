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
        className="inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Previous
      </button>
      <span className="text-sm text-neutral-500">Page {currentPage}</span>
      <button
        type="button"
        disabled={!hasMore}
        onClick={() => goToPage(currentPage + 1)}
        className="inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-40"
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
      <div className="rounded-2xl border border-dashed border-neutral-700 bg-[#141414] px-6 py-16 text-center">
        <p className="text-sm text-neutral-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {total > 0 ? (
        <p className="mb-4 text-xs text-neutral-500">
          {total} {total === 1 ? 'item' : 'items'}
        </p>
      ) : null}

      {view === 'list' ? (
        <div className="space-y-3">
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3">
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
        'inline-flex rounded-xl border border-neutral-700 bg-neutral-900 p-1',
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
          currentView === 'grid' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
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
          currentView === 'list' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
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
