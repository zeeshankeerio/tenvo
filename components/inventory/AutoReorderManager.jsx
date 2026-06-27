'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Package, AlertTriangle, CheckCircle2, ShoppingCart, TrendingDown, Boxes, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import { InventoryErrorCard } from './InventoryErrorBoundary';

/**
 * AutoReorderManager Component
 * Automatically generates purchase orders based on reorder points
 * 
 * @param {Object} props
 * @param {any[]} [props.products] - Array of products
 * @param {any[]} [props.vendors] - Array of vendors
 * @param {(poData: any) => void} [props.onGeneratePO] - Callback to generate purchase order
 * @param {string} [props.currency] - Currency code
 */
export function AutoReorderManager({
  products = [],
  vendors = [],
  onGeneratePO,
  currency = 'PKR',
}) {
  const [reorderSuggestions, setReorderSuggestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Calculate reorder suggestions
  const calculateSuggestions = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      
      const toNumber = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
      };

    const suggestions = products
      .map((product) => {
        const stock = toNumber(product.stock);
        const reorderPoint = toNumber(product.reorder_point ?? product.reorderPoint);
        const minStock = toNumber(product.min_stock ?? product.minStock);
        const maxStock = toNumber(product.max_stock ?? product.maxStock);
        const reorderQuantity = toNumber(product.reorder_quantity ?? product.reorderQuantity);

        // Only suggest items that have at least one configured stock threshold.
        const effectiveReorderPoint = reorderPoint > 0 ? reorderPoint : (minStock > 0 ? minStock : null);
        if (effectiveReorderPoint === null) {
          return null;
        }

        // Not low stock yet.
        if (stock > effectiveReorderPoint) {
          return null;
        }

        // Target stock: prefer maxStock if configured and above the reorder point.
        const targetStock = maxStock > effectiveReorderPoint ? maxStock : effectiveReorderPoint;
        const computedQty = Math.max(1, targetStock - stock);
        const suggestedQty = reorderQuantity > 0 ? Math.max(reorderQuantity, computedQty) : computedQty;

        const stockPercentage = (stock / effectiveReorderPoint) * 100;
        let urgency = 'low';
        if (stock <= 0 || stockPercentage <= 25) urgency = 'critical';
        else if (stockPercentage <= 50) urgency = 'high';
        else if (stockPercentage <= 75) urgency = 'medium';

        const costPrice = toNumber(product.cost_price ?? product.costPrice);

        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          currentStock: stock,
          reorderPoint: effectiveReorderPoint,
          minStock,
          maxStock,
          suggestedQuantity: suggestedQty,
          urgency,
          leadTime: toNumber(product.lead_time ?? product.leadTime) || 7,
          vendorId: product.vendor_id || product.vendorId || null,
          costPrice,
          estimatedCost: costPrice * suggestedQty,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Sort by urgency
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });

    setReorderSuggestions(suggestions);
    } catch (err) {
      console.error('[AutoReorderManager] Calculation error:', err);
      setError(err.message || 'Failed to calculate reorder suggestions');
    } finally {
      setLoading(false);
    }
  }, [products]);

  useEffect(() => {
    calculateSuggestions();
  }, [calculateSuggestions]);

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const criticalCount = reorderSuggestions.filter(s => s.urgency === 'critical').length;
  const totalEstimatedCost = reorderSuggestions.reduce((sum, s) => sum + s.estimatedCost, 0);

  // Handle generate PO error
  const handleGeneratePO = async (suggestion) => {
    setIsProcessing(true);
    try {
      if (onGeneratePO) {
        await onGeneratePO({
          productId: suggestion.productId,
          quantity: suggestion.suggestedQuantity,
          vendorId: suggestion.vendorId,
          estimatedCost: suggestion.estimatedCost,
        });
      }
      // Remove from suggestions after PO is generated
      setReorderSuggestions(prev => prev.filter(s => s.productId !== suggestion.productId));
    } catch (err) {
      console.error('Error generating PO:', err);
      setError(err.message || 'Failed to generate purchase order');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateAllPOs = async () => {
    const { default: toast } = await import('react-hot-toast');
    const confirmed = await new Promise((resolve) => {
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-sm">Generate {reorderSuggestions.length} purchase order{reorderSuggestions.length !== 1 ? 's' : ''}?</p>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
                onClick={() => { toast.dismiss(t.id); resolve(true); }}
              >Confirm</button>
              <button
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200"
                onClick={() => { toast.dismiss(t.id); resolve(false); }}
              >Cancel</button>
            </div>
          </div>
        ),
        { duration: Infinity }
      );
    });
    if (!confirmed) return;

    setIsProcessing(true);
    setError(null);
    try {
      for (const suggestion of reorderSuggestions) {
        if (onGeneratePO) {
          await onGeneratePO({
            productId: suggestion.productId,
            quantity: suggestion.suggestedQuantity,
            vendorId: suggestion.vendorId,
            estimatedCost: suggestion.estimatedCost,
          });
        }
      }
      setReorderSuggestions([]);
    } catch (err) {
      console.error('Error generating POs:', err);
      setError(err.message || 'Failed to generate some purchase orders');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Error Display */}
      {error && (
        <InventoryErrorCard 
          error={error} 
          onRetry={() => {
            setError(null);
            calculateSuggestions();
          }}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {reorderSuggestions.length > 0
            ? `${reorderSuggestions.length} product${reorderSuggestions.length !== 1 ? 's' : ''} need restocking`
            : 'Monitoring all stock thresholds'}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setError(null); calculateSuggestions(); }}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {reorderSuggestions.length > 0 && (
            <Button
              onClick={handleGenerateAllPOs}
              disabled={isProcessing}
              size="sm"
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <ShoppingCart className={`w-4 h-4 ${isProcessing ? 'animate-pulse' : ''}`} />
              Generate All POs
            </Button>
          )}
        </div>
      </div>

      {/* Summary, lightweight stat tiles, no nested cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
            <Boxes className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">To Reorder</p>
            <p className="text-2xl font-semibold text-gray-900 leading-none mt-0.5">{reorderSuggestions.length}</p>
          </div>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Critical</p>
            <p className="text-2xl font-semibold text-red-600 leading-none mt-0.5">{criticalCount}</p>
          </div>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
            <TrendingDown className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Qty Needed</p>
            <p className="text-2xl font-semibold text-blue-700 leading-none mt-0.5">
              {reorderSuggestions.reduce((sum, s) => sum + s.suggestedQuantity, 0)}
            </p>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Est. Cost</p>
            <p className="text-lg font-semibold text-emerald-700 leading-none mt-0.5">{formatCurrency(totalEstimatedCost, currency)}</p>
          </div>
        </div>
      </div>

      {/* Reorder Suggestions */}
      {reorderSuggestions.length > 0 ? (
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Reorder Suggestions</p>
            <p className="text-xs text-gray-400">Products at or below restock thresholds</p>
          </div>
          <div className="divide-y divide-gray-50">
            {reorderSuggestions.map((suggestion) => {
              const vendor = vendors.find(v => v.id === suggestion.vendorId);
              return (
                <div
                  key={suggestion.productId}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50/60 transition-colors"
                >
                  <div className={`p-2 rounded-xl shrink-0 ${getUrgencyColor(suggestion.urgency)}`}>
                    {suggestion.urgency === 'critical' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Package className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{suggestion.productName}</p>
                    <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                      <span>SKU: {suggestion.sku}</span>
                      <span className="text-gray-300">·</span>
                      <span>Stock: <strong className="text-gray-700">{suggestion.currentStock}</strong></span>
                      <span className="text-gray-300">·</span>
                      <span>Reorder at: {suggestion.reorderPoint}</span>
                      <span className="text-gray-300">·</span>
                      <span>Order: <strong className="text-gray-700">{suggestion.suggestedQuantity}</strong></span>
                    </p>
                    {vendor && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {vendor.name} &middot; {suggestion.leadTime}d lead time
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <p className="font-semibold text-sm">{formatCurrency(suggestion.estimatedCost, currency)}</p>
                    <Badge className={`text-[10px] capitalize ${getUrgencyColor(suggestion.urgency)}`}>
                      {suggestion.urgency}
                    </Badge>
                  </div>
                  <Button
                    onClick={() => handleGeneratePO(suggestion)}
                    disabled={isProcessing}
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    PO
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-green-50/60 border border-green-100 py-10 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500" />
          <p className="font-semibold text-gray-700">All products are well stocked!</p>
          <p className="text-sm text-gray-400 mt-1">No reorder suggestions at this time.</p>
        </div>
      )}
    </div>
  );
}

