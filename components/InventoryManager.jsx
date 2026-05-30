'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  Package,
  Layers,
  Hash,
  ScanBarcode,
  Eye,
  Edit,
  Trash2,
  Factory,
  Warehouse,
  FileText,
  BarChart3,
  BrainCircuit,
  TrendingUp,
  Settings,
  Keyboard,
  LayoutDashboard,
  Table2,
  ChevronDown,
  AlertCircle,
  Repeat,
  Tag,
  DollarSign,
} from 'lucide-react';
import { DataTable } from './DataTable';
import { getDomainColors } from '@/lib/domainColors';
import { cn } from '@/lib/utils';
import { BusyGrid } from './BusyGrid';
import { getDomainTableColumns, normalizeKey } from '@/lib/utils/domainHelpers';
import { ShortcutsHelp } from './inventory/ShortcutsHelp';
import { AdvancedSearch } from './AdvancedSearch';
import { SmartRestockEngine } from './SmartRestockEngine';
import { DemandForecast } from './DemandForecast';
import { ExportButton } from './ExportButton';
import { BarcodeScanner } from './BarcodeScanner';
import { AdvancedInventoryFeatures } from './AdvancedInventoryFeatures';
import { MultiLocationInventory } from './MultiLocationInventory';
import { ManufacturingModule } from './ManufacturingModule';
import { QuotationOrderChallanManager } from './QuotationOrderChallanManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'react-hot-toast';
import { useBusiness } from '@/lib/context/BusinessContext';
import { formatCurrency } from '@/lib/utils/formatting';
import { VariantMatrixEditor } from './inventory/VariantMatrixEditor';
import { BatchManager } from './inventory/BatchManager';
import { SerialScanner } from './inventory/SerialScanner';
import { PriceListManager } from './inventory/PriceListManager';
import { DiscountSchemeManager } from './inventory/DiscountSchemeManager';
import { StockReservation } from './inventory/StockReservation';
import { StockAdjustmentManager } from './inventory/StockAdjustmentManager';
import { AutoReorderManager } from './inventory/AutoReorderManager';
import { StockTransferForm } from './inventory/StockTransferForm';
import { LowStockAlerts } from './inventory/LowStockAlerts';
import { CycleCountManager } from './inventory/CycleCountManager';
import { exportProducts } from '@/lib/utils/export';
import { productAPI } from '@/lib/api/product';
import {
  runWithConcurrency,
  leanProductPayloadForCreate,
  formatInventoryActionError,
} from '@/lib/utils/productMutationPayload';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductForm } from './ProductForm';
import { isBatchTrackingEnabled, isSerialTrackingEnabled, isSizeColorMatrixEnabled } from '@/lib/utils/domainHelpers';
import { VariantManager } from './domain/VariantManager';
import { ProductDetailsDialog } from './ProductDetailsDialog';
import { CustomParametersManager } from './inventory/CustomParametersManager';
import { ExcelModeModal } from './ExcelModeModal';
import { ExcelImportModal } from './ExcelImportModal';
import { SmartQuickAddModal } from './QuickAddProductModal';
import { QuickAddTemplates } from './QuickAddTemplates';

/**
 * Inventory Manager Component
 * A comprehensive dashboard for managing products, batches, serials, and inventory logistics.
 */
import { getProductsAction, deleteProductAction, createProductAction, updateProductAction, seedBusinessProductsAction } from '@/lib/actions/standard/inventory/product';

