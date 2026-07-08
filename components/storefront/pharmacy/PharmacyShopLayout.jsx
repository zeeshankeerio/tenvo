'use client';

import Link from 'next/link';
import { FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PharmacyCategoryStrip } from '@/components/storefront/sections/pharmacy/PharmacyCategoryStrip';

/**
 * Pharmacy catalog shell — category strip, Rx notice, and emerald shop chrome.
 */
export function PharmacyShopLayout({
  children,
  businessDomain,
  settings = {},
  accent = '#16a34a',
  title = 'Shop medicines',
  subtitle = '',
  storeBase,
  showRxBanner = true,
  className,
}) {
  const root = storeBase || `/store/${businessDomain}`;

  return (
    <div className={cn('min-h-screen bg-emerald-50/30', className)} data-pharmacy-shop>
      <div className="border-b border-emerald-100 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <PharmacyCategoryStrip businessDomain={businessDomain} settings={settings} accent={accent} />

      {showRxBanner ? (
        <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-700 to-teal-600">
          <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <p className="text-sm text-emerald-50">
              OTC items can be added to cart. Prescription medicines require Rx upload before dispatch.
            </p>
            <Link
              href={`${root}/contact?prescription=1`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 sm:text-sm"
            >
              <FileUp className="h-4 w-4" aria-hidden />
              Upload prescription
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
