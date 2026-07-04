'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { MobileActionRow } from '@/components/mobile/MobileHubPrimitives';
import { useHubMobileNav } from '@/lib/hooks/useHubMobileNav';
import { normalizeDashboardTab } from '@/lib/config/tabs';
import {
  MOBILE_BOTTOM_SHEET,
  MOBILE_BOTTOM_SHEET_BODY,
  MOBILE_BOTTOM_SHEET_HANDLE,
  MOBILE_BOTTOM_SHEET_HEADER,
} from '@/lib/utils/mobileLayout';

/**
 * Fixed bottom navigation for mobile hub, app-like primary tabs + overflow sheet.
 * Hidden on lg+ where the sidebar is the canonical nav.
 */
export function HubMobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { primaryItems, overflowItems, ready } = useHubMobileNav();
  const [moreOpen, setMoreOpen] = useState(false);

  const currentTab = normalizeDashboardTab(searchParams.get('tab') || 'dashboard');
  const baseUrl = useMemo(() => {
    const parts = pathname?.split('/') || [];
    const handle = parts[2] || 'retail-shop';
    return `/business/${handle}`;
  }, [pathname]);

  if (!ready) return null;

  const hrefFor = (key, item) => {
    if (item?.externalPath) return item.externalPath;
    return key === 'dashboard' ? baseUrl : `${baseUrl}?tab=${key}`;
  };

  const isOverflowActive = overflowItems.some((item) => item.key === currentTab);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Primary navigation"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
          {primaryItems.map((item) => {
            const isMore = item.key === '__more__';
            const isActive = isMore ? isOverflowActive : currentTab === item.key;
            const Icon = item.icon;

            if (isMore) {
              return (
                <li key={item.key} className="flex-1">
                  <button
                    type="button"
                    onClick={() => setMoreOpen(true)}
                    className={cn(
                      'flex w-full flex-col items-center gap-0.5 px-1 py-2 transition-colors',
                      isActive ? 'text-brand-primary' : 'text-gray-500'
                    )}
                    aria-expanded={moreOpen}
                    aria-haspopup="dialog"
                  >
                    <MoreHorizontal className={cn('h-5 w-5', isActive && 'scale-110')} />
                    <span className="text-[10px] font-semibold">{item.label}</span>
                  </button>
                </li>
              );
            }

            return (
              <li key={item.key} className="flex-1">
                <Link
                  href={hrefFor(item.key, item)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-1 py-2 transition-colors',
                    isActive ? 'text-brand-primary' : 'text-gray-500',
                    item.locked && 'pointer-events-none opacity-40'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className={MOBILE_BOTTOM_SHEET}>
          <div className={MOBILE_BOTTOM_SHEET_HANDLE} aria-hidden />
          <SheetHeader className={MOBILE_BOTTOM_SHEET_HEADER}>
            <SheetTitle className="text-base font-bold text-gray-900">More modules</SheetTitle>
            <SheetDescription className="text-xs text-gray-500">
              Customers, purchases, settings, and more
            </SheetDescription>
          </SheetHeader>
          <div className={MOBILE_BOTTOM_SHEET_BODY}>
            <div className="space-y-2">
              {overflowItems.map((item) => (
                <MobileActionRow
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  sublabel={item.locked ? 'Upgrade plan to unlock' : undefined}
                  active={currentTab === item.key}
                  disabled={item.locked}
                  onClick={() => {
                    if (item.locked) return;
                    setMoreOpen(false);
                    router.push(hrefFor(item.key, item));
                  }}
                />
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default HubMobileBottomNav;
