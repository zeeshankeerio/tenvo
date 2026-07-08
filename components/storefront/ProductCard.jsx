'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { Heart, ShoppingBag, Eye, Star, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { useWishlist } from '@/lib/hooks/storefront/useWishlist';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { getEffectiveProductImageUrl, getFallbackProductImageUrl } from '@/lib/storefront/productImageFallback';
import { isAutoPartsFinderStore } from '@/lib/storefront/partsFinder';
import { isFashionEditorialStore } from '@/lib/storefront/fashionEditorial';
import { isFitnessElevatedStore } from '@/lib/storefront/fitnessStorefront';
import { isPharmacyElevatedStore } from '@/lib/storefront/pharmacyStorefront';
import { isPrescriptionRequiredProduct, buildPharmacyPrescriptionContactHref } from '@/lib/storefront/pharmacyProducts';
import { PharmacyPrescriptionCta } from '@/components/storefront/pharmacy/PharmacyPrescriptionCta';
import { getStorefrontStockState } from '@/lib/storefront/storefrontStockUi';
import { isStorefrontProductUuid } from '@/lib/utils/storefrontProductRef';
import { resolveStorefrontProductBrowseHref } from '@/lib/storefront/storefrontPurchasability';
import { resolveSourcingBadge } from '@/lib/storefront/productAttributeChips';
import { catalogProductNeedsVariantPage } from '@/lib/storefront/storefrontProductVariants';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

/**
 * @param {'default' | 'compact' | 'dense'} variant
 *   dense, 6-col showcase grid (Glovida / marketplace style)
 */
