'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  Car,
  CarFront,
  Croissant,
  Dumbbell,
  Gem,
  Layers,
  Pill,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Sofa,
  Stethoscope,
  Store,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import MarketingSection from '@/components/marketing/layout/MarketingSection';
import {
  getHeroDemoGalleryItems,
  HERO_EXCLUDED_DEMO_DOMAINS,
} from '@/lib/marketing/demoStoreGalleryMeta';
import { CLIENT_DEMO_STORES } from '@/lib/marketing/demoStores';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  shirt: Shirt,
  layers: Layers,
  gem: Gem,
  'utensils-crossed': UtensilsCrossed,
  pill: Pill,
  'shopping-basket': ShoppingBasket,
  'shopping-bag': ShoppingBag,
  wrench: Wrench,
  croissant: Croissant,
  scissors: Scissors,
  sofa: Sofa,
  dumbbell: Dumbbell,
  car: Car,
  'car-front': CarFront,
  stethoscope: Stethoscope,
  store: Store,
};

const FADE_MS = 700;
const HOLD_MS = 5200;

/**
 * @param {ReturnType<typeof getHeroDemoGalleryItems>[number]} store
 */
function StoreIconBadge({ store, className }) {
  const Icon = ICON_MAP[store.icon] || Store;
  if (store.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={store.logo}
        alt=""
        className={cn('h-8 w-8 object-contain', className)}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <Icon
      className={cn('h-5 w-5', className)}
      strokeWidth={1.75}
      aria-hidden
      style={{ color: store.glowGradient }}
    />
  );
}

/**
 * @param {{
 *   store: ReturnType<typeof getHeroDemoGalleryItems>[number];
 *   active: boolean;
 *   priority?: boolean;
 * }} props
 */
function StoreSlide({ store, active, priority = false }) {
  const [imgSrc, setImgSrc] = useState(store.heroImage);
  const [imgFailed, setImgFailed] = useState(false);
  const isDark = store.slideTheme === 'dark';

  useEffect(() => {
    setImgSrc(store.heroImage);
    setImgFailed(false);
  }, [store.heroImage]);

  const fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?ixlib=rb-4.1.0&auto=format&fit=crop&w=1920&q=85';

  const displaySrc = imgFailed ? fallbackImage : imgSrc;

  return (
    <div
      className={cn(
        'absolute inset-0 transition-opacity ease-in-out motion-reduce:transition-none',
        active ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden={!active}
    >
      <div
        className={cn('absolute inset-0 z-0', store.slideBackdropClass || 'bg-slate-100')}
        aria-hidden
      />
      <Image
        src={displaySrc || fallbackImage}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className={cn(
          'z-[1]',
          store.heroObjectFit || 'object-cover',
          store.heroObjectPosition || 'object-center'
        )}
        onError={() => {
          if (!imgFailed) setImgFailed(true);
        }}
      />

      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-[2]',
          isDark
            ? 'bg-gradient-to-t from-black/90 from-20% via-black/45 via-55% to-black/15'
            : 'bg-gradient-to-t from-white/95 from-18% via-white/40 via-45% to-transparent'
        )}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-[2]',
          isDark
            ? 'bg-gradient-to-r from-black/50 via-transparent to-transparent'
            : 'bg-gradient-to-r from-white/20 via-transparent to-transparent'
        )}
        aria-hidden
      />

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 flex flex-col gap-5 px-5 pb-28 pt-20 sm:px-10 sm:pb-32 lg:px-14 lg:pb-36',
          'sm:flex-row sm:items-end sm:justify-between'
        )}
      >
        <div className="flex min-w-0 max-w-3xl gap-4 sm:gap-5">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-lg sm:h-14 sm:w-14',
              isDark
                ? 'border-white/15 bg-white/10 backdrop-blur-sm'
                : 'border-white/90 bg-white/95'
            )}
          >
            <StoreIconBadge store={store} className={isDark ? 'text-white' : undefined} />
          </div>
          <div className="min-w-0 space-y-1.5 sm:space-y-2">
            <p
              className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.22em]',
                isDark ? 'text-white/60' : 'text-neutral-500'
              )}
            >
              {store.vertical}
            </p>
            <h3
              className={cn(
                'text-2xl font-semibold tracking-tight sm:text-4xl lg:text-5xl',
                isDark ? 'text-white' : 'text-neutral-900'
              )}
            >
              {store.name}
            </h3>
            <p
              className={cn(
                'line-clamp-2 text-sm font-medium leading-relaxed sm:line-clamp-3 sm:text-base lg:text-lg',
                isDark ? 'text-white/75' : 'text-neutral-600'
              )}
            >
              {store.description}
            </p>
            <p
              className={cn(
                'text-xs font-medium uppercase tracking-wide',
                isDark ? 'text-white/45' : 'text-neutral-400'
              )}
            >
              {store.city || store.country}
              {store.tier === 'full' ? ' · Full hub demo' : ''}
            </p>
          </div>
        </div>

        <Link
          href={store.href}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={active ? 0 : -1}
          className={cn(
            'inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-full',
            'px-6 py-3 text-sm font-semibold shadow-md backdrop-blur-md transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2',
            isDark
              ? 'border border-white/20 bg-white text-neutral-900 hover:bg-rose-50 hover:shadow-lg'
              : 'border border-neutral-300/90 bg-white/85 text-neutral-900 hover:border-neutral-400 hover:bg-white hover:shadow-lg'
          )}
        >
          Visit store
          <ArrowUpRight className="h-4 w-4 text-neutral-500" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/**
 * @param {{ stores: ReturnType<typeof getHeroDemoGalleryItems> }} props
 */
