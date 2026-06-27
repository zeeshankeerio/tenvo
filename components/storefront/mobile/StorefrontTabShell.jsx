'use client';

import { StorefrontMobileContext } from '@/lib/context/StorefrontMobileContext';
import { StorefrontMobileHub } from './StorefrontMobileHub';

/**
 * Single mobile entry for all storefront hub tabs.
 * - Renders compact module rail (lg:hidden)
 * - Sets `useStorefrontEmbedded()` so child pages skip duplicate MobileTabHeader chrome
 * - Desktop: children only (sidebar navigation unchanged)
 *
 * @param {{
 *   activeTab: string,
 *   pendingOrders?: number,
 *   children: import('react').ReactNode,
 * }} props
 */
export function StorefrontTabShell({ activeTab, pendingOrders = 0, children }) {
  const fullscreenMobile = activeTab === 'pos';

  return (
    <StorefrontMobileContext.Provider value={{ embedded: true, activeTab }}>
      <div className={fullscreenMobile ? 'h-full min-h-0' : 'space-y-2 lg:space-y-6'}>
        {!fullscreenMobile && (
          <StorefrontMobileHub activeTab={activeTab} pendingOrders={pendingOrders} />
        )}
        {children}
      </div>
    </StorefrontMobileContext.Provider>
  );
}

export default StorefrontTabShell;
