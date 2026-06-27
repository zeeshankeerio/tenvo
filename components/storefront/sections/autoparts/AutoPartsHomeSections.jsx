'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, ArrowRight, ArrowUpRight,
  Truck, Banknote, Factory, ShieldCheck, Sparkles,
} from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
  AUTO_PARTS_PROMO_CARDS,
  AUTO_PARTS_FEATURED_CATEGORIES,
  AUTO_PARTS_VEHICLE_BRANDS,
  AUTO_PARTS_SHOP_BRANDS,
  AUTO_PARTS_TRENDING_TABS,
  AUTO_PARTS_CATEGORY_RAILS,
  getAutoPartsConfig,
  partitionAutoPartsCatalog,
  buildAutoPartsDealCards,
} from '@/lib/storefront/autoParts';
import { buildPartsProductsUrl } from '@/lib/storefront/partsFinder';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import {
  resolveAutoPartsPromoFallback,
  resolveBrandMonogramUrl,
  resolveAutomotiveTileImage,
} from '@/lib/storefront/storefrontImagePlaceholders';

const TRUST_ICONS = {
  delivery: Truck,
  cod: Banknote,
  sourcing: Factory,
  quality: ShieldCheck,
};

function SectionTitle({ title, subtitle, href, linkLabel = 'View all', accent }) {
  const accentColor = accent || '#cd232a';
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <div className="mb-2 h-1 w-14 rounded-full" style={{ backgroundColor: accentColor }} />
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-neutral-500">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="hidden shrink-0 items-center gap-1 text-sm font-semibold sm:inline-flex"
          style={{ color: accentColor }}
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function HorizontalScroll({ children, className }) {
  const trackRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [children, update]);

  const scroll = (dir) => trackRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });

  return (
    <div className={cn('relative', className)}>
      <div className="mb-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={!canLeft}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white disabled:opacity-30"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={!canRight}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white disabled:opacity-30"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div ref={trackRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {children}
      </div>
    </div>
  );
}

function PromoCard({ card, href, accent }) {
  return (
    <Link
      href={href}
      className="w-[220px] shrink-0 snap-start overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="px-3.5 pb-2 pt-3.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-900">{card.title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-neutral-500">{card.description}</p>
      </div>
      <div className="relative h-[140px] bg-neutral-100">
        <SmartProductImage
          src={card.image}
          alt=""
          fill
          className="object-cover"
          fallbackSrc={resolveAutoPartsPromoFallback(card.id)}
          placeholderLabel={card.title}
        />
        <div
          className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: accent }}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  );
}

