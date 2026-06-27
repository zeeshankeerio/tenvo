'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Play, ArrowRight, Calendar } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';
import { resolveAutomotiveTileImage } from '@/lib/storefront/storefrontImagePlaceholders';

/**
 * Full-bleed dealership hero with Ken Burns motion and optional vehicle showcase.
 * @param {{ preset: object; accent: string }} props
 */
export function DealershipHero({ preset, accent }) {
  const router = useRouter();
  const slides = preset.slides || [];
  const [index, setIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [motionOk, setMotionOk] = useState(true);
  const count = slides.length || 1;
  const videoUrl = preset.videoUrl || preset.settings?.storefront?.dealership?.videoUrl;
  const isShowroom = Boolean(preset.isTenvoShowroom);
  const storeBase = preset.base || '/';

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  useEffect(() => {
    if (count <= 1) return undefined;
    const id = setInterval(next, 8000);
    return () => clearInterval(id);
  }, [count, next]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotionOk(!mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const slide = slides[index] || slides[0];
  const ctaTextColor = accent?.toLowerCase() === '#111827' ? '#ffffff' : '#000000';

  return (
    <section
      className={cn(
        'store-hero relative overflow-hidden bg-neutral-950',
        isShowroom ? 'min-h-[68vh] lg:min-h-[72vh]' : 'min-h-[100svh] lg:min-h-[92vh]'
      )}
    >
      {slides.map((s, i) => (
        <div
          key={`${s.image}-${i}`}
          className={cn(
            'absolute inset-0 transition-opacity duration-1000 ease-in-out',
            i === index ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div
            className={cn(
              'absolute inset-0',
              motionOk && i === index && 'animate-[dealership-ken-burns_12s_ease-out_forwards]'
            )}
          >
            <SmartProductImage
              src={s.videoPoster || s.image}
              alt=""
              fill
              className="object-cover object-center"
              priority={i === 0}
              fallbackSrc={resolveAutomotiveTileImage(s.title || String(i))}
            />
          </div>
          <div
            className={cn(
              'absolute inset-0',
              isShowroom
                ? 'bg-gradient-to-t from-neutral-950/90 via-neutral-950/45 to-neutral-900/25'
                : 'bg-gradient-to-t from-black/92 via-black/55 to-black/35'
            )}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08), transparent 40%)',
            }}
            aria-hidden
          />
        </div>
      ))}

      <div
        className={cn(
          'relative z-10 flex h-full min-h-[inherit] flex-col justify-end px-4 pb-16 pt-24 sm:px-8 sm:pb-20 lg:px-12',
          isShowroom && 'items-center text-center'
        )}
      >
        <div
          className={cn(
            'mx-auto grid w-full max-w-[1400px] gap-10',
            slide?.vehicleImage && !isShowroom
              ? 'lg:grid-cols-[1fr_minmax(280px,420px)] lg:items-end'
              : 'max-w-3xl'
          )}
        >
          {slide ? (
            <div className={cn('max-w-2xl', isShowroom && 'mx-auto')}>
              {slide.badge ? (
                <p className="mb-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                  {slide.badge}
                </p>
              ) : null}
              <p
                className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85 sm:text-xs"
                style={accent?.toLowerCase() === '#d4af37' ? { color: accent } : undefined}
              >
                {slide.eyebrow}
              </p>
              <h1 className="store-heading store-heading--inverse text-3xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
                {slide.title}
              </h1>
              {slide.subtitle ? (
                <p className="store-hero-subtitle mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:text-lg">
                  {slide.subtitle}
                </p>
              ) : null}

              <div className={cn('mt-8 flex flex-wrap items-center gap-3', isShowroom && 'justify-center')}>
                <button
                  type="button"
                  onClick={() => router.push(slide.ctaHref || `${storeBase}/products`)}
                  className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] shadow-lg transition hover:opacity-95"
                  style={{ backgroundColor: accent, color: ctaTextColor }}
                >
                  {slide.ctaLabel || 'Explore inventory'}
                  <ArrowRight className="h-4 w-4" />
                </button>

                {isShowroom ? (
                  <Link
                    href={`${storeBase}#book`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-white backdrop-blur-sm transition hover:bg-white/20"
                  >
                    <Calendar className="h-4 w-4" />
                    Book a visit
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowVideo(true)}
                    className="inline-flex items-center gap-3 rounded-full border border-white/40 bg-white/10 px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm transition hover:bg-white/20"
                    aria-label="Play showroom video"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60">
                      <Play className="h-4 w-4 fill-white text-white" />
                    </span>
                    Watch film
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {slide?.vehicleImage && !isShowroom ? (
            <div className="hidden lg:block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/20 bg-white/5 shadow-2xl backdrop-blur-sm">
                <SmartProductImage
                  src={slide.vehicleImage}
                  alt=""
                  fill
                  className={cn(
                    'object-cover object-center',
                    motionOk && 'animate-[dealership-float_6s_ease-in-out_infinite]'
                  )}
                  sizes="420px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            </div>
          ) : null}
        </div>

        {count > 1 ? (
          <div className={cn('mx-auto mt-8 flex w-full max-w-[1400px] items-center gap-4', isShowroom && 'justify-center')}>
            <span className="text-sm font-semibold tabular-nums text-white/90">
              {index + 1}/{count}
            </span>
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    'h-1 rounded-full transition-all',
                    i === index ? 'w-8 bg-white' : 'w-4 bg-white/40 hover:bg-white/60'
                  )}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {showVideo ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Showroom video"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full border border-white/30 px-4 py-2 text-sm text-white"
            onClick={() => setShowVideo(false)}
          >
            Close
          </button>
          <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-lg bg-black">
            {videoUrl ? (
              <iframe
                title="Showroom video"
                src={videoUrl}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <SmartProductImage
                  src={slide?.image || slides[0]?.image}
                  alt="Showroom preview"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <p className="px-6 text-center text-sm text-white/90">
                    Add your showroom reel URL in Store Settings → Showroom.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes dealership-ken-burns {
          from {
            transform: scale(1);
          }
          to {
            transform: scale(1.08);
          }
        }
        @keyframes dealership-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </section>
  );
}
