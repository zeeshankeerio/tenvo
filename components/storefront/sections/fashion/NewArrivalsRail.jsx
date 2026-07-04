'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { StoreMarqueeRow } from '@/components/storefront/sections/shared/StoreMarqueeRow';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { formatCurrency } from '@/lib/currency';
import { FashionSectionHeader } from './FashionSectionHeader';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import {
  STORE_PRODUCT_RAIL_ITEM_CLASS,
  ensureRailProducts,
  resolveRailProductId,
} from '@/lib/utils/storefrontProductRail';

function QuickAddButton({ product }) {
  const [loading, setLoading] = useState(false);
  const { addItem } = useCart();
  const { businessId } = useStorefront();
  const outOfStock = product.stock != null && product.stock <= 0;

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    setLoading(true);
    try {
      await addItem({
        productId: product.id,
        quantity: 1,
        variantId: product.default_variant_id || null,
        businessId,
      });
      toast.success('Added to cart', { icon: '🛒' });
      window.dispatchEvent(new Event('toggle-cart'));
    } catch (err) {
      toast.error(err.message || 'Could not add to cart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || outOfStock}
      className="absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-800 shadow-sm transition hover:scale-105 disabled:opacity-50"
      aria-label="Quick add to cart"
    >
      <ShoppingBag className="h-4 w-4" />
    </button>
  );
}

function getDiscountPercent(product) {
  const price = Number(product.price) || 0;
  const compare = Number(product.compare_price) || 0;
  if (compare > price && price > 0) {
    return Math.round(((compare - price) / compare) * 100);
  }
  return 0;
}

function NewArrivalCard({ product, businessDomain, businessCategory, currency, variant }) {
  const image = getEffectiveProductImageUrl(product, businessCategory);
  const href = `/store/${businessDomain}/products/${product.slug || product.id}`;
  const discount = getDiscountPercent(product);
  const onSale = discount > 0;

  return (
    <article data-new-arrival-card className={STORE_PRODUCT_RAIL_ITEM_CLASS}>
      <Link href={href} className="group relative block">
        <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
          {image ? (
            <SmartProductImage
              src={image}
              alt={product.name}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
              sizes="180px"
            />
          ) : null}
          {onSale ? (
            <span className="absolute left-2 top-2 z-10 rounded-sm bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              -{discount}%
            </span>
          ) : variant === 'offers' ? (
            <span className="absolute left-2 top-2 z-10 rounded-sm bg-stone-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              Sale
            </span>
          ) : null}
          <QuickAddButton product={product} />
        </div>
      </Link>
      <Link href={href} className="mt-2 block">
        <p className="line-clamp-2 text-xs text-stone-800 underline-offset-2 hover:underline sm:text-sm">
          {product.name}
        </p>
      </Link>
      <div className="mt-1 flex items-baseline gap-2">
        <p className={cn('text-sm font-bold', onSale ? 'text-rose-600' : 'text-stone-900')}>
          {formatCurrency(product.price, currency)}
        </p>
        {onSale ? (
          <p className="text-xs text-stone-400 line-through">
            {formatCurrency(product.compare_price, currency)}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/**
 * Zellbury-style horizontal product rail with quick add. Seamless marquee loop
 * when animated; manual scroll with arrows when motion is reduced or disabled.
 */
export function NewArrivalsRail({
  title = 'NEW ARRIVALS',
  products = [],
  catalogPool,
  businessDomain,
  viewAllHref,
  animate = true,
  variant = 'default',
  accent = '#1c1917',
}) {
  const trackRef = useRef(null);
  const { currency, business } = useStorefront();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const railProducts = useMemo(
    () => ensureRailProducts(products, catalogPool ?? products, 6, 12),
    [products, catalogPool]
  );

  const useMarquee = animate && railProducts.length >= 4;

  const updateScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    if (useMarquee) return undefined;
    updateScroll();
    const el = trackRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    return () => {
      el.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, [railProducts, updateScroll, useMarquee]);

  const scrollByDir = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('[data-new-arrival-card]');
    const step = card ? card.clientWidth + 12 : 220;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  if (railProducts.length < 2) return null;

  const renderCard = (product) => (
    <NewArrivalCard
      product={product}
      businessDomain={businessDomain}
      businessCategory={business?.category}
      currency={currency}
      variant={variant}
    />
  );

  return (
    <section className="border-t border-stone-200 bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <FashionSectionHeader title={title} viewAllHref={viewAllHref} accent={accent} dense />

        <div className="relative min-w-0">
          {!useMarquee && canScrollLeft ? (
            <button
              type="button"
              onClick={() => scrollByDir(-1)}
              className="absolute -left-2 top-[38%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-800 shadow-md backdrop-blur transition hover:text-stone-950 sm:flex"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          {!useMarquee && canScrollRight ? (
            <button
              type="button"
              onClick={() => scrollByDir(1)}
              className="absolute -right-2 top-[38%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-800 shadow-md backdrop-blur transition hover:text-stone-950 sm:flex"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}

          {useMarquee ? (
            <StoreMarqueeRow
              items={railProducts}
              enabled={animate}
              fadeFrom="white"
              durationSec={44}
              gapClassName="gap-3 pr-3 sm:gap-4 sm:pr-4"
              renderItem={(product) => renderCard(product)}
            />
          ) : (
            <div
              ref={trackRef}
              className={cn(
                'flex gap-3 overflow-x-auto pb-1 sm:gap-4',
                '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                animate && 'sf-stagger'
              )}
            >
              {railProducts.map((product) => (
                <div key={resolveRailProductId(product)}>{renderCard(product)}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
