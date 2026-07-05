'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { resolveSpotlightBannerImage } from '@/lib/storefront/storefrontImagePlaceholders';
import { TopCollectionsCarousel } from '@/components/storefront/sections/TopCollectionsCarousel';
import { TopPicksSection } from '@/components/storefront/sections/TopPicksSection';
import { FashionDepartmentSections } from '@/components/storefront/sections/fashion/FashionDepartmentSections';
import { FashionCircleShowcase } from '@/components/storefront/sections/fashion/FashionCircleShowcase';
import { FashionTrustStrip } from '@/components/storefront/sections/fashion/FashionTrustStrip';
import { StoreReveal } from '@/components/storefront/effects/StoreReveal';
import { cn } from '@/lib/utils';
import { STORE_SECTION_HEADING } from '@/lib/utils/typography';
import {
  getFashionEditorialConfig,
  formatFashionStoreName,
  resolveFashionTrustPillars,
  resolveFashionBrands,
  resolveFashionPromoBanners,
  resolveFashionSeoBlocks,
} from '@/lib/storefront/fashionEditorial';
import { FashionGulAhmedSections } from '@/components/storefront/sections/fashion/FashionGulAhmedSections';

function FashionSeoBlock({ storeName, businessCategory, businessDescription, country, settings, businessDomain }) {
  const config = getFashionEditorialConfig(settings, businessDomain);
  if (!config.showSeoBlock) return null;
  const blocks = resolveFashionSeoBlocks(storeName, businessCategory, businessDescription, country);
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="border-t border-stone-200 bg-stone-50/80 py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2 className={cn(STORE_SECTION_HEADING, 'mb-6 text-stone-900')}>{blocks[0]?.title}</h2>
        <div className={cn('space-y-6', !expanded && 'max-h-[280px] overflow-hidden relative')}>
          {blocks.map((block) => (
            <div key={block.id}>
              {block.id !== 'about' && (
                <h3 className="text-base font-semibold text-stone-900 sm:text-lg">{block.title}</h3>
              )}
              <p className="mt-2 text-sm leading-relaxed text-stone-600 sm:text-base">{block.body}</p>
            </div>
          ))}
          {!expanded && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-stone-50/95 to-transparent" />
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 text-sm font-semibold text-stone-700 hover:text-stone-900"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      </div>
    </section>
  );
}

/**
 * Editorial fashion / textile homepage — Zellbury-style sections with owner toggles.
 */
