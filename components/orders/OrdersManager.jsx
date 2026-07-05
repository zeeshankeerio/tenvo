'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package, Search, Filter, Eye, CheckCircle, XCircle,
  Truck, Clock, DollarSign, User, Calendar, ArrowLeft,
  ChevronLeft, ChevronRight, RefreshCw, PlusCircle, Banknote,
  CreditCard, Smartphone, FileText, Hash, StickyNote, X, BadgeCheck,
  UtensilsCrossed,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/utils';
import { getBusinessOrders, getOrderDetails, updateOrderStatus } from '@/lib/actions/storefront/orders';
import { updateOrderPaymentStatus, recordManualPayment } from '@/lib/actions/storefront/payments';
import { cn } from '@/lib/utils';
import { useMembershipHubAccess } from '@/lib/hooks/useMembershipHubAccess';
import toast from 'react-hot-toast';
import { MobileTabHeader, MobileStatStrip } from '@/components/mobile/MobileTabHeader';
import { useStorefrontEmbedded } from '@/lib/context/StorefrontMobileContext';
import { MOBILE_INPUT_CLASS, hubDialogContentClass } from '@/lib/utils/formMobileStyles';
import { parseStorefrontShippingAddress } from '@/lib/storefront/storefrontOrderAddress';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: DollarSign },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  awaiting_payment: { label: 'Awaiting Payment', color: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
};

const PAYMENT_MODES = [
  { value: 'cash',          label: 'Cash',          icon: Banknote },
  { value: 'bank_transfer', label: 'Bank Transfer',  icon: CreditCard },
  { value: 'easypaisa',     label: 'EasyPaisa',      icon: Smartphone },
  { value: 'jazzcash',      label: 'JazzCash',       icon: Smartphone },
  { value: 'cheque',        label: 'Cheque',         icon: FileText },
  { value: 'other',         label: 'Other',          icon: DollarSign },
];

const DEFAULT_PAYMENT_FORM = {
  amount: '',
  paymentMode: 'cash',
  referenceId: '',
  notes: '',
  receivedAt: '',
  markFullyPaid: true,
};

const ENROLLMENT_STATUS_STYLE = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  paused: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-rose-100 text-rose-700',
  expired: 'bg-gray-100 text-gray-500',
};

function MembershipOrderBadge({ compact = false }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-violet-200 bg-violet-50 text-violet-700 font-semibold',
        compact ? 'text-[10px] px-1.5 py-0' : 'text-xs'
      )}
    >
      <BadgeCheck className={cn('mr-1', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      Membership
    </Badge>
  );
}

