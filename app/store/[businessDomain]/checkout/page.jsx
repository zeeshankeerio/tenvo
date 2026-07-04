'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import {
  CreditCard, Truck, MapPin, Check, ChevronRight,
  Shield, Lock, AlertCircle, Wallet, Banknote,
  Smartphone, Building2, Loader2, Package, ArrowLeft, Download, Bitcoin
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
import { CryptoCheckoutPanel } from '@/components/storefront/CryptoCheckoutPanel';
import { StripeCheckoutPanel } from '@/components/storefront/StripeCheckoutPanel';
import { isRestaurantElevatedStore } from '@/lib/storefront/restaurantStorefront';
import { useRestaurantChromeOptional } from '@/components/storefront/restaurant/RestaurantChromeContext';
import {
  restaurantOrderModeToShipping,
  isRestaurantPickupOrder,
  buildRestaurantOrderNotes,
  RESTAURANT_UI,
  restaurantOrderModeLabel,
  normalizeRestaurantOrderMode,
  getRestaurantCheckoutSteps,
  resolveRestaurantShippingCost,
  getRestaurantFeeLabel,
} from '@/lib/storefront/restaurantMenu';
import { RESTAURANT_ORDER_MODES } from '@/lib/storefront/restaurantStorefront';
import { RestaurantCartOrderMode } from '@/components/storefront/restaurant/RestaurantCartOrderMode';
import { restaurantInputClass } from '@/components/storefront/restaurant/RestaurantStoreCard';
import {
  placeStorefrontOrder,
  validateStorefrontCheckoutCart,
} from '@/lib/storefront/placeStorefrontOrder';

