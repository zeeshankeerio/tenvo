'use client';

import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag, Plus, Minus, Trash2, ArrowRight,
  Truck, Package, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/currency';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export function CartDrawer() {
  const router = useRouter();

  const { cart, updateQuantity, removeItem, calculateTotals, isLoading, isOpen, setIsOpen, clearCart } = useCart();
  const { currency, businessDomain, settings, businessId } = useStorefront();
  const { subtotal, itemCount } = calculateTotals();
  const cartMismatch = Boolean(
    cart.businessId && businessId && cart.businessId !== businessId
  );

  const freeShippingThreshold = settings?.freeShippingThreshold || 2000;
  const remaining = Math.max(0, freeShippingThreshold - subtotal);
  const progressPct = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  const handleQuantityChange = (item, newQty) => {
    if (newQty < 1) {
      removeItem(item.productId, item.variantId);
      toast.success('Item removed from cart');
    } else if (item.maxQuantity && newQty > item.maxQuantity) {
      toast.error(`Only ${item.maxQuantity} available`);
    } else {
      updateQuantity(item.productId, item.variantId, newQty);
    }
  };

  const handleCheckout = () => {
    if (cartMismatch) {
      toast.error('Your cart contains items from another store. Please clear your cart.');
      return;
    }
    setIsOpen(false);
    router.push(`/store/${businessDomain}/checkout`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag className="w-5 h-5" />
            Cart
            {itemCount > 0 && (
              <span className="ml-1 text-sm font-normal text-gray-500">
                ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {cart.items.length === 0 ? (
          /* ── Empty State ─────────────────────────────────────────────── */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-sm text-gray-500 mb-6">
              Add some products to get started.
            </p>
            <Button
              onClick={() => setIsOpen(false)}
              asChild
              className="rounded-xl"
            >
              <Link href={`/store/${businessDomain}/products`}>
                Browse Products
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* ── Cart Items ───────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              {cartMismatch && (
                <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-900">Items from another store</p>
                    <button
                      type="button"
                      className="text-xs text-amber-800 underline mt-1"
                      onClick={() => {
                        clearCart();
                        toast.success('Cart cleared');
                      }}
                    >
                      Clear cart
                    </button>
                  </div>
                </div>
              )}
              <AnimatePresence mode="popLayout">
                {cart.items.map((item, index) => (
                  <motion.div
                    key={`${item.productId}-${item.variantId ?? 'base'}`}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -80 }}
                    transition={{ duration: 0.18, delay: index * 0.04 }}
                    className="flex gap-4 px-6 py-4 border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                  >
                    {/* Image */}
                    <Link
                      href={`/store/${businessDomain}/products/${item.slug || item.productId}`}
                      onClick={() => setIsOpen(false)}
                      className="flex-shrink-0"
                    >
                      <div className="w-18 h-18 w-[72px] h-[72px] bg-gray-100 rounded-xl overflow-hidden">
                        {item.image ? (
                          <SmartProductImage
                            src={item.image}
                            alt={item.name}
                            width={72}
                            height={72}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/store/${businessDomain}/products/${item.slug || item.productId}`}
                        onClick={() => setIsOpen(false)}
                        className="text-sm font-semibold text-gray-900 hover:text-gray-600 line-clamp-2 leading-snug"
                      >
                        {item.name}
                      </Link>

                      {item.variantName && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.variantName}</p>
                      )}

                      <p className="text-xs text-gray-500 mt-1">
                        {formatCurrency(item.price, currency)} each
                      </p>

                      {/* Qty controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => handleQuantityChange(item, item.quantity - 1)}
                            disabled={isLoading}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item, item.quantity + 1)}
                            disabled={isLoading || (item.maxQuantity && item.quantity >= item.maxQuantity)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            removeItem(item.productId, item.variantId);
                            toast.success('Removed from cart');
                          }}
                          disabled={isLoading}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Line total */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(item.price * item.quantity, currency)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* ── Footer ───────────────────────────────────────────────── */}
            <div className="border-t bg-white px-6 py-5 space-y-4">
              {/* Free shipping progress */}
              {remaining > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-700 mb-2">
                    <Truck className="w-3.5 h-3.5" />
                    Add {formatCurrency(remaining, currency)} more for free shipping
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-1.5">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
              {remaining === 0 && (
                <div className="flex items-center gap-2 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                  <Truck className="w-3.5 h-3.5" />
                  You qualify for free shipping!
                </div>
              )}

              <Separator />

              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-xl font-black text-gray-900">
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Shipping and taxes calculated at checkout
              </p>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <Button
                  size="lg"
                  className="w-full gap-2 rounded-xl font-bold"
                  disabled={cartMismatch}
                  onClick={handleCheckout}
                >
                  Checkout
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl"
                  onClick={() => setIsOpen(false)}
                  asChild
                >
                  <Link href={`/store/${businessDomain}/cart`}>
                    View Full Cart
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
