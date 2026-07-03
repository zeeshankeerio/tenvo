'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import MarketingCtaLink from '@/components/marketing/ui/MarketingCtaLink';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import { getDemoStoreHref } from '@/lib/marketing/demoStoreGalleryMeta';
import { getDomainPackageRegisterHref } from '@/lib/config/domainPackages';
import { MARKETING_STAT_VALUE } from '@/lib/utils/marketingLayout';

const FADE_MS = 700;
const HOLD_MS = 6000;

function resolveIcon(name) {
  return LucideIcons[name] || LucideIcons.Store;
}

/**
 * @param {{ slide: { heroImage: string }, active: boolean, priority?: boolean }} props
 */
function HeroSlideLayer({ slide, active, priority = false }) {
  const [imgSrc, setImgSrc] = useState(slide.heroImage);
  const fallback =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=85&auto=format&fit=crop';

  useEffect(() => {
    setImgSrc(slide.heroImage);
  }, [slide.heroImage]);

  return (
    <div
      className={cn(
        'absolute inset-0 transition-opacity ease-in-out motion-reduce:transition-none',
        active ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden={!active}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt=""
        className="h-full w-full object-cover object-center"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onError={() => {
          if (imgSrc !== fallback) setImgSrc(fallback);
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-950 from-[18%] via-neutral-950/60 via-[52%] to-neutral-950/30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-neutral-950/55 via-neutral-950/15 to-transparent" />
    </div>
  );
}

/**
 * Full-viewport hero: suite overview, channel pillars, and registration vertical presets in one carousel.
 */
export default function DomainPackageHeroShowcase({
  pkg,
  content,
  slides,
  businessTier,
  demoDomain,
}) {
  const [index, setIndex] = useState(0);
  const demoHref = demoDomain ? getDemoStoreHref(demoDomain) : null;
  const activeSlide = slides[index] || slides[0];
  const isVertical = activeSlide?.kind === 'vertical';
  const isChannel = activeSlide?.kind === 'channel';
  const isIntro = activeSlide?.kind === 'intro';

  const verticalSlideIndices = useMemo(
    () => slides.map((s, i) => (s.kind === 'vertical' ? i : -1)).filter((i) => i >= 0),
    [slides]
  );
  const verticalPosition =
    isVertical && verticalSlideIndices.length
      ? verticalSlideIndices.indexOf(index) + 1
      : 0;

  const registerHref = isVertical
    ? getDomainPackageRegisterHref(pkg.key, { vertical: activeSlide.key })
    : getDomainPackageRegisterHref(pkg.key);

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return undefined;
    const interval = setInterval(advance, HOLD_MS);
    return () => clearInterval(interval);
  }, [advance, slides.length]);

  if (!slides.length) return null;

  const SlideIcon = activeSlide?.icon ? resolveIcon(activeSlide.icon) : null;

  const eyebrow = isVertical
    ? `Registration preset ${verticalPosition} of ${verticalSlideIndices.length}`
    : isChannel
      ? activeSlide.eyebrow || 'How you sell'
      : isIntro
        ? content.heroEyebrow || activeSlide?.eyebrow || pkg.pricing?.badge
        : content.heroEyebrow || activeSlide?.eyebrow || pkg.pricing?.badge;

  const headline = isVertical || isChannel ? activeSlide.title : pkg.name;
  const subcopy = isVertical || isChannel ? activeSlide.body : activeSlide?.body || pkg.summary;

  const slideMeta = isVertical
    ? activeSlide.title
    : isChannel
      ? activeSlide.title
      : 'Suite overview';

  return (
    <section
      id="overview"
      aria-label={`${pkg.name} overview`}
      className="relative flex min-h-[min(100svh,56rem)] w-full flex-col overflow-hidden border-b border-neutral-200/80 bg-neutral-950"
    >
      {slides.map((slide, i) => (
        <HeroSlideLayer key={slide.id} slide={slide} active={i === index} priority={i === 0} />
      ))}

      <div className="relative z-20 flex flex-1 flex-col justify-end px-5 pb-[7.25rem] pt-24 sm:px-8 sm:pb-[7.75rem] sm:pt-28 lg:px-12">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                  {eyebrow}
                </p>
                {!isVertical && pkg.pricing?.badge ? (
                  <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                    {pkg.pricing.badge}
                  </span>
                ) : null}
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                {SlideIcon && (isChannel || isVertical) ? (
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-sm sm:h-14 sm:w-14"
                    style={
                      isVertical && activeSlide.accent
                        ? { boxShadow: `0 12px 40px -12px ${activeSlide.accent}66` }
                        : undefined
                    }
                  >
                    <SlideIcon className="h-6 w-6" aria-hidden />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
                    {headline}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-white/82 sm:text-base lg:max-w-xl">
                    {subcopy}
                  </p>
                </div>
              </div>

              {isVertical && activeSlide.bullets?.length ? (
                <ul className="grid max-w-2xl gap-1.5 sm:grid-cols-2">
                  {activeSlide.bullets.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm font-medium text-white/88">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
              ) : null}

            {verticalSlideIndices.length > 0 ? (
              <div className="max-w-2xl space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  {verticalSlideIndices.length > 1
                    ? 'Pick your vertical at registration'
                    : 'Registration preset included'}
                </p>
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label="Registration vertical presets"
                >
                  {verticalSlideIndices.map((slideIndex) => {
                    const slide = slides[slideIndex];
                    return (
                      <button
                        key={slide.key}
                        type="button"
                        onClick={() => setIndex(slideIndex)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all sm:text-xs',
                          slideIndex === index
                            ? 'bg-white text-neutral-900 shadow-md'
                            : 'bg-white/10 text-white/78 hover:bg-white/20 hover:text-white'
                        )}
                      >
                        {slide.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-0.5">
                <span className={cn(MARKETING_STAT_VALUE, 'text-2xl text-white sm:text-3xl')}>
                  {formatCurrency(pkg.pricing?.price_pkr || 0, 'PKR')}
                </span>
                <span className="text-sm font-medium text-white/60">/ month suite</span>
                <span className="text-xs font-medium text-white/50">
                  {businessTier?.name} tier base · 14-day trial
                </span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2.5 lg:w-[15.5rem] lg:shrink-0">
              <Button
                asChild
                size="lg"
                className="h-12 w-full rounded-full bg-white font-semibold text-neutral-900 shadow-lg hover:bg-white/95"
              >
                <Link href={registerHref}>
                  {isVertical ? 'Register with this preset' : 'Start with this suite'}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              {isVertical ? (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 w-full rounded-full border-white/30 bg-white/10 font-semibold text-white backdrop-blur-sm hover:bg-white/20"
                >
                  <Link href={getDomainPackageRegisterHref(pkg.key)}>Use suite default</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 w-full rounded-full border-white/30 bg-white/10 font-semibold text-white backdrop-blur-sm hover:bg-white/20"
                >
                  <MarketingCtaLink href={getBookMeetingHref()}>Book a walkthrough</MarketingCtaLink>
                </Button>
              )}
              {demoHref && demoDomain ? (
                <Link
                  href={demoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 py-1 text-center text-xs font-semibold text-white/70 transition-colors hover:text-white"
                >
                  Preview live demo: {demoDomain}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-white/10 bg-neutral-950/65 px-4 py-3 backdrop-blur-md sm:py-3.5">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-2">
          <div
            className="flex flex-wrap items-center justify-center gap-2"
            role="tablist"
            aria-label="Suite overview slides"
          >
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={
                  slide.kind === 'intro'
                    ? `Show ${pkg.name} overview`
                    : slide.kind === 'vertical'
                      ? `Show ${slide.title} preset`
                      : `Show ${slide.title}`
                }
                onClick={() => setIndex(i)}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  i === index ? 'w-8 bg-white' : 'w-2 bg-white/35 hover:bg-white/55'
                )}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs font-medium text-white/58">
            <span>
              {index + 1} / {slides.length} · {slideMeta}
            </span>
            <a
              href="#channels"
              className="inline-flex items-center gap-1 text-white/72 transition-colors hover:text-white"
            >
              Explore sections
              <ChevronDown className="h-3.5 w-3.5 motion-safe:animate-bounce" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
