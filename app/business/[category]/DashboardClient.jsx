'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
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
import { formatInventoryActionError, isPersistedProductUuid } from '@/lib/utils/productMutationPayload';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { ProductForm } from '@/components/ProductForm';
import { EnhancedInvoiceBuilder } from '@/components/EnhancedInvoiceBuilder';
import { CustomerForm } from '@/components/CustomerForm';
import { SetupWizard } from '@/components/onboarding/SetupWizard';
import { getDomainColors } from '@/lib/domainColors';
import { getDomainKnowledgeForBusiness } from '@/lib/utils/businessRegionalContext';
import { formatCurrency } from '@/lib/currency';
import toast from 'react-hot-toast';
import { getPurchaseStatusLabel, PURCHASE_STATUSES } from '@/lib/constants/purchaseStatus';
import notify, { TOAST_IDS } from '@/lib/utils/appToast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useFilters } from '@/lib/context/FilterContext';
import { useData } from '@/lib/context/DataContext';
import { getDateRangeFromPreset } from '@/lib/utils/datePresets';
import { isBatchTrackingEnabled, isSerialTrackingEnabled } from '@/lib/utils/domainHelpers';
import { filterMeaningfulBatches, filterMeaningfulSerials } from '@/lib/utils/inventoryTrackingHelpers';
import { isEntitlementError, getEntitlementErrorMessage, markEntitlementErrorHandled } from '@/lib/utils/subscriptionErrors';
import { ActionModals } from './components/ActionModals';
import { DashboardTabs } from './components/DashboardTabs';
import { BusinessLoadingBoundary } from '@/components/guards/BusinessLoadingBoundary';
import { useHubReady } from '@/lib/hooks/useHubReady';
import { useResourceLimits } from '@/lib/hooks/useResourceLimits';
import { getDomainConfig } from '@/lib/config/domains';
import { QUICK_ACTION_IDS } from '@/lib/config/quickActions';
import { normalizeDashboardTab, resolveDashboardTab } from '@/lib/config/tabs';
import { TRIAL_CONFIG } from '@/lib/config/platform';

/**
 * Role-based / vertical dashboard templates emit string action ids (`view-*`, etc.).
 * When those surfaces are mounted, route to a real hub tab instead of falling through to `dashboard`.
 */
const QUICK_VIEW_ACTION_TO_TAB = {
  'view-approval-queue': 'approvals',
  'view-low-stock': 'inventory',
  'view-expiring-batches': 'batches',
  'view-warranty-expiring': 'batches',
  'view-sales-reports': 'reports',
  'view-sales-report': 'reports',
  'view-commission-history': 'finance',
  'view-all-customers': 'customers',
  'search-customer': 'customers',
  'view-team-details': 'payroll',
  'view-profit-loss': 'finance',
  'view-balance-sheet': 'finance',
  'view-general-ledger': 'finance',
  'view-category-expenses': 'expenses',
  'view-all-expenses': 'expenses',
  'view-all-accounts': 'accounting',
  'reconcile-now': 'accounting',
  'view-system-logs': 'audit',
  'view-orders': 'orders',
  'view-inventory': 'inventory',
  'view-sales': 'reports',
  'view-payments': 'payments',
  'view-top-products': 'reports',
  'view-categories': 'inventory',
  'view-matrix': 'inventory',
  'view-collections': 'inventory',
  'view-location-stock': 'warehouses',
  'view-all-reorder-alerts': 'inventory',
  'view-all-cycle-counts': 'inventory',
  'view-all-receipts': 'purchases',
  'quick-receive': 'purchases',
  'stock-adjustment': 'inventory',
  'stock-transfer': 'warehouses',
};