function FullScreenStoreShowcase({ stores }) {
  const [index, setIndex] = useState(0);

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % stores.length);
  }, [stores.length]);

  useEffect(() => {
    if (stores.length <= 1) return undefined;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) return undefined;

    const interval = setInterval(advance, HOLD_MS);
    return () => clearInterval(interval);
  }, [advance, stores.length]);

  if (!stores.length) return null;

  return (
    <div className="relative h-full w-full">
      {stores.map((store, i) => (
        <StoreSlide key={store.domain} store={store} active={i === index} priority={i === 0} />
      ))}

      <div
        className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-4 border-t border-white/60 bg-white/70 px-4 py-4 backdrop-blur-md sm:py-5"
        role="tablist"
        aria-label="Demo storefront slides"
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          {stores.map((store, i) => (
            <button
              key={store.domain}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show ${store.name}`}
              onClick={() => setIndex(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === index ? 'w-8 bg-brand-primary' : 'w-2 bg-neutral-300 hover:bg-neutral-400'
              )}
            />
          ))}
        </div>
        <p className="text-center text-xs font-medium text-neutral-500">
          {index + 1} / {stores.length} live demo storefronts
        </p>
      </div>
    </div>
  );
}

/**
 * Full-viewport light hero — edge-to-edge store imagery cycling all ready demos.
 * @param {{ stores: ReturnType<typeof getHeroDemoGalleryItems> }} props
 */
function DemoStoreHeroGallery({ stores }) {
  if (stores.length === 0) return null;

  return (
    <section
      aria-label="Live demo storefronts"
      className="relative h-svh w-full overflow-hidden border-y border-slate-200/80 bg-slate-100"
    >
      <FullScreenStoreShowcase stores={stores} />
    </section>
  );
}

/**
 * Live demo storefront gallery.
 * @param {{ variant?: 'hero' | 'featured' | 'all' }} props
 */
export function DemoStoreGallery({ variant = 'hero' }) {
  const heroItems = getHeroDemoGalleryItems();
  const isHero = variant === 'hero' || variant === 'featured';

  if (isHero) {
    return <DemoStoreHeroGallery stores={heroItems} />;
  }

  const stores = CLIENT_DEMO_STORES.filter((store) => !HERO_EXCLUDED_DEMO_DOMAINS.has(store.domain));

  return (
    <MarketingSection padding="loose" className="border-y border-slate-200/80 bg-slate-50">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <Link
            key={store.domain}
            href={store.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition duration-300 motion-safe:hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-primary">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 group-hover:text-brand-primary">{store.name}</p>
              <p className="text-xs text-gray-500">{store.country}</p>
              <p className="mt-1 truncate font-mono text-[11px] text-gray-400">{store.href}</p>
            </div>
          </Link>
        ))}
      </div>
    </MarketingSection>
  );
}
