'use client';

import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';

/**
 * Marketplace-style deal banner (Amazon Goldbox / Glovida promo strip).
 */
export function DomainDealStrip({ dealStrip, accent, accentDark }) {
  if (!dealStrip) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-4 sm:px-8 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)` }}
      >
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 mb-2">
            <Zap className="h-3.5 w-3.5 text-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wide">{dealStrip.badge}</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-white leading-snug">{dealStrip.title}</p>
          {dealStrip.subtitle ? (
            <p className="text-sm text-white/85 mt-1">{dealStrip.subtitle}</p>
          ) : null}
        </div>
        <Link
          href={dealStrip.href}
          className="relative z-10 inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold shadow-lg transition-transform hover:scale-[1.02]"
          style={{ color: accent }}
        >
          {dealStrip.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
