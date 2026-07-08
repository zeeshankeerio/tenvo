'use client';

import Link from 'next/link';
import { FileUp, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildPharmacyPrescriptionContactHref,
  resolvePharmacyProductMeta,
} from '@/lib/storefront/pharmacyProducts';

/**
 * Rx product CTA — routes shoppers to prescription upload instead of cart checkout.
 */
export function PharmacyPrescriptionCta({
  product,
  businessDomain,
  accent = '#16a34a',
  variant = 'card',
  className,
}) {
  const meta = resolvePharmacyProductMeta(product);
  const href = buildPharmacyPrescriptionContactHref(businessDomain, product);

  if (variant === 'inline') {
    return (
      <Link
        href={href}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95',
          className
        )}
        style={{ backgroundColor: accent }}
      >
        <FileUp className="h-4 w-4" aria-hidden />
        Upload prescription to order
      </Link>
    );
  }

  if (variant === 'panel') {
    return (
      <div
        className={cn(
          'rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 sm:p-6',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: accent }}
          >
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Prescription required
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">
              Pharmacist verification before dispatch
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {meta.scheduleH
                ? 'This is a Schedule H medicine. Upload a valid prescription and our licensed pharmacists will verify your order.'
                : 'Upload a valid prescription and our pharmacists will prepare this medicine for delivery.'}
            </p>
            {meta.genericName ? (
              <p className="mt-2 text-xs text-slate-500">
                Generic: <span className="font-medium text-slate-700">{meta.genericName}</span>
              </p>
            ) : null}
            <Link
              href={href}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 sm:w-auto"
              style={{ backgroundColor: accent }}
            >
              <FileUp className="h-4 w-4" aria-hidden />
              Upload prescription
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold text-white shadow-lg transition-all active:scale-95 sm:rounded-xl sm:py-2.5 sm:text-sm',
        className
      )}
      style={{ backgroundColor: accent }}
    >
      <FileUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
      Upload Rx to order
    </Link>
  );
}
