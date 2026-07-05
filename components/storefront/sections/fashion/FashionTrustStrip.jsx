'use client';

import { Award, Package, RotateCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

const TRUST_ICONS = {
  quality: Sparkles,
  returns: RotateCcw,
  delivery: Truck,
  secure: ShieldCheck,
  premium: Award,
  packaging: Package,
  default: ShieldCheck,
};

/**
 * Compact trust strip for editorial fashion storefronts.
 */
export function FashionTrustStrip({ pillars = [], accent = '#78716c' }) {
  const rows = (pillars || []).filter((p) => p?.id && p?.label);
  if (!rows.length) return null;

  return (
    <section className="border-b border-stone-200/80 bg-white py-4 sm:py-5">
      <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
          {rows.map((pillar) => {
            const Icon = TRUST_ICONS[pillar.id] || TRUST_ICONS.default;
            return (
              <div
                key={pillar.id}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border border-stone-200/90 bg-stone-50/80 px-3 py-2.5',
                  'sm:gap-3 sm:px-3.5 sm:py-3'
                )}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-stone-200/80 sm:h-10 sm:w-10"
                  style={{ color: accent }}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-900 sm:text-[13px]">{pillar.label}</p>
                  {pillar.desc ? (
                    <p className="text-[10px] leading-snug text-stone-500 sm:text-[11px]">{pillar.desc}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
