'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs as BaseTabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, ShoppingCart, DollarSign as DollarIcon, TrendingUp, TrendingDown, Package as PackageIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
const DomainDashboard = dynamic(() => import('./tabs/DomainDashboard').then(mod => mod.DomainDashboard));
const InventoryTab = dynamic(() => import('./tabs/InventoryTab').then(mod => mod.InventoryTab));
const InvoiceList = dynamic(() => import('./islands/InvoiceList.client').then(mod => mod.InvoiceList));
const CustomersTab = dynamic(() => import('./tabs/CustomersTab').then(mod => mod.CustomersTab));
const MultiLocationInventory = dynamic(() => import('@/components/MultiLocationInventory').then(mod => mod.MultiLocationInventory));
const ManufacturingModule = dynamic(() => import('@/components/ManufacturingModule').then(mod => mod.ManufacturingModule));
const PurchaseOrderManager = dynamic(() => import('@/components/PurchaseOrderManager').then(mod => mod.PurchaseOrderManager));
const SalesManager = dynamic(() => import('@/components/SalesManager').then(mod => mod.SalesManager));
const VendorManager = dynamic(() => import('@/components/VendorManager').then(mod => mod.VendorManager));
const PaymentManager = dynamic(() => import('@/components/payment/PaymentManager'));
const QuotationOrderChallanManager = dynamic(() => import('@/components/QuotationOrderChallanManager').then(mod => mod.QuotationOrderChallanManager));
const AdvancedAnalytics = dynamic(() => import('@/components/AdvancedAnalytics').then(mod => mod.AdvancedAnalytics));
const DemandForecast = dynamic(() => import('@/components/DemandForecast').then(mod => mod.DemandForecast));
const FinancialOverview = dynamic(() => import('@/components/dashboard/FinancialOverview').then(mod => mod.FinancialOverview));
const TaxComplianceManager = dynamic(() => import('@/components/TaxComplianceManager').then(mod => mod.TaxComplianceManager));
const SettingsManager = dynamic(() => import('@/components/SettingsManager').then(mod => mod.SettingsManager));
const SerialScanner = dynamic(() => import('@/components/inventory/SerialScanner').then(mod => mod.SerialScanner));
const PosTerminal = dynamic(() => import('@/components/pos/PosTerminal').then(mod => mod.PosTerminal));
const SuperStorePOS = dynamic(() => import('@/components/pos/SuperStorePOS').then(mod => mod.SuperStorePOS));
const RestaurantManager = dynamic(() => import('@/components/restaurant/RestaurantManager').then(mod => mod.RestaurantManager));
const RestaurantPOS = dynamic(() => import('@/components/restaurant/RestaurantPOS').then(mod => mod.RestaurantPOS));
const FloorPlanEditor = dynamic(() => import('@/components/restaurant/FloorPlanEditor').then(mod => mod.FloorPlanEditor));
const KitchenDisplaySystem = dynamic(() => import('@/components/restaurant/KitchenDisplaySystem').then(mod => mod.KitchenDisplaySystem));
const ReservationManager = dynamic(() => import('@/components/restaurant/ReservationManager').then(mod => mod.ReservationManager));
const ExpenseManager = dynamic(() => import('@/components/finance/ExpenseManager').then(mod => mod.ExpenseManager));
const FinanceHub = dynamic(() => import('@/components/finance/FinanceHub'));
const PayrollDashboard = dynamic(() => import('@/components/hr/PayrollDashboard').then(mod => mod.PayrollDashboard));
const AttendanceTracker = dynamic(() => import('@/components/hr/AttendanceTracker').then(mod => mod.AttendanceTracker));
const ShiftScheduler = dynamic(() => import('@/components/hr/ShiftScheduler').then(mod => mod.ShiftScheduler));
const ApprovalInbox = dynamic(() => import('@/components/workflow/ApprovalInbox').then(mod => mod.ApprovalInbox));
const WorkflowBuilder = dynamic(() => import('@/components/workflow/WorkflowBuilder').then(mod => mod.WorkflowBuilder));
const LoyaltyManager = dynamic(() => import('@/components/crm/LoyaltyManager').then(mod => mod.LoyaltyManager));
const PosRefundPanel = dynamic(() => import('@/components/pos/PosRefundPanel').then(mod => mod.PosRefundPanel));
const AuditTrailViewer = dynamic(() => import('@/components/audit/AuditTrailViewer').then(mod => mod.AuditTrailViewer));
const PromotionEngine = dynamic(() => import('@/components/crm/PromotionEngine').then(mod => mod.PromotionEngine));
const CampaignsManager = dynamic(() => import('@/components/crm/CampaignsManager').then(mod => mod.CampaignsManager));
const CustomerLoyaltyPortal = dynamic(() => import('@/components/crm/CustomerLoyaltyPortal').then(mod => mod.CustomerLoyaltyPortal));
const AIInsightsPanel = dynamic(() => import('@/components/intelligence/AIInsightsPanel').then(mod => mod.AIInsightsPanel));
const ReportBuilder = dynamic(() => import('@/components/reports/ReportBuilder').then(mod => mod.ReportBuilder));
const StoreSettingsManager = dynamic(() => import('@/components/StoreSettingsManager').then(mod => mod.StoreSettingsManager));
const OrdersManager = dynamic(() => import('@/components/orders/OrdersManager').then(mod => mod.OrdersManager));
const TabGuard = dynamic(() => import('@/components/guards/TabGuard').then(mod => mod.TabGuard));
const ResourceLimitBanner = dynamic(() => import('@/components/ui/ResourceLimitBanner').then(mod => mod.ResourceLimitBanner));
const NotificationBell = dynamic(() => import('@/components/notifications/NotificationBell').then(mod => mod.NotificationBell));
import { isPosRelevant, isHospitality, isCampaignRelevant } from '@/lib/config/domains';

