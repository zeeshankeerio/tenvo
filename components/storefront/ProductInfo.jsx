'use client';

import { Star, Truck, Shield, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { isAutoPartsFinderStore } from '@/lib/storefront/partsFinder';

export function ProductInfo({ product }) {
  const { currency, settings, business } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);
  
  const discountPercentage = product.compare_price && product.compare_price > product.price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : null;

  const categoryKey = business?.category;
  const domainData = product.domain_data || {};
  const showPartsMeta = isAutoPartsFinderStore(categoryKey);
  const partNumber = domainData.partnumber || product.sku;
  const oemNumber = domainData.oemnumber;
  const fitmentLine = [domainData.vehiclemake, domainData.vehiclemodel, domainData.modelyear]
    .filter(Boolean)
    .join(' ');
  
  return (
    <div className="space-y-4">
      {/* Category & Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {product.category_name && (
          <Badge variant="secondary" className="text-xs">
            {product.category_name}
          </Badge>
        )}
        {product.is_featured && (
          <Badge className="bg-amber-500 text-white text-xs">Featured</Badge>
        )}
        {product.stock === 0 && (
          <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
        )}
      </div>
      
      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
        {product.name}
      </h1>
      
      {/* Rating */}
      {product.rating && (
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
      )}
      
      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-gray-900">
          {formatCurrency(product.price, currency)}
        </span>
        {discountPercentage && (
          <>
            <span className="text-xl text-gray-400 line-through">
              {formatCurrency(product.compare_price, currency)}
            </span>
            <Badge variant="destructive" className="text-xs">
              Save {discountPercentage}%
            </Badge>
          </>
        )}
      </div>
      
      {/* Description */}
      {product.description && (
        <p className="text-gray-600 leading-relaxed">
          {product.description}
        </p>
      )}
      
      {/* Trust Badges */}
      <div className="grid grid-cols-3 gap-4 py-4 border-y">
        <div className="text-center">
          <Truck className="w-6 h-6 mx-auto mb-1" style={{ color: accent }} />
          <p className="text-xs text-gray-600">Free Shipping</p>
        </div>
        <div className="text-center">
          <Shield className="w-6 h-6 mx-auto mb-1 text-green-600" />
          <p className="text-xs text-gray-600">Secure Payment</p>
        </div>
        <div className="text-center">
          <RotateCcw className="w-6 h-6 mx-auto mb-1 text-orange-600" />
          <p className="text-xs text-gray-600">7-Day Returns</p>
        </div>
      </div>
      
      {/* SKU / part metadata */}
      {(product.sku || (showPartsMeta && partNumber)) && (
        <div className="space-y-1 text-sm text-gray-500">
          {(showPartsMeta && partNumber) ? (
            <p>
              Part number: <span className="font-medium text-gray-800">{partNumber}</span>
            </p>
          ) : null}
          {showPartsMeta && oemNumber ? (
            <p>
              OEM: <span className="font-medium text-gray-800">{oemNumber}</span>
            </p>
          ) : null}
          {showPartsMeta && fitmentLine ? (
            <p>
              Fits: <span className="font-medium text-gray-800">{fitmentLine}</span>
            </p>
          ) : null}
          {product.sku && (!showPartsMeta || product.sku !== partNumber) ? (
            <p>
              SKU: <span className="font-medium">{product.sku}</span>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