export function OrdersManager({ business, category }) {
  const router = useRouter();
  const params = useParams();
  const { enabled: membershipHubEnabled } = useMembershipHubAccess(category);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7days');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState(DEFAULT_PAYMENT_FORM);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const limit = 10;

  const openMembershipsTab = () => {
    const handle = params?.category || business?.handle || business?.domain || category;
    router.push(`/business/${handle}?tab=memberships`, { scroll: false });
  };

  const loadOrders = useCallback(async () => {
    if (!business?.id) return;
    
    setLoading(true);
    try {
      const filters = {
        limit,
        offset: (currentPage - 1) * limit,
      };
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      
      // Date range filtering
      const now = new Date();
      if (dateRange === 'today') {
        filters.startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      } else if (dateRange === '7days') {
        filters.startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
      } else if (dateRange === '30days') {
        filters.startDate = new Date(now.setDate(now.getDate() - 30)).toISOString();
      }
      
      const result = await getBusinessOrders(business.id, filters);
      
      if (result.success) {
        // Client-side search filter
        let filteredOrders = result.orders || [];
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredOrders = filteredOrders.filter(order => 
            order.order_number?.toLowerCase().includes(query) ||
            order.customer_name?.toLowerCase().includes(query) ||
            order.customer_email?.toLowerCase().includes(query) ||
            order.customer_phone?.includes(query)
          );
        }
        
        setOrders(filteredOrders);
        setTotalOrders(result.total || 0);
      } else {
        toast.error('Failed to load orders');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [business?.id, currentPage, statusFilter, dateRange, searchQuery]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleViewOrder = async (order) => {
    setSelectedOrder(order);
    setDetailsLoading(true);
    
    try {
      const result = await getOrderDetails(order.id, business.id);
      if (result.success) {
        setOrderDetails({
          order: result.order,
          items: result.items,
          history: result.history || [],
          membershipEnrollments: result.membershipEnrollments || [],
        });
      } else {
        toast.error('Failed to load order details');
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      toast.error('Failed to load order details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!selectedOrder || !orderDetails) return;
    
    try {
      const result = await updateOrderStatus(
        selectedOrder.id, 
        business.id, 
        newStatus,
        `Status updated to ${newStatus}`
      );
      
      if (result.success) {
        toast.success(`Order status updated to ${newStatus}`);
        // Auto-reflect payment status for COD delivered orders
        const newPayStatus = newStatus === 'delivered' &&
          orderDetails.order.payment_status === 'pending' ? 'paid' : orderDetails.order.payment_status;
        setOrderDetails(prev => ({
          ...prev,
          order: { ...prev.order, status: newStatus, payment_status: newPayStatus }
        }));
        loadOrders();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handlePaymentStatusUpdate = async (newPaymentStatus) => {
    if (!selectedOrder || !orderDetails) return;
    try {
      const result = await updateOrderPaymentStatus(
        selectedOrder.id,
        business.id,
        newPaymentStatus,
        `Payment marked as ${newPaymentStatus}`
      );
      if (result.success) {
        toast.success(`Payment marked as ${newPaymentStatus}`);
        setOrderDetails(prev => ({
          ...prev,
          order: { ...prev.order, payment_status: newPaymentStatus }
        }));
        loadOrders();
      } else {
        toast.error('Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedOrder || !orderDetails) return;
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setRecordingPayment(true);
    try {
      const result = await recordManualPayment(selectedOrder.id, business.id, {
        amount: parseFloat(paymentForm.amount),
        paymentMode: paymentForm.paymentMode,
        referenceId: paymentForm.referenceId.trim(),
        notes: paymentForm.notes.trim(),
        receivedAt: paymentForm.receivedAt || new Date().toISOString().split('T')[0],
        markFullyPaid: paymentForm.markFullyPaid,
      });
      if (result.success) {
        toast.success(result.message || 'Payment recorded');
        setShowPaymentModal(false);
        // Optimistically update local order details
        const newPayStatus = paymentForm.markFullyPaid ? 'paid' : orderDetails.order.payment_status;
        const existingHistory = orderDetails.order.metadata?.payment_history || [];
        const newEntry = {
          amount: parseFloat(paymentForm.amount),
          payment_mode: paymentForm.paymentMode,
          reference_id: paymentForm.referenceId.trim() || null,
          notes: paymentForm.notes.trim() || null,
          status: newPayStatus,
          recorded_manually: true,
          recorded_at: new Date().toISOString(),
        };
        setOrderDetails(prev => ({
          ...prev,
          order: {
            ...prev.order,
            payment_status: newPayStatus,
            metadata: {
              ...(prev.order.metadata || {}),
              payment_history: [...existingHistory, newEntry],
            },
          },
        }));
        loadOrders();
      } else {
        toast.error(result.error || 'Failed to record payment');
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      toast.error('Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const getStatusBadge = (status, compact = false) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
      <Badge className={cn('border', config.color, compact && 'text-[10px] px-1.5 py-0 h-5')}>
        <config.icon className={cn('mr-0.5', compact ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status, compact = false) => {
    const config = PAYMENT_STATUS_CONFIG[status] || PAYMENT_STATUS_CONFIG.pending;
    return (
      <Badge className={cn(config.color, compact && 'text-[10px] px-1.5 py-0 h-5')}>
        {config.label}
      </Badge>
    );
  };

  const totalPages = Math.ceil(totalOrders / limit);

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const processingCount = orders.filter((o) => o.status === 'processing').length;
  const revenueTotal = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  const embeddedInStorefront = useStorefrontEmbedded();

  const statItems = [
    { label: 'Total', value: totalOrders },
    { label: 'Pending', value: pendingCount, valueTone: 'text-amber-600', alert: pendingCount > 0 },
    { label: 'Processing', value: processingCount, valueTone: 'text-blue-600' },
    { label: 'Revenue', value: formatCurrency(revenueTotal, business.currency || 'PKR') },
  ];

  return (
    <div className="min-w-0 space-y-2 overflow-x-hidden touch-manipulation lg:space-y-6">
      {!embeddedInStorefront && (
        <MobileTabHeader
          icon={Package}
          iconClassName="bg-blue-100 text-blue-600"
          title="Store Orders"
          subtitle={`${totalOrders} orders`}
          actions={[
            { id: 'refresh', label: 'Refresh', icon: RefreshCw, onClick: loadOrders },
          ]}
        />
      )}

      <div className="lg:hidden">
        <MobileStatStrip items={statItems} layout="grid" />
      </div>

      {/* Desktop header */}
      <div className="hidden flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:flex">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track customer orders from your storefront
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrders}
            disabled={loading}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Desktop stats */}
      <div className="hidden grid-cols-1 gap-4 sm:grid-cols-2 lg:grid lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold">
                  {orders.filter(o => o.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Processing</p>
                <p className="text-2xl font-bold">
                  {orders.filter(o => o.status === 'processing').length}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0),
                    business.currency || 'PKR'
                  )}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile filters, single compact block */}
      <div className="space-y-1.5 lg:hidden">
        <div className="flex gap-1.5">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search order #, customer…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(MOBILE_INPUT_CLASS, 'pl-8')}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={loadOrders}
            disabled={loading}
            aria-label="Refresh orders"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn(MOBILE_INPUT_CLASS, 'w-full')}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className={cn(MOBILE_INPUT_CLASS, 'w-full')}>
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop filters */}
      <Card className="hidden lg:block">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by order #, customer name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Last 7 days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Mobile order cards */}
      <div className="space-y-2 lg:hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <p className="mt-2 text-xs text-gray-500">Loading orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-12 text-center px-4">
            <Package className="h-10 w-10 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-600">No orders found</p>
            <p className="text-xs text-gray-400">Storefront orders will appear here</p>
          </div>
        ) : (
          orders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => handleViewOrder(order)}
              className="w-full rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm transition-colors active:bg-gray-50"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs font-bold text-gray-900">{order.order_number}</p>
                  <p className="mt-0.5 text-[10px] text-gray-400">{formatDate(order.created_at)}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-gray-900">
                  {formatCurrency(parseFloat(order.total), business.currency || 'PKR')}
                </p>
              </div>
              <div className="mb-2 flex min-w-0 items-center gap-1.5">
                <User className="h-3 w-3 shrink-0 text-gray-400" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-gray-800">{order.customer_name || 'Guest'}</p>
                  {order.customer_email ? (
                    <p className="truncate text-[10px] text-gray-400">{order.customer_email}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {getStatusBadge(order.status, true)}
                {getPaymentStatusBadge(order.payment_status, true)}
                {order.has_membership_items ? <MembershipOrderBadge compact /> : null}
                <span className="ml-auto text-[10px] font-medium text-gray-400">
                  {order.items_count} {order.items_count === 1 ? 'item' : 'items'}
                </span>
                <Eye className="ml-1 h-3.5 w-3.5 text-gray-300" aria-hidden />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Desktop orders table */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    <p className="text-sm text-gray-500 mt-2">Loading orders...</p>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto text-gray-300" />
                    <p className="text-sm text-gray-500 mt-2">No orders found</p>
                    <p className="text-xs text-gray-400">
                      Orders from your storefront will appear here
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-xs text-gray-500">#{String(order.id).slice(-6)}</div>
                      {order.has_membership_items ? (
                        <div className="mt-1">
                          <MembershipOrderBadge compact />
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.customer_name || 'Guest'}</div>
                      <div className="text-xs text-gray-500">{order.customer_email}</div>
                    </TableCell>
                    <TableCell>
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell>{order.items_count} items</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(parseFloat(order.total), business.currency || 'PKR')}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-gray-500 sm:text-left sm:text-sm">
            {((currentPage - 1) * limit) + 1}-{Math.min(currentPage * limit, totalOrders)} of {totalOrders}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 sm:flex-none"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <span className="text-xs text-gray-600 tabular-nums">
              {currentPage}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 sm:flex-none"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className={hubDialogContentClass({ wide: true, maxWidth: 'lg:max-w-3xl' })}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeft 
                className="w-5 h-5 cursor-pointer hover:text-gray-600" 
                onClick={() => setSelectedOrder(null)}
              />
              Order Details
            </DialogTitle>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : orderDetails ? (
            <div className="space-y-6">
              {/* Order Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="text-lg font-bold">{orderDetails.order.order_number}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(orderDetails.order.status)}
                  {getPaymentStatusBadge(orderDetails.order.payment_status)}
                  {orderDetails.order.has_membership_items ? <MembershipOrderBadge /> : null}
                </div>
              </div>

              {membershipHubEnabled &&
                (orderDetails.order.has_membership_items ||
                  (orderDetails.membershipEnrollments?.length ?? 0) > 0) && (
                <Card className="border-violet-100 bg-violet-50/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-violet-600" />
                        Membership enrollment
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-violet-700 hover:text-violet-900"
                        onClick={openMembershipsTab}
                      >
                        Open Memberships tab
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(orderDetails.membershipEnrollments?.length ?? 0) === 0 ? (
                      <p className="text-sm text-gray-600">
                        This order includes membership SKUs. Enrollment records appear after checkout
                        completes and payment is confirmed.
                      </p>
                    ) : (
                      orderDetails.membershipEnrollments.map((enrollment) => (
                        <div
                          key={enrollment.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{enrollment.plan_name}</p>
                            <p className="text-xs text-gray-500 capitalize">
                              Source: {enrollment.source || 'storefront'}
                            </p>
                          </div>
                          <Badge
                            className={cn(
                              'capitalize font-semibold',
                              ENROLLMENT_STATUS_STYLE[enrollment.status] ||
                                ENROLLMENT_STATUS_STYLE.pending
                            )}
                          >
                            {enrollment.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}

              {(orderDetails.order.notes ||
                orderDetails.order.metadata?.restaurant_order_mode ||
                orderDetails.order.metadata?.restaurant_order_mode_label) && (
                <Card className="border-amber-100 bg-amber-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 text-amber-700" />
                      Fulfillment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-gray-700">
                    {orderDetails.order.metadata?.restaurant_order_mode_label ? (
                      <p>
                        <span className="font-semibold text-gray-900">Service: </span>
                        {orderDetails.order.metadata.restaurant_order_mode_label}
                      </p>
                    ) : null}
                    {orderDetails.order.notes ? (
                      <p className="text-gray-600">{orderDetails.order.notes}</p>
                    ) : null}
                  </CardContent>
                </Card>
              )}

              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-medium">{orderDetails.order.customer_name || 'Guest'}</p>
                    <p className="text-sm text-gray-500">{orderDetails.order.customer_email}</p>
                    <p className="text-sm text-gray-500">{orderDetails.order.customer_phone}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      {orderDetails.order.metadata?.restaurant_order_mode
                        ? 'Fulfillment address'
                        : 'Shipping Address'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const addr = parseStorefrontShippingAddress(
                        orderDetails.order.shipping_address
                      );
                      if (!addr) {
                        return <p className="text-gray-400">No shipping address</p>;
                      }
                      return (
                        <div className="text-sm text-gray-600 space-y-0.5">
                          {addr.lines.map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 lg:hidden">
                    {orderDetails.items.map((item) => (
                      <div key={item.id} className="flex gap-3 rounded-lg border border-gray-100 p-2.5">
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-gray-900">{item.product_name}</p>
                          <p className="mt-1 text-[11px] text-gray-500">
                            {item.quantity} × {formatCurrency(parseFloat(item.unit_price), business.currency || 'PKR')}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs font-bold text-gray-900">
                          {formatCurrency(parseFloat(item.total_price), business.currency || 'PKR')}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Table className="hidden lg:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderDetails.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {item.product_image && (
                                <img 
                                  src={item.product_image} 
                                  alt={item.product_name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <span className="font-medium">{item.product_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(parseFloat(item.unit_price), business.currency || 'PKR')}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(parseFloat(item.total_price), business.currency || 'PKR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span>{formatCurrency(parseFloat(orderDetails.order.subtotal), business.currency || 'PKR')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Shipping</span>
                      <span>{formatCurrency(parseFloat(orderDetails.order.shipping_cost), business.currency || 'PKR')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax</span>
                      <span>{formatCurrency(parseFloat(orderDetails.order.tax), business.currency || 'PKR')}</span>
                    </div>
                    {parseFloat(orderDetails.order.discount) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Discount</span>
                        <span className="text-red-500">
                          -{formatCurrency(parseFloat(orderDetails.order.discount), business.currency || 'PKR')}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{formatCurrency(parseFloat(orderDetails.order.total), business.currency || 'PKR')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Update */}
              {orderDetails.order.status !== 'cancelled' && orderDetails.order.status !== 'delivered' && (
                <div className="flex flex-wrap gap-2">
                  <p className="w-full text-sm font-medium mb-2">Update Order Status:</p>
                  {['pending', 'processing', 'shipped', 'delivered'].map((status) => (
                    <Button
                      key={status}
                      variant={orderDetails.order.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusUpdate(status)}
                      disabled={orderDetails.order.status === status}
                    >
                      {STATUS_CONFIG[status].label}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleStatusUpdate('cancelled')}
                  >
                    Cancel Order
                  </Button>
                </div>
              )}

              {/* Payment Panel */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">Payment</span>
                    {getPaymentStatusBadge(orderDetails.order.payment_status)}
                  </div>
                  {orderDetails.order.payment_status !== 'paid' && (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                      onClick={() => {
                        setPaymentForm({
                          ...DEFAULT_PAYMENT_FORM,
                          amount: String(parseFloat(orderDetails.order.total || 0).toFixed(2)),
                          receivedAt: new Date().toISOString().split('T')[0],
                        });
                        setShowPaymentModal(true);
                      }}
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Record Payment
                    </Button>
                  )}
                </div>

                {/* Payment history from metadata */}
                {(() => {
                  const history = orderDetails.order.metadata?.payment_history || [];
                  if (history.length === 0) {
                    return (
                      <div className="px-4 py-4 text-sm text-gray-400 italic">
                        {orderDetails.order.payment_status === 'paid'
                          ? 'Payment received (recorded via system checkout).'
                          : 'No payment recorded yet.'}
                      </div>
                    );
                  }
                  return (
                    <div className="divide-y divide-gray-100">
                      {history.map((p, i) => {
                        const ModeIcon = PAYMENT_MODES.find(m => m.value === p.payment_mode)?.icon || DollarSign;
                        return (
                          <div key={i} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <ModeIcon className="w-4 h-4 text-green-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">
                                {formatCurrency(parseFloat(p.amount || 0), business.currency || 'PKR')}
                                <span className="ml-2 text-xs font-normal text-gray-500 capitalize">
                                  via {PAYMENT_MODES.find(m => m.value === p.payment_mode)?.label || p.payment_mode}
                                </span>
                                {p.recorded_manually && (
                                  <span className="ml-1 text-xs text-amber-600">(manual)</span>
                                )}
                              </p>
                              {p.reference_id && (
                                <p className="text-xs text-gray-400">Ref: {p.reference_id}</p>
                              )}
                              {p.notes && (
                                <p className="text-xs text-gray-400 truncate">{p.notes}</p>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 flex-shrink-0">
                              {p.recorded_at ? formatDate(p.recorded_at) : ''}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Status History */}
              {orderDetails.history.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Status History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {orderDetails.history.map((h, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(h.status)}
                            {h.notes && <span className="text-gray-400">- {h.notes}</span>}
                          </div>
                          <span className="text-gray-400">{formatDate(h.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Record Manual Payment Modal ─────────────────────────── */}
      <Dialog open={showPaymentModal} onOpenChange={(open) => { if (!recordingPayment) setShowPaymentModal(open); }}>
        <DialogContent className={hubDialogContentClass({ maxWidth: 'lg:max-w-md' })}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-green-600" />
              Record Payment
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && orderDetails && (
            <div className="space-y-5 py-1">
              {/* Order ref banner */}
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                <span className="text-gray-500">Order</span>
                <span className="font-semibold text-gray-800">{orderDetails.order.order_number}</span>
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(parseFloat(orderDetails.order.total || 0), business.currency || 'PKR')}
                </span>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="pm-amount">Amount Received *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                    {business.currency || 'PKR'}
                  </span>
                  <Input
                    id="pm-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-14 rounded-lg"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label>Payment Method *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_MODES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentForm(f => ({ ...f, paymentMode: value }))}
                      className={cn(
                        'flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border-2 text-xs font-medium transition-all',
                        paymentForm.paymentMode === value
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference ID */}
              <div className="space-y-1.5">
                <Label htmlFor="pm-ref" className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-gray-400" />
                  Reference / Transaction ID
                  <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="pm-ref"
                  placeholder={
                    paymentForm.paymentMode === 'cheque' ? 'Cheque number' :
                    paymentForm.paymentMode === 'bank_transfer' ? 'Bank transaction ID' :
                    paymentForm.paymentMode === 'easypaisa' || paymentForm.paymentMode === 'jazzcash'
                      ? 'Transaction / confirmation ID' : 'Reference number'
                  }
                  className="rounded-lg"
                  value={paymentForm.referenceId}
                  onChange={e => setPaymentForm(f => ({ ...f, referenceId: e.target.value }))}
                />
              </div>

              {/* Date Received */}
              <div className="space-y-1.5">
                <Label htmlFor="pm-date" className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Date Received
                </Label>
                <Input
                  id="pm-date"
                  type="date"
                  className="rounded-lg"
                  value={paymentForm.receivedAt}
                  onChange={e => setPaymentForm(f => ({ ...f, receivedAt: e.target.value }))}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="pm-notes" className="flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-gray-400" />
                  Notes
                  <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="pm-notes"
                  placeholder="e.g. Paid by owner on behalf, partial payment, etc."
                  className="rounded-lg"
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {/* Mark fully paid toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div
                  className={cn(
                    'w-10 h-6 rounded-full transition-colors flex-shrink-0 relative',
                    paymentForm.markFullyPaid ? 'bg-green-500' : 'bg-gray-300'
                  )}
                  onClick={() => setPaymentForm(f => ({ ...f, markFullyPaid: !f.markFullyPaid }))}
                >
                  <div className={cn(
                    'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    paymentForm.markFullyPaid ? 'translate-x-4' : 'translate-x-0.5'
                  )} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Mark order as fully paid</p>
                  <p className="text-xs text-gray-500">
                    {paymentForm.markFullyPaid
                      ? 'Payment status will be updated to Paid'
                      : 'Payment recorded but status stays Pending (for partial payments)'}
                  </p>
                </div>
              </label>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              className="rounded-lg"
              onClick={() => setShowPaymentModal(false)}
              disabled={recordingPayment}
            >
              Cancel
            </Button>
            <Button
              className="rounded-lg gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleRecordPayment}
              disabled={recordingPayment || !paymentForm.amount}
            >
              {recordingPayment ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Save Payment</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
