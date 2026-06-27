'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import {
  STORE_PRODUCT_RAIL_TRACK_CLASS,
  STORE_PRODUCT_RAIL_ITEM_CLASS,
  ensureRailProducts,
  resolveRailProductId,
} from '@/lib/utils/storefrontProductRail';

function QuickAddButton({ product, accent }) {
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

/**
 * Zellbury-style New Arrivals, vertical label + horizontal product rail with quick add.
 */
export function NewArrivalsRail({
  title = 'NEW ARRIVALS',
  products = [],
  catalogPool,
  businessDomain,
  viewAllHref,
}) {
  const trackRef = useRef(null);
  const { currency, settings, business } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const railProducts = useMemo(
    () => ensureRailProducts(products, catalogPool ?? products, 6, 12),
    [products, catalogPool]
  );

  const updateScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    updateScroll();
    const el = trackRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    return () => {
      el.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, [railProducts, updateScroll]);

  const scrollByDir = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('[data-new-arrival-card]');
    const step = card ? card.clientWidth + 12 : 220;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  if (railProducts.length < 2) return null;

  return (
    <section className="border-t border-stone-200 bg-white py-8 sm:py-10">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col items-center gap-3 sm:mb-7">
          <h2 className="text-center text-lg font-semibold uppercase tracking-[0.18em] text-stone-900 sm:text-xl">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {viewAllHref ? (
              <Link
                href={viewAllHref}
                className="mr-1 text-xs font-semibold uppercase tracking-wide text-stone-500 transition hover:text-stone-800"
              >
                View all
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => scrollByDir(-1)}
              disabled={!canScrollLeft}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-white transition hover:opacity-90 disabled:opacity-30"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByDir(1)}
              disabled={!canScrollRight}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-white transition hover:opacity-90 disabled:opacity-30"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative min-w-0">
          <div
            ref={trackRef}
            className={STORE_PRODUCT_RAIL_TRACK_CLASS}
          >
              {railProducts.map((product) => {
                const image = getEffectiveProductImageUrl(product, business?.category);
                const href = `/store/${businessDomain}/products/${product.slug || product.id}`;
                return (
                  <article
                    key={resolveRailProductId(product)}
                    data-new-arrival-card
                    className={STORE_PRODUCT_RAIL_ITEM_CLASS}
                  >
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
                        <QuickAddButton product={product} accent={accent} />
                      </div>
                    </Link>
                    <Link href={href} className="mt-2 block">
                      <p className="line-clamp-2 text-xs text-stone-800 underline-offset-2 hover:underline sm:text-sm">
                        {product.name}
                      </p>
                    </Link>
                    <p className="mt-1 text-sm font-bold text-stone-900">
                      {formatCurrency(product.price, currency)}
                    </p>
                  </article>
                );
              })}
          </div>
        </div>
      </div>
    </section>
  );
}
