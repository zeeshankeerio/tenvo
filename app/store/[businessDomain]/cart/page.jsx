'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag, ArrowRight, ArrowLeft, Trash2, Plus, Minus,
  AlertCircle, Truck, Package, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage({ params }) {
  const { businessDomain } = use(params);
  const router = useRouter();
  const { cart, updateQuantity, removeItem, isLoading, calculateTotals, hydrated } = useCart();
  const { currency, settings, business } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);

  const freeShippingThreshold = settings?.freeShippingThreshold || 2000;
  const taxRate = settings?.taxRate ?? 0.17;
  const returnDays = settings?.returnPolicyDays || 7;

  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [shippingMethod, setShippingMethod] = useState('standard');

  const { subtotal, itemCount } = calculateTotals();

  const shippingCost = shippingMethod === 'express' ? 300
    : shippingMethod === 'pickup' ? 0
    : subtotal >= freeShippingThreshold ? 0 : 150;
  const tax = subtotal * taxRate;
  const total = subtotal + shippingCost + tax - promoDiscount;
  const remaining = Math.max(0, freeShippingThreshold - subtotal);
  const progressPct = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  const handleQty = (item, newQty) => {
    if (newQty < 1) {
      removeItem(item.productId, item.variantId);
      toast.success('Item removed');
    } else if (item.maxQuantity && newQty > item.maxQuantity) {
      toast.error(`Only ${item.maxQuantity} available`);
    } else {
      updateQuantity(item.productId, item.variantId, newQty);
    }
  };

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setApplyingPromo(true);
    setPromoError('');
    try {
      const res = await fetch(`/api/storefront/${businessDomain}/promo/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase(), subtotal }),
      });
      if (!res.ok) throw new Error('Invalid or expired promo code');
      const data = await res.json();
      setPromoDiscount(data.discount || 0);
      toast.success(`Promo applied! You save ${formatCurrency(data.discount, currency)}`);
    } catch (err) {
      setPromoError(err.message);
      setPromoDiscount(0);
    } finally {
      setApplyingPromo(false);
    }
  };

  // ── Pre-hydration loading
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Empty cart ───────────────────────────────────────────────────────
  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-gray-300" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-500 mb-8">
            Looks like you have not added anything yet. Start shopping!
          </p>
          <Button
            size="lg"
            className="rounded-xl gap-2 font-bold"
            style={{ backgroundColor: accent }}
            asChild
          >
            <Link href={`/store/${businessDomain}/products`}>
              <ShoppingBag className="w-5 h-5" />
              Browse Products
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-900">
            Shopping Cart
            <span className="text-base font-normal text-gray-500 ml-2">({itemCount} items)</span>
          </h1>
          <Link
            href={`/store/${businessDomain}/products`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>

        {/* Free shipping progress */}
        {remaining > 0 && (
          <div className="mb-6 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Truck className="w-4 h-4" style={{ color: accent }} />
              Add <span className="font-bold" style={{ color: accent }}>{formatCurrency(remaining, currency)}</span> more for free shipping!
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, backgroundColor: accent }}
              />
            </div>
          </div>
        )}
        {remaining === 0 && (
          <div className="mb-6 p-3 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-2 text-sm font-medium text-green-700">
            <Truck className="w-4 h-4" />
            You qualify for free shipping!
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Cart items ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-3">
            <AnimatePresence mode="popLayout">
              {cart.items.map((item) => (
                <motion.div
                  key={`${item.productId}-${item.variantId ?? 'base'}`}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -80 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex gap-4">
                    {/* Image */}
                    <Link
                      href={`/store/${businessDomain}/products/${item.slug || item.productId}`}
                      className="flex-shrink-0"
                    >
                      <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden">
                        {item.image ? (
                          <SmartProductImage
                            src={item.image}
                            alt={item.name}
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-7 h-7 text-gray-300" />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/store/${businessDomain}/products/${item.slug || item.productId}`}
                        className="font-semibold text-gray-900 hover:text-gray-600 line-clamp-2 text-sm leading-snug transition-colors"
                      >
                        {item.name}
                      </Link>
                      {item.variantName && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.variantName}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatCurrency(item.price, currency)} each
                      </p>

                      {/* Qty + remove */}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                          <button
                            onClick={() => handleQty(item, item.quantity - 1)}
                            disabled={isLoading}
                            className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-40"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                          <button
                            onClick={() => handleQty(item, item.quantity + 1)}
                            disabled={isLoading || (item.maxQuantity && item.quantity >= item.maxQuantity)}
                            className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => { removeItem(item.productId, item.variantId); toast.success('Removed'); }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Low stock warning */}
                      {item.maxQuantity && item.maxQuantity <= 5 && (
                        <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Only {item.maxQuantity} left in stock
                        </p>
                      )}
                    </div>

                    {/* Line total */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-gray-900">
                        {formatCurrency(item.price * item.quantity, currency)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* ── Order summary ────────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <Card className="rounded-2xl shadow-sm border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Shipping method */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shipping</p>
                    {[
                      { id: 'standard', label: 'Standard (3–5 days)', price: subtotal >= freeShippingThreshold ? 'FREE' : formatCurrency(150, currency) },
                      { id: 'express', label: 'Express (1–2 days)', price: formatCurrency(300, currency) },
                      { id: 'pickup', label: 'Store Pickup', price: 'FREE' },
                    ].map(opt => (
                      <label key={opt.id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all text-sm',
                          shippingMethod === opt.id ? 'border-current' : 'border-gray-200 hover:border-gray-300'
                        )}
                        style={shippingMethod === opt.id ? { borderColor: accent, backgroundColor: accent + '08' } : {}}
                      >
                        <div className="flex items-center gap-2">
                          <input type="radio" name="shipping" value={opt.id}
                            checked={shippingMethod === opt.id}
                            onChange={() => setShippingMethod(opt.id)}
                            className="accent-current"
                            style={{ accentColor: accent }}
                          />
                          <span className="text-gray-700">{opt.label}</span>
                        </div>
                        <span className={cn('font-semibold', opt.price === 'FREE' ? 'text-green-600' : 'text-gray-900')}>
                          {opt.price}
                        </span>
                      </label>
                    ))}
                  </div>

                  <Separator />

                  {/* Promo code */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      <Tag className="w-3.5 h-3.5 inline mr-1" />
                      Promo Code
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code"
                        value={promoCode}
                        onChange={e => setPromoCode(e.target.value.toUpperCase())}
                        className="rounded-xl uppercase text-sm"
                        onKeyDown={e => e.key === 'Enter' && applyPromo()}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={applyPromo}
                        disabled={applyingPromo || !promoCode.trim()}
                        className="rounded-xl flex-shrink-0"
                      >
                        {applyingPromo ? '…' : 'Apply'}
                      </Button>
                    </div>
                    {promoError && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {promoError}
                      </p>
                    )}
                    {promoDiscount > 0 && (
                      <p className="text-xs text-green-600 mt-1.5 font-medium">
                        ✓ Saving {formatCurrency(promoDiscount, currency)}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Shipping</span>
                      <span className={cn('font-medium', shippingCost === 0 ? 'text-green-600' : '')}>
                        {shippingCost === 0 ? 'FREE' : formatCurrency(shippingCost, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax ({Math.round(taxRate * 100)}%)</span>
                      <span className="font-medium">{formatCurrency(tax, currency)}</span>
                    </div>
                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span className="font-medium">-{formatCurrency(promoDiscount, currency)}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-black" style={{ color: accent }}>
                      {formatCurrency(total, currency)}
                    </span>
                  </div>

                  <Button
                    size="lg"
                    className="w-full gap-2 rounded-xl font-bold"
                    style={{ backgroundColor: accent }}
                    onClick={() => router.push(`/store/${businessDomain}/checkout?shipping=${shippingMethod}`)}
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-5 h-5" />
                  </Button>

                  <p className="text-xs text-center text-gray-400">
                    {returnDays}-day returns · Secure checkout · SSL encrypted
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
