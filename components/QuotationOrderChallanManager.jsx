'use client';

import { useState } from 'react';
import {
  FileText, ShoppingCart, Package, Plus
} from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { SalesDocumentForm } from './SalesDocumentForm';
import { quotationAPI } from '@/lib/api/quotations';
import toast from 'react-hot-toast';
import { useBusiness } from '@/lib/context/BusinessContext';
import { QuotationsTable } from './sales/QuotationsTable';
import { SalesOrdersTable } from './sales/SalesOrdersTable';
import { DeliveryChallansTable } from './sales/DeliveryChallansTable';
import { SalesDocumentPreview } from './SalesDocumentPreview';
import { MobileTabHeader, MobileStatStrip } from '@/components/mobile/MobileTabHeader';
import { useStorefrontEmbedded } from '@/lib/context/StorefrontMobileContext';
import { MOBILE_TAB_LIST } from '@/lib/utils/formMobileStyles';
import { cn } from '@/lib/utils';

/**
 * Quotation, Order, and Challan Manager
 * Complete order lifecycle management from quotation to delivery
 * Based on Busy.in's order management features
 */
export function QuotationOrderChallanManager({
  quotations = [],
  salesOrders = [],
  challans = [],
  customers = [],
  products = [],
  warehouses = [],
  refreshData,
  category = 'retail-shop',
  onIssueInvoice
}) {
  const [activeTab, setActiveTab] = useState('quotations');
  const [showForm, setShowForm] = useState(null); // 'quotation', 'sales_order', 'delivery_challan' or null
  const [initialFormData, setInitialFormData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const { business } = useBusiness();
  const businessId = business?.id;

  const handleConvertQuotationToOrder = async (quotationId) => {
    setIsProcessing(true);
    try {
      const quotation = await quotationAPI.getQuotationDetail(quotationId, businessId);
      setInitialFormData(quotation);
      setActiveTab('orders');
      setShowForm('sales_order');
    } catch (error) {
      toast.error('Failed to load quotation details: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvertOrderToChallan = async (orderId) => {
    setIsProcessing(true);
    try {
      const order = await quotationAPI.getSalesOrderDetail(orderId, businessId);
      setInitialFormData(order);
      setActiveTab('challans');
      setShowForm('delivery_challan');
    } catch (error) {
      toast.error('Failed to load order details: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvertOrderToInvoice = async (orderId) => {
    if (!onIssueInvoice) {
      toast.error('Invoice module not connected');
      return;
    }
    setIsProcessing(true);
    try {
      const order = await quotationAPI.getSalesOrderDetail(orderId, businessId);
      onIssueInvoice(order);
    } catch (error) {
      toast.error('Failed to load order details: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvertChallanToInvoice = async (challanId) => {
    if (!onIssueInvoice) {
      toast.error('Invoice module not connected');
      return;
    }
    setIsProcessing(true);
    try {
      const challan = await quotationAPI.getChallanDetail(challanId, businessId);
      onIssueInvoice(challan);
    } catch (error) {
      console.error('Failed to load challan for invoice conversion:', error);
      toast.error('Failed to load challan details');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleView = async (doc, type) => {
    setIsProcessing(true);
    try {
      let fullDoc;
      if (type === 'quotation') fullDoc = await quotationAPI.getQuotationDetail(doc.id, businessId);
      else if (type === 'sales_order') fullDoc = await quotationAPI.getSalesOrderDetail(doc.id, businessId);
      else if (type === 'delivery_challan') fullDoc = await quotationAPI.getChallanDetail(doc.id, businessId);

      setPreviewData(fullDoc);
      setPreviewType(type);
    } catch (error) {
      toast.error('Failed to load document details');
    } finally {
      setIsProcessing(false);
    }
  };

  const embeddedInStorefront = useStorefrontEmbedded();

  const statItems = [
    { label: 'Quotes', value: quotations.length },
    { label: 'Orders', value: salesOrders.length, valueTone: 'text-wine' },
    { label: 'Challans', value: challans.length },
  ];

  return (
    <div className="space-y-2 lg:space-y-6">
      {!embeddedInStorefront && (
        <MobileTabHeader
          icon={FileText}
          iconClassName="bg-wine/10 text-wine"
          title="Order Lifecycle"
          subtitle={`${quotations.length} quotes · ${salesOrders.length} orders`}
          primaryAction={{
            label: 'Quote',
            icon: Plus,
            className: 'bg-wine-600 hover:bg-wine-700 text-white',
            onClick: () => { setActiveTab('quotations'); setShowForm('quotation'); },
          }}
          actions={[
            { id: 'order', label: 'Order', icon: ShoppingCart, onClick: () => { setActiveTab('orders'); setShowForm('sales_order'); } },
            { id: 'challan', label: 'Challan', icon: Package, onClick: () => { setActiveTab('challans'); setShowForm('delivery_challan'); } },
          ]}
        />
      )}

      <div className="lg:hidden">
        <MobileStatStrip items={statItems} />
        {embeddedInStorefront && (
          <div className="mt-1.5 flex gap-1 overflow-x-auto scrollbar-none">
            <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-lg px-2.5 text-[10px] font-bold" onClick={() => { setActiveTab('quotations'); setShowForm('quotation'); }}>
              <Plus className="mr-1 h-3 w-3" /> Quote
            </Button>
            <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-lg px-2.5 text-[10px] font-bold" onClick={() => { setActiveTab('orders'); setShowForm('sales_order'); }}>
              <Plus className="mr-1 h-3 w-3" /> Order
            </Button>
            <Button size="sm" className="h-8 shrink-0 rounded-lg bg-wine-600 px-2.5 text-[10px] font-bold text-white" onClick={() => { setActiveTab('challans'); setShowForm('delivery_challan'); }}>
              <Plus className="mr-1 h-3 w-3" /> Challan
            </Button>
          </div>
        )}
      </div>

      <div className="hidden min-w-0 flex-col gap-4 rounded-2xl border border-gray-100 bg-white/50 p-4 shadow-sm backdrop-blur-sm sm:p-6 md:flex-row md:items-center md:justify-between lg:flex">
        <div className="min-w-0 space-y-1 md:pr-4">
          <h2 className="text-2xl font-semibold uppercase italic tracking-tight text-wine-600 sm:text-3xl">Order Lifecycle</h2>
          <p className="text-sm font-medium text-gray-500">Manage quotations, sales orders, and delivery challans</p>
        </div>
        <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:max-w-none md:justify-end md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden sm:gap-3">
          <Button variant="outline" className="shrink-0 whitespace-nowrap rounded-xl border-wine-100 font-bold text-wine-600 transition-all hover:bg-wine-50 active:scale-95" onClick={() => { setActiveTab('quotations'); setShowForm('quotation'); }}>
            <Plus className="mr-2 h-4 w-4 shrink-0" />
            New Quotation
          </Button>
          <Button variant="outline" className="shrink-0 whitespace-nowrap rounded-xl border-wine-100 font-bold text-wine-600 transition-all hover:bg-wine-50 active:scale-95" onClick={() => { setActiveTab('orders'); setShowForm('sales_order'); }}>
            <Plus className="mr-2 h-4 w-4 shrink-0" />
            New Order
          </Button>
          <Button onClick={() => { setActiveTab('challans'); setShowForm('delivery_challan'); }} className="shrink-0 whitespace-nowrap rounded-xl bg-wine-600 px-5 font-semibold text-white shadow-lg transition-all hover:opacity-90 active:scale-95">
            <Plus className="mr-2 h-4 w-4 shrink-0" />
            New Challan
          </Button>
        </div>
      </div>

      {/* Forms */}
      {showForm && (
        <SalesDocumentForm
          type={showForm}
          onClose={() => { setShowForm(null); setInitialFormData(null); }}
          onSave={refreshData}
          products={products}
          customers={customers}
          warehouses={warehouses}
          initialData={initialFormData}
          category={category}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={cn(MOBILE_TAB_LIST, 'md:w-auto')}>
          <TabsTrigger value="quotations" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:text-wine-600 data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest">
            <FileText className="w-3.5 h-3.5 mr-2" />
            Quotations ({quotations.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:text-wine-600 data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest">
            <ShoppingCart className="w-3.5 h-3.5 mr-2" />
            Sales Orders ({salesOrders.length})
          </TabsTrigger>
          <TabsTrigger value="challans" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:text-wine-600 data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest">
            <Package className="w-3.5 h-3.5 mr-2" />
            Delivery Challans ({challans.length})
          </TabsTrigger>
        </TabsList>

        {/* Quotations Tab */}
        <TabsContent value="quotations" className="space-y-4">
          <QuotationsTable
            data={quotations}
            onView={(doc) => handleView(doc, 'quotation')}
            onConvert={handleConvertQuotationToOrder}
            isLoading={isProcessing}
          />
        </TabsContent>

        {/* Sales Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <SalesOrdersTable
            data={salesOrders}
            onView={(doc) => handleView(doc, 'sales_order')}
            onConvert={(id, type) => {
              if (type === 'challan') handleConvertOrderToChallan(id);
              if (type === 'invoice') handleConvertOrderToInvoice(id);
            }}
            isLoading={isProcessing}
          />
        </TabsContent>

        {/* Challans Tab */}
        <TabsContent value="challans" className="space-y-4">
          <DeliveryChallansTable
            data={challans}
            onView={(doc) => handleView(doc, 'delivery_challan')}
            onIssueInvoice={(id) => handleConvertChallanToInvoice(id)}
            isLoading={isProcessing}
          />
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      {previewData && (
        <SalesDocumentPreview
          document={previewData}
          type={previewType}
          onClose={() => setPreviewData(null)}
          category={category}
        />
      )}
    </div>
  );
}








