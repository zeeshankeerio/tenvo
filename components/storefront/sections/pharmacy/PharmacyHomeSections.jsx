'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { resolveSpotlightBannerImage } from '@/lib/storefront/storefrontImagePlaceholders';
import { StoreProductRail } from '@/components/storefront/StoreProductRail';
import { PharmacyCategoryIcons } from '@/components/storefront/sections/pharmacy/PharmacyCategoryIcons';
import { PharmacyPrescriptionBanner } from '@/components/storefront/sections/pharmacy/PharmacyPrescriptionBanner';
import { PharmacyTrustBadges } from '@/components/storefront/sections/pharmacy/PharmacyTrustBadges';
import { PharmacyHealthConcerns } from '@/components/storefront/sections/pharmacy/PharmacyHealthConcerns';
import { PharmacySymptomAssistant } from '@/components/storefront/sections/pharmacy/PharmacySymptomAssistant';
import { cn } from '@/lib/utils';
import { STORE_SECTION_HEADING } from '@/lib/utils/typography';
import {
  getPharmacyConfig,
  partitionPharmacyProducts,
  resolvePharmacyCategoryIcons,
  resolvePharmacyPromoBanners,
  resolvePharmacyCareByCondition,
  resolvePharmacyBrands,
  resolvePharmacySeoBlocks,
  formatPharmacyStoreName,
  resolvePharmacyTrustPillars,
} from '@/lib/storefront/pharmacyStorefront';

function PharmacySeoBlock({ storeName, businessDescription, country, settings, businessDomain }) {
  const config = getPharmacyConfig(settings, businessDomain);
  if (!config.showSeoBlock) return null;
  const blocks = resolvePharmacySeoBlocks(storeName, businessDescription, country);
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="border-t border-emerald-100 bg-emerald-50/50 py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2 className={cn(STORE_SECTION_HEADING, 'mb-6 text-slate-900')}>{blocks[0]?.title}</h2>
        <div className={cn('space-y-6', !expanded && 'max-h-[280px] overflow-hidden relative')}>
          {blocks.map((block) => (
            <div key={block.id}>
              {block.id !== 'about' && (
                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{block.title}</h3>
              )}
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{block.body}</p>
            </div>
          ))}
          {!expanded && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-emerald-50/95 to-transparent" />
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      </div>
    </section>
  );
}

/**
 * Tenant-aware pharmacy homepage sections.
 */
