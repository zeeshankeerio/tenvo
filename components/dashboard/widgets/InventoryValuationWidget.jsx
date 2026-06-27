'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Package, DollarSign, Layers } from 'lucide-react';
import { useCostingMethod } from '@/lib/hooks/useCostingMethod';
import { formatCurrency } from '@/lib/currency';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';

/**
 * InventoryValuationWidget
 * 
 * Displays real-time inventory valuation using configured costing method (FIFO/LIFO/WAC)
 * Integrates with existing useCostingMethod hook from Phase 2
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} props.costingMethod - Costing method: 'FIFO', 'LIFO', or 'WAC'
 * @param {string} props.currency - Currency code (default: 'PKR')
 * @param {Function} props.onViewDetails - Callback when user clicks to view details
 */
export function InventoryValuationWidget({ 
  businessId, 
  costingMethod = 'FIFO',
  currency = 'PKR',
  onViewDetails 
}) {
  const { language } = useLanguage();
  const t = translations[language] || translations['en'] || {};
  const { getInventoryValuation, loading, error } = useCostingMethod(businessId, costingMethod);
  const [valuation, setValuation] = useState(null);
  const [previousValue, setPreviousValue] = useState(null);

  useEffect(() => {
    loadValuation();
  }, [businessId, costingMethod]);

  const loadValuation = async () => {
    try {
      const result = await getInventoryValuation();
      
      // Store previous value for trend calculation
      if (valuation) {
        setPreviousValue(valuation.total_value);
      }
      
      setValuation(result);
    } catch (err) {
      console.error('Failed to load inventory valuation:', err);
    }
  };

  // Calculate trend
  const trend = valuation && previousValue ? {
    value: valuation.total_value - previousValue,
    percentage: ((valuation.total_value - previousValue) / previousValue) * 100,
    direction: valuation.total_value >= previousValue ? 'up' : 'down'
  } : null;

  // Calculate category breakdown percentages
  const categoryBreakdown = valuation?.products ? 
    valuation.products.reduce((acc, product) => {
      const category = product.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = { value: 0, count: 0 };
      }
      acc[category].value += product.total_value;
      acc[category].count += 1;
      return acc;
    }, {}) : {};

  const topCategories = Object.entries(categoryBreakdown)
    .map(([category, data]) => ({
      category,
      value: data.value,
      count: data.count,
      percentage: valuation ? (data.value / valuation.total_value) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  if (loading && !valuation) {
    return (
      <Card className="glass-card border-none">
        <CardHeader className="pb-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
        </CardHeader>
        <CardContent>
          <div className="h-10 bg-gray-200 rounded animate-pulse w-40 mb-4" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card border-none border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-red-600">
            {t.inventory_valuation || 'Inventory Valuation'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-red-600">{error}</p>
          <button 
            onClick={loadValuation}
            className="text-xs text-red-600 underline mt-2"
          >
            {t.retry || 'Retry'}
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="glass-card border-none cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onViewDetails}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-gray-900">
              {t.inventory_valuation || 'Inventory Valuation'}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.using_method || 'Using'} {costingMethod} {t.method || 'method'}
            </CardDescription>
          </div>
          <div className="p-2.5 rounded-2xl bg-wine-50 border border-wine-200 shadow-inner">
            <Package className="w-5 h-5 text-wine-600" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Total Valuation */}
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-semibold text-premium-gradient">
              {formatCurrency(valuation?.total_value || 0, currency)}
            </span>
            {trend && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                trend.direction === 'up' 
                  ? 'bg-green-50 text-green-600' 
                  : 'bg-red-50 text-red-600'
              }`}>
                {trend.direction === 'up' ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(trend.percentage).toFixed(1)}%
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>{valuation?.total_quantity || 0} {t.units || 'units'}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>
                {formatCurrency(valuation?.average_unit_cost || 0, currency)} {t.avg || 'avg'}
              </span>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        {topCategories.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-semibold tracking-widest text-gray-400">
              {t.top_categories || 'Top Categories'}
            </div>
            {topCategories.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700 truncate">{cat.category}</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(cat.value, currency)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-wine-500 to-wine-600 transition-all duration-500"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>{cat.count} {t.products || 'products'}</span>
                  <span>{cat.percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Costing Method Badge */}
        <div className="pt-2 border-t border-gray-100">
          <Badge variant="outline" className="text-[10px] font-bold">
            {costingMethod} {t.costing || 'Costing'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}


