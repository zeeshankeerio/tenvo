'use client';

import { Suspense } from 'react';
import { SearchBar } from '@/components/storefront/SearchBar';
import { SortDropdown } from '@/components/storefront/ProductsToolbar';
import { RestaurantMenuViewToggle } from '@/components/storefront/restaurant/RestaurantMenuCatalog';

/**
 * Menu page toolbar — search, sort, grid/list toggle (dark theme).
 */
export function RestaurantMenuToolbar({
  businessDomain,
  initialQuery = '',
  currentSort = 'featured',
  currentView = 'grid',
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <SearchBar businessDomain={businessDomain} initialQuery={initialQuery} dark />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="[&_button]:border-neutral-700 [&_button]:bg-neutral-900 [&_button]:text-neutral-200 [&_div]:border-neutral-700 [&_div]:bg-neutral-900">
          <SortDropdown currentSort={currentSort} businessDomain={businessDomain} />
        </div>
        <Suspense fallback={null}>
          <RestaurantMenuViewToggle currentView={currentView} businessDomain={businessDomain} />
        </Suspense>
      </div>
    </div>
  );
}