export function PharmacyHomeSections({
  businessDomain,
  businessCategory,
  categories = [],
  products = [],
  accent = '#16a34a',
  base,
  settings = {},
  storeName = '',
  businessDescription = '',
  country = '',
}) {
  const storeBase = base || `/store/${businessDomain}`;
  const productsUrl = `${storeBase}/products`;
  const config = getPharmacyConfig(settings, businessDomain);
  const displayName = formatPharmacyStoreName(storeName);
  const ctx = { categories, businessDomain, products, businessCategory };

  const { topSelling, deals, featured } = partitionPharmacyProducts(products);
  const categoryIcons = resolvePharmacyCategoryIcons(settings, storeBase, ctx);
  const promoBanners = resolvePharmacyPromoBanners(settings, products, businessDomain, businessCategory);
  const careItems = resolvePharmacyCareByCondition(settings, storeBase, ctx);
  const brands = resolvePharmacyBrands(settings, products, businessDomain);
  const trustPillars = resolvePharmacyTrustPillars(settings, businessDomain);
  const featuredTitle = config.featuredRailTitle || 'Top selling';
  const featuredSubtitle =
    config.featuredRailSubtitle || `Popular products from ${displayName}`;

  return (
    <>
      {/* Shop by category — single-row auto-scroll marquee */}
      <PharmacyCategoryIcons categoryIcons={categoryIcons} accent={accent} />

      {/* AI symptom assistant — routes to categories + chat */}
      <PharmacySymptomAssistant productsUrl={productsUrl} accent={accent} />

      {/* Trust badges — build credibility early */}
      <PharmacyTrustBadges badges={trustPillars} accent={accent} />

      {topSelling.length > 0 && (
        <StoreProductRail
          title={featuredTitle}
          subtitle={featuredSubtitle}
          href={`${productsUrl}?sort=popularity`}
          linkLabel="Shop all"
          products={topSelling}
          catalogPool={products}
          businessDomain={businessDomain}
          className="bg-white"
        />
      )}

      {/* Prescription upload CTA — prominent placement */}
      <PharmacyPrescriptionBanner storeBase={storeBase} accent={accent} />

      {deals.length > 0 && (
        <StoreProductRail
          title="Deals & offers"
          subtitle="Save on vitamins, baby care, and personal care"
          href={`${productsUrl}?onSale=true`}
          products={deals}
          catalogPool={products}
          businessDomain={businessDomain}
          className="bg-emerald-50/40"
        />
      )}

      {promoBanners.length > 0 && (
        <section className="bg-white py-8 sm:py-10">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {promoBanners.map((banner, bannerIndex) => {
                const isGreen = banner.tone === 'green';
                const imageSrc = resolveSpotlightBannerImage(banner, businessCategory, bannerIndex);
                return (
                  <Link
                    key={banner.id}
                    href={`${productsUrl}${banner.href}`}
                    className={cn(
                      'group relative flex min-h-[148px] items-end overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md sm:min-h-[188px] sm:p-6',
                      isGreen ? 'border-emerald-800/30 bg-emerald-950' : 'border-emerald-100 bg-neutral-900'
                    )}
                  >
                    <SmartProductImage
                      src={imageSrc}
                      alt=""
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      fallbackSrc={resolveSpotlightBannerImage(banner, businessCategory, bannerIndex + 1)}
                    />
                    <div
                      className={cn(
                        'absolute inset-0',
                        isGreen
                          ? 'bg-gradient-to-t from-emerald-950/92 via-emerald-900/55 to-emerald-900/20'
                          : 'bg-gradient-to-t from-white/95 via-white/78 to-white/35'
                      )}
                      aria-hidden
                    />
                    <div className="relative z-10 max-w-[85%]">
                      <h3 className={cn('text-lg font-semibold sm:text-xl', isGreen ? 'text-white' : 'text-slate-900')}>
                        {banner.title}
                      </h3>
                      <p className={cn('mt-1 text-sm leading-snug', isGreen ? 'text-emerald-50/90' : 'text-slate-600')}>
                        {banner.subtitle}
                      </p>
                      <span
                        className={cn(
                          'mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide transition-[gap] group-hover:gap-2',
                          isGreen ? 'text-white' : 'text-emerald-700'
                        )}
                      >
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

      {/* Health concerns — shop by condition */}
      <PharmacyHealthConcerns concerns={careItems} productsUrl={productsUrl} accent={accent} />

      {featured.length > 0 && (
        <StoreProductRail
          title="Featured products"
          subtitle={`Handpicked from ${displayName}`}
          href={`${productsUrl}?sort=featured`}
          products={featured}
          catalogPool={products}
          businessDomain={businessDomain}
          className="bg-white"
        />
      )}

      {config.showBrandsRow && brands.length > 0 && (
        <section className="border-y border-emerald-50 bg-white py-10 sm:py-12">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mb-6 text-center sm:mb-8 lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Trusted partners
              </p>
              <h2 className={cn(STORE_SECTION_HEADING, 'mt-2 text-slate-900')}>
                Shop by brand
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Genuine medicines from authorized pharmaceutical manufacturers
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              {brands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`${productsUrl}?search=${encodeURIComponent(brand.name)}`}
                  className="group relative overflow-hidden rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-emerald-300 hover:shadow-md active:scale-95 sm:px-6 sm:py-3.5"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-teal-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  <span className="relative">{brand.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {config.showRefillPromo && (
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 py-12 sm:py-16">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }} />
          </div>

          <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center lg:gap-12">
              <div className="max-w-2xl text-white">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100 backdrop-blur-sm">
                  <Bell className="h-3.5 w-3.5" />
                  Medication reminders
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
                  Never miss your monthly refill
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-emerald-50 sm:text-base lg:text-lg">
                  Set automated refill reminders for your chronic care medicines. We'll notify you before
                  your supply runs out and help you reorder with a valid prescription when required.
                  Perfect for diabetes care, blood pressure medications, and daily supplements.
                </p>

                <div className="mt-6 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm text-emerald-50">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                      ✓
                    </div>
                    <span>Free reminder service</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-emerald-50">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                      ✓
                    </div>
                    <span>WhatsApp & SMS alerts</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-emerald-50">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                      ✓
                    </div>
                    <span>Pharmacist support</span>
                  </div>
                </div>
              </div>

              <Link
                href={`${storeBase}/contact?refill=1`}
                className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-semibold text-emerald-800 shadow-xl transition-all duration-200 hover:bg-emerald-50 hover:shadow-2xl active:scale-95"
              >
                <Bell className="h-5 w-5" aria-hidden />
                Set up refill reminder
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <PharmacySeoBlock
        storeName={storeName}
        businessDescription={businessDescription}
        country={country}
        settings={settings}
        businessDomain={businessDomain}
      />
    </>
  );
}
