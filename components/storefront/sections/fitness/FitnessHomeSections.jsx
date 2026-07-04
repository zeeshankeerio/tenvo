'use client';

import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, Target, Headphones, Smartphone, Tag,
} from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { resolveSpotlightBannerImage } from '@/lib/storefront/storefrontImagePlaceholders';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { FitnessBookingStrip } from '@/components/storefront/sections/fitness/FitnessBookingStrip';
import { FitnessMembershipPackages } from '@/components/storefront/sections/fitness/FitnessMembershipPackages';
import { FitnessTrainingServices } from '@/components/storefront/sections/fitness/FitnessTrainingServices';
import { FitnessMarqueeRow } from '@/components/storefront/sections/fitness/FitnessMarqueeRow';
import { cn } from '@/lib/utils';
import {
  getFitnessConfig,
  partitionFitnessProducts,
  resolveFitnessPrograms,
  resolveFitnessBenefits,
  resolveFitnessTrainers,
  resolveFitnessCategoryIcons,
  resolveFitnessPromoBanners,
  resolveFitnessTrustPillars,
  formatFitnessStoreName,
  resolveFitnessBookingItems,
} from '@/lib/storefront/fitnessStorefront';
import {
  getTenantMeetingUrl,
  shouldOfferTenantMeetingLink,
} from '@/lib/storefront/storefrontBooking';

const BENEFIT_ICONS = {
  target: Target,
  headphones: Headphones,
  devices: Smartphone,
  tag: Tag,
};

const FITNESS_GRID_PROPS = {
  density: 'showcase',
  layout: 'grid',
  cardVariant: 'dense',
  showResultsCount: false,
};

function ProgramCard({ program, accent, productsUrl, className }) {
  const href = program.href || `${productsUrl}${program.hrefSuffix || ''}`;
  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden',
        'max-lg:rounded-2xl max-lg:border max-lg:border-white/[0.08] max-lg:bg-gradient-to-b max-lg:from-zinc-950/95 max-lg:to-black max-lg:p-4 max-lg:shadow-[0_12px_40px_rgba(0,0,0,0.45)]',
        className
      )}
    >
      <div className="relative mx-auto mb-3 flex h-36 w-full max-w-[200px] items-end justify-center sm:mb-4 sm:h-48 sm:max-w-[220px] lg:max-w-none">
        <div
          className="absolute bottom-1 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full opacity-75 blur-2xl transition motion-safe:group-active:opacity-100 lg:bottom-2 lg:h-44 lg:w-44 lg:opacity-80 lg:group-hover:opacity-100"
          style={{ background: 'radial-gradient(circle, rgba(225,29,72,0.55) 0%, transparent 70%)' }}
          aria-hidden
        />
        <div className="relative aspect-[4/5] w-full max-w-[180px] motion-safe:transition-transform motion-safe:group-active:scale-[1.02] sm:max-w-[220px] lg:max-w-[240px] lg:motion-safe:group-hover:scale-105">
          <SmartProductImage
            src={program.image}
            alt=""
            fill
            className="object-contain object-bottom drop-shadow-[0_12px_32px_rgba(225,29,72,0.35)]"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-lg bg-white/[0.06] px-2 text-xs font-semibold tabular-nums"
            style={{ color: accent }}
          >
            {program.number}
          </span>
          <div className="h-px flex-1 bg-white/10 lg:hidden" aria-hidden />
        </div>

        <h3 className="mt-2.5 text-base font-semibold leading-snug text-white sm:text-lg lg:text-xl">
          {program.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55 line-clamp-3 sm:line-clamp-none lg:text-white/60">
          {program.description}
        </p>

        <Link
          href={href}
          className={cn(
            'mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition active:scale-[0.98]',
            'max-lg:border max-lg:border-white/10 max-lg:bg-white/[0.06]',
            'lg:mt-5 lg:w-auto lg:justify-start lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:text-xs lg:font-bold lg:uppercase lg:tracking-wide lg:hover:gap-3'
          )}
        >
          <span className="lg:text-white">{program.cta || 'Hit it'}</span>
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full lg:h-9 lg:w-9',
              'max-lg:bg-white/10 lg:bg-white/10 lg:transition lg:group-hover:bg-white/15'
            )}
            style={{ color: accent }}
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </span>
        </Link>
      </div>
    </article>
  );
}

