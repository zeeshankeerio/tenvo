'use client';

import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingBag, Trash2, Package } from 'lucide-react';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { useWishlist } from '@/lib/hooks/storefront/useWishlist';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'react-hot-toast';

export default function WishlistPage({ params }) {
  const { businessDomain } = use(params);
  const { business, settings, currency, businessId } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);
  const { addItem } = useCart();
  const { wishlist, removeFromWishlist, clearWishlist, hydrated } = useWishlist();

  const items = wishlist.items || [];

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
      </div>
    );
  }

  const moveToCart = async (item) => {
    try {
      await addItem({ productId: item.productId, quantity: 1, variantId: null, businessId });
      removeFromWishlist(item.productId);
    } catch (err) {
      toast.error(err.message || 'Failed to add to cart');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <Link href={`/store/${businessDomain}`} className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          ← Back to Store
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
              <Heart className="w-7 h-7" style={{ color: accent }} />
              My Wishlist
            </h1>
            <p className="text-gray-500 text-sm mt-1">{items.length} {items.length === 1 ? 'item' : 'items'} saved</p>
          </div>
          {items.length > 0 && (
            <button onClick={clearWishlist} className="text-sm text-red-400 hover:text-red-600 font-medium">
              Clear all
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-8">Save items you love and come back to them anytime.</p>
            <Link
              href={`/store/${businessDomain}/products`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              <ShoppingBag className="w-4 h-4" />
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <div key={item.productId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                {/* Image */}
                <Link href={`/store/${businessDomain}/products/${item.slug || item.productId}`}>
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-200" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="p-4">
                  <Link href={`/store/${businessDomain}/products/${item.slug || item.productId}`}>
                    <p className="font-semibold text-gray-900 text-sm line-clamp-2 hover:text-gray-600 transition-colors">{item.name}</p>
                  </Link>
                  <p className="font-black text-gray-900 mt-1" style={{ color: accent }}>
                    {formatCurrency(item.price, currency)}
                  </p>
                  {item.compare_price && item.compare_price > item.price && (
                    <p className="text-xs text-gray-400 line-through">{formatCurrency(item.compare_price, currency)}</p>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => moveToCart(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: accent }}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Add to Cart
                    </button>
                    <button
                      onClick={() => removeFromWishlist(item.productId)}
                      className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
