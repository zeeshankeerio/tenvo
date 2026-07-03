'use client';

import { useState, use, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import {
  Package, Clock, CheckCircle, XCircle, Truck, Search,
  Mail, Hash, ChevronRight, DollarSign, MapPin,
  AlertCircle, RefreshCw, ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { StoreBuyerPageShell } from '@/components/storefront/StoreBuyerPageShell';

async function fetchPublicOrders(businessDomain, { email, orderNumber }) {
  const params = new URLSearchParams({ email });
  if (orderNumber) params.set('orderNumber', orderNumber);
  const res = await fetch(`/api/storefront/${encodeURIComponent(businessDomain)}/orders?${params}`);
  return res.json();
}

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'bg-amber-100 text-amber-700',   icon: Clock },
  confirmed:  { label: 'Confirmed',  color: 'bg-blue-100 text-blue-700',     icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-700', icon: RefreshCw },
  shipped:    { label: 'Shipped',    color: 'bg-indigo-100 text-indigo-700', icon: Truck },
  delivered:  { label: 'Delivered',  color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-100 text-red-700',       icon: XCircle },
  refunded:   { label: 'Refunded',   color: 'bg-gray-100 text-gray-600',     icon: RefreshCw },
};

const PAYMENT_CONFIG = {
  pending:           { label: 'Unpaid',            color: 'bg-amber-100 text-amber-700' },
  awaiting_payment:  { label: 'Awaiting Payment',  color: 'bg-amber-100 text-amber-700' },
  paid:              { label: 'Paid',              color: 'bg-green-100 text-green-700' },
  failed:            { label: 'Failed',            color: 'bg-red-100 text-red-700' },
  refunded:          { label: 'Refunded',          color: 'bg-gray-100 text-gray-600' },
};

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function OrderHistoryPage({ params }) {
  const { businessDomain } = use(params);
  const { business, settings, currency: ctxCurrency } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);

  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email')?.trim() ?? '';

  const [tab, setTab] = useState('email'); // 'email' | 'number'
  const [emailInput, setEmailInput] = useState(emailFromUrl);
  const [orderNumInput, setOrderNumInput] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const autoFetchedEmailRef = useRef(false);

  const currency = ctxCurrency || 'PKR';

  // Auto-search when redirected from checkout with ?email=
  useEffect(() => {
    const emailParam = searchParams.get('email')?.trim();
    if (!emailParam || autoFetchedEmailRef.current) return;
    autoFetchedEmailRef.current = true;
    setLoading(true);
    fetchPublicOrders(businessDomain, { email: emailParam })
      .then((result) => {
        setOrders(result?.success ? (result.orders || []) : []);
        if (!result?.success) setError(result?.error || 'Unable to load orders.');
      })
      .catch(() => {
        setOrders([]);
        setError('Unable to load orders. Please try again.');
      })
      .finally(() => {
        setLoading(false);
        setSearched(true);
      });
  }, [businessDomain, searchParams]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    const email = emailInput.trim().toLowerCase();
    const orderNumber = orderNumInput.trim();
    if (!email) {
      setError('Please enter the email you used at checkout.');
      return;
    }
    if (tab === 'number' && !orderNumber) {
      setError('Please enter your order number.');
      return;
    }
    setLoading(true);
    setSearched(false);
    try {
      const result = await fetchPublicOrders(businessDomain, {
        email,
        orderNumber: tab === 'number' ? orderNumber : undefined,
      });
      if (result?.success) {
        setOrders(result.orders || []);
      } else {
        setOrders([]);
        setError(result?.error || 'Unable to load orders. Please try again.');
      }
    } catch {
      setOrders([]);
      setError('Unable to load orders. Please try again.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const reset = () => {
    setOrders([]);
    setSearched(false);
    setError('');
    setEmailInput('');
    setOrderNumInput('');
    setExpandedId(null);
  };

  return (
    <StoreBuyerPageShell
      businessDomain={businessDomain}
      title="Order tracking"
      subtitle={`Find and track your orders with ${business?.business_name || 'this store'}.`}
    >
      <div className="space-y-4 sm:space-y-6">

        {/* ── Lookup card */}
        {!searched && (
          <Card className="rounded-2xl shadow-sm border-0">
            <CardContent className="p-6 space-y-5">
              {/* Tab switcher */}
              <div className="flex rounded-xl border border-gray-200 overflow-hidden p-1 gap-1 bg-gray-50">
                {[
                  { id: 'email',  label: 'By Email',        icon: Mail },
                  { id: 'number', label: 'By Order Number',  icon: Hash },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
                      tab === id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handleSearch} className="space-y-3">
                <Input
                  type="email"
                  placeholder="Email used at checkout"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="rounded-xl"
                  required
                />
                {tab === 'number' ? (
                  <Input
                    type="text"
                    placeholder="Order number e.g. ORD-20240523-0042"
                    value={orderNumInput}
                    onChange={(e) => setOrderNumInput(e.target.value.toUpperCase())}
                    className="rounded-xl font-mono"
                    required
                  />
                ) : null}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 rounded-xl font-bold sm:w-auto sm:px-6"
                  style={{ backgroundColor: accent }}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {loading ? 'Searching…' : 'Find orders'}
                </Button>
              </form>

              <p className="text-center text-xs text-gray-400">
                {tab === 'email'
                  ? 'We will show all orders linked to this email.'
                  : 'Enter the email and order number from your confirmation.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Results header */}
        {searched && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {orders.length > 0
                ? <><span className="font-semibold text-gray-900">{orders.length}</span> order{orders.length !== 1 ? 's' : ''} found</>
                : 'No orders found'}
            </p>
            <button
              onClick={reset}
              className="text-sm font-semibold hover:opacity-80 transition-opacity"
              style={{ color: accent }}
            >
              ← Search again
            </button>
          </div>
        )}

        {/* ── Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Empty state */}
        {searched && !loading && orders.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No orders found</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              {tab === 'email'
                ? "We couldn't find any orders for that email. Make sure it matches what you used at checkout."
                : 'No matching order for that email and order number.'}
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href={`/store/${businessDomain}/products`}>
                <Button className="rounded-xl gap-2 font-bold" style={{ backgroundColor: accent }}>
                  <ShoppingBag className="w-4 h-4" /> Browse products
                </Button>
              </Link>
              <Link href={`/store/${businessDomain}/contact`} className="text-sm font-semibold hover:underline" style={{ color: accent }}>
                Need help? Contact us
              </Link>
            </div>
          </div>
        )}

        {/* ── Orders list */}
        {orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => {
              const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const pc = PAYMENT_CONFIG[order.payment_status] || PAYMENT_CONFIG.pending;
              const StatusIcon = sc.icon;
              const isExpanded = expandedId === order.id;
              const addr = order.shipping_address;

              return (
                <Card key={order.id} className="rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Card header */}
                  <CardHeader className="bg-gray-50/60 border-b border-gray-100 px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-gray-900 text-base">
                          #{order.order_number}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(order.created_at)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn('text-xs font-semibold border-0', sc.color)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {sc.label}
                        </Badge>
                        <Badge className={cn('text-xs font-semibold border-0', pc.color)}>
                          <DollarSign className="w-3 h-3 mr-1" />
                          {pc.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-5 py-4 space-y-4">
                    {/* Items preview */}
                    <div className="space-y-2">
                      {(isExpanded ? order.items : order.items?.slice(0, 3))?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {item.image_url ? (
                                <SmartProductImage src={item.image_url} alt={item.product_name} width={40} height={40} className="object-cover w-full h-full" />
                              ) : (
                                <Package className="w-4 h-4 text-gray-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{item.product_name}</p>
                              <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <p className="font-semibold text-gray-900 flex-shrink-0">
                            {formatCurrency(parseFloat(item.total_price || 0), order.currency || currency)}
                          </p>
                        </div>
                      ))}
                      {!isExpanded && order.items?.length > 3 && (
                        <p className="text-xs text-gray-400">+{order.items.length - 3} more items</p>
                      )}
                    </div>

                    {/* Totals + address (expanded) */}
                    {isExpanded && (
                      <div className="space-y-3 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="text-right font-medium">{formatCurrency(parseFloat(order.subtotal || 0), order.currency || currency)}</span>
                          {parseFloat(order.shipping_amount) > 0 && (
                            <>
                              <span className="text-gray-500">Shipping</span>
                              <span className="text-right font-medium">{formatCurrency(parseFloat(order.shipping_amount), order.currency || currency)}</span>
                            </>
                          )}
                          {parseFloat(order.tax_amount) > 0 && (
                            <>
                              <span className="text-gray-500">Tax</span>
                              <span className="text-right font-medium">{formatCurrency(parseFloat(order.tax_amount), order.currency || currency)}</span>
                            </>
                          )}
                          {parseFloat(order.discount_amount) > 0 && (
                            <>
                              <span className="text-gray-500 text-green-600">Discount</span>
                              <span className="text-right font-medium text-green-600">-{formatCurrency(parseFloat(order.discount_amount), order.currency || currency)}</span>
                            </>
                          )}
                        </div>

                        {addr ? (
                          <div className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-sm">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                            <div className="text-gray-600">
                              {typeof addr === 'string' ? (
                                <p>{addr}</p>
                              ) : (
                                <>
                                  {addr.name && <p className="font-medium text-gray-800">{addr.name}</p>}
                                  {addr.street && <p>{addr.street}</p>}
                                  {addr.city && (
                                    <p>
                                      {addr.city}
                                      {addr.state ? `, ${addr.state}` : ''}
                                      {addr.zip ? ` ${addr.zip}` : ''}
                                    </p>
                                  )}
                                  {addr.country && <p>{addr.country}</p>}
                                  {addr.phone && <p className="mt-1 text-gray-500">{addr.phone}</p>}
                                </>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Footer row */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-xs text-gray-400">Total</span>
                        <p className="text-lg font-black text-gray-900">
                          {formatCurrency(parseFloat(order.total_amount || 0), order.currency || currency)}
                        </p>
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: accent }}
                      >
                        {isExpanded ? 'Show less' : 'View details'}
                        <ChevronRight className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-90')} />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Continue shopping CTA */}
        {searched && (
          <div className="text-center pt-4">
            <Link href={`/store/${businessDomain}/products`} className="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: accent }}>
              <ShoppingBag className="w-4 h-4" /> Continue Shopping
            </Link>
          </div>
        )}

      </div>
    </StoreBuyerPageShell>
  );
}
