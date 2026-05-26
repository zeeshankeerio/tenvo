'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Package, Clock, CheckCircle, XCircle, Truck, Search,
  Mail, Hash, ArrowLeft, ChevronRight, DollarSign, MapPin,
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
import { getStorefrontOrders } from '@/lib/actions/storefront/business';

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'bg-amber-100 text-amber-700',   icon: Clock },
  confirmed:  { label: 'Confirmed',  color: 'bg-blue-100 text-blue-700',     icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-700', icon: RefreshCw },
  shipped:    { label: 'Shipped',    color: 'bg-indigo-100 text-indigo-700', icon: Truck },
  delivered:  { label: 'Delivered',  color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-100 text-red-700',       icon: XCircle },
};

const PAYMENT_CONFIG = {
  pending:  { label: 'Unpaid',   color: 'bg-amber-100 text-amber-700' },
  paid:     { label: 'Paid',     color: 'bg-green-100 text-green-700' },
  failed:   { label: 'Failed',   color: 'bg-red-100 text-red-700' },
  refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-600' },
};

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function OrderHistoryPage({ params }) {
  const { businessDomain } = use(params);
  const { business, settings, currency: ctxCurrency } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);

  const [tab, setTab] = useState('email'); // 'email' | 'number'
  const [emailInput, setEmailInput] = useState('');
  const [orderNumInput, setOrderNumInput] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const currency = ctxCurrency || 'PKR';

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    const query = tab === 'email' ? emailInput.trim() : orderNumInput.trim();
    if (!query) return;
    setLoading(true);
    setSearched(false);
    try {
      const filters = tab === 'email'
        ? { customerEmail: query, limit: 50 }
        : { orderNumber: query, limit: 10 };
      const result = await getStorefrontOrders(business.id, filters);
      if (result?.success) {
        setOrders(result.orders || []);
      } else {
        setOrders([]);
        setError('Unable to load orders. Please try again.');
      }
    } catch (err) {
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
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero strip */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link
            href={`/store/${businessDomain}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
          </Link>
          <h1 className="text-3xl font-black text-gray-900">Order Tracking</h1>
          <p className="text-gray-500 mt-1">
            Find and track your orders with {business?.business_name}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

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
              <form onSubmit={handleSearch} className="flex gap-3">
                {tab === 'email' ? (
                  <Input
                    type="email"
                    placeholder="Enter the email you used at checkout"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="flex-1 rounded-xl"
                    required
                  />
                ) : (
                  <Input
                    type="text"
                    placeholder="e.g. ORD-20240523-0042"
                    value={orderNumInput}
                    onChange={e => setOrderNumInput(e.target.value.toUpperCase())}
                    className="flex-1 rounded-xl font-mono"
                    required
                  />
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="gap-2 rounded-xl px-6 font-bold"
                  style={{ backgroundColor: accent }}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {loading ? 'Searching…' : 'Find Orders'}
                </Button>
              </form>

              <p className="text-xs text-gray-400 text-center">
                Use the email address or order number from your confirmation
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
                ? `We couldn't find any orders for that email. Make sure it matches what you used at checkout.`
                : `Order number not found. Check the number in your confirmation email.`}
            </p>
            <Link href={`/store/${businessDomain}/products`}>
              <Button className="rounded-xl gap-2 font-bold" style={{ backgroundColor: accent }}>
                <ShoppingBag className="w-4 h-4" /> Browse Products
              </Button>
            </Link>
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
                                <Image src={item.image_url} alt={item.product_name} width={40} height={40} className="object-cover w-full h-full" />
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

                        {addr && (
                          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl text-sm">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="text-gray-600">
                              {addr.name && <p className="font-medium text-gray-800">{addr.name}</p>}
                              {addr.street && <p>{addr.street}</p>}
                              {addr.city && <p>{addr.city}{addr.state ? `, ${addr.state}` : ''}{addr.zip ? ` ${addr.zip}` : ''}</p>}
                              {addr.country && <p>{addr.country}</p>}
                              {addr.phone && <p className="mt-1 text-gray-500">📞 {addr.phone}</p>}
                            </div>
                          </div>
                        )}
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
    </div>
  );
}
