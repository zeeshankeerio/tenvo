'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingBag, Eye, Star, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { useWishlist } from '@/lib/hooks/storefront/useWishlist';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

export function ProductCard({ product, businessDomain, variant = 'default' }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { currency, settings, business } = useStorefront();

  const accent = getStoreAccentColor(settings, business?.category);
  const inWishlist = isInWishlist(product.id);

  // Correct out-of-stock logic: null stock = unlimited (always available)
  const isOutOfStock = product.stock !== null && product.stock !== undefined && product.stock <= 0;
  const isLowStock = product.stock !== null && product.stock !== undefined && product.stock > 0 && product.stock <= 5;

  const discount =
    product.compare_price && Number(product.compare_price) > Number(product.price)
      ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
      : 0;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    setIsAdding(true);
    try {
      await addItem({
        productId: product.id,
        quantity: 1,
        variantId: product.default_variant_id || null,
      });
      toast.success(`Added to cart`, { icon: '🛒' });
      // Open cart drawer
      window.dispatchEvent(new Event('toggle-cart'));
    } catch (error) {
      toast.error(error.message || 'Failed to add to cart');
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const productHref = `/store/${businessDomain}/products/${product.slug || product.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative bg-white rounded-2xl overflow-hidden border border-gray-100',
        'transition-shadow duration-300 hover:shadow-xl',
        variant === 'compact' ? 'p-3' : 'p-0'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Image area (relative container for all overlays) ───────────── */}
      <div
        className={cn(
          'relative overflow-hidden bg-gray-50',
          variant === 'compact' ? 'aspect-square rounded-xl' : 'aspect-[4/5]'
        )}
      >
        {/* Clickable image */}
        <Link href={productHref} className="absolute inset-0" tabIndex={-1} aria-label={product.name}>
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-gray-200" />
            </div>
          )}
        </Link>

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
          {discount > 0 && (
            <Badge className="bg-red-500 text-white border-0 text-[10px] font-bold px-2 py-0.5">
              -{discount}%
            </Badge>
          )}
          {product.is_new && !discount && (
            <Badge
              className="text-white border-0 text-[10px] font-bold px-2 py-0.5"
              style={{ backgroundColor: accent }}
            >
              NEW
            </Badge>
          )}
          {isLowStock && (
            <Badge className="bg-orange-500 text-white border-0 text-[10px] font-bold px-2 py-0.5">
              <Zap className="w-2.5 h-2.5 mr-0.5 inline" />
              {product.stock} left
            </Badge>
          )}
        </div>

        {/* Quick action buttons — wishlist + quick-view */}
        <div
          className={cn(
            'absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10 transition-all duration-200',
            isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-3'
          )}
        >
          <button
            onClick={handleWishlist}
            className={cn(
              'w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center transition-colors',
              inWishlist ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
            )}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={cn('w-4 h-4', inWishlist && 'fill-current')} />
          </button>

          <Link
            href={productHref}
            className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="View product"
          >
            <Eye className="w-4 h-4" />
          </Link>
        </div>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 pointer-events-none">
            <span className="bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full">
              Out of Stock
            </span>
          </div>
        )}

        {/* Quick add — slides up on hover (button is outside Link, valid DOM) */}
        {!isOutOfStock && variant !== 'compact' && (
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 p-3 transition-all duration-300 z-10',
              isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            )}
          >
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
              style={{ backgroundColor: accent }}
            >
              <ShoppingBag className="w-4 h-4" />
              {isAdding ? 'Adding…' : 'Add to Cart'}
            </button>
          </div>
        )}
      </div>

      {/* ── Info ───────────────────────────────────────────────────────── */}
      <div className={cn('space-y-1.5', variant === 'compact' ? 'mt-2.5' : 'p-3.5')}>
        {/* Category */}
        {product.category_name && (
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">
            {product.category_name}
          </p>
        )}

        {/* Name */}
        <Link href={productHref}>
          <h3
            className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug transition-colors"
            style={{ '--hover-color': accent }}
          >
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-semibold text-gray-700">
              {Number(product.rating).toFixed(1)}
            </span>
            {product.review_count > 0 && (
              <span className="text-xs text-gray-400">({product.review_count})</span>
            )}
          </div>
        )}

        {/* Price row */}
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-base font-black text-gray-900">
            {formatCurrency(product.price, currency)}
          </span>
          {discount > 0 && (
            <span className="text-xs text-gray-400 line-through">
              {formatCurrency(product.compare_price, currency)}
            </span>
          )}
        </div>

        {/* Compact add button */}
        {variant === 'compact' && !isOutOfStock && (
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-full mt-1 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-70"
            style={{ backgroundColor: accent }}
          >
            {isAdding ? 'Adding…' : 'Add to Cart'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
