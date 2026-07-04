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
import { RESTAURANT_MENU_THEME } from '@/lib/storefront/restaurantMenu';
import { toast } from 'react-hot-toast';

/**
 * Light-theme menu card — image, name, price, quick add.
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
  const onSale = comparePrice && Number(comparePrice) > Number(product.price);
  const ctaColor = accent || RESTAURANT_MENU_THEME.cartCta;

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
        'group relative overflow-hidden rounded-lg border border-zinc-200 bg-white',
        'shadow-sm motion-safe:transition motion-safe:duration-200',
        'motion-safe:hover:border-zinc-300 motion-safe:hover:shadow-md',
        isOutOfStock && 'opacity-55',
        className
      )}
    >
      <Link href={productHref} className="relative block aspect-square overflow-hidden bg-zinc-100">
        {imageUrl ? (
          <SmartProductImage
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-100">
            <Package className="h-8 w-8 text-zinc-300" aria-hidden />
          </div>
        )}
      </Link>

      <div className="border-t border-zinc-100 p-2 sm:p-2.5">
        <Link href={productHref}>
          <h3 className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-snug text-zinc-900 sm:text-[13px]">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1 flex items-center justify-between gap-1">
          <div className="min-w-0">
            <span className="text-sm font-semibold tabular-nums text-zinc-900">
              {formatCurrency(product.price, currency)}
            </span>
            {onSale ? (
              <span className="ml-1 text-[10px] text-zinc-400 line-through tabular-nums">
                {formatCurrency(comparePrice, currency)}
              </span>
            ) : null}
          </div>
          {!isOutOfStock ? (
            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm motion-safe:transition motion-safe:hover:scale-105 active:scale-95 disabled:opacity-60 sm:h-8 sm:w-8"
              style={{ backgroundColor: ctaColor }}
              aria-label={`Add ${product.name} to cart`}
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </button>
          ) : (
            <span className="text-[10px] font-medium text-zinc-400">Sold out</span>
          )}
        </div>
      </div>
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
  const ctaColor = accent || RESTAURANT_MENU_THEME.cartCta;

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
    <div className="flex gap-2.5 rounded-lg border border-zinc-200 bg-white p-2 motion-safe:transition hover:border-zinc-300 hover:shadow-sm sm:gap-3 sm:p-2.5">
      <Link href={productHref} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-100 sm:h-[72px] sm:w-[72px]">
        {imageUrl ? (
          <SmartProductImage src={imageUrl} alt={product.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-5 w-5 text-zinc-300" />
          </div>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          {product.category_name ? (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              {product.category_name}
            </p>
          ) : null}
          <Link href={productHref}>
            <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900">{product.name}</h3>
          </Link>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold tabular-nums text-zinc-900">
            {formatCurrency(product.price, currency)}
          </span>
          {!isOutOfStock ? (
            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: ctaColor }}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add
            </button>
          ) : (
            <span className="text-xs text-zinc-400">Unavailable</span>
          )}
        </div>
      </div>
    </div>
  );
}