export function DashboardTabs({
    activeTab,
    searchTerm = '',
    category,
    business,
    role,
    invoices = [],
    products = [],
    customers = [],
    vendors = [],
    quotations = [],
    salesOrders = [],
    challans = [],
    purchaseOrders = [],
    locations = [],
    bomList = [],
    productionOrders = [],
    accountingSummary,
    dashboardChartData,
    dashboardMetrics,
    expenseBreakdown = [],
    expenses = [],
    dateRange,
    currency,
    colors,
    planTier = 'free',
    resourceLimits,
    domainKnowledge,
    handlers,
    isLoading = false,
    user // Add user prop for role-based dashboards
}) {
    const posRelevant = isPosRelevant(category, domainKnowledge);
    const hospitalityDomain = isHospitality(category);
    const campaignRelevant = isCampaignRelevant(category, domainKnowledge);

    // Memoized Filtering Logic
    const filteredProducts = React.useMemo(() => {
        if (!searchTerm) return products;
        const lowerTerm = searchTerm.toLowerCase();
        return products.filter(p =>
            (p.name && p.name.toLowerCase().includes(lowerTerm)) ||
            (p.sku && p.sku.toLowerCase().includes(lowerTerm)) ||
            (p.category && p.category.toLowerCase().includes(lowerTerm)) ||
            (p.brand && p.brand.toLowerCase().includes(lowerTerm))
        );
    }, [products, searchTerm]);

    const filteredInvoices = React.useMemo(() => {
        if (!searchTerm) return invoices;
        const lowerTerm = searchTerm.toLowerCase();
        return invoices.filter(inv =>
            inv.number?.toLowerCase().includes(lowerTerm) ||
            inv.customer_name?.toLowerCase().includes(lowerTerm) ||
            inv.customer?.name?.toLowerCase().includes(lowerTerm)
        );
    }, [invoices, searchTerm]);

    const filteredCustomers = React.useMemo(() => {
        if (!searchTerm) return customers;
        const lowerTerm = searchTerm.toLowerCase();
        return customers.filter(c =>
            c.name?.toLowerCase().includes(lowerTerm) ||
            c.phone?.toLowerCase().includes(lowerTerm) ||
            c.email?.toLowerCase().includes(lowerTerm)
        );
    }, [customers, searchTerm]);

    const filteredVendors = React.useMemo(() => {
        if (!searchTerm) return vendors;
        const lowerTerm = searchTerm.toLowerCase();
        return vendors.filter(v =>
            v.name?.toLowerCase().includes(lowerTerm) ||
            v.company_name?.toLowerCase().includes(lowerTerm) ||
            v.phone?.toLowerCase().includes(lowerTerm)
        );
    }, [vendors, searchTerm]);

    const filteredQuotations = React.useMemo(() => {
        if (!searchTerm) return quotations;
        const lowerTerm = searchTerm.toLowerCase();
        return quotations.filter(q =>
            q.number?.toLowerCase().includes(lowerTerm) ||
            q.customer_name?.toLowerCase().includes(lowerTerm) ||
            q.customer?.name?.toLowerCase().includes(lowerTerm)
        );
    }, [quotations, searchTerm]);

    const filteredSalesOrders = React.useMemo(() => {
        if (!searchTerm) return salesOrders;
        const lowerTerm = searchTerm.toLowerCase();
        return salesOrders.filter(so =>
            so.number?.toLowerCase().includes(lowerTerm) ||
            so.customer_name?.toLowerCase().includes(lowerTerm)
        );
    }, [salesOrders, searchTerm]);

    const filteredChallans = React.useMemo(() => {
        if (!searchTerm) return challans;
        const lowerTerm = searchTerm.toLowerCase();
        return challans.filter(c =>
            c.number?.toLowerCase().includes(lowerTerm) ||
            c.customer_name?.toLowerCase().includes(lowerTerm)
        );
    }, [challans, searchTerm]);

    const filteredPurchaseOrders = React.useMemo(() => {
        if (!searchTerm) return purchaseOrders;
        const lowerTerm = searchTerm.toLowerCase();
        return purchaseOrders.filter(po =>
            po.purchase_number?.toLowerCase().includes(lowerTerm) ||
            po.vendor_name?.toLowerCase().includes(lowerTerm) ||
            po.vendor?.name?.toLowerCase().includes(lowerTerm)
        );
    }, [purchaseOrders, searchTerm]);

    const filteredBoms = React.useMemo(() => {
        if (!searchTerm) return bomList;
        const lowerTerm = searchTerm.toLowerCase();
        return bomList.filter(b =>
            (b.name && b.name.toLowerCase().includes(lowerTerm)) ||
            (b.productName && b.productName.toLowerCase().includes(lowerTerm)) ||
            (b.product_name && b.product_name.toLowerCase().includes(lowerTerm))
        );
    }, [bomList, searchTerm]);

    const filteredProductionOrders = React.useMemo(() => {
        if (!searchTerm) return productionOrders;
        const lowerTerm = searchTerm.toLowerCase();
        return productionOrders.filter(o =>
            (o.productName && o.productName.toLowerCase().includes(lowerTerm)) ||
            (o.product_name && o.product_name.toLowerCase().includes(lowerTerm)) ||
            (o.bomName && o.bomName.toLowerCase().includes(lowerTerm)) ||
            (o.status && o.status.toLowerCase().includes(lowerTerm))
        );
    }, [productionOrders, searchTerm]);
    const [restaurantView, setRestaurantView] = React.useState('manager');
    const [hrView, setHrView] = React.useState('payroll');
    const [reportsView, setReportsView] = React.useState('analytics');
    const [approvalsView, setApprovalsView] = React.useState('inbox'); // 'inbox' | 'builder'

    const {
        handleTabChange,
        handleDeleteInvoice,
        handleBulkDelete,
        handleExport,
        handleSaveProduct,
        handleDeleteProduct,
        handleQuickAddProduct,
        handleLocationAdd,
        handleLocationUpdate,
        handleLocationDelete,
        handleStockTransfer,
        handleGenerateAutoPO,
        handleDeleteCustomer,
        handleDeleteVendor,
        handleUpdatePOStatus,
        handleCreateBOM,
        handleCreateProductionOrder,
        refreshAllData,
        setShowInvoiceBuilder,
        setShowProductForm,
        setShowCustomerForm,
        setEditingProduct,
        setEditingCustomer,
        setInvoiceInitialData,
        handleDateRangePreset,
        setShowVendorForm,
        setEditingVendor,
        setShowPOBuilder,
        formatCurrency,
        // POS & Restaurant
        posSession,
        handleStartPosSession,
        restaurantTables,
        kitchenQueue,
        handlePosCheckout,
        handleTableAction,
        handleNewRestaurantOrder,
        handleKitchenStatusUpdate,
    } = handlers;

    const tabVariants = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    const wrapTab = (content) => (
        <motion.div
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeOut' }}
        >
            {content}
        </motion.div>
    );

    return (
        <AnimatePresence mode="wait">
            <div key={activeTab}>
                <TabsContent value="dashboard" className="space-y-6 outline-none">
                    {wrapTab(
                        <DomainDashboard
                            businessId={business?.id}
                            category={category}
                            invoices={filteredInvoices}
                            products={filteredProducts}
                            customers={filteredCustomers}
                            dateRange={dateRange}
                            currency={currency}
                            onQuickAction={handlers.handleQuickAction}
                            onDateRangePresetChange={handleDateRangePreset}
                            dashboardMetrics={dashboardMetrics}
                            accountingSummary={accountingSummary}
                            expenseBreakdown={expenseBreakdown}
                            expenses={expenses}
                            domainKnowledge={domainKnowledge}
                            isLoading={isLoading}
                            user={user}
                        />
                    )}
                </TabsContent>

                <TabsContent value="invoices" className="space-y-6 outline-none">
                    <ResourceLimitBanner
                        message={resourceLimits?.getLimitMessage?.('invoices')}
                        isAtLimit={resourceLimits?.limitReached?.('invoices')}
                        onUpgrade={handlers?.handleUpgrade}
                    />
                    {wrapTab(
                        <TabGuard tabKey="invoices" role={role} planTier={planTier} featureName="Invoices" onUpgrade={() => handleTabChange('settings')}>
                            <InvoiceList
                                invoices={filteredInvoices}
                                currency={currency}
                                onAdd={() => handlers?.setShowInvoiceBuilder?.(true)}
                                onInvoiceDelete={handlers?.handleDeleteInvoice}
                                onView={handlers?.handleViewInvoice}
                                onEdit={(invoice) => {
                                    handlers?.setInvoiceInitialData?.(invoice);
                                    handlers?.setShowInvoiceBuilder?.(true);
                                }}
                                onRecordPayment={handlers?.handleRecordPayment}
                                onBulkDelete={handlers?.handleBulkDeleteInvoices}
                                onBulkImport={handlers?.handleBulkImportInvoices}
                                onExport={handlers?.handleExportInvoices}
                                category={category}
                                colors={colors}
                            />
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="inventory" className="space-y-6 outline-none">
                    <ResourceLimitBanner
                        message={resourceLimits?.getLimitMessage?.('products')}
                        isAtLimit={resourceLimits?.limitReached?.('products')}
                        onUpgrade={handlers?.handleUpgrade}
                    />
                    {wrapTab(
                        <TabGuard tabKey="inventory" role={role} planTier={planTier} featureName="Inventory" onUpgrade={() => handleTabChange('settings')}>
                            <InventoryTab
                                products={filteredProducts}
                                businessId={business?.id}
                                category={category}
                                onProductSave={handleSaveProduct}
                                onProductDelete={handleDeleteProduct}
                                refreshData={refreshAllData}
                                domainKnowledge={domainKnowledge}
                                invoices={filteredInvoices}
                                customers={filteredCustomers}
                                vendors={filteredVendors}
                                locations={locations}
                                bomList={bomList}
                                productionOrders={productionOrders}
                                quotations={quotations}
                                salesOrders={salesOrders}
                                challans={challans}
                                onIssueInvoice={(header) => {
                                    setInvoiceInitialData(header);
                                    setShowInvoiceBuilder(true);
                                }}
                                onAdd={() => {
                                    setEditingProduct(null);
                                    setShowProductForm(true);
                                }}
                                onQuickAdd={handleQuickAddProduct}
                                onEdit={(product) => {
                                    setEditingProduct(product);
                                    setShowProductForm(true);
                                }}
                                onUpdate={async (product) => {
                                    // Busy grid: avoid refreshAllData — it races the grid's optimistic row and can
                                    // briefly restore stale server rows after Enter/blur.
                                    const fullProduct = products.find(p => p.id === product.id);

                                    await handleSaveProduct(
                                        {
                                            ...product,
                                            batches: fullProduct?.batches || product.batches || [],
                                            serialNumbers:
                                                fullProduct?.serial_numbers ||
                                                fullProduct?.serialNumbers ||
                                                product.serialNumbers ||
                                                product.serial_numbers ||
                                                [],
                                            business_id: business.id,
                                            isUpdate: true,
                                            productId: product.id,
                                        },
                                        { skipFullWorkspaceRefresh: true }
                                    );
                                }}
                                onLocationAdd={handleLocationAdd}
                                onLocationUpdate={handleLocationUpdate}
                                onLocationDelete={handleLocationDelete}
                                onStockTransfer={handleStockTransfer}
                                onGeneratePO={handleGenerateAutoPO}
                            />
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="customers" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="customers" role={role} planTier={planTier} featureName="Customers" onUpgrade={() => handleTabChange('settings')}>
                            <CustomersTab
                                customers={filteredCustomers}
                                businessId={business?.id}
                                onCustomerDelete={handleDeleteCustomer}
                                onAdd={() => setShowCustomerForm(true)}
                                onUpdate={(customer) => {
                                    setEditingCustomer(customer);
                                    setShowCustomerForm(true);
                                }}
                            />
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="vendors" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="vendors" role={role} planTier={planTier} featureName="Vendors" onUpgrade={() => handleTabChange('settings')}>
                            <VendorManager
                                vendors={filteredVendors}
                                onAdd={() => {
                                    setEditingVendor(null);
                                    setShowVendorForm(true);
                                }}
                                onUpdate={(vendor) => {
                                    setEditingVendor(vendor);
                                    setShowVendorForm(true);
                                }}
                                onDelete={handleDeleteVendor}
                                businessId={business?.id}
                                category={category}
                            />
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="payments" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="payments" role={role} planTier={planTier} featureName="Payments" onUpgrade={() => handleTabChange('settings')}>
                            <PaymentManager
                                businessId={business?.id}
                                customers={filteredCustomers}
                                vendors={filteredVendors}
                                invoices={filteredInvoices}
                                purchases={purchaseOrders}
                                refreshData={refreshAllData}
                            />
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="purchases" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="purchases" role={role} planTier={planTier} featureName="Purchases" onUpgrade={() => handleTabChange('settings')}>
                            <PurchaseOrderManager
                                category={category}
                                purchaseOrders={filteredPurchaseOrders}
                                onUpdateStatus={handleUpdatePOStatus}
                                refreshData={refreshAllData}
                                onCreate={() => setShowPOBuilder(true)}
                            />
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="sales" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="sales" role={role} planTier={planTier} featureName="Sales" onUpgrade={() => handleTabChange('settings')}>
                            <SalesManager
                                invoices={invoices}
                                customers={customers}
                                products={products}
                                category={category}
                                businessId={business?.id}
                                currency={currency}
                            />
                        </TabGuard>
                    )}
                </TabsContent>

                {domainKnowledge?.manufacturingEnabled && (
                    <TabsContent value="manufacturing" className="space-y-6 outline-none">
                        {wrapTab(
                            <TabGuard tabKey="manufacturing" role={role} planTier={planTier} featureName="Manufacturing" onUpgrade={() => handleTabChange('settings')}>
                                <ManufacturingModule
                                    products={filteredProducts}
                                    bomList={filteredBoms}
                                    productionOrders={filteredProductionOrders}
                                    warehouses={locations}
                                    onBOMAdd={handleCreateBOM}
                                    onProductionOrderCreate={handleCreateProductionOrder}
                                    onSave={refreshAllData}
                                    businessId={business?.id}
                                />
                            </TabGuard>
                        )}
                    </TabsContent>
                )}

                {domainKnowledge?.multiLocationEnabled && (
                    <TabsContent value="warehouses" className="space-y-6 outline-none">
                        {wrapTab(
                            <TabGuard tabKey="warehouses" role={role} planTier={planTier} featureName="Warehouses" requiredPlan="professional" onUpgrade={() => handleTabChange('settings')}>
                                <MultiLocationInventory
                                    businessId={business?.id}
                                    locations={locations}
                                    products={filteredProducts}
                                    onLocationAdd={handleLocationAdd}
                                    onLocationUpdate={handleLocationUpdate}
                                    onLocationDelete={handleLocationDelete}
                                    onStockTransfer={handleStockTransfer}
                                />
                            </TabGuard>
                        )}
                    </TabsContent>
                )}

                <TabsContent value="quotations" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="quotations" role={role} planTier={planTier} featureName="Quotations" onUpgrade={() => handleTabChange('settings')}>
                            <QuotationOrderChallanManager
                                quotations={filteredQuotations}
                                salesOrders={filteredSalesOrders}
                                challans={filteredChallans}
                                customers={filteredCustomers}
                                products={filteredProducts}
                                refreshData={refreshAllData}
                                category={category}
                                onIssueInvoice={(header) => {
                                    setInvoiceInitialData(header);
                                    setShowInvoiceBuilder(true);
                                }}
                            />
                        </TabGuard>
                    )}
                </TabsContent>

                {domainKnowledge?.batchTrackingEnabled && (
                    <TabsContent value="batches" className="space-y-6 outline-none">
                        {wrapTab(
                            <TabGuard tabKey="batches" role={role} planTier={planTier} featureName="Batches & Serials" requiredPlan="professional" onUpgrade={() => handleTabChange('settings')}>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Global Batch Monitoring</CardTitle>
                                            <CardDescription>Select a product from the Inventory tab to manage specific batches.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[360px] flex flex-col items-center justify-center text-center">
                                            <Package className="w-12 h-12 text-gray-300 mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900">Batch details are product-specific</h3>
                                            <p className="text-gray-500 max-w-sm mt-2">
                                                To manage batches, go to the <strong>Inventory</strong> tab, click the actions menu on any product, and select <strong>Manage Batches</strong>.
                                            </p>
                                            <Button
                                                variant="outline"
                                                className="mt-6"
                                                onClick={() => handleTabChange('inventory')}
                                            >
                                                Go to Inventory
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Serial Verification</CardTitle>
                                            <CardDescription>Scan or enter serial numbers to validate inventory authenticity and status.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <SerialScanner
                                                businessId={business?.id}
                                                mode="scan"
                                            />
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabGuard>
                        )}
                    </TabsContent>
                )}

                <TabsContent value="accounting" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="accounting" role={role} planTier={planTier} featureName="Accounting" onUpgrade={() => handleTabChange('settings')}>
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-sm font-medium text-gray-500">Accounts Receivable</CardTitle>
                                                <div className="p-2 bg-brand-50 rounded-lg text-brand-primary">
                                                    <DollarIcon className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-black text-gray-900">
                                                {formatCurrency(accountingSummary?.accountsReceivable || 0, currency)}
                                            </div>
                                            <div className="flex items-center mt-1 text-xs font-medium text-brand-primary bg-brand-50 w-fit px-2 py-0.5 rounded-full">
                                                {accountingSummary?.pendingInvoiceCount || 0} invoices pending
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-sm font-medium text-gray-500">Accounts Payable</CardTitle>
                                                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                                                    <ShoppingCart className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-black text-gray-900">
                                                {formatCurrency(accountingSummary?.accountsPayable || 0, currency)}
                                            </div>
                                            <div className="flex items-center mt-1 text-xs font-medium text-red-600 bg-red-50 w-fit px-2 py-0.5 rounded-full">
                                                <TrendingDown className="w-3 h-3 mr-1" />
                                                {accountingSummary?.pendingPurchaseCount || 0} orders pending
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-sm font-medium text-gray-500">Inventory Value</CardTitle>
                                                <div className="p-2 bg-brand-50 rounded-lg text-brand-primary">
                                                    <PackageIcon className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-black text-gray-900">
                                                {formatCurrency(accountingSummary?.inventoryValue || 0, currency)}
                                            </div>
                                            <div className="mt-1 text-xs font-medium text-gray-500">
                                                {products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0).toLocaleString()} units in stock
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-sm font-medium text-gray-500">Gross Profit</CardTitle>
                                                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                                    <TrendingUp className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={`text-2xl font-black ${(accountingSummary?.grossProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(accountingSummary?.grossProfit || 0, currency)}
                                            </div>
                                            <div className="flex items-center mt-1 text-xs font-medium text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded-full">
                                                {Math.round(accountingSummary?.margin || 0)}% net margin
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <FinancialOverview
                                    businessId={business?.id}
                                    category={category}
                                    accountingSummary={accountingSummary}
                                    chartData={dashboardChartData}
                                    currency={currency}
                                    role={role}
                                    onTabChange={handleTabChange}
                                />
                            </>
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="finance" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="finance" role={role} planTier={planTier} featureName="Finance" onUpgrade={() => handleTabChange('settings')}>
                            <FinanceHub businessId={business?.id} businessCategory={category} />
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="reports" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="reports" role={role} planTier={planTier} featureName="Analytics & AI" onUpgrade={() => handleTabChange('settings')}>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Analytics & Reports</h2>
                                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                                        {[
                                            { key: 'analytics', label: 'Analytics' },
                                            { key: 'forecast', label: 'Demand Forecast' },
                                            { key: 'ai', label: 'AI Insights' },
                                            { key: 'builder', label: 'Report Builder' },
                                        ].map(v => (
                                            <button
                                                key={v.key}
                                                onClick={() => setReportsView(v.key)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${reportsView === v.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                {v.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {reportsView === 'analytics' && <AdvancedAnalytics businessId={business?.id} category={category} currency={currency} dateRange={dateRange} />}
                                {reportsView === 'forecast' && <DemandForecast businessId={business?.id} category={category} products={products} invoices={invoices} domainKnowledge={domainKnowledge} dateRange={dateRange} />}
                                {reportsView === 'ai' && <AIInsightsPanel businessId={business?.id} dateRange={dateRange} />}
                                {reportsView === 'builder' && <ReportBuilder businessId={business?.id} currency={currency} dateRange={dateRange} />}
                            </div>
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="campaigns" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="campaigns" role={role} planTier={planTier} domainCheck={campaignRelevant} domainTitle="Campaigns & Marketing not relevant for this domain" domainMessage="Marketing automations are enabled for customer-facing retail and service domains." requiredPlan="business" featureName="Campaigns & Marketing" onUpgrade={() => handleTabChange('settings')}>
                            <CampaignsManager
                                businessId={business?.id}
                                currency={currency}
                                customerCount={
                                    (customers || []).filter((c) => !c.is_deleted).length || (customers || []).length
                                }
                                category={category}
                            />
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="gst" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="gst" role={role} planTier={planTier} featureName="Tax & GST" onUpgrade={() => handleTabChange('settings')}>
                            <TaxComplianceManager
                                invoices={filteredInvoices}
                                purchaseOrders={purchaseOrders}
                                business={business}
                            />
                        </TabGuard>
                    )}
                </TabsContent>

                {/* --- Phase 3+5+6: New Module Tabs ---------------------------- */}

                <TabsContent value="pos" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard
                            tabKey="pos"
                            role={role}
                            planTier={planTier}
                            domainCheck={posRelevant}
                            domainTitle="Point of Sale not relevant for this domain"
                            domainMessage="Switch to a retail or hospitality domain profile to enable POS workflows."
                            featureName="Point of Sale"
                            onUpgrade={() => handleTabChange('settings')}
                        >
                            {category === 'restaurant-cafe' ? (
                                <RestaurantPOS
                                    businessId={business?.id}
                                    products={filteredProducts}
                                    customers={filteredCustomers}
                                    onStartSession={handleStartPosSession}
                                    onOrderSent={handleNewRestaurantOrder}
                                    onOrderComplete={() => refreshAllData?.()}
                                    currency={currency}
                                    session={posSession}
                                />
                            ) : ['supermarket', 'grocery', 'wholesale-distribution', 'bakery-confectionery'].includes(category) ? (
                                <SuperStorePOS
                                    businessId={business?.id}
                                    products={filteredProducts}
                                    customers={filteredCustomers}
                                    onStartSession={handleStartPosSession}
                                    onCompleteSale={handlePosCheckout}
                                    currency={currency}
                                    session={posSession}
                                />
                            ) : (
                                <PosTerminal
                                    businessId={business?.id}
                                    products={filteredProducts}
                                    customers={filteredCustomers}
                                    onStartSession={handleStartPosSession}
                                    onCompleteSale={handlePosCheckout}
                                    currency={currency}
                                    session={posSession}
                                />
                            )}
                        </TabGuard>
                    )}
                </TabsContent>

                {/* --- Orders Tab - Storefront Orders ----------------------- */}
                <TabsContent value="orders" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard
                            tabKey="orders"
                            role={role}
                            planTier={planTier}
                            featureName="Orders Management"
                            onUpgrade={() => handleTabChange('settings')}
                        >
                            <OrdersManager
                                business={business}
                                category={category}
                            />
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="restaurant" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard
                            tabKey="restaurant"
                            role={role}
                            planTier={planTier}
                            domainCheck={hospitalityDomain}
                            domainTitle="Restaurant module is domain-specific"
                            domainMessage="This module is available for bakery, restaurant, and hotel domains only."
                            requiredPlan="starter"
                            featureName="Restaurant Operations"
                            onUpgrade={() => handleTabChange('settings')}
                        >
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Restaurant Operations</h2>
                                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                                        {[
                                            { key: 'manager', label: 'Manager' },
                                            { key: 'floorplan', label: 'Floor Plan' },
                                            { key: 'reservations', label: 'Reservations' },
                                        ].map(v => (
                                            <button
                                                key={v.key}
                                                onClick={() => setRestaurantView(v.key)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${restaurantView === v.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {v.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {restaurantView === 'floorplan' && (
                                    <FloorPlanEditor
                                        businessId={business?.id}
                                        initialTables={restaurantTables || []}
                                        onSave={(data) => {
                                            handleTableAction('bulk_update', null, data);
                                            setRestaurantView('manager');
                                        }}
                                    />
                                )}
                                {restaurantView === 'reservations' && (
                                    <ReservationManager
                                        businessId={business?.id}
                                        tables={restaurantTables || []}
                                    />
                                )}
                                {restaurantView === 'manager' && (
                                    <>
                                        <RestaurantManager
                                            businessId={business?.id}
                                            tables={restaurantTables || []}
                                            kitchenQueue={kitchenQueue || []}
                                            onTableAction={(table) => {
                                                // RestaurantManager passes the table object; adapt to handleTableAction(action, tableId)
                                                if (!table?.id) return;
                                                const nextStatus = table.status === 'occupied' ? 'clear'
                                                    : table.status === 'available' ? 'occupy'
                                                    : table.status;
                                                handleTableAction(nextStatus, table.id, table);
                                            }}
                                            onNewOrder={handleNewRestaurantOrder}
                                            onKitchenStatusUpdate={handleKitchenStatusUpdate}
                                            onRefresh={refreshAllData}
                                        />
                                        <KitchenDisplaySystem businessId={business?.id} />
                                    </>
                                )}
                            </div>
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="expenses" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard
                            role={role}
                            planTier={planTier}
                            permission="finance.manage_expenses"
                            featureKey="expense_tracking"
                            requiredPlan="starter"
                            featureName="Expenses"
                            onUpgrade={() => handleTabChange('settings')}
                        >
                            <div className="space-y-6">
                                <ExpenseManager
                                    businessId={business?.id}
                                    expenses={expenses}
                                    vendors={filteredVendors}
                                    currency={currency}
                                    onCreateExpense={async () => {
                                        await handlers?.handleExpenseSaved?.();
                                    }}
                                />

                                <div className="border-t border-gray-100 pt-6">
                                    <FinanceHub businessId={business?.id} businessCategory={category} initialTab="expenses" />
                                </div>
                            </div>
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="payroll" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="payroll" role={role} planTier={planTier} requiredPlan="business" featureName="HR & Payroll" onUpgrade={() => handleTabChange('settings')}>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">HR & Payroll</h2>
                                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                                        {[
                                            { key: 'payroll', label: 'Payroll' },
                                            { key: 'attendance', label: 'Attendance' },
                                            { key: 'shifts', label: 'Shifts' },
                                        ].map(v => (
                                            <button
                                                key={v.key}
                                                onClick={() => setHrView(v.key)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${hrView === v.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {v.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {hrView === 'payroll' && (
                                    <PayrollDashboard
                                        businessId={business?.id}
                                        employees={handlers.payrollEmployees || []}
                                        payrollRuns={handlers.payrollRuns || []}
                                        onProcessPayroll={handlers.handleProcessPayroll}
                                        onViewPayslips={handlers.handleViewPayslips}
                                        onAddEmployee={handlers.handleAddEmployee}
                                        currency={currency}
                                    />
                                )}
                                {hrView === 'attendance' && (
                                    <AttendanceTracker 
                                        businessId={business?.id} 
                                        employees={(handlers.payrollEmployees || []).map(emp => ({
                                            id: emp.id,
                                            name: emp.full_name || 'Unnamed Employee',
                                            role: emp.designation || 'Staff',
                                            department: emp.department || 'Operations'
                                        }))}
                                    />
                                )}
                                {hrView === 'shifts' && (
                                    <ShiftScheduler 
                                        businessId={business?.id} 
                                        employees={(handlers.payrollEmployees || []).map(emp => ({
                                            id: emp.id,
                                            name: emp.full_name || 'Unnamed Employee',
                                            role: emp.designation || 'Staff',
                                            department: emp.department || 'Operations'
                                        }))}
                                    />
                                )}
                            </div>
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="approvals" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="approvals" role={role} planTier={planTier} requiredPlan="business" featureName="Approval Workflows" onUpgrade={() => handleTabChange('settings')}>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Approvals & Workflows</h2>
                                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                                        {[
                                            { key: 'inbox', label: 'Approval Inbox' },
                                            { key: 'builder', label: 'Workflow Builder' },
                                        ].map(v => (
                                            <button
                                                key={v.key}
                                                onClick={() => setApprovalsView(v.key)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${approvalsView === v.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {v.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {approvalsView === 'inbox' && (
                                    <ApprovalInbox
                                        pendingRequests={handlers.pendingApprovals || []}
                                        historyRequests={handlers.approvalHistory || []}
                                        onApprove={handlers.handleApproveRequest}
                                        onReject={handlers.handleRejectRequest}
                                        currency={currency}
                                    />
                                )}
                                {approvalsView === 'builder' && (
                                    <WorkflowBuilder businessId={business?.id} />
                                )}
                            </div>
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="loyalty" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="loyalty" role={role} planTier={planTier} domainCheck={posRelevant} domainTitle="Loyalty & CRM not relevant for this domain" domainMessage="Loyalty and POS CRM are available for customer-facing retail and hospitality domains." requiredPlan="starter" featureName="Loyalty & CRM" onUpgrade={() => handleTabChange('settings')}>
                            <div className="space-y-8">
                                <CustomerLoyaltyPortal businessId={business?.id} currency={currency} />
                                <div className="border-t border-gray-100 pt-8">
                                    <PromotionEngine businessId={business?.id} currency={currency} />
                                </div>
                                <div className="border-t border-gray-100 pt-8">
                                    <LoyaltyManager businessId={business?.id} />
                                </div>
                            </div>
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="refunds" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="refunds" role={role} planTier={planTier} domainCheck={posRelevant} domainTitle="Refunds & Returns not relevant for this domain" domainMessage="Refund workflows are available only for POS-enabled domains." requiredPlan="starter" featureName="POS & Refunds" onUpgrade={() => handleTabChange('settings')}>
                            <PosRefundPanel businessId={business?.id} />
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="audit" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="audit" role={role} planTier={planTier} requiredPlan="business" featureName="Audit Trail" onUpgrade={() => handleTabChange('settings')}>
                            <AuditTrailViewer businessId={business?.id} />
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="settings" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="settings" role={role} planTier={planTier} featureName="Settings" onUpgrade={() => handleTabChange('settings')}>
                            <SettingsManager category={category} />
                        </TabGuard>
                    )}
                </TabsContent>

                {/* --- Store Settings Tab --- */}
                <TabsContent value="store-settings" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="store-settings" role={role} planTier={planTier} featureName="Store Settings" onUpgrade={() => handleTabChange('settings')}>
                            <StoreSettingsManager business={business} category={category} />
                        </TabGuard>
                    )}
                </TabsContent>

                {/* --- Finance Sub-Tabs (promoted to top-level navigation) --- */}
                <TabsContent value="credit-notes" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="credit-notes" role={role} planTier={planTier} featureName="Credit Notes" onUpgrade={() => handleTabChange('settings')}>
                            <FinanceHub businessId={business?.id} businessCategory={category} initialTab="credit-notes" />
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="fiscal" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="fiscal" role={role} planTier={planTier} requiredPlan="starter" featureName="Fiscal Periods" onUpgrade={() => handleTabChange('settings')}>
                            <FinanceHub businessId={business?.id} businessCategory={category} initialTab="fiscal" />
                        </TabGuard>
                    )}
                </TabsContent>

                <TabsContent value="exchange-rates" className="space-y-6 outline-none">
                    {wrapTab(
                        <TabGuard tabKey="exchange-rates" role={role} planTier={planTier} requiredPlan="professional" featureName="Exchange Rates" onUpgrade={() => handleTabChange('settings')}>
                            <FinanceHub businessId={business?.id} businessCategory={category} initialTab="exchange" />
                        </TabGuard>
                    )}
                </TabsContent>

            </div>
        </AnimatePresence>
    );
}