const PAYMENT_ICONS = {
  stripe: CreditCard, cod: Banknote, easypaisa: Smartphone,
  jazzcash: Smartphone, bank_transfer: Building2, paypal: Wallet,
  card: CreditCard, wallet: Wallet, crypto: Bitcoin,
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
  const restaurantStore = isRestaurantElevatedStore(business?.category);
  const restaurantChrome = useRestaurantChromeOptional();
  const restaurantOrderMode = normalizeRestaurantOrderMode(restaurantChrome?.orderMode || 'delivery');
  const restaurantPickup = restaurantStore && isRestaurantPickupOrder(restaurantOrderMode);

  const freeShippingThreshold = settings?.freeShippingThreshold || 2000;
  const taxRate = settings?.taxRate ?? 0.17;

  // Pre-fill shipping method from cart page selection (?shipping=express etc.)
  const shippingParam = searchParams.get('shipping');
  const restaurantDefaultShipping =
    restaurantStore && restaurantChrome?.orderMode
      ? restaurantOrderModeToShipping(restaurantChrome.orderMode)
      : null;
  const defaultShipping = ['standard', 'express', 'pickup'].includes(shippingParam)
    ? shippingParam
    : restaurantDefaultShipping || 'standard';

  const [step, setStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPM, setLoadingPM] = useState(true);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [cryptoCheckout, setCryptoCheckout] = useState(null);
  const [stripeCheckout, setStripeCheckout] = useState(null);

  const isDigitalCart =
    cart.items.length > 0 && cart.items.every((i) => i.fulfillmentType === 'digital');

  const activeSteps = restaurantStore
    ? getRestaurantCheckoutSteps(restaurantOrderMode).map((s, i) => ({
        ...STEPS.find((x) => x.id === s.id) || STEPS[i] || STEPS[0],
        label: s.label,
      }))
    : isDigitalCart
      ? STEPS.filter((s) => s.id !== 'shipping')
      : STEPS;

  const [form, setForm] = useState({
    email: '', firstName: '', lastName: '', phone: '',
    address: '', city: '', postalCode: '', country: 'PK',
    shippingMethod: defaultShipping, paymentMethod: '',
    tableNumber: '', orderNotes: '',
  });

  const { subtotal, itemCount } = calculateTotals();
  const adjustments = cart.checkoutAdjustments || checkoutAdjustments;
  const orderDiscount = adjustments
    ? Math.min(
        subtotal,
        (adjustments.promoDiscount || 0) + (adjustments.memberDiscount || 0)
      )
    : 0;
  const shippingCost = isDigitalCart
    ? 0
    : restaurantStore
      ? resolveRestaurantShippingCost({
          orderMode: restaurantOrderMode,
          subtotal,
          freeShippingThreshold,
          shippingMethod: form.shippingMethod,
        })
      : form.shippingMethod === 'express'
        ? 300
        : form.shippingMethod === 'pickup'
          ? 0
          : subtotal >= freeShippingThreshold
            ? 0
            : 150;
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
          const cod = res.methods.find((m) => m.provider === 'cod');
          const defaultProvider = cod?.provider || res.methods[0].provider;
          setForm((f) => ({
            ...f,
            paymentMethod:
              f.paymentMethod && res.methods.some((m) => m.provider === f.paymentMethod)
                ? f.paymentMethod
                : defaultProvider,
          }));
        }
      } catch { /* non-critical */ }
      finally { setLoadingPM(false); }
    })();
  }, [businessId]);

  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (restaurantStore && modeParam && restaurantChrome?.setOrderMode) {
      restaurantChrome.setOrderMode(normalizeRestaurantOrderMode(modeParam));
    }
  }, [searchParams, restaurantStore, restaurantChrome]);

  useEffect(() => {
    if (!restaurantStore || !restaurantChrome?.orderModeHydrated) return;
    const nextShipping = restaurantOrderModeToShipping(restaurantOrderMode);
    setForm((f) => (f.shippingMethod === nextShipping ? f : { ...f, shippingMethod: nextShipping }));
  }, [restaurantStore, restaurantOrderMode, restaurantChrome?.orderModeHydrated]);

  useEffect(() => {
    if (step >= activeSteps.length) {
      setStep(Math.max(0, activeSteps.length - 1));
    }
  }, [activeSteps.length, step]);

  useEffect(() => {
    if (!hydrated || !adjustments?.memberEmail) return;
    setForm((f) => (f.email ? f : { ...f, email: adjustments.memberEmail }));
  }, [hydrated, adjustments?.memberEmail]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const validate = (s) => {
    const stepId = activeSteps[s]?.id;
    if (stepId === 'information') {
      if (!form.email || !form.firstName || !form.lastName || !form.phone) {
        toast.error('Please fill in all required fields'); return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        toast.error('Please enter a valid email'); return false;
      }
    }
    if (stepId === 'shipping') {
      if (restaurantPickup) return true;
      if (!form.address || !form.city || !form.postalCode) {
        toast.error(restaurantStore ? 'Please enter your delivery address' : 'Please enter your shipping address');
        return false;
      }
    }
    if (stepId === 'payment' && !form.paymentMethod) {
      toast.error('Please select a payment method'); return false;
    }
    return true;
  };

  const next = () => {
    if (validate(step)) setStep((s) => Math.min(s + 1, activeSteps.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const placeOrder = async () => {
    if (!businessId) { toast.error('Store not ready'); return; }
    if (cart.businessId && cart.businessId !== businessId) {
      toast.error('Your cart contains items from another store. Please clear your cart.');
      return;
    }
    setProcessing(true);
    try {
      await validateStorefrontCheckoutCart(
        businessDomain,
        cart.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId || null,
          quantity: i.quantity,
          name: i.name,
        }))
      );

      const orderPayload = {
          customer: {
            email: form.email,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
          },
          shippingAddress: isDigitalCart
            ? {
                address: 'Digital delivery',
                city: 'Digital',
                postalCode: '00000',
                country: form.country,
              }
            : {
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
          ...(restaurantStore
            ? {
                restaurantOrderMode,
                tableNumber: form.tableNumber?.trim() || undefined,
                orderNotes: form.orderNotes?.trim() || undefined,
                notes: buildRestaurantOrderNotes({
                  orderMode: restaurantOrderMode,
                  tableNumber: form.tableNumber,
                  orderNotes: form.orderNotes,
                  orderModeLabel: restaurantOrderModeLabel(restaurantOrderMode, RESTAURANT_ORDER_MODES),
                }) || undefined,
              }
            : {}),
      };

      const { result } = await placeStorefrontOrder(businessDomain, orderPayload);

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
        restaurantOrderMode: restaurantStore ? restaurantOrderMode : undefined,
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

      if (form.paymentMethod === 'crypto') {
        setCryptoCheckout({
          orderNumber: result.order.orderNumber,
          email: form.email,
        });
        clearCart();
        toast.success('Order created — complete crypto payment below');
        return;
      }

      if (form.paymentMethod === 'stripe') {
        setStripeCheckout({
          orderNumber: result.order.orderNumber,
          email: form.email,
        });
        clearCart();
        toast.success('Order created — complete card payment below');
        return;
      }

      setOrderDone(true);
      clearCart();
      toast.success(`Order ${result.order.orderNumber} placed!`);
    } catch (err) {
      if (err.status === 409 && !err.retryable) {
        toast.error(err.message || 'Some items in your cart are no longer available');
        router.push(`/store/${businessDomain}/cart`);
        return;
      }
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
      <div className={cn('min-h-screen flex items-center justify-center', restaurantStore ? RESTAURANT_UI.page : 'bg-gray-50')}>
        <Loader2 className={cn('w-8 h-8 animate-spin', restaurantStore ? 'text-neutral-500' : 'text-gray-400')} />
      </div>
    );
  }

  // ── Stripe payment screen (after order created)
  if (stripeCheckout && !orderDone) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          <StripeCheckoutPanel
            businessDomain={businessDomain}
            orderNumber={stripeCheckout.orderNumber}
            customerEmail={stripeCheckout.email}
            accent={accent}
            onPaid={() => {
              setOrderDone(true);
              setStripeCheckout(null);
              toast.success(`Order ${stripeCheckout.orderNumber} paid!`);
            }}
            onCancel={() => router.push(`/store/${businessDomain}/cart`)}
          />
        </div>
      </div>
    );
  }

  // ── Crypto payment screen (after order created)
  if (cryptoCheckout && !orderDone) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          <CryptoCheckoutPanel
            businessDomain={businessDomain}
            orderNumber={cryptoCheckout.orderNumber}
            customerEmail={cryptoCheckout.email}
            accent={accent}
            onPaid={() => {
              setOrderDone(true);
              setCryptoCheckout(null);
            }}
            onCancel={() => router.push(`/store/${businessDomain}/cart`)}
          />
        </div>
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
                    <span className="text-gray-500">
                      {restaurantStore && receipt?.restaurantOrderMode
                        ? getRestaurantFeeLabel(receipt.restaurantOrderMode)
                        : 'Shipping'}
                    </span>
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
    <div className={cn('min-h-screen', restaurantStore ? RESTAURANT_UI.page : 'bg-gray-50')}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Link
          href={`/store/${businessDomain}/cart`}
          className={cn(
            'inline-flex items-center gap-1.5 text-sm mb-6 transition-colors',
            restaurantStore ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
          )}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </Link>

        <h1 className={cn('text-2xl font-semibold mb-6', restaurantStore ? 'text-white' : 'text-gray-900')}>
          {restaurantStore ? 'Complete your order' : 'Checkout'}
        </h1>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
          {activeSteps.map((s, i) => (
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
              <span className={cn('text-sm font-medium hidden sm:block', i <= step ? (restaurantStore ? 'text-white' : 'text-gray-900') : 'text-gray-400')}>
                {s.label}
              </span>
              {i < activeSteps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main form ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div
              className={cn(
                'p-6 sm:p-8',
                restaurantStore
                  ? RESTAURANT_UI.card
                  : 'rounded-2xl border-0 bg-white shadow-sm'
              )}
            >
                {activeSteps[step]?.id === 'information' && (
                  <div className="space-y-5">
                    <h2 className={cn('text-lg font-bold flex items-center gap-2', restaurantStore ? 'text-white' : 'text-gray-900')}>
                      <MapPin className="w-5 h-5" style={{ color: accent }} />
                      {restaurantStore ? 'Your details' : 'Contact Information'}
                    </h2>

                    {restaurantStore ? (
                      <RestaurantCartOrderMode
                        onShippingChange={(m) => set('shippingMethod', m)}
                        className="mb-1"
                      />
                    ) : null}

                    <div>
                      <Label htmlFor="email" className={restaurantStore ? 'text-neutral-400' : ''}>Email address *</Label>
                      <Input id="email" type="email" placeholder="you@example.com"
                        value={form.email} onChange={e => set('email', e.target.value)}
                        className={cn('mt-1 rounded-xl', restaurantStore && restaurantInputClass('mt-1'))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName" className={restaurantStore ? 'text-neutral-400' : ''}>First name *</Label>
                        <Input id="firstName" placeholder="Ali"
                          value={form.firstName} onChange={e => set('firstName', e.target.value)}
                          className={cn('mt-1 rounded-xl', restaurantStore && restaurantInputClass('mt-1'))} />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className={restaurantStore ? 'text-neutral-400' : ''}>Last name *</Label>
                        <Input id="lastName" placeholder="Khan"
                          value={form.lastName} onChange={e => set('lastName', e.target.value)}
                          className={cn('mt-1 rounded-xl', restaurantStore && restaurantInputClass('mt-1'))} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone" className={restaurantStore ? 'text-neutral-400' : ''}>Phone number *</Label>
                      <Input id="phone" type="tel" placeholder="+92 300 1234567"
                        value={form.phone} onChange={e => set('phone', e.target.value)}
                        className={cn('mt-1 rounded-xl', restaurantStore && restaurantInputClass('mt-1'))} />
                    </div>

                    {restaurantStore && restaurantOrderMode === 'dine-in' ? (
                      <div>
                        <Label htmlFor="tableNumber" className="text-neutral-400">Table number</Label>
                        <Input
                          id="tableNumber"
                          placeholder="e.g. 12, Patio A"
                          value={form.tableNumber}
                          onChange={(e) => set('tableNumber', e.target.value)}
                          className={restaurantInputClass('mt-1')}
                        />
                      </div>
                    ) : null}

                    {restaurantStore ? (
                      <div>
                        <Label htmlFor="orderNotes" className="text-neutral-400">Special instructions</Label>
                        <textarea
                          id="orderNotes"
                          rows={3}
                          placeholder="Allergies, spice level, pickup time…"
                          value={form.orderNotes}
                          onChange={(e) => set('orderNotes', e.target.value)}
                          className={restaurantInputClass('mt-1 resize-none')}
                        />
                      </div>
                    ) : null}
                  </div>
                )}

                {activeSteps[step]?.id === 'shipping' && (
                  <div className="space-y-5">
                    <h2 className={cn('text-lg font-bold flex items-center gap-2', restaurantStore ? 'text-white' : 'text-gray-900')}>
                      <Truck className="w-5 h-5" style={{ color: accent }} />
                      {restaurantStore ? 'Delivery address' : 'Shipping Address'}
                    </h2>
                    <div>
                      <Label htmlFor="address" className={restaurantStore ? 'text-neutral-400' : ''}>Street address *</Label>
                      <Input id="address" placeholder="House #, Street, Area"
                        value={form.address} onChange={e => set('address', e.target.value)}
                        className={cn('mt-1 rounded-xl', restaurantStore && restaurantInputClass('mt-1'))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city" className={restaurantStore ? 'text-neutral-400' : ''}>City *</Label>
                        <Input id="city" placeholder="Karachi"
                          value={form.city} onChange={e => set('city', e.target.value)}
                          className={cn('mt-1 rounded-xl', restaurantStore && restaurantInputClass('mt-1'))} />
                      </div>
                      <div>
                        <Label htmlFor="postalCode" className={restaurantStore ? 'text-neutral-400' : ''}>Postal code *</Label>
                        <Input id="postalCode" placeholder="75500"
                          value={form.postalCode} onChange={e => set('postalCode', e.target.value)}
                          className={cn('mt-1 rounded-xl', restaurantStore && restaurantInputClass('mt-1'))} />
                      </div>
                    </div>

                    {!restaurantStore && (
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
                    )}
                  </div>
                )}

                {activeSteps[step]?.id === 'payment' && (
                  <div className="space-y-5">
                    <h2 className={cn('text-lg font-bold flex items-center gap-2', restaurantStore ? 'text-white' : 'text-gray-900')}>
                      <CreditCard className="w-5 h-5" style={{ color: accent }} />
                      Payment Method
                    </h2>

                    {loadingPM ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className={cn('w-6 h-6 animate-spin', restaurantStore ? 'text-neutral-500' : 'text-gray-400')} />
                      </div>
                    ) : paymentMethods.length === 0 ? (
                      <div className={cn('text-center py-10', restaurantStore ? 'text-neutral-400' : 'text-gray-500')}>
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No payment methods configured yet.</p>
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
                                isSelected
                                  ? 'border-current'
                                  : restaurantStore
                                    ? 'border-neutral-700 hover:border-neutral-600'
                                    : 'border-gray-200 hover:border-gray-300'
                              )}
                              style={isSelected ? { borderColor: accent, backgroundColor: accent + (restaurantStore ? '18' : '08') } : {}}
                            >
                              <RadioGroupItem value={method.provider} id={method.provider} />
                              <Icon className={cn('w-5 h-5 flex-shrink-0', restaurantStore ? 'text-neutral-400' : 'text-gray-600')} />
                              <div className="flex-1 min-w-0">
                                <p className={cn('font-semibold text-sm', restaurantStore ? 'text-white' : 'text-gray-900')}>{method.display_name}</p>
                                {method.description && (
                                  <p className={cn('text-xs truncate', restaurantStore ? 'text-neutral-500' : 'text-gray-500')}>{method.description}</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </RadioGroup>
                    )}
                  </div>
                )}

                {activeSteps[step]?.id === 'review' && (
                  <div className="space-y-5">
                    <h2 className={cn('text-lg font-bold', restaurantStore ? 'text-white' : 'text-gray-900')}>Review your order</h2>

                    <div className="space-y-3">
                      {cart.items.map(item => (
                        <div key={`${item.productId}-${item.variantId}`}
                          className={cn(
                            'flex gap-3 p-3 rounded-xl',
                            restaurantStore ? 'bg-neutral-900/80 border border-neutral-800' : 'bg-gray-50'
                          )}>
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800">
                            {item.image
                              ? <SmartProductImage src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                              : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('font-semibold text-sm truncate', restaurantStore ? 'text-white' : 'text-gray-900')}>{item.name}</p>
                            <p className="text-xs text-neutral-500 mt-0.5">Qty: {item.quantity}</p>
                          </div>
                          <p className={cn('font-bold text-sm flex-shrink-0', restaurantStore ? 'text-white' : 'text-gray-900')}>
                            {formatCurrency(item.price * item.quantity, currency)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <Separator className={restaurantStore ? 'bg-neutral-800' : ''} />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-neutral-500 uppercase mb-1">
                          {restaurantPickup ? 'Service' : isDigitalCart ? 'Delivery' : 'Ship to'}
                        </p>
                        {restaurantPickup ? (
                          <>
                            <p className={restaurantStore ? 'text-neutral-200' : 'text-gray-700'}>
                              {restaurantOrderModeLabel(restaurantOrderMode, RESTAURANT_ORDER_MODES)}
                            </p>
                            {form.tableNumber ? (
                              <p className="text-neutral-500">Table {form.tableNumber}</p>
                            ) : null}
                          </>
                        ) : isDigitalCart ? (
                          <>
                            <p className="text-gray-700">Digital delivery</p>
                            <p className="text-gray-500">{form.email}</p>
                          </>
                        ) : (
                          <>
                            <p className={restaurantStore ? 'text-neutral-200' : 'text-gray-700'}>{form.firstName} {form.lastName}</p>
                            <p className="text-neutral-500">{form.address}</p>
                            <p className="text-neutral-500">{form.city}, {form.postalCode}</p>
                          </>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Payment</p>
                        <p className={restaurantStore ? 'text-neutral-200' : 'text-gray-700'}>
                          {paymentMethods.find(m => m.provider === form.paymentMethod)?.display_name || form.paymentMethod}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className={cn('flex justify-between mt-8 pt-6 border-t', restaurantStore && 'border-neutral-800')}>
                  <Button variant="outline" onClick={back} disabled={step === 0} className={cn('rounded-xl gap-2', restaurantStore && 'border-neutral-700 bg-transparent text-neutral-200 hover:bg-neutral-800')}>
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  {step < activeSteps.length - 1 ? (
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
            </div>
          </div>

          {/* ── Order summary sidebar ──────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className={cn('rounded-2xl shadow-sm border-0', restaurantStore && 'bg-[#141414] border border-neutral-800')}>
                <CardContent className="p-6 space-y-4">
                  <h3 className={cn('font-bold', restaurantStore ? 'text-white' : 'text-gray-900')}>
                    Order Summary
                    <span className={cn('text-sm font-normal ml-2', restaurantStore ? 'text-neutral-500' : 'text-gray-500')}>({itemCount} items)</span>
                  </h3>

                  {/* Items preview */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cart.items.map(item => (
                      <div key={`${item.productId}-${item.variantId}`}
                        className="flex justify-between text-sm">
                        <span className={cn('truncate mr-2', restaurantStore ? 'text-neutral-400' : 'text-gray-600')}>
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
                      <span className={restaurantStore ? 'text-neutral-500' : 'text-gray-500'}>
                        {restaurantStore ? getRestaurantFeeLabel(restaurantOrderMode) : 'Shipping'}
                      </span>
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
