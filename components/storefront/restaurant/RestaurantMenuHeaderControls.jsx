'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchBar } from '@/components/storefront/SearchBar';
import { SortDropdown } from '@/components/storefront/ProductsToolbar';
import { RestaurantMenuViewToggle } from '@/components/storefront/restaurant/RestaurantMenuCatalog';

function MenuHeaderControlsInner({ businessDomain }) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const currentSort = searchParams.get('sort') || 'featured';
  const currentView = searchParams.get('view') || 'grid';

  return (
    <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
      <div className="min-w-0 flex-1 md:max-w-md lg:max-w-lg xl:max-w-xl">
        <div className="[&_input]:h-9 [&_input]:rounded-lg [&_input]:border-zinc-200 [&_input]:bg-zinc-50 [&_input]:py-2 [&_input]:pl-10 [&_input]:pr-10 [&_input]:text-sm [&_input]:placeholder:text-zinc-400 [&_svg:first-child]:left-3 [&_svg:first-child]:h-4 [&_svg:first-child]:w-4 [&_button[type=submit]]:hidden">
          <SearchBar
            businessDomain={businessDomain}
            initialQuery={searchQuery}
            key={searchQuery}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="[&_button]:h-9 [&_button]:rounded-lg [&_button]:border-zinc-200 [&_button]:px-2.5 [&_button]:py-0 [&_button]:text-xs">
          <SortDropdown currentSort={currentSort} businessDomain={businessDomain} />
        </div>
        <RestaurantMenuViewToggle
          currentView={currentView}
          businessDomain={businessDomain}
          className="h-9 p-0.5 [&_button]:h-8 [&_button]:rounded-md [&_button]:px-2"
        />
      </div>
    </div>
  );
}

/**
 * Unified menu search, sort, and view controls for the consolidated header.
 */
export function RestaurantMenuHeaderControls({ businessDomain }) {
  return (
    <Suspense fallback={null}>
      <MenuHeaderControlsInner businessDomain={businessDomain} />
    </Suspense>
  );
}
