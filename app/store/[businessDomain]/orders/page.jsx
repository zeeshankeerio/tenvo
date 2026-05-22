import { notFound } from 'next/navigation';
import { getBusinessByDomain, getStorefrontOrders } from '@/lib/actions/storefront/business';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import Link from 'next/link';

export async function generateMetadata({ params }) {
  const { businessDomain } = await params;
  const result = await getBusinessByDomain(businessDomain);
  
  if (!result.success) {
    return { title: 'Order History' };
  }
  
  return {
    title: `Order History | ${result.business.business_name}`,
    description: `View your order history with ${result.business.business_name}`,
  };
}

const statusIcons = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount, currency = 'PKR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export default async function OrderHistoryPage({ params, searchParams }) {
  const { businessDomain } = await params;
  const { email } = await searchParams || {};
  
  const result = await getBusinessByDomain(businessDomain);
  
  if (!result.success) {
    notFound();
  }
  
  const { business } = result;
  
  // Get orders for this customer email
  let orders = [];
  if (email) {
    try {
      const ordersResult = await getStorefrontOrders(business.id, { customerEmail: email, limit: 50 });
      if (ordersResult?.success && ordersResult?.orders) {
        orders = ordersResult.orders;
      }
    } catch (error) {
      console.error('[OrderHistoryPage] Error loading orders:', error);
      orders = [];
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/store/${businessDomain}`}
            className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
          >
            ← Back to Store
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-600 mt-2">
            View and track your orders with {business.business_name}
          </p>
        </div>

        {/* Email Input (if no email provided) */}
        {!email && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <form className="flex gap-4">
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email to view orders"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <Button type="submit">
                  View Orders
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Orders List */}
        {email && (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                Showing orders for: <span className="font-medium text-gray-900">{email}</span>
              </p>
              <Link 
                href={`/store/${businessDomain}/orders`}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Use different email
              </Link>
            </div>

            {orders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                  <p className="text-gray-500">
                    We couldn&apos;t find any orders for {email}. 
                    Check your email or try a different one.
                  </p>
                  <Link href={`/store/${businessDomain}`}>
                    <Button className="mt-6" variant="outline">
                      Continue Shopping
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const StatusIcon = statusIcons[order.status] || Package;
                  
                  return (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              Order #{order.order_number}
                            </CardTitle>
                            <p className="text-sm text-gray-500 mt-1">
                              Placed on {formatDate(order.created_at)}
                            </p>
                          </div>
                          <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {order.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="p-6">
                        {/* Order Items */}
                        <div className="space-y-3">
                          {order.items?.map((item) => (
                            <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                              <div>
                                <p className="font-medium text-gray-900">{item.product_name}</p>
                                {item.product_sku && (
                                  <p className="text-sm text-gray-500">SKU: {item.product_sku}</p>
                                )}
                                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                              </div>
                              <p className="font-medium text-gray-900">
                                {formatCurrency(item.total_price, order.currency)}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Order Total */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex justify-between items-center">
                            <div className="space-y-1 text-sm text-gray-500">
                              <p>Subtotal: {formatCurrency(order.subtotal, order.currency)}</p>
                              {order.tax_amount > 0 && (
                                <p>Tax: {formatCurrency(order.tax_amount, order.currency)}</p>
                              )}
                              {order.shipping_amount > 0 && (
                                <p>Shipping: {formatCurrency(order.shipping_amount, order.currency)}</p>
                              )}
                              {order.discount_amount > 0 && (
                                <p className="text-green-600">
                                  Discount: -{formatCurrency(order.discount_amount, order.currency)}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Total</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {formatCurrency(order.total_amount, order.currency)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Shipping Address */}
                        {order.shipping_address && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <h4 className="font-medium text-gray-900 mb-2">Shipping Address</h4>
                            <div className="text-sm text-gray-600">
                              <p>{order.shipping_address.name}</p>
                              <p>{order.shipping_address.street}</p>
                              {order.shipping_address.city && (
                                <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}</p>
                              )}
                              {order.shipping_address.country && (
                                <p>{order.shipping_address.country}</p>
                              )}
                              {order.shipping_address.phone && (
                                <p className="mt-1">Phone: {order.shipping_address.phone}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
