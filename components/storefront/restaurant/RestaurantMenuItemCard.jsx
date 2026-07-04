'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Package } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { catalogProductNeedsVariantPage } from '@/lib/storefront/storefrontProductVariants';
import { toast } from 'react-hot-toast';

/**
 * Photo-forward menu card — name and price overlay on dish image (grid view).
 */
export function RestaurantMenuItemCard({ product, businessDomain, accent, className }) {
  const [isAdding, setIsAdding] = useState(false);
  const { addItem } = useCart();
  const { currency, business, businessId } = useStorefront();
  const imageUrl = getEffectiveProductImageUrl(product, business?.category);
  const isOutOfStock =
    product.stock !== null && product.stock !== undefined && Number(product.stock) <= 0;
  const productHref = `/store/${businessDomain}/products/${product.slug || product.id}`;
  const needsVariantPage = catalogProductNeedsVariantPage(product);
  const comparePrice = product.compare_price ?? product.compare_at_price;
  const onSale =
    comparePrice && Number(comparePrice) > Number(product.price);

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    if (needsVariantPage) {
      window.location.href = productHref;
      return;
    }
    setIsAdding(true);
    try {
      await addItem({ productId: product.id, quantity: 1, variantId: null, businessId });
      toast.success('Added to cart');
      window.dispatchEvent(new Event('toggle-cart'));
    } catch (err) {
      const message = err.message || 'Could not add item';
      if (/variant|options|size/i.test(message)) {
        window.location.href = productHref;
        return;
      }
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900',
        'shadow-lg shadow-black/20 motion-safe:transition motion-safe:duration-300',
        'motion-safe:hover:border-neutral-600 motion-safe:hover:shadow-xl motion-safe:hover:shadow-black/35',
        'motion-safe:hover:-translate-y-0.5',
        isOutOfStock && 'opacity-60',
        className
      )}
    >
      <Link href={productHref} className="relative block aspect-[4/3] sm:aspect-[5/4]">
        {imageUrl ? (
          <SmartProductImage
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-800">
            <Package className="h-10 w-10 text-neutral-600" aria-hidden />
          </div>
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white sm:text-base">
            {product.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold tabular-nums text-white sm:text-base">
              {formatCurrency(product.price, currency)}
            </span>
            {onSale ? (
              <span className="text-xs text-neutral-400 line-through tabular-nums">
                {formatCurrency(comparePrice, currency)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      {!isOutOfStock ? (
        <button
          type="button"
          onClick={handleAdd}
          disabled={isAdding}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-white shadow-lg motion-safe:transition motion-safe:duration-200 motion-safe:hover:scale-110 active:scale-95 disabled:opacity-60"
          style={{ backgroundColor: accent || '#22c55e' }}
          aria-label={`Add ${product.name} to cart`}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        </button>
      ) : (
        <span className="absolute right-2 top-2 rounded-full bg-neutral-800 px-2 py-1 text-[10px] font-semibold text-neutral-400">
          Sold out
        </span>
      )}
    </article>
  );
}

/**
 * Compact list row for menu list view.
 */
export function RestaurantMenuListItem({ product, businessDomain, accent }) {
  const [isAdding, setIsAdding] = useState(false);
  const { addItem } = useCart();
  const { currency, business, businessId } = useStorefront();
  const imageUrl = getEffectiveProductImageUrl(product, business?.category);
  const isOutOfStock =
    product.stock !== null && product.stock !== undefined && Number(product.stock) <= 0;
  const productHref = `/store/${businessDomain}/products/${product.slug || product.id}`;
  const needsVariantPage = catalogProductNeedsVariantPage(product);

  const handleAdd = async () => {
    if (isOutOfStock) return;
    if (needsVariantPage) {
      window.location.href = productHref;
      return;
    }
    setIsAdding(true);
    try {
      await addItem({ productId: product.id, quantity: 1, variantId: null, businessId });
      toast.success('Added to cart');
      window.dispatchEvent(new Event('toggle-cart'));
    } catch (err) {
      toast.error(err.message || 'Could not add item');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex gap-3 rounded-2xl border border-neutral-800 bg-[#141414] p-3 motion-safe:transition motion-safe:duration-300 motion-safe:hover:border-neutral-600 motion-safe:hover:bg-[#181818]">
      <Link href={productHref} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-24">
        {imageUrl ? (
          <SmartProductImage src={imageUrl} alt={product.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-800">
            <Package className="h-6 w-6 text-neutral-600" />
          </div>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          {product.category_name ? (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              {product.category_name}
            </p>
          ) : null}
          <Link href={productHref}>
            <h3 className="line-clamp-2 text-sm font-semibold text-white sm:text-base">{product.name}</h3>
          </Link>
          {product.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{product.description}</p>
          ) : null}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-base font-semibold tabular-nums text-white">
            {formatCurrency(product.price, currency)}
          </span>
          {!isOutOfStock ? (
            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: accent || '#22c55e' }}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add
            </button>
          ) : (
            <span className="text-xs text-neutral-500">Unavailable</span>
          )}
        </div>
      </div>
    </div>
  );
}
