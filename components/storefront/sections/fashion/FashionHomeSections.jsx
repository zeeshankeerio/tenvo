'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  resolveFashionSeoBlocks,
} from '@/lib/storefront/fashionEditorial';
import { resolveFashionPromoBanners } from '@/lib/storefront/fashionPromoBanners';
import { FashionPromoBannersSection } from '@/components/storefront/sections/fashion/FashionPromoBannersSection';
import { FashionGulAhmedSections } from '@/components/storefront/sections/fashion/FashionGulAhmedSections';

function FashionSeoBlock({ storeName, businessCategory, businessDescription, country, settings, businessDomain }) {
  const config = getFashionEditorialConfig(settings, businessDomain, businessCategory);
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
  categories = [],
}) {
  const config = getFashionEditorialConfig(settings, businessDomain, businessCategory);
  const storeBase = `/store/${businessDomain}`;
  const productsUrl = `${storeBase}/products`;
  const catalogPool = products.length
    ? products
    : fashionDepartments?.offers?.catalogPool
      || fashionDepartments?.newArrivals?.catalogPool
      || topPicksProducts;
  const displayName = formatFashionStoreName(storeName);
  const featuredTitle = config.featuredRailTitle || 'Top picks for you';
  const featuredSubtitle =
    config.featuredRailSubtitle || `Curated styles from ${displayName}`;
  const trustPillars = config.showTrustStrip
    ? resolveFashionTrustPillars(settings, businessDomain, businessCategory)
    : [];
  const brands = config.showBrandsRow
    ? resolveFashionBrands(settings, catalogPool, businessDomain, categories, businessCategory)
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
          <FashionPromoBannersSection
            banners={promoBanners}
            businessDomain={businessDomain}
            businessCategory={businessCategory}
            productsUrl={productsUrl}
          />
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
        categories={categories}
        products={catalogPool}
      />

      {config.showBrandsRow && brands.length > 0 && (
        <StoreReveal enabled={config.animations}>
          <section className="border-y border-stone-200 bg-white py-5 sm:py-6">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="shrink-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Trusted labels
                  </p>
                  <h2 className={cn(STORE_SECTION_HEADING, 'mt-1 text-base text-stone-900 sm:text-lg')}>
                    Shop by brand
                  </h2>
                </div>
                <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
                  <div className="flex flex-nowrap items-center gap-2 pb-0.5 sm:justify-end">
                    {brands.map((brand) => (
                      <Link
                        key={brand.id}
                        href={`${productsUrl}?search=${encodeURIComponent(brand.name)}`}
                        className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-stone-200 bg-stone-50/80 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-stone-300 hover:bg-white hover:text-stone-900 sm:px-3.5 sm:py-2 sm:text-[13px]"
                      >
                        {brand.name}
                      </Link>
                    ))}
                  </div>
                </div>
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