export function ProductCard({ product, businessDomain, variant = 'default' }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { currency, settings, business, businessId } = useStorefront();

  const accent = getStoreAccentColor(settings, business?.category);
  const fitnessStore = isFitnessElevatedStore(business?.category);
  const pharmacyStore = isPharmacyElevatedStore(business?.category);
  const requiresPrescription = pharmacyStore && isPrescriptionRequiredProduct(product);
  const displayImage = getEffectiveProductImageUrl(product, business?.category);
  const imageFallback =
    product?.image_url?.trim()
      ? getFallbackProductImageUrl(product, business?.category, product.category_name || product.category)
      : undefined;
  const inWishlist = isInWishlist(product.id);
  const isDense = variant === 'dense';
  const isCompact = variant === 'compact' || isDense;

  const { stock, isOutOfStock, isLowStock } = getStorefrontStockState(product);

  const discount =
    product.compare_price && Number(product.compare_price) > Number(product.price)
      ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
      : 0;

  const categoryLabel = product.category_name || product.category;
  const brandLabel = product.brand?.trim();
  const showPartsMeta = isAutoPartsFinderStore(business?.category);
  const showFashionMeta = isFashionEditorialStore(business?.category);
  const sourcingBadge = showFashionMeta ? resolveSourcingBadge(product.domain_data) : null;
  const partNumber = product.domain_data?.partnumber;
  const fitmentHint = showPartsMeta
    ? [product.domain_data?.vehiclemake, product.domain_data?.vehiclemodel].filter(Boolean).join(' ')
    : '';

  // Preview/seed rows and any non-UUID ref are not real DB products: they can't be
  // added to cart or opened at /products/{slug} (would 404). Route them to a real
  // search results page instead.
  const isPreviewProduct = product.catalog_preview || !isStorefrontProductUuid(product.id);
  const productHref = resolveStorefrontProductBrowseHref(product, businessDomain);
  const needsVariantPage = catalogProductNeedsVariantPage(product);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    if (requiresPrescription) {
      window.location.href = buildPharmacyPrescriptionContactHref(businessDomain, product);
      return;
    }

    if (isPreviewProduct || needsVariantPage) {
      window.location.href = productHref;
      return;
    }

    setIsAdding(true);
    try {
      await addItem({
        productId: product.id,
        quantity: 1,
        variantId: null,
        businessId,
      });
      toast.success('Added to cart', { icon: '🛒' });
      window.dispatchEvent(new Event('toggle-cart'));
    } catch (error) {
      const message = error.message || 'Failed to add to cart';
      if (/select size|select.*options|variant/i.test(message)) {
        window.location.href = productHref;
        return;
      }
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={isDense ? undefined : { y: -3 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden transition-shadow duration-300',
        fitnessStore
          ? 'fitness-product-card rounded-xl border hover:border-rose-500/30 hover:shadow-[0_8px_30px_rgba(225,29,72,0.12)]'
          : isDense
            ? 'rounded-lg border border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
            : 'rounded-xl border border-gray-100 bg-white hover:shadow-xl sm:rounded-2xl',
        variant === 'compact' && !isDense && !fitnessStore && 'p-2 sm:p-3'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          'relative overflow-hidden',
          fitnessStore ? 'bg-zinc-900' : 'bg-slate-50',
          isDense ? 'aspect-square' : isCompact ? 'aspect-square rounded-lg sm:rounded-xl' : 'aspect-square sm:aspect-[4/5]'
        )}
      >
        <Link href={productHref} className="absolute inset-0" tabIndex={-1} aria-label={product.name}>
          {displayImage ? (
            <SmartProductImage
              src={displayImage}
              alt={product.name}
              fill
              fallbackSrc={imageFallback && imageFallback !== displayImage ? imageFallback : undefined}
              className={cn(
                'transition-transform duration-500 group-hover:scale-[1.03]',
                fitnessStore ? 'object-contain p-2' : 'object-cover'
              )}
              sizes={
                isDense
                  ? '(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw'
                  : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'
              }
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-slate-200" />
            </div>
          )}
        </Link>

        <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-1">
          {discount > 0 && (
            <Badge className="border-0 bg-red-600 px-1.5 py-0 text-[10px] font-bold text-white">
              -{discount}%
            </Badge>
          )}
          {product.is_featured && !discount && (
            <Badge className="border-0 bg-slate-900 px-1.5 py-0 text-[10px] font-bold text-white">
              Top pick
            </Badge>
          )}
          {product.is_new && !discount && !product.is_featured && (
            <Badge
              className="border-0 px-1.5 py-0 text-[10px] font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              NEW
            </Badge>
          )}
          {sourcingBadge === 'local' ? (
            <Badge className="border-0 bg-emerald-600 px-1.5 py-0 text-[10px] font-semibold text-white">
              Local
            </Badge>
          ) : null}
          {sourcingBadge === 'imported' ? (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-semibold">
              Imported
            </Badge>
          ) : null}
          {requiresPrescription ? (
            <Badge className="border-0 bg-emerald-700 px-1.5 py-0 text-[10px] font-bold text-white">
              Rx
            </Badge>
          ) : null}
          {isLowStock && !isDense && (
            <Badge className="border-0 bg-orange-500 px-1.5 py-0 text-[10px] font-bold text-white">
              <Zap className="mr-0.5 inline h-2.5 w-2.5" />
              {stock} left
            </Badge>
          )}
        </div>

        {!isDense && (
          <div
            className={cn(
              'absolute right-2 top-2 z-10 flex flex-col gap-1.5 transition-all duration-200',
              'max-sm:translate-x-0 max-sm:opacity-100',
              isHovered ? 'translate-x-0 opacity-100' : 'translate-x-3 opacity-0 max-sm:translate-x-0 max-sm:opacity-100'
            )}
          >
            <button
              type="button"
              onClick={handleWishlist}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-colors',
                inWishlist ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
              )}
              aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={cn('h-4 w-4', inWishlist && 'fill-current')} />
            </button>
            <Link
              href={productHref}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-md transition-colors hover:text-slate-900"
              aria-label="View product"
            >
              <Eye className="h-4 w-4" />
            </Link>
          </div>
        )}

        {isDense && (
          <button
            type="button"
            onClick={handleWishlist}
            className={cn(
              'absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 shadow-sm transition-colors',
              inWishlist ? 'text-red-500' : 'text-slate-400 hover:text-red-500'
            )}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={cn('h-3 w-3', inWishlist && 'fill-current')} />
          </button>
        )}

        {isDense && categoryLabel && (
          <div className="pointer-events-none absolute bottom-2 left-2 z-10">
            <span className={cn(
              'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-sm',
              fitnessStore ? 'bg-black/70 text-white/90' : 'bg-white/95 text-slate-600'
            )}>
              {categoryLabel}
            </span>
          </div>
        )}

        {isOutOfStock && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-slate-900">
              Sold out
            </span>
          </div>
        )}

        {!isOutOfStock && variant === 'default' && (
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 z-10 p-2 transition-all duration-300 sm:p-3',
              'translate-y-0 opacity-100',
              'sm:translate-y-full sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100'
            )}
          >
            {requiresPrescription ? (
              <PharmacyPrescriptionCta
                product={product}
                businessDomain={businessDomain}
                accent={accent}
                variant="card"
              />
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdding}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-70 sm:rounded-xl sm:py-2.5 sm:text-sm"
                style={{ backgroundColor: accent }}
              >
                <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {isAdding ? 'Adding…' : needsVariantPage ? 'Select options' : 'Add to Cart'}
              </button>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          'flex flex-1 flex-col',
          isDense ? 'gap-1 p-2 lg:p-2.5' : isCompact ? 'mt-2 space-y-1' : 'space-y-1 p-2.5 sm:p-3.5'
        )}
      >
        {!isDense && categoryLabel && (
          <p className={cn(
            'truncate text-[10px] font-semibold uppercase tracking-wider',
            fitnessStore ? 'fitness-product-meta' : 'text-slate-400'
          )}>
            {categoryLabel}
          </p>
        )}

        {isDense && brandLabel && (
          <p className={cn(
            'truncate text-[10px] font-semibold uppercase tracking-wide',
            fitnessStore ? 'fitness-product-meta' : 'text-slate-500'
          )}>
            {brandLabel}
          </p>
        )}

        <Link href={productHref} className="flex-1">
          <h3
            className={cn(
              'fitness-product-title line-clamp-2 leading-snug transition-colors',
              fitnessStore ? 'text-white group-hover:text-rose-100' : 'text-slate-900 group-hover:text-slate-700',
              isDense ? 'text-[11px] font-semibold sm:text-xs' : 'text-xs font-semibold sm:text-sm'
            )}
          >
            {product.name}
          </h3>
        </Link>

        {showPartsMeta && (partNumber || fitmentHint) && !isDense && (
          <p className="truncate text-[10px] text-slate-500">
            {partNumber ? <span className="font-medium text-slate-600">{partNumber}</span> : null}
            {partNumber && fitmentHint ? ' · ' : null}
            {fitmentHint ? <span>{fitmentHint}</span> : null}
          </p>
        )}

        {product.rating && !isDense && (
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-semibold text-slate-700">{Number(product.rating).toFixed(1)}</span>
            {product.review_count > 0 && (
              <span className="text-xs text-slate-400">({product.review_count})</span>
            )}
          </div>
        )}

        <div className={cn('flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5', isDense ? 'pt-0.5' : 'pt-0.5')}>
          <span
            className={cn(
              'store-price font-extrabold tabular-nums',
              fitnessStore ? 'text-white' : 'text-slate-900',
              isDense ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
            )}
          >
            {formatCurrency(product.price, currency)}
          </span>
          {discount > 0 && (
            <span className="text-[10px] text-slate-400 line-through sm:text-xs">
              {formatCurrency(product.compare_price, currency)}
            </span>
          )}
        </div>

        {(isCompact || isDense) && !isOutOfStock && (
          requiresPrescription ? (
            <PharmacyPrescriptionCta
              product={product}
              businessDomain={businessDomain}
              accent={accent}
              variant="card"
              className={cn(isDense ? 'py-1.5 text-[10px] sm:text-[11px]' : 'mt-1 py-2 text-xs')}
            />
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAdding}
              className={cn(
                'mt-auto w-full rounded-lg font-bold text-white transition-all active:scale-[0.98] disabled:opacity-70',
                isDense ? 'py-1.5 text-[10px] sm:text-[11px]' : 'mt-1 py-2 text-xs'
              )}
              style={{ backgroundColor: accent }}
            >
              {isAdding ? 'Adding…' : isOutOfStock ? 'Sold out' : needsVariantPage ? 'Select options' : 'Add to Cart'}
            </button>
          )
        )}
      </div>
    </motion.article>
  );
}
