'use client';

import { useState, useEffect, useMemo } from 'react';
import { Warehouse, MapPin, TrendingUp, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/currency';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';

/**
 * WarehouseDistributionWidget Component
 * 
 * Dashboard widget showing stock distribution across warehouse locations
 * Displays value, quantity, and product count per location
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} [props.currency] - Currency code
 * @param {Function} [props.onViewDetails] - Callback when user clicks to view details
 */
export function WarehouseDistributionWidget({ businessId, currency = 'PKR', onViewDetails }) {
    const [warehouseData, setWarehouseData] = useState([]);
    const [loading, setLoading] = useState(true);
    const { language } = useLanguage();
    const t = translations[language] || translations['en'] || {};

    // Fetch warehouse distribution data
    useEffect(() => {
        async function loadWarehouseData() {
            if (!businessId) return;
            
            setLoading(true);
            try {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                
                // Get all product locations with warehouse and product details
                const { data: locations, error } = await supabase
                    .from('product_locations')
                    .select(`
                        *,
                        warehouses (
                            id,
                            name,
                            location,
                            is_primary
                        ),
                        products (
                            id,
                            name,
                            sku,
                            cost_price
                        )
                    `)
                    .eq('business_id', businessId)
                    .gt('available_quantity', 0);

                if (error) throw error;

                // Aggregate by warehouse
                const warehouseMap = new Map();
                
                (locations || []).forEach(loc => {
                    const warehouseId = loc.warehouses?.id;
                    if (!warehouseId) return;

                    if (!warehouseMap.has(warehouseId)) {
                        warehouseMap.set(warehouseId, {
                            id: warehouseId,
                            name: loc.warehouses.name,
                            location: loc.warehouses.location,
                            is_primary: loc.warehouses.is_primary,
                            totalValue: 0,
                            totalQuantity: 0,
                            productCount: 0,
                            products: new Set()
                        });
                    }

                    const warehouse = warehouseMap.get(warehouseId);
                    const quantity = parseFloat(loc.available_quantity || 0);
                    const costPrice = parseFloat(loc.products?.cost_price || 0);
                    
                    warehouse.totalValue += quantity * costPrice;
                    warehouse.totalQuantity += quantity;
                    warehouse.products.add(loc.product_id);
                    warehouse.productCount = warehouse.products.size;
                });

                // Convert to array and sort by value
                const warehouses = Array.from(warehouseMap.values())
                    .sort((a, b) => b.totalValue - a.totalValue);

                setWarehouseData(warehouses);
            } catch (error) {
                console.error('Failed to load warehouse data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadWarehouseData();
    }, [businessId]);

    // Calculate statistics
    const stats = useMemo(() => {
        const totalValue = warehouseData.reduce((sum, w) => sum + w.totalValue, 0);
        const totalQuantity = warehouseData.reduce((sum, w) => sum + w.totalQuantity, 0);
        const totalProducts = new Set(
            warehouseData.flatMap(w => Array.from(w.products))
        ).size;

        return {
            totalValue,
            totalQuantity,
            totalProducts,
            warehouseCount: warehouseData.length,
            topWarehouses: warehouseData.slice(0, 3)
        };
    }, [warehouseData]);

    if (loading) {
        return (
            <Card className="glass-card border-none">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                        <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="h-8 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card 
            className="glass-card border-none hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onViewDetails?.('warehouses')}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-gray-900">
                            {t.warehouse_distribution || 'Warehouse Distribution'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {t.multi_location_tracking || 'Multi-location tracking'}
                        </CardDescription>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-wine-50 border border-wine-200 shadow-inner">
                        <Warehouse className="w-5 h-5 text-wine-600" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Total Value */}
                <div className="p-3 rounded-lg bg-gradient-to-br from-wine-50 to-blue-50 border border-wine-200">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-wine-900">
                            {t.total_inventory_value || 'Total Inventory Value'}
                        </span>
                        <Badge className="bg-wine-600 text-white text-xs">
                            {stats.warehouseCount} {t.locations || 'Locations'}
                        </Badge>
                    </div>
                    <div className="text-2xl font-semibold text-wine-900">
                        {formatCurrency(stats.totalValue, currency)}
                    </div>
                    <div className="text-[10px] text-wine-700 font-medium mt-1">
                        {stats.totalQuantity.toLocaleString()} {t.units || 'units'} * {stats.totalProducts} {t.products || 'products'}
                    </div>
                </div>

                {/* Top Warehouses */}
                {stats.topWarehouses.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            {t.top_locations || 'Top Locations'}
                        </div>
                        {stats.topWarehouses.map((warehouse, idx) => {
                            const percentage = stats.totalValue > 0 
                                ? Math.round((warehouse.totalValue / stats.totalValue) * 100) 
                                : 0;
                            
                            return (
                                <div key={warehouse.id} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <MapPin className="w-3 h-3 text-wine-600 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold text-gray-900 truncate">
                                                    {warehouse.name}
                                                    {warehouse.is_primary && (
                                                        <Badge className="ml-1 text-[10px] bg-blue-100 text-blue-700">
                                                            {t.primary || 'Primary'}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-500">
                                                    {warehouse.productCount} {t.products || 'products'} * {warehouse.totalQuantity.toLocaleString()} {t.units || 'units'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs font-bold text-wine-600 ml-2">
                                            {percentage}%
                                        </div>
                                    </div>
                                    <Progress 
                                        value={percentage} 
                                        className="h-1.5 bg-wine-100"
                                    />
                                    <div className="text-[10px] font-medium text-gray-600">
                                        {formatCurrency(warehouse.totalValue, currency)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* No Warehouses */}
                {stats.warehouseCount === 0 && (
                    <div className="text-center py-4">
                        <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs font-bold text-gray-500">
                            {t.no_warehouse_data || 'No warehouse data'}
                        </p>
                    </div>
                )}

                {/* View All Link */}
                {stats.warehouseCount > 3 && (
                    <div className="text-center pt-2 border-t border-gray-100">
                        <button className="text-xs font-bold text-wine-600 hover:text-wine-700 transition-colors">
                            {t.view_all || 'View All'} ({stats.warehouseCount} {t.locations || 'locations'})
                        </button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


