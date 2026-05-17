'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, FileText, Package, Users, DollarSign, BarChart3, Settings, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { EnhancedInvoiceBuilder } from '@/components/EnhancedInvoiceBuilder';
import { InventoryManager } from '@/components/InventoryManager';
import { VendorManager } from '@/components/VendorManager';
import { PurchaseOrderManager } from '@/components/PurchaseOrderManager';
import { AdvancedAnalytics } from '@/components/AdvancedAnalytics';
import { DemandForecast } from '@/components/DemandForecast';
import { GSTManager } from '@/components/GSTManager';
import { SettingsManager } from '@/components/SettingsManager';
import { CustomerManager } from '@/components/CustomerManager';
import { ProductForm } from '@/components/ProductForm';
import { getDomainColors } from '@/lib/domainColors';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { formatCurrency } from '@/lib/currency';
import { DollarSign as DollarIcon, ShoppingCart, Package as PackageIcon, Users as UsersIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const businessCategories = {
  'auto-parts': { name: 'Auto Parts', icon: '🚗', color: 'blue' },
  'retail-shop': { name: 'Retail Shop', icon: '🏪', color: 'green' },
  'pharmacy': { name: 'Pharmacy', icon: '💊', color: 'red' },
  'chemical': { name: 'Chemical', icon: '[TEST]', color: 'purple' },
  'food-beverages': { name: 'Food & Beverages', icon: '🍔', color: 'orange' },
  'ecommerce': { name: 'E-commerce', icon: '🛒', color: 'indigo' },
  'computer-hardware': { name: 'Computer Hardware', icon: '💻', color: 'blue' },
  'furniture': { name: 'Furniture', icon: '🪑', color: 'brown' },
  'book-publishing': { name: 'Book Publishing', icon: '📚', color: 'teal' },
  'travel': { name: 'Travel', icon: '✈️', color: 'cyan' },
  'fmcg': { name: 'FMCG', icon: '[BOX]', color: 'wine' },
  'electrical': { name: 'Electrical', icon: '⚡', color: 'wine' },
  'paper-mill': { name: 'Paper Mill', icon: '📄', color: 'gray' },
  'paint': { name: 'Paint', icon: '🎨', color: 'pink' },
  'mobile': { name: 'Mobile', icon: '📱', color: 'blue' },
  'garments': { name: 'Garments', icon: '👕', color: 'purple' },
  'agriculture': { name: 'Agriculture', icon: '🌾', color: 'green' },
  'gems-jewellery': { name: 'Gems & Jewellery', icon: '💎', color: 'teal' },
  'electronics-goods': { name: 'Electronics Goods', icon: '📺', color: 'blue' },
  'real-estate': { name: 'Real Estate', icon: '[HOUSE]', color: 'brown' },
  'grocery': { name: 'Grocery', icon: '🛒', color: 'green' }
};

export default function BusinessDashboard() {
  const params = useParams();
  const router = useRouter();
  const category = params?.category || 'retail-shop';
  const businessInfo = businessCategories[category] || businessCategories['retail-shop'];
  const colors = getDomainColors(category);
  const domainKnowledge = getDomainKnowledge(category);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showInvoiceBuilder, setShowInvoiceBuilder] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [currency] = useState('PKR'); // Can be made dynamic from settings

  // Mock data
  useEffect(() => {
    setInvoices([
      { id: 1, number: 'INV-001', customer: 'John Doe', amount: 15000, date: '2024-01-15', status: 'paid' },
      { id: 2, number: 'INV-002', customer: 'Jane Smith', amount: 25000, date: '2024-01-16', status: 'pending' },
      { id: 3, number: 'INV-003', customer: 'Bob Johnson', amount: 18000, date: '2024-01-17', status: 'paid' },
    ]);
    setProducts([
      { id: 1, name: 'Product A', sku: 'SKU-001', stock: 150, price: 500, category: 'Category 1' },
      { id: 2, name: 'Product B', sku: 'SKU-002', stock: 75, price: 1200, category: 'Category 2' },
      { id: 3, name: 'Product C', sku: 'SKU-003', stock: 200, price: 800, category: 'Category 1' },
    ]);
    setCustomers([
      { id: 1, name: 'John Doe', email: 'john@example.com', phone: '+1234567890', totalOrders: 15, totalSpent: 150000 },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '+1234567891', totalOrders: 8, totalSpent: 80000 },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', phone: '+1234567892', totalOrders: 12, totalSpent: 120000 },
    ]);
  }, []);

  // Calculate stats
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + (Number(inv.grand_total) || Number(inv.amount) || 0), 0);

  const totalOrders = invoices.length;
  const totalProducts = products.length;
  const totalCustomers = customers.length;

  const stats = [
    {
      title: 'Total Revenue',
      value: totalRevenue,
      description: 'Revenue this month',
      change: '+20.1%',
      trend: 'up',
      icon: DollarIcon,
      ...colors.stats.revenue,
    },
    {
      title: 'Total Orders',
      value: totalOrders,
      description: 'Orders this month',
      change: '+15.3%',
      trend: 'up',
      icon: ShoppingCart,
      ...colors.stats.orders,
    },
    {
      title: 'Products',
      value: totalProducts,
      description: 'Total products',
      change: '+8.2%',
      trend: 'up',
      icon: PackageIcon,
      ...colors.stats.products,
    },
    {
      title: 'Customers',
      value: totalCustomers,
      description: 'Active customers',
      change: '+12.5%',
      trend: 'up',
      icon: UsersIcon,
      ...colors.stats.customers,
    },
  ];

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        // Update existing product
        setProducts(products.map(p => p.id === editingProduct.id ? { ...productData, id: editingProduct.id } : p));
        toast.success('Product updated successfully');
      } else {
        // Add new product
        const newProduct = { ...productData, id: Date.now() };
        setProducts([...products, newProduct]);
        toast.success('Product created successfully');
      }
      setShowProductForm(false);
      setEditingProduct(null);
    } catch (error) {
      toast.error('Failed to save product');
      throw error;
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleDeleteProduct = (productId) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== productId));
      toast.success('Product deleted successfully');
    }
  };

  return (
    <DashboardLayout
      category={category}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title={`${businessInfo.name} Dashboard`}
      description="Complete business management system"
      actions={
        <>
          <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <PackageIcon className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </DialogTitle>
                <DialogDescription>
                  Enter the details of the product to add it to your inventory.
                </DialogDescription>
              </DialogHeader>
              <ProductForm
                product={editingProduct}
                category={category}
                onSave={handleSaveProduct}
                onCancel={() => {
                  setShowProductForm(false);
                  setEditingProduct(null);
                }}
                currency={currency}
              />
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            onClick={() => setShowInvoiceBuilder(true)}
            style={{ backgroundColor: colors.primary }}
            className="text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <StatsCard
                key={stat.title}
                {...stat}
                currency={currency}
              />
            ))}
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Latest 5 invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoices.slice(0, 5).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{invoice.number}</p>
                        <p className="text-sm text-gray-500">{invoice.customer}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(invoice.amount, currency)}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded ${invoice.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                            }`}
                        >
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alert</CardTitle>
                <CardDescription>Products needing restock</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products
                    .filter((p) => p.stock < 100)
                    .slice(0, 5)
                    .map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">{product.stock} units</p>
                          <p className="text-xs text-gray-500">Low stock</p>
                        </div>
                      </div>
                    ))}
                  {products.filter((p) => p.stock < 100).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No low stock alerts
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>Manage your invoices</CardDescription>
                </div>
                <Button onClick={() => setShowInvoiceBuilder(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Invoice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">{invoice.number}</p>
                      <p className="text-sm text-gray-500">{invoice.customer}</p>
                      <p className="text-xs text-gray-400">{invoice.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(invoice.grand_total || invoice.amount, currency)}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${invoice.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                          }`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <InventoryManager
            products={products}
            onUpdate={(updatedProduct) => {
              setProducts(
                products.map((p) =>
                  p.id === updatedProduct.id ? updatedProduct : p
                )
              );
            }}
            onAdd={() => setShowProductForm(true)}
            onDelete={handleDeleteProduct}
            domainKnowledge={domainKnowledge}
            category={category}
          />
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          <CustomerManager
            category={category}
            customers={customers}
            onAdd={(customer) => {
              setCustomers([...customers, { ...customer, id: Date.now() }]);
            }}
            onUpdate={(updatedCustomer) => {
              setCustomers(
                customers.map((c) =>
                  c.id === updatedCustomer.id ? updatedCustomer : c
                )
              );
            }}
            onDelete={(customerId) => {
              setCustomers(customers.filter((c) => c.id !== customerId));
            }}
          />
        </TabsContent>

        {/* Accounting Tab */}
        <TabsContent value="accounting" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Accounts Receivable</CardTitle>
                <CardDescription>Outstanding invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(
                    invoices
                      .filter((inv) => inv.status === 'pending')
                      .reduce((sum, inv) => sum + inv.amount, 0),
                    currency
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {invoices.filter((inv) => inv.status === 'pending').length} invoices pending
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Accounts Payable</CardTitle>
                <CardDescription>Outstanding bills</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(25000, currency)}
                </div>
                <p className="text-sm text-gray-600">2 bills pending</p>
              </CardContent>
            </Card>
          </div>

        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdvancedAnalytics
              data={{
                revenue: totalRevenue,
                orders: totalOrders,
                products: totalProducts,
                customers: totalCustomers,
              }}
            />
            <DemandForecast products={products} salesHistory={[]} />
          </div>
        </TabsContent>

        {/* GST Tab */}
        <TabsContent value="gst" className="space-y-6">
          <GSTManager invoices={invoices} products={products} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <SettingsManager category={category} />
        </TabsContent>
      </Tabs>

      {/* Invoice Builder Modal */}
      {showInvoiceBuilder && (
        <EnhancedInvoiceBuilder
          onClose={() => setShowInvoiceBuilder(false)}
          onSave={(invoice) => {
            setInvoices([...invoices, { ...invoice, id: Date.now() }]);
            setShowInvoiceBuilder(false);
            toast.success('Invoice created successfully');
          }}
          products={products}
          customers={customers}
          category={category} // Pass category for Pakistani features
        />
      )}
    </DashboardLayout>
  );
}

