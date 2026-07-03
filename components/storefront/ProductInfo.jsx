'use client';

import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { isAutoPartsFinderStore } from '@/lib/storefront/partsFinder';
import { isFashionEditorialStore } from '@/lib/storefront/fashionEditorial';
import { resolveSourcingBadge } from '@/lib/storefront/productAttributeChips';
import { ProductAttributeList } from '@/components/storefront/ProductAttributeList';
import { getStorefrontStockState } from '@/lib/storefront/storefrontStockUi';

export function ProductInfo({ product, businessDomain }) {
  const { currency, business } = useStorefront();

  const discountPercentage =
    product.compare_price && product.compare_price > product.price
      ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
      : null;

  const categoryKey = business?.category;
  const showPartsMeta = isAutoPartsFinderStore(categoryKey);
  const showFashionMeta = isFashionEditorialStore(categoryKey);

  const { stock: displayStock, isOutOfStock, isLowStock } = getStorefrontStockState(product);

  const sourcingBadge = showFashionMeta ? resolveSourcingBadge(product.domain_data) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {product.category_name ? (
          <Badge variant="secondary" className="text-xs">
            {product.category_name}
          </Badge>
        ) : null}
        {product.is_featured ? (
          <Badge className="bg-amber-500 text-white text-xs">Featured</Badge>
        ) : null}
        {sourcingBadge === 'local' ? (
          <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-800 bg-emerald-50">
            Local
          </Badge>
        ) : null}
        {sourcingBadge === 'imported' ? (
          <Badge variant="secondary" className="text-xs">
            Imported
          </Badge>
        ) : null}
        {isOutOfStock ? (
          <Badge variant="destructive" className="text-xs">
            Out of Stock
          </Badge>
        ) : null}
        {isLowStock ? (
          <Badge variant="outline" className="text-xs border-amber-200 text-amber-800 bg-amber-50">
            Only {displayStock} left
          </Badge>
        ) : null}
      </div>

      <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">{product.name}</h1>

      {product.rating ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < Math.floor(product.rating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">
            {product.rating.toFixed(1)} ({product.review_count || 0} reviews)
          </span>
        </div>
      ) : null}

      <div className="flex items-baseline gap-3 tabular-nums">
        <span className="text-3xl font-semibold text-gray-900">
          {formatCurrency(product.price, currency)}
        </span>
        {discountPercentage ? (
          <>
            <span className="text-xl text-gray-400 line-through">
              {formatCurrency(product.compare_price, currency)}
            </span>
            <Badge variant="destructive" className="text-xs">
              Save {discountPercentage}%
            </Badge>
          </>
        ) : null}
      </div>

      {product.description ? (
        <p className="text-gray-600 leading-relaxed">{product.description}</p>
      ) : null}

      {(showFashionMeta || showPartsMeta || product.sku) ? (
        <ProductAttributeList
          product={product}
          businessDomain={businessDomain}
          showFashionMeta={showFashionMeta}
          showPartsMeta={showPartsMeta}
          hideBadgeKeys={sourcingBadge ? ['sourcing'] : []}
        />
      ) : null}
    </div>
  );
}