function FeaturedCategoryCard({ cat, href, accent }) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = cat.images?.length ? cat.images : [resolveAutomotiveTileImage(cat.label)];

  useEffect(() => {
    if (images.length < 2) return undefined;
    const t = setInterval(() => setImgIdx((i) => (i + 1) % images.length), 2200);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <Link
      href={href}
      className="group relative aspect-[1.1] overflow-hidden rounded-2xl bg-neutral-900"
    >
      {images.map((src, i) => (
        <div
          key={src}
          className={cn(
            'absolute inset-0 transition-opacity duration-700',
            i === imgIdx ? 'opacity-55' : 'opacity-0'
          )}
        >
          <SmartProductImage
            src={src}
            alt=""
            fill
            className="object-cover"
            fallbackSrc={resolveAutomotiveTileImage(cat.label)}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
      <div
        className="absolute left-0 top-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full"
        style={{ backgroundColor: accent }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <p className="text-lg font-semibold tracking-tight text-white">{cat.label}</p>
        {cat.productCount ? (
          <p className="mt-1 text-xs text-white/55">{cat.productCount}</p>
        ) : null}
        <p className="mt-1 text-xs text-white/60 opacity-0 transition group-hover:opacity-100">
          Shop collection
        </p>
      </div>
    </Link>
  );
}

function DealCard({ deal, currency }) {
  return (
    <Link
      href={deal.href}
      className="group flex min-h-[150px] overflow-hidden rounded-lg"
      style={{ backgroundColor: deal.tone }}
    >
      <div className="flex flex-1 flex-col justify-center p-4">
        <span className="mb-2 inline-block w-fit rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase text-neutral-900">
          {deal.badge}
        </span>
        <p className="text-2xl font-semibold italic leading-none text-white tabular-nums">
          {formatCurrency(deal.price, currency)}
        </p>
        <p className="mt-2 line-clamp-2 text-sm text-white/90">{deal.title}</p>
      </div>
      <div className="relative w-[42%] shrink-0 bg-white/10">
        <SmartProductImage
          src={deal.image}
          alt=""
          fill
          className="object-contain p-2"
          fallbackSrc={resolveAutomotiveTileImage(deal.title)}
          placeholderLabel={deal.title}
        />
      </div>
    </Link>
  );
}

function TrendingProductCard({ product, businessDomain, businessCategory, currency, accent }) {
  const href = `/store/${businessDomain}/products/${product.slug || product.id}`;
  const price = Number(product.display_price ?? product.price ?? 0);
  const compare = Number(product.compare_price) || 0;
  const onSale = compare > price;
  const imageSrc = getEffectiveProductImageUrl(product, businessCategory);
  const badgeColor = accent || '#cd232a';

  return (
    <Link href={href} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
        <SmartProductImage
          src={imageSrc}
          alt={product.name}
          fill
          className="object-cover transition group-hover:scale-105"
          placeholderLabel={product.name}
        />
        {product.is_featured ? (
          <span
            className="absolute left-2 top-2 rounded px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
            style={{ backgroundColor: badgeColor }}
          >
            Featured
          </span>
        ) : null}
        {onSale ? (
          <span
            className="absolute left-2 top-2 rounded px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
            style={{ backgroundColor: badgeColor }}
          >
            Sale
          </span>
        ) : null}
      </div>
      <p className="mt-2.5 line-clamp-2 text-sm text-neutral-800">{product.name}</p>
      <p className="mt-1 text-sm font-bold text-neutral-900 tabular-nums">
        {formatCurrency(price, currency)}
      </p>
    </Link>
  );
}

/**
 * Autostore-inspired homepage sections below the parts-finder hero.
 */
export function AutoPartsHomeSections({
  businessDomain,
  businessCategory = 'auto-parts',
  products = [],
  currency = 'PKR',
  accent = '#cd232a',
  base,
  settings = {},
}) {
  const storeBase = base || `/store/${businessDomain}`;
  const productsUrl = `${storeBase}/products`;
  const cfg = getAutoPartsConfig(settings);
  const parts = useMemo(() => partitionAutoPartsCatalog(products), [products]);
  const dealCards = useMemo(
    () => buildAutoPartsDealCards(products, storeBase),
    [products, storeBase]
  );

  const [trendTab, setTrendTab] = useState('all');
  const trendProducts = useMemo(() => {
    const tab = AUTO_PARTS_TRENDING_TABS.find((t) => t.id === trendTab);
    if (!tab?.slug && !tab?.filterSlug) {
      return parts.trending.length ? parts.trending : products.slice(0, 8);
    }
    const slug = tab.filterSlug || tab.slug;
    return products.filter((p) =>
      String(p.category || '').toLowerCase().replace(/\s+/g, '-').includes(slug)
    );
  }, [trendTab, parts.trending, products]);

  return (
    <>
      {cfg.showPromoCards ? (
        <section className="relative z-10 -mt-10 bg-transparent pb-6 sm:-mt-16">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <HorizontalScroll>
              {AUTO_PARTS_PROMO_CARDS.map((card) => (
                <PromoCard
                  key={card.id}
                  card={card}
                  href={`${productsUrl}${card.hrefSuffix}`}
                  accent={accent}
                />
              ))}
            </HorizontalScroll>
          </div>
        </section>
      ) : null}

      {cfg.showFeaturedCategories ? (
        <section className="bg-white py-10 sm:py-14">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <SectionTitle
              title="Featured categories"
              subtitle="Browse our collection"
              href={productsUrl}
              accent={accent}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
              {AUTO_PARTS_FEATURED_CATEGORIES.map((cat) => (
                <FeaturedCategoryCard
                  key={cat.id}
                  cat={cat}
                  href={`${productsUrl}?category=${encodeURIComponent(cat.slug)}`}
                  accent={accent}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {cfg.showFeaturedDeals && dealCards.length > 0 ? (
        <section className="bg-neutral-50 py-10 sm:py-14">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <SectionTitle
              title="Featured deals"
              href={`${productsUrl}?onSale=true`}
              accent={accent}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dealCards.map((deal) => (
                <DealCard key={deal.id} deal={deal} currency={currency} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {cfg.showVehicleBrands ? (
        <section className="border-b border-neutral-100 bg-white py-10">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <SectionTitle title="Shop by car brand" href={productsUrl} accent={accent} />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {AUTO_PARTS_VEHICLE_BRANDS.map((brand) => {
                const href = brand.isAll
                  ? productsUrl
                  : buildPartsProductsUrl(productsUrl, { brand: brand.name });
                return (
                  <Link
                    key={brand.id}
                    href={href}
                    className="flex flex-col items-center rounded-lg border border-neutral-200 px-2 py-4 transition hover:border-neutral-300 hover:shadow-sm"
                  >
                    {brand.isAll ? (
                      <div
                        className="mb-2 flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white"
                        style={{ backgroundColor: accent }}
                      >
                        <Sparkles className="h-6 w-6" />
                      </div>
                    ) : (
                      <div className="relative mb-2 h-14 w-full">
                        <SmartProductImage
                          src={brand.image}
                          alt={brand.name}
                          fill
                          className="object-contain"
                          fallbackSrc={resolveBrandMonogramUrl(brand.name)}
                          placeholderLabel={brand.name}
                        />
                      </div>
                    )}
                    <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-neutral-800 sm:text-xs">
                      {brand.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-b border-neutral-100 bg-neutral-50 py-8">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Shop by parts brand
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {AUTO_PARTS_SHOP_BRANDS.map((name) => (
              <Link
                key={name}
                href={`${productsUrl}?search=${encodeURIComponent(name)}`}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-400"
              >
                {name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {cfg.showTrending ? (
        <section className="bg-neutral-50 py-10 sm:py-14">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mb-6 rounded-xl border border-neutral-200 bg-white px-6 py-6 text-center shadow-sm sm:py-8">
              <h2 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
                Top trending
              </h2>
              <p className="mt-1 text-sm text-neutral-500">Best sellers and featured picks from our catalog</p>
            </div>
            <div className="mb-6 flex flex-wrap gap-2">
              {AUTO_PARTS_TRENDING_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTrendTab(tab.id)}
                  className={cn(
                    'rounded-full border-2 px-4 py-1.5 text-xs font-semibold transition',
                    trendTab === tab.id
                      ? 'border-transparent text-white shadow-sm'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                  )}
                  style={
                    trendTab === tab.id
                      ? { backgroundColor: accent, borderColor: accent }
                      : undefined
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {trendProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {trendProducts.slice(0, 8).map((p) => (
                  <TrendingProductCard
                    key={p.id}
                    product={p}
                    businessDomain={businessDomain}
                    businessCategory={businessCategory}
                    currency={currency}
                    accent={accent}
                  />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-neutral-500">No products in this category yet.</p>
            )}
          </div>
        </section>
      ) : null}

      {cfg.showCategoryRails ? (
        <>
          {AUTO_PARTS_CATEGORY_RAILS.map((rail) => {
            const pool = parts[rail.id] || [];
            const list = pool.length ? pool : products.filter((p) =>
              String(p.category || '').toLowerCase().includes(rail.slug)
            );
            if (list.length < 2) return null;
            return (
              <section key={rail.id} className="border-t border-neutral-100 bg-white py-10">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
                  <SectionTitle
                    title={rail.title}
                    subtitle={rail.subtitle}
                    href={`${productsUrl}?category=${encodeURIComponent(rail.slug)}`}
                    accent={accent}
                  />
                  <ProductGrid
                    products={list.slice(0, 10)}
                    catalogPool={products}
                    businessDomain={businessDomain}
                    showResultsCount={false}
                    density="showcase"
                    layout="rail"
                  />
                </div>
              </section>
            );
          })}
        </>
      ) : null}

      {cfg.showTrustSection ? (
        <section className="border-y border-neutral-100 bg-white py-10 sm:py-12">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <h2 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
                {cfg.trustTitle}
              </h2>
              {cfg.trustSubtitle ? (
                <p className="mt-1 text-sm text-neutral-500">{cfg.trustSubtitle}</p>
              ) : null}
            </div>
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {cfg.trustStats.map((stat, i) => (
                <div
                  key={stat.label || i}
                  className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-4 text-center sm:px-4 sm:py-5"
                >
                  <p className="text-2xl font-semibold tabular-nums text-neutral-900 sm:text-3xl" style={{ color: accent }}>
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-neutral-800 sm:text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {cfg.trustFeatures.map((feat) => {
                const Icon = TRUST_ICONS[feat.id] || ShieldCheck;
                return (
                  <div
                    key={feat.id}
                    className="flex gap-3 rounded-xl border border-neutral-100 bg-white p-4 shadow-sm transition hover:border-neutral-200 hover:shadow-md"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${accent}14`, color: accent }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">{feat.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-500">{feat.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {cfg.showBottomCta ? (
      <section
        className="py-14 text-center sm:py-16"
        style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 50%, #1a1a1a 100%)` }}
      >
        <div className="mx-auto max-w-xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {cfg.ctaTitle}
          </h2>
          <p className="mt-3 text-sm text-white/90 sm:text-base">{cfg.ctaSubtitle}</p>
          <Link
            href={productsUrl}
            className="mt-6 inline-block rounded-full bg-white px-10 py-3.5 text-sm font-semibold tracking-wide text-neutral-900 transition hover:bg-neutral-100"
          >
            {cfg.ctaLabel}
          </Link>
        </div>
      </section>
      ) : null}
    </>
  );
}