/** Normalize domain_data before merging — JSON strings must not be object-spread or saves corrupt */
function parseProductDomainData(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t || t === '[object Object]') return {};
    try {
      return JSON.parse(t);
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * @param {Object} props
 * @param {any[]} [props.products]
 * @param {any[]} [props.invoices]
 * @param {any[]} [props.customers]
 * @param {any[]} [props.locations]
 * @param {any[]} [props.bomList]
 * @param {any[]} [props.productionOrders]
 * @param {any[]} [props.quotations]
 * @param {any[]} [props.salesOrders]
 * @param {any[]} [props.challans]
 * @param {any[]} [props.vendors]
 * @param {string} props.businessId
 * @param {string} [props.category]
 * @param {string} [props.currency]
 * @param {any} [props.domainKnowledge]
 * @param {() => void} [props.refreshData]
 * @param {Function} [props.onUpdate]
 * @param {Function} [props.onAdd]
 * @param {Function} [props.onQuickAdd]
 * @param {Function} [props.onEdit]
 * @param {Function} [props.onDelete]
 * @param {Function} [props.onIssueInvoice]
 * @param {Function} [props.onLocationAdd]
 * @param {Function} [props.onLocationUpdate]
 * @param {Function} [props.onLocationDelete]
 * @param {Function} [props.onStockTransfer]
 * @param {Function} [props.onGeneratePO]
 */
export function InventoryManager({
  products: initialProducts = [],
  invoices = [],
  customers = [],
  locations = [],
  bomList = [],
  productionOrders = [],
  quotations = [],
  salesOrders = [],
  challans = [],
  vendors = [],
  businessId,
  category = 'retail-shop',
  currency: propCurrency, // renamed to avoid conflict with context
  domainKnowledge = {},
  // Handler overrides (optional)
  onUpdate,
  onAdd,
  onQuickAdd,
  onEdit,
  onDelete,
  onIssueInvoice,
  onLocationAdd,
  onLocationUpdate,
  onLocationDelete,
  onStockTransfer,
  onGeneratePO,
  refreshData
}) {
  const { regionalStandards, currency } = useBusiness();
  const standards = regionalStandards || {
    currencySymbol: 'Rs',
    currency: 'PKR',
    taxLabel: 'Sales Tax',
    taxIdLabel: 'NTN',
    countryCode: 'PK'
  };

  const colors = getDomainColors(category);

  // Helper to strictly deduplicate products and prevent React key errors
  const deduplicateProducts = (items) => {
    if (!items || !Array.isArray(items)) return [];
    const seen = new Set();
    return items.filter(item => {
      const key = item.id || item._tempId;
      if (key) {
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    });
  };

  // Initialize local state with strict deduplication
  const [products, setProducts] = useState(() => deduplicateProducts(initialProducts));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync internal state when prop changes (from parent refresh)
  useEffect(() => {
    const next = deduplicateProducts(initialProducts || []);
    queueMicrotask(() => {
      setProducts(next);
    });
  }, [initialProducts]);

  // Internal Data Fetching (Only if products not passed or empty, and not controlled by parent)
  const fetchProducts = useCallback(async () => {
    // If businessId missing OR products provided OR parent controls data refresh => SKIP
    if (!businessId || (initialProducts?.length > 0) || refreshData) return;
    setLoading(true);
    try {
      const res = await getProductsAction(businessId);
      if (res.success) {
        setProducts(deduplicateProducts(res.products));
      } else {
        setError(res.error);
        toast.error('Failed to load inventory');
      }
    } catch (err) {
      console.error(err);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, refreshData]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchProducts();
    });
  }, [fetchProducts]);

  // Wrap internal handlers to update local state + call parent if provided
  const handleAddProduct = async (productData) => {
    try {
      // 1. Optimistic Update (Optional, but safer to wait for ID)
      setLoading(true);

      // 2. Server Action
      const res = await createProductAction({
        ...productData,
        business_id: businessId
      });

      if (res.success) {
        toast.success("Product created successfully");
        // 3. Update Local State
        setProducts(prev => [res.product, ...prev]);
        // 4. Notify Parent
        onAdd?.(res.product);
      } else {
        toast.error(res.error || "Failed to create product");
      }
    } catch (error) {
      console.error("Quick Add Error:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Handlers for CRUD to update local state immediately
  const handleDeleteProduct = async (id) => {
    // Optimistic Update
    const old = [...products];
    setProducts(prev => prev.filter(p => p.id !== id));
    try {
      const res = await deleteProductAction(id, businessId);
      if (!res.success) {
        setProducts(old); // Revert
        toast.error(res.error || 'Failed to delete product');
      } else {
        toast.success('Product deleted');
        onDelete?.(id);
      }
    } catch (err) {
      setProducts(old); // Revert on network error
      console.error('Delete error:', err);
      toast.error('Connection error while deleting');
    }
  };

  // Excel Import Handler
  const handleExcelImport = async (importPayload) => {
    // ExcelImportModal sends { rows: validatedRows[], file, selectedSheet }
    // File objects cannot cross the server-action boundary — always use the
    // already-parsed/validated rows directly.
    const importedRows = Array.isArray(importPayload) ? importPayload : (importPayload?.rows || []);

    if (!importedRows.length) {
      toast.error('No rows to import');
      return;
    }

    setLoading(true);
    try {
      const res = await productAPI.bulkImport(businessId, importedRows, {
        category,
        allowDuplicates: false,
        skipExisting: false
      });
      
      toast.success(`Import completed: ${res.imported} imported, ${res.updated} updated.`);
      
      // Refresh the products list to show new data
      if (refreshData) {
        await refreshData();
      } else {
        await fetchProducts();
      }
    } catch (error) {
      console.error('Excel import error:', error);
      toast.error(`Import failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // State Management
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false);
  const [viewMode, setViewMode] = useState('visual');

  const [showBatchManager, setShowBatchManager] = useState(false);
  const [showSerialScanner, setShowSerialScanner] = useState(false);
  const [showVariantEditor, setShowVariantEditor] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductFormInternal, setShowProductFormInternal] = useState(false);
  const [productToView, setProductToView] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [productsToBulkDelete, setProductsToBulkDelete] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [activeDomainFilters, setActiveDomainFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showExcelMode, setShowExcelMode] = useState(false);
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [showStockTransferForm, setShowStockTransferForm] = useState(false);

  // Bulk Save Handler for Excel Mode
  const handleExcelSave = async (updatedData) => {
    setLoading(true);
    const results = { updated: 0, created: 0, failed: 0 };

    try {
      // Find what actually changed or is new
      const changedItems = updatedData.filter(item => {
        // New item (has _tempId but no real ID)
        if (item._tempId && !item.id) return true;

        // Edited item (compare with original)
        const original = products.find(p => p.id === item.id);
        if (!original) return true; // Should not happen for edits

        // Simple stringified comparison for quick diffing
        return JSON.stringify(item) !== JSON.stringify(original);
      });

      if (changedItems.length === 0) {
        toast('No changes to save', { id: 'excel-no-changes', duration: 2000 });
        setShowExcelMode(false);
        setLoading(false);
        return;
      }

      toast.loading(`Saving ${changedItems.length} changes...`, { id: 'excel-save' });

      // Limited concurrency: unbounded parallel server actions often fail as "Failed to fetch"
      const settled = await runWithConcurrency(changedItems, 5, async (item) => {
        const isNew = item._tempId && !item.id;
        if (isNew) {
          const res = await createProductAction(
            leanProductPayloadForCreate({ ...item, business_id: businessId })
          );
          return { res, item, isNew };
        }
        const res = await updateProductAction(item.id, businessId, item);
        return { res, item, isNew };
      });

      const successfulTempIds = new Set();
      const activeUpdates = [];
      const newRealItems = [];

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          const { res, item, isNew } = result.value;
          if (res.success) {
            if (isNew) {
              results.created++;
              successfulTempIds.add(item._tempId);
              newRealItems.push(res.product);
            } else {
              results.updated++;
              activeUpdates.push(res.product);
            }

            // Display warnings as helpful recommendations (non-blocking)
            if (res.warnings && res.warnings.length > 0) {
              res.warnings.forEach(warning => {
                toast(warning, {
                  icon: '\u{1F4A1}',
                  duration: 4000,
                  style: {
                    background: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FCD34D'
                  }
                });
              });
            }
          } else {
            results.failed++;
            console.error(`Failed to save item ${item.name}:`, res.error);
          }
        } else {
          results.failed++;
          console.error(`Error saving item:`, result.reason);
        }
      }

      // Batch update state to prevent multiple renders and race conditions
      setProducts(prev => {
        // 1. Remove successful temp items
        let next = prev.filter(p => !p._tempId || !successfulTempIds.has(p._tempId));

        // 2. Apply updates
        if (activeUpdates.length > 0) {
          const updateMap = new Map(activeUpdates.map(u => [u.id, u]));
          next = next.map(p => updateMap.get(p.id) || p);
        }

        // 3. Add new real items
        if (newRealItems.length > 0) {
          next = [...next, ...newRealItems];
        }

        // 4. Safety: Deduplicate by ID
        const seen = new Set();
        return next.filter(p => {
          const key = p.id || p._tempId;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });

      toast.dismiss('excel-save');

      if (results.failed === 0) {
        toast.success(`Excel Save Complete: ${results.updated} updated, ${results.created} created`, {
          id: 'excel-save-result',
          duration: 3500,
        });
        setShowExcelMode(false);
      } else {
        toast.error(
          `Excel Save partially failed: ${results.failed} errors. ${results.updated + results.created} saved.`,
          { id: 'excel-save-result', duration: 6000 }
        );
      }
    } catch (err) {
      console.error(err);
      toast.dismiss('excel-save');
      toast.error(formatInventoryActionError(err), { id: 'excel-save-result', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  // Products are filtered by the parent (DashboardTabs) based on global search
  // Here we apply additional domain-specific filters (Stock Level, Category, Brand, Price)
  const productsToDisplay = useMemo(() => {
    const num = (v, fallback = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    return products.filter(p => {
      // 0. Search Term Filter (Name, SKU, Barcode, Brand, Category)
      const normalizedTerm = String(searchTerm || '').trim().toLowerCase();
      if (normalizedTerm) {
        const searchable = [
          p.name,
          p.sku,
          p.barcode,
          p.brand,
          p.category
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchable.includes(normalizedTerm)) return false;
      }

      const stockVal = num(p.stock, 0);
      const priceVal = num(p.price, 0);

      // 1. Stock Category Filter
      if (activeDomainFilters.stock === 'low') {
        const minStock = num(p.min_stock ?? p.minStock, 10);
        const isLow = stockVal <= minStock;
        if (!isLow) return false;
      } else if (activeDomainFilters.stock === 'normal') {
        const minStock = num(p.min_stock ?? p.minStock, 10);
        const isNormal = stockVal > minStock;
        if (!isNormal) return false;
      } else if (activeDomainFilters.stock === 'high') {
        const minStock = num(p.min_stock ?? p.minStock, 10);
        const isHigh = stockVal > minStock * 3; // Example heuristic
        if (!isHigh) return false;
      }

      // 2. Local Category Filter
      if (activeDomainFilters.category && p.category !== activeDomainFilters.category) {
        return false;
      }

      // 3. Brand Filter
      if (activeDomainFilters.brand && p.brand !== activeDomainFilters.brand) {
        return false;
      }

      // 4. Price Range Filter
      if (activeDomainFilters.minPrice) {
        if (priceVal < Number(activeDomainFilters.minPrice)) return false;
      }
      if (activeDomainFilters.maxPrice) {
        if (priceVal > Number(activeDomainFilters.maxPrice)) return false;
      }

      return true;
    });
  }, [products, activeDomainFilters, searchTerm]);

  // Derive unique options for filters
  const categoryOptions = useMemo(() => {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    return categories.map(c => ({ value: c, label: c }));
  }, [products]);

  const brandOptions = useMemo(() => {
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
    return brands.map(b => ({ value: b, label: b }));
  }, [products]);

  const handleBulkDelete = (items) => {
    setProductsToBulkDelete(items);
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    const toDelete = [...productsToBulkDelete];
    setShowBulkDeleteConfirm(false);
    setProductsToBulkDelete([]);
    setLoading(true);
    
    const toastId = toast.loading(`Deleting ${toDelete.length} products...`);
    try {
      const results = await runWithConcurrency(toDelete, 5, (p) =>
        deleteProductAction(p.id, businessId)
      );

      let successCount = 0;
      let failed = 0;
      const idsToKeep = [];

      results.forEach((result, index) => {
        const product = toDelete[index];
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
          onDelete?.(product.id);
        } else {
          failed++;
          idsToKeep.push(product.id);
          const errorMsg = result.status === 'rejected' ? result.reason.message : result.value.error;
          console.error(`Bulk delete failed for ${product.id}:`, errorMsg);
        }
      });

      // Update products state in one batch to trigger only one render pass
      setProducts(prev => prev.filter(p => !toDelete.some(x => x.id === p.id) || idsToKeep.includes(p.id)));

      if (failed === 0) {
        toast.success(`Deleted ${toDelete.length} product${toDelete.length !== 1 ? 's' : ''}`, { id: toastId });
      } else {
        toast.error(`Deleted ${successCount}, failed ${failed}`, { id: toastId });
      }
    } catch (err) {
      console.error('Parallel bulk delete failed:', err);
      toast.error('Failed to execute bulk deletion', { id: toastId });
    } finally {
      setLoading(false);
    }
  };


  // Domain Feature Flags
  const isBatchEnabled = domainKnowledge?.batchTrackingEnabled;
  const isSerialEnabled = domainKnowledge?.serialTrackingEnabled;
  const isExpiryEnabled = domainKnowledge?.expiryTrackingEnabled;
  const isMultiLocationEnabled = domainKnowledge?.multiLocationEnabled;
  const isManufacturingEnabled = domainKnowledge?.manufacturingEnabled;
  const isVariantEnabled = domainKnowledge?.productFields?.some(f =>
    f.toLowerCase().includes('size') ||
    f.toLowerCase().includes('color') ||
    f.toLowerCase().includes('matrix')
  );



  const handleUpdateProduct = async (productData) => {
    const old = [...products];
    try {
      if (onUpdate) {
        await onUpdate(productData);
        setShowProductFormInternal(false);
        setEditingProduct(null);
        return;
      }
      const res = await updateProductAction(productData.id, businessId, productData);
      if (res.success) {
        setProducts(prev => prev.map(p => p.id === productData.id ? res.product : p));
        toast.success('Product updated');
        setShowProductFormInternal(false);
        setEditingProduct(null);
        return res.product;
      } else {
        toast.error(res.error || 'Failed to update product');
        throw new Error(res.error || 'Failed to update product');
      }
    } catch (err) {
      setProducts(old);
      console.error('Update error:', err);
      toast.error(formatInventoryActionError(err), { id: 'inventory-product-update' });
      throw err;
    }
  };

  const executeExcelExport = async () => {
    toast.loading("Preparing export...", { id: 'inventory-export' });
    try {
      const result = await productAPI.bulkExport(businessId, {
        includeBatches: true,
        includeSerials: true,
      });

      const bytes = new Uint8Array(result.buffer || []);
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName || `inventory-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (result.roundTripValid === false) {
        toast.success(`Exported ${result.recordCount || productsToDisplay.length} items (with warnings)`, { id: 'inventory-export' });
      } else {
        toast.success(`Exported ${result.recordCount || productsToDisplay.length} items successfully`, { id: 'inventory-export' });
      }
    } catch (error) {
      console.error('Export failed:', error);
      // Fallback keeps export available if server-side export fails.
      try {
        await exportProducts(productsToDisplay, 'excel');
        toast.success(`Exported ${productsToDisplay.length} items (fallback mode)`, { id: 'inventory-export' });
      } catch {
        toast.error('Failed to export inventory', { id: 'inventory-export' });
      }
    }
  };

  // Keyboard Shortcuts for Tab Switching
  useEffect(() => {
    const tabSequence = [
      'products',
      isMultiLocationEnabled ? 'locations' : null,
      isManufacturingEnabled ? 'manufacturing' : null,
      'orders',
      'reports',
      isVariantEnabled ? 'variants' : null,
      'pricing',
    ].filter(Boolean);

    const handleGlobalShortcuts = (e) => {
      // ALT + 1..7 maps to visible tabs in current business domain
      if (e.altKey && e.key >= '1' && e.key <= '7') {
        const index = Number(e.key) - 1;
        const target = tabSequence[index];
        if (target) {
          e.preventDefault();
          setActiveTab(target);
          toast.success(`Tab: ${target.toUpperCase()}`, { duration: 1000, position: 'bottom-center' });
        }
      }
      // ALT + V (Visual) or ALT + B (Busy)
      if (e.altKey && (e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 'b')) {
        const mode = e.key.toLowerCase() === 'v' ? 'visual' : 'busy';
        e.preventDefault();
        setViewMode(mode);
        toast.success(`Mode: ${mode.toUpperCase()}`, { duration: 1000, position: 'bottom-center' });
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [isMultiLocationEnabled, isManufacturingEnabled, isVariantEnabled]);

  // Handle global events from Header Page Controls
  useEffect(() => {
    const handleToggleFilters = () => {
      // Focus the advanced search or toggle its visibility if we add a toggle state later
      toast.success("Filters focused", { icon: '[SEARCH]' });
      // Heuristic: Scroll to search or just show toast for now
    };

    const handleExportGlobal = () => {
      executeExcelExport();
    };

    window.addEventListener('toggle-filters', handleToggleFilters);
    window.addEventListener('export-data', handleExportGlobal);

    const handleInventoryFocusLowStock = () => {
      setActiveTab('products');
      setActiveDomainFilters(prev => ({ ...prev, stock: 'low' }));
      setSearchTerm('');
      toast.success('Showing low stock items', { duration: 1400 });
    };

    window.addEventListener('inventory-focus-low-stock', handleInventoryFocusLowStock);

    return () => {
      window.removeEventListener('toggle-filters', handleToggleFilters);
      window.removeEventListener('export-data', handleExportGlobal);
      window.removeEventListener('inventory-focus-low-stock', handleInventoryFocusLowStock);
    };
  }, [productsToDisplay]);

  // Demand forecasting (simple moving average)
  const forecastDemand = (product) => {
    // Mock: In real app, this would use historical sales data
    const avgSales = product.avgMonthlySales || 0;
    const leadTime = product.leadTime || 7; // days
    const safetyStock = avgSales * (leadTime / 30) * 1.5;
    return Math.ceil(safetyStock);
  };

  const lowStockItems = useMemo(() => {
    return products.filter((p) => {
      const stock = Number(p.stock || 0);
      const minStock = Number(p.min_stock ?? p.minStock ?? 0);
      return stock <= minStock;
    });
  }, [products]);

  const abcAnalysis = useMemo(() => {
    const sorted = [...products].sort((a, b) => ((Number(b.price || 0) * Number(b.stock || 0)) - (Number(a.price || 0) * Number(a.stock || 0))));
    const totalValue = sorted.reduce((sum, p) => sum + (Number(p.price || 0) * Number(p.stock || 0)), 0);

    return sorted.reduce(
      (acc, p) => {
        const value = Number(p.price || 0) * Number(p.stock || 0);
        const running = acc.running + value;
        const percentage = totalValue > 0 ? (running / totalValue) * 100 : 0;
        let category = 'C';
        if (percentage <= 80) category = 'A';
        else if (percentage <= 95) category = 'B';
        return {
          running,
          rows: [...acc.rows, { ...p, category, value, percentage }],
        };
      },
      { running: 0, rows: [] }
    ).rows;
  }, [products]);

  const abcStats = useMemo(() => {
    const totalCount = products.length || 1;
    const aItems = abcAnalysis.filter(p => p.category === 'A');
    const bItems = abcAnalysis.filter(p => p.category === 'B');
    const cItems = abcAnalysis.filter(p => p.category === 'C');

    const aValue = aItems.reduce((sum, p) => sum + (p.value || 0), 0);
    const bValue = bItems.reduce((sum, p) => sum + (p.value || 0), 0);
    const cValue = cItems.reduce((sum, p) => sum + (p.value || 0), 0);
    const totalValue = aValue + bValue + cValue || 1;

    return {
      A: {
        count: aItems.length,
        pct: Math.round((aItems.length / totalCount) * 100),
        valPct: Math.round((aValue / totalValue) * 100)
      },
      B: {
        count: bItems.length,
        pct: Math.round((bItems.length / totalCount) * 100),
        valPct: Math.round((bValue / totalValue) * 100)
      },
      C: {
        count: cItems.length,
        pct: Math.round((cItems.length / totalCount) * 100),
        valPct: Math.round((cValue / totalValue) * 100)
      }
    };
  }, [abcAnalysis, products]);

  const turnoverRate = useMemo(() => {
    if (!products.length || !invoices.length) return '0.0';

    const totalStock = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
    if (totalStock === 0) return '0.0';

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentQtySold = invoices
      .filter((inv) => new Date(inv.date) >= thirtyDaysAgo)
      .reduce((sum, inv) => {
        return sum + (inv.items?.reduce((isum, item) => isum + (Number(item.quantity) || 0), 0) || 0);
      }, 0);

    return (recentQtySold / totalStock).toFixed(1);
  }, [products, invoices]);

  const expiringCount = useMemo(() => {
    if (!isExpiryEnabled) return 0;

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return products.filter((p) => {
      if (p.expiry_date && new Date(p.expiry_date) <= thirtyDaysFromNow) return true;
      if (p.batches?.some((b) => new Date(b.expiry_date) <= thirtyDaysFromNow)) return true;
      return false;
    }).length;
  }, [products, isExpiryEnabled]);

  const getDomainBatchLabel = (cat) => {
    switch (cat) {
      case 'textile-wholesale': return 'ROLL / BALE';
      case 'garments': return 'LOT INFO';
      case 'electronics': return 'BATCH ID';
      case 'food-beverages': return 'BATCH CODE';
      default: return 'BATCH INFO';
    }
  };

  const getDomainSerialLabel = (cat) => {
    switch (cat) {
      case 'mobile-phones':
      case 'telecom': return 'IMEI LIST';
      case 'auto-parts': return 'CHASSIS NO';
      case 'electronics': return 'SERIALS';
      default: return 'SERIALS';
    }
  };

  // Column Definitions with Optimized Widths & Alignment
  const columns = useMemo(() => {
    // Base Columns with Professional Styling
    const baseCols = [
      {
        id: 'actions',
        header: '',
        size: 50,
        minSize: 50,
        maxSize: 50,
        enableResizing: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0 hover:bg-gray-100">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px]">
              <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setProductToView(row.original)} className="text-sm">
                <Eye className="mr-2 h-3.5 w-3.5" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setEditingProduct(row.original); setShowProductFormInternal(true); }} className="text-sm">
                <Edit className="mr-2 h-3.5 w-3.5" /> Edit Product
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isBatchEnabled && (
                <DropdownMenuItem onClick={() => { setSelectedProduct(row.original); setShowBatchManager(true); }} className="text-sm">
                  <Package className="mr-2 h-3.5 w-3.5" /> Manage Batches
                </DropdownMenuItem>
              )}
              {isSerialEnabled && (
                <DropdownMenuItem onClick={() => { setSelectedProduct(row.original); setShowSerialScanner(true); }} className="text-sm">
                  <Hash className="mr-2 h-3.5 w-3.5" /> Serial Numbers
                </DropdownMenuItem>
              )}
              {isVariantEnabled && (
                <DropdownMenuItem onClick={() => { setSelectedProduct(row.original); setShowVariantEditor(true); }} className="text-sm">
                  <Layers className="mr-2 h-3.5 w-3.5" /> Manage Variants
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => { setSelectedProduct(row.original); setShowAdvancedFeatures(true); }} className="text-sm">
                <Settings className="mr-2 h-3.5 w-3.5" /> Advanced Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProductToDelete(row.original)} className="text-red-600 focus:text-red-600 focus:bg-red-50 text-sm">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'PRODUCT NAME',
        size: 220,
        minSize: 180,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col gap-0 py-0 leading-tight">
            <span className="line-clamp-1 text-xs font-semibold leading-tight text-gray-900">{row.original.name}</span>
            {row.original.brand && (
              <span className="mt-0.5 line-clamp-1 text-[10px] text-gray-500">{row.original.brand}</span>
            )}
          </div>
        ),
      },
      {
        id: 'sku',
        accessorKey: 'sku',
        header: 'SKU',
        size: 110,
        minSize: 90,
        cell: ({ row }) => <span className="font-mono text-[11px] text-gray-700">{row.original.sku || '-'}</span>
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: 'CATEGORY',
        size: 130,
        minSize: 110,
        cell: ({ row }) => (
          <span className="inline-flex max-w-full items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide text-gray-700">
            {row.original.category}
          </span>
        )
      },
      {
        id: 'stock',
        accessorKey: 'stock',
        header: () => <div className="text-right font-semibold">STOCK</div>,
        size: 90,
        minSize: 80,
        cell: ({ row }) => {
          const stock = Number(row.original.stock ?? 0);
          const minStock = Number(row.original.min_stock ?? row.original.minStock ?? 10);
          const safeStock = Number.isFinite(stock) ? stock : 0;
          const safeMin = Number.isFinite(minStock) ? minStock : 10;
          const isLow = safeStock <= safeMin;

          return (
            <div className="flex w-full min-w-0 items-center justify-end gap-1.5 pr-0.5 tabular-nums">
              <span
                className={cn(
                  'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
                  safeStock <= 0 ? 'animate-pulse bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                )}
                aria-hidden
              />
              <span
                className={cn(
                  'min-w-[1.25rem] text-right text-xs font-semibold tabular-nums',
                  safeStock <= 0 ? 'text-red-600' : isLow ? 'text-amber-700' : 'text-emerald-800'
                )}
              >
                {safeStock}
              </span>
              {isLow && (
                <span className="inline-flex shrink-0 items-center rounded border border-amber-200 bg-amber-50 px-1 py-0 text-[9px] font-bold uppercase leading-none text-amber-700">
                  Low
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'price',
        accessorKey: 'price',
        header: () => <div className="text-right font-semibold">PRICE</div>,
        size: 110,
        minSize: 100,
        cell: ({ row }) => <div className="text-right font-semibold text-sm text-gray-900 tabular-nums pr-2">{formatCurrency(row.original.price || 0, standards.currency)}</div>
      },
      {
        id: 'tax_percent',
        accessorKey: 'tax_percent',
        header: () => <div className="text-right font-semibold">TAX %</div>,
        size: 80,
        minSize: 70,
        cell: ({ row }) => <div className="text-right text-xs font-medium text-gray-500 pr-2">{row.original.tax_percent ?? row.original.taxPercent ?? 17}%</div>
      },
      {
        id: 'value',
        accessorKey: 'value',
        header: () => <div className="text-right font-semibold">VALUE</div>,
        size: 120,
        minSize: 110,
        readOnly: true, // Calculated field
        cell: ({ row }) => <div className="text-right text-sm text-gray-500 font-medium italic tabular-nums pr-2 bg-gray-50/50 h-full flex items-center justify-end w-full">{formatCurrency((row.original.price || 0) * (row.original.stock || 0), standards.currency)}</div>
      }
    ];

    // Extended Features Columns (Batch, Expiry, Manufacturing) - Professional Styling
    if (isBatchEnabled) {
      baseCols.push({
        id: 'batch_number',
        accessorKey: 'batch_number',
        header: getDomainBatchLabel(category),
        size: 130,
        minSize: 110,
        cell: ({ row }) => {
          const batches = row.original.batches || [];
          const singleBatch = row.original.batch_number;

          if (batches.length > 0) {
            return (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-[10px]">
                {batches.length} {batches.length === 1 ? 'Batch' : 'Batches'}
              </Badge>
            );
          }
          return singleBatch ? (
            <span className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
              {singleBatch}
            </span>
          ) : <span className="text-gray-300">-</span>;
        }
      });
    }

    if (isSerialEnabled) {
      baseCols.push({
        id: 'serials',
        accessorKey: 'serial_numbers',
        header: getDomainSerialLabel(category),
        size: 110,
        minSize: 100,
        cell: ({ row }) => {
          const serials = row.original.serial_numbers || [];
          if (serials.length > 0) {
            return (
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-[10px]">
                {serials.length} Items
              </Badge>
            );
          }
          return <span className="text-gray-300">-</span>;
        }
      });
    }

    if (isManufacturingEnabled) {
      baseCols.push({
        id: 'mfg_date',
        accessorKey: 'manufacturing_date',
        header: 'MFG DATE',
        size: 100,
        minSize: 90,
        cell: ({ row }) => <span className="text-xs text-gray-500">{row.original.manufacturing_date ? new Date(row.original.manufacturing_date).toLocaleDateString('en-GB') : '-'}</span>
      });
    }

    if (isExpiryEnabled) {
      baseCols.push({
        id: 'expiry_date',
        accessorKey: 'expiry_date',
        header: 'EXPIRY',
        size: 100,
        minSize: 90,
        cell: ({ row }) => {
          const expiry = row.original.expiry_date;
          if (!expiry) return <span className="text-gray-300">-</span>;

          const now = new Date();
          const horizonMs = now.getTime() + 30 * 24 * 60 * 60 * 1000;
          const isExpired = new Date(expiry) < now;
          const isExpiringSoon = new Date(expiry).getTime() < horizonMs;

          return (
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded",
              isExpired ? 'bg-red-50 text-red-600 border border-red-100' :
                isExpiringSoon ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  'text-gray-600'
            )}>
              {new Date(expiry).toLocaleDateString('en-GB')}
            </span>
          );
        }
      });
    }

    // Domain Specific Columns (Dynamic) - Clean & Compact
    if (domainKnowledge?.productFields) {
      const standardFields = ['name', 'price', 'stock', 'category', 'sku', 'barcode', 'expiry_date', 'batch_number', 'manufacturing_date', 'brand', 'images'];

      domainKnowledge.productFields.forEach(field => {
        const attrKey = normalizeKey(field);
        if (standardFields.includes(attrKey)) return;

        baseCols.push({
          id: `domain_${attrKey}`,
          header: field.replace(/_/g, ' ').toUpperCase(),
          accessorKey: `domain_data.${attrKey}`,
          size: 120,
          minSize: 100,
          cell: ({ row }) => {
            // Robust data retrieval strategy
            const normalized = normalizeKey(field);
            const snakeCase = field.toLowerCase().replace(/\s+/g, '_');
            const raw = field;

            const val =
              row.original.domain_data?.[normalized] ||
              row.original.domain_data?.[snakeCase] ||
              row.original.domain_data?.[raw] ||
              row.original[normalized] ||
              row.original[snakeCase] ||
              row.original.attributes?.[normalized] ||
              '-';

            return <span className="text-xs text-gray-600 line-clamp-1">{String(val)}</span>;
          }
        });
      });
    }

    return baseCols;
  }, [domainKnowledge, isExpiryEnabled, isBatchEnabled, isManufacturingEnabled, isSerialEnabled, isVariantEnabled, category]);

  // Removed standard columns.push since it's now in useMemo initialization



  const topCategoryPerformance = useMemo(() => {
    const byCategory = products.reduce((acc, product) => {
      const categoryName = product.category || 'Uncategorized';
      const stock = Number(product.stock || 0);
      const price = Number(product.price || 0);
      const value = stock * price;

      if (!acc[categoryName]) {
        acc[categoryName] = { category: categoryName, value: 0, units: 0 };
      }

      acc[categoryName].value += value;
      acc[categoryName].units += stock;
      return acc;
    }, {});

    const rows = Object.values(byCategory);
    const totalValue = rows.reduce((sum, row) => sum + row.value, 0) || 1;

    return rows
      .map((row) => ({
        ...row,
        share: Math.round((row.value / totalValue) * 100)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [products]);



  // Shared Actions column for both views
  const gridColumns = useMemo(() => {
    const actionsCol = columns.find(c => c.id === 'actions');
    const pinnedActions = actionsCol
      ? { ...actionsCol, accessorKey: '__actions', readOnly: true }
      : null;
    return [
      pinnedActions,
      ...getDomainTableColumns(category, standards.currencySymbol)
    ].filter(Boolean);
  }, [category, columns, standards.currencySymbol]);



  return (
    <div className="space-y-4">
      {/* Refined Action Bar - Consolidated, Responsive & Aligned */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2 border-b border-gray-100/50">
        {/* Left/Primary Row: Status, Switcher, and Pinned CTA */}
        <div className="flex items-center justify-between w-full lg:w-auto gap-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-lg border border-green-100 shrink-0">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Live Sync</span>
            </div>
            {/* View Mode Switcher */}
            <div className="bg-gray-100/90 p-1 rounded-lg flex items-center border border-gray-200 shadow-sm h-9 shrink-0">
              <button
                onClick={() => setViewMode('visual')}
                className={cn(
                  "px-3 h-7 text-[10px] font-black uppercase tracking-wider rounded-md transition-colors",
                  viewMode === 'visual' ? "bg-white shadow-md text-brand-primary" : "text-gray-500 hover:text-gray-900"
                )}
              >
                Visual
              </button>
              <button
                onClick={() => setViewMode('busy')}
                className={cn(
                  "px-3 h-7 text-[10px] font-black uppercase tracking-wider rounded-md transition-colors",
                  viewMode === 'busy' ? "bg-white shadow-md text-brand-primary" : "text-gray-500 hover:text-gray-900"
                )}
              >
                Busy
              </button>
            </div>
          </div>

          {/* Pinned Primary CTA on Mobile ONLY (hidden on lg+) */}
          <Button
            size="sm"
            onClick={(e) => onAdd ? onAdd(e) : setShowProductFormInternal(true)}
            className="lg:hidden h-9 text-white rounded-lg px-4 font-black text-[10px] uppercase tracking-wider bg-brand-primary hover:bg-brand-primary-dark transition-all shadow-md shadow-brand-primary/10 shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add
          </Button>
        </div>

        {/* Right Row: Utility Buttons - Swipeable on mobile, aligned on desktop */}
        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto scrollbar-none pb-1 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0 whitespace-nowrap">
          {/* Barcode Scanner */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBarcodeScanner(true)}
            className="h-9 rounded-lg px-3 font-black text-[10px] uppercase tracking-wider border-brand-primary/20 bg-brand-primary/5 hover:bg-brand-primary/10 text-brand-primary transition-colors shrink-0"
          >
            <ScanBarcode className="w-4 h-4 mr-2 text-brand-primary" />
            Scan
          </Button>

          {/* Secondary Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 rounded-lg px-3.5 font-black text-[10px] uppercase tracking-wider border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors shrink-0">
                <Settings className="w-3.5 h-3.5 mr-2 text-gray-400" />
                More Actions
                <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] p-2 rounded-xl shadow-2xl border-gray-100">
              <DropdownMenuLabel className="text-[9px] font-black text-gray-400 uppercase tracking-widest p-2">Utility</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setShowShortcutsHelp(true)} className="rounded-lg py-2.5">
                <Keyboard className="w-4 h-4 mr-3 text-wine-500" />
                <span className="font-bold text-[10px] uppercase tracking-tight">Key Command Help</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuLabel className="text-[9px] font-black text-gray-400 uppercase tracking-widest p-2">Stock Operations</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setShowStockAdjustment(true)} className="rounded-lg py-2.5">
                <AlertTriangle className="w-4 h-4 mr-3 text-amber-500" />
                <span className="font-bold text-[10px] uppercase tracking-tight">Adjust Stock</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowStockTransferForm(true)} className="rounded-lg py-2.5">
                <Repeat className="w-4 h-4 mr-3 text-violet-500" />
                <span className="font-bold text-[10px] uppercase tracking-tight">Transfer Stock</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <div className="p-1">
                <ExportButton
                  data={products}
                  filename="inventory_report"
                  title="Inventory Report"
                  columns={[
                    { key: 'name', label: 'Product Name' },
                    { key: 'sku', label: 'SKU' },
                    { key: 'category', label: 'Category' },
                    { key: 'stock', label: 'Stock' },
                    { key: 'price', label: 'Price' }
                  ]}
                  minimal
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={() => setShowQuickAddModal(true)}
            className="h-9 text-white rounded-lg px-4 font-black text-[10px] uppercase tracking-wider bg-slate-900 hover:bg-slate-800 transition-all shadow-md shadow-slate-950/10 group shrink-0"
          >
            <BrainCircuit className="w-4 h-4 mr-2 text-blue-400 group-hover:rotate-12 transition-transform" />
            AI Smart Add
          </Button>

          <Button
            size="sm"
            onClick={() => setShowExcelMode(true)}
            className="h-9 text-white rounded-lg px-4 font-black text-[10px] uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10 group shrink-0"
          >
            <Table2 className="w-4 h-4 mr-2 text-green-400 group-hover:rotate-6 transition-transform" />
            Excel Mode
          </Button>

          <div className="shrink-0">
            <ExcelImportModal
              onImport={handleExcelImport}
              existingProducts={products}
            />
          </div>

          <div className="shrink-0">
            <QuickAddTemplates
              domain={category}
              currency={currency}
              onAddProduct={handleAddProduct}
            />
          </div>

          {/* Standard Primary CTA on Desktop (hidden on mobile) */}
          <Button
            size="sm"
            onClick={(e) => onAdd ? onAdd(e) : setShowProductFormInternal(true)}
            className="hidden lg:flex h-9 text-white rounded-lg px-5 font-black text-[10px] uppercase tracking-wider bg-brand-primary hover:bg-brand-primary-dark transition-all shadow-md shadow-brand-primary/10 shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Feature Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-transparent">
        <TabsList className="flex w-full flex-wrap bg-gray-100/60 p-0.5 rounded-xl border border-gray-200 shadow-inner gap-1 h-auto">
          <TabsTrigger value="products" className="rounded-lg font-semibold text-xs transition-all data-[state=active]:shadow-sm data-[state=active]:bg-white">
            <Package className="w-4 h-4 mr-2" />
            Products
          </TabsTrigger>
          {isMultiLocationEnabled && (
            <TabsTrigger value="locations" className="rounded-lg font-semibold text-xs transition-all data-[state=active]:shadow-sm data-[state=active]:bg-white">
              <Warehouse className="w-4 h-4 mr-2" />
              Locations
            </TabsTrigger>
          )}
          {isManufacturingEnabled && (
            <TabsTrigger value="manufacturing" className="rounded-lg font-semibold text-xs transition-all data-[state=active]:shadow-sm data-[state=active]:bg-white">
              <Factory className="w-4 h-4 mr-2" />
              Manufacturing
            </TabsTrigger>
          )}
          <TabsTrigger value="orders" className="rounded-lg font-semibold text-xs transition-all data-[state=active]:shadow-sm data-[state=active]:bg-white">
            <FileText className="w-4 h-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-lg font-semibold text-xs transition-all data-[state=active]:shadow-sm data-[state=active]:bg-white">
            <BarChart3 className="w-4 h-4 mr-2" />
            Reports
          </TabsTrigger>
          {isVariantEnabled && (
            <TabsTrigger value="variants" className="rounded-lg font-semibold text-xs transition-all data-[state=active]:shadow-sm data-[state=active]:bg-white">
              <Layers className="w-4 h-4 mr-2" />
              Variants
            </TabsTrigger>
          )}
          <TabsTrigger value="pricing" className="rounded-lg font-semibold text-xs transition-all data-[state=active]:shadow-sm data-[state=active]:bg-white">
            <Tag className="w-4 h-4 mr-2" />
            Pricing
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">

          {/* Alerts and Stats - Compact Premium KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Total Products */}
            <div className="group bg-white p-3 rounded-xl border border-gray-150 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden flex items-center justify-between min-h-[72px]">
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-blue-50/70 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Products</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5 leading-none">{products.length}</p>
                </div>
              </div>
              <div className="relative z-10 shrink-0 text-right">
                <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Units</span>
              </div>
            </div>

            {/* Stock Alerts */}
            <div className="group bg-white p-3 rounded-xl border border-gray-150 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden flex items-center justify-between min-h-[72px]">
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-red-50/70 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Stock Alerts</p>
                  <p className="text-xl font-bold text-red-600 mt-0.5 leading-none">{lowStockItems.length}</p>
                </div>
              </div>
              <div className="relative z-10 shrink-0 text-right">
                <span className="text-[8px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">Replenish</span>
              </div>
            </div>

            {/* Inventory Value */}
            <div className="group bg-white p-3 rounded-xl border border-gray-150 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden flex items-center justify-between min-h-[72px]">
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-green-50/70 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Inventory Value</p>
                  <p className="text-base font-bold text-gray-900 mt-0.5 leading-none">
                    {formatCurrency(products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0), standards.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Efficiency Class */}
            <div className="group bg-white p-3 rounded-xl border border-gray-150 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden flex items-center justify-between min-h-[72px]">
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-indigo-50/70 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Efficiency Class</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5 leading-none uppercase">
                    Class {abcAnalysis.length > 0 ? "A+" : "-"}
                  </p>
                </div>
              </div>
              <div className="relative z-10 shrink-0 text-right">
                <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Optimized</span>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <AdvancedSearch
            onSearch={(term, domainFilters) => {
              setSearchTerm(term || '');
              setActiveDomainFilters(domainFilters);
            }}
            placeholder="Search products by name or SKU..."
            category={category}
            hideSearch={false}
            filters={[
              { key: 'category', label: 'Category', type: 'select', options: categoryOptions },
              { key: 'brand', label: 'Brand', type: 'select', options: brandOptions },
              {
                key: 'stock', label: 'Stock Status', type: 'select', options: [
                  { value: 'low', label: 'Low Stock' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'High Stock' },
                ]
              },
              { key: 'minPrice', label: 'Min Price', type: 'number', placeholder: 'Min' },
              { key: 'maxPrice', label: 'Max Price', type: 'number', placeholder: 'Max' },
            ]}
          />

          {/* Data Table or Busy Grid - Premium Container */}
          <div className="bg-white rounded-[32px] border border-gray-100 p-0 overflow-hidden shadow-sm">
            {viewMode === 'busy' ? (
              <div className="h-[600px]">
                <BusyGrid
                  data={productsToDisplay}
                  columns={gridColumns}
                  category={category}
                  onRowClick={(product) => {
                    setEditingProduct(product);
                    setShowProductFormInternal(true);
                  }}
                  onAddRow={async () => {
                    // One-click quick add for Busy Mode
                    if (onQuickAdd) {
                      await onQuickAdd();
                    } else {
                      await (onAdd ? onAdd() : setShowProductFormInternal(true));
                    }
                  }}
                  className="h-full"
                  onDeleteRow={(product) => setProductToDelete(product)}
                  onAdvancedSettings={(product) => { setSelectedProduct(product); setShowAdvancedFeatures(true); }}
                  onCellEdit={async (product, field, value) => {
                    // [OK] ENHANCED: Preserve batches, add error handling, optimistic updates
                    let processedValue = value;
                    const numericFields = [
                      'stock', 'price', 'cost_price', 'costPrice',
                      'minStock', 'min_stock', 'maxStock', 'max_stock',
                      'reorderPoint', 'reorder_point', 'reorderQuantity', 'reorder_quantity',
                      'mrp', 'taxPercent', 'tax_percent', 'unitcost'
                    ];

                    if (numericFields.includes(field) || field.includes('width') || field.includes('length')) {
                      const n = parseFloat(String(value).replace(/,/g, ''));
                      processedValue = Number.isFinite(n) ? n : 0;
                    }

                    let updatedProduct;
                    try {
                      updatedProduct = structuredClone(product);
                    } catch {
                      updatedProduct = { ...product };
                    }
                    updatedProduct.domain_data = parseProductDomainData(updatedProduct.domain_data);

                    // Handle nested keys (e.g., 'domain_data.article')
                    if (field.includes('.')) {
                      const parts = field.split('.');
                      let current = updatedProduct;
                      for (let i = 0; i < parts.length - 1; i++) {
                        if (!current[parts[i]]) current[parts[i]] = {};
                        current = current[parts[i]];
                      }
                      current[parts[parts.length - 1]] = processedValue;
                    } else {
                      // Check if it's a domain field that should be in domain_data
                      const isDomainField = domainKnowledge?.productFields?.some(f => normalizeKey(f) === field);
                      if (isDomainField) {
                        updatedProduct.domain_data = {
                          ...updatedProduct.domain_data,
                          [field]: processedValue
                        };
                      } else {
                        updatedProduct[field] = processedValue;
                      }
                    }

                    if (field === 'unitcost') {
                      const n = Number(processedValue);
                      if (Number.isFinite(n) && n >= 0) updatedProduct.cost_price = n;
                    }

                    // [OK] CRITICAL: Ensure batches/serials are preserved
                    const originalProduct = products.find(p => p.id === product.id);
                    if (!updatedProduct.batches && originalProduct?.batches) {
                      updatedProduct.batches = originalProduct.batches;
                    }
                    if (!updatedProduct.serial_numbers && !updatedProduct.serialNumbers) {
                      updatedProduct.serial_numbers = originalProduct?.serial_numbers || originalProduct?.serialNumbers || [];
                    }

                    // [OK] Optimistic Update with Rollback
                    const oldProducts = [...products];
                    setProducts(prev => prev.map(p => p.id === product.id ? updatedProduct : p));

                    try {
                      if (onUpdate) {
                        await onUpdate(updatedProduct);
                        toast.success(`Saved ${field}`, { id: 'inventory-busy-save', duration: 2000 });
                      } else {
                        const saveRes = await updateProductAction(updatedProduct.id, businessId, updatedProduct);
                        if (!saveRes?.success) {
                          throw new Error(saveRes?.error || 'Failed to persist update');
                        }
                        if (saveRes.product) {
                          setProducts(prev =>
                            prev.map(p => {
                              if (p.id !== product.id) return p;
                              const srv = saveRes.product;
                              return {
                                ...p,
                                ...srv,
                                batches:
                                  Array.isArray(srv.batches) && srv.batches.length > 0
                                    ? srv.batches
                                    : p.batches || [],
                                serial_numbers:
                                  Array.isArray(srv.serial_numbers) && srv.serial_numbers.length > 0
                                    ? srv.serial_numbers
                                    : p.serial_numbers || p.serialNumbers || [],
                                variants:
                                  Array.isArray(srv.variants) && srv.variants.length > 0
                                    ? srv.variants
                                    : p.variants || [],
                              };
                            })
                          );
                        }
                        toast.success(`Saved ${field}`, { id: 'inventory-busy-save', duration: 2000 });
                      }
                    } catch (error) {
                      // [X] ROLLBACK on failure
                      setProducts(oldProducts);
                      toast.error(
                        `Failed to update ${field}: ${formatInventoryActionError(error)}`,
                        {
                          id: 'inventory-busy-error',
                          duration: 5000,
                        }
                      );
                      console.error('BusyGrid update error:', error);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="p-4">
                <DataTable
                  category={category}
                  data={productsToDisplay}
                  columns={columns}
                  searchable={false}
                  exportable={true}
                  onBulkDelete={handleBulkDelete}
                  onExport={async (items) => {
                    const dataToExport = items || productsToDisplay;
                    try {
                      const result = await productAPI.bulkExport(businessId, {
                        includeBatches: true,
                        includeSerials: true,
                      });

                      const bytes = new Uint8Array(result.buffer || []);
                      const blob = new Blob([bytes], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = result.fileName || `inventory-export-${new Date().toISOString().split('T')[0]}.xlsx`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);

                      if (result.roundTripValid === false) {
                        toast.success(`Exported ${result.recordCount || dataToExport.length} items (with warnings)`);
                      } else {
                        toast.success(`Exported ${result.recordCount || dataToExport.length} items successfully`);
                      }
                    } catch (error) {
                      // Fallback keeps export available if server-side export fails.
                      try {
                        await exportProducts(dataToExport, 'excel');
                        toast.success(`Exported ${dataToExport.length} items (fallback mode)`);
                      } catch {
                        toast.error('Failed to export inventory');
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* ABC Analysis Section - Premium Executive Analytics */}
          <div className="bg-white rounded-2xl border border-gray-150 p-4 sm:p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full -translate-y-24 translate-x-24" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2 relative z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">ABC Inventory Matrix</h3>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Strategic Stock Optimization Engine</p>
              </div>
              <div className="self-start sm:self-center flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-sm">
                <BarChart3 className="w-3 h-3 text-blue-400" />
                Live Distribution
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              {/* Category A Card */}
              <div className="group bg-gradient-to-br from-red-50/10 via-white to-white p-4 rounded-xl border border-red-100/40 hover:shadow-md hover:border-red-200/50 transition-all duration-300 flex flex-col justify-between min-h-[170px]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-red-100/70 flex items-center justify-center font-bold text-lg text-red-600 shadow-sm group-hover:scale-105 transition-transform">A</div>
                    <Badge className="bg-red-500 hover:bg-red-600 text-white border-none font-bold text-[8px] uppercase tracking-wider px-2 py-0.5 h-5">Critical Hub</Badge>
                  </div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider leading-snug">High Value Assets</h4>
                  <p className="text-[10px] text-gray-400 font-medium">Top 80% Cumulative Value</p>
                </div>
                
                <div className="my-3">
                  <div className="flex justify-between text-[9px] font-bold text-red-600/90 mb-1">
                    <span>Value Share</span>
                    <span>{abcStats.A.valPct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-red-100/40 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]" style={{ width: `${Math.max(3, abcStats.A.valPct)}%` }} />
                  </div>
                </div>

                <div className="flex items-end justify-between pt-2 border-t border-gray-100/40">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900 leading-none">{abcStats.A.count}</span>
                    <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">SKUs</span>
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{abcStats.A.pct}% of catalog</span>
                </div>
              </div>

              {/* Category B Card */}
              <div className="group bg-gradient-to-br from-orange-50/10 via-white to-white p-4 rounded-xl border border-orange-100/40 hover:shadow-md hover:border-orange-200/50 transition-all duration-300 flex flex-col justify-between min-h-[170px]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-100/70 flex items-center justify-center font-bold text-lg text-orange-600 shadow-sm group-hover:scale-105 transition-transform">B</div>
                    <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none font-bold text-[8px] uppercase tracking-wider px-2 py-0.5 h-5">Normal Flow</Badge>
                  </div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider leading-snug">Medium Value Assets</h4>
                  <p className="text-[10px] text-gray-400 font-medium">Next 15% Cumulative Value</p>
                </div>
                
                <div className="my-3">
                  <div className="flex justify-between text-[9px] font-bold text-orange-600/90 mb-1">
                    <span>Value Share</span>
                    <span>{abcStats.B.valPct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-orange-100/40 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(249,115,22,0.2)]" style={{ width: `${Math.max(3, abcStats.B.valPct)}%` }} />
                  </div>
                </div>

                <div className="flex items-end justify-between pt-2 border-t border-gray-100/40">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900 leading-none">{abcStats.B.count}</span>
                    <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">SKUs</span>
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{abcStats.B.pct}% of catalog</span>
                </div>
              </div>

              {/* Category C Card */}
              <div className="group bg-gradient-to-br from-green-50/10 via-white to-white p-4 rounded-xl border border-green-100/40 hover:shadow-md hover:border-green-200/50 transition-all duration-300 flex flex-col justify-between min-h-[170px]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100/70 flex items-center justify-center font-bold text-lg text-green-600 shadow-sm group-hover:scale-105 transition-transform">C</div>
                    <Badge className="bg-green-500 hover:bg-green-600 text-white border-none font-bold text-[8px] uppercase tracking-wider px-2 py-0.5 h-5">Bulk Layer</Badge>
                  </div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider leading-snug">Low Value Assets</h4>
                  <p className="text-[10px] text-gray-400 font-medium">Bottom 5% Cumulative Value</p>
                </div>
                
                <div className="my-3">
                  <div className="flex justify-between text-[9px] font-bold text-green-600/90 mb-1">
                    <span>Value Share</span>
                    <span>{abcStats.C.valPct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-green-100/40 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(34,197,94,0.2)]" style={{ width: `${Math.max(3, abcStats.C.valPct)}%` }} />
                  </div>
                </div>

                <div className="flex items-end justify-between pt-2 border-t border-gray-100/40">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900 leading-none">{abcStats.C.count}</span>
                    <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">SKUs</span>
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{abcStats.C.pct}% of catalog</span>
                </div>
              </div>
            </div>
          </div>

        </TabsContent>



        {/* Variants Tab */}
        {isVariantEnabled && (
          <TabsContent value="variants" className="space-y-6">
            {selectedProduct ? (
              <div className="space-y-4">
                {/* Active product breadcrumb + switcher */}
                <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Managing Variants For</p>
                      <p className="text-sm font-bold text-blue-900">{selectedProduct.name}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProduct(null)}
                    className="text-xs border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    Switch Product
                  </Button>
                </div>
                <VariantManager
                  value={selectedProduct.variants || []}
                  onChange={async (variants) => {
                    const updatedProduct = { ...selectedProduct, variants };
                    // Optimistic update
                    setSelectedProduct(updatedProduct);
                    // Persist to server
                    try {
                      await handleUpdateProduct(updatedProduct);
                      onUpdate?.(updatedProduct);
                    } catch (err) {
                      // Rollback on error
                      setSelectedProduct(selectedProduct);
                      console.error('Failed to update variants:', err);
                    }
                  }}
                  product={selectedProduct}
                  category={category}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Select a Product</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Choose a product below to manage its size/color variants</p>
                  </div>
                  <Badge variant="outline" className="bg-gray-50 text-gray-500 font-mono text-xs">
                    {products.length} products
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className="text-left p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate group-hover:text-blue-700">{p.name}</p>
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5">{p.sku || '--'}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 bg-white">
                          {(p.variants || []).length} vars
                        </Badge>
                      </div>
                      {p.category && (
                        <span className="mt-2 inline-block text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {p.category}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {products.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Layers className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-gray-400 text-sm">No products found. Add products first.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        )}

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-5 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="bg-slate-50/70 px-5 py-4 border-b border-slate-100">
                <CardTitle className="text-lg font-extrabold text-slate-900 tracking-tight">Global Price Lists</CardTitle>
                <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Multi-tier pricing architecture</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-3">
                <PriceListManager
                  priceLists={[]}
                  products={products}
                  customers={customers}
                  onSave={(lists) => {
                    toast.success('Price lists updated');
                  }}
                  category={category}
                  currency={standards.currency}
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="bg-slate-50/70 px-5 py-4 border-b border-slate-100">
                <CardTitle className="text-lg font-extrabold text-slate-900 tracking-tight">Discount Schemes</CardTitle>
                <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Promotional logic and campaigns</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-3">
                <DiscountSchemeManager
                  schemes={[]}
                  products={products}
                  customers={customers}
                  onSave={(schemes) => {
                    toast.success('Discount schemes updated');
                  }}
                  category={category}
                  currency={standards.currency}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Locations Tab */}
        {isMultiLocationEnabled && (
          <TabsContent value="locations" className="space-y-6">
            <MultiLocationInventory
              locations={locations}
              products={products}
              domainKnowledge={domainKnowledge}
              businessId={businessId}
              category={category}
              onAdd={onLocationAdd}
              onUpdate={onLocationUpdate}
              onDelete={onLocationDelete}
              onStockTransfer={onStockTransfer}
            />
          </TabsContent>
        )}

        {/* Manufacturing Tab */}
        {isManufacturingEnabled && (
          <TabsContent value="manufacturing" className="space-y-6">
            <ManufacturingModule
              products={products}
              bomList={bomList}
              productionOrders={productionOrders}
              businessId={businessId}
              warehouses={locations}
              onSave={() => {
                toast.success('Production updated');
                refreshData?.();
              }}
              onBOMAdd={() => { }}
              onProductionOrderCreate={() => { }}
            />
          </TabsContent>
        )}

        {/* Orders Tab -- Quotations / Sales Orders / Challans + Stock Reservations */}
        <TabsContent value="orders" className="space-y-6">
          <QuotationOrderChallanManager
            quotations={quotations}
            salesOrders={salesOrders}
            challans={challans}
            customers={customers}
            products={products}
            warehouses={locations}
            refreshData={refreshData}
            category={category}
            onIssueInvoice={onIssueInvoice}
          />

          {/* Stock Reservations */}
          <StockReservation
            reservations={[]}
            products={products}
            customers={customers}
            businessId={businessId}
            currency={standards.currency}
          />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500">
                <Package className="w-24 h-24" />
              </div>
              <div className="flex flex-col relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm shadow-blue-100">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Total SKU Profile</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-black text-gray-900 tracking-tighter">{products.length}</p>
                  <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full italic">Catalog Scope</span>
                </div>
              </div>
            </div>

            <div className="group bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500">
                <TrendingUp className="w-24 h-24" />
              </div>
              <div className="flex flex-col relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm shadow-emerald-100">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Asset Valuation</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-black text-gray-900 tracking-tighter">
                    {formatCurrency(products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0), standards.currency)}
                  </p>
                </div>
              </div>
            </div>

            <div className="group bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500">
                <AlertCircle className="w-24 h-24" />
              </div>
              <div className="flex flex-col relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm shadow-amber-100">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Safety & Risk</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-black text-amber-600 tracking-tighter">
                    {isExpiryEnabled ? expiringCount : lowStockItems.length}
                  </p>
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2.5 py-1 rounded-full italic">
                    {isExpiryEnabled ? 'Expiring' : 'Low Stock'}
                  </span>
                </div>
              </div>
            </div>

            <div className="group bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500">
                <Repeat className="w-24 h-24" />
              </div>
              <div className="flex flex-col relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-wine-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm shadow-wine-100">
                  <Repeat className="w-6 h-6 text-wine-600" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Efficiency Velocity</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-black text-gray-900 tracking-tighter italic">{turnoverRate}x</p>
                  <span className="text-[10px] font-bold text-wine-500 bg-wine-50 px-2.5 py-1 rounded-full italic">MoM Yield</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Stock Aging Analysis</CardTitle>
                <CardDescription>Breakdown of inventory by time in stock</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const now = new Date();
                    const total = products.length || 1;
                    const buckets = [
                      { label: '0-30 Days', max: 30, color: 'bg-green-500', count: 0 },
                      { label: '31-60 Days', max: 60, color: 'bg-blue-500', count: 0 },
                      { label: '61-90 Days', max: 90, color: 'bg-amber-500', count: 0 },
                      { label: '90+ Days', max: Infinity, color: 'bg-red-500', count: 0 },
                    ];
                    products.forEach(p => {
                      const created = p.created_at || p.createdAt;
                      const days = created ? Math.floor((now - new Date(created)) / (1000 * 60 * 60 * 24)) : 999;
                      const bucket = buckets.find(b => days <= b.max) || buckets[buckets.length - 1];
                      bucket.count++;
                    });
                    return buckets.map(b => {
                      const pct = Math.round((b.count / total) * 100);
                      return (
                        <div key={b.label} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-gray-500">{b.label}</span>
                            <span>{pct}% ({b.count})</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${b.color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Top Performing Categories</CardTitle>
                <CardDescription>By revenue contribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCategoryPerformance.map((entry, i) => (
                    <div key={entry.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-xs">
                          {i + 1}
                        </div>
                        <span className="font-bold text-sm text-gray-700">{entry.category}</span>
                      </div>
                      <Badge variant="outline" className="bg-white border-gray-200">
                        {entry.share}% share
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <LowStockAlerts
              businessId={businessId}
              currency={standards.currency}
              maxAlerts={8}
              onReorderClick={(alert) => {
                setActiveTab('reports');
                toast.success(`Review reorder for ${alert?.product_name || 'selected product'}`);
              }}
            />

            <CycleCountManager
              businessId={businessId}
              products={products}
              warehouses={locations}
              currency={standards.currency}
              onCountComplete={() => {
                refreshData?.();
                toast.success('Cycle count completed and inventory refreshed');
              }}
            />
          </div>

          {/* AI Demand Forecasting */}
          <div className="mt-8">
            <DemandForecast
              businessId={businessId}
              products={products}
              invoices={invoices}
              category={category}
              domainKnowledge={domainKnowledge}
            />
          </div>

          {/* Domain-specific reports */}
          {domainKnowledge?.reports && domainKnowledge.reports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Available Reports</CardTitle>
                <CardDescription>Domain-specific reports based on your business category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {domainKnowledge.reports.map((report, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start h-auto py-3"
                      onClick={() => {
                        toast.success(`Generating ${report}...`);
                        // Report generation logic here
                      }}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      <div className="text-left">
                        <div className="font-medium">{report}</div>
                        <div className="text-xs text-gray-500">Click to generate</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Demand / Restock Engine -- inside Reports */}
          <Card className="rounded-[32px] border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-500">
            <CardHeader className="bg-slate-50/50 pb-6 border-b border-gray-50">
              <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Auto-Reorder Engine</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-gray-500 opacity-70">Algorithmic replenishment manager</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              <AutoReorderManager
                products={products}
                vendors={vendors}
                onGeneratePO={(poData) => {
                  const product = products.find(p => p.id === poData.productId);
                  toast.success(`Purchase order generated for ${product?.name || 'product'}`);
                }}
                currency={standards.currency}
              />
            </CardContent>
          </Card>

          <SmartRestockEngine
            products={products}
            invoices={invoices}
            category={category}
            domainKnowledge={domainKnowledge}
            businessId={businessId}
            refreshData={refreshData}
          />
        </TabsContent>
      </Tabs>

      {/* Advanced Features Modal */}
      {showAdvancedFeatures && selectedProduct && (
        <AdvancedInventoryFeatures
          product={selectedProduct}
          domainKnowledge={domainKnowledge}
          onSave={async (data) => {
            const updatedProduct = { ...selectedProduct, ...data };
            try {
              await handleUpdateProduct(updatedProduct);
              onUpdate?.(updatedProduct);
              toast.success('Advanced features updated');
              setShowAdvancedFeatures(false);
              setSelectedProduct(null);
            } catch (err) {
              toast.error('Failed to update advanced features');
              console.error('Advanced features update failed:', err);
            }
          }}
          onClose={() => {
            setShowAdvancedFeatures(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={(barcode) => {
            toast.success(`Scanned: ${barcode}`);
            setShowBarcodeScanner(false);
          }}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

      {/* Batch Manager Dialog */}
      <Dialog open={showBatchManager} onOpenChange={setShowBatchManager}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Management</DialogTitle>
            <DialogDescription>
              Manage product batches, tracking numbers, and expiry dates.
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <BatchManager
              product={selectedProduct}
              businessId={selectedProduct.business_id}
              warehouseId={locations[0]?.id}
              onBatchCreated={async () => {
                toast.success('Batch created successfully');
                // Refresh data to get updated batches
                await refreshData?.();
                setShowBatchManager(false);
              }}
              onClose={() => setShowBatchManager(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Serial Scanner Dialog */}
      <Dialog open={showSerialScanner} onOpenChange={setShowSerialScanner}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Serial Number Management</DialogTitle>
            <DialogDescription>
              Track individual items by their unique serial numbers or IMEI.
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <SerialScanner
              product={selectedProduct}
              businessId={selectedProduct.business_id}
              warehouseId={locations[0]?.id}
              mode="view"
              onSerialScanned={(serial) => {
                toast.success(`Serial scanned: ${serial.serial_number}`);
              }}
              onClose={() => setShowSerialScanner(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Variant Matrix Editor Dialog */}
      <Dialog open={showVariantEditor} onOpenChange={setShowVariantEditor}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Variant Matrix Editor</DialogTitle>
            <DialogDescription>
              Manage product variations across different sizes, colors, and parameters.
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <VariantMatrixEditor
              product={selectedProduct}
              businessId={selectedProduct.business_id}
              onVariantsUpdated={async () => {
                toast.success('Variants updated successfully');
                // Refresh data to get updated variants
                await refreshData?.();
                setShowVariantEditor(false);
              }}
              onClose={() => setShowVariantEditor(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Product Form Modal - Add or Edit */}
      <Dialog open={showProductFormInternal} onOpenChange={(open) => {
        setShowProductFormInternal(open);
        if (!open) setEditingProduct(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            onSave={async (data) => {
              if (editingProduct) {
                await handleUpdateProduct({ ...editingProduct, ...data });
              } else {
                await handleAddProduct(data);
              }
              setShowProductFormInternal(false);
              setEditingProduct(null);
            }}
            onCancel={() => {
              setShowProductFormInternal(false);
              setEditingProduct(null);
            }}
            category={category}
          />
        </DialogContent>
      </Dialog>

      {/* Product Details Viewer */}
      <ProductDetailsDialog
        product={productToView}
        open={!!productToView}
        onClose={() => setProductToView(null)}
        onUpdate={(updatedProduct) => {
          setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
          onUpdate?.(updatedProduct);
        }}
        category={category}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && !isDeleting && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete
              <span className="font-semibold text-gray-900"> {productToDelete?.name} </span>
              and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
              disabled={isDeleting}
              onClick={async (e) => {
                e.preventDefault();
                setIsDeleting(true);
                const id = productToDelete.id;
                try {
                  const res = await deleteProductAction(id, businessId);
                  if (res.success) {
                    setProducts(prev => prev.filter(p => p.id !== id));
                    toast.success('Product deleted');
                    onDelete?.(id);
                    setProductToDelete(null);
                  } else {
                    toast.error(res.error || 'Failed to delete product');
                  }
                } catch (err) {
                  console.error('Delete error:', err);
                  toast.error('Connection error while deleting');
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feature Dialogs definitions are already handled above with Dialog components */}
      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 font-black uppercase tracking-tighter">
              <Trash2 className="w-5 h-5" />
              Confirm Bulk Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 font-medium">
              This will permanently delete <span className="font-bold text-gray-900">{productsToBulkDelete.length} products</span>.
              This action cannot be undone and will remove all associated stock and batch history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="font-bold uppercase text-xs tracking-widest">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-red-600 hover:bg-red-700 font-bold uppercase text-xs tracking-widest">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
      <SmartQuickAddModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onSave={async (data) => {
          await handleAddProduct(data);
          setShowQuickAddModal(false);
        }}
        category={category}
        businessId={businessId}
        currency={currency}
      />

      <ExcelModeModal
        isOpen={showExcelMode}
        onClose={() => setShowExcelMode(false)}
        data={products}
        columns={columns.filter(c => c.id !== 'actions')}
        onSave={handleExcelSave}
        onDeleteRow={async (row) => {
          if (row?.id) {
            await handleDeleteProduct(row.id);
          }
        }}
        category={category}
        businessId={businessId}
        title={`${category.replace(/-/g, ' ').toUpperCase()} - BULK ENTRY`}
      />

      {/* Stock Adjustment Dialog */}
      <Dialog open={showStockAdjustment} onOpenChange={setShowStockAdjustment}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock Adjustment</DialogTitle>
            <DialogDescription>
              Adjust stock levels with reason codes and approval workflow.
            </DialogDescription>
          </DialogHeader>
          <StockAdjustmentManager
            businessId={businessId}
            products={products}
            warehouses={locations}
            onAdjustmentComplete={() => {
              fetchProducts();
              setShowStockAdjustment(false);
              refreshData?.();
            }}
            currency={standards.currency}
          />
        </DialogContent>
      </Dialog>

      {/* Stock Transfer Dialog */}
      <Dialog open={showStockTransferForm} onOpenChange={setShowStockTransferForm}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock Transfer</DialogTitle>
            <DialogDescription>
              Move stock between warehouses with availability validation and reservation safety.
            </DialogDescription>
          </DialogHeader>
          <StockTransferForm
            businessId={businessId}
            onClose={() => setShowStockTransferForm(false)}
            onTransferComplete={() => {
              fetchProducts();
              setShowStockTransferForm(false);
              refreshData?.();
            }}
            products={products}
            warehouses={locations}
          />
        </DialogContent>
      </Dialog>
    </div >
  );
}

export default InventoryManager;

