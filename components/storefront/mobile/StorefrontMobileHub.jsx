'use client';

import { cn } from '@/lib/utils';
import { useStorefrontMobileNav } from '@/lib/hooks/useStorefrontMobileNav';

/**
 * Compact horizontal module rail, replaces sidebar STOREFRONT section on mobile.
 * Icon + short label pills (~28px tall), not full hub tiles.
 *
 * @param {{ activeTab: string, pendingOrders?: number }} props
 */
export function StorefrontMobileHub({ activeTab, pendingOrders = 0 }) {
  const { items, business, ready } = useStorefrontMobileNav();

  if (!ready || items.length === 0) return null;

  const navigate = (item) => {
    if (item.locked) return;
    if (item.isExternal) {
      const path = typeof item.externalUrl === 'function' ? item.externalUrl(business) : item.externalUrl;
      if (path) window.open(path, '_blank', 'noopener,noreferrer');
      return;
    }
    window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: item.key } }));
  };

  return (
    <nav
      aria-label="Storefront modules"
      className="border-b border-gray-100 pb-2 lg:hidden"
    >
      <div className="-mx-0.5 flex gap-1 overflow-x-auto px-0.5 pb-0.5 scrollbar-none">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === activeTab;
          const badge = item.key === 'orders' && pendingOrders > 0 ? pendingOrders : null;

          return (
            <button
              key={item.key}
              type="button"
              disabled={item.locked}
              onClick={() => navigate(item)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition active:scale-[0.98] disabled:opacity-40',
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-600'
              )}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span>{item.label}</span>
              {badge != null && (
                <span className="rounded-full bg-red-500 px-1 py-px text-[8px] font-bold leading-none text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default StorefrontMobileHub;
