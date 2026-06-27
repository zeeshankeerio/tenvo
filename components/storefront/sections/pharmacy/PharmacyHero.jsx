'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, FileUp } from 'lucide-react';
import { HeroCarousel } from '@/components/storefront/sections/heroes/HeroCarousel';
import { getPharmacyConfig } from '@/lib/storefront/pharmacyStorefront';

/**
 * Tenant-aware pharmacy homepage hero.
 */
export function PharmacyHero({ preset, businessDomain, accent, accentDark, contactCity }) {
  const router = useRouter();
  const base = preset.base || `/store/${businessDomain}`;
  const productsUrl = `${base}/products`;
  const [query, setQuery] = useState('');
  const config = getPharmacyConfig(preset.settings, businessDomain);
  const location = contactCity || config.defaultLocation || 'Your area';
  const quickSearchTerms = preset.quickSearchTerms || [];
  const storeName = preset.storeName || '';
  const searchPlaceholder = config.searchPlaceholder;

  const search = () => {
    const q = query.trim();
    if (!q) {
      router.push(productsUrl);
      return;
    }
    router.push(`${productsUrl}?search=${encodeURIComponent(q)}`);
  };

  return (
    <section className="relative bg-white">
      <div className="relative bg-emerald-950">
        <HeroCarousel
          slides={preset.slides || []}
          accent={accent}
          variant="pharmacy"
          storeName={storeName}
          minHeight="min-h-[220px] sm:min-h-[300px] lg:min-h-[400px]"
          className="pharmacy-hero-carousel"
          contentClassName="pb-10 sm:pb-14 lg:pb-20"
        />
      </div>

      {quickSearchTerms.length > 0 && (
        <div className="border-b border-emerald-50 bg-white px-3 py-3 lg:hidden">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">Trending</span>
            {quickSearchTerms.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => router.push(`${productsUrl}?search=${encodeURIComponent(term)}`)}
                className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 active:scale-[0.98]"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative z-20 mx-auto hidden max-w-[1400px] px-4 sm:px-6 lg:block lg:px-8">
        <div className="-mt-14 lg:-mt-16">
          <div className="rounded-2xl border border-emerald-100/80 bg-white p-4 shadow-lg shadow-emerald-900/10">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <button
                type="button"
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800"
                aria-label={`Delivery location: ${location}`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="text-emerald-600">{config.locationLabel}</span>
                <span className="max-w-[140px] truncate sm:max-w-none">{location}</span>
              </button>

              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && search()}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    aria-label="Search medicines and health products"
                  />
                </div>
                <button
                  type="button"
                  onClick={search}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                  style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)` }}
                >
                  Search
                </button>
              </div>

              <Link
                href={`${base}/contact?prescription=1`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-600 px-4 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                <FileUp className="h-4 w-4" aria-hidden />
                Upload Rx
              </Link>
            </div>

            {quickSearchTerms.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Popular</span>
                {quickSearchTerms.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => router.push(`${productsUrl}?search=${encodeURIComponent(term)}`)}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