/**
 * Wild-workout fitness homepage — programs, supplements, benefits, memberships, booking.
 */
export function FitnessHomeSections({
  businessDomain,
  businessCategory,
  business,
  categories = [],
  products = [],
  currency = 'PKR',
  accent = '#e11d48',
  base,
  settings = {},
  storeName = '',
  businessDescription = '',
  country = '',
}) {
  const storeBase = base || `/store/${businessDomain}`;
  const productsUrl = `${storeBase}/products`;
  const regionalCtx = { country: country || business?.country || settings?.contact?.country };
  const config = getFitnessConfig(settings, businessDomain, regionalCtx);
  const ctx = { categories, businessDomain, products, businessCategory };
  const { supplements, services, topPicks, deals } = partitionFitnessProducts(products, businessDomain);
  const programs = resolveFitnessPrograms(settings, storeBase, ctx);
  const benefits = resolveFitnessBenefits(settings, businessDomain);
  const trainers = resolveFitnessTrainers(settings, businessDomain);
  const categoryIcons = resolveFitnessCategoryIcons(settings, storeBase, ctx);
  const promoBanners = config.showPromoBanners
    ? resolveFitnessPromoBanners(settings, products, businessDomain, businessCategory)
    : [];
  const trustPillars = config.showTrustPillars
    ? resolveFitnessTrustPillars(settings, businessDomain)
    : [];
  const displayName = formatFitnessStoreName(storeName);
  const supplementTitle = config.supplementRailTitle || 'Fuel your training';
  const featuredTitle = config.featuredRailTitle || 'Top picks';
  const featuredSubtitle = config.featuredRailSubtitle || `Bestsellers from ${displayName}`;

  const tenantMeetingUrl = shouldOfferTenantMeetingLink(business, businessCategory, settings)
    ? getTenantMeetingUrl(business, settings)
    : null;
  const bookingItems = resolveFitnessBookingItems(settings, storeBase, businessDomain);

  // Keep the desktop programs grid balanced for 4/8 items instead of a lopsided
  // last row on the hard-coded 3-column layout.
  const programsGridCols =
    programs.length % 4 === 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

  // Classification is keyword/category based, so a live catalog can have products
  // that match no rail. Surface a catch-all grid so real inventory is never hidden.
  const hasClassifiedRail =
    supplements.length > 0 ||
    services.length > 0 ||
    topPicks.length >= 2 ||
    deals.length >= 2;
  const catchAllProducts =
    !hasClassifiedRail && products.length > 0 ? products.slice(0, 12) : [];

  return (
    <>
      {/* Shop by category — from inventory categories or store settings */}
      {categoryIcons.length > 0 ? (
      <section className="border-b border-white/5 bg-black py-8 sm:py-12">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="mb-5 text-center sm:mb-8 sm:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-400/90">
              Gym store
            </p>
            <h2 className="fitness-heading-gradient mt-1 text-lg font-semibold text-white sm:text-2xl">Shop supplements & gear</h2>
          </div>
          {/* Mobile: horizontal snap rail */}
          <div className="fitness-mobile-scroll -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory lg:hidden">
            {categoryIcons.slice(0, 8).map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                className="group flex w-[4.75rem] shrink-0 snap-start flex-col items-center gap-2 text-center active:scale-[0.97]"
              >
                <div className="relative h-[4.25rem] w-[4.25rem] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 active:border-rose-500/40">
                  {cat.image ? (
                    <SmartProductImage
                      src={cat.image}
                      alt={cat.label}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-white/40">
                        {String(cat.label || '?').slice(0, 3)}
                      </span>
                    </div>
                  )}
                </div>
                <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-white/80">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
          {/* Desktop: grid */}
          <div className="hidden grid-cols-6 gap-4 lg:grid">
            {categoryIcons.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-transparent p-1 text-center active:scale-[0.97]"
              >
                <div className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 lg:group-hover:border-rose-500/40 lg:group-hover:shadow-[0_0_20px_rgba(225,29,72,0.25)]">
                  {cat.image ? (
                    <SmartProductImage
                      src={cat.image}
                      alt={cat.label}
                      fill
                      className="object-cover transition duration-300 motion-safe:group-hover:scale-105"
                      sizes="96px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-white/40">
                        {String(cat.label || '?').slice(0, 3)}
                      </span>
                    </div>
                  )}
                </div>
                <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-white/80">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      ) : null}

      {promoBanners.length > 0 && (
        <section className="border-b border-white/5 bg-black py-8 sm:py-10">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {promoBanners.map((banner, bannerIndex) => {
                const isCrimson = banner.tone === 'crimson' || banner.tone === 'dark';
                const imageSrc = resolveSpotlightBannerImage(banner, businessCategory, bannerIndex);
                const href =
                  banner.href?.startsWith('/') || banner.href?.startsWith('http')
                    ? banner.href
                    : `${storeBase}${banner.href || '/products'}`;
                return (
                  <Link
                    key={banner.id}
                    href={href}
                    className={cn(
                      'group relative flex min-h-[148px] items-end overflow-hidden rounded-2xl border p-5 transition hover:border-rose-500/40 sm:min-h-[168px]',
                      isCrimson ? 'border-rose-900/40 bg-zinc-950' : 'border-white/10 bg-neutral-900'
                    )}
                  >
                    <SmartProductImage
                      src={imageSrc}
                      alt=""
                      fill
                      className="object-cover opacity-80 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-90"
                      fallbackSrc={resolveSpotlightBannerImage(banner, businessCategory, bannerIndex + 1)}
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/52 to-black/18"
                      aria-hidden
                    />
                    <div className="relative z-10 max-w-[90%]">
                      <h3 className="text-lg font-semibold text-white sm:text-xl">{banner.title}</h3>
                      {banner.subtitle ? (
                        <p className="mt-1 text-sm leading-snug text-white/65">{banner.subtitle}</p>
                      ) : null}
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-rose-300 transition group-hover:gap-2">
                        Shop now <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {trustPillars.length > 0 && (
        <section className="border-b border-white/5 bg-zinc-950/80 py-6 sm:py-8">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {trustPillars.map((pillar) => (
                <div key={pillar.id} className="text-center sm:text-left">
                  <p className="text-sm font-semibold text-white">{pillar.label}</p>
                  {pillar.desc ? (
                    <p className="mt-1 text-xs leading-relaxed text-white/55">{pillar.desc}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Wild Programs */}
      {config.showPrograms && programs.length > 0 && (
        <section
          className="relative isolate overflow-hidden border-b border-white/[0.04] bg-black py-8 sm:py-16"
          id="programs"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-rose-950/20 to-transparent lg:h-40"
            aria-hidden
          />
          <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mb-5 flex flex-col gap-3 sm:mb-10 sm:items-center sm:text-center lg:mb-14">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-400/90">
                  Training styles
                </p>
                <h2 className="mt-1.5 text-xl font-semibold text-white sm:mt-2 sm:text-2xl lg:text-[1.65rem]">
                  <span className="lg:hidden">Wild Programs</span>
                  <span className="hidden lg:inline" style={{ color: accent }}>
                    Wild Programs
                  </span>
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55 sm:mx-auto sm:text-base lg:hidden">
                  Strength, mobility, and conditioning tracks built for every training day.
                </p>
              </div>
            </div>

            <FitnessMarqueeRow
              items={programs}
              slideClassName="w-[min(84vw,300px)] sm:w-[min(78vw,280px)]"
              renderItem={(program) => (
                <ProgramCard
                  program={program}
                  accent={accent}
                  productsUrl={productsUrl}
                />
              )}
            />

            <div
              className={cn(
                'hidden lg:grid lg:gap-8 xl:gap-10',
                programsGridCols
              )}
            >
              {programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  accent={accent}
                  productsUrl={productsUrl}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Membership packages — gents / ladies, monthly through annual */}
      {config.showMemberships && (
        <FitnessMembershipPackages
          products={products}
          storeBase={storeBase}
          currency={currency}
          accent={accent}
          meetingUrl={tenantMeetingUrl || undefined}
          businessDomain={businessDomain}
          categories={categories}
          settings={settings}
          country={regionalCtx.country}
        />
      )}

      {services.length > 0 && (
        <FitnessTrainingServices
          services={services}
          storeBase={storeBase}
          productsUrl={productsUrl}
          currency={currency}
          accent={accent}
          meetingUrl={tenantMeetingUrl || undefined}
        />
      )}

      {/* Supplements rail — 12 products, 6 per row */}
      {supplements.length > 0 && (
        <section className="border-t border-white/5 bg-black py-10 sm:py-14" id="supplements">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
              <div className="min-w-0">
                <h2 className="fitness-heading-gradient text-xl font-semibold text-white sm:text-2xl">{supplementTitle}</h2>
                <p className="mt-1 text-sm text-white/50">
                  Protein, recovery, and performance nutrition
                </p>
              </div>
              <Link
                href={productsUrl}
                className="flex shrink-0 items-center gap-1 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-rose-500/40 sm:text-sm"
                style={{ color: accent }}
              >
                More <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <ProductGrid
              products={supplements}
              businessDomain={businessDomain}
              {...FITNESS_GRID_PROPS}
            />
          </div>
        </section>
      )}

      {/* Meet the coaches — trainer roster */}
      {trainers.length > 0 && (
        <section className="border-t border-white/5 bg-black py-12 sm:py-16">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="fitness-heading-gradient text-xl font-semibold text-white sm:text-2xl">Meet the coaches</h2>
                <p className="mt-1 text-sm text-white/50">Strength, mobility, HIIT, and nutrition specialists</p>
              </div>
              {tenantMeetingUrl ? (
                <a
                  href={tenantMeetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold"
                  style={{ color: accent }}
                >
                  Book with a coach <ArrowRight className="h-4 w-4" />
                </a>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trainers.map((trainer) => (
                <article
                  key={trainer.id}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-black/40"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <SmartProductImage
                      src={trainer.image}
                      alt={trainer.name}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                        {trainer.role}
                      </p>
                      <h3 className="text-lg font-semibold text-white">{trainer.name}</h3>
                    </div>
                  </div>
                  <p className="p-4 text-sm leading-relaxed text-white/60">{trainer.bio}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {topPicks.length >= 2 && (
        <section className="border-t border-white/5 bg-black py-10 sm:py-14">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <StoreSectionHeader
              title={featuredTitle}
              subtitle={featuredSubtitle}
              href={`${productsUrl}?sort=featured`}
              accent={accent}
            />
            <ProductGrid
              products={topPicks.slice(0, 6)}
              businessDomain={businessDomain}
              {...FITNESS_GRID_PROPS}
            />
          </div>
        </section>
      )}

      {deals.length >= 2 && (
        <section className="border-t border-white/5 bg-black py-10 sm:py-14">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <StoreSectionHeader
              title="Hot deals"
              subtitle="Limited offers on supplements and gear"
              href={`${productsUrl}?onSale=true`}
              accent={accent}
            />
            <ProductGrid
              products={deals.slice(0, 6)}
              businessDomain={businessDomain}
              {...FITNESS_GRID_PROPS}
            />
          </div>
        </section>
      )}

      {/* Catch-all — ensures live products that match no themed rail still appear */}
      {catchAllProducts.length > 0 && (
        <section className="border-t border-white/5 bg-black py-10 sm:py-14" id="shop">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <StoreSectionHeader
              title="Shop the store"
              subtitle={`Everything from ${displayName}`}
              href={productsUrl}
              accent={accent}
            />
            <ProductGrid
              products={catchAllProducts}
              businessDomain={businessDomain}
              {...FITNESS_GRID_PROPS}
            />
          </div>
        </section>
      )}

      {/* Booking — bottom of page, before footer */}
      {config.showBookingStrip && bookingItems.length > 0 ? (
        <FitnessBookingStrip
          items={bookingItems}
          accent={accent}
          contactHref={`${storeBase}/contact`}
          meetingUrl={tenantMeetingUrl || undefined}
        />
      ) : null}

      {/* Extra Benefits — bottom of page, before footer */}
      {config.showBenefits && benefits.length > 0 && (
        <section className="border-t border-white/5 bg-black py-12 sm:py-16">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <h2 className="fitness-heading-gradient text-center text-xl font-semibold text-white sm:text-2xl">Extra Benefits</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/60 sm:text-base">
              Effective workouts plus membership perks that keep training stress-free.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:gap-6">
              {benefits.map((item) => {
                const Icon = BENEFIT_ICONS[item.icon] || Target;
                return (
                  <div
                    key={item.id}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
                      style={{ backgroundColor: accent }}
                    >
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-white sm:text-lg">{item.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-white/60">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function StoreSectionHeader({ title, subtitle, href, accent }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="fitness-heading-gradient text-xl font-semibold text-white sm:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-white/50">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-xs font-bold sm:text-sm"
          style={{ color: accent }}
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
