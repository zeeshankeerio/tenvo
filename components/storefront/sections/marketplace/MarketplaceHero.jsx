'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';
import { resolveAutomotiveTileImage } from '@/lib/storefront/storefrontImagePlaceholders';
import {
  MARKETPLACE_POPULAR_BRANDS,
  MARKETPLACE_BODY_TYPES,
  MARKETPLACE_FUEL_TYPES,
  MARKETPLACE_PRICE_BANDS,
  getMarketplaceConfig,
} from '@/lib/storefront/autoMarketplace';

const SEARCH_TABS = [
  { id: 'new', label: 'New', condition: 'new' },
  { id: 'used', label: 'Used', condition: 'pre-owned' },
  { id: 'rental', label: 'Rental', condition: 'rental' },
  { id: 'all', label: 'All', condition: '' },
];

/**
 * Light-theme marketplace hero with centered copy and floating search widget.
 */
export function MarketplaceHero({ preset, accent, accentDark, settings = {} }) {
  const router = useRouter();
  const slides = preset.slides || [];
  const [index, setIndex] = useState(0);
  const [searchTab, setSearchTab] = useState('new');
  const [make, setMake] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [fuelType, setFuelType] = useState('');
  const count = slides.length || 1;
  const base = preset.base || '/';
  const productsUrl = `${base}/products`;
  const cfg = getMarketplaceConfig(settings);

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  useEffect(() => {
    if (count <= 1) return undefined;
    const id = setInterval(next, 7000);
    return () => clearInterval(id);
  }, [count, next]);

  const slide = slides[index] || slides[0];
  const cinematicSlide = slide?.cinematic || index === 1;

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const tab = SEARCH_TABS.find((t) => t.id === searchTab);
    if (tab?.condition) params.set('condition', tab.condition);
    if (make) params.set('brand', make);
    if (bodyType) params.set('body', bodyType);
    if (fuelType) params.set('fuel', fuelType);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    router.push(`${productsUrl}?${params.toString()}`);
  };

  return (
    <section className="store-hero relative border-b border-neutral-100 bg-neutral-50">
      <div className="relative min-h-[300px] sm:min-h-[360px] lg:min-h-[400px]">
        {slides.map((s, i) => {
          const cinematic = s.cinematic || i === 1;
          return (
          <div
            key={`${s.image}-${i}`}
            className={cn(
              'absolute inset-0 transition-opacity duration-700',
              i === index ? 'opacity-100' : 'opacity-0'
            )}
          >
            <SmartProductImage
              src={s.image}
              alt=""
              fill
              className="object-cover"
              priority={i === 0}
              fallbackSrc={resolveAutomotiveTileImage(s.title || String(i))}
            />
            <div
              className={cn(
                'absolute inset-0',
                cinematic
                  ? 'bg-gradient-to-t from-black/85 via-black/50 to-black/25'
                  : 'bg-gradient-to-b from-white/92 via-white/78 to-white/95'
              )}
            />
          </div>
        );})}

        <div className="relative z-10 mx-auto flex h-full min-h-[inherit] max-w-[1400px] flex-col items-center justify-center px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-16">
          {slide ? (
            <div className="max-w-2xl">
              <p
                className={cn(
                  'mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] sm:text-xs',
                  cinematicSlide ? 'text-white/80' : 'text-neutral-500'
                )}
              >
                {slide.eyebrow}
              </p>
              <h1
                className={cn(
                  'store-heading text-2xl font-semibold leading-tight sm:text-4xl lg:text-5xl',
                  cinematicSlide ? 'text-white' : 'text-neutral-900'
                )}
              >
                {slide.title}
              </h1>
              {slide.subtitle ? (
                <p
                  className={cn(
                    'store-hero-subtitle mx-auto mt-3 max-w-xl text-sm sm:text-base',
                    cinematicSlide ? 'text-white/85' : 'text-neutral-600'
                  )}
                >
                  {slide.subtitle}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => router.push(slide.ctaHref || productsUrl)}
                className="mt-6 inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 hover:shadow-lg"
                style={{ backgroundColor: accent || '#E30613' }}
              >
                {slide.ctaLabel || 'Explore deals'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {count > 1 ? (
            <div className="mt-8 flex justify-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === index
                      ? cn('w-8', cinematicSlide ? 'bg-white' : 'bg-neutral-900')
                      : cn('w-4', cinematicSlide ? 'bg-white/40 hover:bg-white/60' : 'bg-neutral-300 hover:bg-neutral-400')
                  )}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {cfg.coeTicker?.value ? (
        <div className="border-t border-neutral-200 bg-white px-4 py-2 text-center text-xs text-neutral-600 sm:text-sm">
          <span className="font-semibold text-neutral-800">{cfg.coeTicker.label}:</span>{' '}
          <span className="font-semibold tabular-nums text-neutral-900">{cfg.coeTicker.value}</span>{' '}
          <span className="text-emerald-600">{cfg.coeTicker.change}</span>
        </div>
      ) : null}

      <div className="relative z-20 mx-auto max-w-[1400px] px-4 pb-8 sm:px-6 lg:-mt-6 lg:px-8">
        <form
          onSubmit={handleSearch}
          className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg shadow-neutral-200/60 sm:p-5"
        >
          <div className="mb-4 flex flex-wrap justify-center gap-1 border-b border-neutral-100 pb-3 sm:justify-start">
            {SEARCH_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSearchTab(tab.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition',
                  searchTab === tab.id ? 'text-white' : 'text-neutral-600 hover:bg-neutral-50'
                )}
                style={searchTab === tab.id ? { backgroundColor: accent || '#E30613' } : undefined}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="block lg:col-span-1">
              <span className="mb-1 block text-[10px] font-semibold uppercase text-neutral-500">Brand</span>
              <select
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              >
                <option value="">Any brand</option>
                {MARKETPLACE_POPULAR_BRANDS.map((b) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase text-neutral-500">Min price</span>
              <select
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              >
                <option value="">No min</option>
                {MARKETPLACE_PRICE_BANDS.map((b) => (
                  <option key={b.label} value={b.min}>{b.label.split(' - ')[0]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase text-neutral-500">Max price</span>
              <select
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              >
                <option value="">No max</option>
                {MARKETPLACE_PRICE_BANDS.map((b) => (
                  <option key={`max-${b.label}`} value={b.max || 999999}>{b.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase text-neutral-500">Body type</span>
              <select
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              >
                <option value="">Any type</option>
                {MARKETPLACE_BODY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase text-neutral-500">Fuel</span>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              >
                <option value="">Any fuel</option>
                {MARKETPLACE_FUEL_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: accentDark || accent || '#E30613' }}
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
