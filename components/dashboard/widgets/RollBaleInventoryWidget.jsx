'use client';

import { useState, useEffect, useMemo } from 'react';
import { Package, Ruler, Weight, Grid3x3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';

/**
 * RollBaleInventoryWidget Component
 * 
 * Dashboard widget for textile businesses showing roll/bale inventory summary
 * Displays dimensions (length, weight, area) and breakdown by fabric type
 * 
 * Features:
 * - Total rolls/bales count
 * - Total length (yards), weight (kg), area (sq yards)
 * - Breakdown by fabric type
 * - Quick action to view roll details
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {Function} [props.onViewDetails] - Callback when user clicks to view details
 */
export function RollBaleInventoryWidget({ businessId, onViewDetails }) {
    const [rollData, setRollData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { language } = useLanguage();
    const t = translations[language] || translations['en'] || {};

    // Fetch roll/bale inventory data
    useEffect(() => {
        async function loadRollData() {
            if (!businessId) return;
            
            setLoading(true);
            try {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                
                // Get all batches for textile products (rolls/bales are tracked as batches)
                const { data: batches, error } = await supabase
                    .from('product_batches')
                    .select(`
                        *,
                        products (
                            id,
                            name,
                            category,
                            custom_fields
                        )
                    `)
                    .eq('business_id', businessId)
                    .eq('status', 'active')
                    .gt('quantity', 0);

                if (error) throw error;

                // Aggregate roll/bale data
                let totalRolls = 0;
                let totalLength = 0; // yards
                let totalWeight = 0; // kg
                let totalArea = 0; // sq yards
                const fabricTypes = new Map();

                (batches || []).forEach(batch => {
                    const customFields = batch.products?.custom_fields || {};
                    const quantity = parseFloat(batch.quantity || 0);
                    
                    // Extract dimensions from custom fields
                    const length = parseFloat(customFields.length || customFields.roll_length || 0);
                    const weight = parseFloat(customFields.weight || customFields.roll_weight || 0);
                    const width = parseFloat(customFields.width || customFields.fabric_width || 0);
                    const fabricType = customFields.fabric_type || batch.products?.category || 'Unknown';

                    totalRolls += quantity;
                    totalLength += length * quantity;
                    totalWeight += weight * quantity;
                    totalArea += (length * width) * quantity;

                    // Aggregate by fabric type
                    if (!fabricTypes.has(fabricType)) {
                        fabricTypes.set(fabricType, {
                            name: fabricType,
                            rolls: 0,
                            length: 0,
                            weight: 0
                        });
                    }
                    const typeData = fabricTypes.get(fabricType);
                    typeData.rolls += quantity;
                    typeData.length += length * quantity;
                    typeData.weight += weight * quantity;
                });

                // Convert to array and sort by rolls count
                const topFabricTypes = Array.from(fabricTypes.values())
                    .sort((a, b) => b.rolls - a.rolls)
                    .slice(0, 3);

                setRollData({
                    totalRolls,
                    totalLength,
                    totalWeight,
                    totalArea,
                    topFabricTypes
                });
            } catch (error) {
                console.error('Failed to load roll/bale data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadRollData();
    }, [businessId]);

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

    if (!rollData || rollData.totalRolls === 0) {
        return (
            <Card className="glass-card border-none">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-gray-500">
                        {t.roll_bale_inventory || 'Roll/Bale Inventory'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">
                            {t.no_rolls_available || 'No rolls/bales in inventory'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card 
            className="glass-card border-none hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onViewDetails?.('rolls')}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-gray-900">
                            {t.roll_bale_inventory || 'Roll/Bale Inventory'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {t.textile_stock_summary || 'Textile stock summary'}
                        </CardDescription>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-inner">
                        <Package className="w-5 h-5 text-indigo-600" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Total Rolls */}
                <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-50 to-wine-50 border border-indigo-200">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-indigo-900">
                            {t.total_rolls_bales || 'Total Rolls/Bales'}
                        </span>
                        <Badge className="bg-indigo-600 text-white text-xs">
                            {rollData.totalRolls.toLocaleString()}
                        </Badge>
                    </div>
                    <div className="text-2xl font-black text-indigo-900">
                        {rollData.totalRolls.toLocaleString()} {t.rolls || 'Rolls'}
                    </div>
                </div>

                {/* Dimensions Grid */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-blue-50">
                        <Ruler className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                        <div className="text-lg font-black text-blue-600">
                            {rollData.totalLength.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                            {t.yards || 'Yards'}
                        </div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-green-50">
                        <Weight className="w-4 h-4 text-green-600 mx-auto mb-1" />
                        <div className="text-lg font-black text-green-600">
                            {rollData.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] font-bold text-green-700 uppercase tracking-wide">
                            {t.kg || 'KG'}
                        </div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-wine-50">
                        <Grid3x3 className="w-4 h-4 text-wine-600 mx-auto mb-1" />
                        <div className="text-lg font-black text-wine-600">
                            {rollData.totalArea.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] font-bold text-wine-700 uppercase tracking-wide">
                            {t.sq_yards || 'Sq Yd'}
                        </div>
                    </div>
                </div>

                {/* Top Fabric Types */}
                {rollData.topFabricTypes.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {t.top_fabric_types || 'Top Fabric Types'}
                        </div>
                        {rollData.topFabricTypes.map((fabric, idx) => {
                            const percentage = rollData.totalRolls > 0 
                                ? Math.round((fabric.rolls / rollData.totalRolls) * 100) 
                                : 0;
                            
                            return (
                                <div key={idx} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-gray-900 truncate">
                                                {fabric.name}
                                            </div>
                                            <div className="text-[10px] text-gray-500">
                                                {fabric.rolls.toLocaleString()} {t.rolls || 'rolls'} * {fabric.length.toLocaleString(undefined, { maximumFractionDigits: 0 })} {t.yards || 'yards'}
                                            </div>
                                        </div>
                                        <div className="text-xs font-bold text-indigo-600 ml-2">
                                            {percentage}%
                                        </div>
                                    </div>
                                    <Progress 
                                        value={percentage} 
                                        className="h-1.5 bg-indigo-100"
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Quick Action */}
                <div className="pt-2 border-t border-gray-100">
                    <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors w-full text-center">
                        {t.view_roll_details || 'View Roll Details'} →
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}

