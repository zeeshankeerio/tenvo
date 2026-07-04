'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SortDropdown } from '@/components/storefront/ProductsToolbar';
import { RestaurantMenuViewToggle } from '@/components/storefront/restaurant/RestaurantMenuCatalog';

function MobileSortViewInner({ businessDomain }) {
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') || 'featured';
  const currentView = searchParams.get('view') || 'grid';

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <div className="[&_button]:h-8 [&_button]:rounded-lg [&_button]:border-zinc-200 [&_button]:px-2 [&_button]:py-0 [&_button]:text-[11px]">
        <SortDropdown currentSort={currentSort} businessDomain={businessDomain} />
      </div>
      <RestaurantMenuViewToggle
        currentView={currentView}
        businessDomain={businessDomain}
        className="h-8 p-0.5 [&_button]:h-7 [&_button]:rounded-md [&_button]:px-1.5"
      />
    </div>
  );
}

/**
 * Sort and view controls shown below the title on mobile (header holds them on md+).
 */
export function RestaurantMenuMobileActions({ businessDomain }) {
  return (
    <Suspense fallback={null}>
      <MobileSortViewInner businessDomain={businessDomain} />
    </Suspense>
  );
}
