'use client';

import Link from 'next/link';
import { Stethoscope, MessageCircle, ArrowRight } from 'lucide-react';
import { PHARMACY_SYMPTOM_GUIDES } from '@/lib/storefront/pharmacySymptomGuides';
import { StoreMarqueeRow } from '@/components/storefront/sections/shared/StoreMarqueeRow';
import { cn } from '@/lib/utils';

/**
 * Symptom-based discovery strip — routes shoppers to relevant categories
 * and invites them to use the AI health assistant chat.
 */
export function PharmacySymptomAssistant({
  productsUrl,
  accent = '#16a34a',
  onAskAssistant,
  className,
}) {
  const guides = PHARMACY_SYMPTOM_GUIDES.slice(0, 8);

  return (
    <section className={cn('border-b border-emerald-100 bg-emerald-50/40 py-8 sm:py-10', className)}>
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              style={{ backgroundColor: `${accent}15`, color: accent }}
            >
              <Stethoscope className="h-3.5 w-3.5" aria-hidden />
              AI health assistant
            </div>
            <h2 className="mt-3 text-xl font-semibold text-gray-900 sm:text-2xl">
              What symptoms are you managing?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
              Tap a common concern to browse matching products, or chat with our assistant for
              guidance on OTC options, prescriptions, and refills.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              General wellness guidance only — not a medical diagnosis. Seek urgent care for emergencies.
            </p>
          </div>

          {typeof onAskAssistant === 'function' ? (
            <button
              type="button"
              onClick={onAskAssistant}
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 active:scale-[0.98] lg:self-auto"
              style={{ backgroundColor: accent }}
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Ask the health assistant
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('tenvo:open-store-chat'))}
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 active:scale-[0.98] lg:self-auto"
              style={{ backgroundColor: accent }}
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Ask the health assistant
            </button>
          )}
        </div>

        <div className="mt-6">
          <StoreMarqueeRow
            items={guides}
            fadeFrom="muted"
            durationSec={42}
            reverse
            slideClassName="w-auto"
            gapClassName="gap-2.5 pr-2.5 sm:gap-3 sm:pr-3"
            renderItem={(guide) => (
              <Link
                href={`${productsUrl}?category=${encodeURIComponent(guide.slug)}`}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-emerald-400 hover:shadow-md active:scale-[0.98]"
              >
                {guide.label}
                <ArrowRight className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              </Link>
            )}
          />
        </div>
      </div>
    </section>
  );
}
