'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { resolvePharmacyCategoryNav } from '@/lib/storefront/pharmacyStorefront';

/**
 * Horizontal category nav strip (Medicines, Personal Care, etc.)
 * @param {{ businessDomain: string; settings?: object; accent: string; className?: string }} props
 */
export function PharmacyCategoryStrip({ businessDomain, settings, accent, className }) {
  const pathname = usePathname();
  const base = `/store/${businessDomain}`;
  const items = resolvePharmacyCategoryNav(settings, base);

  return (
    <nav
      className={cn('border-b border-emerald-100 bg-white', className)}
      aria-label="Pharmacy categories"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-2.5 scrollbar-hide">
          {items.map((item) => {
            const active = pathname.includes(item.href.replace(base, ''));
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm',
                  active
                    ? 'text-white shadow-sm'
                    : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                )}
                style={active ? { backgroundColor: accent } : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
