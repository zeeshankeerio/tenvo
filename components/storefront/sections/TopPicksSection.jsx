'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { StoreMarqueeRow } from '@/components/storefront/sections/shared/StoreMarqueeRow';
import { useWishlist } from '@/lib/hooks/storefront/useWishlist';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getEffectiveProductImageUrl, getFallbackProductImageUrl } from '@/lib/storefront/productImageFallback';
import { formatCurrency } from '@/lib/currency';
import {
  getTopPickMetaLine,
  getTopPickDiscountPercent,
  getTopPickStatusBadge,
  TOP_PICKS_COPY,
} from '@/lib/storefront/topPicks';
import { cn } from '@/lib/utils';

function TopPickProductCard({ product, businessDomain, businessCategory }) {
  const { currency } = useStorefront();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const inWishlist = isInWishlist(product.id);
  const image = getEffectiveProductImageUrl(product, businessCategory);
  const imageFallback =
    product?.image_url?.trim()
      ? getFallbackProductImageUrl(product, businessCategory, product.category_name || product.category)
      : undefined;
  const href = `/store/${businessDomain}/products/${product.slug || product.id}`;
  const discount = getTopPickDiscountPercent(product);
  const statusBadge = getTopPickStatusBadge(product);
  const metaLine = getTopPickMetaLine(product);

  return (
    <article className="group flex w-[152px] shrink-0 flex-col sm:w-[172px] md:w-[188px]">
      <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
        <Link href={href} className="absolute inset-0">
          {image ? (
            <SmartProductImage
              src={image}
              alt={product.name}
              fill
              fallbackSrc={imageFallback && imageFallback !== image ? imageFallback : undefined}
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
              sizes="188px"
            />
          ) : null}
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product);
          }}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white"
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={cn('h-4 w-4', inWishlist ? 'fill-red-500 text-red-500' : 'text-stone-700')} />
        </button>
      </div>

      <div className="mt-3 space-y-1.5 px-0.5">
        <p className="truncate text-[11px] text-stone-500">{metaLine}</p>
        <Link href={href}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-stone-900 transition hover:text-stone-600">
            {product.name}
          </h3>
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {discount > 0 && (
            <span className="text-xs text-stone-400 line-through">
              {formatCurrency(product.compare_price, currency)}
            </span>
          )}
          <span className="text-sm font-bold text-stone-900">
            {formatCurrency(product.price, currency)}
          </span>
        </div>
        {(discount > 0 || statusBadge) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {discount > 0 && (
              <span className="rounded-sm bg-[#e85d04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {discount}% OFF
              </span>
            )}
            {statusBadge && (
              <span className="rounded-sm bg-[#fce7f3] px-2 py-0.5 text-[10px] font-semibold text-[#9d174d]">
                {statusBadge}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function FeaturedEditorialTile({ product, businessDomain, businessCategory, className }) {
  const image = getEffectiveProductImageUrl(product, businessCategory);
  const imageFallback =
    product?.image_url?.trim()
      ? getFallbackProductImageUrl(product, businessCategory, product.category_name || product.category)
      : undefined;
  const href = `/store/${businessDomain}/products/${product.slug || product.id}`;

  return (
    <Link
      href={href}
      className={cn('group relative block overflow-hidden bg-stone-100', className)}
    >
      {image ? (
        <SmartProductImage
          src={image}
          alt={product.name}
          fill
          fallbackSrc={imageFallback && imageFallback !== image ? imageFallback : undefined}
          className="object-cover transition duration-700 group-hover:scale-[1.02]"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}

/**
 * Khaadi / Zellbury-style "Top Picks for You", editorial 3-up + product carousel.
 */
export function TopPicksSection({
  products = [],
  businessDomain,
  businessCategory,
  title = TOP_PICKS_COPY.title,
  subtitle = TOP_PICKS_COPY.subtitle,
  autoScroll = true,
  accent = '#1c1917',
}) {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const featuredThree = products.slice(0, 3);
  const carouselProducts = products.slice(0, 12);
  const useMarquee = autoScroll && carouselProducts.length >= 4;

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    if (useMarquee) return undefined;
    updateScrollState();
    const el = trackRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [products, updateScrollState, useMarquee]);

  const scrollByDir = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('[data-top-pick-card]');
    const step = card ? card.clientWidth + 16 : 200;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  if (carouselProducts.length < 2) return null;

  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-center text-center sm:mb-10">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-[1.75rem]">
            {title}
          </h2>
          <span
            className="mt-3 block h-[3px] w-10 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-stone-500 sm:text-base">
            {subtitle}
          </p>
        </div>

        {featuredThree.length >= 3 && (
          <div className="mb-3 grid grid-cols-1 gap-[3px] sm:mb-4 sm:grid-cols-3">
            <FeaturedEditorialTile
              product={featuredThree[0]}
              businessDomain={businessDomain}
              businessCategory={businessCategory}
              className="aspect-[4/5] sm:aspect-[3/4]"
            />
            <FeaturedEditorialTile
              product={featuredThree[1]}
              businessDomain={businessDomain}
              businessCategory={businessCategory}
              className="aspect-[4/5] sm:aspect-[3/4]"
            />
            <FeaturedEditorialTile
              product={featuredThree[2]}
              businessDomain={businessDomain}
              businessCategory={businessCategory}
              className="aspect-[4/5] sm:aspect-[3/4]"
            />
          </div>
        )}

        <div className="relative">
          {!useMarquee && canScrollLeft ? (
            <button
              type="button"
              onClick={() => scrollByDir(-1)}
              className="absolute -left-1 top-[38%] z-20 hidden -translate-y-1/2 p-2 text-stone-800 transition hover:opacity-70 sm:block"
              aria-label="Previous picks"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={1.25} />
            </button>
          ) : null}
          {!useMarquee && canScrollRight ? (
            <button
              type="button"
              onClick={() => scrollByDir(1)}
              className="absolute -right-1 top-[38%] z-20 hidden -translate-y-1/2 p-2 text-stone-800 transition hover:opacity-70 sm:block"
              aria-label="Next picks"
            >
              <ChevronRight className="h-6 w-6" strokeWidth={1.25} />
            </button>
          ) : null}

          {useMarquee ? (
            <StoreMarqueeRow
              items={carouselProducts}
              enabled={autoScroll}
              fadeFrom="white"
              durationSec={42}
              gapClassName="gap-4 pr-4"
              renderItem={(product) => (
                <div data-top-pick-card>
                  <TopPickProductCard
                    product={product}
                    businessDomain={businessDomain}
                    businessCategory={businessCategory}
                  />
                </div>
              )}
            />
          ) : (
          <div
            ref={trackRef}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {carouselProducts.map((product) => (
              <div key={product.id} data-top-pick-card style={{ scrollSnapAlign: 'start' }}>
                <TopPickProductCard
                  product={product}
                  businessDomain={businessDomain}
                  businessCategory={businessCategory}
                />
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </section>
  );
}