export function FashionHomeSections({
  businessDomain,
  businessCategory,
  settings = {},
  products = [],
  accent = '#78716c',
  accentDark,
  canonical,
  storeName = '',
  businessDescription = '',
  country = '',
  topCollections = [],
  topCollectionsTitle = 'Top Collections',
  topPicksProducts = [],
  fashionDepartments = null,
  editorialSpotlight = null,
}) {
  const config = getFashionEditorialConfig(settings, businessDomain);
  const storeBase = `/store/${businessDomain}`;
  const productsUrl = `${storeBase}/products`;
  const catalogPool = products.length
    ? products
    : fashionDepartments?.offers?.catalogPool
      || fashionDepartments?.newArrivals?.catalogPool
      || topPicksProducts;
  const displayName = formatFashionStoreName(storeName);
  const featuredTitle = config.featuredRailTitle || 'Top picks for you';
  const featuredSubtitle = config.featuredRailSubtitle || `Curated styles from ${displayName}`;
  const trustPillars = config.showTrustStrip ? resolveFashionTrustPillars(settings, businessDomain) : [];
  const brands = config.showBrandsRow
    ? resolveFashionBrands(settings, catalogPool, businessDomain)
    : [];
  const promoBanners = config.showPromoBanners
    ? resolveFashionPromoBanners(settings, catalogPool, businessCategory, businessDomain)
    : [];

  return (
    <>
      {config.showTrustStrip && trustPillars.length > 0 && (
        <StoreReveal enabled={config.animations}>
          <FashionTrustStrip pillars={trustPillars} accent={accent} />
        </StoreReveal>
      )}

      {config.showTopCollections && topCollections.length > 0 && (
        <StoreReveal enabled={config.animations}>
          <TopCollectionsCarousel
            title={topCollectionsTitle}
            items={topCollections}
            autoScroll={config.animations !== false}
          />
        </StoreReveal>
      )}

      {config.showTopPicks && topPicksProducts.length >= 2 && (
        <StoreReveal enabled={config.animations}>
          <TopPicksSection
            products={topPicksProducts}
            businessDomain={businessDomain}
            businessCategory={businessCategory}
            autoScroll={config.animations}
            accent={accent}
            title={featuredTitle}
            subtitle={featuredSubtitle}
          />
        </StoreReveal>
      )}

      {promoBanners.length > 0 && (
        <StoreReveal enabled={config.animations}>
          <section className="bg-stone-100/60 py-8 sm:py-10">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
              <div className="grid gap-4 sm:grid-cols-2">
                {promoBanners.map((banner, bannerIndex) => {
                  const isDark = banner.tone === 'dark' || banner.tone === 'walnut';
                  const imageSrc = resolveSpotlightBannerImage(banner, businessCategory, bannerIndex);
                  return (
                    <Link
                      key={banner.id}
                      href={`${productsUrl}${banner.href || ''}`}
                      className={cn(
                        'group relative flex min-h-[148px] items-end overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md sm:min-h-[188px] sm:p-6',
                        isDark ? 'border-stone-800/30 bg-stone-950' : 'border-stone-200 bg-white'
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
                          isDark
                            ? 'bg-gradient-to-t from-stone-950/92 via-stone-900/55 to-stone-800/18'
                            : 'bg-gradient-to-t from-white/95 via-white/82 to-white/35'
                        )}
                        aria-hidden
                      />
                      <div className="relative z-10 max-w-[85%]">
                        <h3 className={cn('text-lg font-semibold sm:text-xl', isDark ? 'text-white' : 'text-stone-900')}>
                          {banner.title}
                        </h3>
                        <p className={cn('mt-1 text-sm leading-snug', isDark ? 'text-stone-100/90' : 'text-stone-600')}>
                          {banner.subtitle}
                        </p>
                        <span
                          className={cn(
                            'mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-[gap] group-hover:gap-2',
                            isDark ? 'text-stone-100' : 'text-stone-800'
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
        </StoreReveal>
      )}

      {fashionDepartments && (
        <FashionDepartmentSections
          sections={fashionDepartments}
          businessDomain={businessDomain}
          editorialSpotlight={config.showEditorialSpotlight ? editorialSpotlight : null}
          accent={accent}
          accentDark={accentDark}
          canonical={canonical}
          animations={config.animations}
          renderReadyToWear={false}
        />
      )}

      <FashionGulAhmedSections
        businessDomain={businessDomain}
        businessCategory={businessCategory}
        settings={settings}
        animations={config.animations}
      />

      {config.showBrandsRow && brands.length > 0 && (
        <StoreReveal enabled={config.animations}>
          <section className="border-y border-stone-200 bg-white py-10 sm:py-12">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
              <div className="mb-6 text-center sm:mb-8 lg:text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Trusted labels</p>
                <h2 className={cn(STORE_SECTION_HEADING, 'mt-2 text-stone-900')}>Shop by brand</h2>
                <p className="mt-2 text-sm text-stone-600">
                  Premium Pakistani fashion and fabric brands
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
                {brands.map((brand) => (
                  <Link
                    key={brand.id}
                    href={`${productsUrl}?search=${encodeURIComponent(brand.name)}`}
                    className="group relative overflow-hidden rounded-xl border-2 border-stone-200 bg-gradient-to-br from-stone-50 to-white px-5 py-3 text-sm font-semibold text-stone-700 shadow-sm transition-all duration-200 hover:border-stone-300 hover:shadow-md active:scale-95 sm:px-6 sm:py-3.5"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-stone-100 to-stone-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                    <span className="relative">{brand.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </StoreReveal>
      )}

      {fashionDepartments?.readyToWear?.show && fashionDepartments.readyToWear.circles?.length > 0 && (
        <StoreReveal enabled={config.animations}>
          <FashionCircleShowcase
            title={fashionDepartments.readyToWear.title}
            circles={fashionDepartments.readyToWear.circles}
            viewAllHref={fashionDepartments.readyToWear.viewAllHref}
            showDivider
            variant="white"
            animate={config.animations}
            manualScroll
            accent={accent}
          />
        </StoreReveal>
      )}

      <FashionSeoBlock
        storeName={storeName}
        businessCategory={businessCategory}
        businessDescription={businessDescription}
        country={country}
        settings={settings}
        businessDomain={businessDomain}
      />
    </>
  );
}
