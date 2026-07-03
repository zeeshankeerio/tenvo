'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  TrendingUp,
  Settings,
  LayoutDashboard,
  AlertCircle,
  Repeat,
  Tag,
  DollarSign,
  Archive,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { DataTable } from './DataTable';
import { getDomainColors } from '@/lib/domainColors';
import { cn } from '@/lib/utils';
import { BusyGrid } from './BusyGrid';
import { normalizeKey, resolveDomainFieldKey, readDomainFieldValue } from '@/lib/utils/domainHelpers';
import { buildInventoryGridColumns, readGridCellValue } from '@/lib/utils/inventoryGridColumns';
import { inventoryRowsDiffer } from '@/lib/utils/inventoryRowDiff';
import { mapExcelRowForSave, prepareCompositeUpsertFromRow } from '@/lib/utils/excelProductPayload';
import { buildNewInventoryRow, getLastRowForDefaults } from '@/lib/utils/inventoryRowDefaults';
import { getInventoryFieldSuggestions } from '@/lib/utils/inventoryFieldSuggestions';
import { mapProductField, preserveRelationalData, processFieldValue } from '@/lib/utils/productFieldMapper';
import { ShortcutsHelp } from './inventory/ShortcutsHelp';
import { AdvancedSearch } from './AdvancedSearch';
import { SmartRestockEngine } from './SmartRestockEngine';
import { DemandForecast } from './DemandForecast';
import { InventoryCommandBar } from './inventory/InventoryCommandBar';
import { InventoryMobileHub } from './inventory/mobile/InventoryMobileHub';
import { ProductCardGrid } from './inventory/ProductCardGrid';
import { getTemplatesForDomain } from '@/lib/data/productTemplates';
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
import { ProductThumbnail } from '@/components/product/ProductThumbnail';
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
  leanProductPayloadForUpdate,
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
import {
  filterMeaningfulBatches,
  filterMeaningfulSerials,
} from '@/lib/utils/inventoryTrackingHelpers';
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
import { getProductsAction, deleteProductAction, createProductAction, updateProductAction, seedBusinessProductsAction, toggleProductActiveAction } from '@/lib/actions/standard/inventory/product';

/** Normalize domain_data before merging, JSON strings must not be object-spread or saves corrupt */
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

/** Same grid row whether keyed by persisted `id` or client-only `_tempId`. */
function rowsMatchInventoryRow(p, row) {
  if (!p || !row) return false;
  if (row.id != null && row.id !== '') {
    return p.id === row.id;
  }
  if (row._tempId) {
    return p._tempId === row._tempId;
  }
  return false;
}

function readInventoryFieldValue(row, field, _domainKnowledge, category) {
  if (!row || !field) return undefined;
  return readGridCellValue(row, field, category);
}

function busyFieldValueUnchanged(prevVal, nextVal) {
  if (prevVal === nextVal) return true;
  if (typeof nextVal === 'number' && Number(prevVal) === nextVal) return true;
  return String(prevVal ?? '') === String(nextVal ?? '');
}

