'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { ProductCard } from './ProductCard';
import { ChevronLeft, ChevronRight, Package, ShoppingBag, Heart } from 'lucide-react';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { useWishlist } from '@/lib/hooks/storefront/useWishlist';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
  STORE_PRODUCT_RAIL_TRACK_CLASS,
  STORE_PRODUCT_RAIL_ITEM_CLASS,
  ensureRailProducts,
  resolveRailProductId,
} from '@/lib/utils/storefrontProductRail';
import { toast } from 'react-hot-toast';
import { useState, useMemo } from 'react';
import { catalogProductNeedsVariantPage } from '@/lib/storefront/storefrontProductVariants';

/** @type {Record<string, string>} */
const GRID_DENSITY_CLASSES = {
  default: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4',
  catalog: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4',
  /** Professional storefront, 6 cards per row on xl (Glovida / Amazon-style density) */
  showcase: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-3.5',
};

function ProductListItem({ product, businessDomain }) {
  const [isAdding, setIsAdding] = useState(false);
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { currency, settings, business, businessId } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);
  const inWishlist = isInWishlist(product.id);
  const listImage = getEffectiveProductImageUrl(product, business?.category);
  const isOutOfStock = product.stock !== null && product.stock !== undefined && product.stock <= 0;
  const productHref = `/store/${businessDomain}/products/${product.slug || product.id}`;
  const needsVariantPage = catalogProductNeedsVariantPage(product);
  const discount = product.compare_price && Number(product.compare_price) > Number(product.price)
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    if (isOutOfStock) return;
    if (needsVariantPage) {
      window.location.href = productHref;
      return;
    }
    setIsAdding(true);
    try {
      await addItem({ productId: product.id, quantity: 1, variantId: null, businessId });
      toast.success('Added to cart', { icon: '🛒' });
      window.dispatchEvent(new Event('toggle-cart'));
    } catch (err) {
      const message = err.message || 'Failed to add to cart';
      if (/select size|select.*options|variant/i.test(message)) {
        window.location.href = productHref;
        return;
      }
      toast.error(message);
    } finally { setIsAdding(false); }
  };

  return (
    <div className="flex gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow group">
      <Link href={`/store/${businessDomain}/products/${product.slug || product.id}`} className="flex-shrink-0">
        <div className="w-28 h-28 sm:w-36 sm:h-36 bg-gray-50 rounded-xl overflow-hidden">
          {listImage ? (
            <SmartProductImage src={listImage} alt={product.name} width={144} height={144} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-gray-200" /></div>
          )}
        </div>
      </Link>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {product.category_name && <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{product.category_name}</p>}
          <Link href={`/store/${businessDomain}/products/${product.slug || product.id}`}>
            <h3 className="font-semibold text-gray-900 hover:opacity-80 transition-opacity line-clamp-2 leading-snug">{product.name}</h3>
          </Link>
          {product.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>}
        </div>
        <div className="flex items-center justify-between mt-3 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-gray-900">{formatCurrency(product.price, currency)}</span>
            {discount > 0 && <span className="text-sm text-gray-400 line-through">{formatCurrency(product.compare_price, currency)}</span>}
            {discount > 0 && <span className="text-xs font-bold text-white bg-red-500 rounded-full px-2 py-0.5">-{discount}%</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
              className={cn('p-2 rounded-xl border transition-colors', inWishlist ? 'border-red-200 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200')}
              aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={cn('w-4 h-4', inWishlist && 'fill-current')} />
            </button>
            <button
              onClick={handleAddToCart}
              disabled={isAdding || isOutOfStock}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: isOutOfStock ? '#9ca3af' : accent }}
            >
              <ShoppingBag className="w-4 h-4" />
              {isOutOfStock ? 'Out of Stock' : isAdding ? 'Adding…' : needsVariantPage ? 'Select options' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductGrid({
  products,
  businessDomain,
  total = 0,
  currentPage = 1,
  limit = 24,
  hasMore = false,
  filters = {},
  view = 'grid',
  showResultsCount = true,
  density = 'default',
  cardVariant,
  layout = 'grid',
  catalogPool,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const displayProducts = useMemo(() => {
    if (layout !== 'rail') return products;
    return ensureRailProducts(products, catalogPool ?? products, 6, 12);
  }, [layout, products, catalogPool]);

  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
  const showPagination = totalPages > 1;

  const goToPage = (page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/store/${businessDomain}/products?${params.toString()}`);
    // Scroll to top of product grid
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const gridClass = GRID_DENSITY_CLASSES[density] || GRID_DENSITY_CLASSES.default;
  const resolvedVariant = cardVariant || (density === 'showcase' ? 'dense' : 'default');

  if (!displayProducts || displayProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Package className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">
          {filters.search
            ? `No results for "${filters.search}". Try a different search term.`
            : 'Try adjusting your filters or browse all products.'}
        </p>
        <Link
          href={`/store/${businessDomain}/products`}
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors"
        >
          Browse All Products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {total > 0 && showResultsCount && (
        <p className="text-sm text-gray-500">
          Showing{' '}
          <span className="font-semibold text-gray-900">
            {(currentPage - 1) * limit + 1}-{Math.min(currentPage * limit, total)}
          </span>{' '}
          of <span className="font-semibold text-gray-900">{total}</span> products
        </p>
      )}

      {/* Grid / List */}
      {view === 'list' ? (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <ProductListItem key={product.id} product={product} businessDomain={businessDomain} />
          ))}
        </div>
      ) : layout === 'rail' ? (
        <div className={STORE_PRODUCT_RAIL_TRACK_CLASS}>
          {displayProducts.map((product) => (
            <div key={resolveRailProductId(product)} className={STORE_PRODUCT_RAIL_ITEM_CLASS}>
              <ProductCard
                product={product}
                businessDomain={businessDomain}
                variant={resolvedVariant}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={cn('grid', gridClass)}>
          {displayProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              businessDomain={businessDomain}
              variant={resolvedVariant}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let page;
              if (totalPages <= 7) {
                page = i + 1;
              } else if (currentPage <= 4) {
                page = i + 1;
                if (i === 6) page = totalPages;
                if (i === 5) page = -1; // ellipsis
              } else if (currentPage >= totalPages - 3) {
                if (i === 0) page = 1;
                else if (i === 1) page = -1;
                else page = totalPages - (6 - i);
              } else {
                if (i === 0) page = 1;
                else if (i === 1) page = -1;
                else if (i === 5) page = -2;
                else if (i === 6) page = totalPages;
                else page = currentPage + (i - 3);
              }

              if (page < 0) {
                return (
                  <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">
                    …
                  </span>
                );
              }

              return (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors ${
                    page === currentPage
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
