'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useBusiness } from '@/lib/context/BusinessContext';
import {
  productAPI,
  customerAPI,
  invoiceAPI,
  posAPI,
  vendorAPI,
  purchaseOrderAPI,
  manufacturingAPI,
  warehouseAPI,
} from '@/lib/api';
import { payrollAPI } from '@/lib/api/payroll';
import { workflowAPI } from '@/lib/api/workflow';
import { bulkDeleteAction } from '@/lib/actions/premium/automation/bulk';
import { getTablesAction, getKitchenQueueAction } from '@/lib/actions/standard/restaurant';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { ProductForm } from '@/components/ProductForm';
import { EnhancedInvoiceBuilder } from '@/components/EnhancedInvoiceBuilder';
import { CustomerForm } from '@/components/CustomerForm';
import { SetupWizard } from '@/components/onboarding/SetupWizard';
import { getDomainColors } from '@/lib/domainColors';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { formatCurrency } from '@/lib/currency';
import toast from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useFilters } from '@/lib/context/FilterContext';
import { useData } from '@/lib/context/DataContext';
import { getDateRangeFromPreset } from '@/lib/utils/datePresets';
import { isEntitlementError, getEntitlementErrorMessage, markEntitlementErrorHandled } from '@/lib/utils/subscriptionErrors';
import { ActionModals } from './components/ActionModals';
import { DashboardTabs } from './components/DashboardTabs';
import { BusinessLoadingBoundary } from '@/components/guards/BusinessLoadingBoundary';
import { useResourceLimits } from '@/lib/hooks/useResourceLimits';
import { getDomainConfig } from '@/lib/config/domains';
import { QUICK_ACTION_IDS } from '@/lib/config/quickActions';
import { normalizeDashboardTab, resolveDashboardTab } from '@/lib/config/tabs';

function BusinessDashboardContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Auth & Business context -- must come before any hook that references `business`
  const {
    business,
    role,
    planTier: contextPlanTier,
    updateBusiness,
    isLoading: businessLoading,
    switchBusinessByDomain
  } = useBusiness();

  // Use business domain for URL routing, but keep category for UI rendering logic
  const currentDomain = business?.domain || String(params?.category || 'retail-shop');
  const category = business?.category || 'retail-shop';

  const normalizedUrlTab = normalizeDashboardTab(searchParams.get('tab') || 'dashboard');
  const activeTab = resolveDashboardTab(normalizedUrlTab);

  // Sync URL when state changes (e.g. valid tab click)
  const handleTabChange = useCallback((val) => {
    const normalizedTab = normalizeDashboardTab(val);

    if (normalizedTab === 'platform-admin') {
      router.push('/admin', { scroll: false });
      return;
    }

    const targetTab = resolveDashboardTab(normalizedTab);
    router.push(`/business/${currentDomain}?tab=${targetTab}`, { scroll: false });
  }, [currentDomain, router]);

  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [showQuickInvoice, setShowQuickInvoice] = useState(false);
  const [showInvoiceBuilder, setShowInvoiceBuilder] = useState(false);
  const [invoiceInitialData, setInvoiceInitialData] = useState(null); // New state for pre-filling invoice
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showPOBuilder, setShowPOBuilder] = useState(false);
  const [poInitialData, setPoInitialData] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [viewingType, setViewingType] = useState(null);

  const handleQuickAction = useCallback((actionId) => {
    switch (actionId) {
      case QUICK_ACTION_IDS.OPEN_QUICK_ACTION:
        setShowQuickAction(true);
        break;
      case 'sales':
      case 'invoices':
        handleTabChange('invoices');
        break;
      case 'inventory':
        handleTabChange('inventory');
        break;
      case 'customers':
        handleTabChange('customers');
        break;
      case 'analytics':
        handleTabChange('reports');
        break;
      case 'manufacturing':
      case 'new-production':
        handleTabChange('manufacturing');
        break;
      case 'accounting':
        handleTabChange('accounting');
        break;
      case 'new-invoice':
      case 'add-invoice':
      case QUICK_ACTION_IDS.ADD_INVOICE:
        setShowInvoiceBuilder(true);
        break;
      case 'create-invoice':
      case 'quick-invoice':
      case 'quick-checkout':
        setShowQuickInvoice(true);
        break;
      case 'new-product':
      case 'add-product':
      case QUICK_ACTION_IDS.ADD_PRODUCT:
        setShowProductForm(true);
        break;
      case 'new-customer':
      case 'add-customer':
      case QUICK_ACTION_IDS.ADD_CUSTOMER:
        setShowCustomerForm(true);
        break;
      case 'new-vendor':
      case 'add-vendor':
      case QUICK_ACTION_IDS.ADD_VENDOR:
        setEditingVendor(null);
        setShowVendorForm(true);
        break;
      case 'new-purchase':
      case 'add-purchase':
      case QUICK_ACTION_IDS.ADD_PURCHASE:
        setPoInitialData(null);
        setShowPOBuilder(true);
        break;
      case 'new-quotation':
      case QUICK_ACTION_IDS.NEW_QUOTATION:
        handleTabChange('quotations');
        break;
      case 'generate-report':
      case QUICK_ACTION_IDS.GENERATE_REPORT:
        handleTabChange('reports');
        break;
      case 'excel-mode':
      case 'fast-entry':
        handleTabChange('inventory');
        toast.success("Excel Mode active in Inventory", { icon: '[CHART]' });
        break;
      default:
        if (resolveDashboardTab(normalizeDashboardTab(actionId)) !== 'dashboard' || normalizeDashboardTab(actionId) === 'dashboard') {
          handleTabChange(normalizeDashboardTab(actionId));
        }
        break;
    }
  }, [handleTabChange]);

  // Handle Events from Palette and Sidebar
  useEffect(() => {
    const onQuickActionEvent = (e) => handleQuickAction(e.detail?.actionId);
    const onOpenModalEvent = (e) => {
      const modalId = e.detail?.modalId;
      if (modalId === 'invoice') setShowInvoiceBuilder(true);
      if (modalId === 'product') {
        setEditingProduct(null);
        setShowProductForm(true);
      }
      if (modalId === 'customer') setShowCustomerForm(true);
      if (modalId === 'vendor') setShowVendorForm(true);
      if (modalId === 'purchase') setShowPOBuilder(true);
    };

    const onSwitchTabEvent = (e) => {
      const tabId = e.detail?.tab;
      if (tabId) handleTabChange(tabId);
    };

    const onViewDetailsEvent = (e) => {
      setViewingItem(e.detail?.item);
      setViewingType(e.detail?.type);
    };

    window.addEventListener('open-quick-action', onQuickActionEvent);
    window.addEventListener('open-modal', onOpenModalEvent);
    window.addEventListener('switch-tab', onSwitchTabEvent);
    window.addEventListener('view-details', onViewDetailsEvent);

    return () => {
      window.removeEventListener('open-quick-action', onQuickActionEvent);
      window.removeEventListener('open-modal', onOpenModalEvent);
      window.removeEventListener('switch-tab', onSwitchTabEvent);
      window.removeEventListener('view-details', onViewDetailsEvent);
    };
  }, [handleQuickAction]);

  // Fallback logic for domains not in the static businessCategories map
  const businessInfo = useMemo(() => {
    const domainConfig = getDomainConfig(category);
    if (domainConfig) return { name: domainConfig.name, icon: domainConfig.icon, color: domainConfig.color };

    // Dynamically derive from domainKnowledge
    const knowledge = getDomainKnowledge(category);
    return {
      name: category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      icon: knowledge.icon || '🚀',
      color: 'wine'
    };
  }, [category]);

  const colors = getDomainColors(category);
  const domainKnowledge = getDomainKnowledge(category);

  // Auth context
  const { user, loading: authLoading } = useAuth();

  const {
    invoices,
    products,
    customers,
    vendors,
    quotations,
    salesOrders,
    challans,
    purchaseOrders,
    locations,
    bomList,
    productionOrders,
    payrollEmployees,
    payrollRuns,
    pendingApprovals,
    approvalHistory,
    accountingSummary,
    dashboardChartData,
    dashboardMetrics,
    expenseBreakdown,
    expenses,
    isDataLoaded,
    refreshAllData,
    fetchInventory,
    fetchSales,
    fetchPurchases,
    fetchManufacturing,
    fetchPayroll,
    fetchApprovals,
    fetchExpenses
  } = useData();

  useEffect(() => {
    const onRefreshDashboardData = async () => {
      try {
        await refreshAllData();
        toast.success('Dashboard refreshed');
      } catch (error) {
        console.error('Refresh event failed:', error);
        toast.error('Failed to refresh dashboard data');
      }
    };

    window.addEventListener('refresh-dashboard-data', onRefreshDashboardData);
    return () => window.removeEventListener('refresh-dashboard-data', onRefreshDashboardData);
  }, [refreshAllData]);

  useEffect(() => {
    const suppressKey = 'fh_setup_wizard_suppressed';
    let timer;

    if (authLoading || businessLoading) {
      setShowSetupWizard(false);
      return;
    }

    if (business?.id) {
      sessionStorage.removeItem(suppressKey);
      setShowSetupWizard(false);
      return;
    }

    const isSuppressed = sessionStorage.getItem(suppressKey) === '1';
    if (!user || isSuppressed) {
      setShowSetupWizard(false);
      return;
    }

    timer = setTimeout(() => {
      setShowSetupWizard(true);
    }, 1200);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [authLoading, businessLoading, business?.id, user, setShowSetupWizard]);

  // Resource limit enforcement
  const resourceLimits = useResourceLimits({
    planTier: contextPlanTier || business?.plan_tier || 'free',
    counts: {
      products: products?.length || 0,
      invoices: invoices?.length || 0,
      warehouses: locations?.length || 0,
    },
  });

  const [customerFormData, setCustomerFormData] = useState({ name: '', phone: '', email: '' });
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [currency] = useState('PKR');
  // Date Range and Search Filtering
  const { dateRange, setDateRange, searchQuery, setSearchQuery } = useFilters();

  // POS & Restaurant States
  const [posSession, setPosSession] = useState(null);
  const [restaurantTables, setRestaurantTables] = useState([]);
  const [kitchenQueue, setKitchenQueue] = useState([]);

  // Fetch restaurant data from DB when on a hospitality domain
  useEffect(() => {
    const isHospitalityDomain = ['restaurant-cafe', 'bakery-confectionery', 'hotel'].includes(category);
    if (!business?.id || !isHospitalityDomain) return;

    const fetchRestaurantData = async () => {
      try {
        const [tablesRes, queueRes] = await Promise.allSettled([
          getTablesAction(business.id),
          getKitchenQueueAction(business.id),
        ]);

        if (tablesRes.status === 'fulfilled' && tablesRes.value?.success) {
          setRestaurantTables(tablesRes.value.tables || []);
        }
        if (queueRes.status === 'fulfilled' && queueRes.value?.success) {
          setKitchenQueue(queueRes.value.queue || []);
        }
      } catch (err) {
        // Non-critical — restaurant data will just be empty
        console.warn('[DashboardClient] Failed to fetch restaurant data:', err);
      }
    };

    fetchRestaurantData();
  }, [business?.id, category]);

  useEffect(() => {
    const hydrateActivePosSession = async () => {
      if (!business?.id) {
        setPosSession(null);
        return;
      }

      const activeRes = await posAPI.getActiveSession(business.id);
      if (activeRes?.success && activeRes.session) {
        setPosSession({
          ...activeRes.session,
          startTime: activeRes.session.opened_at || activeRes.session.startTime || null,
          terminalName: activeRes.session.terminal_name || null,
        });
      } else {
        setPosSession(null);
      }
    };

    hydrateActivePosSession();
  }, [business?.id]);

  // Load business if not in context but id exists in localStorage or searchParams
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Domain Validation & Auto-Switching
  useEffect(() => {
    const urlDomain = String(params?.category);
    // Skip if still loading, no business, or URL is empty/default
    if (businessLoading || authLoading || !business || !urlDomain || urlDomain === 'undefined') return;
    
    // Only handle actual mismatches, not initial loads
    if (business.domain !== urlDomain) {
      // Silently attempt switch without console spam
      const trySwitch = async () => {
        const result = await switchBusinessByDomain(urlDomain);
        if (!result.success) {
          // Only show error to user, don't spam console
          if (result.error !== 'Missing business context') {
            toast.error("Access denied to this business");
          }
          // Redirect to correct domain
          router.replace(`/business/${business.domain}${window.location.search}`);
        }
      };

      trySwitch();
    }
  }, [business?.domain, businessLoading, authLoading, params?.category, router, switchBusinessByDomain]);


  // Data is now managed by DataProvider and synced via useData hook
  // Local page state only manages UI toggles and local interactions



  // Calculate stats
  const totalRevenue = useMemo(() => invoices
    .filter(inv => {
      const invDate = new Date(inv.date);
      return inv.status === 'paid' && invDate >= dateRange.from && invDate <= dateRange.to;
    })
    .reduce((sum, inv) => sum + (Number(inv.grand_total) || Number(inv.amount) || 0), 0), [invoices, dateRange]);

  const grossRevenue = useMemo(() => invoices
    .filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= dateRange.from && invDate <= dateRange.to;
    })
    .reduce((sum, inv) => sum + (Number(inv.grand_total) || Number(inv.amount) || 0), 0), [invoices, dateRange]);

  const totalOrders = invoices.filter(inv => {
    const invDate = new Date(inv.date);
    return invDate >= dateRange.from && invDate <= dateRange.to;
  }).length;

  const totalProducts = products.length;
  const totalCustomers = customers.length;

  const lowStockCount = products.filter(p => (p.stock || 0) <= (p.min_stock || 10)).length;

  const totalTaxLiability = useMemo(() => {
    const outputTax = invoices.reduce((sum, inv) => sum + (Number(inv.tax_total) || 0), 0);
    const inputTax = purchaseOrders.reduce((sum, po) => sum + (Number(po.tax_total) || 0), 0);
    return Math.max(0, outputTax - inputTax);
  }, [invoices, purchaseOrders]);

  const handleSaveProduct = async (productData) => {
    if (!business?.id) {
      toast.error('System is initializing. Please try again in 2 seconds.');
      throw new Error('Business context not ready');
    }
    try {
      const isEditing = !!(editingProduct || productData.id);
      const productId = productData.id || editingProduct?.id;
      const toNumber = (value, fallback = 0) => {
        if (value === '' || value === null || value === undefined) return fallback;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      // Extract batches and serials (Send ALL to backend for reconciliation)
      const allBatches = productData.batches || [];
      const allSerials = productData.serialNumbers || [];
      const normalizedProductData = {
        ...productData,
        price: toNumber(productData.price, 0),
        cost_price: toNumber(productData.cost_price, 0),
        mrp: toNumber(productData.mrp, 0),
        stock: toNumber(productData.stock, 0),
        tax_percent: toNumber(productData.tax_percent, 0),
        min_stock: toNumber(productData.min_stock, 0),
        max_stock: toNumber(productData.max_stock, 0),
        min_stock_level: toNumber(productData.min_stock_level, 0),
        reorder_point: toNumber(productData.reorder_point, 0),
        reorder_quantity: toNumber(productData.reorder_quantity, 0),
        expiry_date: productData.expiry_date || null,
        manufacturing_date: productData.manufacturing_date || null,
      };

      // 🚀 ATOMIC PERSISTENCE CALL
      // This single call replaces 3+ sequential network requests with a single ACID transaction
      await productAPI.upsertIntegrated({
        productData: {
          ...normalizedProductData,
          business_id: business.id,
          batches: undefined,
          serialNumbers: undefined
        },
        batches: allBatches,
        serialNumbers: allSerials,
        isUpdate: isEditing,
        productId: productId || productData.id,
        // Pass initial stock for new products without batch/serial tracking
        initialStock: !isEditing ? (normalizedProductData.stock || 0) : 0,
      });

      toast.success(isEditing ? 'Product updated' : 'Product created');

      // 🔄 AUTHORITATIVE SYNC: Refresh all data to ensure frontend and backend are perfectly aligned
      await refreshAllData();

      setShowProductForm(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product: ' + (error.message || 'Unknown error'));
      throw error;
    }
  };



  const handleDeleteProduct = async (productId) => {
    try {
      await productAPI.delete(productId, business.id);
      await fetchInventory();
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product: ' + (error.message || 'Unknown error'));
    }
  };

  const handleSaveCustomer = async (customerData) => {
    try {
      if (customerData.id) {
        await customerAPI.update(customerData.id, { ...customerData, business_id: business.id });
        toast.success('Customer updated successfully');
      } else {
        await customerAPI.create({
          ...customerData,
          business_id: business.id
        });
        toast.success('Customer added successfully');
      }
      await fetchSales();
      setShowCustomerForm(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error saving customer:', error);
      if (isEntitlementError(error)) {
        toast.error(getEntitlementErrorMessage(error, { action: 'save customer' }));
        markEntitlementErrorHandled(error);
        handleTabChange('settings');
      } else {
        toast.error('Failed to save customer: ' + (error.message || 'Unknown error'));
      }
      throw error;
    }
  };

  const handleSaveVendor = async (vendorData) => {
    try {
      if (vendorData.id) {
        await vendorAPI.update(vendorData.id, { ...vendorData, business_id: business.id });
        toast.success('Vendor updated');
      } else {
        await vendorAPI.create({
          ...vendorData,
          business_id: business.id
        });
        toast.success('Vendor added');
      }
      await fetchPurchases();
      setShowVendorForm(false);
      setEditingVendor(null);
    } catch (error) {
      console.error('Error saving vendor:', error);
      if (isEntitlementError(error)) {
        toast.error(getEntitlementErrorMessage(error, { action: 'save vendor' }));
        markEntitlementErrorHandled(error);
        handleTabChange('settings');
      } else {
        toast.error('Failed to save vendor: ' + (error.message || 'Unknown error'));
      }
      throw error;
    }
  };

  const handleExport = (data) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Simple CSV Export
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(obj =>
      Object.values(obj).map(val =>
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQuickAddProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleDateRangePreset = useCallback((preset) => {
    const range = getDateRangeFromPreset(preset);
    if (!range) return;
    setDateRange(range);
  }, [setDateRange]);

  const handleBulkDelete = async (ids) => {
    if (!ids || ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} items? This cannot be undone.`)) return;

    try {
      // Determine entity type based on active tab
      let entityType = activeTab;
      if (activeTab === 'inventory') entityType = 'products';

      const res = await bulkDeleteAction(business.id, entityType, ids);

      if (res.success) {
        toast.success(`${res.count} items deleted`);
        refreshAllData();
      } else {
        toast.error(res.error || 'Bulk delete failed');
      }
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Deletion failed: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    if (confirm('De-register this supplier?')) {
      try {
        await vendorAPI.delete(business.id, vendorId);
        await fetchPurchases();
        toast.success('Vendor removed');
      } catch (error) {
        console.error('Error deleting vendor:', error);
        toast.error('Failed to remove vendor: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        await customerAPI.delete(customerId, business.id);
        await fetchSales();
        toast.success('Customer deleted successfully');
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast.error('Failed to delete customer: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleGenerateAutoPO = async (poData) => {
    if (!business?.id) return;
    try {
      const result = await purchaseOrderAPI.createAutoReorderPO(
        business.id,
        poData.productId,
        poData.quantity,
        poData.vendorId
      );
      if (result.success) {
        toast.success(`Purchase order ${result.purchaseNumber} generated successfully`);
        refreshAllData();
      }
    } catch (error) {
      console.error("Error generating auto PO:", error);
      toast.error("Failed to generate purchase order: " + (error.message || 'Unknown error'));
    }
  };

  const handleSaveInvoice = async (invoiceData) => {
    try {
      const { items, totals, ...header } = invoiceData;
      const invoiceTotals = totals || header;
      const toNumber = (value, fallback = 0) => {
        if (value === '' || value === null || value === undefined) return fallback;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      const computedGrandTotal = toNumber(
        invoiceTotals.total || invoiceTotals.grand_total || header.grand_total,
        items.reduce((sum, item) => sum + toNumber(item.amount || item.total, 0), 0)
      );
      const computedSubtotal = toNumber(
        invoiceTotals.subtotal || header.subtotal,
        items.reduce((sum, item) => sum + (toNumber(item.quantity, 0) * toNumber(item.rate || item.unit_price, 0)), 0)
      );
      const computedTaxTotal = toNumber(
        invoiceTotals.taxTotal || invoiceTotals.tax_total || invoiceTotals.totalTax || header.tax_total,
        0
      );
      const computedDiscountTotal = toNumber(
        invoiceTotals.discount || invoiceTotals.discount_total || header.discount_total,
        0
      );

      const payload = {
        ...header,
        business_id: business.id,
        invoice_number: header.invoiceNumber || header.invoice_number || `INV-${Date.now()}`,
        grand_total: computedGrandTotal,
        subtotal: computedSubtotal,
        tax_total: computedTaxTotal,
        total_tax: computedTaxTotal,
        discount_total: computedDiscountTotal
      };

      const mappedItems = items.map(item => ({
        ...item,
        total_amount: item.total || item.amount || 0
      }));

      // 1. Actually call the API to persist data
      const isUpdate = invoiceInitialData?.id && typeof invoiceInitialData.id === 'string' && invoiceInitialData.id.length > 20;
      let savedInvoice = null;

      if (isUpdate) {
        savedInvoice = await invoiceAPI.update(invoiceInitialData.id, payload, mappedItems);
        toast.success('Invoice updated successfully');
      } else {
        savedInvoice = await invoiceAPI.create(payload, mappedItems);
        toast.success('Invoice created successfully');
      }

      // 2. Clear state and refresh UI
      setShowInvoiceBuilder(false);
      setInvoiceInitialData(null);

      // Refresh products as stock might have changed
      refreshAllData();

      return savedInvoice;
    } catch (error) {
      console.error('Error saving invoice:', error);
      if (isEntitlementError(error)) {
        toast.error(getEntitlementErrorMessage(error, { action: 'save invoice' }));
        markEntitlementErrorHandled(error);
        handleTabChange('settings');
      } else {
        toast.error(error.message || 'Failed to save invoice');
      }
      throw error; // Propagate error so child component knows it failed
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (confirm('Are you sure you want to delete this invoice? Stock will be restored to inventory.')) {
      try {
        await invoiceAPI.delete(business.id, invoiceId);
        toast.success('Invoice deleted and stock restored');
        refreshAllData();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        toast.error('Failed to delete invoice: ' + (error.message || 'Unknown error'));
        throw error;
      }
    }
  };

  const handleUpdatePOStatus = async (poId, status) => {
    try {
      const updated = await purchaseOrderAPI.updateStatus(business.id, poId, status);
      await fetchPurchases();

      if (status === 'received' && business?.id) {
        await fetchInventory();
        toast.success('Inventory updated automatically');
      } else {
        toast.success(`Order marked as ${status}`);
      }
    } catch (error) {
      console.error('Error updating PO status:', error);
      toast.error('Failed to update order status');
    }
  };

  // --- Handlers for Advanced Features ---


  const handleCreateBOM = async (data) => {
    try {
      await manufacturingAPI.createBOM({ ...data, business_id: business.id });
      await fetchManufacturing();
      toast.success('BOM created successfully');
    } catch (error) {
      console.error('Create BOM Error:', error);
      toast.error('Failed to create BOM');
    }
  };

  const handleCreateProductionOrder = async (data) => {
    try {
      await manufacturingAPI.createProductionOrder({ ...data, business_id: business.id });
      await fetchManufacturing();
      toast.success('Production Order scheduled');
    } catch (error) {
      console.error('Create Prod Order Error:', error);
      toast.error('Failed to schedule production');
    }
  };

  const handleLocationAdd = async (data) => {
    try {
      await warehouseAPI.createLocation({ ...data, business_id: business.id });
      await fetchInventory();
      toast.success('Warehouse location added');
    } catch (error) {
      console.error('Add Location Error:', error);
      if (isEntitlementError(error)) {
        toast.error(getEntitlementErrorMessage(error, { action: 'add warehouse location' }));
        markEntitlementErrorHandled(error);
        handleTabChange('settings');
      } else {
        toast.error('Failed to add location');
      }
      throw error;
    }
  };

  const handleLocationUpdate = async (locationId, updates) => {
    try {
      await warehouseAPI.updateLocation(business.id, locationId, updates);
      await fetchInventory();
      toast.success('Location updated successfully');
    } catch (error) {
      console.error('Update Location Error:', error);
      toast.error(error.message || 'Failed to update location');
      throw error;
    }
  };

  const handleLocationDelete = async (locationId) => {
    try {
      await warehouseAPI.deleteLocation(business.id, locationId);
      await fetchInventory();
      toast.success('Location deleted successfully');
    } catch (error) {
      console.error('Delete Location Error:', error);
      toast.error(error.message || 'Failed to delete location');
    }
  };

  const handleStockTransfer = async (data) => {
    try {
      await warehouseAPI.createTransfer({ ...data, business_id: business.id });
      toast.success('Stock transfer initiated');
      // Refresh inventory via DataProvider to reflect stock changes
      await fetchInventory();
    } catch (error) {
      console.error('Stock Transfer Error:', error);
      toast.error('Failed to transfer stock');
    }
  };

  // --- POS Handlers ----------------------------------------------------------

  const handleStartPosSession = async () => {
    if (!business?.id) {
      toast.error('Business context is not ready yet');
      return { success: false, error: 'Business context is not ready' };
    }

    try {
      toast.loading('Starting POS session...', { id: 'pos-session' });

      const activeRes = await posAPI.getActiveSession(business.id);
      if (activeRes?.success && activeRes.session) {
        setPosSession({
          ...activeRes.session,
          startTime: activeRes.session.opened_at || activeRes.session.startTime || null,
          terminalName: activeRes.session.terminal_name || null,
        });
        toast.success('Active POS session restored', { id: 'pos-session' });
        return { success: true, session: activeRes.session };
      }

      const terminalsRes = await posAPI.getTerminals(business.id);
      if (!terminalsRes?.success) {
        throw new Error(terminalsRes?.error || 'Failed to load POS terminals');
      }

      let terminal = (terminalsRes.terminals || []).find(t => t?.status === 'active') || terminalsRes.terminals?.[0];

      if (!terminal) {
        const codeSuffix = String(Date.now()).slice(-6);
        const createRes = await posAPI.createTerminal({
          businessId: business.id,
          name: 'Main Counter',
          code: `TERM-${codeSuffix}`,
        });

        if (!createRes?.success) {
          throw new Error(createRes?.error || 'Failed to create POS terminal');
        }
        terminal = createRes.terminal;
      }

      const openRes = await posAPI.openSession({
        businessId: business.id,
        terminalId: terminal.id,
        openingCash: 0,
      });

      if (!openRes?.success) {
        throw new Error(openRes?.error || 'Failed to open POS session');
      }

      const openSession = openRes.session;
      setPosSession({
        ...openSession,
        startTime: openSession?.opened_at || new Date().toISOString(),
        terminalName: terminal?.name || null,
      });

      toast.success('POS session started', { id: 'pos-session' });
      return { success: true, session: openSession };
    } catch (error) {
      toast.error(error?.message || 'Could not start POS session', { id: 'pos-session' });
      return { success: false, error: error?.message || 'Could not start POS session' };
    }
  };

  const handlePosCheckout = async (checkoutData) => {
    try {
      toast.loading('Processing POS Checkout...', { id: 'pos' });
      const normalizedItems = (checkoutData.items || []).map(item => ({
        productId: item.productId || item.id,
        productName: item.productName || item.name,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice || item.price) || 0,
        taxPercent: Number(item.taxPercent) || 0,
        taxAmount: Number(item.taxAmount) || 0,
      }));
      const subtotal = normalizedItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
      const taxAmount = normalizedItems.reduce((sum, i) => sum + (i.taxAmount || 0), 0);
      const total = Number(checkoutData.total) || (subtotal + taxAmount);

      // Prefer POS transaction flow when a session is open so refunds and session reporting stay consistent.
      if (checkoutData.sessionId) {
        const posResult = await posAPI.checkout({
          businessId: business.id,
          sessionId: checkoutData.sessionId,
          customerId: checkoutData.customerId || null,
          items: normalizedItems,
          payments: checkoutData.payments?.length
            ? checkoutData.payments
            : [{ method: checkoutData.paymentMethod || 'cash', amount: total }],
        });

        if (!posResult?.success) {
          throw new Error(posResult?.error || 'POS transaction failed');
        }

        toast.success('Sale completed successfully', { id: 'pos' });
        refreshAllData();
        return {
          success: true,
          transaction: posResult.transaction,
          mode: 'pos',
        };
      }

      // Compatibility fallback for environments with no active POS session.
      const invoiceItems = normalizedItems.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        name: item.productName,
        tax_amount: item.taxAmount,
      }));

      const invoiceData = {
        business_id: business.id,
        customer_id: checkoutData.customerId || null,
        payment_method: checkoutData.paymentMethod || 'cash',
        grand_total: total,
        subtotal,
        tax_total: taxAmount,
        status: 'paid',
        date: new Date().toISOString(),
        payment_status: 'paid',
      };

      const createdInvoice = await invoiceAPI.create(invoiceData, invoiceItems);
      toast.success('Sale completed successfully', { id: 'pos' });
      refreshAllData();
      return {
        success: true,
        transaction: {
          id: createdInvoice?.id,
          transaction_number: createdInvoice?.invoice_number || createdInvoice?.number || `INV-${Date.now()}`,
          total_amount: createdInvoice?.grand_total || total,
          customer_id: createdInvoice?.customer_id || checkoutData.customerId || null,
        },
        mode: 'invoice-fallback',
      };
    } catch (error) {
      console.error('POS Checkout Error:', error);
      if (isEntitlementError(error)) {
        toast.error(getEntitlementErrorMessage(error, { action: 'complete sale' }), { id: 'pos' });
        markEntitlementErrorHandled(error);
        handleTabChange('settings');
      } else {
        toast.error('Sale failed: ' + error.message, { id: 'pos' });
      }
      return {
        success: false,
        error,
        errorCode: error?.code || null,
        requiredPlan: error?.requiredPlan || null,
        limitKey: error?.limitKey || null,
        limit: Number.isFinite(Number(error?.limit)) ? Number(error?.limit) : null,
      };
    }
  };

  // --- Restaurant Handlers ----------------------------------------------------

  const handleTableAction = (action, tableId, data) => {
    if (action === 'bulk_update') {
      setRestaurantTables(data);
      toast.success('Floor plan layout saved');
      return;
    }
    setRestaurantTables(prev => prev.map(t => {
      if (t.id === tableId) {
        if (action === 'occupy') return { ...t, status: 'occupied', currentOrder: data };
        if (action === 'clear') return { ...t, status: 'available', currentOrder: null };
        if (action === 'reserve') return { ...t, status: 'reserved' };
        return { ...t, status: action };
      }
      return t;
    }));
  };

  const handleNewRestaurantOrder = async () => {
    // Refresh queue from DB so the new kitchen order appears with real data
    try {
      const res = await getKitchenQueueAction(business.id);
      if (res.success) setKitchenQueue(res.queue || []);
    } catch (err) {
      console.error('[Restaurant] Failed to refresh kitchen queue:', err);
    }
  };

  const handleKitchenStatusUpdate = async (data) => {
    // data = { kitchenOrderId, status, businessId } from RestaurantManager
    const { kitchenOrderId, status, businessId: bId } = data || {};
    if (!kitchenOrderId || !status) return;
    try {
      const result = await import('@/lib/actions/standard/restaurant')
        .then(m => m.updateKitchenOrderAction({ businessId: bId || business.id, kitchenOrderId, status }));
      if (result?.success) {
        if (status === 'ready') toast.success('Order ready for serving', { icon: '🍽️' });
        else if (status === 'preparing') toast.success('Cooking started', { icon: '🔥' });
        // Refresh queue from DB
        const res = await getKitchenQueueAction(business.id);
        if (res.success) setKitchenQueue(res.queue || []);
      } else {
        toast.error(result?.error || 'Failed to update kitchen order');
      }
    } catch (err) {
      console.error('[Restaurant] Kitchen status update failed:', err);
      toast.error('Failed to update kitchen order');
    }
  };

  // --- Payroll Handlers ------------------------------------------------------

  const handleProcessPayroll = async (data) => {
    try {
      toast.loading('Processing payroll...', { id: 'payroll' });
      const result = await payrollAPI.processPayroll({ ...data, businessId: business.id });
      if (result.success) {
        toast.success('Payroll processed successfully', { id: 'payroll' });
        await fetchPayroll();
      } else {
        toast.error(result.error || 'Failed to process payroll', { id: 'payroll' });
      }
      return result;
    } catch (error) {
      console.error('Process Payroll Error:', error);
      toast.error('Failed to process payroll', { id: 'payroll' });
      return { success: false, error: error.message };
    }
  };

  const handleAddEmployee = async (data) => {
    try {
      const result = await payrollAPI.addEmployee({ ...data, businessId: business.id });
      if (result.success) {
        toast.success('Employee added');
        await fetchPayroll();
      } else {
        toast.error(result.error || 'Failed to add employee');
      }
      return result;
    } catch (error) {
      console.error('Add Employee Error:', error);
      toast.error('Failed to add employee');
    }
  };

  const handleViewPayslips = async (runId) => {
    try {
      return await payrollAPI.getPayslips(business.id, runId);
    } catch (error) {
      console.error('View Payslips Error:', error);
      toast.error('Failed to load payslips');
    }
  };

  // --- Approval Handlers -----------------------------------------------------

  const handleApproveRequest = async (requestId) => {
    try {
      const result = await workflowAPI.resolve({
        requestId,
        businessId: business.id,
        action: 'approved'
      });
      if (result.success) {
        toast.success('Request approved');
        await fetchApprovals();
      } else {
        toast.error(result.error || 'Failed to approve');
      }
    } catch (error) {
      console.error('Approve Request Error:', error);
      toast.error('Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const result = await workflowAPI.resolve({
        requestId,
        businessId: business.id,
        action: 'rejected'
      });
      if (result.success) {
        toast.success('Request rejected');
        await fetchApprovals();
      } else {
        toast.error(result.error || 'Failed to reject');
      }
    } catch (error) {
      console.error('Reject Request Error:', error);
      toast.error('Failed to reject request');
    }
  };


  // BLOCKING LOADER REMOVED FOR INSTANT SHELL RENDER
  // if (businessLoading || authLoading) {
  //   return (
  //     <div className="flex h-screen w-full items-center justify-center bg-gray-50/50">
  //       ...
  //     </div>
  //   );
  // }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Onboarding Wizard - Global */}
      {showSetupWizard && (
        <div className="mb-8">
          <SetupWizard
            category={category}
            onComplete={() => {
              sessionStorage.setItem('fh_setup_wizard_suppressed', '1');
              setShowSetupWizard(false);
            }}
          />
        </div>
      )}

      <BusinessLoadingBoundary isLoading={!isDataLoaded}>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mt-2">
          <DashboardTabs
            activeTab={activeTab}
            searchTerm={searchQuery}
            category={category}
            business={business}
            role={role}
            user={user}
            invoices={invoices}
            products={products}
            customers={customers}
            vendors={vendors}
            quotations={quotations}
            salesOrders={salesOrders}
            challans={challans}
            purchaseOrders={purchaseOrders}
            locations={locations}
            bomList={bomList}
            productionOrders={productionOrders}
            accountingSummary={accountingSummary}
            dashboardChartData={dashboardChartData}
            dashboardMetrics={dashboardMetrics}
            expenseBreakdown={expenseBreakdown}
            expenses={expenses}
            dateRange={dateRange}
            currency={currency}
            colors={colors}
            planTier={contextPlanTier || business?.plan_tier || 'free'}
            resourceLimits={resourceLimits}
            domainKnowledge={domainKnowledge}
            isLoading={!isDataLoaded}
            handlers={{
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
              handleSaveVendor,
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
              formatCurrency,
              handleQuickAction,
              handleDateRangePreset,
              setShowVendorForm,
              setEditingVendor,
              setShowPOBuilder,
              handleExpenseSaved: async () => {
                await Promise.allSettled([fetchExpenses(), refreshAllData()]);
              },
              // New POS & Restaurant Handlers
              posSession,
              restaurantTables,
              kitchenQueue,
              handleStartPosSession,
              handlePosCheckout,
              handleTableAction,
              handleNewRestaurantOrder,
              handleKitchenStatusUpdate,
              // Upgrade Handler
              handleUpgrade: () => handleTabChange('settings'),
              // Payroll & Approval Handlers
              payrollEmployees,
              payrollRuns,
              handleProcessPayroll,
              handleViewPayslips,
              handleAddEmployee,
              pendingApprovals,
              approvalHistory,
              handleApproveRequest,
              handleRejectRequest,
            }}
          />
        </Tabs>
      </BusinessLoadingBoundary>

      <ActionModals
        showProductForm={showProductForm}
        setShowProductForm={setShowProductForm}
        showQuickAction={showQuickAction}
        setShowQuickAction={setShowQuickAction}
        showQuickInvoice={showQuickInvoice}
        setShowQuickInvoice={setShowQuickInvoice}
        showCustomerForm={showCustomerForm}
        setShowCustomerForm={setShowCustomerForm}
        showInvoiceBuilder={showInvoiceBuilder}
        setShowInvoiceBuilder={setShowInvoiceBuilder}
        // Excel functionality is now handled locally within InventoryManager
        editingProduct={editingProduct}
        setEditingProduct={setEditingProduct}
        editingCustomer={editingCustomer}
        setEditingCustomer={setEditingCustomer}
        invoiceInitialData={invoiceInitialData}
        setInvoiceInitialData={setInvoiceInitialData}
        customerFormData={customerFormData}
        setCustomerFormData={setCustomerFormData}
        products={products}
        customers={customers}
        invoices={invoices}
        category={category}
        colors={colors}
        currency={currency}
        onSaveProduct={handleSaveProduct}
        onSaveCustomer={handleSaveCustomer}
        onSaveInvoice={handleSaveInvoice}
        onTabChange={handleTabChange}
        formatCurrency={formatCurrency}
        loadProducts={refreshAllData}

        // Vendor & PO States
        showVendorForm={showVendorForm}
        setShowVendorForm={setShowVendorForm}
        editingVendor={editingVendor}
        setEditingVendor={setEditingVendor}
        onSaveVendor={handleSaveVendor}

        showPOBuilder={showPOBuilder}
        setShowPOBuilder={setShowPOBuilder}
        poInitialData={poInitialData}
        setPoInitialData={setPoInitialData}
        refreshData={refreshAllData}
        business={business}
        role={role}
        planTier={business?.plan_tier || 'free'}
        domainKnowledge={domainKnowledge}

        // Details Viewer Props
        viewingItem={viewingItem}
        setViewingItem={setViewingItem}
        viewingType={viewingType}
        setViewingType={setViewingType}
      />
    </div>
  );
}

export default function Page() {
  return (
    <ErrorBoundary>
      <BusinessDashboardContent />
    </ErrorBoundary>
  );
}
