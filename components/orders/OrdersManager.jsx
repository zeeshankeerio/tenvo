'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/utils';
import { getBusinessOrders, getOrderDetails, updateOrderStatus } from '@/lib/actions/storefront/orders';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

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
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
};

export function OrdersManager({ business, category }) {
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
  const limit = 10;

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
        let filteredOrders = result.data.orders;
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
        setTotalOrders(result.data.total);
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
        setOrderDetails(result.data);
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
        setOrderDetails(prev => ({
          ...prev,
          order: { ...prev.order, status: newStatus }
        }));
        loadOrders(); // Refresh list
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
      <Badge className={cn('border', config.color)}>
        <config.icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const config = PAYMENT_STATUS_CONFIG[status] || PAYMENT_STATUS_CONFIG.pending;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const totalPages = Math.ceil(totalOrders / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <p className="text-sm text-gray-500 mt-1">
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
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
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

      {/* Orders Table */}
      <Card>
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
                      <div className="text-xs text-gray-500">#{order.id.slice(-6)}</div>
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalOrders)} of {totalOrders} orders
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                </div>
              </div>

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
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orderDetails.order.shipping_address ? (
                      <div className="text-sm text-gray-600">
                        {(() => {
                          try {
                            const addr = typeof orderDetails.order.shipping_address === 'string' 
                              ? JSON.parse(orderDetails.order.shipping_address)
                              : orderDetails.order.shipping_address;
                            return (
                              <>
                                <p>{addr.address}</p>
                                <p>{addr.city}, {addr.postalCode}</p>
                                <p>{addr.country}</p>
                              </>
                            );
                          } catch {
                            return <p className="text-gray-400">Address not available</p>;
                          }
                        })()}
                      </div>
                    ) : (
                      <p className="text-gray-400">No shipping address</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
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

              {/* Order Totals */}
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
                  <p className="w-full text-sm font-medium mb-2">Update Status:</p>
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
    </div>
  );
}