/** Merge server payload without letting `undefined` wipe existing client fields. */
function mergeInventoryServerRow(prev, srv) {
  if (!srv || typeof srv !== 'object') return prev;
  const out = { ...prev };
  for (const [k, v] of Object.entries(srv)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
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
  const { regionalStandards, currency, currencySymbol, regionalPack, business } = useBusiness();
  const standards = regionalStandards || {
    currencySymbol: currencySymbol || '₨',
    currency: currency || 'PKR',
    taxLabel: regionalPack?.taxLabel || 'Sales Tax',
    taxIdLabel: regionalPack?.taxIdLabel || 'NTN',
    countryCode: regionalPack?.countryIso || 'PK',
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
  /** Avoid hydration mismatch: server and client must not render different `Date` / locale strings. */
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setLastSyncedAt(new Date());
    });
  }, []);

  // Sync internal state when prop changes (from parent refresh)
  useEffect(() => {
    const next = deduplicateProducts(initialProducts || []);
    queueMicrotask(() => {
      setProducts(next);
      setLastSyncedAt(new Date());
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
        setLastSyncedAt(new Date());
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

  const refreshInventory = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof refreshData === 'function') {
        await refreshData();
      } else if (businessId) {
        const res = await getProductsAction(businessId);
        if (res.success) {
          setProducts(deduplicateProducts(res.products));
        } else {
          toast.error(res.error || 'Failed to refresh inventory');
          return;
        }
      }
      setLastSyncedAt(new Date());
      toast.success('Inventory refreshed', { duration: 1200 });
    } catch (err) {
      console.error(err);
      toast.error('Refresh failed');
    } finally {
      setLoading(false);
    }
  }, [refreshData, businessId]);

  const hasQuickAddTemplates = useMemo(
    () => getTemplatesForDomain(category).length > 0,
    [category]
  );

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

  /** 
   * Create via composite upsert (unified path for all creates).
   * Always routes through onUpdate/handleSaveProduct when available for consistent ledger.
   */
  const handleCreateProduct = async (productData, opts = {}) => {
    const { closeForm = true, silentToast = false } = opts;
    
    // UNIFIED PATH: Always use composite upsert when onUpdate available
    if (typeof onUpdate === 'function') {
      try {
        setLoading(true);
        const mapped = mapExcelRowForSave({ ...productData, business_id: businessId }, category);
        const payload = prepareCompositeUpsertFromRow(mapped, category, businessId);
        
        // Use composite save path
        await onUpdate(payload);
        
        if (!silentToast) {
          toast.success('Product created successfully');
        }
        if (refreshData) {
          await refreshData();
        }
        onAdd?.(productData);
        if (closeForm) {
          setShowProductFormInternal(false);
          setEditingProduct(null);
        }
      } catch (error) {
        console.error('Create error:', error);
        toast.error(formatInventoryActionError(error));
        throw error;
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Fallback for controlled components without onUpdate (rare)
    await handleAddProduct(productData);
    if (closeForm) {
      setShowProductFormInternal(false);
      setEditingProduct(null);
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
        toast.success('Product archived');
        onDelete?.(id);
      }
    } catch (err) {
      setProducts(old); // Revert on network error
      console.error('Delete error:', err);
      toast.error('Connection error while deleting');
    }
  };

  // Toggle active/inactive without archiving
  const handleToggleActive = async (product) => {
    const newActive = !product.is_active;
    const old = [...products];
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: newActive } : p));
    try {
      const res = await toggleProductActiveAction(product.id, businessId, newActive);
      if (!res.success) {
        setProducts(old);
        toast.error(res.error || 'Failed to update status');
      } else {
        toast.success(newActive ? 'Product activated' : 'Product deactivated');
      }
    } catch (err) {
      setProducts(old);
      console.error('Toggle active error:', err);
      toast.error('Connection error');
    }
  };

  // Excel Import Handler
  const handleExcelImport = async (importPayload) => {
    // ExcelImportModal sends { rows: validatedRows[], file, selectedSheet }
    // File objects cannot cross the server-action boundary, always use the
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
      setShowImportModal(false);
      
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [showStockTransferForm, setShowStockTransferForm] = useState(false);

  /** Per persisted product id: monotonically increasing save generation to drop stale async results. */
  const busyCellSaveGenRef = useRef(new Map());
  /** Busy inline draft rows (_tempId): create at most once per temp id after name is set. */
  const busyDraftCreateRef = useRef(new Set());

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
        const original = products.find((p) => rowsMatchInventoryRow(p, item));
        if (!original) return true; // Should not happen for edits

        return inventoryRowsDiffer(original, mapExcelRowForSave(item, category));
      });

      if (changedItems.length === 0) {
        toast('No changes to save', { id: 'excel-no-changes', duration: 2000 });
        setShowExcelMode(false);
        setLoading(false);
        return;
      }

      toast.loading(`Saving ${changedItems.length} changes...`, { id: 'excel-save' });

      const useCompositeSave = typeof onUpdate === 'function' && businessId;
      const successfulTempIds = new Set();
      let compositeSuccess = false;

      if (useCompositeSave) {
        const bulkItems = changedItems.map((item) => {
          const mapped = mapExcelRowForSave(item, category);
          const isNew = Boolean(mapped._tempId && !mapped.id);
          const original = !isNew ? products.find((p) => rowsMatchInventoryRow(p, mapped)) : null;
          const rowForComposite = isNew
            ? mapped
            : {
                ...mapped,
                batches: filterMeaningfulBatches(original?.batches ?? mapped.batches ?? []),
                serial_numbers: filterMeaningfulSerials(
                  original?.serial_numbers ??
                    original?.serialNumbers ??
                    mapped.serial_numbers ??
                    mapped.serialNumbers ??
                    []
                ),
              };
          const params = prepareCompositeUpsertFromRow(rowForComposite, category, businessId);
          params.productData = isNew
            ? leanProductPayloadForCreate(params.productData)
            : { ...leanProductPayloadForUpdate(params.productData), id: mapped.id };
          return params;
        });

        const bulkRes = await productAPI.bulkUpsertIntegrated(businessId, bulkItems);
        results.created = bulkRes.created ?? 0;
        results.updated = bulkRes.updated ?? 0;
        results.failed = bulkRes.failed?.length ?? 0;
        compositeSuccess = results.created + results.updated > 0;
        changedItems.forEach((item, idx) => {
          if (item._tempId && !bulkRes.failed?.some((f) => f.index === idx)) {
            successfulTempIds.add(item._tempId);
          }
        });
        if (bulkRes.failed?.length) {
          bulkRes.failed.forEach((f) => {
            console.error(`Failed to save row ${f.index + 1} (${f.name}):`, f.error);
          });
        }
      } else {
        const settled = await runWithConcurrency(changedItems, 5, async (item) => {
          const mapped = mapExcelRowForSave(item, category);
          const isNew = Boolean(mapped._tempId && !mapped.id);

          if (isNew) {
            const res = await createProductAction(
              leanProductPayloadForCreate({ ...mapped, business_id: businessId })
            );
            return { mode: 'action', res, item: mapped, isNew };
          }
          const res = await updateProductAction(mapped.id, businessId, leanProductPayloadForUpdate(mapped));
          return { mode: 'action', res, item: mapped, isNew: false };
        });

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
            } else {
              results.failed++;
              console.error(`Failed to save item ${item.name}:`, res.error);
            }
          } else {
            results.failed++;
            console.error('Error saving item:', result.reason);
          }
        }

        setProducts((prev) => {
          let next = prev.filter((p) => !p._tempId || !successfulTempIds.has(p._tempId));
          if (activeUpdates.length > 0) {
            const updateMap = new Map(activeUpdates.map((u) => [u.id, u]));
            next = next.map((p) => updateMap.get(p.id) || p);
          }
          if (newRealItems.length > 0) {
            next = [...next, ...newRealItems];
          }
          const seen = new Set();
          return next.filter((p) => {
            const key = p.id || p._tempId;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
      }

      if (useCompositeSave && compositeSuccess && typeof refreshData === 'function') {
        try {
          await refreshData();
        } catch (e) {
          console.warn('[handleExcelSave] refreshData after composite save:', e);
        }
      } else if (useCompositeSave && compositeSuccess) {
        setProducts((prev) => prev.filter((p) => !p._tempId || !successfulTempIds.has(p._tempId)));
      }

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

      // 2. Active / Inactive status filter
      if (activeDomainFilters.status === 'active' && p.is_active === false) return false;
      if (activeDomainFilters.status === 'inactive' && p.is_active !== false) return false;

      // 3. Local Category Filter
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
    
    const toastId = toast.loading(`Archiving ${toDelete.length} products...`);
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
        toast.success(`Archived ${successCount} product${successCount !== 1 ? 's' : ''}`, { id: toastId });
      } else {
        toast.error(`Archived ${successCount}; ${failed} failed`, { id: toastId });
      }
    } catch (err) {
      console.error('Parallel bulk archive failed:', err);
      toast.error('Failed to complete bulk archive', { id: toastId });
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

  const countryIso = regionalPack?.countryIso || standards.countryCode || 'PK';

  const getFieldSuggestions = useCallback(
    (accessorKey, row) =>
      getInventoryFieldSuggestions(accessorKey, {
        category,
        countryIso,
        products,
        row,
      }),
    [category, countryIso, products]
  );

  const handleUpdateProduct = async (productData, opts = {}) => {
    const { closeForm = true } = opts;
    const old = [...products];
    try {
      if (onUpdate) {
        // Use composite upsert for updates (unified path)
        const mapped = mapExcelRowForSave({ ...productData, business_id: businessId }, category);
        const original = products.find((p) => p.id === productData.id);
        
        // Build composite params with relational data preservation
        const params = prepareCompositeUpsertFromRow(
          {
            ...mapped,
            id: productData.id,
            batches: filterMeaningfulBatches(mapped.batches ?? original?.batches ?? []),
            serial_numbers: filterMeaningfulSerials(
              mapped.serial_numbers ??
                mapped.serialNumbers ??
                original?.serial_numbers ??
                original?.serialNumbers ??
                []
            ),
          },
          category,
          businessId
        );
        
        params.productData.id = productData.id;
        params.isUpdate = true;
        params.productId = productData.id;
        
        await onUpdate(params);
        
        if (closeForm) {
          setShowProductFormInternal(false);
          setEditingProduct(null);
        }
        return;
      }
      
      // Fallback for controlled components without onUpdate
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

    const handleOpenExcelMode = () => {
      setActiveTab('products');
      setShowExcelMode(true);
    };

    window.addEventListener('inventory-focus-low-stock', handleInventoryFocusLowStock);
    window.addEventListener('inventory-open-excel-mode', handleOpenExcelMode);

    return () => {
      window.removeEventListener('toggle-filters', handleToggleFilters);
      window.removeEventListener('export-data', handleExportGlobal);
      window.removeEventListener('inventory-focus-low-stock', handleInventoryFocusLowStock);
      window.removeEventListener('inventory-open-excel-mode', handleOpenExcelMode);
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
    const actionsCol = {
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
              <DropdownMenuItem
                onClick={() => handleToggleActive(row.original)}
                className="text-sm"
              >
                {row.original.is_active === false ? (
                  <><CheckCircle2 className="mr-2 h-3.5 w-3.5 text-green-600" /> Activate</>
                ) : (
                  <><XCircle className="mr-2 h-3.5 w-3.5 text-amber-600" /> Deactivate</>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setProductToDelete(row.original)} className="text-red-600 focus:text-red-600 focus:bg-red-50 text-sm">
                <Archive className="mr-2 h-3.5 w-3.5" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
    };

    const visualCellById = {
      name: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex min-w-0 flex-col gap-0 py-0 leading-tight">
            <div className="flex items-center gap-1.5 min-w-0">
              <ProductThumbnail
                product={p}
                businessCategory={business?.category}
                size="sm"
                className="flex-shrink-0 border border-gray-100"
              />
              <div className="min-w-0 flex-1">
                <span className="line-clamp-1 text-xs font-semibold leading-tight text-gray-900">{p.name}</span>
                {p.brand && (
                  <span className="mt-0.5 line-clamp-1 text-[10px] text-gray-500">{p.brand}</span>
                )}
              </div>
            </div>
            {p.is_active === false && (
              <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                Inactive
              </span>
            )}
          </div>
        );
      },
      sku: ({ row }) => <span className="font-mono text-[11px] text-gray-700">{row.original.sku || '-'}</span>,
      category: ({ row }) => (
        <span className="block max-w-full truncate whitespace-nowrap rounded border border-gray-200 bg-gray-50 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wide text-gray-700">
          {row.original.category}
        </span>
      ),
      stock: ({ row }) => {
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
              <span className="inline-flex shrink-0 items-center rounded border border-amber-200 bg-amber-50 px-1 py-0 text-[10px] font-bold uppercase leading-none text-amber-700">
                Low
              </span>
            )}
          </div>
        );
      },
      price: ({ row }) => (
        <div className="text-right font-semibold text-sm text-gray-900 tabular-nums pr-2">
          {formatCurrency(row.original.price || 0, standards.currency)}
        </div>
      ),
      tax_percent: ({ row }) => (
        <div className="text-right text-xs font-medium text-gray-500 pr-2">
          {row.original.tax_percent ?? row.original.taxPercent ?? 17}%
        </div>
      ),
      value: ({ row }) => (
        <div className="text-right text-sm text-gray-500 font-medium italic tabular-nums pr-2 bg-gray-50/50 h-full flex items-center justify-end w-full">
          {formatCurrency((row.original.price || 0) * (row.original.stock || 0), standards.currency)}
        </div>
      ),
      batch_number: ({ row }) => {
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
      },
      serials: ({ row }) => {
        const serials = row.original.serial_numbers || [];
        if (serials.length > 0) {
          return (
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-[10px]">
              {serials.length} Items
            </Badge>
          );
        }
        return <span className="text-gray-300">-</span>;
      },
      mfg_date: ({ row }) => (
        <span className="text-xs text-gray-500">
          {row.original.manufacturing_date ? new Date(row.original.manufacturing_date).toLocaleDateString('en-GB') : '-'}
        </span>
      ),
      expiry_date: ({ row }) => {
        const expiry = row.original.expiry_date;
        if (!expiry) return <span className="text-gray-300">-</span>;
        const now = new Date();
        const horizonMs = now.getTime() + 30 * 24 * 60 * 60 * 1000;
        const isExpired = new Date(expiry) < now;
        const isExpiringSoon = new Date(expiry).getTime() < horizonMs;
        return (
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded',
            isExpired ? 'bg-red-50 text-red-600 border border-red-100' :
              isExpiringSoon ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                'text-gray-600'
          )}>
            {new Date(expiry).toLocaleDateString('en-GB')}
          </span>
        );
      },
    };

    const headerOverrides = {
      batch_number: getDomainBatchLabel(category),
      serials: getDomainSerialLabel(category),
      stock: () => <div className="text-right font-semibold">STOCK</div>,
      price: () => <div className="text-right font-semibold">PRICE</div>,
      tax_percent: () => <div className="text-right font-semibold">TAX %</div>,
      value: () => <div className="text-right font-semibold">VALUE</div>,
    };

    const sharedCols = buildInventoryGridColumns(category, {
      mode: 'visual',
      currencySymbol: standards.currencySymbol,
      business,
    });

    const dataCols = sharedCols.map((col) => {
      const out = { ...col, readOnly: col.readOnly ?? (col.id === 'value' || col.id === 'serials') };
      if (headerOverrides[col.id]) out.header = headerOverrides[col.id];
      if (visualCellById[col.id]) out.cell = visualCellById[col.id];
      if (col.id?.startsWith('domain_')) {
        const attrKey = col.accessorKey?.replace('domain_data.', '') || col.id.replace('domain_', '');
        out.cell = ({ row }) => {
          const val = readDomainFieldValue(row.original.domain_data, attrKey, category) ?? '-';
          return <span className="text-xs text-gray-600 line-clamp-1">{String(val)}</span>;
        };
      }
      return out;
    });

    return [actionsCol, ...dataCols];
  }, [domainKnowledge, isExpiryEnabled, isBatchEnabled, isManufacturingEnabled, isSerialEnabled, isVariantEnabled, category, standards.currency, standards.currencySymbol, business?.category]);

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
    const statusCol = {
      id: 'status_dot',
      header: '',
      accessorKey: 'is_active',
      size: 28,
      minSize: 28,
      readOnly: true,
      cell: ({ row }) => (
        <div className="flex items-center justify-center h-full">
          <span
            className={cn('w-2 h-2 rounded-full', row.original.is_active === false ? 'bg-amber-400' : 'bg-green-500')}
            title={row.original.is_active === false ? 'Inactive' : 'Active'}
          />
        </div>
      ),
    };
    const dataCols = buildInventoryGridColumns(category, {
      mode: 'busy',
      currencySymbol: standards.currencySymbol,
      business,
    });
    return [
      statusCol,
      pinnedActions,
      ...dataCols,
    ].filter(Boolean);
  }, [category, columns, standards.currencySymbol]);



  return (
    <div className="space-y-4">
      <div className="hidden lg:block">
        <InventoryCommandBar
          activeTab={activeTab}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          lastSyncedAt={lastSyncedAt}
          isRefreshing={loading}
          onRefresh={refreshInventory}
          onAiSmartAdd={() => setShowQuickAddModal(true)}
          onOpenTemplates={() => setShowTemplatesModal(true)}
          hasQuickAddTemplates={hasQuickAddTemplates}
          onExcelMode={() => setShowExcelMode(true)}
          onImport={() => setShowImportModal(true)}
          onExport={executeExcelExport}
          onScanBarcode={() => setShowBarcodeScanner(true)}
          onAdjustStock={() => setShowStockAdjustment(true)}
          onTransferStock={() => setShowStockTransferForm(true)}
          onShowShortcuts={() => setShowShortcutsHelp(true)}
          onGoToReports={() => setActiveTab('reports')}
        />
      </div>

      <InventoryMobileHub
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lastSyncedAt={lastSyncedAt}
        isRefreshing={loading}
        onRefresh={refreshInventory}
        onAiSmartAdd={() => setShowQuickAddModal(true)}
        onOpenTemplates={() => setShowTemplatesModal(true)}
        hasQuickAddTemplates={hasQuickAddTemplates}
        onExcelMode={() => setShowExcelMode(true)}
        onImport={() => setShowImportModal(true)}
        onExport={executeExcelExport}
        onScanBarcode={() => setShowBarcodeScanner(true)}
        onAdjustStock={() => setShowStockAdjustment(true)}
        onTransferStock={() => setShowStockTransferForm(true)}
        onShowShortcuts={() => setShowShortcutsHelp(true)}
        onGoToReports={() => setActiveTab('reports')}
        isMultiLocationEnabled={isMultiLocationEnabled}
        isManufacturingEnabled={isManufacturingEnabled}
        isVariantEnabled={isVariantEnabled}
        stats={{
          totalProducts: products.length,
          lowStock: lowStockItems.length,
          inventoryValue: formatCurrency(
            products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0),
            standards.currency
          ),
          efficiencyClass:
            abcAnalysis.length > 0
              ? `Class ${abcStats.A.count >= abcStats.B.count && abcStats.A.count >= abcStats.C.count ? 'A' : abcStats.B.count >= abcStats.C.count ? 'B' : 'C'}`
              : 'N/A',
        }}
      />

      {/* Feature Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-transparent">
        <TabsList className="hidden lg:flex h-auto w-full flex-wrap gap-0.5 rounded-lg border border-gray-200 bg-gray-100/60 p-0.5 shadow-inner">
          <TabsTrigger value="products" className="h-8 rounded-md px-3 text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Package className="w-4 h-4 mr-2" />
            Products
          </TabsTrigger>
          {isMultiLocationEnabled && (
            <TabsTrigger value="locations" className="h-8 rounded-md px-3 text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Warehouse className="w-4 h-4 mr-2" />
              Locations
            </TabsTrigger>
          )}
          {isManufacturingEnabled && (
            <TabsTrigger value="manufacturing" className="h-8 rounded-md px-3 text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Factory className="w-4 h-4 mr-2" />
              Manufacturing
            </TabsTrigger>
          )}
          <TabsTrigger value="orders" className="h-8 rounded-md px-3 text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileText className="w-4 h-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="reports" className="h-8 rounded-md px-3 text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            Reports
          </TabsTrigger>
          {isVariantEnabled && (
            <TabsTrigger value="variants" className="h-8 rounded-md px-3 text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Layers className="w-4 h-4 mr-2" />
              Variants
            </TabsTrigger>
          )}
          <TabsTrigger value="pricing" className="h-8 rounded-md px-3 text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Tag className="w-4 h-4 mr-2" />
            Pricing
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">

          {/* Alerts and Stats - Compact Premium KPI Cards */}
          {/* KPI cards, desktop only (mobile hub shows mini KPIs) */}
          <div className="hidden lg:grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Total Products */}
            <div className="group bg-white p-3 rounded-xl border border-gray-150 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden flex items-center justify-between min-h-[72px]">
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-blue-50/70 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Products</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5 leading-none">{products.length}</p>
                </div>
              </div>
              <div className="relative z-10 shrink-0 text-right">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Units</span>
              </div>
            </div>

            {/* Stock Alerts */}
            <div className="group bg-white p-3 rounded-xl border border-gray-150 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden flex items-center justify-between min-h-[72px]">
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-red-50/70 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stock Alerts</p>
                  <p className="text-xl font-bold text-red-600 mt-0.5 leading-none">{lowStockItems.length}</p>
                </div>
              </div>
              <div className="relative z-10 shrink-0 text-right">
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">Replenish</span>
              </div>
            </div>

            {/* Inventory Value */}
            <div className="group bg-white p-3 rounded-xl border border-gray-150 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden flex items-center justify-between min-h-[72px]">
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-green-50/70 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Inventory Value</p>
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
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Efficiency Class</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5 leading-none uppercase">
                    {abcAnalysis.length > 0
                      ? `Class ${abcStats.A.count >= abcStats.B.count && abcStats.A.count >= abcStats.C.count ? 'A' : abcStats.B.count >= abcStats.C.count ? 'B' : 'C'}`
                      : 'Class, '}
                  </p>
                </div>
              </div>
              <div className="relative z-10 shrink-0 text-right">
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Optimized</span>
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
              {
                key: 'status', label: 'Status', type: 'select', options: [
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]
              },
              { key: 'minPrice', label: 'Min Price', type: 'number', placeholder: 'Min' },
              { key: 'maxPrice', label: 'Max Price', type: 'number', placeholder: 'Max' },
            ]}
          />

          {/* Data Table or Busy Grid - Premium Container */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:rounded-[32px]">
            {/* Mobile: card grid (Busy mode not suited for small screens) */}
            <div className="p-3 lg:hidden">
              <ProductCardGrid
                products={productsToDisplay}
                currencySymbol={standards.currencySymbol}
                businessCategory={business?.category}
                onView={(p) => setProductToView(p)}
                onEdit={(p) => { setEditingProduct(p); setShowProductFormInternal(true); }}
                onDelete={(p) => setProductToDelete(p)}
                onToggleActive={handleToggleActive}
                onAdd={() => onAdd ? onAdd() : setShowProductFormInternal(true)}
              />
            </div>

            {/* Desktop: view mode switcher */}
            <div className="hidden lg:block">
            {viewMode === 'busy' ? (
              <div style={{ height: 'calc(100vh - 22rem)' }} className="min-h-[400px]">
                <BusyGrid
                  variant="busy"
                  data={productsToDisplay}
                  columns={gridColumns}
                  category={category}
                  getFieldSuggestions={getFieldSuggestions}
                  onRowClick={(product) => {
                    setEditingProduct(product);
                    setShowProductFormInternal(true);
                  }}
                  onAddRow={async () => {
                    const previousRow = getLastRowForDefaults(productsToDisplay);
                    const newRow = buildNewInventoryRow(category, businessId, previousRow, { countryIso });
                    setProducts((prev) => [...prev, newRow]);
                  }}
                  className="h-full"
                  onDeleteRow={(product) => setProductToDelete(product)}
                  onAdvancedSettings={(product) => { setSelectedProduct(product); setShowAdvancedFeatures(true); }}
                  onCellEdit={async (product, field, value) => {
                    const scalarKey = field.includes('.') ? field.split('.').pop() : field;
                    const processedValue = processFieldValue(scalarKey, value);

                    const prevFieldVal = readInventoryFieldValue(product, field, domainKnowledge, category);
                    if (busyFieldValueUnchanged(prevFieldVal, processedValue)) {
                      return;
                    }

                    let updatedProduct = mapProductField(
                      { ...product, domain_data: parseProductDomainData(product.domain_data) },
                      field,
                      value,
                      domainKnowledge
                    );

                    if (field === 'unitcost' || field === 'domain_data.unitcost') {
                      const n = Number(processedValue);
                      if (Number.isFinite(n) && n >= 0) updatedProduct.cost_price = n;
                    }
                    if (field === 'domain_data.vehiclemake') {
                      updatedProduct.brand = processedValue;
                    }

                    const originalProduct = products.find((p) => rowsMatchInventoryRow(p, product));
                    updatedProduct = preserveRelationalData(updatedProduct, originalProduct);

                    const meaningfulBatches = isBatchTrackingEnabled(category)
                      ? filterMeaningfulBatches(originalProduct?.batches || updatedProduct.batches || [])
                      : [];
                    const meaningfulSerials = isSerialTrackingEnabled(category)
                      ? filterMeaningfulSerials(
                          originalProduct?.serial_numbers ||
                            originalProduct?.serialNumbers ||
                            updatedProduct.serial_numbers ||
                            updatedProduct.serialNumbers ||
                            []
                        )
                      : [];
                    updatedProduct.batches = meaningfulBatches;
                    updatedProduct.serial_numbers = meaningfulSerials;

                    // Draft rows (no persisted id): local state; persist via composite once name is set
                    if (!updatedProduct?.id) {
                      setProducts((prev) =>
                        prev.map((p) => (rowsMatchInventoryRow(p, product) ? updatedProduct : p))
                      );
                      const tempKey = updatedProduct._tempId != null ? String(updatedProduct._tempId) : '';
                      const trimmedName = String(updatedProduct.name || '').trim();
                      if (
                        tempKey &&
                        trimmedName &&
                        typeof onUpdate === 'function' &&
                        !busyDraftCreateRef.current.has(tempKey)
                      ) {
                        busyDraftCreateRef.current.add(tempKey);
                        try {
                          await handleCreateProduct(
                            { ...updatedProduct, business_id: businessId },
                            { closeForm: false, silentToast: true }
                          );
                          setProducts((prev) => prev.filter((p) => p._tempId !== updatedProduct._tempId));
                        } catch (createErr) {
                          busyDraftCreateRef.current.delete(tempKey);
                          console.error('Busy draft create failed:', createErr);
                        }
                      }
                      if (typeof window !== 'undefined' && tempKey) {
                        window.dispatchEvent(
                          new CustomEvent('tenvo:inventory-busy-cell-saved', { detail: { rowKey: tempKey, field } })
                        );
                      }
                      return;
                    }

                    const saveKey = String(updatedProduct.id);
                    const gen = (busyCellSaveGenRef.current.get(saveKey) || 0) + 1;
                    busyCellSaveGenRef.current.set(saveKey, gen);

                    // [OK] Optimistic Update with Rollback
                    const oldProducts = [...products];
                    setProducts((prev) =>
                      prev.map((p) => (rowsMatchInventoryRow(p, product) ? updatedProduct : p))
                    );

                    try {
                      if (onUpdate) {
                        const mappedForSave = mapExcelRowForSave(updatedProduct, category);
                        await onUpdate({
                          ...leanProductPayloadForUpdate(mappedForSave),
                          id: updatedProduct.id,
                          business_id: businessId,
                          batches:
                            meaningfulBatches.length > 0
                              ? meaningfulBatches
                              : filterMeaningfulBatches(mappedForSave.batches ?? originalProduct?.batches ?? []),
                          serial_numbers:
                            meaningfulSerials.length > 0
                              ? meaningfulSerials
                              : filterMeaningfulSerials(
                                  mappedForSave.serial_numbers ??
                                    mappedForSave.serialNumbers ??
                                    originalProduct?.serial_numbers ??
                                    originalProduct?.serialNumbers ??
                                    []
                                ),
                        });
                        if (busyCellSaveGenRef.current.get(saveKey) !== gen) return;
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(
                            new CustomEvent('tenvo:inventory-busy-cell-saved', { detail: { rowKey: saveKey, field } })
                          );
                        }
                      } else {
                        const saveRes = await updateProductAction(updatedProduct.id, businessId, updatedProduct);
                        if (busyCellSaveGenRef.current.get(saveKey) !== gen) return;
                        if (!saveRes?.success) {
                          throw new Error(saveRes?.error || 'Failed to persist update');
                        }
                        if (saveRes.product) {
                          setProducts((prev) =>
                            prev.map((p) => {
                              if (!rowsMatchInventoryRow(p, product)) return p;
                              const srv = saveRes.product;
                              const merged = mergeInventoryServerRow(p, srv);
                              const next = {
                                ...merged,
                                batches:
                                  meaningfulBatches.length > 0
                                    ? meaningfulBatches
                                    : Array.isArray(srv.batches) && srv.batches.length > 0
                                      ? srv.batches
                                      : p.batches || [],
                                serial_numbers:
                                  meaningfulSerials.length > 0
                                    ? meaningfulSerials
                                    : Array.isArray(srv.serial_numbers) && srv.serial_numbers.length > 0
                                      ? srv.serial_numbers
                                      : p.serial_numbers || p.serialNumbers || [],
                                variants:
                                  Array.isArray(srv.variants) && srv.variants.length > 0
                                    ? srv.variants
                                    : p.variants || [],
                              };
                              if (field === 'stock') {
                                next.stock = processedValue;
                              }
                              return next;
                            })
                          );
                        }
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(
                            new CustomEvent('tenvo:inventory-busy-cell-saved', { detail: { rowKey: saveKey, field } })
                          );
                        }
                      }
                    } catch (error) {
                      // [X] ROLLBACK on failure
                      if (busyCellSaveGenRef.current.get(saveKey) === gen) {
                        setProducts(oldProducts);
                      }
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
            ) : viewMode === 'cards' ? (
              <div className="p-4">
                <ProductCardGrid
                  products={productsToDisplay}
                  currencySymbol={standards.currencySymbol}
                  businessCategory={business?.category}
                  onView={(p) => setProductToView(p)}
                  onEdit={(p) => { setEditingProduct(p); setShowProductFormInternal(true); }}
                  onDelete={(p) => setProductToDelete(p)}
                  onToggleActive={handleToggleActive}
                  onAdd={() => onAdd ? onAdd() : setShowProductFormInternal(true)}
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
          </div>

          {/* ABC Analysis Section - desktop only */}
          <div className="relative hidden overflow-hidden rounded-2xl border border-gray-150 bg-white p-4 shadow-sm lg:block sm:p-5">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full -translate-y-24 translate-x-24" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2 relative z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">ABC Inventory Matrix</h3>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Strategic Stock Optimization Engine</p>
              </div>
              <div className="self-start sm:self-center flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
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
                    <Badge className="bg-red-500 hover:bg-red-600 text-white border-none font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 h-5">Critical Hub</Badge>
                  </div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider leading-snug">High Value Assets</h4>
                  <p className="text-[10px] text-gray-400 font-medium">Top 80% Cumulative Value</p>
                </div>
                
                <div className="my-3">
                  <div className="flex justify-between text-[10px] font-bold text-red-600/90 mb-1">
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
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">SKUs</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{abcStats.A.pct}% of catalog</span>
                </div>
              </div>

              {/* Category B Card */}
              <div className="group bg-gradient-to-br from-orange-50/10 via-white to-white p-4 rounded-xl border border-orange-100/40 hover:shadow-md hover:border-orange-200/50 transition-all duration-300 flex flex-col justify-between min-h-[170px]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-100/70 flex items-center justify-center font-bold text-lg text-orange-600 shadow-sm group-hover:scale-105 transition-transform">B</div>
                    <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 h-5">Normal Flow</Badge>
                  </div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider leading-snug">Medium Value Assets</h4>
                  <p className="text-[10px] text-gray-400 font-medium">Next 15% Cumulative Value</p>
                </div>
                
                <div className="my-3">
                  <div className="flex justify-between text-[10px] font-bold text-orange-600/90 mb-1">
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
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">SKUs</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{abcStats.B.pct}% of catalog</span>
                </div>
              </div>

              {/* Category C Card */}
              <div className="group bg-gradient-to-br from-green-50/10 via-white to-white p-4 rounded-xl border border-green-100/40 hover:shadow-md hover:border-green-200/50 transition-all duration-300 flex flex-col justify-between min-h-[170px]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100/70 flex items-center justify-center font-bold text-lg text-green-600 shadow-sm group-hover:scale-105 transition-transform">C</div>
                    <Badge className="bg-green-500 hover:bg-green-600 text-white border-none font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 h-5">Bulk Layer</Badge>
                  </div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider leading-snug">Low Value Assets</h4>
                  <p className="text-[10px] text-gray-400 font-medium">Bottom 5% Cumulative Value</p>
                </div>
                
                <div className="my-3">
                  <div className="flex justify-between text-[10px] font-bold text-green-600/90 mb-1">
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
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">SKUs</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{abcStats.C.pct}% of catalog</span>
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
                      <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest">Managing Variants For</p>
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
                <VariantMatrixEditor
                  product={selectedProduct}
                  businessId={selectedProduct.business_id || business?.id}
                  onVariantsUpdated={async () => {
                    await refreshData?.();
                  }}
                  onClose={() => setSelectedProduct(null)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Select a Product</h3>
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
            <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
                <CardTitle className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">Global Price Lists</CardTitle>
                <CardDescription className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px] sm:tracking-[0.16em]">Multi-tier pricing architecture</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 sm:pt-3">
                <PriceListManager
                  embedInCard
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

            <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
                <CardTitle className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">Discount Schemes</CardTitle>
                <CardDescription className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px] sm:tracking-[0.16em]">Promotional logic and campaigns</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 sm:pt-3">
                <DiscountSchemeManager
                  embedInCard
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
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em]">Total SKU Profile</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-semibold text-gray-900 tracking-tighter">{products.length}</p>
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
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em]">Asset Valuation</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-semibold text-gray-900 tracking-tighter">
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
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em]">Safety & Risk</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-semibold text-amber-600 tracking-tighter">
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
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em]">Efficiency Velocity</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-semibold text-gray-900 tracking-tighter italic">{turnoverRate}x</p>
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
              <CardTitle className="text-xl font-semibold text-gray-900 tracking-tight">Auto-Reorder Engine</CardTitle>
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
            vendors={vendors}
            locations={locations}
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
              await handleUpdateProduct(updatedProduct, { closeForm: false });
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
                await handleUpdateProduct({ ...editingProduct, ...data }, { closeForm: true });
              } else {
                await handleCreateProduct(data, { closeForm: true });
              }
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
            <AlertDialogTitle>Archive Product?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-gray-900">{productToDelete?.name}</span> will be archived and
              hidden from your inventory. All historical records (sales, purchases, batches) are preserved.
              You can restore it later from archived products.
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
                    toast.success('Product archived');
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
                  Archiving...
                </>
              ) : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feature Dialogs definitions are already handled above with Dialog components */}
      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 font-semibold uppercase tracking-tighter">
              <Archive className="w-5 h-5" />
              Confirm bulk archive
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 font-medium">
              This will archive <span className="font-bold text-gray-900">{productsToBulkDelete.length} products</span>.
              They will be hidden from active inventory; sales and purchase history stay intact. You can restore archived items later where your workflow supports it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="font-bold uppercase text-xs tracking-widest">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-red-600 hover:bg-red-700 font-bold uppercase text-xs tracking-widest">
              Archive all
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
          await handleCreateProduct(data, { closeForm: false });
          setShowQuickAddModal(false);
        }}
        category={category}
        businessId={businessId}
        currency={currency}
      />

      <ExcelImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        hideTrigger
        onImport={handleExcelImport}
        existingProducts={products}
      />

      {hasQuickAddTemplates && (
        <QuickAddTemplates
          domain={category}
          currency={currency}
          onAddProduct={handleCreateProduct}
          open={showTemplatesModal}
          onOpenChange={setShowTemplatesModal}
          hideTrigger
        />
      )}

      <ExcelModeModal
        isOpen={showExcelMode}
        onClose={() => setShowExcelMode(false)}
        data={products}
        columns={columns.filter(c => c.id !== 'actions')}
        onSave={handleExcelSave}
        getFieldSuggestions={getFieldSuggestions}
        onAddRow={(previousRow) =>
          buildNewInventoryRow(
            category,
            businessId,
            previousRow || getLastRowForDefaults(products),
            { countryIso }
          )
        }
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