function BusinessDashboardContent() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Auth & Business context -- must come before any hook that references `business`
  const {
    business,
    role,
    planTier: contextPlanTier,
    updateBusiness,
    isLoading: businessLoading,
    switchBusinessByDomain,
    currency,
  } = useBusiness();


  // Use business domain for URL routing, but keep category for UI rendering logic
  const currentDomain = business?.domain || String(params?.category || 'retail-shop');
  const category = business?.category || 'retail-shop';

  const normalizedUrlTab = normalizeDashboardTab(searchParams.get('tab') || 'dashboard');
  const resolvedUrlTab = resolveDashboardTab(normalizedUrlTab);
  /**
   * Radix Tabs are controlled by `activeTab` from the URL. `router.push` updates
   * `searchParams` one frame later, so the first click used to leave `value` on
   * the old tab until a second interaction. Optimistic tab bridges that gap.
   */
  const [optimisticTab, setOptimisticTab] = useState(null);
  const activeTab = optimisticTab ?? resolvedUrlTab;

  useEffect(() => {
    if (optimisticTab == null || optimisticTab !== resolvedUrlTab) return;
    // Defer clear so we do not synchronously setState in the effect body (react-hooks/set-state-in-effect).
    queueMicrotask(() => {
      setOptimisticTab(null);
    });
  }, [optimisticTab, resolvedUrlTab]);

  useEffect(() => {
    const billing = searchParams.get('billing');
    const legacyPayment = searchParams.get('payment');
    const cryptoFlag = searchParams.get('crypto');
    const showSuccess =
      billing === 'success' || legacyPayment === 'success' || cryptoFlag === 'success';
    const showCancelled = billing === 'cancelled' || cryptoFlag === 'cancelled';
    if (!showSuccess && !showCancelled) return;

    const toastFingerprint = `tenvo-billing-return:${billing || ''}:${legacyPayment || ''}:${cryptoFlag || ''}`;
    const alreadyShown =
      typeof sessionStorage !== 'undefined' && sessionStorage.getItem(toastFingerprint) === '1';

    if (!alreadyShown) {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(toastFingerprint, '1');
      }

      if (billing === 'success' || legacyPayment === 'success') {
        notify.success(
          `Subscription confirmed. Your ${TRIAL_CONFIG.durationDays}-day trial applies on card checkout; manage billing in Settings.`,
          { id: TOAST_IDS.BILLING_RETURN, duration: 6000 }
        );
      } else if (cryptoFlag === 'success') {
        notify.success('Crypto payment status will update when the transfer confirms.', {
          id: TOAST_IDS.BILLING_RETURN,
        });
      } else if (showCancelled) {
        notify.info('Checkout was cancelled.', { id: TOAST_IDS.BILLING_RETURN });
      }
    }

    const next = new URLSearchParams(searchParams.toString());
    for (const k of ['billing', 'payment', 'session_id', 'crypto', 'order_id']) {
      next.delete(k);
    }
    const q = next.toString();
    const basePath = pathname || `/business/${encodeURIComponent(currentDomain)}`;
    router.replace(q ? `${basePath}?${q}` : basePath, { scroll: false });
  }, [searchParams, router, pathname, currentDomain]);

  // Sync URL when state changes (e.g. valid tab click)
  const handleTabChange = useCallback((val) => {
    const normalizedTab = normalizeDashboardTab(val);

    if (normalizedTab === 'platform-admin') {
      router.push('/admin', { scroll: false });
      return;
    }

    const targetTab = resolveDashboardTab(normalizedTab);
    setOptimisticTab(targetTab);
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

  const [financeInitialTab, setFinanceInitialTab] = useState(null);

  useEffect(() => {
    const financeView = searchParams.get('financeView');
    if (financeView) {
      setFinanceInitialTab(financeView);
    }
  }, [searchParams]);

  const handleQuickAction = useCallback((actionId) => {
    if (actionId == null) return;
    const id = String(actionId).trim();
    if (!id) return;

    if (id === 'view-profit-loss' || id === 'view-balance-sheet') {
      setFinanceInitialTab('statements');
      handleTabChange('finance');
      return;
    }
    if (id === 'view-general-ledger') {
      setFinanceInitialTab('general-ledger');
      handleTabChange('finance');
      return;
    }

    const routedTab = QUICK_VIEW_ACTION_TO_TAB[id];
    if (routedTab) {
      handleTabChange(routedTab);
      return;
    }
    if (id.startsWith('view-customer')) {
      handleTabChange('customers');
      return;
    }
    if (id.startsWith('reconcile-account')) {
      handleTabChange('finance');
      setFinanceInitialTab('reconciliation');
      return;
    }
    if (id.startsWith('create-purchase-order') || id.startsWith('receive-goods') || id.startsWith('start-cycle-count')) {
      handleTabChange('purchases');
      return;
    }

    switch (id) {
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
      case 'reports':
      case 'analytics':
        handleTabChange('reports');
        break;
      case 'campaigns':
        handleTabChange('campaigns');
        break;
      case 'expenses':
        handleTabChange('expenses');
        break;
      case 'finance':
        handleTabChange('finance');
        break;
      case 'payments':
        handleTabChange('payments');
        break;
      case 'vendors':
        handleTabChange('vendors');
        break;
      case 'purchases':
        handleTabChange('purchases');
        break;
      case 'warehouses':
        handleTabChange('warehouses');
        break;
      case 'loyalty':
        handleTabChange('loyalty');
        break;
      case 'memberships':
        handleTabChange('memberships');
        break;
      case 'audit':
      case 'audit-trail':
        handleTabChange('audit');
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
        if (typeof window !== 'undefined') {
          queueMicrotask(() => {
            window.dispatchEvent(new CustomEvent('inventory-open-excel-mode'));
          });
        }
        toast.success('Opening Excel mode…', { duration: 2200 });
        break;
      default: {
        const normalized = normalizeDashboardTab(id);
        const resolved = resolveDashboardTab(normalized);
        if (resolved !== 'dashboard' || normalized === 'dashboard') {
          handleTabChange(resolved);
        }
        break;
      }
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
    const knowledge = getDomainKnowledgeForBusiness(category, business);
    return {
      name: category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      icon: knowledge.icon || '🚀',
      color: 'wine'
    };
  }, [category, business]);

  const colors = getDomainColors(category);
  const domainKnowledge = useMemo(
    () => getDomainKnowledgeForBusiness(category, business),
    [category, business]
  );

  // Auth context
  const { user, loading: authLoading } = useAuth();
  const { hubReady, contentReady, loadingModules } = useHubReady();

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
    advancedDashboardSnapshot,
    refreshAllData,
    fetchFinance,
    fetchAnalytics,
    fetchInventory,
    fetchSales,
    fetchPurchases,
    fetchManufacturing,
    fetchPayroll,
    fetchApprovals,
    fetchExpenses
  } = useData();

  const dashboardTabLoading =
    activeTab === 'dashboard' &&
    !dashboardMetrics &&
    Boolean(loadingModules.analytics);

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

  // Ensure active tab data is loaded even if background bootstrap is still running.
  useEffect(() => {
    if (!business?.id || !hubReady) return;

    const tabFetchers = {
      dashboard: fetchAnalytics,
      finance: fetchFinance,
      accounting: fetchFinance,
      expenses: fetchExpenses,
      inventory: fetchInventory,
      batches: fetchInventory,
      warehouses: fetchInventory,
      invoices: fetchSales,
      customers: fetchSales,
      quotations: fetchSales,
      vendors: fetchPurchases,
      purchases: fetchPurchases,
      payroll: fetchPayroll,
      approvals: fetchApprovals,
      manufacturing: fetchManufacturing,
    };

    tabFetchers[activeTab]?.();
  }, [
    activeTab,
    business?.id,
    hubReady,
    fetchFinance,
    fetchSales,
    fetchInventory,
    fetchPurchases,
    fetchManufacturing,
    fetchPayroll,
    fetchApprovals,
    fetchExpenses,
    fetchAnalytics,
  ]);

  useEffect(() => {
    const suppressKey = 'fh_setup_wizard_suppressed';
    let timer;

    if (authLoading || businessLoading) {
      queueMicrotask(() => {
        setShowSetupWizard(false);
      });
      return;
    }

    if (business?.id) {
      sessionStorage.removeItem(suppressKey);
      queueMicrotask(() => {
        setShowSetupWizard(false);
      });
      return;
    }

    const isSuppressed = sessionStorage.getItem(suppressKey) === '1';
    if (!user || isSuppressed) {
      queueMicrotask(() => {
        setShowSetupWizard(false);
      });
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
        // Non-critical, restaurant data will just be empty
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

  // Require auth, only after auth + business sync settle (avoids bouncing to /login
  // right after registration while session/context hydrate).
  useEffect(() => {
    if (authLoading || businessLoading) return;
    if (!user) {
      router.push('/login');
    }
  }, [user, authLoading, businessLoading, router]);

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

  /**
   * @param {object} productData
   * @param {{ skipFullWorkspaceRefresh?: boolean, silentToast?: boolean }} [options], Busy grid / inline edits:
   *   refresh products only so optimistic UI is not overwritten by a concurrent full refetch.
   *   silentToast: do not toast here (InventoryManager BusyGrid / Excel already surfaces success).
   */
  const handleSaveProduct = async (productData, options = {}) => {
    const { skipFullWorkspaceRefresh = false, silentToast = false } = options;
    if (!business?.id) {
      toast.error('System is initializing. Please try again in 2 seconds.');
      throw new Error('Business context not ready');
    }
    try {
      const persistedProductId =
        editingProduct?.id ??
        (isPersistedProductUuid(productData.id) ? productData.id : null);
      const isEditing = Boolean(editingProduct || persistedProductId);
      const productId = persistedProductId;
      const toNumber = (value, fallback = 0) => {
        if (value === '' || value === null || value === undefined) return fallback;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      // Only send batch/serial payloads when the domain actually uses them, otherwise
      // composite upsert treats any non-empty `batches` as batch-tracked and omits `stock` from UPDATE.
      const domainCat = business?.category || 'retail-shop';
      const allBatches = isBatchTrackingEnabled(domainCat)
        ? filterMeaningfulBatches(productData.batches || [])
        : [];
      const allSerials = isSerialTrackingEnabled(domainCat)
        ? filterMeaningfulSerials(productData.serialNumbers || productData.serial_numbers || [])
        : [];
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

      let domainData = normalizedProductData.domain_data;
      if (typeof domainData === 'string') {
        try {
          domainData = JSON.parse(domainData.trim() || '{}');
        } catch {
          domainData = {};
        }
      }
      if (domainData == null || typeof domainData !== 'object' || Array.isArray(domainData)) {
        domainData = {};
      }
      normalizedProductData.domain_data = domainData;

      // New-product flows must not send a stale / client-only `id` or composite runs UPDATE against a missing row.
      if (!isEditing) {
        delete normalizedProductData.id;
      }

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
        productId: isEditing ? productId : null,
        // Pass initial stock for new products without batch/serial tracking
        initialStock: !isEditing ? (normalizedProductData.stock || 0) : 0,
      });

      if (!silentToast) {
        toast.success(isEditing ? 'Product updated' : 'Product created');
      }

      if (skipFullWorkspaceRefresh) {
        await fetchInventory();
      } else {
        // Full workspace sync (forms, cross-module aggregates)
        await refreshAllData();
      }

      setShowProductForm(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product: ' + formatInventoryActionError(error), {
        id: 'dashboard-product-save',
        duration: 5000,
      });
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
      toast.error('Failed to delete product: ' + formatInventoryActionError(error), {
        id: 'dashboard-product-delete',
        duration: 5000,
      });
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
      return { success: true };
    } catch (error) {
      console.error('Error saving customer:', error);
      if (isEntitlementError(error)) {
        toast.error(getEntitlementErrorMessage(error, { action: 'save customer' }));
        markEntitlementErrorHandled(error);
        handleTabChange('settings');
      }
      return {
        success: false,
        error: error.message || 'Failed to save customer',
        code: error.code || null,
        errors: error.validationErrors || null,
      };
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

  const handleExport = (data, filename = 'export') => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Comprehensive CSV export that handles nested objects, quotes, newlines and commas
    const headers = Object.keys(data[0] || {});
    
    const escapeCsvValue = (val) => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') {
        if (val.name) return `"${val.name.replace(/"/g, '""')}"`;
        if (val.code) return `"${val.code.replace(/"/g, '""')}"`;
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      }
      const str = String(val);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvHeaders = headers.join(',');
    const csvRows = data.map(obj => 
      headers.map(header => escapeCsvValue(obj[header])).join(',')
    );
    
    const csvContent = '\uFEFF' + [csvHeaders, ...csvRows].join('\r\n'); // Add UTF-8 BOM for Excel compatibility

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  // New Invoice Handlers for Enhanced Features
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

  const handleRecordPayment = (invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setShowPaymentModal(true);
  };

  const handleViewInvoice = (invoice) => {
    // Navigate to invoice detail view or open modal
    setInvoiceInitialData(invoice);
    setShowInvoiceBuilder(true);
  };

  const handleBulkDeleteInvoices = async (invoiceIds) => {
    if (!invoiceIds || invoiceIds.length === 0) return;
    
    try {
      const { bulkDeleteInvoicesAction } = await import('@/lib/actions/standard/invoice-bulk');
      const result = await bulkDeleteInvoicesAction(business.id, invoiceIds, user?.id);

      if (result.success) {
        toast.success(`${result.data?.deleted || invoiceIds.length} invoice(s) deleted successfully`);
        if (result.data?.restoredStock > 0) {
          notify.info(`${result.data.restoredStock} inventory items restored`);
        }
        refreshAllData();
      } else {
        toast.error(result.error || 'Bulk delete failed');
      }
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Failed to delete invoices: ' + (error.message || 'Unknown error'));
      throw error;
    }
  };

  const handleBulkImportInvoices = async (importedInvoices) => {
    try {
      let successCount = 0;
      let failCount = 0;

      for (const invoiceData of importedInvoices) {
        try {
          // Build invoice payload from imported data
          const payload = {
            business_id: business.id,
            customer_id: invoiceData.customer?.id || null,
            date: new Date().toISOString().split('T')[0],
            due_date: invoiceData.due_date || null,
            status: 'draft',
            payment_status: 'unpaid',
            subtotal: invoiceData.items?.reduce((sum, item) => sum + (item.calculated_subtotal || 0), 0) || 0,
            tax_total: invoiceData.items?.reduce((sum, item) => sum + (item.calculated_tax || 0), 0) || 0,
            discount_total: invoiceData.items?.reduce((sum, item) => sum + (item.parsed_discount_amount || 0), 0) || 0,
            grand_total: invoiceData.items?.reduce((sum, item) => sum + (item.calculated_total || 0), 0) || 0,
            notes: `Imported from CSV`,
            items: invoiceData.items?.map(item => ({
              name: item.name,
              description: item.description || '',
              quantity: item.parsed_quantity,
              unit_price: item.parsed_unit_price,
              tax_percent: item.parsed_tax_percent || 0,
              tax_amount: item.calculated_tax || 0,
              discount_amount: item.parsed_discount_amount || 0,
              total_amount: item.calculated_total || 0
            })) || []
          };

          await invoiceAPI.create(payload, payload.items);
          successCount++;
        } catch (error) {
          console.error('Failed to import invoice:', error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} invoice(s) imported successfully`);
        refreshAllData();
      }
      if (failCount > 0) {
        toast.error(`${failCount} invoice(s) failed to import`);
      }
    } catch (error) {
      console.error('Bulk import failed:', error);
      toast.error('Failed to import invoices: ' + (error.message || 'Unknown error'));
    }
  };

  const handleExportInvoices = (data) => {
    if (!data || data.length === 0) {
      toast.error('No invoices to export');
      return;
    }

    // Use the existing handleExport but with invoice-specific filename
    handleExport(data, 'invoices');
  };

  const handleUpdatePOStatus = async (poId, status) => {
    try {
      const updated = await purchaseOrderAPI.updateStatus(business.id, poId, status);
      await fetchPurchases();

      if (status === PURCHASE_STATUSES.RECEIVED && business?.id) {
        await fetchInventory();
        toast.success('Inventory updated automatically');
      } else {
        toast.success(`Order marked as ${getPurchaseStatusLabel(status)}`);
      }
    } catch (error) {
      console.error('Error updating PO status:', error);
      toast.error(error?.message || 'Failed to update order status');
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
        productName: item.productName || item.name || 'Item',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice || item.price) || 0,
        taxPercent: Number(item.taxPercent) || 0,
        taxAmount: Number(item.taxAmount) || 0,
        discountAmount: Number(item.discountAmount) || 0,
      }));
      const lineDiscountTotal = normalizedItems.reduce(
        (sum, i) => sum + Number(i.discountAmount || 0),
        0
      );
      const subtotal = Number(checkoutData.subtotal) ||
        normalizedItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
      const taxAmount = Number(checkoutData.taxAmount) ||
        normalizedItems.reduce((sum, i) => sum + (i.taxAmount || 0), 0);
      const discountTotal = lineDiscountTotal > 0
        ? lineDiscountTotal
        : (Number(checkoutData.discountAmount) || 0);
      const total = Number(checkoutData.total) ||
        Math.round((subtotal + taxAmount - discountTotal) * 100) / 100;

      let sessionId = checkoutData.sessionId || null;

      // Auto-restore or open a POS session so sales use the transaction ledger (not invoice fallback).
      if (!sessionId) {
        const activeRes = await posAPI.getActiveSession(business.id);
        if (activeRes?.success && activeRes.session?.id) {
          sessionId = activeRes.session.id;
          setPosSession({
            ...activeRes.session,
            startTime: activeRes.session.opened_at || activeRes.session.startTime || null,
            terminalName: activeRes.session.terminal_name || null,
          });
        } else {
          const started = await handleStartPosSession();
          if (started?.success && started.session?.id) {
            sessionId = started.session.id;
          }
        }
      }

      if (sessionId) {
        const posResult = await posAPI.checkout({
          businessId: business.id,
          sessionId,
          customerId: checkoutData.customerId || null,
          items: normalizedItems,
          discountAmount: lineDiscountTotal > 0 ? 0 : discountTotal,
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

      // Compatibility fallback when session cannot be opened (e.g. plan limits).
      const invoiceItems = normalizedItems.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        name: item.productName || 'Item',
        tax_percent: item.taxPercent,
        tax_amount: item.taxAmount,
        discount_amount: item.discountAmount,
      }));

      const invoiceData = {
        business_id: business.id,
        customer_id: checkoutData.customerId || null,
        payment_method: checkoutData.paymentMethod || 'cash',
        grand_total: total,
        subtotal,
        tax_total: taxAmount,
        discount_total: discountTotal,
        status: 'paid',
        date: new Date().toISOString(),
        payment_status: 'paid',
        domain_data: { source: 'pos', pos_fallback: true },
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
        validationErrors: error?.validationErrors || null,
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

      <BusinessLoadingBoundary isLoading={!hubReady}>
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
            advancedDashboardSnapshot={advancedDashboardSnapshot}
            dateRange={dateRange}
            currency={currency}
            colors={colors}
            planTier={contextPlanTier || business?.plan_tier || 'free'}
            resourceLimits={resourceLimits}
            domainKnowledge={domainKnowledge}
            isLoading={dashboardTabLoading}
            financeInitialTab={financeInitialTab}
            onFinanceInitialTabConsumed={() => setFinanceInitialTab(null)}
            handlers={{
              handleTabChange,
              handleDeleteInvoice,
              handleBulkDelete,
              handleExport,
              // New Invoice Handlers
              handleRecordPayment,
              handleViewInvoice,
              handleBulkDeleteInvoices,
              handleBulkImportInvoices,
              handleExportInvoices,
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
              fetchInventory,
              setShowInvoiceBuilder,
              setShowProductForm,
              setShowCustomerForm,
              setEditingProduct,
              setEditingCustomer,
              setInvoiceInitialData,
              formatCurrency,
              handleQuickAction,
              openFinanceSubTab: (subTab) => setFinanceInitialTab(subTab),
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
        // Payment Modal States
        showPaymentModal={showPaymentModal}
        setShowPaymentModal={setShowPaymentModal}
        selectedInvoiceForPayment={selectedInvoiceForPayment}
        setSelectedInvoiceForPayment={setSelectedInvoiceForPayment}
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
        user={user}

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
