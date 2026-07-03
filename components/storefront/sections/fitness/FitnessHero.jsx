'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Calendar, ShoppingBag, ArrowUpRight } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';
import { normalizeProseCopy } from '@/lib/utils/copyTypography';
import {
  FITNESS_ASSETS,
  getFitnessConfig,
  formatFitnessStoreName,
  resolveFitnessHeroQuickLinks,
  resolveFitnessSupplementsShopUrl,
} from '@/lib/storefront/fitnessStorefront';
import { FitnessTrendingMarquee } from '@/components/storefront/sections/fitness/FitnessTrendingMarquee';

/** Full viewport on desktop; immersive scrollable stack on mobile. */
const HERO_VIEWPORT =
  'max-lg:min-h-[min(100svh,920px)] max-lg:h-auto lg:h-[100svh] lg:min-h-[100svh] lg:max-h-none w-full max-w-none';

function FitnessHeroBackdrop({ accent }) {
  const glow = accent || '#e11d48';
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-black" aria-hidden />

      {/* Desktop / tablet wide glow */}
      <div
        className="fitness-hero-glow pointer-events-none absolute inset-0 motion-reduce:opacity-90 max-lg:hidden"
        style={{
          background: `radial-gradient(ellipse 62% 76% at 78% 46%, ${glow}72 0%, ${glow}30 44%, transparent 74%)`,
        }}
        aria-hidden
      />

      {/* Mobile: glow behind athlete + headline legibility vignette */}
      <div
        className="fitness-hero-glow pointer-events-none absolute inset-0 motion-reduce:opacity-90 lg:hidden"
        style={{
          background: `radial-gradient(ellipse 90% 55% at 50% 72%, ${glow}55 0%, ${glow}22 42%, transparent 72%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(48%,320px)] bg-gradient-to-b from-black via-black/75 to-transparent lg:hidden"
        aria-hidden
      />

      <div
        className="fitness-hero-flare pointer-events-none absolute -right-[6%] -top-[4%] h-[min(42vw,360px)] w-[min(50vw,420px)] motion-reduce:opacity-70 max-lg:h-[min(36vw,200px)] max-lg:w-[min(44vw,240px)]"
        style={{
          background:
            'linear-gradient(135deg, rgba(251,191,36,0.42) 0%, rgba(249,115,22,0.26) 38%, transparent 74%)',
          filter: 'blur(44px)',
          transform: 'rotate(-12deg)',
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 38% 32% at 6% 92%, rgba(249,115,22,0.1) 0%, transparent 68%)',
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 130% 95% at 50% 48%, transparent 38%, rgba(0,0,0,0.5) 100%)',
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-black"
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <SmartProductImage
          src={FITNESS_ASSETS.spark1}
          alt=""
          width={120}
          height={120}
          className="fitness-hero-spark absolute left-[4%] top-[16%] w-11 opacity-75 sm:left-[6%] sm:w-[4.5rem] motion-reduce:opacity-60"
          style={{ animationDelay: '0s' }}
        />
        <SmartProductImage
          src={FITNESS_ASSETS.spark2}
          alt=""
          width={100}
          height={100}
          className="fitness-hero-spark absolute left-[18%] top-[6%] hidden w-14 opacity-50 md:block motion-reduce:opacity-40"
          style={{ animationDelay: '-2.5s' }}
        />
        <SmartProductImage
          src={FITNESS_ASSETS.spark3}
          alt=""
          width={100}
          height={100}
          className="fitness-hero-spark absolute right-[4%] top-[18%] w-10 opacity-65 md:right-[8%] md:w-14 motion-reduce:opacity-50"
          style={{ animationDelay: '-4s' }}
        />
      </div>
    </>
  );
}

function FitnessAthleteVisual({ brandAccent, heroImageSrc, className, compact = false }) {
  const ringBottom = compact
    ? 'bottom-[8%]'
    : 'bottom-[14%] sm:bottom-[15%] lg:bottom-[16%]';

  return (
    <div className={cn('relative h-full w-full', className)}>
      <div
        className={cn(
          'fitness-hero-glow pointer-events-none absolute left-1/2 z-0 aspect-square -translate-x-1/2 rounded-full blur-[48px] motion-reduce:opacity-80',
          compact
            ? 'w-[min(115%,360px)] opacity-90'
            : 'w-[min(104%,480px)] sm:w-[min(108%,520px)] lg:w-[min(122%,600px)]',
          ringBottom
        )}
        style={{
          background: `radial-gradient(circle, ${brandAccent}95 0%, ${brandAccent}40 42%, transparent 76%)`,
        }}
        aria-hidden
      />

      <div
        className={cn(
          'pointer-events-none absolute left-1/2 z-[1] aspect-square -translate-x-1/2',
          compact
            ? 'w-[min(98%,300px)]'
            : 'w-[min(102%,460px)] sm:w-[min(112%,500px)] lg:w-[min(128%,580px)]',
          ringBottom
        )}
      >
        <div className={cn('fitness-hero-ring relative h-full w-full motion-reduce:animate-none', compact && 'opacity-80')}>
          <SmartProductImage
            src={FITNESS_ASSETS.heroCircle}
            alt=""
            fill
            className="object-contain opacity-95"
          />
        </div>
      </div>

      <div
        className={cn(
          'pointer-events-none absolute left-1/2 z-[1] aspect-square -translate-x-1/2',
          compact ? 'w-[min(82%,240px)]' : 'w-[min(86%,380px)] sm:w-[min(94%,420px)] lg:w-[min(108%,500px)]',
          ringBottom
        )}
      >
        <div
          className={cn(
            'h-full w-full rounded-full border border-dashed border-white/14',
            'shadow-[0_0_60px_rgba(225,29,72,0.22)]',
            'motion-safe:animate-[spin_32s_linear_infinite_reverse] motion-reduce:animate-none'
          )}
          aria-hidden
        />
      </div>

      <div
        className={cn(
          'pointer-events-none absolute left-1/2 z-0 aspect-square w-[min(118%,520px)] -translate-x-1/2 rounded-full opacity-40 blur-xl',
          'sm:w-[min(128%,560px)] lg:w-[min(142%,640px)]',
          ringBottom
        )}
        style={{
          background: `radial-gradient(circle, transparent 58%, ${brandAccent}55 72%, transparent 78%)`,
        }}
        aria-hidden
      />

      <div className={cn('fitness-hero-athlete absolute inset-x-0 z-10 flex items-end justify-center', compact ? 'bottom-0' : 'bottom-5 sm:bottom-7 lg:bottom-10')}>
        <SmartProductImage
          src={heroImageSrc || FITNESS_ASSETS.heroAthlete}
          alt=""
          width={560}
          height={700}
          priority
          className={cn(
            'h-auto w-auto max-w-full object-contain object-bottom',
            compact
              ? 'max-h-[min(52vw,240px)] -translate-y-0 drop-shadow-[0_16px_48px_rgba(225,29,72,0.55)]'
              : cn(
                  '-translate-y-1 object-contain sm:-translate-y-2 lg:-translate-y-3',
                  'max-h-[min(44svh,340px)] sm:max-h-[min(46svh,380px)]',
                  'md:max-h-[min(80svh,660px)] lg:max-h-[min(88svh,740px)]',
                  'drop-shadow-[0_24px_64px_rgba(225,29,72,0.5)]'
                )
          )}
        />
      </div>
    </div>
  );
}

/**
 * Full-viewport fitness hero — edge-to-edge, two-column on lg+, layered effects.
 */
export function FitnessHero({
  preset,
  businessDomain,
  accent,
  accentDark,
  contactCity,
  meetingUrl,
}) {
  const router = useRouter();
  const base = preset.base || `/store/${businessDomain}`;
  const productsUrl = `${base}/products`;
  const config = getFitnessConfig(preset.settings, businessDomain, {
    country: preset.country || preset.settings?.contact?.country,
  });
  const storeName = preset.storeName || formatFitnessStoreName('');
  const [query, setQuery] = useState('');
  const categories = preset.categories || [];
  const quickLinks =
    preset.quickLinks?.length > 0
      ? preset.quickLinks
      : resolveFitnessHeroQuickLinks(base, preset.settings, [], categories, businessDomain);
  const supplementsHref = resolveFitnessSupplementsShopUrl(base, categories);
  const title = normalizeProseCopy(config.heroTitle);
  const subtitle = normalizeProseCopy(config.heroSubtitle);
  const heroImageSrc =
    preset.slides?.find((slide) => slide?.image)?.image ||
    preset.coverImage ||
    null;
  const brandAccent = accent || '#e11d48';
  const brandAccentDark = accentDark || '#9f1239';

  const search = () => {
    const q = query.trim();
    router.push(q ? `${productsUrl}?search=${encodeURIComponent(q)}` : productsUrl);
  };

  return (
    <section
      className={cn(
        'store-hero fitness-hero relative isolate overflow-hidden bg-black text-white',
        HERO_VIEWPORT,
        'max-lg:pb-6'
      )}
    >
      <FitnessHeroBackdrop accent={brandAccent} />

      <div
        className={cn(
          'relative z-10 grid w-full min-h-0',
          'max-lg:flex max-lg:flex-col',
          'lg:grid lg:h-full lg:grid-cols-[minmax(0,46%)_minmax(0,54%)] lg:grid-rows-1'
        )}
      >
        {/* Copy column */}
        <div
          className={cn(
            'flex min-h-0 flex-col justify-center',
            'px-4 pt-[calc(3.25rem+env(safe-area-inset-top,0px))] pb-2',
            'sm:px-8 sm:pb-4',
            'lg:flex lg:min-h-0 lg:flex-col lg:justify-center lg:px-10 lg:pb-8 lg:pt-[calc(4rem+env(safe-area-inset-top,0px))]',
            'xl:px-14 2xl:px-20'
          )}
        >
          <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-3 sm:gap-4 lg:mx-0 lg:max-w-[36rem] lg:gap-5">
            {storeName ? (
              <p className="fitness-hero-eyebrow font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-300/95 sm:text-[11px]">
                {storeName}
                {contactCity ? (
                  <span className="text-zinc-500"> · {contactCity}</span>
                ) : null}
              </p>
            ) : null}

            <div className="space-y-2 sm:space-y-2.5">
              <h1
                className={cn(
                  'fitness-hero-title store-heading store-heading--inverse font-sans text-balance font-bold tracking-tight text-white',
                  'text-[clamp(2rem,7.5vw+0.65rem,2.875rem)] leading-[1.04]',
                  'sm:text-[clamp(2.125rem,4.8vw+0.4rem,3.5rem)] sm:leading-[1.05]',
                  'xl:text-[clamp(2.5rem,3.5vw+0.5rem,3.75rem)]'
                )}
              >
                {title}
              </h1>

              {subtitle ? (
                <p className="fitness-hero-subtitle max-w-[32rem] font-sans text-pretty text-[15px] leading-snug text-zinc-300 sm:text-[15px] sm:leading-relaxed">
                  {subtitle}
                </p>
              ) : null}
            </div>

            {/* Mobile athlete — between headline and actions */}
            <div className="relative mx-auto h-[min(52vw,260px)] w-full max-w-[340px] shrink-0 lg:hidden">
              <FitnessAthleteVisual
                brandAccent={brandAccent}
                heroImageSrc={heroImageSrc}
                compact
                className="h-full w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 max-lg:w-full sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
              <Link
                href={supplementsHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-950/45 transition hover:opacity-95 active:scale-[0.98] sm:flex-none sm:px-4"
                style={{
                  background: `linear-gradient(135deg, ${brandAccent} 0%, ${brandAccentDark} 100%)`,
                }}
              >
                <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">Shop supplements</span>
              </Link>
              {meetingUrl ? (
                <a
                  href={meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/18 bg-white/[0.07] px-3 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/28 hover:bg-white/[0.11] active:scale-[0.98] sm:px-4"
                >
                  <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">Book session</span>
                </a>
              ) : (
                <Link
                  href={`${base}#book`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/18 bg-white/[0.07] px-3 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/28 hover:bg-white/[0.11] active:scale-[0.98] sm:px-4"
                >
                  <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">Book session</span>
                </Link>
              )}
              <Link
                href={`${base}#memberships`}
                className="col-span-2 inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-zinc-300 transition active:scale-[0.98] active:border-rose-500/30 sm:col-span-1 sm:border-transparent sm:bg-transparent sm:py-2.5 sm:hover:text-white"
              >
                View memberships
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </Link>
            </div>

            <form
              className="w-full rounded-2xl border border-white/[0.08] bg-black/40 p-3 backdrop-blur-sm sm:border-transparent sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
              onSubmit={(e) => {
                e.preventDefault();
                search();
              }}
            >
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-950/80 py-1 pl-3 pr-1 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md">
                <Search className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={normalizeProseCopy(config.searchPlaceholder)}
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-white outline-none placeholder:text-zinc-500 sm:py-2 sm:text-sm"
                  aria-label="Search gym store"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-white transition hover:opacity-95 active:scale-[0.98] sm:px-4 sm:text-sm"
                  style={{
                    background: `linear-gradient(135deg, ${brandAccent} 0%, ${brandAccentDark} 100%)`,
                  }}
                >
                  Search
                </button>
              </div>
              <FitnessTrendingMarquee links={quickLinks} />
              <p className="mt-2 hidden font-sans text-[11px] leading-snug text-zinc-500 sm:block">
                Browse memberships, supplements, and personal training. All items sync with live store inventory.
              </p>
            </form>
          </div>
        </div>

        {/* Desktop athlete column */}
        <div className="relative hidden h-full min-h-0 w-full shrink-0 lg:block lg:px-0">
          <FitnessAthleteVisual
            brandAccent={brandAccent}
            heroImageSrc={heroImageSrc}
            className="mx-auto h-full max-w-none pr-[2%] xl:pr-[4%]"
          />
        </div>
      </div>
    </section>
  );
}
