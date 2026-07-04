'use client';

import { Suspense } from 'react';
import { SortDropdown } from '@/components/storefront/ProductsToolbar';
import { RestaurantMenuViewToggle } from '@/components/storefront/restaurant/RestaurantMenuCatalog';

/**
 * Legacy toolbar — sort and view only (search lives in the consolidated header).
 * @deprecated Prefer RestaurantMenuHeaderControls + RestaurantMenuMobileActions.
 */
export function RestaurantMenuToolbar({
  businessDomain,
  currentSort = 'featured',
  currentView = 'grid',
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <SortDropdown currentSort={currentSort} businessDomain={businessDomain} />
      <Suspense fallback={null}>
        <RestaurantMenuViewToggle currentView={currentView} businessDomain={businessDomain} />
      </Suspense>
    </div>
  );
}
