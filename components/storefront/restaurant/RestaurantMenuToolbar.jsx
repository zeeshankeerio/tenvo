'use client';

import { Suspense } from 'react';
import { SearchBar } from '@/components/storefront/SearchBar';
import { SortDropdown } from '@/components/storefront/ProductsToolbar';
import { RestaurantMenuViewToggle } from '@/components/storefront/restaurant/RestaurantMenuCatalog';

/**
 * Compact inline menu toolbar — search, sort, view toggle.
 */
export function RestaurantMenuToolbar({
  businessDomain,
  initialQuery = '',
  currentSort = 'featured',
  currentView = 'grid',
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-0 flex-1 basis-[180px]">
        <div className="[&_input]:h-8 [&_input]:border-zinc-200 [&_input]:bg-zinc-50 [&_input]:text-sm [&_button]:h-8">
          <SearchBar businessDomain={businessDomain} initialQuery={initialQuery} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <SortDropdown currentSort={currentSort} businessDomain={businessDomain} />
        <Suspense fallback={null}>
          <RestaurantMenuViewToggle currentView={currentView} businessDomain={businessDomain} />
        </Suspense>
      </div>
    </div>
  );
}
