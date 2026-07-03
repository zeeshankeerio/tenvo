'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import {
  CreditCard, Truck, MapPin, Check, ChevronRight,
  Shield, Lock, AlertCircle, Wallet, Banknote,
  Smartphone, Building2, Loader2, Package, ArrowLeft, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { toast } from 'react-hot-toast';
import { getAvailablePaymentMethods } from '@/lib/actions/storefront/payments';
import { downloadStorefrontOrderReceipt } from '@/lib/storefront/storefrontReceiptDownload';

const PAYMENT_ICONS = {
  stripe: CreditCard, cod: Banknote, easypaisa: Smartphone,
  jazzcash: Smartphone, bank_transfer: Building2, paypal: Wallet,
  card: CreditCard, wallet: Wallet,
};

const STEPS = [
  { id: 'information', label: 'Info', icon: MapPin },
  { id: 'shipping', label: 'Shipping', icon: Truck },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'review', label: 'Review', icon: Check },
];

export default function CheckoutPage({ params }) {
  const { businessDomain } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, calculateTotals, clearCart, hydrated, checkoutAdjustments } = useCart();
  const { currency, businessId, settings, business } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);

  const freeShippingThreshold = settings?.freeShippingThreshold || 2000;
  const taxRate = settings?.taxRate ?? 0.17;

  // Pre-fill shipping method from cart page selection (?shipping=express etc.)
  const shippingParam = searchParams.get('shipping');
  const defaultShipping = ['standard', 'express', 'pickup'].includes(shippingParam)
    ? shippingParam
    : 'standard';

  const [step, setStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPM, setLoadingPM] = useState(true);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  const [form, setForm] = useState({
    email: '', firstName: '', lastName: '', phone: '',
    address: '', city: '', postalCode: '', country: 'PK',
    shippingMethod: defaultShipping, paymentMethod: '',
  });

  const { subtotal, itemCount } = calculateTotals();
  const adjustments = cart.checkoutAdjustments || checkoutAdjustments;
  const orderDiscount = adjustments
    ? Math.min(
        subtotal,
        (adjustments.promoDiscount || 0) + (adjustments.memberDiscount || 0)
      )
    : 0;
  const shippingCost = form.shippingMethod === 'express' ? 300
    : form.shippingMethod === 'pickup' ? 0
    : subtotal >= freeShippingThreshold ? 0 : 150;
  // Match the server's per-product tax: use each item's tax_percent (captured at
  // add-to-cart), falling back to the store default only for legacy cart items.
  const tax = cart.items.reduce((sum, i) => {
    const rate = typeof i.taxPercent === 'number' ? i.taxPercent / 100 : taxRate;
    return sum + i.price * i.quantity * rate;
  }, 0);
  const total = subtotal + shippingCost + tax - orderDiscount;

  // Redirect empty cart, only after localStorage hydration to avoid false redirect
  useEffect(() => {
    if (!hydrated) return;
    if (!orderDone && cart.items.length === 0) {
      router.replace(`/store/${businessDomain}/cart`);
    }
  }, [hydrated, cart.items.length, orderDone, router, businessDomain]);

  // Block checkout when cart belongs to another storefront (defense in depth)
  useEffect(() => {
    if (!hydrated || !businessId || orderDone) return;
    if (cart.businessId && cart.businessId !== businessId) {
      toast.error('Your cart contains items from another store. Please clear your cart.');
      router.replace(`/store/${businessDomain}/cart`);
    }
  }, [hydrated, cart.businessId, businessId, orderDone, router, businessDomain]);

  // Load payment methods
  useEffect(() => {
    if (!businessId) return;
    (async () => {
      try {
        const res = await getAvailablePaymentMethods(businessId);
        if (res.success && res.methods?.length) {
          setPaymentMethods(res.methods);
          setForm(f => ({ ...f, paymentMethod: res.methods[0].provider }));
        }
      } catch { /* non-critical */ }
      finally { setLoadingPM(false); }
    })();
  }, [businessId]);

  useEffect(() => {
    if (!hydrated || !adjustments?.memberEmail) return;
    setForm((f) => (f.email ? f : { ...f, email: adjustments.memberEmail }));
  }, [hydrated, adjustments?.memberEmail]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const validate = (s) => {
    if (s === 0) {
      if (!form.email || !form.firstName || !form.lastName || !form.phone) {
        toast.error('Please fill in all required fields'); return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        toast.error('Please enter a valid email'); return false;
      }
    }
    if (s === 1) {
      if (!form.address || !form.city || !form.postalCode) {
        toast.error('Please enter your shipping address'); return false;
      }
    }
    if (s === 2 && !form.paymentMethod) {
      toast.error('Please select a payment method'); return false;
    }
    return true;
  };

  const next = () => { if (validate(step)) setStep(s => Math.min(s + 1, 3)); };
  const back = () => setStep(s => Math.max(s - 1, 0));

  const placeOrder = async () => {
    if (!businessId) { toast.error('Store not ready'); return; }
    if (cart.businessId && cart.businessId !== businessId) {
      toast.error('Your cart contains items from another store. Please clear your cart.');
      return;
    }
    setProcessing(true);
    try {
      const response = await fetch(`/api/storefront/${businessDomain}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            email: form.email,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
          },
          shippingAddress: {
            address: form.address,
            city: form.city,
            postalCode: form.postalCode,
            country: form.country,
          },
          billingAddress: {
            address: form.address,
            city: form.city,
            postalCode: form.postalCode,
            country: form.country,
          },
          items: cart.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            variantId: i.variantId || null,
          })),
          shipping: shippingCost,
          shippingMethod: form.shippingMethod,
          paymentMethod: form.paymentMethod,
          promoCode: adjustments?.promoCode || undefined,
          memberPricingRequested: Boolean(adjustments?.memberPricingRequested),
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create order');
      }

      // Snapshot the placed order for the confirmation receipt before clearing the
      // cart. Prefer the server-authoritative breakdown so the receipt always
      // matches what was actually charged.
      setPlacedOrder({
        orderNumber: result.order.orderNumber,
        placedAt: new Date(),
        customerName: `${form.firstName} ${form.lastName}`.trim(),
        total: Number(result.order.total ?? total),
        paymentStatus: result.order.paymentStatus,
        paymentMethodLabel:
          paymentMethods.find((m) => m.provider === form.paymentMethod)?.display_name ||
          form.paymentMethod,
        isCod: form.paymentMethod === 'cod',
        shippingMethod: form.shippingMethod,
        subtotal: Number(result.order.subtotal ?? subtotal),
        shippingCost: Number(result.order.shipping ?? shippingCost),
        tax: Number(result.order.tax ?? tax),
        discount: Number(result.order.discount ?? orderDiscount),
        items: cart.items.map((i) => ({
          key: `${i.productId}-${i.variantId}`,
          name: i.name,
          variantName: i.variantName,
          quantity: i.quantity,
          price: i.price,
          image: i.image,
        })),
      });
      setOrderNumber(result.order.orderNumber);
      setOrderDone(true);
      clearCart();
      toast.success(`Order ${result.order.orderNumber} placed!`);
    } catch (err) {
      toast.error(err.message || 'Failed to place order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!orderNumber) return;
    setDownloadingReceipt(true);
    try {
      // Fetch full order details with line items
      const res = await fetch(
        `/api/storefront/${businessDomain}/orders?email=${encodeURIComponent(
          form.email
        )}&orderNumber=${encodeURIComponent(orderNumber)}`
      );
      const data = await res.json();
      if (!data.success || !data.orders?.length) {
        throw new Error('Order not found');
      }
      const fullOrder = data.orders[0];

      await downloadStorefrontOrderReceipt({
        order: fullOrder,
        items: fullOrder.items || [],
        business,
      });

      toast.success('Receipt downloaded!');
    } catch (err) {
      console.error('[Receipt Download]', err);
      toast.error('Failed to download receipt. Please try again.');
    } finally {
      setDownloadingReceipt(false);
    }
  };

  // ── Pre-hydration loading state, prevents premature empty-cart redirect
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // ── Order Success Screen ─────────────────────────────────────────────
  if (orderDone) {
    const receipt = placedOrder;
    const totalUnits = receipt ? receipt.items.reduce((n, i) => n + i.quantity, 0) : 0;
    const placedDate = receipt?.placedAt
      ? new Date(receipt.placedAt).toLocaleDateString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
        })
      : null;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-10">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Confirmation header */}
          <div
            className="px-8 pt-9 pb-7 text-center"
            style={{ background: `linear-gradient(180deg, ${accent}10 0%, transparent 100%)` }}
          >
            <div
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto mb-5 ring-8"
              style={{ backgroundColor: accent, '--tw-ring-color': accent + '1f' }}
            >
              <Check className="w-9 h-9 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-[22px] font-semibold text-gray-900 mb-1.5">Order confirmed</h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Thank you{receipt?.customerName ? `, ${receipt.customerName.split(' ')[0]}` : ''}! Your order has
              been placed. A confirmation is on its way to{' '}
              <span className="font-medium text-gray-700">{form.email}</span>.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold tabular-nums"
                style={{ backgroundColor: accent + '15', color: accent }}
              >
                Order #{orderNumber}
              </span>
              {placedDate && (
                <span className="inline-flex items-center px-3 py-2 rounded-full text-xs font-medium text-gray-500 bg-gray-100">
                  {placedDate}
                </span>
              )}
            </div>
          </div>

          {/* On-screen receipt */}
          {receipt && (
            <div className="px-6 sm:px-8">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Order Receipt
                  </p>
                  <span className="text-xs text-gray-400">
                    {totalUnits} item{totalUnits !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {receipt.items.map((item) => (
                    <div key={item.key} className="flex justify-between gap-3 text-sm">
                      <span className="text-gray-600 min-w-0 truncate">
                        {item.name}
                        {item.variantName ? ` (${item.variantName})` : ''}
                        <span className="text-gray-400"> × {item.quantity}</span>
                      </span>
                      <span className="font-medium text-gray-900 tabular-nums flex-shrink-0">
                        {formatCurrency(item.price * item.quantity, currency)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="my-3" />

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium tabular-nums">{formatCurrency(receipt.subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shipping</span>
                    <span className={cn('font-medium tabular-nums', receipt.shippingCost === 0 && 'text-green-600')}>
                      {receipt.shippingCost === 0 ? 'FREE' : formatCurrency(receipt.shippingCost, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax</span>
                    <span className="font-medium tabular-nums">{formatCurrency(receipt.tax, currency)}</span>
                  </div>
                  {receipt.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-medium tabular-nums">-{formatCurrency(receipt.discount, currency)}</span>
                    </div>
                  )}
                </div>

                <Separator className="my-3" />

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total paid</span>
                  <span className="text-lg font-semibold tabular-nums" style={{ color: accent }}>
                    {formatCurrency(receipt.total, currency)}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs text-gray-600 border border-gray-100">
                  {receipt.isCod ? (
                    <Banknote className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="min-w-0">
                    <span className="font-medium text-gray-700">{receipt.paymentMethodLabel}</span>
                    {receipt.isCod
                      ? ' · Pay in cash on delivery'
                      : receipt.paymentStatus === 'awaiting_payment'
                      ? ' · Awaiting payment'
                      : ' · Payment received'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-6 sm:p-8 pt-5 space-y-2.5">
            <Button
              className="w-full rounded-xl gap-2 font-semibold text-white"
              style={{ backgroundColor: accent }}
              onClick={handleDownloadReceipt}
              disabled={downloadingReceipt}
            >
              {downloadingReceipt ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating receipt…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Receipt
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl gap-2 font-medium"
              onClick={() => router.push(`/store/${businessDomain}/orders?email=${encodeURIComponent(form.email)}`)}
            >
              <Package className="w-4 h-4" />
              Track My Order
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-xl text-gray-600"
              onClick={() => router.push(`/store/${businessDomain}/products`)}
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Checkout Form ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Back link */}
        <Link
          href={`/store/${businessDomain}/cart`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </Link>

        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Checkout</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  i < step ? 'text-white' : i === step ? 'text-white' : 'bg-gray-200 text-gray-500'
                )}
                style={i <= step ? { backgroundColor: accent } : {}}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn('text-sm font-medium hidden sm:block', i <= step ? 'text-gray-900' : 'text-gray-400')}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main form ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <Card className="rounded-2xl shadow-sm border-0">
              <CardContent className="p-6 sm:p-8">

                {/* Step 0, Contact */}
                {step === 0 && (
                  <div className="space-y-5">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5" style={{ color: accent }} />
                      Contact Information
                    </h2>
                    <div>
                      <Label htmlFor="email">Email address *</Label>
                      <Input id="email" type="email" placeholder="you@example.com"
                        value={form.email} onChange={e => set('email', e.target.value)}
                        className="mt-1 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First name *</Label>
                        <Input id="firstName" placeholder="Ali"
                          value={form.firstName} onChange={e => set('firstName', e.target.value)}
                          className="mt-1 rounded-xl" />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last name *</Label>
                        <Input id="lastName" placeholder="Khan"
                          value={form.lastName} onChange={e => set('lastName', e.target.value)}
                          className="mt-1 rounded-xl" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone number *</Label>
                      <Input id="phone" type="tel" placeholder="+92 300 1234567"
                        value={form.phone} onChange={e => set('phone', e.target.value)}
                        className="mt-1 rounded-xl" />
                    </div>
                  </div>
                )}

                {/* Step 1, Shipping */}
                {step === 1 && (
                  <div className="space-y-5">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Truck className="w-5 h-5" style={{ color: accent }} />
                      Shipping Address
                    </h2>
                    <div>
                      <Label htmlFor="address">Street address *</Label>
                      <Input id="address" placeholder="House #, Street, Area"
                        value={form.address} onChange={e => set('address', e.target.value)}
                        className="mt-1 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input id="city" placeholder="Karachi"
                          value={form.city} onChange={e => set('city', e.target.value)}
                          className="mt-1 rounded-xl" />
                      </div>
                      <div>
                        <Label htmlFor="postalCode">Postal code *</Label>
                        <Input id="postalCode" placeholder="75500"
                          value={form.postalCode} onChange={e => set('postalCode', e.target.value)}
                          className="mt-1 rounded-xl" />
                      </div>
                    </div>

                    {/* Shipping method */}
                    <div>
                      <Label className="mb-2 block">Shipping method</Label>
                      <RadioGroup value={form.shippingMethod}
                        onValueChange={v => set('shippingMethod', v)}
                        className="space-y-2">
                        {[
                          { id: 'standard', label: 'Standard Delivery', sub: '3-5 business days', price: subtotal >= freeShippingThreshold ? 'FREE' : formatCurrency(150, currency) },
                          { id: 'express', label: 'Express Delivery', sub: '1-2 business days', price: formatCurrency(300, currency) },
                          { id: 'pickup', label: 'Store Pickup', sub: 'Ready in 2 hours', price: 'FREE' },
                        ].map(opt => (
                          <label key={opt.id}
                            className={cn(
                              'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                              form.shippingMethod === opt.id ? 'border-current' : 'border-gray-200 hover:border-gray-300'
                            )}
                            style={form.shippingMethod === opt.id ? { borderColor: accent, backgroundColor: accent + '08' } : {}}
                          >
                            <RadioGroupItem value={opt.id} id={opt.id} />
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                              <p className="text-xs text-gray-500">{opt.sub}</p>
                            </div>
                            <span className={cn('text-sm font-bold', opt.price === 'FREE' ? 'text-green-600' : 'text-gray-900')}>
                              {opt.price}
                            </span>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* Step 2, Payment */}
                {step === 2 && (
                  <div className="space-y-5">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" style={{ color: accent }} />
                      Payment Method
                    </h2>

                    {loadingPM ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                      </div>
                    ) : paymentMethods.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No payment methods configured yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Contact the store owner.</p>
                      </div>
                    ) : (
                      <RadioGroup value={form.paymentMethod}
                        onValueChange={v => set('paymentMethod', v)}
                        className="space-y-2">
                        {paymentMethods.map(method => {
                          const Icon = PAYMENT_ICONS[method.provider] || CreditCard;
                          const isSelected = form.paymentMethod === method.provider;
                          return (
                            <label key={method.id}
                              className={cn(
                                'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                                isSelected ? 'border-current' : 'border-gray-200 hover:border-gray-300'
                              )}
                              style={isSelected ? { borderColor: accent, backgroundColor: accent + '08' } : {}}
                            >
                              <RadioGroupItem value={method.provider} id={method.provider} />
                              <Icon className="w-5 h-5 text-gray-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-900">{method.display_name}</p>
                                {method.description && (
                                  <p className="text-xs text-gray-500 truncate">{method.description}</p>
                                )}
                              </div>
                              {(method.fee_percentage > 0 || method.fee_fixed > 0) && (
                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                  +{method.fee_percentage > 0 ? `${method.fee_percentage}%` : formatCurrency(method.fee_fixed, currency)}
                                </Badge>
                              )}
                            </label>
                          );
                        })}
                      </RadioGroup>
                    )}

                    {/* Payment info */}
                    {form.paymentMethod && (
                      <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600 flex items-start gap-2">
                        <Lock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span>
                          {form.paymentMethod === 'cod'
                            ? 'Pay in cash when your order is delivered. Please keep exact change ready.'
                            : form.paymentMethod === 'stripe'
                            ? 'Your card details are encrypted and processed securely by Stripe.'
                            : 'Your payment will be processed securely.'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3, Review */}
                {step === 3 && (
                  <div className="space-y-5">
                    <h2 className="text-lg font-bold text-gray-900">Review Your Order</h2>

                    {/* Items */}
                    <div className="space-y-3">
                      {cart.items.map(item => (
                        <div key={`${item.productId}-${item.variantId}`}
                          className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="relative w-14 h-14 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            {item.image
                              ? <SmartProductImage src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                              : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                            {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
                            <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-bold text-sm text-gray-900 flex-shrink-0">
                            {formatCurrency(item.price * item.quantity, currency)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Delivery & payment summary */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Ship to</p>
                        <p className="text-gray-700">{form.firstName} {form.lastName}</p>
                        <p className="text-gray-500">{form.address}</p>
                        <p className="text-gray-500">{form.city}, {form.postalCode}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Payment</p>
                        <p className="text-gray-700 capitalize">
                          {paymentMethods.find(m => m.provider === form.paymentMethod)?.display_name || form.paymentMethod}
                        </p>
                        <p className="text-gray-500">{form.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button variant="outline" onClick={back} disabled={step === 0} className="rounded-xl gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  {step < 3 ? (
                    <Button onClick={next} className="rounded-xl gap-2 font-bold"
                      style={{ backgroundColor: accent }}>
                      Continue <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button onClick={placeOrder} disabled={processing}
                      className="rounded-xl gap-2 font-bold px-8"
                      style={{ backgroundColor: accent }}>
                      {processing
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                        : <><Lock className="w-4 h-4" /> Place Order</>
                      }
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Order summary sidebar ──────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="rounded-2xl shadow-sm border-0">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-bold text-gray-900">
                    Order Summary
                    <span className="text-sm font-normal text-gray-500 ml-2">({itemCount} items)</span>
                  </h3>

                  {/* Items preview */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cart.items.map(item => (
                      <div key={`${item.productId}-${item.variantId}`}
                        className="flex justify-between text-sm">
                        <span className="text-gray-600 truncate mr-2">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="font-medium flex-shrink-0">
                          {formatCurrency(item.price * item.quantity, currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

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
                      <span className="text-gray-500">Tax</span>
                      <span className="font-medium">{formatCurrency(tax, currency)}</span>
                    </div>
                    {orderDiscount > 0 && (
                      <>
                        {adjustments?.memberDiscount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Member discount</span>
                            <span className="font-medium">-{formatCurrency(adjustments.memberDiscount, currency)}</span>
                          </div>
                        )}
                        {adjustments?.promoDiscount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Promo{adjustments.promoCode ? ` (${adjustments.promoCode})` : ''}</span>
                            <span className="font-medium">-{formatCurrency(adjustments.promoDiscount, currency)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-xl font-semibold tabular-nums" style={{ color: accent }}>
                      {formatCurrency(total, currency)}
                    </span>
                  </div>

                  {/* Security badges */}
                  <div className="flex items-center justify-center gap-3 pt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Secure</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Encrypted</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
