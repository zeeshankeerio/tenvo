'use client';

import { useState, use, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag, ArrowRight, ArrowLeft, Trash2, Plus, Minus,
  AlertCircle, Truck, Package, Tag, BadgeCheck
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
import { isMembershipRelevant } from '@/lib/config/domains';
import { isRestaurantElevatedStore } from '@/lib/storefront/restaurantStorefront';
import { RestaurantCartOrderMode } from '@/components/storefront/restaurant/RestaurantCartOrderMode';
import {
  RESTAURANT_UI,
  resolveRestaurantShippingCost,
  getRestaurantFeeLabel,
  isRestaurantPickupOrder,
  restaurantOrderModeToShipping,
  normalizeRestaurantOrderMode,
} from '@/lib/storefront/restaurantMenu';
import { useRestaurantChromeOptional } from '@/components/storefront/restaurant/RestaurantChromeContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage({ params }) {
  const { businessDomain } = use(params);
  const router = useRouter();
  const { cart, updateQuantity, removeItem, isLoading, calculateTotals, hydrated, clearCart, setCheckoutAdjustments } = useCart();
  const { currency, settings, business, businessId } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);
  const restaurantStore = isRestaurantElevatedStore(business?.category);
  const restaurantChrome = useRestaurantChromeOptional();
  const restaurantOrderMode = normalizeRestaurantOrderMode(restaurantChrome?.orderMode || 'delivery');
  const restaurantPickup = restaurantStore && isRestaurantPickupOrder(restaurantOrderMode);

  const freeShippingThreshold = settings?.freeShippingThreshold || 2000;
  const taxRate = settings?.taxRate ?? 0.17;
  const returnDays = settings?.returnPolicyDays || 7;

  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberDiscount, setMemberDiscount] = useState(0);
  const [memberDiscountLabel, setMemberDiscountLabel] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [applyingMemberDiscount, setApplyingMemberDiscount] = useState(false);
  const [shippingMethod, setShippingMethod] = useState('standard');

  useEffect(() => {
    if (!restaurantStore || !restaurantChrome?.orderModeHydrated) return;
    setShippingMethod(restaurantOrderModeToShipping(restaurantOrderMode));
  }, [restaurantStore, restaurantOrderMode, restaurantChrome?.orderModeHydrated]);

  const { subtotal, itemCount } = calculateTotals();
  const membershipStoreEnabled = isMembershipRelevant(business?.category);
  const totalDiscount = Math.min(subtotal, promoDiscount + memberDiscount);

  const cartMismatch = Boolean(
    cart.businessId && businessId && cart.businessId !== businessId
  );

  const shippingCost = restaurantStore
    ? resolveRestaurantShippingCost({
        orderMode: restaurantOrderMode,
        subtotal,
        freeShippingThreshold,
        shippingMethod,
      })
    : shippingMethod === 'express'
      ? 300
      : shippingMethod === 'pickup'
        ? 0
        : subtotal >= freeShippingThreshold
          ? 0
          : 150;
  const tax = subtotal * taxRate;
  const total = subtotal + shippingCost + tax - totalDiscount;
  const remaining = Math.max(0, freeShippingThreshold - subtotal);
  const progressPct = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  const saveCheckoutAdjustments = useCallback(
    (overrides = {}) => {
      const nextPromoCode = overrides.promoCode ?? promoCode;
      const nextPromoDiscount = overrides.promoDiscount ?? promoDiscount;
      const nextMemberEmail = overrides.memberEmail ?? memberEmail;
      const nextMemberDiscount = overrides.memberDiscount ?? memberDiscount;
      const nextMemberLabel = overrides.memberDiscountLabel ?? memberDiscountLabel;
      const hasPromo = String(nextPromoCode || '').trim() && nextPromoDiscount > 0;
      const hasMember = nextMemberDiscount > 0;
      if (!hasPromo && !hasMember) {
        setCheckoutAdjustments(null);
        return;
      }
      setCheckoutAdjustments({
        promoCode: hasPromo ? String(nextPromoCode).trim().toUpperCase() : null,
        memberEmail: String(nextMemberEmail || '').trim() || null,
        memberPricingRequested: hasMember,
        promoDiscount: hasPromo ? nextPromoDiscount : 0,
        memberDiscount: hasMember ? nextMemberDiscount : 0,
        memberDiscountLabel: nextMemberLabel || '',
      });
    },
    [
      promoCode,
      promoDiscount,
      memberEmail,
      memberDiscount,
      memberDiscountLabel,
      setCheckoutAdjustments,
    ]
  );

  useEffect(() => {
    if (!hydrated || !cart.checkoutAdjustments) return;
    const adj = cart.checkoutAdjustments;
    if (adj.promoCode) setPromoCode(adj.promoCode);
    if (adj.memberEmail) setMemberEmail(adj.memberEmail);
    if (adj.promoDiscount) setPromoDiscount(adj.promoDiscount);
    if (adj.memberDiscount) {
      setMemberDiscount(adj.memberDiscount);
      setMemberDiscountLabel(adj.memberDiscountLabel || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from persisted cart adjustments
  }, [hydrated]);

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
        body: JSON.stringify({
          code: promoCode.trim().toUpperCase(),
          subtotal,
          customerEmail: memberEmail.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Invalid or expired promo code');
      const nextPromoDiscount = data.discount || 0;
      setPromoDiscount(nextPromoDiscount);
      toast.success(`Promo applied! You save ${formatCurrency(nextPromoDiscount, currency)}`);
      saveCheckoutAdjustments({ promoDiscount: nextPromoDiscount });
    } catch (err) {
      setPromoError(err.message);
      setPromoDiscount(0);
    } finally {
      setApplyingPromo(false);
    }
  };

  const applyMemberDiscount = async () => {
    if (!memberEmail.trim()) {
      toast.error('Enter the email on your membership account');
      return;
    }
    setApplyingMemberDiscount(true);
    setPromoError('');
    try {
      const res = await fetch(`/api/storefront/${businessDomain}/promo/member-discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerEmail: memberEmail.trim(), subtotal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No member discount available');
      const nextMemberDiscount = data.discount || 0;
      const nextLabel = data.planName
        ? `${data.planName} (${data.percent}% off)`
        : `${data.percent}% member discount`;
      setMemberDiscount(nextMemberDiscount);
      setMemberDiscountLabel(nextLabel);
      toast.success(data.message || 'Member pricing applied');
      saveCheckoutAdjustments({
        memberDiscount: nextMemberDiscount,
        memberDiscountLabel: nextLabel,
        memberEmail: memberEmail.trim(),
      });
    } catch (err) {
      setMemberDiscount(0);
      setMemberDiscountLabel('');
      toast.error(err.message);
    } finally {
      setApplyingMemberDiscount(false);
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
      <div className={cn('min-h-screen flex items-center justify-center p-4', restaurantStore ? RESTAURANT_UI.page : 'bg-gray-50')}>
        <div className="text-center max-w-sm">
          <div className={cn('w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6', restaurantStore ? 'bg-neutral-900' : 'bg-gray-100')}>
            <ShoppingBag className={cn('w-12 h-12', restaurantStore ? 'text-neutral-600' : 'text-gray-300')} />
          </div>
          <h1 className={cn('text-2xl font-semibold mb-2', restaurantStore ? 'text-white' : 'text-gray-900')}>Your cart is empty</h1>
          <p className={cn('mb-8', restaurantStore ? 'text-neutral-400' : 'text-gray-500')}>
            {restaurantStore ? 'Browse the menu and add dishes to get started.' : 'Looks like you have not added anything yet. Start shopping!'}
          </p>
          <Button
            size="lg"
            className="rounded-xl gap-2 font-bold"
            style={{ backgroundColor: accent }}
            asChild
          >
            <Link href={`/store/${businessDomain}/products`}>
              <ShoppingBag className="w-5 h-5" />
              {restaurantStore ? 'Browse menu' : 'Browse Products'}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen', restaurantStore ? 'bg-[#0a0a0a]' : 'bg-gray-50')}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className={cn('text-2xl font-semibold', restaurantStore ? 'text-white' : 'text-gray-900')}>
            {restaurantStore ? 'Your order' : 'Shopping Cart'}
            <span className={cn('text-base font-normal ml-2', restaurantStore ? 'text-neutral-500' : 'text-gray-500')}>({itemCount} items)</span>
          </h1>
          <Link
            href={`/store/${businessDomain}/products`}
            className={cn(
              'flex items-center gap-1.5 text-sm transition-colors',
              restaurantStore ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            <ArrowLeft className="w-4 h-4" /> {restaurantStore ? 'Back to menu' : 'Continue Shopping'}
          </Link>
        </div>

        {cartMismatch && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Cart from another store</p>
              <p className="text-sm text-amber-800 mt-1">
                These items belong to a different storefront. Clear the cart to continue shopping here.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 rounded-lg border-amber-300 text-amber-900 hover:bg-amber-100"
                onClick={() => {
                  clearCart();
                  toast.success('Cart cleared');
                }}
              >
                Clear cart
              </Button>
            </div>
          </div>
        )}

        {/* Free delivery progress — delivery mode only */}
        {restaurantStore && !restaurantPickup && remaining > 0 && (
          <div className="mb-6 p-4 rounded-2xl border border-neutral-800 bg-[#141414]">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-2">
              <Truck className="w-4 h-4" style={{ color: accent }} />
              Add <span className="font-bold" style={{ color: accent }}>{formatCurrency(remaining, currency)}</span> more for free delivery
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, backgroundColor: accent }}
              />
            </div>
          </div>
        )}
        {restaurantStore && !restaurantPickup && remaining === 0 && subtotal > 0 && (
          <div className="mb-6 p-3 bg-green-950/40 border border-green-900/50 rounded-2xl flex items-center gap-2 text-sm font-medium text-green-400">
            <Truck className="w-4 h-4" />
            Free delivery on this order
          </div>
        )}
        {!restaurantStore && remaining > 0 && (
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
        {!restaurantStore && remaining === 0 && (
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
                  className={cn(
                    'rounded-2xl p-4 shadow-sm border',
                    restaurantStore
                      ? 'bg-[#141414] border-neutral-800'
                      : 'bg-white border-gray-100'
                  )}
                >
                  <div className="flex gap-4">
                    {/* Image */}
                    <Link
                      href={`/store/${businessDomain}/products/${item.slug || item.productId}`}
                      className="flex-shrink-0"
                    >
                      <div className={cn('w-20 h-20 rounded-xl overflow-hidden', restaurantStore ? 'bg-neutral-800' : 'bg-gray-100')}>
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
                        className={cn(
                          'font-semibold line-clamp-2 text-sm leading-snug transition-colors',
                          restaurantStore ? 'text-white hover:text-neutral-300' : 'text-gray-900 hover:text-gray-600'
                        )}
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
              <Card className={cn('rounded-2xl shadow-sm border-0', restaurantStore && 'bg-[#141414] border border-neutral-800 text-white')}>
                <CardHeader className="pb-3">
                  <CardTitle className={cn('text-base font-bold', restaurantStore && 'text-white')}>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Shipping / order type */}
                  {restaurantStore ? (
                    <RestaurantCartOrderMode onShippingChange={setShippingMethod} />
                  ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shipping</p>
                    {[
                      { id: 'standard', label: 'Standard (3-5 days)', price: subtotal >= freeShippingThreshold ? 'FREE' : formatCurrency(150, currency) },
                      { id: 'express', label: 'Express (1-2 days)', price: formatCurrency(300, currency) },
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
                  )}

                  <Separator />

                  {membershipStoreEnabled ? (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        <BadgeCheck className="w-3.5 h-3.5 inline mr-1" />
                        Member pricing
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="Membership email"
                          value={memberEmail}
                          onChange={(e) => setMemberEmail(e.target.value)}
                          className="rounded-xl text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={applyMemberDiscount}
                          disabled={applyingMemberDiscount || !memberEmail.trim()}
                          className="rounded-xl flex-shrink-0"
                        >
                          {applyingMemberDiscount ? '…' : 'Apply'}
                        </Button>
                      </div>
                      {memberDiscount > 0 ? (
                        <p className="text-xs text-violet-700 mt-1.5 font-medium">
                          ✓ {memberDiscountLabel || 'Member discount'} — save {formatCurrency(memberDiscount, currency)}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1.5">
                          Active members get plan perks on shop items when benefits are configured.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {membershipStoreEnabled ? <Separator /> : null}

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
                        ✓ Promo saving {formatCurrency(promoDiscount, currency)}
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
                      <span className={restaurantStore ? 'text-neutral-500' : 'text-gray-500'}>
                        {restaurantStore ? getRestaurantFeeLabel(restaurantOrderMode) : 'Shipping'}
                      </span>
                      <span className={cn('font-medium', shippingCost === 0 ? 'text-green-600' : '')}>
                        {shippingCost === 0 ? 'FREE' : formatCurrency(shippingCost, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax ({Math.round(taxRate * 100)}%)</span>
                      <span className="font-medium">{formatCurrency(tax, currency)}</span>
                    </div>
                    {memberDiscount > 0 && (
                      <div className="flex justify-between text-violet-700">
                        <span>Member discount</span>
                        <span className="font-medium">-{formatCurrency(memberDiscount, currency)}</span>
                      </div>
                    )}
                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Promo discount</span>
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
                    disabled={cartMismatch}
                    onClick={() => {
                      saveCheckoutAdjustments();
                      router.push(
                        `/store/${businessDomain}/checkout?shipping=${shippingMethod}${restaurantStore ? `&mode=${restaurantOrderMode}` : ''}`
                      );
                    }}
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
